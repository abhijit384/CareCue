"""
Safe local development database inspector.
Reports record counts and safe identifiers only.
NEVER prints passwords, OTPs, tokens, API keys, or secrets.
"""
import os
import sys
import sqlite3

# Reproduce the EXACT same path logic as backend/database/db.py
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "carecue.db"))

print("=" * 60)
print("CARECUE LOCAL DATABASE INSPECTOR")
print("=" * 60)
print(f"DB_PATH (from script):   {DB_PATH}")
print(f"DB exists:               {os.path.exists(DB_PATH)}")
print(f"DB size:                 {os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 'N/A'} bytes")
print(f"Script CWD:              {os.getcwd()}")
print()

# Now import the backend's DB_PATH to compare
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    from backend.database.db import DB_PATH as BACKEND_DB_PATH
    print(f"DB_PATH (from backend):  {BACKEND_DB_PATH}")
    print(f"PATHS MATCH:             {os.path.normpath(DB_PATH) == os.path.normpath(BACKEND_DB_PATH)}")
except Exception as e:
    print(f"Could not import backend DB_PATH: {e}")
    BACKEND_DB_PATH = DB_PATH

print()

if not os.path.exists(DB_PATH):
    print("ERROR: Database file does not exist!")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

cursor = conn.cursor()

# Users
cursor.execute("SELECT COUNT(*) as cnt FROM users")
user_count = cursor.fetchone()["cnt"]
print(f"Users:      {user_count}")

cursor.execute("SELECT user_id, first_name, last_name, email, email_verified FROM users")
for row in cursor.fetchall():
    print(f"  {row['user_id']} | {row['first_name']} {row['last_name']} | {row['email']} | verified={row['email_verified']}")

print()

# Patients
cursor.execute("SELECT COUNT(*) as cnt FROM patients")
patient_count = cursor.fetchone()["cnt"]
print(f"Patients:   {patient_count}")

cursor.execute("SELECT patient_id, user_id, name, relationship, is_demo FROM patients ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(f"  {row['patient_id']} | user={row['user_id']} | {row['name']} | rel={row['relationship']} | demo={row['is_demo']}")

print()

# Documents
cursor.execute("SELECT COUNT(*) as cnt FROM documents")
doc_count = cursor.fetchone()["cnt"]
print(f"Documents:  {doc_count}")

cursor.execute("SELECT document_id, patient_id, display_name, document_type, processing_status, extraction_method FROM documents ORDER BY uploaded_at DESC LIMIT 20")
for row in cursor.fetchall():
    print(f"  {row['document_id']} | patient={row['patient_id']} | {row['display_name']} | type={row['document_type']} | status={row['processing_status']} | method={row['extraction_method']}")

print()

# Doctor Briefs
cursor.execute("SELECT COUNT(*) as cnt FROM doctor_briefs")
brief_count = cursor.fetchone()["cnt"]
print(f"Briefs:     {brief_count}")

print()

# Cross-reference: patients with document counts
cursor.execute("""
SELECT p.patient_id, p.user_id, p.name, COUNT(d.document_id) as doc_count
FROM patients p
LEFT JOIN documents d ON p.patient_id = d.patient_id
GROUP BY p.patient_id
ORDER BY p.created_at DESC
LIMIT 20
""")
print("Patient -> Document associations:")
for row in cursor.fetchall():
    print(f"  {row['patient_id']} | user={row['user_id']} | {row['name']} | docs={row['doc_count']}")

print()

# Check for orphan documents (no patient_id)
cursor.execute("SELECT COUNT(*) as cnt FROM documents WHERE patient_id IS NULL")
orphan_count = cursor.fetchone()["cnt"]
print(f"Orphan documents (no patient_id): {orphan_count}")

conn.close()

print()
print("=" * 60)
print("INSPECTION COMPLETE")
print("=" * 60)
