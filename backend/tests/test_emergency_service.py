"""
backend/tests/test_emergency_service.py - Tests for Emergency Mode triage and emergency information card.
"""

import pytest
from backend.services.emergency_service import EmergencyService
from backend.handlers.emergency_handler import lambda_handler

@pytest.fixture
def service():
    return EmergencyService()

def test_critical_chest_pain_trigger(service):
    res = service.evaluate_emergency_situation(
        user_concern="Experiencing severe chest pain radiating to my shoulder",
        patient_name="Rahul Das",
        recent_findings=[{"title": "Total Cholesterol", "clinicalSignificance": "215 mg/dL"}],
    )
    assert res["state"] == "URGENT_ATTENTION"
    assert res["urgentHelpRecommended"] is True
    assert res["action"] == "SEEK_URGENT_PROFESSIONAL_HELP"
    assert res["emergencyCard"] is not None
    assert res["emergencyCard"]["patientName"] == "Rahul Das"
    assert "chest pain" in " ".join(res["emergencyCard"]["detectedSymptoms"]).lower()

def test_mild_symptom_guidance(service):
    res = service.evaluate_emergency_situation(
        user_concern="Mild fatigue and slight headache in the late afternoon",
        patient_name="Emily Davis",
    )
    assert res["state"] == "SAFETY_GUIDANCE"
    assert res["urgentHelpRecommended"] is False
    assert res["action"] == "CONTACT_HEALTHCARE_PROFESSIONAL"

def test_brief_insufficient_information(service):
    res = service.evaluate_emergency_situation("Hi")
    assert res["state"] == "NOT_ENOUGH_INFORMATION"
    assert res["emergencyCard"] is None

def test_emergency_handler_endpoint():
    event = {
        "httpMethod": "POST",
        "body": '{"userConcern": "Severe difficulty breathing and feeling faint", "patientName": "Test Patient"}'
    }
    resp = lambda_handler(event)
    assert resp["statusCode"] == 200
    assert "URGENT_ATTENTION" in resp["body"]
