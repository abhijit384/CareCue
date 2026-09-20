"""
backend/verification/comparison_service.py - Orchestrates dual-AI comparison and consensus calculation.
"""

from typing import Dict, Any, List, Tuple
from .verification_types import VerificationOutcome, GeminiVerificationPayload, ConsensusReport
from .verification_rules import evaluate_consensus
try:
    from services.evidence_validator import validate_finding_grounding, GroundingStatus
except ImportError:
    try:
        from backend.services.evidence_validator import validate_finding_grounding, GroundingStatus
    except ImportError:
        from ..services.evidence_validator import validate_finding_grounding, GroundingStatus

class DualAIVerificationEngine:
    """Coordinates Bedrock findings, Gemini cross-checking, and evidence validation."""

    def __init__(self, gemini_service=None):
        if gemini_service is None:
            try:
                from services.gemini_service import GeminiVerificationService
            except ImportError:
                try:
                    from backend.services.gemini_service import GeminiVerificationService
                except ImportError:
                    from ..services.gemini_service import GeminiVerificationService
            self.gemini_service = GeminiVerificationService()
        else:
            self.gemini_service = gemini_service

    def verify_findings(
        self,
        findings: List[Dict[str, Any]],
        source_text: str,
        session_id: str = "sess-default",
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Takes findings extracted by Bedrock and validates each one against:
        1. Grounding in source text.
        2. Gemini independent cross-check.
        3. Consensus rules.
        """
        updated_findings = []
        consistent_count = 0
        review_count = 0
        redirect_count = 0
        unavailable_count = 0

        for finding in findings:
            # 1. Grounding check
            grounding_rep = validate_finding_grounding(finding, source_text)
            is_grounded = grounding_rep.status in (GroundingStatus.VERIFIED, GroundingStatus.HIGH_CONFIDENCE)

            # 2. Prepare minimal privacy-minimized payload for Gemini
            payload = GeminiVerificationPayload(
                finding_id=finding.get("id", ""),
                finding=finding.get("title", ""),
                reported_value=finding.get("clinicalSignificance", ""),
                reference_range=finding.get("clinicalSignificance", ""),
                source_excerpt=finding.get("sourceQuote", ""),
                source_page=finding.get("sourcePage", 1),
            )

            # 3. Call Gemini verification
            gemini_resp = self.gemini_service.verify_finding(payload, session_id=session_id)

            # 4. Consensus rules
            consensus = evaluate_consensus(finding, gemini_resp, evidence_grounded=is_grounded)

            if consensus.outcome == VerificationOutcome.CONSISTENT:
                consistent_count += 1
                ui_status = "consistent"
            elif consensus.outcome == VerificationOutcome.SAFETY_REDIRECT:
                redirect_count += 1
                ui_status = "safety_redirect"
            elif consensus.outcome == VerificationOutcome.VERIFICATION_UNAVAILABLE:
                unavailable_count += 1
                ui_status = "verification_unavailable"
            else:
                review_count += 1
                ui_status = "needs_review"

            # 5. Enrich finding with consensus metadata
            enriched = dict(finding)
            enriched["verificationStatus"] = ui_status
            enriched["verification"] = {
                "status": ui_status,
                "bedrockInterpretation": consensus.bedrock_interpretation,
                "geminiAssessment": consensus.gemini_assessment,
                "reasoning": consensus.reasoning,
                "issues": consensus.issues,
                "evidenceVerified": consensus.evidence_verified,
            }
            updated_findings.append(enriched)

        summary = {
            "totalInsights": len(findings),
            "consistent": consistent_count,
            "needsReview": review_count,
            "safetyRedirects": redirect_count,
            "verificationUnavailable": unavailable_count,
            "verificationEngine": "Amazon Bedrock + Google Gemini (Free Tier)",
            "consensusFraming": "Consistent with supplied evidence (non-diagnostic)",
        }

        return updated_findings, summary
