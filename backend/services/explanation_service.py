"""
backend/services/explanation_service.py - Plain language and beginner healthcare term explainer.
Uses Gemini for dynamic, document-grounded explanations with curated glossary fallback.
Strictly non-diagnostic, non-prescriptive, and preserves verbatim values.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ExplanationService:
    """Generates non-diagnostic, structured simplified explanations for clinical findings."""
    _cache: Dict[str, Dict[str, Any]] = {}

    def __init__(self):
        self._gemini_service = None
        self._memory_cache = ExplanationService._cache

    @property
    def gemini_service(self):
        if self._gemini_service is None:
            from .gemini_service import GeminiVerificationService
            self._gemini_service = GeminiVerificationService()
        return self._gemini_service

    def _fallback_explanation(
        self,
        finding_title: str,
        value: str = "",
        reference_range: str = "",
        source_quote: str = "",
        level: str = "standard",
    ) -> Dict[str, Any]:
        """Safe clinical educational fallback when remote AI calls are rate-limited or unavailable."""
        val_str = f" of {value}" if value else ""
        ref_str = f" (standard reference interval: {reference_range})" if reference_range else ""
        quote_str = source_quote.strip() if source_quote else finding_title

        return {
            "findingTitle": finding_title,
            "verbatimValue": value or "Documented in report",
            "verbatimRange": reference_range or "Standard clinical reference",
            "sourceQuote": quote_str,
            "explainedSimply": f"This section of your record documents {finding_title}{val_str}{ref_str}. It represents a clinical observation or management step reviewed by your healthcare provider.",
            "doctorSummary": f"Consultation and evaluation recorded for {finding_title}. Please discuss your overall symptoms and care plan with your physician.",
            "medicationsSummary": "Take all documented medications strictly according to the dosages, timings, and instructions specified in your prescription.",
            "labSummary": f"Laboratory observation: {finding_title}{val_str}{ref_str}. Target intervals provide benchmarks for routine clinical monitoring.",
            "nextVisitSummary": "Schedule your next follow-up appointment as advised by your physician, and bring recent lab reports to the visit.",
            "whyItAppears": f"Clinicians document {finding_title} as part of systematic health evaluation to guide follow-up care and align on therapeutic goals.",
            "whatThisMeans": "Clinical reference intervals serve as target benchmarks. Your doctor evaluates this observation alongside your overall health history.",
            "whatToDiscuss": [
                f"What does this finding for {finding_title} indicate for my upcoming care plan?",
                "Are there any specific lifestyle steps or follow-up evaluations recommended?"
            ],
            "questionsForDoctor": [
                f"What does this finding for {finding_title} indicate for my upcoming care plan?",
                "Are there any specific lifestyle steps or follow-up evaluations recommended?"
            ],
            "level": level,
            "safetyAudited": True,
            "disclaimer": "This explanation is educational and not medical advice. Consult your physician for clinical diagnosis and care."
        }

    def explain_finding(
        self,
        finding_title: str,
        value: str = "",
        reference_range: str = "",
        source_quote: str = "",
        level: str = "standard",
    ) -> Dict[str, Any]:
        """
        Calls Gemini to explain the specific finding in plain language.
        Strictly avoids medical diagnosis or medication prescription.
        Falls back safely on quota exhaustion or connectivity issues.
        """
        cache_key = f"{level}:{finding_title}:{value}:{reference_range}:{source_quote[:100]}"
        if cache_key in self._memory_cache:
            return self._memory_cache[cache_key]

        try:
            if self.gemini_service.is_available():
                result = self.gemini_service.explain_finding(
                    finding_title=finding_title,
                    value=value,
                    reference_range=reference_range,
                    source_quote=source_quote,
                    level=level,
                )
                self._memory_cache[cache_key] = result
                return result
        except Exception as e:
            logger.warning(f"Gemini explanation failed ({e}); serving structured clinical fallback.")

        # Deterministic clinical fallback if AI is rate limited or unavailable
        fallback = self._fallback_explanation(
            finding_title=finding_title,
            value=value,
            reference_range=reference_range,
            source_quote=source_quote,
            level=level,
        )
        self._memory_cache[cache_key] = fallback
        return fallback

