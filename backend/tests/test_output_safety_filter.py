"""
Tests for Layer 4 Output Safety Filter (backend.security.output_safety_filter).
"""

import pytest
from backend.security.output_safety_filter import OutputSafetyFilter


def test_block_definitive_diagnosis():
    filter_engine = OutputSafetyFilter()
    unsafe_finding = {
        "id": "f-diag",
        "title": "Diagnosis Confirmed",
        "plainLanguageSummary": "This test conclusively confirms you have diabetes and liver failure.",
        "clinicalSignificance": "Severe",
    }
    result = filter_engine.filter_finding(unsafe_finding)

    assert result.is_safe is False
    assert result.quarantine_status == "NEEDS_REVIEW"
    assert "conclusively confirms you have diabetes" not in result.filtered_content["plainLanguageSummary"]
    assert "Clinical diagnosis requires a comprehensive medical examination" in result.filtered_content["plainLanguageSummary"]


def test_block_prescription_advice():
    filter_engine = OutputSafetyFilter()
    unsafe_finding = {
        "id": "f-rx",
        "title": "Metformin Prescription",
        "plainLanguageSummary": "Based on this level, start taking 500 mg metformin daily with meals.",
        "clinicalSignificance": "Action required",
    }
    result = filter_engine.filter_finding(unsafe_finding)

    assert result.is_safe is False
    assert result.quarantine_status == "SAFETY_REDIRECT"
    assert "500 mg metformin" not in result.filtered_content["plainLanguageSummary"]
    assert "licensed healthcare provider" in result.filtered_content["plainLanguageSummary"]


def test_block_credential_leak():
    filter_engine = OutputSafetyFilter()
    # Synthetic mock key for testing credential leak defense
    mock_token = "AIzaSy" + "000000000000000000000000000000000"
    unsafe_finding = {
        "id": "f-sec",
        "title": "Debug Token Finding",
        "plainLanguageSummary": f"Observation verified with key {mock_token}.",
        "clinicalSignificance": "None",
    }
    result = filter_engine.filter_finding(unsafe_finding)

    assert result.is_safe is False
    assert result.quarantine_status == "SAFETY_REDIRECT"
    assert "AIzaSy" not in result.filtered_content["plainLanguageSummary"]
    assert "Credential token pattern detected" in result.filtered_content["plainLanguageSummary"]


def test_allow_benign_clinical_explanation():
    filter_engine = OutputSafetyFilter()
    benign_finding = {
        "id": "f-safe",
        "title": "Complete Blood Count — Low Hemoglobin",
        "plainLanguageSummary": "Hemoglobin measures the oxygen-carrying protein in red blood cells. 10.2 g/dL is below the typical 12.0 - 16.0 g/dL reference range.",
        "clinicalSignificance": "Value: 10.2 g/dL (Reference: 12.0 - 16.0 g/dL)",
    }
    result = filter_engine.filter_finding(benign_finding)

    assert result.is_safe is True
    assert result.quarantine_status == "SAFE"
    assert len(result.issues) == 0
    assert result.filtered_content["plainLanguageSummary"] == benign_finding["plainLanguageSummary"]
