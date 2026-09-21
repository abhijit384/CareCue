"""
backend/handlers/guidance_handler.py - Lambda handler for Care Guidance conversational Q&A.

Endpoints:
  - POST /guidance:
      Ask questions about findings or general medical terms in the document.
      Applies safety interception for emergencies, prescriptions, and diagnosis requests.
"""

import json
import os
from typing import Dict, Any, List
from datetime import datetime, timezone

try:
    from backend.services.safety_engine import evaluate_safety_intent, SafetyCategory
    from backend.services.session_store import SessionStore
    from backend.services.patient_store import PatientStore
    from backend.services.gemini_service import GeminiVerificationService
except ImportError:
    from services.safety_engine import evaluate_safety_intent, SafetyCategory
    from services.session_store import SessionStore
    from services.patient_store import PatientStore
    from services.gemini_service import GeminiVerificationService

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

session_store = SessionStore()
patient_store = PatientStore()
gemini_service = GeminiVerificationService()


def _json_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")

    if http_method == "OPTIONS":
        return _json_response(200, {"status": "ok"})

    if http_method != "POST":
        return _json_response(405, {"error": f"Method {http_method} not allowed"})

    try:
        return handle_ask_guidance(event)
    except Exception as exc:
        return _json_response(500, {"error": "Guidance request failed", "details": str(exc)})


def handle_ask_guidance(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /guidance
    Body:
    {
      "patientId": "PAT-...",
      "sessionId": "cc-sess-...",
      "question": "What does my cholesterol reading mean?"
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

    question = (payload.get("question") or "").strip()
    patient_id = payload.get("patientId") or payload.get("sessionId")

    if not question:
        return _json_response(400, {"error": "Question is required"})

    # 1. Safety Intent Check for Emergencies
    safety_eval = evaluate_safety_intent(question)
    if safety_eval.requires_interception and safety_eval.category == SafetyCategory.EMERGENCY:
        return _json_response(200, {
            "answer": (
                "⚠️ **URGENT SAFETY NOTICE**: Your inquiry mentions symptoms that could require emergency care. "
                "CareCue cannot provide emergency medical triage or diagnosis. Please call 911 (or your local emergency "
                "services) or visit the nearest emergency department immediately."
            ),
            "safetyCategory": safety_eval.category.value,
            "disclaimer": safety_eval.disclaimer,
            "sourceCitation": "Emergency Protocols / CareCue Safety Engine",
            "suggestedFollowUps": [
                "Call 911 immediately",
                "Contact nearest urgent care center",
            ],
            "isSafetyRedirect": True,
        })

    # 2. Contextual document & findings retrieval
    patient = patient_store.get_patient(patient_id) if patient_id else None
    documents = patient_store.get_documents_by_patient(patient_id) if patient_id else []
    findings = patient_store.get_patient_findings(patient_id) if patient_id else []

    # 3. Invoke Gemini Care Guidance with non-medical guardrail
    guidance_res = gemini_service.answer_care_guidance(
        question=question,
        patient_info=patient or {},
        documents=documents,
        findings=findings
    )

    return _json_response(200, {
        "question": question,
        "answer": guidance_res.get("answer", ""),
        "isMedical": guidance_res.get("isMedical", True),
        "safetyCategory": safety_eval.category.value,
        "disclaimer": safety_eval.disclaimer,
        "sourceCitation": "CareCue Evidence & Clinical Knowledge Base",
        "evidencePoints": guidance_res.get("evidencePoints", []),
        "suggestedFollowUps": guidance_res.get("suggestedFollowUps", []),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

