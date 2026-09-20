"""
backend/tests/test_patient_service.py - Tests for patient management, extraction, matching, and timeline.
"""

import pytest
from backend.services.patient_store import PatientStore
from backend.services.patient_service import PatientService
from backend.handlers.patient_handler import lambda_handler
from backend.database.db import seed_demo_patients, clear_demo_patients

@pytest.fixture
def clean_service():
    clear_demo_patients()
    seed_demo_patients()
    store = PatientStore()
    return PatientService(store)

def test_manual_patient_creation(clean_service):
    p = clean_service.store.create_patient(
        name="Ananya Sharma",
        date_of_birth="1995-11-20",
        email="ananya@example.com",
    )
    assert p["patientId"].upper().startswith("PAT-")
    assert p["name"] == "Ananya Sharma"
    assert p["documentCount"] == 0

    fetched = clean_service.store.get_patient(p["patientId"])
    assert fetched is not None
    assert fetched["name"] == "Ananya Sharma"

def test_extract_patient_from_document(clean_service):
    doc_text = (
        "METRO DIAGNOSTIC CLINICAL LAB\n"
        "Patient Name: Johnathan Miller\n"
        "DOB: 04/12/1978\n"
        "Fasting Blood Glucose: 114 mg/dL\n"
    )
    info = clean_service.extract_patient_info_from_text(doc_text)
    assert info["patientName"] == "Johnathan Miller"
    assert info["dateOfBirth"] == "04/12/1978"
    assert info["confidence"] >= 0.70
    assert info["isReliable"] is True

def test_exact_name_match(clean_service):
    match = clean_service.match_patient("Rahul Sharma")
    assert match["matchType"] == "EXACT_NAME_MATCH"
    assert match["matchedPatient"]["name"] == "Rahul Sharma"
    assert match["confidence"] >= 0.90

def test_different_patient_target_match(clean_service):
    # Testing when uploading for Rahul Sharma, but document contains Priya Sharma
    pats = clean_service.store.list_patients()
    rahul = next((p for p in pats if "Rahul" in p["name"]), pats[0])
    match = clean_service.match_patient("Priya Sharma", target_patient_id=rahul["patientId"])
    assert match["isTargetMatch"] is False

def test_no_name_found(clean_service):
    match = clean_service.match_patient(None)
    assert match["matchType"] == "NO_MATCH"
    assert match["matchedPatient"] is None

def test_patient_documents_and_timeline(clean_service):
    pats = clean_service.store.list_patients()
    target_pat = pats[0]
    p_id = target_pat["patientId"]
    initial_docs = clean_service.store.get_documents_by_patient(p_id)
    initial_count = len(initial_docs)

    # Add new document
    new_doc = clean_service.store.add_patient_document(
        patient_id=p_id,
        doc_type="lab_report",
        file_name="Lipid_Followup_Sep2026.pdf",
        source="City Health",
        verification_status="verified",
        findings_count=3,
        summary="Followup lipid panel",
    )
    assert new_doc["documentId"].upper().startswith("DOC-")

    updated_docs = clean_service.store.get_documents_by_patient(p_id)
    assert len(updated_docs) == initial_count + 1

    timeline = clean_service.store.get_patient_timeline(p_id)
    assert len(timeline) >= 1

def test_patient_search(clean_service):
    results = clean_service.store.list_patients(search_query="Rahul")
    assert len(results) >= 1
    assert any("Rahul" in r["name"] for r in results)

def test_patient_handler_endpoints():
    # Test GET /patients
    event = {"httpMethod": "GET", "rawPath": "/patients"}
    resp = lambda_handler(event)
    assert resp["statusCode"] == 200

    # Test POST /documents/identify-patient
    id_event = {
        "httpMethod": "POST",
        "rawPath": "/documents/identify-patient",
        "body": '{"documentText": "Patient Name: Jane Doe\\nDOB: 01/01/1980"}'
    }
    id_resp = lambda_handler(id_event)
    assert id_resp["statusCode"] == 200
    assert "Jane Doe" in id_resp["body"]
