"""
backend/verification/verification_rules.py - Comparison rules for dual-model consensus.
"""

from typing import Dict, Any, List, Tuple
from .verification_types import VerificationOutcome, GeminiVerificationResponse, ConsensusReport

def evaluate_consensus(
    finding: Dict[str, Any],
    gemini_resp: GeminiVerificationResponse,
    evidence_grounded: bool,
) -> ConsensusReport:
    """
    Evaluates Bedrock finding against Gemini verification and source evidence grounding.
    Enforces non-dogmatic language: "Consistent with supplied evidence" vs "Needs review".
    """
    issues: List[str] = list(gemini_resp.issues)

    # 1. Check Verification Unavailable (rate limit, quota exceeded, or service paused)
    if gemini_resp.status == VerificationOutcome.VERIFICATION_UNAVAILABLE:
        return ConsensusReport(
            finding_id=finding.get("id", ""),
            outcome=VerificationOutcome.VERIFICATION_UNAVAILABLE,
            bedrock_interpretation=finding.get("plainLanguageSummary", ""),
            gemini_assessment=gemini_resp.reasoning_summary or "Verification service temporarily unavailable.",
            reasoning="Independent verification paused due to standard quota limit. Primary analysis remains active.",
            evidence_verified=evidence_grounded,
            issues=issues,
            confidence_tier="Verification Unavailable",
        )

    # 2. Check Safety Redirect
    if gemini_resp.status == VerificationOutcome.SAFETY_REDIRECT:
        return ConsensusReport(
            finding_id=finding.get("id", ""),
            outcome=VerificationOutcome.SAFETY_REDIRECT,
            bedrock_interpretation=finding.get("plainLanguageSummary", ""),
            gemini_assessment=gemini_resp.reasoning_summary,
            reasoning="Care boundary active: topic touches emergency or medical prescription.",
            evidence_verified=evidence_grounded,
            issues=issues,
            confidence_tier="Safety Boundary",
        )

    # 2. Check Evidence Grounding
    if not evidence_grounded:
        issues.append("Source evidence excerpt was not directly confirmed in original document.")
        return ConsensusReport(
            finding_id=finding.get("id", ""),
            outcome=VerificationOutcome.NEEDS_REVIEW,
            bedrock_interpretation=finding.get("plainLanguageSummary", ""),
            gemini_assessment="Unverified evidence quote.",
            reasoning="Source excerpt could not be directly matched against document text.",
            evidence_verified=False,
            issues=issues,
            confidence_tier="Needs Review",
        )

    # 3. Check Gemini Discrepancies
    if not gemini_resp.evidence_supported or not gemini_resp.value_matches:
        if not gemini_resp.value_matches:
            issues.append("Reported numerical value or units did not match source citation.")
        if not gemini_resp.evidence_supported:
            issues.append("Claim wording extends beyond what source data supports.")

        return ConsensusReport(
            finding_id=finding.get("id", ""),
            outcome=VerificationOutcome.NEEDS_REVIEW,
            bedrock_interpretation=finding.get("plainLanguageSummary", ""),
            gemini_assessment=gemini_resp.reasoning_summary,
            reasoning="Discrepancy detected between extracted claim and cited evidence.",
            evidence_verified=evidence_grounded,
            issues=issues,
            confidence_tier="Needs Review",
        )

    if gemini_resp.overstatement_detected:
        issues.append("Clinical finding wording overstates diagnostic certainty.")
        return ConsensusReport(
            finding_id=finding.get("id", ""),
            outcome=VerificationOutcome.NEEDS_REVIEW,
            bedrock_interpretation=finding.get("plainLanguageSummary", ""),
            gemini_assessment=gemini_resp.reasoning_summary,
            reasoning="Independent check noted overstatement of certainty — prioritize with doctor.",
            evidence_verified=evidence_grounded,
            issues=issues,
            confidence_tier="Needs Review",
        )

    # 4. Consensus Reached
    return ConsensusReport(
        finding_id=finding.get("id", ""),
        outcome=VerificationOutcome.CONSISTENT,
        bedrock_interpretation=finding.get("plainLanguageSummary", ""),
        gemini_assessment=gemini_resp.reasoning_summary or "Confirmed alignment with reference boundaries.",
        reasoning="Consistent with the supplied evidence across primary analysis and independent cross-check.",
        evidence_verified=True,
        issues=[],
        confidence_tier="Evidence Grounded",
    )
