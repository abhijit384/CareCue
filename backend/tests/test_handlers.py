"""
Integration tests for Lambda Handlers (offline resilient).
"""

import json
import pytest
from backend.handlers.session_handler import lambda_handler as session_handler
from backend.handlers.upload_handler import lambda_handler as upload_handler
from backend.handlers.process_handler import lambda_handler as process_handler
from backend.handlers.brief_handler import lambda_handler as brief_handler
from backend.handlers.guidance_handler import lambda_handler as guidance_handler


def test_session_lifecycle():
    # 1. Create session
    create_event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "title": "Annual Metabolic Screening",
            "sessionType": "lab_result",
            "documentName": "screening_2026.pdf",
        }),
    }
    create_resp = session_handler(create_event)
    assert create_resp["statusCode"] == 201
    created_body = json.loads(create_resp["body"])
    session_id = created_body["sessionId"]
    assert session_id.startswith("cc-sess-")

    # 2. Get session
    get_event = {
        "httpMethod": "GET",
        "rawPath": f"/sessions/{session_id}",
        "pathParameters": {"sessionId": session_id},
    }
    get_resp = session_handler(get_event)
    assert get_resp["statusCode"] == 200
    session_data = json.loads(get_resp["body"])
    assert session_data["sessionId"] == session_id
    assert session_data["title"] == "Annual Metabolic Screening"

    # 3. List sessions
    list_event = {"httpMethod": "GET", "rawPath": "/sessions"}
    list_resp = session_handler(list_event)
    assert list_resp["statusCode"] == 200
    sessions_body = json.loads(list_resp["body"])
    sessions_list = sessions_body.get("sessions", sessions_body) if isinstance(sessions_body, dict) else sessions_body
    assert any((s.get("sessionId") == session_id or s.get("id") == session_id) for s in sessions_list)


def test_upload_url_generation():
    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": "cc-sess-test123",
            "fileName": "CBC_Report.pdf",
            "contentType": "application/pdf",
        }),
    }
    resp = upload_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "uploadUrl" in body
    assert "s3Key" in body
    assert body["s3Key"].endswith(".pdf")


def test_process_analysis_pipeline():
    session_id = "cc-sess-proc-test"
    # Pre-create session
    session_handler({
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": session_id,
            "title": "Comprehensive Metabolic Panel",
            "sessionType": "lab_result",
        }),
    })

    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": session_id,
            "documentText": (
                "Metabolic Panel: Fasting Blood Glucose: 118 mg/dL (70-99). "
                "Total Cholesterol: 215 mg/dL (<200). Patient: Jane Doe, DOB: 01/01/1980."
            ),
            "userNotes": "Felt fatigued lately",
        }),
    }
    resp = process_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["sessionId"] == session_id
    assert "findings" in body
    assert len(body["findings"]) >= 1
    assert "overallConfidence" in body
    assert body["piiRedactedCount"] >= 1


def test_brief_compilation():
    session_id = "cc-sess-brief-test"
    # Create session
    session_handler({
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": session_id,
            "title": "Annual Labs",
        }),
    })

    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": session_id,
            "customConcerns": ["Elevated fasting glucose", "Dietary adjustments"],
            "doctorName": "Dr. Sarah Jenkins",
        }),
    }
    resp = brief_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "brief" in body
    brief = body["brief"]
    assert brief["doctorName"] == "Dr. Sarah Jenkins"
    assert len(brief["suggestedQuestions"]) >= 1


def test_guidance_emergency_interception():
    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": "cc-sess-guide-1",
            "question": "I have crushing chest pain radiating to my arm",
        }),
    }
    resp = guidance_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body.get("isSafetyRedirect") is True
    assert "911" in body["answer"]


def test_guidance_benign_question():
    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": "cc-sess-guide-2",
            "question": "What is fasting glucose and why is it important?",
        }),
    }
    resp = guidance_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body.get("isSafetyRedirect", False) is False
    assert len(body["suggestedFollowUps"]) >= 1


def test_verification_handler_execution():
    from backend.handlers.verification_handler import lambda_handler as verification_handler

    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "sessionId": "cc-sess-verify-test",
            "findings": [
                {
                    "id": "f-test-1",
                    "title": "Metabolic Panel — Fasting Glucose",
                    "plainLanguageSummary": "Fasting glucose is 118 mg/dL.",
                    "clinicalSignificance": "Value: 118 mg/dL (Reference: 70 - 99 mg/dL)",
                    "sourceQuote": "Fasting Blood Glucose: 118 mg/dL",
                    "sourcePage": 1,
                }
            ],
            "sourceText": "Fasting Blood Glucose: 118 mg/dL (Reference: 70 - 99 mg/dL)",
        }),
    }
    resp = verification_handler(event)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["status"] in ("CONSISTENT", "NEEDS_REVIEW")
    assert "summary" in body
    assert body["summary"]["totalInsights"] == 1
    assert len(body["findings"]) == 1

