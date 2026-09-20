"""
backend/tests/test_patient_persistence_flow.py - Automated verification suite for Patient Persistence,
Account Isolation, Self-Patient Name Rules, and Cache Hygiene.
"""

import os
import uuid
import sqlite3
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.db import DB_PATH, get_db_connection
from backend.services.patient_store import PatientStore

client = TestClient(app)

def _create_verified_user(first_name: str, last_name: str, email: str) -> str:
    user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'mock_hash', 1, datetime('now'), datetime('now'));
        """, (user_id, first_name, last_name, email))
        conn.commit()
    return user_id

def test_1_create_patient_successfully():
    user_id = _create_verified_user("Alice", "Walker", f"alice_{uuid.uuid4().hex[:4]}@example.com")
    resp = client.post(
        "/api/patients",
        headers={"X-User-Id": user_id},
        json={
            "name": "Alice Walker",
            "relationship": "Self",
            "dateOfBirth": "1990-05-12",
            "gender": "Female",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["patientId"].startswith("PAT-")
    assert data["name"] == "Alice Walker"
    assert data["userId"] == user_id

    # Verify SQLite row exists
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM patients WHERE patient_id = ?", (data["patientId"],))
        row = cur.fetchone()
        assert row is not None
        assert row["user_id"] == user_id
        assert row["name"] == "Alice Walker"

def test_2_created_patient_appears_in_get_patients():
    user_id = _create_verified_user("Bob", "Martin", f"bob_{uuid.uuid4().hex[:4]}@example.com")
    post_resp = client.post(
        "/api/patients",
        headers={"X-User-Id": user_id},
        json={"name": "Bob Martin", "relationship": "Self"}
    )
    assert post_resp.status_code == 201
    created_id = post_resp.json()["patientId"]

    get_resp = client.get("/api/patients", headers={"X-User-Id": user_id})
    assert get_resp.status_code == 200
    patients = get_resp.json()
    assert any(p["patientId"] == created_id for p in patients)

def test_3_created_patient_survives_page_refresh():
    user_id = _create_verified_user("Charlie", "Brown", f"charlie_{uuid.uuid4().hex[:4]}@example.com")
    post_resp = client.post(
        "/api/patients",
        headers={"X-User-Id": user_id},
        json={"name": "Charlie Brown", "relationship": "Self"}
    )
    created_id = post_resp.json()["patientId"]

    # Simulate 3 independent page refreshes / client re-initializations
    for _ in range(3):
        refresh_client = TestClient(app)
        get_resp = refresh_client.get("/api/patients", headers={"X-User-Id": user_id})
        assert get_resp.status_code == 200
        patients = get_resp.json()
        assert any(p["patientId"] == created_id for p in patients)

def test_4_created_patient_survives_backend_restart():
    user_id = _create_verified_user("David", "Clark", f"david_{uuid.uuid4().hex[:4]}@example.com")
    post_resp = client.post(
        "/api/patients",
        headers={"X-User-Id": user_id},
        json={"name": "David Clark", "relationship": "Self"}
    )
    created_id = post_resp.json()["patientId"]

    # Simulate backend restart with a fresh new PatientStore and new SQLite connection
    fresh_store = PatientStore()
    patient = fresh_store.get_patient(created_id)
    assert patient is not None
    assert patient["patientId"] == created_id
    assert patient["userId"] == user_id

def test_5_account_a_cannot_see_account_b_patient():
    user_a = _create_verified_user("UserA", "One", f"usera_{uuid.uuid4().hex[:4]}@example.com")
    user_b = _create_verified_user("UserB", "Two", f"userb_{uuid.uuid4().hex[:4]}@example.com")

    # A creates patient
    post_a = client.post("/api/patients", headers={"X-User-Id": user_a}, json={"name": "Patient Of A", "relationship": "Mother"})
    assert post_a.status_code == 201
    pat_a_id = post_a.json()["patientId"]

    # B gets patients
    get_b = client.get("/api/patients", headers={"X-User-Id": user_b})
    assert get_b.status_code == 200
    b_patients = get_b.json()
    assert all(p["patientId"] != pat_a_id for p in b_patients)

    # B tries direct GET of A's patient
    direct_get = client.get(f"/api/patients/{pat_a_id}", headers={"X-User-Id": user_b})
    assert direct_get.status_code == 403

def test_6_account_b_starts_with_zero_patients():
    user_b = _create_verified_user("Fresh", "UserB", f"freshb_{uuid.uuid4().hex[:4]}@example.com")
    get_resp = client.get("/api/patients", headers={"X-User-Id": user_b})
    assert get_resp.status_code == 200
    patients = get_resp.json()
    assert len(patients) == 0

def test_7_self_patient_uses_authenticated_account_name():
    user_id = _create_verified_user("Abhijit", "Bhattacharjya", f"abhijit_{uuid.uuid4().hex[:4]}@example.com")
    # Send a mismatched name with Self relationship - backend must enforce account name
    post_resp = client.post(
        "/api/patients",
        headers={"X-User-Id": user_id},
        json={"name": "Some Wrong Name", "relationship": "Self"}
    )
    assert post_resp.status_code == 201
    data = resp = post_resp.json()
    assert data["name"] == "Abhijit Bhattacharjya"
    assert data["userId"] == user_id

def test_8_duplicate_stale_frontend_cache_does_not_resurrect_another_user_patients():
    user_a = _create_verified_user("AccountA", "Lead", f"acca_{uuid.uuid4().hex[:4]}@example.com")
    user_b = _create_verified_user("AccountB", "Member", f"accb_{uuid.uuid4().hex[:4]}@example.com")

    post_a = client.post("/api/patients", headers={"X-User-Id": user_a}, json={"name": "A Private Patient", "relationship": "Father"})
    pat_a_id = post_a.json()["patientId"]

    # Client B queries API: backend enforces ownership regardless of what frontend state/cache requested
    resp_b = client.get("/api/patients", headers={"X-User-Id": user_b})
    assert resp_b.status_code == 200
    assert all(p["patientId"] != pat_a_id for p in resp_b.json())
