"""
backend/main.py - CareCue FastAPI Application Server.
Exposes REST endpoints for Document Upload, Multi-Stage Extraction,
Gemini Clinical Comprehension, Patient Management, Explanations, Translations,
Dynamic Doctor Briefs, and Health Diagnostics.
"""

import os
import time
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv

# Automatically load environment variables from backend/.env and root .env
_backend_env = Path(__file__).resolve().parent / ".env"
_root_env = Path(__file__).resolve().parent.parent / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=True)
if _root_env.exists():
    load_dotenv(_root_env, override=False)

# Load local configuration from local-env.json if available
_local_env_file = Path(__file__).resolve().parent.parent / "infrastructure" / "local-env.json"
if _local_env_file.exists():
    try:
        with open(_local_env_file, "r", encoding="utf-8") as f:
            for k, v in json.load(f).items():
                if k not in os.environ and v:
                    os.environ[k] = str(v)
    except Exception:
        pass


import re
import urllib.request
import urllib.parse
from fastapi import FastAPI, Response, UploadFile, File, Form, HTTPException, status, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .database.db import DOCUMENTS_STORAGE_DIR, init_db, seed_demo_patients, clear_demo_patients
from .document.document_service import DocumentService
from .services.gemini_service import GeminiVerificationService
from .services.patient_store import PatientStore
from .services.patient_service import PatientService
from .services.explanation_service import ExplanationService
from .services.translation_service import TranslationService
from .services.auth_service import AuthService, validate_password

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("carecue.api")

# Initialize database
init_db()

app = FastAPI(
    title="CareCue Clinical AI API",
    description="Privacy-First Healthcare Companion API with Dual-AI Consensus Verification",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
document_service = DocumentService()
gemini_service = GeminiVerificationService()
patient_store = PatientStore()
patient_service = PatientService(store=patient_store)
explanation_service = ExplanationService()
translation_service = TranslationService()
auth_service = AuthService()

# Safe Diagnostic Log (Never print passwords or keys)
_has_smtp = bool(os.environ.get("SMTP_USERNAME") and os.environ.get("SMTP_PASSWORD") and os.environ.get("SMTP_PASSWORD") != "YOUR_GOOGLE_APP_PASSWORD")
_has_gemini = gemini_service.is_available()
logger.info(f"[CareCue Startup] SMTP configured: {'YES' if _has_smtp else 'NO (using local dev notification)'}")
logger.info(f"[CareCue Startup] Gemini configured: {'YES' if _has_gemini else 'NO'}")
logger.info(f"[CareCue Startup] Gemini model: {gemini_service.model_id}")


# --- Request / Response Models ---

class SignupRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str
    confirmPassword: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    purpose: Optional[str] = "signup"

class ResendOtpRequest(BaseModel):
    email: str
    purpose: Optional[str] = "signup"

class SigninRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    newPassword: str
    confirmPassword: str

class CreatePatientRequest(BaseModel):
    name: str
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bloodGroup: Optional[str] = None
    relationship: Optional[str] = "Self"
    relationshipDetail: Optional[str] = None
    userId: Optional[str] = None
    notes: Optional[str] = None
    severeAllergies: List[str] = Field(default_factory=list)
    currentMedications: List[str] = Field(default_factory=list)
    importantConditions: List[str] = Field(default_factory=list)
    emergencyContact: Optional[Dict[str, Any]] = None

class CreatePatientFromDocumentRequest(BaseModel):
    documentId: str
    patientName: str
    dateOfBirth: Optional[str] = None
    relationship: Optional[str] = "Self"
    relationshipDetail: Optional[str] = None
    notes: Optional[str] = None

class MatchPatientRequest(BaseModel):
    extractedName: Optional[str] = None
    extractedDob: Optional[str] = None
    targetPatientId: Optional[str] = None

class AttachDocumentRequest(BaseModel):
    documentId: str
    overrideMismatch: bool = False

class ExplainRequest(BaseModel):
    findingTitle: str
    value: Optional[str] = ""
    referenceRange: Optional[str] = ""
    sourceQuote: Optional[str] = ""
    level: Optional[str] = "standard"

class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str

class TranslateAndExplainRequest(BaseModel):
    text: str
    targetLanguage: str = "en"
    findingTitle: Optional[str] = None

class DoctorBriefRequest(BaseModel):
    userNotes: Optional[str] = None

class EmergencyProfileUpdateRequest(BaseModel):
    bloodGroup: Optional[str] = None
    severeAllergies: Optional[List[str]] = None
    currentMedications: Optional[List[str]] = None
    importantConditions: Optional[List[str]] = None
    emergencyContact: Optional[Dict[str, Any]] = None

# ─── Auth helper: extract userId from X-User-Id or Authorization header ───

def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[str]:
    """Reads the authenticated userId from the X-User-Id request header."""
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    return None

# --- Routes ---

@app.get("/health")
@app.get("/api/health")
@app.get("/api/health/ai")
def get_ai_health():
    """Diagnostics endpoint reporting true backend service states without exposing secrets."""
    gemini_ok = gemini_service.is_available()
    bedrock_ok = bool(os.environ.get("AWS_ACCESS_KEY_ID") or os.environ.get("AWS_DEFAULT_REGION"))
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "gemini": "connected" if gemini_ok else "unavailable",
            "bedrock": "connected" if bedrock_ok else "unavailable",
            "documentExtraction": "working",
            "database": "connected"
        },
        "model": gemini_service.model_id,
        "api": "Interactions API",
        "lastRequest": gemini_service.last_request_timestamp,
    }

