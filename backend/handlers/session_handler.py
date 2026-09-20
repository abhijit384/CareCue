import json
import time
from typing import Dict, Any
try:
    from backend.services.session_store import SessionStore
except ImportError:
    from services.session_store import SessionStore

session_store = SessionStore()

def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
        },
        "body": json.dumps(body),
    }

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path_parameters = event.get("pathParameters") or {}
    session_id = path_parameters.get("sessionId")

    # 1. CREATE SESSION: POST /sessions
    if http_method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            body = {}
        session_type = body.get("type") or body.get("sessionType", "report")
        title = body.get("title")
        new_id = body.get("sessionId") or f"cc-sess-{int(time.time() * 1000)}"
        item = session_store.create_session(new_id, session_type=session_type, title=title)
        return response(201, {
            "id": item["sessionId"],
            "sessionId": item["sessionId"],
            "type": item["type"],
            "title": item.get("title"),
            "status": item["status"],
            "createdAt": item["createdAt"],
        })

    # 2. DELETE SESSION: DELETE /sessions/{sessionId}
    elif http_method == "DELETE":
        if not session_id:
            return response(400, {"error": {"code": "MISSING_ID", "message": "Session ID required"}})
        session_store.delete_session(session_id)
        return response(200, {"success": True, "sessionId": session_id})

    # 3. GET SINGLE SESSION: GET /sessions/{sessionId}
    elif http_method == "GET" and session_id:
        item = session_store.get_session(session_id)
        if not item:
            return response(404, {"error": {"code": "NOT_FOUND", "message": "Session not found"}})
        return response(200, item)

    # 4. LIST SESSIONS: GET /sessions
    elif http_method == "GET":
        items = session_store.list_sessions()
        # Ensure default mock sessions are seeded if store is empty
        if not items:
            items = [
                {
                    "id": "session-001",
                    "type": "report",
                    "status": "complete",
                    "createdAt": "2026-09-18T10:30:00.000Z",
                    "documentName": "Lab Report — Blood Panel",
                    "insightCount": 6,
                    "verifiedCount": 4,
                    "reviewCount": 2,
                },
                {
                    "id": "session-002",
                    "type": "guidance",
                    "status": "complete",
                    "createdAt": "2026-09-17T15:20:00.000Z",
                    "documentName": "Care Guidance Session",
                    "insightCount": 3,
                    "verifiedCount": 3,
                    "reviewCount": 0,
                },
                {
                    "id": "session-003",
                    "type": "brief",
                    "status": "complete",
                    "createdAt": "2026-09-16T09:10:00.000Z",
                    "documentName": "Doctor Visit Brief",
                    "insightCount": 4,
                    "verifiedCount": 3,
                    "reviewCount": 1,
                },
            ]
        return response(200, {"sessions": items})

    return response(405, {"error": {"code": "METHOD_NOT_ALLOWED", "message": "Unsupported method"}})

lambda_handler = handler
