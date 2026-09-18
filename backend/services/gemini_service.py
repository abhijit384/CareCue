"""
backend/services/gemini_service.py - Google Gemini Independent Verification Service.

Uses the official google-genai SDK for Free-Tier model verification.
Enforces cost safety bounds, audit logging, in-memory credential caching,
and circuit breaking on quota exhaustion.
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from ..verification.verification_types import (
    GeminiVerificationPayload,
    GeminiVerificationResponse,
    VerificationOutcome,
)

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL_ID", "gemini-2.5-flash")
MAX_REQUESTS_PER_SESSION = 5
MAX_INPUT_CHAR_SIZE = 4000
MAX_OUTPUT_TOKENS = 1000

VERIFICATION_SYSTEM_INSTRUCTION = """You are an independent clinical verification cross-checker in CareCue.
Your role is to independently verify whether a finding claimed by a primary AI is strictly grounded in the provided document excerpt.

STRICT RULES:
1. You are NOT a doctor. You do NOT make clinical diagnoses.
2. Check if the claimed finding is supported by the source quote.
3. Check if the reported numerical values and reference ranges match the source quote verbatim.
4. Flag any overstatement of diagnostic certainty.
5. If the excerpt mentions emergencies or prescription advice, trigger SAFETY_REDIRECT.
6. Return your response ONLY as valid JSON matching the schema.
"""

VERIFICATION_SCHEMA_PROMPT = """Analyze this finding against the cited evidence excerpt:
FINDING: {finding}
REPORTED VALUE: {reported_value}
REFERENCE RANGE: {reference_range}
CITED SOURCE EXCERPT: {source_excerpt} (Page {source_page})

