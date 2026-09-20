"""
backend/tests/test_translation_service.py - Tests for clinical translation into Hindi and Bengali with token preservation.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.services.translation_service import TranslationService
from backend.handlers.translation_handler import lambda_handler

@pytest.fixture
def service():
    s = TranslationService()
    s._memory_cache.clear()
    return s

def test_hindi_translation_preserves_numbers_and_units(service):
    mock_gemini = MagicMock()
    mock_gemini.is_available.return_value = True
    mock_gemini.translate_text.return_value = "आपकी रिपोर्ट 10.2 g/dL का हीमोग्लोबिन मान दिखाती है।"
    service._gemini_service = mock_gemini

    en_text = "Your report shows a hemoglobin value of 10.2 g/dL."
    hi_text = service.translate_text(en_text, "hi")
    # Must contain exact number and unit verbatim
    assert "10.2 g/dL" in hi_text
    # Must contain Hindi script
    assert "हीमोग्लोबिन" in hi_text or "रिपोर्ट" in hi_text

def test_bengali_translation_preserves_numbers_and_units(service):
    mock_gemini = MagicMock()
    mock_gemini.is_available.return_value = True
    mock_gemini.translate_text.return_value = "আপনার রিপোর্টে 10.2 g/dL হিমোগ্লোবিনের মাত্রা দেখাচ্ছে।"
    service._gemini_service = mock_gemini

    en_text = "Your report shows a hemoglobin value of 10.2 g/dL."
    bn_text = service.translate_text(en_text, "bn")
    # Must contain exact number and unit verbatim
    assert "10.2 g/dL" in bn_text
    # Must contain Bengali script
    assert "হিমোগ্লোবিন" in bn_text or "রিপোর্টে" in bn_text

def test_token_protection_mechanism(service):
    complex_text = "Patient pat-001 has Glucose 118 mg/dL (Range: 70 - 99 mg/dL) on Page 1."
    masked, tokens = service.extract_protected_tokens(complex_text)
    assert len(tokens) >= 2
    restored = service.restore_protected_tokens(masked, tokens)
    assert restored == complex_text

def test_translate_finding_object(service):
    mock_gemini = MagicMock()
    mock_gemini.is_available.return_value = True
    mock_gemini.translate_text.side_effect = lambda text, lang: f"[HI] {text}"
    service._gemini_service = mock_gemini

    finding = {
        "id": "f-1",
        "title": "Complete Blood Count — Fasting blood glucose",
        "plainLanguageSummary": "Fasting blood glucose is within typical reference range.",
        "clinicalSignificance": "118 mg/dL (70 - 99 mg/dL)",
        "sourceQuote": "Glucose 118 mg/dL",
        "suggestedQuestionsForDoctor": [
            "What to Discuss with doctor?",
        ],
    }
    hi_finding = service.translate_finding(finding, "hi")
    assert hi_finding["currentLanguage"] == "hi"
    assert "118 mg/dL" in hi_finding["clinicalSignificance"]

def test_translation_handler_endpoint():
    event = {
        "httpMethod": "POST",
        "body": '{"text": "Your report shows a hemoglobin value of 10.2 g/dL.", "targetLanguage": "hi"}'
    }
    with patch("backend.services.translation_service.TranslationService.translate_text") as mock_t:
        mock_t.return_value = "आपकी रिपोर्ट में 10.2 g/dL का मान है।"
        resp = lambda_handler(event)
        assert resp["statusCode"] == 200
        assert "10.2 g/dL" in resp["body"]

