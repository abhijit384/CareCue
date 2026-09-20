"""
Trace a complete patient creation + document upload flow end-to-end.
Checks database, API, and response at every step.
"""
import os, sys, json, time, io, requests

BASE = "http://127.0.0.1:8000"
EMAIL = f"trace_test_{int(time.time())}@carecue.local"
PASSWORD = "StrongPass123!"

print("=" * 60)
print("STEP 1: Signup")
print("=" * 60)
r = requests.post(f"{BASE}/api/auth/signup", json={
    "firstName": "Abhijit",
    "lastName": "Bhattacharjya",
    "email": EMAIL,
    "password": PASSWORD,
    "confirmPassword": PASSWORD
})
print(f"  Status: {r.status_code}")
signup_data = r.json()
user_id = signup_data.get("userId")
print(f"  userId: {user_id}")

print()
print("=" * 60)
print("STEP 2: Verify OTP (test shortcut)")
print("=" * 60)
# Read the OTP from database directly for test
import sqlite3
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "carecue.db"))
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT otp_hash FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1", (EMAIL,))
row = cursor.fetchone()
# For test accounts with @carecue.local, the OTP is stored as plaintext hash
# Try verifying with common test patterns
r_verify = requests.post(f"{BASE}/api/auth/verify-otp", json={
    "email": EMAIL,
    "otp": "000000",
    "purpose": "signup"
})
if r_verify.status_code != 200 or not r_verify.json().get("verified"):
    # Try to find actual OTP - check if auth service uses a test OTP
    # Look at auth_service for test domain behavior
    r_verify = requests.post(f"{BASE}/api/auth/verify-otp", json={
        "email": EMAIL,
        "otp": "123456",
        "purpose": "signup"
    })

verify_data = r_verify.json()
print(f"  Verify status: {r_verify.status_code}")
print(f"  Verified: {verify_data.get('verified')}")
token = verify_data.get("token")
user_obj = verify_data.get("user", {})
user_id = user_obj.get("userId") or user_id
print(f"  userId from verify: {user_id}")
print(f"  token present: {bool(token)}")

# Set auth headers
HEADERS = {"X-User-Id": user_id}
if token:
    HEADERS["Authorization"] = f"Bearer {token}"

print()
print("=" * 60)
print("STEP 3: List patients BEFORE creating any")
print("=" * 60)
r = requests.get(f"{BASE}/api/patients", headers=HEADERS)
print(f"  Status: {r.status_code}")
patients_before = r.json()
print(f"  Patients count: {len(patients_before)}")

print()
print("=" * 60)
print("STEP 4: Create patient (Self)")
print("=" * 60)
r = requests.post(f"{BASE}/api/patients", 
    headers={**HEADERS, "Content-Type": "application/json"},
    json={
        "name": "Abhijit Bhattacharjya",
        "relationship": "Self",
    })
print(f"  Status: {r.status_code}")
create_data = r.json()
print(f"  Response: {json.dumps(create_data, indent=2)[:500]}")
patient_id = create_data.get("patientId")
patient_user_id = create_data.get("userId")
print(f"  Created patientId: {patient_id}")
print(f"  Created patient userId: {patient_user_id}")

print()
print("=" * 60)
print("STEP 5: DB verification - check patient exists")
print("=" * 60)
cursor.execute("SELECT patient_id, user_id, name FROM patients WHERE patient_id = ?", (patient_id,))
db_row = cursor.fetchone()
if db_row:
    print(f"  DB patient_id: {db_row['patient_id']}")
    print(f"  DB user_id:    {db_row['user_id']}")
    print(f"  DB name:       {db_row['name']}")
    print(f"  user_id MATCHES auth: {db_row['user_id'] == user_id}")
else:
    print("  ERROR: Patient NOT found in database!")

