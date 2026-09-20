"""
backend/services/translation_service.py - Searchable Multilingual Clinical Translation Service.

Provides a comprehensive, configurable registry of Indian regional and international languages.
Uses Google Gemini 3.6 Flash for dynamic, grounded clinical translations while strictly preserving
numerical values, units, reference intervals, dosages, and patient IDs verbatim.
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Searchable language registry: Indian regional + International languages
SUPPORTED_LANGUAGES: Dict[str, Dict[str, str]] = {
    # Indian Regional Languages
    "en": {"code": "en", "name": "English", "native": "English", "region": "Global / India"},
    "hi": {"code": "hi", "name": "Hindi", "native": "हिन्दी", "region": "India"},
    "bn": {"code": "bn", "name": "Bengali", "native": "বাংলা", "region": "India / Bengal"},
    "or": {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ", "region": "India / Odisha"},
    "as": {"code": "as", "name": "Assamese", "native": "অসমীয়া", "region": "India / Assam"},
    "mr": {"code": "mr", "name": "Marathi", "native": "मराठी", "region": "India / Maharashtra"},
    "gu": {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી", "region": "India / Gujarat"},
    "pa": {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "region": "India / Punjab"},
    "ur": {"code": "ur", "name": "Urdu", "native": "اردو", "region": "India / Pakistan"},
    "ta": {"code": "ta", "name": "Tamil", "native": "தமிழ்", "region": "India / Tamil Nadu"},
    "te": {"code": "te", "name": "Telugu", "native": "తెలుగు", "region": "India / Andhra / Telangana"},
    "kn": {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ", "region": "India / Karnataka"},
    "ml": {"code": "ml", "name": "Malayalam", "native": "മലയാളം", "region": "India / Kerala"},
    "ne": {"code": "ne", "name": "Nepali", "native": "नेपाली", "region": "India / Nepal"},

    # International Languages
    "fr": {"code": "fr", "name": "French", "native": "Français", "region": "International"},
    "es": {"code": "es", "name": "Spanish", "native": "Español", "region": "International"},
    "de": {"code": "de", "name": "German", "native": "Deutsch", "region": "International"},
    "it": {"code": "it", "name": "Italian", "native": "Italiano", "region": "International"},
    "pt": {"code": "pt", "name": "Portuguese", "native": "Português", "region": "International"},
    "ar": {"code": "ar", "name": "Arabic", "native": "العربية", "region": "International"},
    "zh": {"code": "zh", "name": "Chinese", "native": "中文", "region": "International"},
    "ja": {"code": "ja", "name": "Japanese", "native": "日本語", "region": "International"},
    "ko": {"code": "ko", "name": "Korean", "native": "한국어", "region": "International"},
    "ru": {"code": "ru", "name": "Russian", "native": "Русский", "region": "International"},
}

class TranslationService:
    """Manages multilingual clinical translation with strict token protection and Gemini AI."""
    _cache: Dict[str, Dict[str, Any]] = {}

    def __init__(self):
        self._memory_cache = TranslationService._cache
        self._gemini_service = None

    @property
    def gemini_service(self):
        if self._gemini_service is None:
            from .gemini_service import GeminiVerificationService
            self._gemini_service = GeminiVerificationService()
        return self._gemini_service

    def get_supported_languages(self, search: Optional[str] = None) -> List[Dict[str, str]]:
        """Returns list of all supported languages, optionally filtered by name/code/native."""
        langs = list(SUPPORTED_LANGUAGES.values())
        if not search:
            return langs
        q = search.lower().strip()
        return [
            l for l in langs
            if q in l["code"].lower() or q in l["name"].lower() or q in l["native"].lower() or q in l["region"].lower()
        ]

    def extract_protected_tokens(self, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Replaces numerical values, units, patient IDs, and reference ranges with placeholder tokens
        so translation models never alter objective medical numbers or references.
        """
        tokens: Dict[str, str] = {}
        token_counter = 0

        unit_pattern = r'(\b\d+(?:\.\d+)?\s*(?:g/dL|mg/dL|%|K/uL|ng/mL|mEq/L|mL/min(?:/1\.73m2)?|mmol/L|U/L|mg|mcg|mL)\b)'
        def unit_repl(match):
            nonlocal token_counter
            tag = f"__TOKEN_NUM_{token_counter}__"
            tokens[tag] = match.group(1)
            token_counter += 1
            return tag

        masked = re.sub(unit_pattern, unit_repl, text, flags=re.IGNORECASE)

        range_pattern = r'(\b(?:<|>|<=|>=)?\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\b)'
        def range_repl(match):
            nonlocal token_counter
            tag = f"__TOKEN_RNG_{token_counter}__"
            tokens[tag] = match.group(1)
            token_counter += 1
            return tag

        masked = re.sub(range_pattern, range_repl, masked)

        id_pattern = r'(\b(?:PAT|DOC|USR)-\w+\b)'
        def id_repl(match):
            nonlocal token_counter
            tag = f"__TOKEN_ID_{token_counter}__"
            tokens[tag] = match.group(1)
            token_counter += 1
            return tag

        masked = re.sub(id_pattern, id_repl, masked)
        return masked, tokens

    def restore_tokens(self, masked_text: str, tokens: Dict[str, str]) -> str:
        """Restores protected clinical tokens verbatim into the translated text."""
        result = masked_text
        for tag, val in tokens.items():
            result = result.replace(tag, val)
        return result

    restore_protected_tokens = restore_tokens

    def translate_finding(self, finding: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translates dynamic text fields of a finding while preserving keys and tokens."""
        if target_lang == "en":
            return finding
        res = dict(finding)
        for field in ["title", "plainLanguageSummary", "clinicalSignificance", "explanation", "claim"]:
            if field in res and isinstance(res[field], str):
                res[field] = self.translate_text(res[field], target_lang)
        if "suggestedQuestionsForDoctor" in res and isinstance(res["suggestedQuestionsForDoctor"], list):
            res["suggestedQuestionsForDoctor"] = [
                self.translate_text(q, target_lang) if isinstance(q, str) else q
                for q in res["suggestedQuestionsForDoctor"]
            ]
        res["currentLanguage"] = target_lang
        return res

    def translate_text(self, text: str, target_lang: str) -> str:
        """Translates a text block to target_lang, preserving clinical values and units."""
        if not text or target_lang == "en":
            return text

        cache_key = f"{target_lang}:{hash(text)}"
        cached = self._memory_cache.get(cache_key)
        if isinstance(cached, dict) and cached.get("text"):
            return cached["text"]
        if isinstance(cached, str):
            return cached

        masked_text, tokens = self.extract_protected_tokens(text)

        lang_entry = SUPPORTED_LANGUAGES.get(target_lang)
        target_name = f"{lang_entry['name']} ({lang_entry['native']})" if lang_entry else target_lang

        if not self.gemini_service.is_available():
            return text

        try:
            translated_raw = self.gemini_service.translate_text(masked_text, target_name)
            if translated_raw and translated_raw.strip():
                final_translated = self.restore_tokens(translated_raw, tokens)
                self._memory_cache[cache_key] = {"text": final_translated, "model": self.gemini_service.model_id}
                return final_translated
            return text
        except Exception as err:
            logger.warning(f"Translation failed for '{text[:40]}...': {err}; returning original text.")
            return text


    def translate_batch(self, items: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translates multiple fields or strings in a single unified Gemini call."""
        if not items or target_lang == "en":
            return items

        lang_entry = SUPPORTED_LANGUAGES.get(target_lang)
        target_name = f"{lang_entry['name']} ({lang_entry['native']})" if lang_entry else target_lang

        if not self.gemini_service.is_available():
            return items

        prompt = f"""
Translate the string values in the following JSON object into accurate, natural {target_name}.
CRITICAL PRESERVATION RULES:
1. STRICTLY PRESERVE all numbers, units (mg, mL, %, mg/dL, etc.), reference ranges, and patient/document IDs verbatim.
2. Keep the exact same JSON keys and structure.
3. Return ONLY valid JSON with no conversational commentary.

JSON TO TRANSLATE:
{json.dumps(items, ensure_ascii=False)}
"""
        try:
            raw = self.gemini_service._call_interactions_api(prompt=prompt)
            cleaned = re.sub(r"^```json\s*", "", raw.strip())
            cleaned = re.sub(r"^```\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            parsed = json.loads(cleaned)
            return parsed
        except Exception as e:
            logger.warning(f"Batch translation failed ({e}), falling back to individual field translation.")
            res = {}
            for k, v in items.items():
                if isinstance(v, str):
                    res[k] = self.translate_text(v, target_lang)
                elif isinstance(v, list):
                    res[k] = [self.translate_text(x, target_lang) if isinstance(x, str) else x for x in v]
                else:
                    res[k] = v
            return res

    def translate_doctor_brief(self, brief: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translates Doctor Visit Brief (documentSummary and discussionItems) in a single fast call."""
        if not brief or target_lang == "en":
            return brief

        res = dict(brief)
        payload = {
            "documentSummary": brief.get("documentSummary", ""),
            "discussionItems": brief.get("discussionItems", []),
        }
        translated = self.translate_batch(payload, target_lang)
        res["documentSummary"] = translated.get("documentSummary", brief.get("documentSummary", ""))
        res["discussionItems"] = translated.get("discussionItems", brief.get("discussionItems", []))
        res["currentLanguage"] = target_lang
        return res
