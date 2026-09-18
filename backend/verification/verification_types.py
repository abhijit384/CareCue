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
    status: VerificationOutcome
    evidence_supported: bool
    value_matches: bool
    overstatement_detected: bool
    uncertainty_required: bool
    issues: List[str]
    reasoning_summary: str

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
