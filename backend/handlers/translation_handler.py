"""
backend/handlers/translation_handler.py - Lambda handler for multilingual clinical translation.

Endpoint:
  - POST /translation:
      Body: {
        "text": "...",
        "targetLanguage": "en" | "hi" | "bn",
        "finding": { ... }, # optional whole finding
        "doctorBrief": { ... } # optional whole brief
      }
"""

import json
from typing import Dict, Any
try:
    from backend.services.translation_service import TranslationService, SUPPORTED_LANGUAGES
except ImportError:
    from services.translation_service import TranslationService, SUPPORTED_LANGUAGES

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

translation_service = TranslationService()

def _json_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }

def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "POST")

    if http_method == "OPTIONS":
        return _json_response(200, {"status": "ok"})

    if http_method != "POST":
        return _json_response(405, {"error": f"Method {http_method} not allowed"})

    try:
        body_str = event.get("body", "{}")
        payload = json.loads(body_str) if isinstance(body_str, str) else body_str

        target_lang = payload.get("targetLanguage") or payload.get("target_lang", "en")
        if target_lang not in SUPPORTED_LANGUAGES:
            return _json_response(400, {
                "error": f"Unsupported language '{target_lang}'. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            })

        # 1. Whole Finding Translation
        if "finding" in payload and isinstance(payload["finding"], dict):
            translated_finding = translation_service.translate_finding(payload["finding"], target_lang)
            return _json_response(200, {
                "targetLanguage": target_lang,
                "finding": translated_finding,
            })

        # 2. Whole Doctor Brief Translation
        if "doctorBrief" in payload and isinstance(payload["doctorBrief"], dict):
            translated_brief = translation_service.translate_doctor_brief(payload["doctorBrief"], target_lang)
            return _json_response(200, {
                "targetLanguage": target_lang,
                "doctorBrief": translated_brief,
            })

        # 3. Arbitrary Text Block Translation
        text = payload.get("text", "")
        if not text:
            return _json_response(400, {"error": "Missing 'text', 'finding', or 'doctorBrief' to translate."})

        translated_text = translation_service.translate_text(text, target_lang)
        return _json_response(200, {
            "originalText": text,
            "translatedText": translated_text,
            "targetLanguage": target_lang,
        })

    except Exception as exc:
        return _json_response(500, {"error": "Translation failed", "details": str(exc)})
