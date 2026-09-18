import os
import json
import time
from typing import Dict, Any
from ..document.document_service import DocumentService

document_service = DocumentService()
BUCKET_NAME = os.environ.get("DOCUMENTS_BUCKET_NAME", "carecue-documents")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body),
    }

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return response(400, {"error": {"code": "INVALID_JSON", "message": "Malformed JSON payload"}})

    session_id = body.get("sessionId")
    file_name = body.get("fileName", "report.pdf")
    file_type = body.get("fileType", "application/pdf")
    file_size = body.get("fileSizeBytes", 100000)

    if not session_id:
        return response(400, {"error": {"code": "MISSING_SESSION_ID", "message": "Session ID required"}})

    err = document_service.validate_upload_request(file_name, file_type, file_size)
    if err:
        return response(400, {"error": {"code": "VALIDATION_FAILED", "message": err}})

    document_id = f"doc-{int(time.time() * 1000)}"
    s3_key = f"sessions/{session_id}/documents/{document_id}.pdf"

    # Attempt S3 presigned PUT URL generation
    upload_url = None
    try:
        import boto3
        s3 = boto3.client("s3", region_name=AWS_REGION)
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": s3_key,
                "ContentType": file_type,
            },
            ExpiresIn=900  # 15 minutes
        )
    except Exception:
        # Fallback local URL when S3 is offline
        upload_url = f"http://localhost:3001/mock-upload/{s3_key}"

    return response(200, {
        "uploadUrl": upload_url,
        "documentId": document_id,
        "s3Key": s3_key,
        "expiresIn": 900,
    })

lambda_handler = handler
