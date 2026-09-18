"""
Tests for CareCue PII Redaction & Privacy Minimization engine.
"""

import pytest
from backend.privacy.pii_redactor import redact_pii, restore_pii
from backend.privacy.privacy_service import redact_for_cloud
from backend.privacy.privacy_types import PIIEntityType


def test_redact_phone_and_email():
    text = "Please reach patient Jane Doe at jane.doe@example.com or 555-123-4567 regarding labs."
    result = redact_pii(text)

    assert "jane.doe@example.com" not in result.redacted_text
    assert "555-123-4567" not in result.redacted_text
    assert "[EMAIL_ADDRESS" in result.redacted_text
    assert "[PHONE_NUMBER" in result.redacted_text
    assert len(result.detected_entities) >= 2


def test_redact_mrn_and_dob():
    text = "Patient MRN: 987654321, DOB: 05/14/1982. Evaluated on 2026-03-10."
    result = redact_pii(text)

    assert "987654321" not in result.redacted_text
    assert "05/14/1982" not in result.redacted_text
    assert "[MRN" in result.redacted_text or "[PATIENT_ID" in result.redacted_text
    assert "[DATE_OF_BIRTH" in result.redacted_text


def test_pii_restoration_roundtrip():
    original = "Contact patient Alice Bob at alice@hospital.org, phone 415-555-9012."
    redaction = redact_pii(original)

    assert "alice@hospital.org" not in redaction.redacted_text

    restored = restore_pii(redaction.redacted_text, redaction.entity_map)
    assert "alice@hospital.org" in restored
    assert "415-555-9012" in restored


def test_privacy_service_preview():
    clinical_text = (
        "Patient Name: John Smith\n"
        "DOB: 12/04/1975\n"
        "Glucose: 120 mg/dL (Elevated)\n"
        "Doctor: Dr. Mark Peterson"
    )
    result = redact_for_cloud(clinical_text)

    # Patient identifiers should be stripped
    assert "John Smith" not in result.redacted_text
    # Clinical values must be preserved!
    assert "120 mg/dL" in result.redacted_text
    assert "Glucose" in result.redacted_text