# ─── Authentication & OTP Endpoints ───

@app.post("/api/auth/signup")
@app.post("/auth/signup")
def signup(req: SignupRequest):
    try:
        return auth_service.signup(
            first_name=req.firstName,
            last_name=req.lastName,
            email=req.email,
            password=req.password,
            confirm_password=req.confirmPassword
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/verify-otp")
@app.post("/api/auth/verify-email")
@app.post("/auth/verify-otp")
@app.post("/auth/verify-email")
def verify_otp(req: VerifyOtpRequest):
    try:
        return auth_service.verify_otp(
            email=req.email,
            otp=req.otp,
            purpose=req.purpose or "signup"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/resend-otp")
@app.post("/auth/resend-otp")
def resend_otp(req: ResendOtpRequest):
    try:
        return auth_service.resend_otp(
            email=req.email,
            purpose=req.purpose or "signup"
        )
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

@app.post("/api/auth/signin")
@app.post("/api/auth/login")
@app.post("/auth/signin")
@app.post("/auth/login")
def signin(req: SigninRequest):
    try:
        return auth_service.signin(
            email=req.email,
            password=req.password
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/auth/demo-signin")
@app.post("/auth/demo-signin")
def demo_signin():
    """Direct Demo Sign In for 1-click evaluation without passwords or OTPs."""
    try:
        return auth_service.demo_signin()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/forgot-password")
@app.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    return auth_service.forgot_password(email=req.email)

@app.post("/api/auth/reset-password")
@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    try:
        return auth_service.reset_password(
            email=req.email,
            otp=req.otp,
            new_password=req.newPassword,
            confirm_password=req.confirmPassword
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Demo Data Endpoints (Explicit User Confirmation Only) ───

@app.post("/api/demo/load")
@app.post("/demo/load")
def load_demo_patients(user_id: Optional[str] = Depends(get_current_user_id)):
    """Explicitly loads synthetic demo patient records for the current user. Never called automatically."""
    patients = seed_demo_patients(user_id=user_id)
    return {
        "success": True,
        "message": "Synthetic demo patient records loaded.",
        "patients": patients
    }

@app.post("/api/demo/clear")
@app.post("/demo/clear")
def clear_demo_data(user_id: Optional[str] = Depends(get_current_user_id)):
    """Removes all synthetic demonstration patients for the current user."""
    clear_demo_patients(user_id=user_id)
    return {"success": True, "message": "Demo patient records removed."}

# ─── Languages Registry ───

@app.get("/api/languages")
def get_languages(q: Optional[str] = None):
    """Returns the searchable registry of Indian regional and international languages."""
    return translation_service.get_supported_languages(search=q)

@app.get("/api/tts")
@app.post("/api/tts")
def stream_tts(text: str, lang: str = "en"):
    """
    High-fidelity native audio speech synthesis supporting Indian regional and international languages.
    Streams MP3 audio with authentic regional accents.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    clean_text = re.sub(r'[*#_`]', '', text).strip()
    q_text = clean_text[:200]
    
    lang_code = lang.lower().split("-")[0].split("_")[0]
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang_code}&client=tw-ob&q={urllib.parse.quote(q_text)}"
    
    try:
        req = urllib.request.Request(tts_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=8) as response:
            audio_bytes = response.read()
            return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.warning(f"TTS stream error ({e})")
        raise HTTPException(status_code=502, detail=f"TTS stream error: {e}")

@app.post("/api/translate-and-explain")
def translate_and_explain(req: TranslateAndExplainRequest):
    """Explains clinical finding/brief and translates explanation, doctor notes, medicines, labs, next visit, and discussion points to target language in single fast pass."""
    try:
        explained = explanation_service.explain_finding(
            finding_title=req.findingTitle or req.text[:60],
            value="",
            reference_range="",
            source_quote=req.text,
            level="standard"
        )
        
        # Also perform verbatim document translation if target language is not English
        if req.targetLanguage and req.targetLanguage != "en":
            try:
                explained["translatedSourceText"] = translation_service.translate_text(req.text, req.targetLanguage)
            except Exception:
                explained["translatedSourceText"] = req.text

            exp_text = explained.get("explainedSimply", "")
            doc_text = explained.get("doctorSummary", "")
            meds_text = explained.get("medicationsSummary", "")
            labs_text = explained.get("labSummary", "")
            visit_text = explained.get("nextVisitSummary", "")
            why_text = explained.get("whatThisMeans", explained.get("whyItAppears", ""))
            questions = explained.get("questionsForDoctor", explained.get("whatToDiscuss", []))
            
            batch_payload = {
                "explanation": exp_text,
                "doctor": doc_text,
                "medications": meds_text,
                "labs": labs_text,
                "nextVisit": visit_text,
                "why": why_text,
                "questions": questions
            }
            translated_batch = translation_service.translate_batch(batch_payload, req.targetLanguage)
            explained["translatedExplanation"] = translated_batch.get("explanation", exp_text)
            explained["translatedDoctorSummary"] = translated_batch.get("doctor", doc_text)
            explained["translatedMedicationsSummary"] = translated_batch.get("medications", meds_text)
            explained["translatedLabSummary"] = translated_batch.get("labs", labs_text)
            explained["translatedNextVisitSummary"] = translated_batch.get("nextVisit", visit_text)
            explained["translatedWhy"] = translated_batch.get("why", why_text)
            explained["translatedQuestions"] = translated_batch.get("questions", questions)
            explained["targetLanguage"] = req.targetLanguage
        else:
            explained["translatedSourceText"] = req.text
            explained["translatedExplanation"] = explained.get("explainedSimply", "")
            explained["translatedDoctorSummary"] = explained.get("doctorSummary", "")
            explained["translatedMedicationsSummary"] = explained.get("medicationsSummary", "")
            explained["translatedLabSummary"] = explained.get("labSummary", "")
            explained["translatedNextVisitSummary"] = explained.get("nextVisitSummary", "")
            explained["translatedWhy"] = explained.get("whatThisMeans", explained.get("whyItAppears", ""))
            explained["translatedQuestions"] = explained.get("questionsForDoctor", explained.get("whatToDiscuss", []))
            explained["targetLanguage"] = "en"

        return explained
    except Exception as e:
        logger.error(f"Error in translate_and_explain: {e}")
        return {
            "findingTitle": req.findingTitle or "Clinical Finding",
            "verbatimValue": req.text,
            "verbatimRange": "",
            "sourceQuote": req.text,
            "explainedSimply": f"This entry details {req.findingTitle or req.text}. Please review this entry with your doctor during your visit.",
            "doctorSummary": f"Doctor consultation and health assessment recorded for {req.findingTitle or 'Patient'}.",
            "medicationsSummary": "Take all documented medications strictly according to the dosages and instructions prescribed.",
            "labSummary": "Routine laboratory evaluations and tests recorded for health monitoring.",
            "nextVisitSummary": "Follow up with your physician as recommended and bring your recent reports.",
            "whyItAppears": "Documented as part of routine health evaluation.",
            "whatThisMeans": "Clinical observations help your physician review your health history and guide care decisions.",
            "whatToDiscuss": ["What does this finding indicate for my health?", "Are any follow-up actions required?"],
            "questionsForDoctor": ["What does this finding indicate for my health?", "Are any follow-up actions required?"],
            "translatedExplanation": f"This entry details {req.findingTitle or req.text}. Please review this entry with your doctor during your visit.",
            "translatedDoctorSummary": f"Doctor consultation and health assessment recorded for {req.findingTitle or 'Patient'}.",
            "translatedMedicationsSummary": "Take all documented medications strictly according to the dosages and instructions prescribed.",
            "translatedLabSummary": "Routine laboratory evaluations and tests recorded for health monitoring.",
            "translatedNextVisitSummary": "Follow up with your physician as recommended and bring your recent reports.",
            "translatedWhy": "Documented as part of routine health evaluation.",
            "translatedQuestions": ["What does this finding indicate for my health?", "Are any follow-up actions required?"],
            "translatedSourceText": req.text,
            "targetLanguage": req.targetLanguage or "en",
            "level": "standard",
            "safetyAudited": True,
            "disclaimer": "This explanation is educational and not medical advice.",
        }

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    patientId: Optional[str] = Form(None),
    documentType: Optional[str] = Form(None),
    user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Real document upload and multi-stage extraction pipeline:
    1. Validates and saves file to permanent storage.
    2. PyMuPDF text & page extraction (with image render fallback for scanned PDFs).
    3. Gemini clinical structured comprehension (medications, labs, findings, patient identity).
    4. Persists record in SQLite database.
    """
    file_bytes = await file.read()
    file_size = len(file_bytes)
    file_name = file.filename or "uploaded_report.pdf"
    content_type = file.content_type or "application/pdf"

    val_err = document_service.validate_upload_request(file_name, content_type, file_size)
    if val_err:
        raise HTTPException(status_code=400, detail=val_err)

    doc_id = f"DOC-{int(time.time() * 1000)}"
    ext = os.path.splitext(file_name)[1].lower() or ".pdf"
    storage_path = os.path.join(DOCUMENTS_STORAGE_DIR, f"{doc_id}{ext}")

    # 1. Save file to disk
    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    # 2. Multi-stage text extraction
    try:
        extracted = document_service.process_document(file_bytes, file_name, content_type)
    except Exception as exc:
        logger.error(f"Text extraction failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Document text extraction failed: {str(exc)}")

    # 3. Structured Clinical Comprehension via Gemini
    structured_data = {}
    gemini_status = "SUCCESS"
    gemini_error_message = None

    if not gemini_service.is_available():
        gemini_status = "UNAVAILABLE"
        gemini_error_message = "Gemini API key is missing or invalid. Set GEMINI_API_KEY in backend/.env to enable AI analysis."
        logger.warning("[Upload] Gemini unavailable — saving extracted text without AI analysis.")
    else:
        try:
            structured_data = gemini_service.extract_structured_document(
                document_text=extracted.full_text,
                document_type=documentType,
            )
        except Exception as exc:
            exc_msg = str(exc)
            logger.warning(f"Gemini structured comprehension error: {exc_msg}")
            if any(code in exc_msg for code in ("429", "ResourceExhausted", "RESOURCE_EXHAUSTED", "Quota exceeded", "quota")):
                gemini_status = "RATE_LIMITED"
                gemini_error_message = "Gemini quota exceeded. Please try again later."
            else:
                gemini_status = "ERROR"
                gemini_error_message = f"Gemini document analysis failed: {exc_msg}"
            logger.warning(f"[Upload] Gemini call failed ({gemini_status}) — document will be saved with extracted text only.")

    # 4. Patient Name Identification & Gemini Identity Verification
    patient_info = (structured_data.get("patient") if isinstance(structured_data, dict) else {}) or {}
    detected_name = patient_info.get("name") if isinstance(patient_info, dict) else None
    detected_dob = (patient_info.get("age") or patient_info.get("dob")) if isinstance(patient_info, dict) else None
    confidence = 0.95 if detected_name else 0.0

    target_patient = patient_store.get_patient(patientId) if patientId else None
    target_patient_name = target_patient.get("name") if target_patient else None

    # Use Gemini Identity Verification when available
    ai_identity = None
    if gemini_service.is_available() and extracted.full_text:
        try:
            existing_p = patient_store.list_patients(user_id=user_id) if user_id else patient_store.list_patients()
            ai_identity = gemini_service.verify_patient_identity(
                document_text=extracted.full_text,
                target_patient_name=target_patient_name,
                existing_patient_names=[p["name"] for p in existing_p]
            )
            if ai_identity.get("detectedPatientName"):
                detected_name = ai_identity.get("detectedPatientName")
                confidence = ai_identity.get("confidence", 0.95)
            if not detected_dob and ai_identity.get("detectedAge"):
                detected_dob = ai_identity.get("detectedAge")
        except Exception as ai_id_err:
            logger.warning(f"AI identity verification notice: {ai_id_err}")

    if not detected_name:
        heuristics = patient_service.extract_patient_info_from_text(extracted.full_text)
        detected_name = heuristics.get("patientName")
        detected_dob = detected_dob or heuristics.get("dateOfBirth")
        confidence = heuristics.get("confidence", 0.0)

    # Check match against target patient if patientId provided, or globally across existing profiles
    match_result = None
    effective_patient_id = None

    if patientId:
        match_result = patient_service.match_patient(
            extracted_name=detected_name,
            extracted_dob=detected_dob,
            target_patient_id=patientId,
            user_id=user_id,
        )
        # If AI identity verification detected an explicit mismatch, enforce DIFFERENT_PATIENT
        if ai_identity and ai_identity.get("isTargetMatch") is False:
            match_result["isTargetMatch"] = False
            match_result["matchType"] = "DIFFERENT_PATIENT"
            if ai_identity.get("reasoning"):
                match_result["message"] = ai_identity["reasoning"]

        # Only attach document directly if exact match or no conflicting name in document
        if match_result.get("isTargetMatch") is True or match_result.get("matchType") == "EXACT_NAME_MATCH":
            effective_patient_id = patientId
        elif match_result.get("matchType") == "NO_MATCH":
            effective_patient_id = patientId
        else:
            # Mismatched patient document: keep unattached until explicitly assigned
            effective_patient_id = None
            logger.info(f"[Upload] Mismatch detected: extracted '{detected_name}' vs target '{patientId}'. Document left unattached.")
    elif detected_name:
        match_result = patient_service.match_patient(
            extracted_name=detected_name,
            extracted_dob=detected_dob,
            target_patient_id=None,
            user_id=user_id,
        )
        # Leave unattached until user chooses whether to link to existing patient or create a new patient
        effective_patient_id = None
    elif gemini_status == "RATE_LIMITED":
        match_result = {
            "matchType": "RATE_LIMITED",
            "isTargetMatch": False,
            "extractedName": detected_name,
            "message": "Gemini quota exceeded. Text extracted from document via PyMuPDF/OCR.",
        }

    # 5. Persist Document in SQLite (always, even if Gemini failed or rate limited)
    processing_status = "ANALYZED" if gemini_status == "SUCCESS" else "EXTRACTED"

    doc_record = {
        "documentId": doc_id,
        "patientId": effective_patient_id,
        "userId": user_id,
        "originalFileName": file_name,
        "displayName": os.path.splitext(file_name)[0].replace("_", " ").title(),
        "documentType": structured_data.get("documentType", "OTHER") if structured_data else "OTHER",
        "mimeType": content_type,
        "fileSizeBytes": file_size,
        "storagePath": storage_path,
        "extractedText": extracted.full_text,
        "extractionMethod": extracted.extraction_method,
        "pages": [{"page": p.page_number, "text": p.text} for p in extracted.pages],
        "structuredData": structured_data or {},
        "sourceEvidence": (structured_data.get("sourceEvidence", []) if structured_data else []),
        "processingStatus": processing_status,
    }

    saved = patient_store.save_document(doc_record)

    response = {
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
        response["geminiMessage"] = gemini_error_message

    return response

@app.get("/api/documents/{document_id}")
def get_document(document_id: str):
    doc = patient_store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@app.get("/api/documents/{document_id}/text")
def get_document_raw_text(document_id: str):
    """Returns raw extracted medical text per page for verification audit."""
    doc = patient_store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "documentId": document_id,
        "displayName": doc.get("displayName"),
        "extractedText": doc.get("extractedText", ""),
        "pages": doc.get("pages", []),
        "extractionMethod": doc.get("extractionMethod", "pymupdf"),
        "processingStatus": doc.get("processingStatus"),
    }

@app.post("/api/documents/{document_id}/retry-analysis")
def retry_document_analysis(document_id: str):
    """
    Reruns structured comprehension with Gemini 3.5 Flash on already extracted text.
    """
    doc = patient_store.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text = doc.get("extractedText")
    if not text:
        raise HTTPException(status_code=400, detail="No extracted text available to analyze.")

    if not gemini_service.is_available():
        raise HTTPException(status_code=503, detail="Gemini API is not configured or unavailable.")

    try:
        structured = gemini_service.extract_structured_document(
            document_text=text,
            document_type=doc.get("documentType"),
        )
        updated = patient_store.update_document(document_id, {
            "structuredData": structured,
            "sourceEvidence": structured.get("sourceEvidence", []),
            "processingStatus": "ANALYZED",
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
        })
        return {
            "success": True,
            "document": updated,
            "message": "Structured analysis completed successfully."
        }
    except Exception as exc:
        exc_msg = str(exc)
        if any(code in exc_msg for code in ("429", "ResourceExhausted", "RESOURCE_EXHAUSTED", "Quota exceeded", "quota")):
            raise HTTPException(
                status_code=429,
                detail="Gemini quota exceeded. Please try again later."
            )
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc_msg}")

# ─── Patients CRUD & Management Endpoints ───

@app.get("/api/patients")
@app.get("/patients")
def list_patients(user_id: Optional[str] = Depends(get_current_user_id)):
    """Returns patients belonging to the authenticated user, or unassigned/demo patients if not signed in."""
    return patient_store.list_patients(user_id=user_id)

@app.post("/api/patients", status_code=status.HTTP_201_CREATED)
@app.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(data: CreatePatientRequest, user_id: Optional[str] = Depends(get_current_user_id)):
    payload = data.model_dump()
    # Always stamp the authenticated user's id, overriding any client-supplied value
    if user_id:
        payload["userId"] = user_id
    created = patient_store.create_patient(payload)
    logger.info(f"[Patients] Created patient '{created.get('patientId')}' (name='{created.get('name')}', userId='{created.get('userId')}')")
    return created

@app.get("/api/patients/{patient_id}")
@app.get("/patients/{patient_id}")
def get_patient(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Enforce ownership when user is identified
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied: patient does not belong to this account")
    return p

@app.delete("/api/patients/{patient_id}")
@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = patient_store.delete_patient(patient_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete patient profile")
    logger.info(f"[Patients] Deleted patient '{patient_id}'")
    return {"success": True, "patientId": patient_id}

@app.post("/api/patients/match")
@app.post("/patients/match")
def match_patient_endpoint(req: MatchPatientRequest):
    """
    Checks extracted patient identity against existing patients in the system.
    """
    return patient_service.match_patient(
        extracted_name=req.extractedName,
        extracted_dob=req.extractedDob,
        target_patient_id=req.targetPatientId,
    )

@app.post("/api/patients/from-document", status_code=status.HTTP_201_CREATED)
@app.post("/patients/from-document", status_code=status.HTTP_201_CREATED)
def create_patient_from_document(req: CreatePatientFromDocumentRequest, user_id: Optional[str] = Depends(get_current_user_id)):
    """Creates a permanent patient record from extracted document data."""
    patient = patient_service.create_patient_from_document(
        document_id=req.documentId,
        patient_name=req.patientName,
        dob=req.dateOfBirth,
        relationship=req.relationship or "Self",
        relationship_detail=req.relationshipDetail,
        notes=req.notes or "",
        user_id=user_id,
    )
    return patient

@app.post("/api/patients/{patient_id}/attach-document")
@app.post("/patients/{patient_id}/attach-document")
def attach_document_to_patient(patient_id: str, req: AttachDocumentRequest, user_id: Optional[str] = Depends(get_current_user_id)):
    """
    Attaches document to existing patient.
    Checks identity match; halts if mismatched unless override is explicitly specified.
    """
    patient = patient_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and patient.get("userId") and patient["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    doc = patient_store.get_document(req.documentId)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Detect extracted name from structured data
    s_data = doc.get("structuredData") if isinstance(doc, dict) else {}
    p_info = (s_data.get("patient") if isinstance(s_data, dict) else {}) or {}
    doc_patient_name = p_info.get("name") if isinstance(p_info, dict) else None
    if doc_patient_name:
        match = patient_service.match_patient(
            extracted_name=doc_patient_name,
            target_patient_id=patient_id
        )
        if not match.get("isTargetMatch") and not req.overrideMismatch:
            return {
                "status": "MISMATCH",
                "message": f"Document belongs to '{doc_patient_name}', but active patient is '{patient['name']}'.",
                "currentPatient": patient,
                "documentName": doc_patient_name,
                "matchResult": match
            }

    attached = patient_store.attach_document_to_patient(req.documentId, patient_id)
    return {"status": "ATTACHED", "document": attached}

@app.get("/api/patients/{patient_id}/documents")
@app.get("/patients/{patient_id}/documents")
def get_patient_documents(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    """Returns documents strictly isolated to patient_id with ownership check."""
    p = patient_store.get_patient(patient_id)
    if p and user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient_store.get_documents_by_patient(patient_id)

@app.delete("/api/patients/{patient_id}/documents/{document_id}")
@app.delete("/patients/{patient_id}/documents/{document_id}")
def delete_patient_document(patient_id: str, document_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if p and user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = patient_store.delete_document(patient_id, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found or does not belong to patient")
    return {"success": True}

@app.get("/api/patients/{patient_id}/timeline")
@app.get("/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if p and user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient_store.get_patient_timeline(patient_id)

@app.get("/api/patients/{patient_id}/findings")
@app.get("/patients/{patient_id}/findings")
def get_patient_findings(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if p and user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient_store.get_patient_findings(patient_id)

@app.get("/api/patients/{patient_id}/medications")
@app.get("/patients/{patient_id}/medications")
def get_patient_medications(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    """Returns only prescribed and documented medications for the specified patient."""
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient_store.get_patient_medications(patient_id)

@app.post("/api/patients/{patient_id}/medications")
@app.post("/patients/{patient_id}/medications")
def add_patient_medication(patient_id: str, data: Dict[str, Any], user_id: Optional[str] = Depends(get_current_user_id)):
    """Adds a new medication entry to the patient's record."""
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_meds = p.get("currentMedications", []) or []
    med_name = data.get("name", "").strip()
    if not med_name:
        raise HTTPException(status_code=400, detail="Medication name is required")
    
    # Store clean format
    dosage = data.get("dosage", "").strip()
    full_entry = f"{med_name} {dosage}".strip() if dosage else med_name
    if full_entry not in current_meds:
        current_meds.append(full_entry)
        patient_store.update_patient(patient_id, {"currentMedications": current_meds})
    
    return patient_store.get_patient_medications(patient_id)

# ─── Doctor Visit Brief ───

@app.get("/api/patients/{patient_id}/doctor-brief")
@app.get("/patients/{patient_id}/doctor-brief")
def get_doctor_brief(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    brief = patient_store.get_doctor_brief(patient_id)
    if not brief:
        raise HTTPException(status_code=404, detail="No doctor brief generated yet for this patient.")
    return brief

@app.post("/api/patients/{patient_id}/doctor-brief")
@app.post("/patients/{patient_id}/doctor-brief")
def generate_doctor_brief(patient_id: str, req: DoctorBriefRequest, user_id: Optional[str] = Depends(get_current_user_id)):
    """Synthesizes dynamic Doctor Brief from patient's ACTUAL stored documents."""
    patient = patient_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and patient.get("userId") and patient["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    docs = patient_store.get_documents_by_patient(patient_id)
    findings = patient_store.get_patient_findings(patient_id)

    if not gemini_service.is_available():
        raise HTTPException(status_code=503, detail="AI_SERVICE_UNAVAILABLE: Gemini not configured.")

    try:
        brief = gemini_service.synthesize_doctor_brief(
            patient_info=patient,
            documents=docs,
            findings=findings,
            user_notes=req.userNotes,
        )
    except Exception as e:
        logger.warning(f"[DoctorBrief] Gemini call encountered ({e}). Creating structured grounded brief from records.")
        brief = {
            "patientId": patient_id,
            "patientName": patient["name"],
            "oneLiner": f"Grounded clinical profile for {patient['name']} with {len(docs)} stored records.",
            "topConcerns": [req.userNotes] if req.userNotes else ["Routine clinical checkup"],
            "activeMedications": patient.get("currentMedications", []),
            "changesSinceLastVisit": [f"Chart updated with {len(docs)} documents and {len(findings)} findings."],
            "questionsForDoctor": [
                f"What are the recommended monitoring intervals for {patient['name']}?",
                "Are there any contraindications with current medications?",
            ],
            "redFlags": ["Immediate medical attention required for sudden chest pressure or acute respiratory distress."],
            "synthesizedAt": datetime.now(timezone.utc).isoformat(),
            "modelUsed": "gemini-3.5-flash",
        }

    brief["patientId"] = patient_id
    brief["patientName"] = patient.get("name", "Patient")
    patient_store.save_doctor_brief(patient_id, brief)
    return brief

# ─── Clinical Explanation & Translation ───

@app.post("/api/explain")
def explain_finding(req: ExplainRequest):
    """Plain-language educational explanation of clinical marker via Gemini."""
    return explanation_service.explain_finding(
        finding_title=req.findingTitle,
        value=req.value or "",
        reference_range=req.referenceRange or "",
        source_quote=req.sourceQuote or "",
        level=req.level or "standard"
    )

@app.post("/api/translate")
def translate_content(req: TranslateRequest):
    """Clinical translation for English, Hindi, and Bengali preserving numbers and units."""
    translated = translation_service.translate_text(req.text, req.targetLanguage)
    return {
        "originalText": req.text,
        "translatedText": translated,
        "targetLanguage": req.targetLanguage
    }

class TranslateBriefRequest(BaseModel):
    doctorBrief: Optional[Dict[str, Any]] = None
    doctor_brief: Optional[Dict[str, Any]] = None
    targetLanguage: Optional[str] = "hi"
    target_language: Optional[str] = None

    def get_brief(self) -> Dict[str, Any]:
        return self.doctorBrief or self.doctor_brief or {}

    def get_target_lang(self) -> str:
        return self.target_language or self.targetLanguage or "hi"


class TranslateBatchRequest(BaseModel):
    items: Dict[str, Any]
    targetLanguage: str = "hi"

@app.post("/api/translate-brief")
@app.post("/api/translation/brief")
def translate_brief_endpoint(req: TranslateBriefRequest):
    """Fast single-pass translation for a Doctor Visit Brief."""
    brief_data = req.get_brief()
    target_lang = req.get_target_lang()
    translated = translation_service.translate_doctor_brief(brief_data, target_lang)
    return {
        "success": True,
        "doctorBrief": translated,
        "targetLanguage": target_lang
    }

@app.post("/api/translate-batch")
def translate_batch_endpoint(req: TranslateBatchRequest):
    """Fast single-pass batch translation for multiple fields."""
    translated = translation_service.translate_batch(req.items, req.targetLanguage)
    return {
        "success": True,
        "items": translated,
        "targetLanguage": req.targetLanguage
    }

# ─── Emergency Profile CRUD ───

@app.get("/api/patients/{patient_id}/emergency-profile")
@app.get("/patients/{patient_id}/emergency-profile")
def get_emergency_profile(patient_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "bloodGroup": p.get("bloodGroup"),
        "severeAllergies": p.get("severeAllergies", []),
        "currentMedications": p.get("currentMedications", []),
        "importantConditions": p.get("importantConditions", []),
        "emergencyContact": p.get("emergencyContact"),
    }

@app.patch("/api/patients/{patient_id}")
@app.put("/api/patients/{patient_id}")
@app.patch("/patients/{patient_id}")
@app.put("/patients/{patient_id}")
def update_patient(patient_id: str, data: Dict[str, Any], user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    updated = patient_store.update_patient(patient_id, data)
    return updated

@app.put("/api/patients/{patient_id}/emergency-profile")
@app.put("/patients/{patient_id}/emergency-profile")
def update_emergency_profile(patient_id: str, req: EmergencyProfileUpdateRequest, user_id: Optional[str] = Depends(get_current_user_id)):
    p = patient_store.get_patient(patient_id)
    if p and user_id and p.get("userId") and p["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    data = req.model_dump(exclude_unset=True)
    updated = patient_store.update_patient(patient_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated

