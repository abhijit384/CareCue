"""
backend/security/output_safety_filter.py - Layer 4 Final Output Safety Filter.

Validates all outgoing AI findings, summaries, and recommendations before
they can be returned to the client or saved into DynamoDB.
"""

import re
from dataclasses import dataclass
from typing import Dict, Any, List, Tuple

# Patterns that violate non-diagnostic & non-prescription boundaries
DEFINITIVE_DIAGNOSIS_PATTERNS = [
    re.compile(r"\b(you have|patient has|diagnosed with|confirms? you have)\s+(cancer|diabetes|hiv|leukemia|cirrhosis|kidney failure)\b", re.IGNORECASE),
    re.compile(r"\b(this is a definitive diagnosis|conclusively proves)\b", re.IGNORECASE),
]

PRESCRIPTION_PATTERNS = [
    re.compile(r"\b(take|start taking|prescribe|prescribed)\s+\d+(\.\d+)?\s*(mg|mcg|ml|tablets?|capsules?)\b", re.IGNORECASE),
    re.compile(r"\b(increase|decrease|stop)\s+your\s+(dose|dosage|medication|insulin|statin)\b", re.IGNORECASE),
]

SECRET_LEAK_PATTERNS = [
    re.compile(r"AIzaSy[A-Za-z0-9-_]{33}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"[a-zA-Z0-9+/]{40}"),
]

@dataclass
class FilterResult:
    is_safe: bool
    quarantine_status: str  # 'SAFE', 'NEEDS_REVIEW', 'SAFETY_REDIRECT'
    issues: List[str]
    filtered_content: Dict[str, Any]


class OutputSafetyFilter:
    """Guarantees that no unsafe AI generation reaches the frontend."""

    def filter_finding(self, finding: Dict[str, Any]) -> FilterResult:
        issues = []
        status = "SAFE"
        cleaned_finding = dict(finding)

        text_to_check = f"{finding.get('title', '')} {finding.get('plainLanguageSummary', '')} {finding.get('clinicalSignificance', '')}"

        # 1. Check for secret leaks
        for pat in SECRET_LEAK_PATTERNS:
            if pat.search(text_to_check):
                issues.append("Security Alert: Output contained potential credential token; quarantined.")
                status = "SAFETY_REDIRECT"
                cleaned_finding["plainLanguageSummary"] = "[Content safely quarantined: Credential token pattern detected]"
                return FilterResult(is_safe=False, quarantine_status=status, issues=issues, filtered_content=cleaned_finding)

        # 2. Check for definitive diagnostic statements
        for pat in DEFINITIVE_DIAGNOSIS_PATTERNS:
            if pat.search(text_to_check):
                issues.append("Non-diagnostic guardrail triggered: AI attempted definitive diagnosis.")
                status = "NEEDS_REVIEW"
                cleaned_finding["plainLanguageSummary"] = (
                    "This test result shows variance from standard reference boundaries. "
                    "Clinical diagnosis requires a comprehensive medical examination and cannot be made by AI. "
                    "Please review this finding directly with your physician."
                )
                cleaned_finding["verificationStatus"] = "needs_review"

        # 3. Check for prescription/dosage advice
        for pat in PRESCRIPTION_PATTERNS:
            if pat.search(text_to_check):
                issues.append("Non-prescription guardrail triggered: AI suggested drug or dosage.")
                status = "SAFETY_REDIRECT"
                cleaned_finding["plainLanguageSummary"] = (
                    "Medication adjustments and prescriptions must only be managed by your licensed healthcare provider. "
                    "CareCue cannot recommend or alter pharmaceutical regimens."
                )
                cleaned_finding["verificationStatus"] = "needs_review"

        return FilterResult(
            is_safe=(len(issues) == 0),
            quarantine_status=status,
            issues=issues,
            filtered_content=cleaned_finding,
        )

    def filter_findings_batch(self, findings: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Filters an entire list of findings, returning safe sanitized findings and aggregated issues."""
        safe_findings = []
        all_issues = []

        for f in findings:
            res = self.filter_finding(f)
            safe_findings.append(res.filtered_content)
            all_issues.extend(res.issues)

        return safe_findings, all_issues
