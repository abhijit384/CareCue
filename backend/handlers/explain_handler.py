"""
backend/handlers/explain_handler.py - Lambda handler for plain-language and beginner clinical explanations.

Endpoint:
  - POST /explain:
      Body: {
        "findingTitle": "...",
        "value": "...",
        "referenceRange": "...",
        "sourceQuote": "...",
        "level": "standard" | "beginner"
      }
"""

import json
from typing import Dict, Any
from backend.services.explanation_service import ExplanationService

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

explanation_service = ExplanationService()

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

        finding_title = payload.get("findingTitle") or payload.get("title", "")
        if not finding_title:
            return _json_response(400, {"error": "findingTitle is required"})

        value = payload.get("value", "")
        reference_range = payload.get("referenceRange", "")
        source_quote = payload.get("sourceQuote", "")
        level = payload.get("level", "standard")

        result = explanation_service.explain_finding(
            finding_title=finding_title,
            value=value,
            reference_range=reference_range,
            source_quote=source_quote,
            level=level,
        )

        return _json_response(200, result)

    except Exception as exc:
        return _json_response(500, {"error": "Explanation generation failed", "details": str(exc)})
