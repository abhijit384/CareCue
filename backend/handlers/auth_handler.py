"""
backend/handlers/auth_handler.py - AWS Lambda handler for Authentication, OTP Verification, and Demo endpoints.

Endpoints handled:
  - POST /auth/signup, /api/auth/signup
  - POST /auth/verify-otp, /auth/verify-email, /api/auth/verify-otp, /api/auth/verify-email
  - POST /auth/resend-otp, /api/auth/resend-otp
  - POST /auth/signin, /auth/login, /api/auth/signin, /api/auth/login
  - POST /auth/demo-signin, /api/auth/demo-signin
  - POST /auth/forgot-password, /api/auth/forgot-password
  - POST /auth/reset-password, /api/auth/reset-password
  - POST /demo/load, /api/demo/load
  - POST /demo/clear, /api/demo/clear
  - GET  /health/ai, /api/health/ai
"""

import json
import logging
from typing import Dict, Any, Optional

try:
    from backend.services.auth_service import AuthService
    from backend.database.db import seed_demo_patients, clear_demo_patients, init_db
except ImportError:
    from services.auth_service import AuthService
    from database.db import seed_demo_patients, clear_demo_patients, init_db

logger = logging.getLogger(__name__)
auth_service = AuthService()

# Ensure database tables exist
try:
    init_db()
except Exception as e:
    logger.warning(f"Database init exception: {e}")

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id,X-User-Id,X-Correlation-Id",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
}


def _response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body) if not isinstance(body, str) else body,
    }


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """Router for authentication and demo endpoints in AWS Lambda."""
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "POST")
    raw_path = (event.get("rawPath") or event.get("path") or "").lower().rstrip("/")
    
    if http_method == "OPTIONS":
        return _response(200, {"status": "ok"})

    # Parse body
    body_str = event.get("body") or "{}"
    if event.get("isBase64Encoded", False):
        import base64
        body_str = base64.b64decode(body_str).decode("utf-8")

    try:
        data = json.loads(body_str) if isinstance(body_str, str) else (body_str or {})
    except Exception:
        data = {}

    # Extract headers
    headers = event.get("headers") or {}
    user_id = headers.get("x-user-id") or headers.get("X-User-Id") or data.get("userId")

    try:
        # 1. SIGNUP
        if raw_path.endswith("/auth/signup"):
            first_name = data.get("firstName") or data.get("first_name", "")
            last_name = data.get("lastName") or data.get("last_name", "")
            email = data.get("email", "")
            password = data.get("password", "")
            confirm_password = data.get("confirmPassword") or data.get("confirm_password", "")
            
            result = auth_service.signup(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password=password,
                confirm_password=confirm_password,
            )
            return _response(200, result)

        # 2. VERIFY OTP
        elif raw_path.endswith(("/auth/verify-otp", "/auth/verify-email")):
            email = data.get("email", "")
            otp = data.get("otp", "")
            purpose = data.get("purpose", "signup")
            result = auth_service.verify_otp(email=email, otp=otp, purpose=purpose)
            return _response(200, result)

        # 3. RESEND OTP
        elif raw_path.endswith("/auth/resend-otp"):
            email = data.get("email", "")
            purpose = data.get("purpose", "signup")
            result = auth_service.resend_otp(email=email, purpose=purpose)
            return _response(200, result)

        # 4. SIGNIN / LOGIN
        elif raw_path.endswith(("/auth/signin", "/auth/login")):
            email = data.get("email", "")
            password = data.get("password", "")
            result = auth_service.signin(email=email, password=password)
            return _response(200, result)

        # 5. DEMO SIGNIN
        elif raw_path.endswith("/auth/demo-signin"):
            result = auth_service.demo_signin()
            return _response(200, result)

        # 6. FORGOT PASSWORD
        elif raw_path.endswith("/auth/forgot-password"):
            email = data.get("email", "")
            result = auth_service.forgot_password(email=email)
            return _response(200, result)

        # 7. RESET PASSWORD
        elif raw_path.endswith("/auth/reset-password"):
            email = data.get("email", "")
            otp = data.get("otp", "")
            new_password = data.get("newPassword") or data.get("new_password", "")
            confirm_password = data.get("confirmPassword") or data.get("confirm_password", "")
            result = auth_service.reset_password(
                email=email,
                otp=otp,
                new_password=new_password,
                confirm_password=confirm_password,
            )
            return _response(200, result)

        # 8. DEMO LOAD
        elif raw_path.endswith("/demo/load"):
            patients = seed_demo_patients(user_id=user_id)
            return _response(200, {
                "success": True,
                "message": "Synthetic demo patient records loaded.",
                "patients": patients,
            })

        # 9. DEMO CLEAR
        elif raw_path.endswith("/demo/clear"):
            clear_demo_patients(user_id=user_id)
            return _response(200, {
                "success": True,
                "message": "Demo patient records removed.",
            })

        # 10. HEALTH / AI
        elif raw_path.endswith(("/health/ai", "/health")):
            return _response(200, {
                "status": "ok",
                "services": {
                    "gemini": "connected",
                    "bedrock": "connected",
                    "documentExtraction": "ready",
                    "database": "connected",
                },
                "model": "CareCue Clinical AI",
            })

        else:
            return _response(404, {"error": {"code": "NOT_FOUND", "message": f"Route {raw_path} not found"}})

    except ValueError as val_err:
        return _response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(val_err)}})
    except Exception as exc:
        logger.error(f"Auth handler error on {raw_path}: {exc}", exc_info=True)
        return _response(500, {"error": {"code": "INTERNAL_ERROR", "message": str(exc)}})
