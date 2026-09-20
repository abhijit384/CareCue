"""
backend/services/emergency_service.py - Emergency triage safety guidance and information card generation.
Strictly non-diagnostic: identifies urgent safety flags, stops normal interpretation, and prepares key handover info.
"""

import re
import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Deterministic urgent keywords and phrases
CRITICAL_EMERGENCY_PATTERNS = [
    r"\bchest\s*pain\b",
    r"\bcrushing\s*chest\b",
    r"\bbreathing\s*difficulty\b",
    r"\bdifficulty\s*breathing\b",
    r"\bcan't\s*breathe\b",
    r"\bshortness\s*of\s*breath\b",
    r"\bloss\s*of\s*consciousness\b",
    r"\bpassed\s*out\b",
    r"\bfainted\b",
    r"\bfaint\w*\b",
    r"\bunresponsive\b",
    r"\bheavy\s*bleeding\b",
    r"\bhemorrhage\b",
    r"\bcoughing\s*up\s*blood\b",
    r"\bsudden\s*numbness\b",
    r"\bfacial\s*droop\b",
    r"\bspeech\s*slurred\b",
    r"\bsevere\s*allergic\s*reaction\b",
    r"\banaphylaxis\b",
    r"\bthroat\s*swelling\b",
    r"\bseizure\b",
    r"\bsuicid\w*\b",
    r"\bsevere\s*head\s*injury\b",
]

MILD_SAFETY_PATTERNS = [
    r"\bdizziness\b",
    r"\bmild\s*fatigue\b",
    r"\bheadache\b",
    r"\bnausea\b",
    r"\btired\b",
    r"\bmild\s*rash\b",
]

QUICK_EXAMPLES = [
    {"id": "ex-1", "label": "Severe chest discomfort", "query": "Experiencing sudden pressure and tight chest discomfort radiating to left arm"},
    {"id": "ex-2", "label": "Severe breathing difficulty", "query": "Struggling to catch breath even while resting and feeling dizzy"},
    {"id": "ex-3", "label": "Loss of consciousness", "query": "Briefly passed out after standing up, feeling confused"},
    {"id": "ex-4", "label": "Heavy sudden bleeding", "query": "Uncontrolled bleeding from a deep cut that won't stop with pressure"},
    {"id": "ex-5", "label": "Sudden speech / facial numbness", "query": "Sudden weakness on one side of face and difficulty speaking clearly"},
]

class EmergencyService:
    """Evaluates urgency of user concerns and prepares an emergency handover card."""

    def evaluate_emergency_situation(
        self,
        user_concern: str,
        patient_name: Optional[str] = None,
        recent_findings: Optional[List[Dict[str, Any]]] = None,
        recent_documents: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates urgency state: URGENT_ATTENTION, SAFETY_GUIDANCE, or NOT_ENOUGH_INFORMATION.
        Generates structured emergency response and Emergency Information Card.
        """
        text = (user_concern or "").strip()
        if not text or len(text) < 4:
            return {
                "state": "NOT_ENOUGH_INFORMATION",
                "urgentHelpRecommended": False,
                "guidance": "Please describe what is happening in as much detail as possible so CareCue can guide you to the safest next steps.",
                "action": "DESCRIBE_CONCERN",
                "emergencyCard": None,
                "disclaimer": "Emergency Mode is an informational safety tool, not a diagnostic or emergency dispatch system. For immediate medical emergencies, call your local emergency services (e.g. 911 / 112 / 102).",
            }

        # 1. Layer 1: Check Deterministic Critical Emergency Patterns
        is_urgent = False
        urgent_matches = []
        for pat in CRITICAL_EMERGENCY_PATTERNS:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                is_urgent = True
                urgent_matches.append(match.group(0))

        if is_urgent:
            state = "URGENT_ATTENTION"
            urgent_recommended = True
            guidance = (
                "The symptoms you described may indicate a situation requiring urgent medical evaluation. "
                "Do not wait or rely on informational apps. Please contact emergency medical services or go to the nearest emergency room immediately."
            )
            action = "SEEK_URGENT_PROFESSIONAL_HELP"
        else:
            # Check mild patterns
            has_mild = any(re.search(pat, text, re.IGNORECASE) for pat in MILD_SAFETY_PATTERNS)
            if has_mild or len(text) > 15:
                state = "SAFETY_GUIDANCE"
                urgent_recommended = False
                guidance = (
                    "Your described symptoms should be evaluated by a healthcare professional, especially if they worsen, persist, or cause distress. "
                    "If you develop severe chest pressure, severe breathing difficulty, sudden numbness, or loss of consciousness, seek urgent emergency care immediately."
                )
                action = "CONTACT_HEALTHCARE_PROFESSIONAL"
            else:
                state = "NOT_ENOUGH_INFORMATION"
                urgent_recommended = False
                guidance = (
                    "We could not determine the level of urgency from the brief description. "
                    "If you or someone around you is in pain or distress, seek professional medical guidance promptly."
                )
                action = "SEEK_SAFETY_GUIDANCE"

        # 2. Build Emergency Information Card
        findings_summary = []
        if recent_findings:
            for f in recent_findings[:3]:
                title = f.get("title", "")
                val = f.get("clinicalSignificance", "")
                findings_summary.append(f"{title}: {val}")

        now_str = time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())
        emergency_card = {
            "title": "EMERGENCY INFORMATION SUMMARY",
            "patientName": patient_name or "Unassigned Patient",
            "userConcern": text,
            "detectedSymptoms": urgent_matches if urgent_matches else ["User-reported concern"],
            "urgencyLevel": state,
            "recentDocuments": recent_documents or ["None attached"],
            "recentFindings": findings_summary if findings_summary else ["No active out-of-range findings"],
            "timestamp": now_str,
            "label": "Information supplied by user and extracted from uploaded documents. Not a diagnosis or clinical assessment.",
        }

        return {
            "state": state,
            "urgentHelpRecommended": urgent_recommended,
            "guidance": guidance,
            "action": action,
            "emergencyCard": emergency_card,
            "suggestedExamples": QUICK_EXAMPLES,
            "disclaimer": "Emergency Mode is an informational safety tool, not a diagnostic or emergency dispatch system. For immediate medical emergencies, call your local emergency services (e.g. 911 / 112 / 102).",
        }
