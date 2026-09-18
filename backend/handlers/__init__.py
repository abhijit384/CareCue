"""
backend/handlers package - AWS Lambda request routers and handlers.
"""

from backend.handlers.session_handler import lambda_handler as session_handler
from backend.handlers.upload_handler import lambda_handler as upload_handler
from backend.handlers.process_handler import lambda_handler as process_handler
from backend.handlers.verification_handler import lambda_handler as verification_handler
from backend.handlers.brief_handler import lambda_handler as brief_handler
from backend.handlers.guidance_handler import lambda_handler as guidance_handler

__all__ = [
    "session_handler",
    "upload_handler",
    "process_handler",
    "verification_handler",
    "brief_handler",
    "guidance_handler",
]
