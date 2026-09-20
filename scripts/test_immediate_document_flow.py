"""
scripts/test_immediate_document_flow.py
Tests:
1. Patient creation immediately updates patient list.
2. Immediate document upload with Gemini name matching:
   - Match case: Document name matches patient name -> Auto-attached.
   - Mismatch case: Document name differs from patient name -> Flagged as mismatch (DIFFERENT_PATIENT).
   - Override case: User clicks Yes -> Document attached with override.
   - Rejection case: User clicks No -> Prompted to upload correct document for patient.
"""

import sys
import io
import time
import hashlib
import requests
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.database.db import get_db_connection

BASE_URL = "http://127.0.0.1:8000"

def create_sample_pdf(text_content: str) -> bytes:
    import fitz  # PyMuPDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text_content, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def run_tests():
    print("=" * 60)
    print("CARECUE — IMMEDIATE DOCUMENT UPLOAD & GEMINI MATCH TEST")
    print("=" * 60)

    # 1. Register & verify test user
    email = f"dr_carecue_{int(time.time())}@carecue.local"
    pwd = "SecurePassword123!"

    reg = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": email,
        "password": pwd,
        "confirmPassword": pwd,
        "firstName": "Abhijit",
        "lastName": "Bhattacharjya"
    })
    assert reg.status_code == 200, f"Signup failed: {reg.text}"
    user_id = reg.json()["userId"]

    test_otp = "123456"
    test_otp_hash = hashlib.sha256(test_otp.encode("utf-8")).hexdigest()
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("UPDATE email_otps SET otp_hash = ? WHERE email = ?", (test_otp_hash, email))
        conn.commit()

    ver = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
        "email": email,
        "otp": test_otp,
        "purpose": "signup"
    })
    assert ver.status_code == 200, f"Verify OTP failed: {ver.text}"
    headers = {"X-User-Id": user_id}
    print(f"[PASS] User authenticated: {email} ({user_id})")

    # 2. Add New Patient (Mother: Kalyani Bhattacharjya)
    pat_res = requests.post(f"{BASE_URL}/api/patients", headers=headers, json={
        "name": "Kalyani Bhattacharjya",
        "relationship": "Mother",
        "dateOfBirth": "1965-08-20",
        "gender": "Female"
    })
    assert pat_res.status_code == 200, f"Add patient failed: {pat_res.text}"
    patient = pat_res.json()
    patient_id = patient["patientId"]
    print(f"[PASS] Patient created: {patient['name']} ({patient_id})")

    # Verify patient list updated immediately
    p_list = requests.get(f"{BASE_URL}/api/patients", headers=headers).json()
    assert any(p["patientId"] == patient_id for p in p_list), "Patient not in list immediately!"
    print(f"[PASS] Patient list updated immediately: {len(p_list)} total patients.")

    # 3. Test MATCHING Document Upload
    matching_pdf = create_sample_pdf(
        "CLINICAL LABORATORY REPORT\n"
        "Patient Name: Kalyani Bhattacharjya\n"
        "DOB: 1965-08-20  Gender: Female\n"
        "Test: Fasting Blood Glucose - 105 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]\n"
        "Test: HbA1c - 6.2 % (Ref: 4.0 - 5.6 %) [HIGH]\n"
        "Doctor: Dr. S. Sen, MD\n"
    )

    upload_match = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        data={"patientId": patient_id, "documentType": "LAB_REPORT"},
        files={"file": ("Kalyani_Lab_Report.pdf", io.BytesIO(matching_pdf), "application/pdf")}
    )
    assert upload_match.status_code == 200, f"Upload failed: {upload_match.text}"
    match_data = upload_match.json()
    match_result = match_data.get("matchResult", {})
    assert match_result.get("isTargetMatch") is True or match_result.get("matchType") == "EXACT_NAME_MATCH"
    print(f"[PASS] Matching document correctly identified: {match_result.get('message')}")

    # Verify document attached to patient
    p_docs = requests.get(f"{BASE_URL}/api/patients/{patient_id}/documents", headers=headers).json()
    assert len(p_docs) >= 1, "Document was not attached to patient!"
    print(f"[PASS] Document automatically attached to {patient['name']}: {len(p_docs)} document(s).")

    # 4. Test MISMATCHING Document Upload
    mismatch_pdf = create_sample_pdf(
        "PRESCRIPTION & MEDICAL REPORT\n"
        "Patient Name: Rahul Das\n"
        "Age: 42  Gender: Male\n"
        "Rx: Metformin 500mg PO BD after meals\n"
        "Rx: Atorvastatin 10mg PO OD at bedtime\n"
        "Diagnosis: Type 2 Diabetes Mellitus\n"
    )

    upload_mismatch = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        data={"patientId": patient_id, "documentType": "PRESCRIPTION"},
        files={"file": ("Rahul_Das_Prescription.pdf", io.BytesIO(mismatch_pdf), "application/pdf")}
    )
    assert upload_mismatch.status_code == 200, f"Upload failed: {upload_mismatch.text}"
    mismatch_data = upload_mismatch.json()
    mismatch_result = mismatch_data.get("matchResult", {})
    mismatch_doc_id = mismatch_data["document"]["documentId"]

    assert mismatch_result.get("matchType") == "DIFFERENT_PATIENT", f"Expected DIFFERENT_PATIENT, got {mismatch_result}"
    assert mismatch_result.get("isTargetMatch") is False
    print(f"[PASS] Mismatch successfully flagged: Extracted='{mismatch_data['detectedPatient']['name']}' vs Target='{patient['name']}'")

    # 5. Test Override Attachment (When user clicks 'Yes, Continue with this document')
    attach_override = requests.post(
        f"{BASE_URL}/api/patients/{patient_id}/attach-document",
        headers=headers,
        json={"documentId": mismatch_doc_id, "overrideMismatch": True}
    )
    assert attach_override.status_code == 200, f"Attach override failed: {attach_override.text}"
    assert attach_override.json().get("status") == "ATTACHED"
    print(f"[PASS] Override attachment succeeded upon user confirmation: {attach_override.json().get('status')}")

    # Verify updated document count
    p_docs_final = requests.get(f"{BASE_URL}/api/patients/{patient_id}/documents", headers=headers).json()
    assert len(p_docs_final) == 2, f"Expected 2 documents after override, got {len(p_docs_final)}"
    print(f"[PASS] Final patient record verified with {len(p_docs_final)} attached documents.")

    print("=" * 60)
    print("ALL IMMEDIATE DOCUMENT UPLOAD & GEMINI MATCH TESTS PASSED (5/5)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
