"""
backend/tests/test_explain_service.py - Tests for simplified and beginner clinical explanations.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.services.explanation_service import ExplanationService
from backend.handlers.explain_handler import lambda_handler

@pytest.fixture
def service():
    s = ExplanationService()
    s._memory_cache.clear()
    return s

def test_explain_standard_level(service):
    mock_gemini = MagicMock()
    mock_gemini.is_available.return_value = True
    mock_gemini.explain_finding.return_value = {
        "findingTitle": "Complete Blood Count — Hemoglobin",
        "verbatimValue": "10.2 g/dL",
        "verbatimRange": "12.0 - 16.0 g/dL",
        "sourceQuote": "Hemoglobin: 10.2 g/dL. Reference range: 12-16 g/dL.",
        "explainedSimply": "This test measures Hemoglobin in your blood, recorded at 10.2 g/dL.",
        "whyItAppears": "Ordered to evaluate oxygen-carrying capacity.",
        "whatThisMeans": "Values are compared against reference ranges.",
        "whatToDiscuss": ["What dietary adjustments are recommended?", "When should this test be repeated?"],
        "questionsForDoctor": ["What dietary adjustments are recommended?", "When should this test be repeated?"],
        "level": "standard",
        "safetyAudited": True,
        "disclaimer": "This explanation is educational and not medical advice."
    }
    service._gemini_service = mock_gemini

    res = service.explain_finding(
        finding_title="Complete Blood Count — Hemoglobin",
        value="10.2 g/dL",
        reference_range="12.0 - 16.0 g/dL",
        source_quote="Hemoglobin: 10.2 g/dL. Reference range: 12-16 g/dL.",
        level="standard",
    )
    assert res["level"] == "standard"
    assert "10.2 g/dL" in res["explainedSimply"]
    assert "Hemoglobin" in res["explainedSimply"]
    assert "whyItAppears" in res
    assert len(res["whatToDiscuss"]) >= 2
    # Ensure non-diagnostic framing
    assert "you have anemia" not in res["explainedSimply"].lower()
    assert res["safetyAudited"] is True

def test_explain_beginner_level(service):
    mock_gemini = MagicMock()
    mock_gemini.is_available.return_value = True
    mock_gemini.explain_finding.return_value = {
        "findingTitle": "Lipid Panel — LDL Cholesterol",
        "verbatimValue": "138 mg/dL",
        "verbatimRange": "< 100 mg/dL",
        "sourceQuote": "LDL Cholesterol: 138 mg/dL < 100 HIGH",
        "explainedSimply": "This test measures cholesterol in your bloodstream. Your level is 138 mg/dL.",
        "whyItAppears": "Ordered to review cardiovascular and metabolic health.",
        "whatThisMeans": "Standard laboratory reference intervals.",
        "whatToDiscuss": ["How does diet affect these levels?", "Are further tests needed?"],
        "questionsForDoctor": ["How does diet affect these levels?", "Are further tests needed?"],
        "level": "beginner",
        "safetyAudited": True,
        "disclaimer": "This explanation is educational and not medical advice."
    }
    service._gemini_service = mock_gemini

    res = service.explain_finding(
        finding_title="Lipid Panel — LDL Cholesterol",
        value="138 mg/dL",
        reference_range="< 100 mg/dL",
        source_quote="LDL Cholesterol: 138 mg/dL < 100 HIGH",
        level="beginner",
    )
    assert res["level"] == "beginner"
    assert "cholesterol" in res["explainedSimply"].lower()
    assert "138 mg/dL" in res["explainedSimply"]
    # Values and units preserved verbatim
    assert res["verbatimValue"] == "138 mg/dL"
    assert res["verbatimRange"] == "< 100 mg/dL"

def test_explain_handler_endpoint():
    event = {
        "httpMethod": "POST",
        "body": '{"findingTitle": "Fasting Blood Glucose", "value": "118 mg/dL", "referenceRange": "70-99", "level": "beginner"}'
    }
    with patch("backend.services.explanation_service.ExplanationService.explain_finding") as mock_exp:
        mock_exp.return_value = {
            "findingTitle": "Fasting Blood Glucose",
            "verbatimValue": "118 mg/dL",
            "explainedSimply": "Fasting glucose was 118 mg/dL.",
            "level": "beginner",
            "safetyAudited": True
        }
        resp = lambda_handler(event)
        assert resp["statusCode"] == 200
        assert "118 mg/dL" in resp["body"]

