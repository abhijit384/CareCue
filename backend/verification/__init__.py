"""
backend/verification package - Dual-AI consensus verification engine.
"""

from .verification_types import (
    VerificationOutcome,
    GeminiVerificationPayload,
    GeminiVerificationResponse,
    ConsensusReport,
)
from .verification_rules import evaluate_consensus
from .comparison_service import DualAIVerificationEngine

__all__ = [
    "VerificationOutcome",
    "GeminiVerificationPayload",
    "GeminiVerificationResponse",
    "ConsensusReport",
    "evaluate_consensus",
    "DualAIVerificationEngine",
]
