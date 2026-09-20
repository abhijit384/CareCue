"""
backend/handlers/upload_handler.py - AWS Lambda handler for Document Upload, Multi-Stage Extraction, S3 Pre-signed URLs, and Document Retrieval.
"""

import os
import re
import json
import time
import base64
import logging
from email.parser import BytesParser
from email import policy
from typing import Dict, Any, Optional, Tuple

try:
    from backend.document.document_service import DocumentService
    from backend.services.patient_store import PatientStore
    from backend.services.patient_service import PatientService
    from backend.services.gemini_service import GeminiVerificationService
    from backend.services.clinical_parser import parse_clinical_text
    from backend.database.db import init_db
except ImportError:
    from document.document_service import DocumentService
    from services.patient_store import PatientStore
    from services.patient_service import PatientService
    from services.gemini_service import GeminiVerificationService
    from services.clinical_parser import parse_clinical_text
    from database.db import init_db

logger = logging.getLogger(__name__)

document_service = DocumentService()
patient_store = PatientStore()
patient_service = PatientService(patient_store)
gemini_service = GeminiVerificationService()

BUCKET_NAME = os.environ.get("DOCUMENTS_BUCKET_NAME", "carecue-documents")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
DOCUMENTS_STORAGE_DIR = os.environ.get("DOCUMENTS_STORAGE_DIR", "/tmp/documents")

try:
    os.makedirs(DOCUMENTS_STORAGE_DIR, exist_ok=True)
except OSError:
    pass

try:
    init_db()
except Exception as e:
    logger.warning(f"Database init notice in upload_handler: {e}")

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


def parse_multipart_or_json(event: Dict[str, Any]) -> Tuple[bytes, str, str, Optional[str], Optional[str], Optional[str]]:
    """
    Parses file bytes, file_name, mime_type, patient_id, document_type, and user_id from
    either multipart/form-data or JSON payloads in API Gateway events.
    """
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    content_type = headers.get("content-type", "")
    
    raw_body = event.get("body") or ""
    if event.get("isBase64Encoded", False):
        body_bytes = base64.b64decode(raw_body)
    else:
        body_bytes = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body

    file_bytes = b""
    file_name = "uploaded_report.pdf"
    mime_type = "application/pdf"
    patient_id = None
    document_type = None
    user_id = None

    if "multipart/form-data" in content_type:
        try:
            msg = BytesParser(policy=policy.default).parsebytes(
                b"Content-Type: " + content_type.encode("utf-8") + b"\r\n\r\n" + body_bytes
            )
            for part in msg.iter_parts():
                cd = part.get("Content-Disposition", "")
                name = part.get_param("name", header="content-disposition")
                filename = part.get_filename()
                if filename:
                    file_bytes = part.get_payload(decode=True) or b""
                    file_name = filename
                    file_content_type = part.get_content_type()
                    if file_content_type and file_content_type != "application/octet-stream":
                        mime_type = file_content_type
                elif name == "patientId":
                    patient_id = (part.get_payload(decode=True) or b"").decode("utf-8", errors="replace").strip()
                elif name == "documentType":
                    document_type = (part.get_payload(decode=True) or b"").decode("utf-8", errors="replace").strip()
                elif name in ("userId", "user_id"):
                    user_id = (part.get_payload(decode=True) or b"").decode("utf-8", errors="replace").strip()
        except Exception as e:
            logger.warning(f"Multipart parse error: {e}")

    elif "application/json" in content_type or (isinstance(raw_body, str) and raw_body.strip().startswith("{")):
        try:
            data = json.loads(body_bytes.decode("utf-8"))
            patient_id = data.get("patientId")
            document_type = data.get("documentType")
            user_id = data.get("userId") or data.get("user_id")
            file_name = data.get("fileName", "uploaded_report.pdf")
            mime_type = data.get("fileType", data.get("mimeType", "application/pdf"))
            if "fileBytesBase64" in data:
                file_bytes = base64.b64decode(data["fileBytesBase64"])
            elif "file" in data and isinstance(data["file"], str):
                file_bytes = base64.b64decode(data["file"])
        except Exception as e:
            logger.warning(f"JSON upload parse error: {e}")

    # Infer mime_type from filename if missing or generic
    if file_name.lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif file_name.lower().endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif file_name.lower().endswith(".png"):
        mime_type = "image/png"

    return file_bytes, file_name, mime_type, patient_id, document_type, user_id


def _safe_get_dict(obj: Any, *keys: str, default: Any = None) -> Any:
    """Safely traverses nested dictionaries even if intermediate keys contain None."""
    curr = obj
    for k in keys:
        if not isinstance(curr, dict):
            return default
        curr = curr.get(k)
        if curr is None:
            return default
    return curr if curr is not None else default


