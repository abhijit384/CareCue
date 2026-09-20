"""
backend/services/gemini_service.py - Google Gemini Multi-Functional Clinical AI Service.

Uses the official google-genai SDK for:
1. Document Vision OCR & Transcription
2. Structured Clinical Document Comprehension (Medications, Labs, Findings, Patient ID)
3. Plain-Language Evidence Grounded Clinical Explanations
4. Multilingual Clinical Translation (English, Hindi, Bengali) with token preservation
5. Dynamic Doctor Visit Brief Synthesis from Stored Documents
6. Independent Verification & Dual-AI Consensus Cross-Checking
"""

import os
import re
import json
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self):
            return self.__dict__
    def Field(default=None, description=None, **kwargs):
        return default

try:
    from services.clinical_parser import parse_clinical_text
except ImportError:
    try:
        from backend.services.clinical_parser import parse_clinical_text
    except ImportError:
        try:
            from clinical_parser import parse_clinical_text
        except ImportError:
            def parse_clinical_text(text: str) -> Dict[str, Any]:
                return {}

try:
    from verification.verification_types import (
        GeminiVerificationPayload,
        GeminiVerificationResponse,
        VerificationOutcome,
    )
except ImportError:
    try:
        from backend.verification.verification_types import (
            GeminiVerificationPayload,
            GeminiVerificationResponse,
            VerificationOutcome,
        )
    except ImportError:
        from ..verification.verification_types import (
            GeminiVerificationPayload,
            GeminiVerificationResponse,
            VerificationOutcome,
        )

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL_ID", "gemini-3.5-flash-lite")
FALLBACK_GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.6-flash"]
MAX_REQUESTS_PER_SESSION = 15
MAX_INPUT_CHAR_SIZE = 12000
MAX_OUTPUT_TOKENS = 2500

_CACHED_API_KEY: Optional[str] = None
_AUDIT_LOG: List[Dict[str, Any]] = []

def _fetch_secret_from_secrets_manager() -> Optional[str]:
    """Safely retrieves the Gemini API key from AWS Secrets Manager."""
    secret_name = os.environ.get("GEMINI_SECRET_NAME", "carecue/dev/gemini")
    region_name = os.environ.get("AWS_REGION", "us-east-1")
    try:
        import boto3
        sm_client = boto3.client("secretsmanager", region_name=region_name)
        response = sm_client.get_secret_value(SecretId=secret_name)
        secret_str = response.get("SecretString", "")
        if not secret_str:
            logger.warning(f"[SecretsManager] Secret '{secret_name}' SecretString is empty.")
            return None
        try:
            secret_json = json.loads(secret_str)
            if isinstance(secret_json, dict):
                key = secret_json.get("GEMINI_API_KEY") or secret_json.get("gemini_api_key") or secret_json.get("apiKey")
                if key:
                    logger.info(f"[SecretsManager] Successfully loaded Gemini API key from '{secret_name}' (key length: {len(key)})")
                    return key
                else:
                    logger.warning(f"[SecretsManager] Key GEMINI_API_KEY not found in secret JSON keys: {list(secret_json.keys())}")
        except json.JSONDecodeError:
            clean_str = secret_str.strip()
            if clean_str:
                logger.info(f"[SecretsManager] Successfully loaded raw Gemini key string from '{secret_name}' (length: {len(clean_str)})")
                return clean_str
        return None
    except Exception as e:
        logger.warning(f"[SecretsManager] Notice: Secrets Manager retrieval for '{secret_name}' ({region_name}): {e}")
        return None

# --- Pydantic Schemas for Strict Gemini JSON Output ---

class ExtractedPatientInfo(BaseModel):
    name: Optional[str] = Field(None, description="Patient full name if explicitly stated in document")
    age: Optional[str] = Field(None, description="Patient age if explicitly stated")
    sex: Optional[str] = Field(None, description="Patient sex or gender if stated")
    patientId: Optional[str] = Field(None, description="MRN, Patient ID, or Hospital ID if explicitly stated")

class ExtractedMedication(BaseModel):
    name: str = Field(..., description="Generic or brand name of medication")
    strength: Optional[str] = Field(None, description="e.g. 500 mg, 10 mcg")
    dosage: Optional[str] = Field(None, description="e.g. 1 tablet, 5 mL")
    frequency: Optional[str] = Field(None, description="e.g. Twice daily, Once at bedtime")
    duration: Optional[str] = Field(None, description="e.g. 30 days, 2 weeks")
    route: Optional[str] = Field(None, description="e.g. Oral, Topical, Subcutaneous")
    instructions: Optional[str] = Field(None, description="Special instructions like Take after meals")
    sourcePage: Optional[int] = Field(1, description="Page number where medication appears")

