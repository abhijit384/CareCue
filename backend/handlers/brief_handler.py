"""
backend/handlers/brief_handler.py - Lambda handler for Doctor Visit Brief compilation.

Endpoints:
  - POST /doctor-brief:
      Generate or re-compile a structured Doctor Visit Brief from session findings,
      user priorities, and discussion questions.
  - GET /doctor-brief/{sessionId}:
      Retrieve an existing Doctor Visit Brief for a session.
"""

import json
from typing import Dict, Any, List
from datetime import datetime, timezone

from backend.services.session_store import SessionStore
from backend.services.safety_engine import evaluate_safety_intent

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

session_store = SessionStore()


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

    try:
        if http_method == "POST":
            return handle_compile_brief(event)
        elif http_method == "GET":
            return handle_get_brief(event)
        else:
            return _json_response(405, {"error": f"Method {http_method} not allowed"})
    except Exception as exc:
        return _json_response(500, {"error": "Failed to compile doctor brief", "details": str(exc)})


def handle_compile_brief(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /doctor-brief
    Body:
    {
      "sessionId": "cc-sess-...",
      "customConcerns": ["Fasting blood sugar slight elevation", "Next steps for diet"],
      "selectedFindingIds": ["f-1", "f-2"],
      "doctorName": "Dr. Sarah Jenkins"
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

    session_id = payload.get("sessionId")
    if not session_id:
        return _json_response(400, {"error": "sessionId is required"})

    session = session_store.get_session(session_id)
    if not session:
        return _json_response(404, {"error": f"Session {session_id} not found"})

    findings = session.get("findings", [])
    selected_finding_ids = payload.get("selectedFindingIds")
    if selected_finding_ids:
        filtered_findings = [f for f in findings if f.get("id") in selected_finding_ids]
    else:
        filtered_findings = findings

    custom_concerns = payload.get("customConcerns", [])
    doctor_name = payload.get("doctorName")

    # Safety check on concerns
    concerns_text = " ".join(custom_concerns)
    safety_eval = evaluate_safety_intent(concerns_text)

    # Build structured summary items: partition validated vs needs-review
    validated_findings_summary = []
    items_needing_clarification = []
    questions_to_ask = []

    for f in filtered_findings:
        status = f.get("verificationStatus", "consistent").lower()
        topic_entry = {
            "topic": f.get("plainLanguageSummary", f.get("title")),
            "significance": f.get("clinicalSignificance", "Routine monitoring"),
            "verificationStatus": status,
            "evidenceQuote": f.get("sourceQuote", ""),
        }

        if status == "consistent":
            validated_findings_summary.append(topic_entry)
        else:
            items_needing_clarification.append({
                **topic_entry,
                "note": "Flagged during Bedrock/Gemini verification for clinician clarification.",
            })

        for q in f.get("suggestedQuestionsForDoctor", []):
            if q not in questions_to_ask:
                questions_to_ask.append(q)

    # Add clarification questions if any findings needed review
    if items_needing_clarification:
        questions_to_ask.insert(
            0,
            "I noticed some values flagged for review in my lab panel — how should we interpret these findings in my overall clinical context?"
        )

    # Add default questions if findings were empty
    if not questions_to_ask:
        questions_to_ask = [
            "Are my current values within acceptable ranges for my profile?",
            "What lifestyle or dietary modifications do you advise before our next follow-up?",
            "When should we repeat this lab panel to verify trends?",
        ]

    # Assemble Doctor Brief
    brief_data = {
        "briefId": f"brief-{session_id[-8:]}",
        "sessionId": session_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "doctorName": doctor_name or "Primary Care Physician",
        "sessionTitle": session.get("title", "Clinical Lab Report"),
        "patientConcerns": custom_concerns if custom_concerns else [
            "Review slightly elevated markers from recent metabolic panel",
            "Discuss preventive nutrition and exercise timeline",
        ],
        "keyDiscussionTopics": validated_findings_summary if validated_findings_summary else [
            {
                "topic": "Comprehensive Metabolic & CBC Review",
                "significance": "General wellness and biomarker assessment",
                "verificationStatus": "consistent",
                "evidenceQuote": "Panel complete",
            }
        ],
        "itemsNeedingClarification": items_needing_clarification,
        "suggestedQuestions": questions_to_ask[:5],
        "medicationReviewRequested": False,
        "verificationSummary": {
            "status": "consistent" if not items_needing_clarification else "needs_review",
            "primaryEngine": "Amazon Bedrock (Claude 3.5 Sonnet / Haiku)",
            "independentCheck": "Google Gemini (Free Tier)",
            "evidenceGrounding": "Direct document quote matching",
        },
        "disclaimer": (
            "CareCue is a health literacy companion, not a diagnostic system. "
            "This summary organizes your laboratory report findings and questions to streamline "
            "dialogue with your licensed healthcare provider."
        ),
        "safetyNotes": safety_eval.disclaimer if safety_eval.requires_interception else None,
    }

    # Store back to session
    session_store.update_session_brief(session_id, brief_data)

    return _json_response(200, {
        "sessionId": session_id,
        "brief": brief_data,
        "status": "success",
    })


def handle_get_brief(event: Dict[str, Any]) -> Dict[str, Any]:
    path_params = event.get("pathParameters") or {}
    query_params = event.get("queryStringParameters") or {}

    session_id = path_params.get("sessionId") or query_params.get("sessionId")
    if not session_id:
        path_parts = (event.get("rawPath") or "").strip("/").split("/")
        if len(path_parts) >= 2 and path_parts[0] == "doctor-brief":
            session_id = path_parts[1]

    if not session_id:
        return _json_response(400, {"error": "sessionId is required"})

    session = session_store.get_session(session_id)
    if not session:
        return _json_response(404, {"error": f"Session {session_id} not found"})

    brief = session.get("doctorBrief")
    if not brief:
        # Generate an initial brief if not already saved
        fake_event = {"body": json.dumps({"sessionId": session_id})}
        return handle_compile_brief(fake_event)

    return _json_response(200, {
        "sessionId": session_id,
        "brief": brief,
        "status": "success",
    })
