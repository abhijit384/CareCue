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
except ImportError:
    from services.safety_engine import evaluate_safety_intent, SafetyCategory
    from services.session_store import SessionStore

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
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
      "sessionId": "cc-sess-...",
      "question": "What does a high fasting blood sugar mean for my daily routine?",
      "findingId": "f-1"               # Optional
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
    session_id = payload.get("sessionId")

    if not question:
        return _json_response(400, {"error": "Question is required"})

    # 1. Safety Intent Check
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

    # 2. Contextual document / findings retrieval
    session = session_store.get_session(session_id) if session_id else None
    findings = session.get("findings", []) if session else []

    relevant_context = ""
    finding_id = payload.get("findingId")
    if finding_id:
        target = next((f for f in findings if f.get("id") == finding_id), None)
        if target:
            relevant_context = f"Relevant finding: {target.get('title')} ({target.get('plainLanguageSummary')}). Evidence: {target.get('sourceQuote')}"

    # 3. Formulate Guidance Response (via Bedrock or Knowledge Engine)
    # If AWS Bedrock credentials exist and are enabled:
    answer, follow_ups = _generate_guidance_answer(question, relevant_context, safety_eval)

    return _json_response(200, {
        "question": question,
        "answer": answer,
        "safetyCategory": safety_eval.category.value,
        "disclaimer": safety_eval.disclaimer,
        "sourceCitation": "CareCue Evidence & Clinical Knowledge Base",
        "suggestedFollowUps": follow_ups,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


def _generate_guidance_answer(question: str, context: str, safety_eval: Any) -> tuple[str, List[str]]:
    """
    Synthesize plain-language health explanation.
    """
    q_lower = question.lower()

    if "sugar" in q_lower or "glucose" in q_lower or "a1c" in q_lower:
        answer = (
            "Fasting blood glucose measures the concentration of sugar in your bloodstream after an overnight fast (typically 8–10 hours). "
            "A reading in the 100–125 mg/dL bracket indicates impaired fasting glucose (prediabetes range). "
            "This suggests the body may be experiencing early insulin resistance, but it is not a standalone diagnosis of diabetes. "
            "Key evidence-backed habits that support healthy glycemic balance include increasing dietary soluble fiber, engaging in 150 minutes of moderate aerobic activity weekly, and pairing carbohydrate intake with protein."
        )
        follow_ups = [
            "What questions should I ask my doctor regarding my A1c?",
            "How often should fasting glucose be re-tested?",
            "What dietary adjustments have the strongest clinical evidence for glucose regulation?",
        ]
    elif "cholesterol" in q_lower or "lipid" in q_lower or "ldl" in q_lower:
        answer = (
            "Total cholesterol measures all the cholesterol in your blood, including LDL ('bad' cholesterol), HDL ('good' cholesterol), and triglycerides. "
            "Mild elevations are common and are evaluated in the context of your broader cardiovascular profile (e.g. blood pressure, family history, and smoking status). "
            "Physicians typically evaluate the ratio of HDL to LDL rather than total cholesterol alone before discussing any therapy."
        )
        follow_ups = [
            "Should I request a detailed lipid fractionation panel?",
            "How do omega-3 fatty acids affect lipid levels?",
        ]
    elif "creatinine" in q_lower or "egfr" in q_lower or "kidney" in q_lower:
        answer = (
            "Serum creatinine and eGFR (estimated Glomerular Filtration Rate) are markers of kidney filtration efficiency. "
            "A normal creatinine (typically 0.6–1.2 mg/dL) paired with an eGFR greater than 90 indicates healthy renal filtration. "
            "Adequate hydration and avoiding excessive use of NSAID pain relievers support ongoing kidney health."
        )
        follow_ups = [
            "What lifestyle factors influence creatinine levels?",
            "How does hydration impact lab test results?",
        ]
    else:
        answer = (
            f"Based on your inquiry: '{question}', medical literature suggests focusing on routine tracking, balanced nutrition, "
            "and discussing any symptomatic changes directly with your physician. "
            + (f"\n\nContext from your uploaded document: {context}" if context else "") +
            "\n\nRemember that laboratory findings are most informative when interpreted together with your complete medical history and physical exam."
        )
        follow_ups = [
            "Add this question to my Doctor Visit Brief",
            "What other markers relate to this result?",
            "What should I monitor before my next checkup?",
        ]

    if safety_eval.requires_interception:
        answer += f"\n\n*Note*: {safety_eval.disclaimer}"

    return answer, follow_ups