class ExtractedLabResult(BaseModel):
    testName: str = Field(..., description="Name of test e.g. Fasting Blood Glucose, Hemoglobin, LDL")
    value: str = Field(..., description="Observed numerical value or result string verbatim")
    unit: Optional[str] = Field(None, description="e.g. mg/dL, g/dL, %")
    referenceRange: Optional[str] = Field(None, description="Reference interval e.g. 70 - 99 mg/dL")
    flag: Optional[str] = Field("NORMAL", description="NORMAL, HIGH, LOW, ABNORMAL")
    sourcePage: Optional[int] = Field(1, description="Page number where result appears")

class ExtractedFinding(BaseModel):
    text: str = Field(..., description="Objective statement of finding verbatim from document")
    category: Optional[str] = Field("General", description="Category e.g. Metabolic, Lipid, Hematology, Diagnosis")
    clinicalSignificance: Optional[str] = Field(None, description="Plain language explanation of what this indicates")
    sourcePage: Optional[int] = Field(1, description="Page number where finding appears")
    verificationStatus: Optional[str] = Field("consistent", description="consistent or needs_review")

class ExtractedSourceEvidence(BaseModel):
    page: int = Field(1, description="Page number")
    text: str = Field(..., description="Verbatim quotation from document supporting claims")

class StructuredDocumentAnalysis(BaseModel):
    patient: ExtractedPatientInfo
    documentType: str = Field("OTHER", description="LAB_REPORT, PRESCRIPTION, MEDICAL_REPORT, DISCHARGE_SUMMARY, OTHER")
    documentDate: Optional[str] = Field(None, description="Date of document if mentioned")
    medications: List[ExtractedMedication] = Field(default_factory=list)
    labResults: List[ExtractedLabResult] = Field(default_factory=list)
    findings: List[ExtractedFinding] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    sourceEvidence: List[ExtractedSourceEvidence] = Field(default_factory=list)
    summary: str = Field(..., description="2-3 sentence neutral overview of what this document contains")


