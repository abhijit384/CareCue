import sys
import os
import sqlite3
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')
from backend.services.patient_store import patient_store
from backend.services.gemini_service import GeminiVerificationService

def test_brief():
    conn = sqlite3.connect('carecue.db')
    cursor = conn.cursor()
    cursor.execute("SELECT patient_id FROM documents WHERE original_file_name LIKE '%prescription%' AND patient_id IS NOT NULL LIMIT 1;")
    r = cursor.fetchone()
    patient_id = r[0] if r else 'PAT-EA132F'
    p = patient_store.get_patient(patient_id)
    if not p:
        p = {"patientId": patient_id, "name": "Alangir Mandal"}

    print(f"Testing Doctor Brief for {p.get('name')} ({patient_id})...")
    docs = patient_store.get_documents_by_patient(patient_id)
    print(f"Documents: {len(docs)}")
    findings = patient_store.get_patient_findings(patient_id)
    print(f"Findings ({len(findings)}):")
    for f in findings:
        print(f"  • [{f.get('category')}] {f.get('claim')}")

    service = GeminiVerificationService()
    brief = service.synthesize_doctor_brief(p, docs, findings, user_notes="Sweating in hands and feet")
    print("\n" + "="*60)
    print("DOCTOR BRIEF SYNTHESIS OUTPUT:")
    print("="*60)
    print(json.dumps(brief, indent=2))

if __name__ == '__main__':
    test_brief()
