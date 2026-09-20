from dataclasses import dataclass
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
try:
    from security.output_safety_filter import OutputSafetyFilter
except ImportError:
    try:
        from backend.security.output_safety_filter import OutputSafetyFilter
    except ImportError:
        from ..security.output_safety_filter import OutputSafetyFilter

class SafetyCategory(str, Enum):
    EMERGENCY = "EMERGENCY"
    PRESCRIPTION_REQUEST = "PRESCRIPTION_REQUEST"
    DIAGNOSIS_REQUEST = "DIAGNOSIS_REQUEST"
    HIGH_RISK_SYMPTOM = "HIGH_RISK_SYMPTOM"
    RULE_OVERRIDE_ATTEMPT = "RULE_OVERRIDE_ATTEMPT"
    BENIGN_HEALTH_LITERACY = "BENIGN_HEALTH_LITERACY"

UNSAFE_PRESCRIPTION_KEYWORDS = [
    "prescribe", "prescription", "medication", "dosage", "dose",
    "should i take", "what medicine", "what drug", "antibiotic", "painkiller"
]

UNSAFE_DIAGNOSIS_KEYWORDS = [
    "do i have", "diagnose me", "diagnose my", "is it cancer", "am i dying",
    "what disease", "cure my", "treatment plan for", "do i have type"
]

EMERGENCY_KEYWORDS = [
    "chest pain", "shortness of breath", "trouble breathing", "severe bleeding",
    "coughing up", "numbness on the left", "stroke symptoms",
    "unconscious", "emergency", "suicide", "overdose"
]

RULE_OVERRIDE_KEYWORDS = [
    "ignore previous instructions", "reveal system prompt", "bypass safety",
    "disregard safety rules", "act as administrator", "override guidelines"
]

@dataclass
class SafetyEvaluation:
    status: str  # 'NORMAL' | 'NEEDS_REVIEW' | 'SAFETY_REDIRECT'
    is_safe: bool
    category: SafetyCategory
    requires_interception: bool
    disclaimer: str
    redirect_message: Optional[str] = None
    suggested_action: Optional[str] = None

class SafetyEngine:
    """Multi-Layered Safety System (Application Guardrails & Output Enforcement)."""

    def __init__(self):
        self.output_filter = OutputSafetyFilter()

    def evaluate_query(self, query: str) -> SafetyEvaluation:
        query_lower = query.lower()

        # 0. Rule Override / Jailbreak detection
        for kw in RULE_OVERRIDE_KEYWORDS:
            if kw in query_lower:
                msg = (
                    "Security Notice: System rules and safety guardrails are immutable. "
                    "CareCue will continue adhering to safe, evidence-grounded health literacy operations."
                )
                return SafetyEvaluation(
                    status="SAFETY_REDIRECT",
                    is_safe=False,
                    category=SafetyCategory.RULE_OVERRIDE_ATTEMPT,
                    requires_interception=True,
                    disclaimer=msg,
                    redirect_message=msg,
                    suggested_action="Inquire about clinical terminology or laboratory reference ranges."
                )

        # 1. Emergency detection
        for kw in EMERGENCY_KEYWORDS:
            if kw in query_lower:
                msg = (
                    "If you or someone you are caring for is experiencing an acute emergency "
                    "(such as severe chest pain, shortness of breath, or bleeding), please call "
                    "911 or local emergency services immediately."
                )
                return SafetyEvaluation(
                    status="SAFETY_REDIRECT",
                    is_safe=False,
                    category=SafetyCategory.EMERGENCY,
                    requires_interception=True,
                    disclaimer=msg,
                    redirect_message=msg,
                    suggested_action="Contact emergency medical services or visit the nearest emergency department."
                )

        # 2. Prescription or medication requests
        for kw in UNSAFE_PRESCRIPTION_KEYWORDS:
            if kw in query_lower:
                msg = (
                    "CareCue cannot prescribe medication, adjust dosages, or recommend specific pharmaceutical treatments. "
                    "It can help organize information and prepare questions for a healthcare professional."
                )
                return SafetyEvaluation(
                    status="SAFETY_REDIRECT",
                    is_safe=False,
                    category=SafetyCategory.PRESCRIPTION_REQUEST,
                    requires_interception=True,
                    disclaimer=msg,
                    redirect_message=msg,
                    suggested_action="Prepare a Doctor Visit Brief to discuss treatment options with your physician."
                )

        # 3. Definitive diagnostic requests
        for kw in UNSAFE_DIAGNOSIS_KEYWORDS:
            if kw in query_lower:
                msg = (
                    "CareCue cannot provide clinical diagnoses or confirm diseases. "
                    "We can help you understand what your lab ranges indicate so you can have an informed conversation with your doctor."
                )
                return SafetyEvaluation(
                    status="SAFETY_REDIRECT",
                    is_safe=False,
                    category=SafetyCategory.DIAGNOSIS_REQUEST,
                    requires_interception=True,
                    disclaimer=msg,
                    redirect_message=msg,
                    suggested_action="Review this document with your doctor for clinical interpretation."
                )

        # 4. Normal health literacy inquiry
        disclaimer = "CareCue is an educational health literacy tool, not a diagnostic or prescription platform."
        return SafetyEvaluation(
            status="NORMAL",
            is_safe=True,
            category=SafetyCategory.BENIGN_HEALTH_LITERACY,
            requires_interception=False,
            disclaimer=disclaimer,
        )

    def filter_outgoing_findings(self, findings: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Applies Layer 4 output safety filter to verified findings."""
        return self.output_filter.filter_findings_batch(findings)

def evaluate_safety_intent(user_text: str) -> SafetyEvaluation:
    """Convenience helper for safety evaluation."""
    engine = SafetyEngine()
    return engine.evaluate_query(user_text)