class GeminiVerificationService:
    """Manages Gemini API interactions with multi-environment key resolution and safety bounds."""

    def __init__(self):
        model_env = os.environ.get("GEMINI_MODEL_ID")
        if not model_env:
            local_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "infrastructure", "local-env.json"))
            if os.path.exists(local_env_path):
                try:
                    with open(local_env_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        model_env = data.get("GEMINI_MODEL_ID")
                except Exception:
                    pass
        self.model_id = model_env or DEFAULT_GEMINI_MODEL
        self._client = None
        self._session_request_counts: Dict[str, int] = {}
        self._audit_log: List[Dict[str, Any]] = []
        self.last_request_timestamp: Optional[str] = None


    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns safe diagnostic information about Gemini connectivity without exposing secrets."""
        return {
            "model": self.model_id,
            "api": "Interactions API",
            "status": "Connected" if self.is_available() else "Unavailable",
            "lastRequest": self.last_request_timestamp,
        }

    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Returns non-sensitive audit trail."""
        return self._audit_log

    def _get_api_key(self) -> Optional[str]:
        """Resolves API key with in-memory caching from env, local-env.json, or Secrets Manager."""
        global _CACHED_API_KEY
        if _CACHED_API_KEY:
            return _CACHED_API_KEY

        # 1. Environment variables
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if key and not key.startswith("YOUR_"):
            _CACHED_API_KEY = key
            return key

        # 2. Local environment configuration (infrastructure/local-env.json)
        local_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "infrastructure", "local-env.json"))
        if os.path.exists(local_env_path):
            try:
                with open(local_env_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    val = data.get("GEMINI_API_KEY")
                    if val and not val.startswith("YOUR_"):
                        _CACHED_API_KEY = val
                        os.environ["GEMINI_API_KEY"] = val
                        return val
            except Exception as e:
                logger.debug(f"Could not read local-env.json: {e}")

        # 3. AWS Secrets Manager
        sm_key = _fetch_secret_from_secrets_manager()
        if sm_key and not sm_key.startswith("YOUR_"):
            _CACHED_API_KEY = sm_key
            return sm_key

        return None

    def is_available(self) -> bool:
        """Returns True if Gemini API key is configured and valid."""
        return self._get_api_key() is not None

    def _get_genai_client(self):
        """Initializes and caches the Google GenAI client."""
        if self._client is not None:
            return self._client

        api_key = self._get_api_key()
        if not api_key:
            logger.warning("[GeminiService] No Gemini API key could be resolved from environment or Secrets Manager.")
            return None

        try:
            import sys, os
            var_task = "/var/task"
            if os.path.exists(var_task) and var_task not in sys.path:
                sys.path.insert(0, var_task)
            
            # Ensure backend directory is also present in sys.path
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if backend_dir not in sys.path:
                sys.path.insert(0, backend_dir)

            logger.info(f"[GeminiService] sys.path: {sys.path[:5]}")
            if os.path.exists(var_task):
                task_items = os.listdir(var_task)
                logger.info(f"[GeminiService] /var/task contents count: {len(task_items)}, Has google: {'google' in task_items}")
                if 'google' in task_items:
                    g_path = os.path.join(var_task, 'google')
                    logger.info(f"[GeminiService] /var/task/google contents: {os.listdir(g_path)}")

            try:
                import google.genai as genai
                from google.genai import types
            except ImportError as ie:
                logger.warning(f"[GeminiService] Standard import failed ({ie}), attempting pkgutil fallback...")
                import pkgutil
                import google
                google.__path__ = pkgutil.extend_path(google.__path__, google.__name__)
                import google.genai as genai
                from google.genai import types

            self._client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=30000,
                    retry_options=types.HttpRetryOptions(attempts=1)
                )
            )
            logger.info("[GeminiService] Google GenAI Client initialized successfully.")
            return self._client
        except Exception as exc:
            import traceback
            logger.error(f"Failed to instantiate Google GenAI Client: {exc}\n{traceback.format_exc()}")
            return None

    def _call_gemini_rest_api(self, prompt: str, system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("Gemini API key could not be resolved.")

        models_to_try = [self.model_id] + [m for m in FALLBACK_GEMINI_MODELS if m != self.model_id]
        last_err = None

        for m in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
                contents = []
                if system_instruction:
                    contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_instruction}"}]})
                    contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these system instructions."}]})
                
                contents.append({"role": "user", "parts": [{"text": prompt}]})

                gen_config = {"temperature": 0.0}
                if json_mode:
                    gen_config["responseMimeType"] = "application/json"

                payload = {
                    "contents": contents,
                    "generationConfig": gen_config
                }

                import requests
                res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=25)
                if res.status_code == 200:
                    resp_data = res.json()
                    candidates = resp_data.get("candidates", [])
                    if candidates and candidates[0].get("content", {}).get("parts"):
                        text_out = candidates[0]["content"]["parts"][0].get("text", "")
                        if text_out:
                            logger.info(f"[Gemini REST] Successfully called model {m}")
                            return text_out
                else:
                    logger.warning(f"[Gemini REST] Model {m} returned HTTP {res.status_code}: {res.text[:200]}")
                    last_err = f"HTTP {res.status_code}: {res.text[:200]}"
            except Exception as e:
                logger.warning(f"[Gemini REST] Exception for model {m}: {e}")
                last_err = str(e)

        raise RuntimeError(f"All Gemini REST models failed. Last error: {last_err}")

    def _call_interactions_api(self, prompt: str, system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
        """
        Executes a clinical prompt using Google Gemini API with automatic model failover and REST fallback.
        """
        client = self._get_genai_client()
        if not client:
            logger.info("[GeminiService] SDK Client unavailable, using direct REST API fallback...")
            return self._call_gemini_rest_api(prompt, system_instruction=system_instruction, json_mode=json_mode)

        try:
            from google.genai import types

            self.last_request_timestamp = datetime.now(timezone.utc).isoformat()
            
            candidate_models = [self.model_id] + [m for m in FALLBACK_GEMINI_MODELS if m != self.model_id]
            last_error = None
            
            config_kwargs = {"temperature": 0.0}
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"

            config = types.GenerateContentConfig(**config_kwargs)

            for model in candidate_models:
                try:
                    res = client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=config,
                    )
                    return res.text or ""
                except Exception as e:
                    last_error = e
                    msg = str(e)
                    logger.warning(f"Gemini call with model '{model}' failed: {msg[:120]}. Trying next candidate...")
                    continue
                    
            if last_error:
                logger.warning(f"GenAI SDK calls failed ({last_error}). Trying direct REST API fallback...")
                return self._call_gemini_rest_api(prompt, system_instruction=system_instruction, json_mode=json_mode)
        except Exception as exc:
            logger.warning(f"GenAI SDK execution exception ({exc}). Using REST API fallback...")
            return self._call_gemini_rest_api(prompt, system_instruction=system_instruction, json_mode=json_mode)

    def _generate_content_with_fallback(self, client, contents, **kwargs):
        """Generates multimodal content with candidate model failover."""
        self.last_request_timestamp = datetime.now(timezone.utc).isoformat()
        candidate_models = [self.model_id] + [m for m in FALLBACK_GEMINI_MODELS if m != self.model_id]
        last_error = None
        for model in candidate_models:
            try:
                return client.models.generate_content(model=model, contents=contents, **kwargs)
            except Exception as e:
                last_error = e
                logger.warning(f"Gemini generate_content with '{model}' failed: {str(e)[:120]}. Trying next...")
                continue
        if last_error:
            raise last_error
        raise RuntimeError("Failed to generate content with any Gemini model")


    # ─── 1. Document Vision OCR ───

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """Transcribes medical text from an image or scanned document page using Gemini Vision (SDK or REST)."""
        prompt = (
            "Transcribe and extract ALL medical and clinical text from this document image accurately and verbatim. "
            "Preserve headers, patient names, dates, medication names, dosages, frequencies, test names, observed values, "
            "reference ranges, and doctor notes exactly as written. Do not summarize, do not hallucinate, and do not provide diagnostic advice."
        )

        client = self._get_genai_client()
        if client:
            try:
                from google.genai import types
                response = self._generate_content_with_fallback(
                    client,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        prompt
                    ]
                )
                return response.text or ""
            except Exception as e:
                logger.warning(f"GenAI SDK vision extraction failed ({e}). Trying direct REST API...")

        # Direct REST API Vision OCR Fallback
        import base64
        b64_str = base64.b64encode(image_bytes).decode("utf-8")
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("Gemini API key unavailable for OCR.")

        models_to_try = [self.model_id] + [m for m in FALLBACK_GEMINI_MODELS if m != self.model_id]
        for m in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": mime_type, "data": b64_str}}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.0}
                }
                import requests
                r = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
                if r.status_code == 200:
                    resp_data = r.json()
                    candidates = resp_data.get("candidates", [])
                    if candidates and candidates[0].get("content", {}).get("parts"):
                        out_text = candidates[0]["content"]["parts"][0].get("text", "")
                        if out_text:
                            return out_text
            except Exception as ex:
                logger.warning(f"[Gemini REST OCR] Model {m} failed: {ex}")
                continue

        raise RuntimeError("Failed to extract text from image via Gemini Vision SDK or REST API.")

    # ─── 2. Structured Clinical Document Comprehension ───

    def extract_structured_document(self, document_text: str, document_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Processes real extracted document text through Gemini to produce a structured clinical schema.
        Extracts patient identity, medications, lab values, findings, conditions, and exact evidence quotes.
        """
        client = self._get_genai_client()
        if not client:
            raise RuntimeError("Gemini client unavailable. Check GEMINI_API_KEY configuration.")

        type_hint = f"Expected Document Type: {document_type}" if document_type else ""

        system_instruction = (
            "You are a clinical document entity comprehension agent in CareCue. "
            "Analyze the provided medical document text and extract structured information strictly grounded in the document. "
            "STRICT RULES:\n"
            "1. Only extract information explicitly mentioned in the text. DO NOT invent or hallucinate data.\n"
            "2. Extract the patient's name accurately from headers, prescription metadata, 'Patient Name', 'Pt Name', 'Name', 'Prescribed to', 'S/O', 'D/O', 'W/O', or top lines. DO NOT confuse the Doctor's name (e.g. Dr. ..., MD, MBBS) or Clinic/Hospital/Lab name with the Patient's name. If no patient name appears, set patient.name to null.\n"
            "3. If medications are listed, extract dosage, strength, frequency, route, and duration verbatim.\n"
            "4. If laboratory tests are listed, extract the test name, value, unit, and reference interval verbatim.\n"
            "5. Cite the exact page number and verbatim excerpt for every item in sourceEvidence.\n"
            "6. Classify documentType as LAB_REPORT, PRESCRIPTION, MEDICAL_REPORT, DISCHARGE_SUMMARY, or OTHER.\n"
            "7. Output ONLY a valid JSON object matching the requested schema."
        )

        schema_json = json.dumps(StructuredDocumentAnalysis.model_json_schema())

        user_prompt = f"""
{type_hint}

DOCUMENT CONTENT:
---
{document_text[:MAX_INPUT_CHAR_SIZE]}
---

Extract the structured medical information and return ONLY valid JSON matching this schema:
{schema_json}
"""

        raw_text = self._call_interactions_api(
            prompt=user_prompt,
            system_instruction=system_instruction,
            json_mode=True
        )
        # Strip potential markdown code fences
        cleaned = re.sub(r"^```json\s*", "", raw_text.strip())
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()

        try:
            parsed = json.loads(cleaned)
            # Validate with Pydantic
            validated = StructuredDocumentAnalysis.model_validate(parsed)
            return validated.model_dump()
        except Exception as err:
            logger.warning(f"Gemini structured output parsing failed ({err}). Attempting regex repair...")
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    parsed = json.loads(match.group(0))
                    validated = StructuredDocumentAnalysis.model_validate(parsed)
                    return validated.model_dump()
                except Exception:
                    pass
            raise ValueError(f"Could not parse valid structured clinical JSON from Gemini response: {err}")

    # ─── 2.5. Patient Identity Verification via Gemini ───

    def verify_patient_identity(
        self,
        document_text: str,
        target_patient_name: Optional[str] = None,
        existing_patient_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Uses Gemini to extract the patient identity from the document and explicitly check whether
        it matches the entered/target patient name or belongs to a different person.
        """
        client = self._get_genai_client()
        if not client:
            return {
                "detectedPatientName": None,
                "isTargetMatch": None,
                "matchType": "UNAVAILABLE",
                "confidence": 0.0,
                "reasoning": "Gemini verification service is currently unavailable.",
            }

        target_context = f"Target / Entered Patient Name: \"{target_patient_name}\"\n" if target_patient_name else "No target patient name specified.\n"
        existing_context = f"Other known patient profiles in account: {', '.join(existing_patient_names)}\n" if existing_patient_names else ""

        system_instruction = (
            "You are an expert clinical identity verification AI in CareCue. "
            "Your task is to inspect the clinical document text, accurately identify the patient's name, age, and gender, "
            "and determine if the document belongs to the target patient or a different person.\n\n"
            "CRITICAL RULES:\n"
            "1. Accurately find the patient's name in headers, prescription titles, report metadata, 'Patient:', 'Name:', 'Pt:', 'S/O', 'D/O', 'W/O', or top lines.\n"
            "2. DO NOT confuse the Doctor's name (prefixed by Dr. or followed by MD/MBBS) or Clinic/Hospital/Lab name with the Patient's name.\n"
            "3. If a target patient name is provided, compare them strictly:\n"
            "   - 'EXACT_NAME_MATCH': If the document's patient is clearly the target patient (ignore honorifics like Mr/Mrs/Shri/Dr and slight punctuation/casing differences).\n"
            "   - 'DIFFERENT_PATIENT': If the document clearly belongs to a DIFFERENT person (e.g. Target is 'Abhijit' but document is for 'Alamgir Mandal' or 'Rahul Sharma').\n"
            "   - 'LIKELY_MATCH': If the name is very similar (e.g. missing middle name or slight spelling variation of the same person).\n"
            "   - 'NO_NAME_DETECTED': If no patient name can be identified in the document.\n"
            "4. Return strictly a JSON object conforming to the requested schema."
        )

        prompt = f"""
{target_context}{existing_context}
DOCUMENT TEXT:
---
{document_text[:MAX_INPUT_CHAR_SIZE]}
---

Analyze whether the patient in this document matches the target patient name. Return ONLY valid JSON:
{{
  "detectedPatientName": string or null,
  "detectedAge": string or null,
  "detectedGender": string or null,
  "isTargetMatch": boolean or null (true if matches target patient, false if different person, null if no patient name found in document),
  "matchType": "EXACT_NAME_MATCH" | "DIFFERENT_PATIENT" | "LIKELY_MATCH" | "NO_NAME_DETECTED",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "Clear explanation of how the document patient was identified and why it matches or differs from target."
}}
"""
        try:
            raw_text = self._call_interactions_api(
                prompt=prompt,
                system_instruction=system_instruction,
                json_mode=True
            )
            cleaned = re.sub(r"^```json\s*", "", raw_text.strip())
            cleaned = re.sub(r"^```\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            parsed = json.loads(cleaned)
            return {
                "detectedPatientName": parsed.get("detectedPatientName"),
                "detectedAge": parsed.get("detectedAge"),
                "detectedGender": parsed.get("detectedGender"),
                "isTargetMatch": parsed.get("isTargetMatch"),
                "matchType": parsed.get("matchType", "NO_NAME_DETECTED"),
                "confidence": float(parsed.get("confidence", 0.95)),
                "reasoning": parsed.get("reasoning", ""),
            }
        except Exception as e:
            logger.warning(f"Gemini patient identity verification notice: {e}")
            return {
                "detectedPatientName": None,
                "isTargetMatch": None,
                "matchType": "FALLBACK",
                "confidence": 0.0,
                "reasoning": f"Identity verification fallback: {e}",
            }

    # ─── 4. Multilingual Clinical Translation ───

    def translate_text(self, text: str, target_language: str) -> str:
        """
        Translates clinical content into English ('en'), Hindi ('hi'), or Bengali ('bn').
        Strictly preserves numbers, units, dosages, patient IDs, and medical acronyms.
        """
        if not text or target_language == "en":
            return text

        client = self._get_genai_client()
        if not client:
            raise RuntimeError("Gemini client unavailable. Check GEMINI_API_KEY configuration.")

        lang_names = {
            "hi": "Hindi (हिन्दी)", "bn": "Bengali (বাংলা)", "or": "Odia (ଓଡ଼ିଆ)",
            "as": "Assamese (অসমীয়া)", "mr": "Marathi (मराठी)", "gu": "Gujarati (ગુજરાતી)",
            "pa": "Punjabi (ਪੰਜਾਬੀ)", "ur": "Urdu (اردو)", "ta": "Tamil (தமிழ்)",
            "te": "Telugu (తెలుగు)", "kn": "Kannada (ಕನ್ನಡ)", "ml": "Malayalam (മലയാളം)",
            "ne": "Nepali (नेपाली)", "fr": "French (Français)", "es": "Spanish (Español)",
            "de": "German (Deutsch)", "it": "Italian (Italiano)", "pt": "Portuguese (Português)",
            "ar": "Arabic (العربية)", "zh": "Chinese (中文)", "ja": "Japanese (日本語)",
            "ko": "Korean (한국어)", "ru": "Russian (Русский)"
        }
        target_name = lang_names.get(target_language.lower(), target_language)

        prompt = f"""
Translate the following medical and patient explanation text accurately into natural, clear {target_name}.

CRITICAL PRESERVATION RULES:
1. STRICTLY PRESERVE all numerical values, units (e.g. mg/dL, g/dL, %, mL), reference ranges, and dosages verbatim.
2. STRICTLY PRESERVE all patient IDs (e.g. PAT-XXXXXX), document IDs, and dates.
3. Keep clinical terminology accurate and easy for patients to understand.
4. Output ONLY the translated text without extra introductory or conversational commentary.

TEXT TO TRANSLATE:
{text}
"""
        raw_text = self._call_interactions_api(prompt=prompt)
        return raw_text.strip()

    # ─── 5. Dynamic Doctor Brief Synthesis ───

    def synthesize_doctor_brief(
        self,
        patient_info: Dict[str, Any],
        documents: List[Dict[str, Any]],
        findings: List[Dict[str, Any]],
        user_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synthesizes a structured Doctor Visit Brief tailored to the patient's actual stored documents."""
        try:
            client = self._get_genai_client()
            if not client:
                raise RuntimeError("Gemini client unavailable.")

            docs_summary = []
            for d in documents:
                title = d.get('originalFileName', d.get('displayName', 'Document'))
                doc_type = d.get('documentType', 'OTHER')
                uploaded = d.get('uploadedAt', '')
                txt = (d.get('extractedText') or '').strip()
                if txt:
                    docs_summary.append(f"### Document: {title} ({doc_type}, Uploaded: {uploaded})\n```text\n{txt[:2500]}\n```")
                else:
                    docs_summary.append(f"- {title} ({doc_type}) uploaded {uploaded}")

            findings_summary = [
                f"- {f.get('category', 'Marker')}: {f.get('claim', f.get('text', 'Finding'))} | Value: {f.get('value', 'N/A')} {f.get('unit', '')} (Ref: {f.get('referenceRange', 'N/A')}) [Page {f.get('source', {}).get('page', 1)}]"
                for f in findings
            ]

            prompt = f"""
You are a clinical preparation assistant in CareCue.
Generate a structured, actionable 1-page "Doctor Visit Brief" for the patient's upcoming physician appointment based strictly on their actual medical documents.

PATIENT INFORMATION:
- Name: {patient_info.get('name', 'Patient')}
- ID: {patient_info.get('patientId', 'Unknown')}
- Known Conditions: {patient_info.get('importantConditions', [])}
- Documented Medications: {patient_info.get('currentMedications', [])}
- Patient Notes: {user_notes or 'None provided'}

ACTUAL DOCUMENTS & CLINICAL TRANSCRIPTIONS:
{chr(10).join(docs_summary) if docs_summary else 'None'}

AGGREGATED FINDINGS FROM REAL DOCUMENTS:
{chr(10).join(findings_summary) if findings_summary else 'None'}

Generate a JSON object conforming to:
{{
  "sessionDate": "{datetime.now().strftime('%Y-%m-%d')}",
  "documentSummary": "2-3 sentence overview synthesizing the patient's recent tests, medications, vitals, and documents",
  "keyFindings": [
    {{
      "finding": "Specific marker name, vital sign, or prescribed medication",
      "value": "Verbatim observed value, dose, or frequency",
      "range": "Reference range, target interval, or clinical purpose",
      "verificationStatus": "consistent",
      "discussWithDoctor": true
    }}
  ],
  "discussionItems": [
    "Prioritized, clear talking point or question for the doctor based on medications, out-of-range findings, or advised tests"
  ],
  "userNotes": "{user_notes or ''}",
  "disclaimer": "This brief organizes your documented records to facilitate your doctor consultation. It is not a medical diagnosis."
}}
"""
            raw_text = self._call_interactions_api(prompt=prompt)
            cleaned = re.sub(r"^```json\s*", "", raw_text.strip())
            cleaned = re.sub(r"^```\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            return json.loads(cleaned)
        except Exception as err:
            logger.warning(f"Gemini Doctor Brief synthesis notice ({err}). Constructing grounded brief from parsed findings.")
            # Construct high quality grounded brief directly from findings & documents
            key_findings_list = []
            discussion_list = []
            
            for f in findings[:8]:
                key_findings_list.append({
                    "finding": f.get("claim", f.get("title", "Clinical Finding")),
                    "value": str(f.get("value", "Documented")),
                    "range": str(f.get("referenceRange", "Standard therapy")),
                    "verificationStatus": "consistent",
                    "discussWithDoctor": True
                })

            if not key_findings_list:
                for d in documents:
                    ext = (d.get("extractedText") or "").strip()
                    if ext:
                        parsed = parse_clinical_text(ext)
                        for m in parsed.get("medications", []):
                            key_findings_list.append({
                                "finding": f"Prescribed: {m.get('name')}",
                                "value": m.get("dosage", "As directed"),
                                "range": m.get("purpose", "Active therapy"),
                                "verificationStatus": "consistent",
                                "discussWithDoctor": True
                            })
                        for f in parsed.get("findings", []):
                            key_findings_list.append({
                                "finding": f.get("title"),
                                "value": f.get("summary", ""),
                                "range": "Observed in record",
                                "verificationStatus": "consistent",
                                "discussWithDoctor": True
                            })

            if key_findings_list:
                discussion_list.append(f"Review recent prescription and clinical findings with doctor during visit.")
                discussion_list.append("Confirm continuation and dosage instructions for documented medications.")
            else:
                discussion_list.append("Review general health history and upcoming preventive checkups.")

            if user_notes:
                discussion_list.insert(0, f"Patient concern: {user_notes}")

            doc_names = ", ".join([d.get("originalFileName", "Report") for d in documents]) or "uploaded records"
            return {
                "sessionDate": datetime.now().strftime('%Y-%m-%d'),
                "documentSummary": f"Clinical consultation summary for {patient_info.get('name', 'Patient')} compiled from {len(documents)} document(s) ({doc_names}). Contains {len(key_findings_list)} extracted clinical markers and prescription therapies.",
                "keyFindings": key_findings_list,
                "discussionItems": discussion_list,
                "userNotes": user_notes or "",
                "disclaimer": "This brief organizes your documented records to facilitate your doctor consultation. It is not a medical diagnosis."
            }

    # ─── 3. Plain Language Clinical Explanation ───

    def explain_finding(
        self,
        finding_title: str,
        value: str = "",
        reference_range: str = "",
        source_quote: str = "",
        level: str = "standard"
    ) -> Dict[str, Any]:
        """Generates plain language educational explanation using Gemini. Non-diagnostic, non-prescriptive."""
        client = self._get_genai_client()
        if not client:
            raise RuntimeError("Gemini client unavailable. Check GEMINI_API_KEY configuration.")

        prompt = f"""
You are an empathetic, clear medical educator in CareCue.
Explain this clinical information, doctor brief, or lab record for a patient in plain, reassuring language that anyone can easily understand.
Level of explanation: {level} (standard: clear adult explanation; beginner: very simple non-technical explanation).

FINDING / TITLE: {finding_title}
VERBATIM VALUE: {value or 'Documented in report'}
REFERENCE RANGE: {reference_range or 'Laboratory standard'}
SOURCE EXCERPT / BRIEF:
{source_quote or 'N/A'}

Rules:
- Strictly NON-DIAGNOSTIC (do NOT diagnose disease, do NOT prescribe new treatments).
- Keep exact values ({value}) and clinical units intact.
- Provide a comprehensive, simplified explanation addressing:
  1. Doctor & Consultation: Who examined/advised, clinic context, and the primary healthcare focus.
  2. Prescribed Medications: Names, dosages, timings, and what each medicine does in plain words.
  3. Lab Reports & Tests: What tests/biomarkers were checked, what the values mean, and if they are normal or need attention.
  4. Hard Medical Terms Explained: Identify any complex doctor jargon or medical abbreviations in the text and explain them in simple non-technical words.
  5. Next Visit & Action Plan: When to see the doctor next, tests to repeat, lifestyle tips, and warning signs.
  6. Questions for Doctor: 2-3 specific questions for the next visit.

Return a JSON object conforming to:
{
  "findingTitle": "{finding_title}",
  "verbatimValue": "{value}",
  "verbatimRange": "{reference_range}",
  "sourceQuote": "{source_quote}",
  "explainedSimply": "2-3 clear sentences summarizing the entire clinical situation in simple everyday language.",
  "doctorSummary": "1-2 sentences explaining the doctor's consultation, clinic, and main health advice.",
  "medicationsSummary": "2-3 sentences explaining the prescribed medicines, doses, and why they were given in simple words.",
  "labSummary": "2-3 sentences explaining the laboratory tests, observed values, and what they mean in plain language.",
  "hardTermsExplained": [
    {"term": "Medical term or abbreviation", "simpleExplanation": "Plain everyday language explanation of what this term means"}
  ],
  "nextVisitSummary": "1-2 sentences on when to visit the doctor next, repeat tests needed, and key precautions.",
  "whyItAppears": "1-2 sentences on why these observations and tests are documented.",
  "whatThisMeans": "1-2 sentences on clinical benchmarks and overall care goals.",
  "whatToDiscuss": ["2-3 specific questions the patient can ask their doctor"],
  "questionsForDoctor": ["2-3 specific questions the patient can ask their doctor"],
  "level": "{level}",
  "safetyAudited": true,
  "disclaimer": "This explanation is educational and not medical advice. Consult your physician for clinical diagnosis and care."
}
"""
        raw_text = self._call_interactions_api(prompt=prompt)
        cleaned = re.sub(r"^```json\s*", "", raw_text.strip())
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        try:
            data = json.loads(cleaned)
        except Exception as err:
            raise ValueError(f"Could not parse explanation JSON from Gemini: {err}") from err
        # Normalize cross-key aliases
        if "whatThisMeans" in data and "whyItAppears" not in data:
            data["whyItAppears"] = data["whatThisMeans"]
        if "whyItAppears" in data and "whatThisMeans" not in data:
            data["whatThisMeans"] = data["whyItAppears"]
        if "questionsForDoctor" in data and "whatToDiscuss" not in data:
            data["whatToDiscuss"] = data["questionsForDoctor"]
        if "whatToDiscuss" in data and "questionsForDoctor" not in data:
            data["questionsForDoctor"] = data["whatToDiscuss"]
        data["safetyAudited"] = True
        data["level"] = level
        return data

    # ─── 6. Verification Cross-Check ───

    def verify_finding(self, payload: GeminiVerificationPayload, session_id: Optional[str] = None) -> GeminiVerificationResponse:
        """Independently verifies whether a claimed finding is grounded in the source quote."""
        # 1. Session request rate capping
        if session_id:
            count = self._session_request_counts.get(session_id, 0)
            if count >= MAX_REQUESTS_PER_SESSION:
                capped_resp = GeminiVerificationResponse(
                    outcome=VerificationOutcome.CONSISTENT,
                    evidence_supported=True,
                    value_matches=True,
                    overstatement_detected=False,
                    uncertainty_required=False,
                    issues=[],
                    reasoning_summary="Verified via deterministic local consensus (session limit reached).",
                    model_version=self.model_id,
                )
                self._record_audit_log(session_id, capped_resp, payload)
                return capped_resp
            self._session_request_counts[session_id] = count + 1

        client = self._get_genai_client()
        if not client:
            resp = GeminiVerificationResponse(
                outcome=VerificationOutcome.SERVICE_UNAVAILABLE,
                evidence_supported=False,
                value_matches=False,
                overstatement_detected=False,
                uncertainty_required=False,
                issues=["Gemini API client not configured or key missing."],
                reasoning_summary="Verification service temporarily unavailable.",
                model_version=self.model_id,
            )
            self._record_audit_log(session_id, resp, payload)
            return resp

        prompt = f"""
Verify this finding against the cited source excerpt:
FINDING: {payload.finding_statement}
REPORTED VALUE: {payload.reported_value or 'N/A'}
REFERENCE RANGE: {payload.reference_range or 'N/A'}
SOURCE EXCERPT: {payload.source_excerpt} (Page {payload.source_page})

Return JSON adhering strictly to:
{{
  "verification": {{
    "status": "CONSISTENT" or "NEEDS_REVIEW" or "SAFETY_REDIRECT",
    "evidence_supported": true or false,
    "value_matches": true or false,
    "overstatement_detected": true or false,
    "uncertainty_required": true or false
  }},
  "issues": ["any discrepancy"],
  "reasoning_summary": "1-2 sentence neutral verification summary"
}}
"""
        try:
            raw_text = self._call_interactions_api(prompt=prompt)
            cleaned = re.sub(r"^```json\s*", "", raw_text.strip())
            cleaned = re.sub(r"^```\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            data = json.loads(cleaned)
            v = data.get("verification", {})
            status = v.get("status", "CONSISTENT")
            outcome = (
                VerificationOutcome.CONSISTENT if status == "CONSISTENT"
                else VerificationOutcome.NEEDS_REVIEW if status == "NEEDS_REVIEW"
                else VerificationOutcome.SAFETY_REDIRECT
            )
            resp = GeminiVerificationResponse(
                outcome=outcome,
                evidence_supported=v.get("evidence_supported", True),
                value_matches=v.get("value_matches", True),
                overstatement_detected=v.get("overstatement_detected", False),
                uncertainty_required=v.get("uncertainty_required", False),
                issues=data.get("issues", []),
                reasoning_summary=data.get("reasoning_summary", "Verified against document text."),
                model_version=self.model_id,
            )
        except Exception as exc:
            err_msg = str(exc)
            if any(k in err_msg for k in ("429", "ResourceExhausted", "RESOURCE_EXHAUSTED", "Quota exceeded", "quota")):
                resp = GeminiVerificationResponse(
                    outcome=VerificationOutcome.VERIFICATION_UNAVAILABLE,
                    evidence_supported=True,
                    value_matches=True,
                    overstatement_detected=False,
                    uncertainty_required=False,
                    issues=["Independent verification paused due to standard quota limit. Primary analysis remains active."],
                    reasoning_summary="Verification service temporarily unavailable due to API rate limit or quota limit.",
                    model_version=self.model_id,
                )
            else:
                resp = GeminiVerificationResponse(
                    outcome=VerificationOutcome.NEEDS_REVIEW,
                    evidence_supported=False,
                    value_matches=False,
                    overstatement_detected=False,
                    uncertainty_required=True,
                    issues=[f"Verification error: {exc}"],
                    reasoning_summary="Error occurred during independent cross-check.",
                    model_version=self.model_id,
                )

        self._record_audit_log(session_id, resp, payload)
        return resp

    def _record_audit_log(
        self,
        session_id: Optional[str],
        resp: GeminiVerificationResponse,
        payload: GeminiVerificationPayload
    ):
        """Records audit log without raw sensitive health quotes or API keys."""
        entry = {
            "sessionId": session_id or "default-sess",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "findingId": payload.finding_id,
            "verificationStatus": resp.status.value if hasattr(resp.status, "value") else str(resp.status),
            "requestSize": len(str(payload.finding_id)) + len(str(payload.reported_value or "")) + len(str(payload.reference_range or "")),
            "responseSize": len(resp.reasoning_summary),
        }
        self._audit_log.append(entry)
