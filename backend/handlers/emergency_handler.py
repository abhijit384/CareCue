"""
backend/handlers/emergency_handler.py - Lambda handler for Emergency Mode triage and information handover.

Endpoint:
  - POST /emergency:
      Body: {
        "userConcern": "...",
        "patientName": "...",
        "recentFindings": [...],
        "recentDocuments": [...]
      }
"""

import json
from typing import Dict, Any
try:
    from backend.services.emergency_service import EmergencyService
except ImportError:
    from services.emergency_service import EmergencyService

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

emergency_service = EmergencyService()

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

        concern = payload.get("userConcern") or payload.get("concern", "")
        patient_name = payload.get("patientName")
        recent_findings = payload.get("recentFindings")
        recent_documents = payload.get("recentDocuments")

        result = emergency_service.evaluate_emergency_situation(
            user_concern=concern,
            patient_name=patient_name,
            recent_findings=recent_findings,
            recent_documents=recent_documents,
        )

        return _json_response(200, result)

    except Exception as exc:
        return _json_response(500, {"error": "Emergency triage evaluation failed", "details": str(exc)})
