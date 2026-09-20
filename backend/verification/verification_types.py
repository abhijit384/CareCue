"""
backend/verification/verification_types.py - Data types and enums for Dual-AI Consensus Verification.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

class VerificationOutcome(str, Enum):
    CONSISTENT = "CONSISTENT"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    SAFETY_REDIRECT = "SAFETY_REDIRECT"
    VERIFICATION_UNAVAILABLE = "VERIFICATION_UNAVAILABLE"

@dataclass
class GeminiVerificationPayload:
    """Minimal privacy-minimized payload sent to Google Gemini for cross-checking."""
    finding_id: str
    finding: str
    reported_value: str
    reference_range: str
    source_excerpt: str
    source_page: int

    @property
    def finding_statement(self) -> str:
        return self.finding

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_id": self.finding_id,
            "finding": self.finding,
            "reported_value": self.reported_value,
            "reference_range": self.reference_range,
            "source_excerpt": self.source_excerpt,
            "source_page": self.source_page,
        }

@dataclass
class GeminiVerificationResponse:
    """Structured response parsed from Gemini verification."""
    status: VerificationOutcome = VerificationOutcome.CONSISTENT
    evidence_supported: bool = True
    value_matches: bool = True
    overstatement_detected: bool = False
    uncertainty_required: bool = False
    issues: List[str] = field(default_factory=list)
    reasoning_summary: str = ""
    model_version: str = "gemini-3.5-flash"

    def __init__(
        self,
        status: Optional[VerificationOutcome] = None,
        outcome: Optional[VerificationOutcome] = None,
        evidence_supported: bool = True,
        value_matches: bool = True,
        overstatement_detected: bool = False,
        uncertainty_required: bool = False,
        issues: Optional[List[str]] = None,
        reasoning_summary: str = "",
        model_version: str = "gemini-3.5-flash",
    ):
        self.status = outcome or status or VerificationOutcome.CONSISTENT
        self.evidence_supported = evidence_supported
        self.value_matches = value_matches
        self.overstatement_detected = overstatement_detected
        self.uncertainty_required = uncertainty_required
        self.issues = issues or []
        self.reasoning_summary = reasoning_summary
        self.model_version = model_version

    @property
    def outcome(self) -> VerificationOutcome:
        return self.status

@dataclass
class ConsensusReport:
    """Aggregated consensus outcome between Bedrock, Gemini, and Source Evidence."""
    finding_id: str
    outcome: VerificationOutcome
    bedrock_interpretation: str
    gemini_assessment: str
    reasoning: str
    evidence_verified: bool
    issues: List[str] = field(default_factory=list)
    confidence_tier: str = "Evidence Grounded"  # Qualitative, never numerical percentage

    def to_dict(self) -> Dict[str, Any]:
        return {
            "findingId": self.finding_id,
            "status": self.outcome.value.lower(),
            "bedrockInterpretation": self.bedrock_interpretation,
            "geminiAssessment": self.gemini_assessment,
            "reasoning": self.reasoning,
            "evidenceVerified": self.evidence_verified,
            "issues": self.issues,
            "confidenceTier": self.confidence_tier,
        }
