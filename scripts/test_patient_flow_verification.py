"""
scripts/test_patient_flow_verification.py
Tests:
1. Account A Signup & Verification -> Add Patient with Self -> Name derived from Account A
2. Account A adds Mother patient -> Name editable
3. Account B Signup & Verification -> Isolation check (A's patients are NOT visible to B)
4. Account B adds Self patient -> Name derived from Account B
5. Verify no 500 error, correct JSON structures, and strict tenant isolation
"""

import sys
import os
import time
import hashlib
import requests
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.database.db import get_db_connection

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 60)
    print("CARECUE — PATIENT FLOW & ACCOUNT ISOLATION TEST")
    print("=" * 60)

    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] Backend is alive.")

    # 2. Create Account A (Abhijit Bhattacharjya)
    email_a = f"abhijit_{int(time.time())}@carecue.local"
    pwd = "SecurePassword123!"

    reg_a = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": email_a,
        "password": pwd,
        "confirmPassword": pwd,
        "firstName": "Abhijit",
        "lastName": "Bhattacharjya"
    })
    assert reg_a.status_code == 200, f"Account A register failed: {reg_a.text}"
    user_id_a = reg_a.json()["userId"]
    
    # Set known OTP and verify
    test_otp = "123456"
    test_otp_hash = hashlib.sha256(test_otp.encode("utf-8")).hexdigest()
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("UPDATE email_otps SET otp_hash = ? WHERE email = ?", (test_otp_hash, email_a))
        conn.commit()

    ver_a = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
        "email": email_a,
        "otp": test_otp,
        "purpose": "signup"
    })
    assert ver_a.status_code == 200, f"Account A verification failed: {ver_a.text}"
    headers_a = {"X-User-Id": user_id_a}
    print(f"[PASS] Account A registered & authenticated: {email_a} ({user_id_a})")

    # 3. Add Patient for A with Relationship='Self'
    # Client sends spoofed name to test backend enforcement
    pat_self_a = requests.post(f"{BASE_URL}/api/patients", headers=headers_a, json={
        "name": "Spoofed Client Name",
        "relationship": "Self",
        "dateOfBirth": "1990-05-15",
        "gender": "Male"
    })
    assert pat_self_a.status_code == 200, f"Add Self patient for A failed (HTTP {pat_self_a.status_code}): {pat_self_a.text}"
    pat_self_data_a = pat_self_a.json()
    assert pat_self_data_a["name"] == "Abhijit Bhattacharjya", f"Self name should be derived from account, got: {pat_self_data_a['name']}"
    assert pat_self_data_a["userId"] == user_id_a, f"Patient userId mismatch"
    pat_id_a_self = pat_self_data_a["patientId"]
    print(f"[PASS] Self patient for Account A created: {pat_self_data_a['name']} ({pat_id_a_self})")

    # 4. Add Mother Patient for A
    pat_mother_a = requests.post(f"{BASE_URL}/api/patients", headers=headers_a, json={
        "name": "Kalyani Bhattacharjya",
        "relationship": "Mother",
        "dateOfBirth": "1965-08-20",
        "gender": "Female"
    })
    assert pat_mother_a.status_code == 200, f"Add Mother patient failed: {pat_mother_a.text}"
    pat_mother_data_a = pat_mother_a.json()
    assert pat_mother_data_a["name"] == "Kalyani Bhattacharjya"
    print(f"[PASS] Mother patient for Account A created: {pat_mother_data_a['name']}")

    # 5. List patients for A -> should have 2 patients
    list_a = requests.get(f"{BASE_URL}/api/patients", headers=headers_a).json()
    assert len(list_a) >= 2, f"Expected at least 2 patients for A, got {len(list_a)}"
    names_a = [p["name"] for p in list_a]
    assert "Abhijit Bhattacharjya" in names_a
    assert "Kalyani Bhattacharjya" in names_a
    print(f"[PASS] Account A patient list verified: {names_a}")

    # 6. Create Account B (Test User)
    email_b = f"testuser_{int(time.time()) + 1}@carecue.local"

    reg_b = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": email_b,
        "password": pwd,
        "confirmPassword": pwd,
        "firstName": "Test",
        "lastName": "User"
    })
    assert reg_b.status_code == 200, f"Account B register failed: {reg_b.text}"
    user_id_b = reg_b.json()["userId"]

    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("UPDATE email_otps SET otp_hash = ? WHERE email = ?", (test_otp_hash, email_b))
        conn.commit()

    ver_b = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
        "email": email_b,
        "otp": test_otp,
        "purpose": "signup"
    })
    assert ver_b.status_code == 200, f"Account B verification failed: {ver_b.text}"
    headers_b = {"X-User-Id": user_id_b}
    print(f"[PASS] Account B registered & authenticated: {email_b} ({user_id_b})")

    # 7. ISOLATION CHECK: Account B lists patients -> MUST NOT see Account A's patients
    list_b = requests.get(f"{BASE_URL}/api/patients", headers=headers_b).json()
    names_b = [p["name"] for p in list_b]
    assert "Abhijit Bhattacharjya" not in names_b, "DATA LEAK: Account B can see Account A's Self patient!"
    assert "Kalyani Bhattacharjya" not in names_b, "DATA LEAK: Account B can see Account A's Mother patient!"
    assert len(list_b) == 0, f"Account B should start with 0 patients, got {len(list_b)}"
    print(f"[PASS] Multi-tenant isolation verified: Account B sees {len(list_b)} patients (no leakage from A).")

    # 8. Account B tries to access Account A's patient by ID -> 403 Access Denied
    denied = requests.get(f"{BASE_URL}/api/patients/{pat_id_a_self}", headers=headers_b)
    assert denied.status_code == 403, f"Expected 403 Forbidden for cross-account access, got {denied.status_code}"
    print(f"[PASS] Cross-account access to patient {pat_id_a_self} blocked with HTTP 403 Forbidden.")

    # 9. Add Patient for B with Relationship='Self'
    pat_self_b = requests.post(f"{BASE_URL}/api/patients", headers=headers_b, json={
        "name": "Whatever Spoofed",
        "relationship": "Self"
    })
    assert pat_self_b.status_code == 200, f"Add Self patient for B failed: {pat_self_b.text}"
    pat_self_data_b = pat_self_b.json()
    assert pat_self_data_b["name"] == "Test User", f"Self name for B should be 'Test User', got: {pat_self_data_b['name']}"
    assert pat_self_data_b["userId"] == user_id_b
    print(f"[PASS] Self patient for Account B created: {pat_self_data_b['name']} ({pat_self_data_b['patientId']})")

    # 10. Add Other Relationship Patient for B
    pat_other_b = requests.post(f"{BASE_URL}/api/patients", headers=headers_b, json={
        "name": "Sarah Connor",
        "relationship": "Other",
        "relationshipDetail": "Guardian"
    })
    assert pat_other_b.status_code == 200, f"Add Other patient failed: {pat_other_b.text}"
    assert pat_other_b.json()["relationshipDetail"] == "Guardian"
    print(f"[PASS] Other relationship patient created: {pat_other_b.json()['name']} (Guardian)")

    print("=" * 60)
    print("ALL PATIENT FLOW & MULTI-TENANT ISOLATION TESTS PASSED (10/10)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