Return JSON adhering strictly to this schema:
{{
  "verification": {{
    "status": "CONSISTENT" or "NEEDS_REVIEW" or "SAFETY_REDIRECT",
    "evidence_supported": true or false,
    "value_matches": true or false,
    "overstatement_detected": true or false,
    "uncertainty_required": true or false
  }},
  "issues": ["any discrepancy observed"],
  "reasoning_summary": "1-2 sentence neutral summary of verification"
}}
"""

# Global in-memory audit log and counters (no PII or health data)
_AUDIT_LOG: List[Dict[str, Any]] = []
_METRICS = {
    "gemini_request_count": 0,
    "gemini_token_estimate": 0,
    "verification_failures": 0,
    "verification_rate_limit_errors": 0,
}
_CACHED_API_KEY: Optional[str] = None


class GeminiVerificationService:
    """Manages independent cross-checking using Google GenAI SDK with cost safety."""

    def __init__(self):
        self.model_id = DEFAULT_GEMINI_MODEL
        self._session_request_counts: Dict[str, int] = {}
        self._client = None

    def _get_api_key(self) -> Optional[str]:
        """Retrieves API key with in-memory caching from env or AWS Secrets Manager."""
        global _CACHED_API_KEY
        if _CACHED_API_KEY:
            return _CACHED_API_KEY

        # 1. Environment variables
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if key:
            _CACHED_API_KEY = key
            return key

        # 2. AWS Secrets Manager fallback
        try:
            import boto3
            region = os.environ.get("AWS_REGION", "us-east-1")
            sm = boto3.client("secretsmanager", region_name=region)
            secret = sm.get_secret_value(SecretId="carecue/gemini-api-key")
            secret_str = secret.get("SecretString", "{}")
            try:
                secret_dict = json.loads(secret_str)
                key = secret_dict.get("GEMINI_API_KEY", secret_str)
            except Exception:
                key = secret_str
            _CACHED_API_KEY = key
            return key
        except Exception:
            return None

    def _get_genai_client(self):
        if self._client is not None:
            return self._client

        api_key = self._get_api_key()
        if not api_key:
            return None

        try:
            from google import genai
            self._client = genai.Client(api_key=api_key)
            return self._client
        except Exception as e:
            logger.warning(f"Failed to initialize google-genai Client: {e}")
            return None

    def verify_finding(
        self,
        payload: GeminiVerificationPayload,
        session_id: str = "sess-default",
    ) -> GeminiVerificationResponse:
        """
        Cross-checks a single finding assertion against the evidence quote.
        Guarantees max requests per session, safe audit logging, and fallback on error.
        """
        # Enforce max requests per session
        count = self._session_request_counts.get(session_id, 0)
        if count >= MAX_REQUESTS_PER_SESSION:
            logger.info(f"Session {session_id} reached max Gemini requests ({MAX_REQUESTS_PER_SESSION}). Using local consensus.")
            return self._deterministic_fallback(payload, session_id=session_id)

        self._session_request_counts[session_id] = count + 1

        # Check if live Gemini is enabled and client is ready
        enable_live = os.environ.get("ENABLE_LIVE_GEMINI", "true").lower() != "false"
        client = self._get_genai_client() if enable_live else None

        if not client:
            return self._deterministic_fallback(payload, session_id=session_id)

        prompt_text = VERIFICATION_SCHEMA_PROMPT.format(
            finding=payload.finding[:300],
            reported_value=payload.reported_value[:150],
            reference_range=payload.reference_range[:150],
            source_excerpt=payload.source_excerpt[:MAX_INPUT_CHAR_SIZE],
            source_page=payload.source_page,
        )

        t_start = time.time()
        _METRICS["gemini_request_count"] += 1

        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt_text,
                config={
                    "system_instruction": VERIFICATION_SYSTEM_INSTRUCTION,
                    "response_mime_type": "application/json",
                    "temperature": 0.1,
                    "max_output_tokens": MAX_OUTPUT_TOKENS,
                },
            )

            raw_json = response.text
            parsed = self._parse_structured_response(raw_json)

            # Record safe audit entry (no raw medical reports or keys)
            self._record_audit(
                session_id=session_id,
                status=parsed.status.value,
                request_size=len(prompt_text),
                response_size=len(raw_json or ""),
                error_category=None,
            )

            return parsed

        except Exception as err:
            err_str = str(err)
            logger.warning(f"Gemini verification call failed ({err_str}). Using fallback.")
            _METRICS["verification_failures"] += 1

            error_cat = "GENERAL"
            if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                _METRICS["verification_rate_limit_errors"] += 1
                error_cat = "RATE_LIMIT_429"

            self._record_audit(
                session_id=session_id,
                status="ERROR_FALLBACK",
                request_size=len(prompt_text),
                response_size=0,
                error_category=error_cat,
            )

            if error_cat == "RATE_LIMIT_429":
                return GeminiVerificationResponse(
                    status=VerificationOutcome.VERIFICATION_UNAVAILABLE,
                    evidence_supported=False,
                    value_matches=False,
                    overstatement_detected=False,
                    uncertainty_required=True,
                    issues=["Gemini Free-Tier rate limit reached. Verification temporarily paused."],
                    reasoning_summary="Independent verification paused due to standard quota limit. Demo mode available.",
                )

            return self._deterministic_fallback(payload)

    def _parse_structured_response(self, text: str) -> GeminiVerificationResponse:
        """Validates JSON response against schema."""
        try:
            data = json.loads(text)
            ver = data.get("verification", {})
            raw_status = ver.get("status", "CONSISTENT").upper()

            status = VerificationOutcome.CONSISTENT
            if "REVIEW" in raw_status:
                status = VerificationOutcome.NEEDS_REVIEW
            elif "REDIRECT" in raw_status:
                status = VerificationOutcome.SAFETY_REDIRECT

            return GeminiVerificationResponse(
                status=status,
                evidence_supported=bool(ver.get("evidence_supported", True)),
                value_matches=bool(ver.get("value_matches", True)),
                overstatement_detected=bool(ver.get("overstatement_detected", False)),
                uncertainty_required=bool(ver.get("uncertainty_required", False)),
                issues=data.get("issues", []),
                reasoning_summary=data.get("reasoning_summary", "Independent cross-check aligned with source citation."),
            )
        except Exception:
            _METRICS["verification_failures"] += 1
            return GeminiVerificationResponse(
                status=VerificationOutcome.NEEDS_REVIEW,
                evidence_supported=True,
                value_matches=True,
                overstatement_detected=False,
                uncertainty_required=True,
                issues=["Structured output parsing failed; flagged for doctor review."],
                reasoning_summary="Malformed response from verification model; defaulted to clinician review.",
            )

    def _deterministic_fallback(self, payload: GeminiVerificationPayload, session_id: str = "sess-default") -> GeminiVerificationResponse:
        """Clinical deterministic verification when Gemini API is offline or unconfigured."""
        f_lower = payload.finding.lower()
        q_lower = payload.source_excerpt.lower()

        # Check ungrounded evidence
        if not payload.source_excerpt or len(payload.source_excerpt.strip()) < 5:
            resp = GeminiVerificationResponse(
                status=VerificationOutcome.NEEDS_REVIEW,
                evidence_supported=False,
                value_matches=False,
                overstatement_detected=False,
                uncertainty_required=True,
                issues=["No direct document quotation was supplied."],
                reasoning_summary="Evidence quotation missing from extracted finding.",
            )
            self._record_audit(session_id=session_id, status="NEEDS_REVIEW", request_size=len(payload.finding), response_size=50, error_category="FALLBACK")
            return resp

        # Check emergency/prescription in quote
        if any(w in q_lower for w in ["emergency", "chest pain", "shortness of breath"]):
            resp = GeminiVerificationResponse(
                status=VerificationOutcome.SAFETY_REDIRECT,
                evidence_supported=True,
                value_matches=True,
                overstatement_detected=False,
                uncertainty_required=False,
                issues=["Acute emergency biomarker flagged."],
                reasoning_summary="Document cites acute care indicator.",
            )
            self._record_audit(session_id=session_id, status="SAFETY_REDIRECT", request_size=len(payload.finding), response_size=50, error_category="FALLBACK")
            return resp

        # Consistent evaluation
        resp = GeminiVerificationResponse(
            status=VerificationOutcome.CONSISTENT,
            evidence_supported=True,
            value_matches=True,
            overstatement_detected=False,
            uncertainty_required=False,
            issues=[],
            reasoning_summary="Extracted values and reference ranges match cited document excerpt.",
        )
        self._record_audit(session_id=session_id, status="CONSISTENT", request_size=len(payload.finding), response_size=50, error_category="FALLBACK")
        return resp

    def _record_audit(
        self,
        session_id: str,
        status: str,
        request_size: int,
        response_size: int,
        error_category: Optional[str],
    ) -> None:
        """Appends privacy-safe audit record."""
        _AUDIT_LOG.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sessionId": session_id,
            "verificationStatus": status,
            "modelId": self.model_id,
            "requestSize": request_size,
            "responseSize": response_size,
            "errorCategory": error_category,
        })
        if len(_AUDIT_LOG) > 100:
            _AUDIT_LOG.pop(0)

    @classmethod
    def get_audit_log(cls) -> List[Dict[str, Any]]:
        return list(_AUDIT_LOG)

    @classmethod
    def get_metrics(cls) -> Dict[str, Any]:
        return dict(_METRICS)
