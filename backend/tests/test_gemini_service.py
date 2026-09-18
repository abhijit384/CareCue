"""
Tests for Google Gemini Verification Service, rate limiting, and audit logging hygiene.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.services.gemini_service import (
    GeminiVerificationService,
    MAX_REQUESTS_PER_SESSION,
)
from backend.verification.verification_types import (
    GeminiVerificationPayload,
    VerificationOutcome,
)


def test_session_request_capping():
    service = GeminiVerificationService()
    session_id = "test-cap-session"
    payload = GeminiVerificationPayload(
        finding_id="f-1",
        finding="Elevated Cholesterol",
        reported_value="215 mg/dL",
        reference_range="< 200 mg/dL",
        source_excerpt="Total Cholesterol 215 mg/dL < 200 HIGH",
        source_page=1,
    )

    # Perform MAX_REQUESTS_PER_SESSION calls
    for _ in range(MAX_REQUESTS_PER_SESSION):
        resp = service.verify_finding(payload, session_id=session_id)
        assert resp is not None

    # (MAX + 1)th call must trigger the cap and use deterministic local consensus
    capped_resp = service.verify_finding(payload, session_id=session_id)
    assert capped_resp.status in (VerificationOutcome.CONSISTENT, VerificationOutcome.NEEDS_REVIEW)
    assert service._session_request_counts[session_id] == MAX_REQUESTS_PER_SESSION


def test_audit_log_hygiene_no_health_data_or_keys():
    service = GeminiVerificationService()
    session_id = "test-audit-hygiene"
    secret_marker = "PATIENT_SSN_123_45_6789"
    payload = GeminiVerificationPayload(
        finding_id="f-audit",
        finding=f"Biomarker check {secret_marker}",
        reported_value="120 mg/dL",
        reference_range="70-99",
        source_excerpt=f"Raw sensitive excerpt containing {secret_marker}",
        source_page=1,
    )

    service.verify_finding(payload, session_id=session_id)
    audit_logs = service.get_audit_log()

    assert len(audit_logs) >= 1
    recent_entry = [entry for entry in audit_logs if entry["sessionId"] == session_id][-1]

    # Verify audit record does NOT store sensitive health or prompt text
    entry_str = str(recent_entry)
    assert secret_marker not in entry_str
    assert "source_excerpt" not in recent_entry
    assert "finding" not in recent_entry
    assert "AIzaSy" not in entry_str
    assert "verificationStatus" in recent_entry
    assert "requestSize" in recent_entry
    assert "responseSize" in recent_entry


def test_rate_limit_429_circuit_breaking():
    service = GeminiVerificationService()
    session_id = "test-429-break"
    payload = GeminiVerificationPayload(
        finding_id="f-429",
        finding="Fasting glucose",
        reported_value="118 mg/dL",
        reference_range="70-99",
        source_excerpt="Fasting glucose: 118 mg/dL",
        source_page=1,
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded for model gemini-2.5-flash")

    with patch.object(service, "_get_genai_client", return_value=mock_client):
        resp = service.verify_finding(payload, session_id=session_id)
        assert resp.status == VerificationOutcome.VERIFICATION_UNAVAILABLE
        assert "quota" in resp.reasoning_summary.lower() or "limit" in resp.reasoning_summary.lower()
