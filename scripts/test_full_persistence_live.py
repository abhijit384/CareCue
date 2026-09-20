"""
scripts/test_full_persistence_live.py - Full live end-to-end test against localhost FastAPI server.
Tests multi-account isolation, persistence, database commits, self-patient naming, and refresh stability.
"""

import os
import sys
import json
import time
import uuid
import sqlite3
import requests

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "carecue.db"))

def run_live_e2e():
    print("=" * 70)
    print("CARECUE FULL LIVE E2E PERSISTENCE & ISOLATION VERIFICATION")
    print(f"Database Path: {DB_PATH}")
    print(f"Backend URL:   {BASE_URL}")
    print("=" * 70)

    # ─── 1. Health check ───
    h_resp = requests.get(f"{BASE_URL}/health")
    assert h_resp.status_code == 200, f"Backend not healthy: {h_resp.status_code}"
    print("[PASS] Backend health endpoint OK")

    # ─── 2. Setup Account A ───
    user_a_id = f"USR-A-{uuid.uuid4().hex[:6].upper()}"
    email_a = f"account_a_{int(time.time())}@carecue.local"
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at)
            VALUES (?, 'Abhijit', 'Bhattacharjya', ?, 'mock_hash', 1, datetime('now'), datetime('now'));
        """, (user_a_id, email_a))
        conn.commit()

    headers_a = {"X-User-Id": user_a_id}

    # Verify Account A starts with 0 patients
    r = requests.get(f"{BASE_URL}/api/patients", headers=headers_a)
    assert r.status_code == 200
    pats_a_init = r.json()
    assert len(pats_a_init) == 0, f"Expected 0 patients for new account A, got {len(pats_a_init)}"
    print(f"[PASS] Account A ({user_a_id}) starts with 0 patients")

    # ─── 3. Account A: Create Patient 1 (Self) ───
    r_post_a1 = requests.post(f"{BASE_URL}/api/patients", headers=headers_a, json={
        "name": "Wrong Name Provided",  # Must be overridden by account name for Self
        "relationship": "Self",
        "dateOfBirth": "1990-01-15",
        "gender": "Male"
    })
    assert r_post_a1.status_code == 201, f"POST /api/patients failed: {r_post_a1.status_code} {r_post_a1.text}"
    pat_a1 = r_post_a1.json()
    pat_a1_id = pat_a1["patientId"]
    assert pat_a1["name"] == "Abhijit Bhattacharjya", f"Self patient name mismatch: {pat_a1['name']}"
    assert pat_a1["userId"] == user_a_id
    print(f"[PASS] Account A created Self patient: {pat_a1_id} ('{pat_a1['name']}')")

    # Verify SQLite row directly for patient 1
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM patients WHERE patient_id = ?", (pat_a1_id,))
        db_row_1 = cur.fetchone()
        assert db_row_1 is not None, "Patient 1 row not in SQLite!"
        assert db_row_1["name"] == "Abhijit Bhattacharjya"
        assert db_row_1["user_id"] == user_a_id
        assert db_row_1["relationship"] == "Self"
    print(f"[PASS] SQLite DB INSERT & COMMIT verified for {pat_a1_id}")

    # ─── 4. Account A: Create Patient 2 (Mother) ───
    r_post_a2 = requests.post(f"{BASE_URL}/api/patients", headers=headers_a, json={
        "name": "Sunita Bhattacharjya",
        "relationship": "Mother",
        "dateOfBirth": "1965-08-20",
        "gender": "Female"
    })
    assert r_post_a2.status_code == 201
    pat_a2 = r_post_a2.json()
    pat_a2_id = pat_a2["patientId"]
    assert pat_a2["name"] == "Sunita Bhattacharjya"
    print(f"[PASS] Account A created Mother patient: {pat_a2_id} ('{pat_a2['name']}')")

    # ─── 5. Account A: GET /api/patients ───
    r_get_a = requests.get(f"{BASE_URL}/api/patients", headers=headers_a)
    assert r_get_a.status_code == 200
    pats_a = r_get_a.json()
    assert len(pats_a) == 2, f"Expected 2 patients for Account A, got {len(pats_a)}"
    ids_a = {p["patientId"] for p in pats_a}
    assert pat_a1_id in ids_a and pat_a2_id in ids_a
    print(f"[PASS] Account A GET /api/patients returns exactly 2 patients: {ids_a}")

    # ─── 6. Simulate Browser Refreshes (survives repeated GET calls) ───
    for i in range(3):
        r_ref = requests.get(f"{BASE_URL}/api/patients", headers=headers_a)
        assert r_ref.status_code == 200
        assert len(r_ref.json()) == 2
    print("[PASS] Page refresh simulation: all 2 patients persist consistently")

    # ─── 7. Setup Account B & Verify Isolation ───
    user_b_id = f"USR-B-{uuid.uuid4().hex[:6].upper()}"
    email_b = f"account_b_{int(time.time())}@carecue.local"
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at)
            VALUES (?, 'Priya', 'Das', ?, 'mock_hash', 1, datetime('now'), datetime('now'));
        """, (user_b_id, email_b))
        conn.commit()

    headers_b = {"X-User-Id": user_b_id}

    # Account B must start with 0 patients and CANNOT see Account A's patients
    r_get_b_init = requests.get(f"{BASE_URL}/api/patients", headers=headers_b)
    assert r_get_b_init.status_code == 200
    pats_b_init = r_get_b_init.json()
    assert len(pats_b_init) == 0, f"Expected 0 patients for Account B, got {len(pats_b_init)}"
    print(f"[PASS] Account B ({user_b_id}) starts with 0 patients (isolated from Account A)")

    # Account B cannot access Account A's patient directly (403 Forbidden)
    r_direct_get = requests.get(f"{BASE_URL}/api/patients/{pat_a1_id}", headers=headers_b)
    assert r_direct_get.status_code == 403, f"Expected 403 Forbidden for cross-account access, got {r_direct_get.status_code}"
    print(f"[PASS] Cross-account direct access denied (403 Forbidden)")

    # ─── 8. Account B: Create Patient 1 (Self) ───
    r_post_b = requests.post(f"{BASE_URL}/api/patients", headers=headers_b, json={
        "name": "Priya Das",
        "relationship": "Self"
    })
    assert r_post_b.status_code == 201
    pat_b1 = r_post_b.json()
    pat_b1_id = pat_b1["patientId"]
    assert pat_b1["name"] == "Priya Das"
    assert pat_b1["userId"] == user_b_id
    print(f"[PASS] Account B created Self patient: {pat_b1_id} ('{pat_b1['name']}')")

    # Account B sees only 1 patient
    r_get_b = requests.get(f"{BASE_URL}/api/patients", headers=headers_b)
    assert r_get_b.status_code == 200
    pats_b = r_get_b.json()
    assert len(pats_b) == 1
    assert pats_b[0]["patientId"] == pat_b1_id
    print(f"[PASS] Account B GET /api/patients returns only B's patient")

    # ─── 9. Switch back to Account A ───
    r_get_a_final = requests.get(f"{BASE_URL}/api/patients", headers=headers_a)
    assert r_get_a_final.status_code == 200
    pats_a_final = r_get_a_final.json()
    assert len(pats_a_final) == 2
    assert all(p["userId"] == user_a_id for p in pats_a_final)
    print(f"[PASS] Switched back to Account A: exactly A's 2 patients returned (complete two-way isolation)")

    # ─── 10. Non-API alias endpoints (/patients and /patients/{id}) ───
    r_alias_get = requests.get(f"{BASE_URL}/patients", headers=headers_a)
    assert r_alias_get.status_code == 200
    assert len(r_alias_get.json()) == 2
    print("[PASS] Route alias /patients working identically to /api/patients")

    print("=" * 70)
    print("ALL LIVE END-TO-END PERSISTENCE & ISOLATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_live_e2e()
