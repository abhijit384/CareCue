"""
backend/handlers/verification_handler.py - Lambda handler for independent cross-check verification.

Endpoints:
  - POST /verification:
      Evaluates findings against Google Gemini and source text evidence.
"""

import json
from typing import Dict, Any

from backend.verification.comparison_service import DualAIVerificationEngine
from backend.services.session_store import SessionStore
from backend.security.output_safety_filter import OutputSafetyFilter

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

verification_engine = DualAIVerificationEngine()
session_store = SessionStore()
output_filter = OutputSafetyFilter()


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
        return handle_verification(event)
    except Exception as exc:
        return _json_response(500, {"error": "Verification execution failed", "details": str(exc)})


def handle_verification(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /verification
    Body:
    {
      "sessionId": "cc-sess-...",
      "findings": [...],
      "sourceText": "..."
    }
    """
    body_str = event.get("body", "{}")
    if event.get("isBase64Encoded", False):
        import base64
        body_str = base64.b64decode(body_str).decode("utf-8")

    try:
        payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    except Exception:
        return _json_response(400, {"error": "Invalid JSON body"})

    session_id = payload.get("sessionId", "sess-default")
    findings = payload.get("findings")
    source_text = payload.get("sourceText", "")

    # If findings not passed directly, retrieve from session
    if not findings:
        session = session_store.get_session(session_id)
        if session:
            findings = session.get("findings", [])
            source_text = source_text or session.get("documentText", "")

    if not findings:
        return _json_response(400, {"error": "No findings provided to verify"})

    # Run Dual-AI Verification Engine (Bedrock + Gemini cross-check)
    verified_findings, summary = verification_engine.verify_findings(
        findings=findings,
        source_text=source_text,
        session_id=session_id,
    )

    # Apply Layer 4 Output Safety Filter
    safe_findings, issues = output_filter.filter_findings_batch(verified_findings)

    # Determine overall status
    overall_status = "CONSISTENT"
    if summary["safetyRedirects"] > 0:
        overall_status = "SAFETY_REDIRECT"
    elif summary["needsReview"] > 0:
        overall_status = "NEEDS_REVIEW"

    # Update session in DynamoDB
    session_store.update_session_analysis(
        session_id=session_id,
        findings=safe_findings,
        verification_status=overall_status.lower(),
        overall_confidence=92 if overall_status == "CONSISTENT" else 75,
    )

    return _json_response(200, {
        "sessionId": session_id,
        "status": overall_status,
        "summary": summary,
        "findings": safe_findings,
        "safetyIssues": issues,
    })
