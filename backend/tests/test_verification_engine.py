"""
Tests for Dual-AI Consensus Verification Engine (backend.verification).
"""

import pytest
from backend.verification.verification_types import (
    VerificationOutcome,
    GeminiVerificationResponse,
)
from backend.verification.verification_rules import evaluate_consensus
from backend.verification.comparison_service import DualAIVerificationEngine


def test_consistent_consensus():
    finding = {
        "id": "f-1",
        "title": "Metabolic Panel — Fasting Glucose Elevated",
        "plainLanguageSummary": "Fasting blood sugar level of 118 mg/dL is above typical 70-99 mg/dL range.",
        "clinicalSignificance": "Value: 118 mg/dL (Reference: 70 - 99 mg/dL)",
        "sourceQuote": "Fasting Blood Glucose: 118 mg/dL",
        "sourcePage": 1,
    }
    gemini_resp = GeminiVerificationResponse(
        status=VerificationOutcome.CONSISTENT,
        evidence_supported=True,
        value_matches=True,
        overstatement_detected=False,
        uncertainty_required=False,
        issues=[],
        reasoning_summary="Observed 118 mg/dL is confirmed above 99 mg/dL boundary.",
    )

    report = evaluate_consensus(finding, gemini_resp, evidence_grounded=True)
    assert report.outcome == VerificationOutcome.CONSISTENT
    assert "Consistent with the supplied evidence" in report.reasoning
    assert "%" not in report.confidence_tier  # No medical accuracy percentages!


def test_disagreement_value_mismatch():
    finding = {
        "id": "f-2",
        "title": "Lipid Panel — Total Cholesterol Elevated",
        "plainLanguageSummary": "Total cholesterol recorded at 295 mg/dL.",  # Hallucinated value
        "clinicalSignificance": "Value: 295 mg/dL",
        "sourceQuote": "Total Cholesterol 215 mg/dL < 200 HIGH",  # Actual is 215
        "sourcePage": 1,
    }
    gemini_resp = GeminiVerificationResponse(
        status=VerificationOutcome.NEEDS_REVIEW,
        evidence_supported=True,
        value_matches=False,
        overstatement_detected=False,
        uncertainty_required=True,
        issues=["Reported 295 mg/dL does not match source excerpt 215 mg/dL."],
        reasoning_summary="Numerical discrepancy between claim and evidence citation.",
    )

    report = evaluate_consensus(finding, gemini_resp, evidence_grounded=True)
    assert report.outcome == VerificationOutcome.NEEDS_REVIEW
    assert any("numerical" in issue.lower() or "value" in issue.lower() for issue in report.issues)


def test_unsupported_evidence_quote():
    finding = {
        "id": "f-3",
        "title": "Severe Vitamin D Deficiency",
        "plainLanguageSummary": "Vitamin D is critically low.",
        "clinicalSignificance": "Value: 10 ng/mL",
        "sourceQuote": "25-OH Vitamin D: 10 ng/mL",
        "sourcePage": 1,
    }
    gemini_resp = GeminiVerificationResponse(
        status=VerificationOutcome.CONSISTENT,
        evidence_supported=True,
        value_matches=True,
        overstatement_detected=False,
        uncertainty_required=False,
        issues=[],
        reasoning_summary="Values match.",
    )

    # When source grounding fails
    report = evaluate_consensus(finding, gemini_resp, evidence_grounded=False)
    assert report.outcome == VerificationOutcome.NEEDS_REVIEW
    assert "Source evidence excerpt was not directly confirmed" in report.issues[0]


def test_dual_engine_batch_verification():
    from unittest.mock import MagicMock
    mock_gemini = MagicMock()
    mock_gemini.model_id = "gemini-3.5-flash"
    mock_gemini.verify_finding.return_value = GeminiVerificationResponse(
        status=VerificationOutcome.CONSISTENT,
        evidence_supported=True,
        value_matches=True,
        reasoning_summary="Grounded in document text."
    )
    engine = DualAIVerificationEngine(gemini_service=mock_gemini)
    source_text = "Fasting Blood Glucose: 118 mg/dL. Total Cholesterol: 215 mg/dL."
    findings = [
        {
            "id": "f-1",
            "title": "Fasting Glucose Elevated",
            "clinicalSignificance": "Value: 118 mg/dL",
            "sourceQuote": "Fasting Blood Glucose: 118 mg/dL",
            "sourcePage": 1,
        },
        {
            "id": "f-2",
            "title": "Total Cholesterol Elevated",
            "clinicalSignificance": "Value: 215 mg/dL",
            "sourceQuote": "Total Cholesterol: 215 mg/dL",
            "sourcePage": 1,
        },
    ]

    verified, summary = engine.verify_findings(findings, source_text, session_id="test-batch-sess")
    assert len(verified) == 2
    assert summary["consistent"] >= 1
    assert "percentage" not in str(summary).lower()
