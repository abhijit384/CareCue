"""
Tests for CareCue Safety Engine.
"""

import pytest
from backend.services.safety_engine import evaluate_safety_intent, SafetyCategory


def test_emergency_interception():
    emergencies = [
        "I have severe chest pain and trouble breathing",
        "Experiencing sudden numbness on the left side of my face and arm",
        "Patient is coughing up large amounts of blood",
    ]
    for prompt in emergencies:
        result = evaluate_safety_intent(prompt)
        assert result.category == SafetyCategory.EMERGENCY
        assert result.requires_interception is True
        assert "911" in result.disclaimer or "Emergency" in result.disclaimer


def test_prescription_interception():
    prescriptions = [
        "What dosage of metformin should I take for this glucose reading?",
        "Prescribe me an antibiotic for this infection",
        "Should I stop taking my statin medication?",
    ]
    for prompt in prescriptions:
        result = evaluate_safety_intent(prompt)
        assert result.category == SafetyCategory.PRESCRIPTION_REQUEST
        assert result.requires_interception is True


def test_diagnostic_question():
    queries = [
        "Do I have type 2 diabetes based on this A1c?",
        "Diagnose my rash based on this report",
    ]
    for q in queries:
        result = evaluate_safety_intent(q)
        assert result.category in (SafetyCategory.DIAGNOSIS_REQUEST, SafetyCategory.HIGH_RISK_SYMPTOM)


def test_benign_information_query():
    benign = [
        "What does eGFR stand for in a metabolic panel?",
        "Can you explain the reference range for white blood cell count?",
        "What questions should I ask my doctor about slightly elevated cholesterol?",
    ]
    for b in benign:
        result = evaluate_safety_intent(b)
        assert result.requires_interception is False
        assert result.category == SafetyCategory.BENIGN_HEALTH_LITERACY