print()
print("=" * 60)
print("STEP 6: List patients AFTER creating")
print("=" * 60)
r = requests.get(f"{BASE}/api/patients", headers=HEADERS)
print(f"  Status: {r.status_code}")
patients_after = r.json()
print(f"  Patients count: {len(patients_after)}")
if patients_after:
    for p in patients_after:
        print(f"    {p['patientId']} | {p['name']} | userId={p.get('userId')}")
else:
    print("  ERROR: Still 0 patients after creation!")
    # Check if the issue is the WHERE clause
    cursor.execute("SELECT patient_id, user_id, name FROM patients WHERE user_id = ?", (user_id,))
    db_rows = cursor.fetchall()
    print(f"  DB direct query with user_id={user_id}: {len(db_rows)} rows")
    for r2 in db_rows:
        print(f"    {r2['patient_id']} | {r2['user_id']} | {r2['name']}")

print()
print("=" * 60)
print("STEP 7: Upload document to patient")
print("=" * 60)
# Create a simple test PDF
try:
    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 100), "PRESCRIPTION", fontsize=16)
    page.insert_text((72, 140), "Patient Name: Abhijit Bhattacharjya")
    page.insert_text((72, 160), "Date: 2026-09-19")
    page.insert_text((72, 200), "Rx: Amoxicillin 500mg - Take 1 tablet three times daily for 7 days")
    page.insert_text((72, 220), "Rx: Paracetamol 500mg - Take as needed for pain/fever")
    page.insert_text((72, 260), "Dr. Sunita Rao, MD")
    pdf_bytes = doc.write()
    doc.close()
except Exception as e:
    print(f"  Could not create PDF: {e}")
    pdf_bytes = b"fake pdf content"

upload_headers = dict(HEADERS)  # no Content-Type for multipart
r = requests.post(f"{BASE}/api/documents/upload",
    headers=upload_headers,
    files={"file": ("Abhijit_Prescription.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    data={"patientId": patient_id, "documentType": "PRESCRIPTION"})
print(f"  Upload status: {r.status_code}")
if r.status_code == 200:
    upload_data = r.json()
    doc_id = upload_data.get("document", {}).get("documentId")
    match_result = upload_data.get("matchResult", {})
    gemini_status = upload_data.get("geminiStatus")
    detected = upload_data.get("detectedPatient", {})
    print(f"  documentId: {doc_id}")
    print(f"  geminiStatus: {gemini_status}")
    print(f"  detectedPatient: {detected.get('name')}")
    print(f"  matchResult: {match_result.get('matchType')} isTargetMatch={match_result.get('isTargetMatch')}")
    print(f"  doc.patientId: {upload_data.get('document', {}).get('patientId')}")
else:
    print(f"  Upload ERROR: {r.text[:500]}")

print()
print("=" * 60)
print("STEP 8: Check documents for patient")
print("=" * 60)
r = requests.get(f"{BASE}/api/patients/{patient_id}/documents", headers=HEADERS)
print(f"  Status: {r.status_code}")
docs = r.json()
print(f"  Documents count: {len(docs)}")
for d in docs:
    print(f"    {d.get('documentId')} | {d.get('displayName')} | patient={d.get('patientId')}")

print()
print("=" * 60)
print("STEP 9: DB verification - document exists")
print("=" * 60)
cursor.execute("SELECT document_id, patient_id, display_name, processing_status FROM documents WHERE patient_id = ?", (patient_id,))
db_docs = cursor.fetchall()
print(f"  Documents in DB for patient {patient_id}: {len(db_docs)}")
for d in db_docs:
    print(f"    {d['document_id']} | patient={d['patient_id']} | {d['display_name']} | {d['processing_status']}")

print()
print("=" * 60)
print("STEP 10: Final patient list (simulating frontend refresh)")  
print("=" * 60)
r = requests.get(f"{BASE}/api/patients", headers=HEADERS)
final_patients = r.json()
print(f"  Final patients: {len(final_patients)}")
for p in final_patients:
    print(f"    {p['patientId']} | {p['name']} | docs={p.get('documentCount', 0)}")

conn.close()

print()
print("=" * 60)
print("TRACE COMPLETE")
print("=" * 60)
