"""
Tests for CareCue Evidence Validator and Grounding Engine.
"""

import pytest
from backend.services.evidence_validator import (
    validate_finding_grounding,
    validate_analysis_claims,
    GroundingStatus,
)


def test_grounded_finding_exact_quote():
    source_text = (
        "Fasting Blood Glucose: 118 mg/dL (Reference: 70 - 99 mg/dL) [HIGH].\n"
        "Hemoglobin A1c: 5.9% (Reference: < 5.7%)."
    )
    finding = {
        "id": "f-1",
        "title": "Elevated Fasting Glucose",
        "sourceQuote": "Fasting Blood Glucose: 118 mg/dL",
        "sourcePage": 1,
        "confidenceScore": 95,
    }

    report = validate_finding_grounding(finding, source_text)
    assert report.status in (GroundingStatus.VERIFIED, GroundingStatus.HIGH_CONFIDENCE)
    assert report.similarity_score >= 0.80
    assert report.confidence_score >= 85


def test_ungrounded_hallucinated_finding():
    source_text = (
        "Complete Blood Count (CBC) is completely normal.\n"
        "WBC: 6.5 K/uL, Platelets: 250 K/uL, Hemoglobin: 14.2 g/dL."
    )
    hallucinated_finding = {
        "id": "f-fake",
        "title": "Severe Vitamin D Deficiency",
        "sourceQuote": "25-Hydroxy Vitamin D: 11 ng/mL [CRITICALLY LOW]",
        "sourcePage": 1,
        "confidenceScore": 90,
    }

    report = validate_finding_grounding(hallucinated_finding, source_text)
    assert report.status == GroundingStatus.UNVERIFIED
    # Should be capped/penalized because quote was not in the source text
    assert report.confidence_score <= 40


def test_batch_validation():
    source_text = "Fasting Glucose: 115 mg/dL. Total Cholesterol: 210 mg/dL."
    findings = [
        {
            "id": "f-1",
            "title": "Fasting Glucose",
            "sourceQuote": "Fasting Glucose: 115 mg/dL",
        },
        {
            "id": "f-2",
            "title": "Total Cholesterol",
            "sourceQuote": "Total Cholesterol: 210 mg/dL",
        },
    ]

    verified_findings, overall_confidence = validate_analysis_claims(findings, source_text)
    assert len(verified_findings) == 2
    assert overall_confidence >= 80
    assert verified_findings[0]["verificationStatus"] == "verified"
