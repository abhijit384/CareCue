import uuid
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.services.patient_store import PatientStore

def test_local():
    store = PatientStore()
    
    # 1. Create Patient
    p = store.create_patient({
        "name": f"Test Local Patient {uuid.uuid4().hex[:4]}",
        "dateOfBirth": "1990-01-01",
        "relationship": "Self"
    })
    p_id = p["patientId"]
    print(f"1. Created Patient: {p_id} ({p['name']})")
    
    # 2. Check Patient List
    all_patients = store.list_patients()
    assert any(x["patientId"] == p_id for x in all_patients), "Patient not in list"
    print(f"2. Patient successfully appears in list_patients() (Total patients: {len(all_patients)})")
    
    # 3. Add Document
    doc = store.add_patient_document(
        patient_id=p_id,
        doc_type="LAB_REPORT",
        file_name="Blood_Test_Report.pdf",
        summary="Clinical lipid analysis",
        findings_count=4
    )
    doc_id = doc["documentId"]
    print(f"3. Document created & attached: {doc_id}")
    
    # 4. Fetch Documents for Patient
    docs = store.get_documents_by_patient(p_id)
    assert len(docs) >= 1, "Documents not found for patient"
    assert docs[0]["documentId"] == doc_id
    assert docs[0]["createdAt"] is not None
    assert docs[0]["status"] is not None
    assert docs[0]["sourceReference"] is not None
    print(f"4. Successfully retrieved {len(docs)} document(s) for patient {p_id}:")
    print(f"   - Document ID: {docs[0]['documentId']}")
    print(f"   - Display Name: {docs[0]['displayName']}")
    print(f"   - CreatedAt: {docs[0]['createdAt']}")
    print(f"   - Status: {docs[0]['status']}")
    print(f"   - Source Reference: {docs[0]['sourceReference']}")
    print(f"   - Findings Count: {docs[0]['findingsCount']}")
    print("\nALL LOCAL TESTS PASSED!")

if __name__ == "__main__":
    test_local()