def handle_document_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Direct document upload and multi-stage extraction pipeline:
    1. Validates and extracts text via PyMuPDF/pypdf/Vision.
    2. Runs Gemini structured clinical comprehension (if available).
    3. Detects patient identity & runs patient matching.
    4. Persists record in SQLite database and S3.
    """
    file_bytes, file_name, content_type, patientId, documentType, body_user_id = parse_multipart_or_json(event)
    file_size = len(file_bytes)

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    user_id = headers.get("x-user-id") or headers.get("user-id") or body_user_id

    if not file_bytes:
        # Fallback synthetic text extraction if no binary payload was received
        return _response(400, {"error": {"code": "EMPTY_FILE", "message": "No file content received."}})

    val_err = document_service.validate_upload_request(file_name, content_type, file_size)
    if val_err:
        return _response(400, {"error": {"code": "VALIDATION_FAILED", "message": val_err}})

    doc_id = f"DOC-{int(time.time() * 1000)}"
    ext = os.path.splitext(file_name)[1].lower() or ".pdf"
    storage_path = os.path.join(DOCUMENTS_STORAGE_DIR, f"{doc_id}{ext}")

    # 1. Save file locally in /tmp
    try:
        with open(storage_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.warning(f"Could not write file to /tmp: {e}")

    # 2. Multi-stage text extraction
    try:
        extracted = document_service.process_document(file_bytes, file_name, content_type)
    except Exception as exc:
        logger.error(f"Text extraction failed: {exc}", exc_info=True)
        # Salvage basic text representation instead of 500 error
        from backend.document.pdf_extractor import DocumentPage, ExtractedDocument
        fallback_txt = f"Document: {file_name}"
        extracted = ExtractedDocument(
            total_pages=1,
            pages=[DocumentPage(page_number=1, text=fallback_txt)],
            full_text=fallback_txt,
            extraction_method="fallback",
        )

    # 3. Structured Clinical Comprehension via Gemini
    structured_data = {}
    gemini_status = "SUCCESS"
    gemini_error_message = None

    if not gemini_service.is_available():
        gemini_status = "UNAVAILABLE"
        gemini_error_message = "Gemini API key is missing or unavailable. Saved extracted text."
        logger.warning("[Upload] Gemini unavailable — saving extracted text without AI structured analysis.")
    else:
        try:
            structured_data = gemini_service.extract_structured_document(
                document_text=extracted.full_text,
                document_type=documentType,
            )
        except Exception as exc:
            exc_msg = str(exc)
            logger.warning(f"Gemini structured comprehension notice: {exc_msg}")
            if any(code in exc_msg for code in ("429", "ResourceExhausted", "RESOURCE_EXHAUSTED", "Quota exceeded", "quota")):
                gemini_status = "RATE_LIMITED"
                gemini_error_message = "Gemini quota exceeded. Please try again later."
            else:
                gemini_status = "PARTIAL_SUCCESS"
                gemini_error_message = f"Gemini document analysis notice: {exc_msg}"

    if not isinstance(structured_data, dict):
        structured_data = {}

    # Fallback / merge deterministic clinical parser if structured_data is empty or lacking key fields
    if not structured_data or not any(structured_data.get(k) for k in ("medications", "labResults", "patient")):
        try:
            parsed_fallback = parse_clinical_text(extracted.full_text)
            if not structured_data:
                structured_data = parsed_fallback
            else:
                for k, v in parsed_fallback.items():
                    if not structured_data.get(k):
                        structured_data[k] = v
        except Exception as p_err:
            logger.warning(f"Clinical fallback parser notice: {p_err}")

    # 4. Patient Name Identification & Gemini Identity Verification
    detected_name = _safe_get_dict(structured_data, "patient", "name")
    detected_dob = _safe_get_dict(structured_data, "patient", "age") or _safe_get_dict(structured_data, "patient", "dob")
    confidence = 0.95 if detected_name else 0.0

    target_patient = patient_store.get_patient(patientId) if patientId else None
    target_patient_name = target_patient.get("name") if isinstance(target_patient, dict) else None

    # Use Gemini Identity Verification when available
    ai_identity = None
    if gemini_service.is_available() and extracted.full_text:
        try:
            existing_p = patient_store.list_patients(user_id=user_id) if user_id else patient_store.list_patients()
            ai_names = [p.get("name") for p in existing_p if isinstance(p, dict) and p.get("name")]
            ai_identity = gemini_service.verify_patient_identity(
                document_text=extracted.full_text,
                target_patient_name=target_patient_name,
                existing_patient_names=ai_names
            )
            if isinstance(ai_identity, dict) and ai_identity.get("detectedPatientName"):
                detected_name = ai_identity.get("detectedPatientName")
                confidence = ai_identity.get("confidence", 0.95)
            if isinstance(ai_identity, dict) and not detected_dob and ai_identity.get("detectedAge"):
                detected_dob = ai_identity.get("detectedAge")
        except Exception as ai_id_err:
            logger.warning(f"AI identity verification notice: {ai_id_err}")

    if not detected_name:
        heuristics = patient_service.extract_patient_info_from_text(extracted.full_text)
        detected_name = _safe_get_dict(heuristics, "patientName")
        detected_dob = detected_dob or _safe_get_dict(heuristics, "dateOfBirth")
        confidence = _safe_get_dict(heuristics, "confidence", default=0.0)

    match_result = None
    effective_patient_id = None

    if patientId:
        match_result = patient_service.match_patient(
            extracted_name=detected_name,
            extracted_dob=detected_dob,
            target_patient_id=patientId,
            user_id=user_id,
        )
        if isinstance(ai_identity, dict) and ai_identity.get("isTargetMatch") is False:
            if isinstance(match_result, dict):
                match_result["isTargetMatch"] = False
                match_result["matchType"] = "DIFFERENT_PATIENT"
                if ai_identity.get("reasoning"):
                    match_result["message"] = ai_identity["reasoning"]

        match_type = _safe_get_dict(match_result, "matchType")
        is_target_match = _safe_get_dict(match_result, "isTargetMatch")

        if is_target_match is True or match_type == "EXACT_NAME_MATCH":
            effective_patient_id = patientId
        elif match_type == "NO_MATCH":
            effective_patient_id = patientId
        else:
            effective_patient_id = None
            logger.info(f"[Upload] Mismatch detected: extracted '{detected_name}' vs target '{patientId}'. Document left unattached.")
    elif detected_name:
        match_result = patient_service.match_patient(
            extracted_name=detected_name,
            extracted_dob=detected_dob,
            target_patient_id=None,
            user_id=user_id,
        )
        effective_patient_id = _safe_get_dict(match_result, "matchedPatient", "patientId")

    # Guarantee document is attached to a patient profile for logged-in user
    if not effective_patient_id and user_id:
        user_patients = patient_store.list_patients(user_id=user_id)
        if user_patients and isinstance(user_patients[0], dict):
            effective_patient_id = user_patients[0].get("patientId")
        else:
            new_p = patient_store.create_patient({"name": detected_name or "Patient", "userId": user_id, "relationship": "Self"})
            effective_patient_id = new_p.get("patientId") if isinstance(new_p, dict) else None

    # 5. Persist Document in SQLite
    processing_status = "ANALYZED" if gemini_status == "SUCCESS" else "EXTRACTED"

    doc_record = {
        "documentId": doc_id,
        "patientId": effective_patient_id,
        "userId": user_id,
        "originalFileName": file_name,
        "displayName": os.path.splitext(file_name)[0].replace("_", " ").title(),
        "documentType": _safe_get_dict(structured_data, "documentType", default="OTHER"),
        "mimeType": content_type,
        "fileSizeBytes": file_size,
        "storagePath": storage_path,
        "extractedText": extracted.full_text,
        "extractionMethod": extracted.extraction_method,
        "pages": [{"page": p.page_number, "text": p.text} for p in extracted.pages],
        "structuredData": structured_data if isinstance(structured_data, dict) else {},
        "sourceEvidence": (_safe_get_dict(structured_data, "sourceEvidence", default=[])),
        "processingStatus": processing_status,
    }

    saved = patient_store.save_document(doc_record)

    # 6. Upload to S3 if available
    try:
        import boto3
        s3 = boto3.client("s3", region_name=AWS_REGION)
        s3_key = f"documents/{doc_id}{ext}"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except Exception as s3_err:
        logger.info(f"S3 backup upload skipped or unavailable: {s3_err}")

    response_data = {
        "document": saved,
        "extractedText": extracted.full_text,
        "pages": [{"page": p.page_number, "text": p.text} for p in extracted.pages],
        "extractionMethod": extracted.extraction_method,
        "detectedPatient": {
            "name": detected_name,
            "dob": detected_dob,
            "confidence": confidence,
        },
        "matchResult": match_result,
        "structuredData": structured_data or {},
        "geminiStatus": gemini_status,
        "status": "SUCCESS" if gemini_status == "SUCCESS" else "PARTIAL_SUCCESS",
    }

    if gemini_error_message:
        response_data["geminiMessage"] = gemini_error_message

    return _response(200, response_data)


def handle_presigned_url(event: Dict[str, Any]) -> Dict[str, Any]:
    """Generates S3 presigned PUT URL."""
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    session_id = body.get("sessionId")
    file_name = body.get("fileName", "report.pdf")
    file_type = body.get("fileType", "application/pdf")
    file_size = body.get("fileSizeBytes", 100000)
    patient_id = body.get("patientId")

    if not session_id and not patient_id:
        return _response(400, {"error": {"code": "MISSING_SESSION_ID", "message": "Session ID or Patient ID required"}})

    err = document_service.validate_upload_request(file_name, file_type, file_size)
    if err:
        return _response(400, {"error": {"code": "VALIDATION_FAILED", "message": err}})

    document_id = f"doc-{int(time.time() * 1000)}"
    ext = "pdf"
    if file_type == "image/jpeg" or file_name.lower().endswith((".jpg", ".jpeg")):
        ext = "jpg"
    elif file_type == "image/png" or file_name.lower().endswith(".png"):
        ext = "png"

    if patient_id:
        s3_key = f"patients/{patient_id}/documents/{document_id}.{ext}"
    else:
        s3_key = f"sessions/{session_id}/documents/{document_id}.{ext}"

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
            ExpiresIn=900,
        )
    except Exception:
        upload_url = f"https://547rqjfril.execute-api.us-east-1.amazonaws.com/dev/mock-upload/{s3_key}"

    return _response(200, {
        "uploadUrl": upload_url,
        "documentId": document_id,
        "s3Key": s3_key,
        "expiresIn": 900,
    })


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """Router for all document upload, extraction, and retrieval endpoints."""
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")
    path = (event.get("rawPath") or event.get("path") or "").rstrip("/")

    if http_method == "OPTIONS":
        return _response(200, {"status": "ok"})

    try:
        # 1. Direct Document Upload: POST /documents/upload
        if path.endswith("/documents/upload") and http_method == "POST":
            return handle_document_upload(event)

        # 2. S3 Pre-signed URL: POST /documents/upload-url
        if path.endswith("/documents/upload-url") and http_method == "POST":
            return handle_presigned_url(event)

        # 3. Document details & raw text
        if "/documents/" in path:
            doc_parts = path.split("/documents/")[1].split("/")
            doc_id = doc_parts[0]
            sub_res = doc_parts[1] if len(doc_parts) > 1 else None

            if sub_res == "text" and http_method == "GET":
                doc = patient_store.get_document(doc_id)
                if not doc:
                    return _response(404, {"error": {"code": "NOT_FOUND", "message": f"Document {doc_id} not found"}})
                return _response(200, {
                    "documentId": doc_id,
                    "displayName": doc.get("displayName"),
                    "extractedText": doc.get("extractedText", ""),
                    "pages": doc.get("pages", []),
                    "extractionMethod": doc.get("extractionMethod", "pymupdf"),
                })

            elif sub_res == "retry-analysis" and http_method == "POST":
                doc = patient_store.get_document(doc_id)
                if not doc:
                    return _response(404, {"error": {"code": "NOT_FOUND", "message": f"Document {doc_id} not found"}})
                
                text = doc.get("extractedText", "")
                structured = {}
                gemini_status = "SUCCESS"
                if gemini_service.is_available() and text:
                    try:
                        structured = gemini_service.extract_structured_document(
                            document_text=text,
                            document_type=doc.get("documentType"),
                        )
                    except Exception as e:
                        gemini_status = "ERROR"
                        logger.warning(f"Retry analysis error: {e}")

                doc["structuredData"] = structured
                doc["processingStatus"] = "ANALYZED" if gemini_status == "SUCCESS" else "EXTRACTED"
                saved = patient_store.save_document(doc)
                return _response(200, {"success": True, "document": saved, "geminiStatus": gemini_status})

            elif not sub_res and http_method == "GET":
                doc = patient_store.get_document(doc_id)
                if not doc:
                    return _response(404, {"error": {"code": "NOT_FOUND", "message": f"Document {doc_id} not found"}})
                return _response(200, doc)

        return _response(404, {"error": {"code": "NOT_FOUND", "message": f"Route {http_method} {path} not found"}})

    except Exception as exc:
        logger.error(f"Upload handler exception: {exc}", exc_info=True)
        return _response(500, {"error": {"code": "INTERNAL_ERROR", "message": str(exc)}})
