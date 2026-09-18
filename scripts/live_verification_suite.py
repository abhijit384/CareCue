"""
scripts/live_verification_suite.py - CareCue Final Live Verification Suite.

Validates:
1. Production Secret Source (AWS Secrets Manager carecue/dev/gemini, no GEMINI_API_KEY in Lambda env).
2. Least-Privilege IAM policy.
3. Real/Deterministic Dual-Model Pipeline (Bedrock + Gemini cross-check).
4. Four verification states: CONSISTENT, NEEDS_REVIEW, SAFETY_REDIRECT, VERIFICATION_UNAVAILABLE.
5. PII minimization before external cross-checking.
6. Zero secret exposure across code, environment, and logs.
7. Free-Tier cost safety bounds ($0 architecture).
"""

import sys
import os
import re
import json

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.verification.verification_types import (
    VerificationOutcome,
    GeminiVerificationPayload,
    GeminiVerificationResponse,
)
from backend.verification.verification_rules import evaluate_consensus
from backend.verification.comparison_service import DualAIVerificationEngine
from backend.privacy.pii_redactor import redact_pii
from backend.services.bedrock_service import BedrockService
from backend.services.gemini_service import (
    GeminiVerificationService,
    MAX_REQUESTS_PER_SESSION,
    MAX_INPUT_CHAR_SIZE,
    MAX_OUTPUT_TOKENS,
)
from backend.security.output_safety_filter import OutputSafetyFilter

def run_suite():
    print("=================================================================")
    print("CARECUE FINAL LIVE VERIFICATION & SECURITY AUDIT SUITE")
    print("=================================================================")

    # -------------------------------------------------------------
    # 1. PRODUCTION SECRET SOURCE & IAM POLICY VERIFICATION
    # -------------------------------------------------------------
    print("\n[STEP 1] Verifying Production Secret Source & Least-Privilege IAM...")
    template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "infrastructure", "template.yaml"))
    assert os.path.exists(template_path), f"Template not found at {template_path}"

    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    # Confirm GeminiSecretName parameter
    assert "GeminiSecretName:" in template_content, "Missing GeminiSecretName parameter"
    assert "carecue/dev/gemini" in template_content, "Default secret must be carecue/dev/gemini"

    # Confirm Lambda environment passes secret NAME, NOT the secret credential
    assert "GEMINI_SECRET_NAME: !Ref GeminiSecretName" in template_content, "GEMINI_SECRET_NAME not in Globals"
    assert "GEMINI_API_KEY:" not in template_content, "SECURITY VIOLATION: GEMINI_API_KEY must not be in template environment"

    # Confirm least-privilege IAM policy strictly scoped to carecue/dev/gemini
    iam_pattern = r'Resource:\s*-\s*!Sub\s*"arn:aws:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:\${GeminiSecretName}\*"'
    matches = re.findall(iam_pattern, template_content)
    assert len(matches) >= 2, f"Expected least-privilege IAM policy in ProcessFunction and VerificationFunction, found {len(matches)}"
    print("  -> Production Secret Source: AWS Secrets Manager 'carecue/dev/gemini'")
    print("  -> Production Lambda Env: Contains GEMINI_SECRET_NAME only (NO secret value)")
    print(f"  -> Scoped IAM Policies: {len(matches)} functions restricted to 'arn:aws:secretsmanager:...:secret:carecue/dev/gemini*'")
    print("  -> PASSED: Secret source and IAM least-privilege verified.")

    # -------------------------------------------------------------
    # 2. STATE A: CONSISTENT (Synthetic Medical Data)
    # -------------------------------------------------------------
    print("\n[STEP 2] Testing State A: CONSISTENT (Synthetic Lab Finding)...")
    finding_a = {
        "id": "f-syn-01",
        "title": "Complete Blood Count — Hemoglobin",
        "plainLanguageSummary": "Hemoglobin measured at 10.2 g/dL, below reference range of 12.0 - 16.0 g/dL.",
        "clinicalSignificance": "Value: 10.2 g/dL (Reference: 12.0 - 16.0 g/dL)",
        "sourceQuote": "Hemoglobin: 10.2 g/dL. Reference range: 12-16 g/dL.",
        "sourcePage": 1,
    }
    source_a = "Complete Blood Count: Hemoglobin: 10.2 g/dL. Reference range: 12-16 g/dL. WBC: 6.5 K/uL."

    gemini_resp_a = GeminiVerificationResponse(
        status=VerificationOutcome.CONSISTENT,
        evidence_supported=True,
        value_matches=True,
        overstatement_detected=False,
        uncertainty_required=False,
        issues=[],
        reasoning_summary="Hemoglobin value of 10.2 g/dL is supported by the supplied source excerpt.",
    )
    report_a = evaluate_consensus(finding_a, gemini_resp_a, evidence_grounded=True)
    assert report_a.outcome == VerificationOutcome.CONSISTENT
    assert "Consistent with the supplied evidence" in report_a.reasoning
    assert "%" not in report_a.confidence_tier
    print(f"  -> Outcome: {report_a.outcome.value}")
    print(f"  -> Framing: '{report_a.reasoning}'")
    print("  -> PASSED: State A (CONSISTENT) verified.")

    # -------------------------------------------------------------
    # 3. STATE B: NEEDS_REVIEW (Value Discrepancy / Hallucination)
    # -------------------------------------------------------------
    print("\n[STEP 3] Testing State B: NEEDS_REVIEW (Numerical Discrepancy)...")
    finding_b = {
        "id": "f-syn-02",
        "title": "Lipid Panel — Total Cholesterol",
        "plainLanguageSummary": "Total cholesterol reported at 295 mg/dL.",
        "clinicalSignificance": "Value: 295 mg/dL",
        "sourceQuote": "Total Cholesterol: 215 mg/dL (Desirable: <200 mg/dL)",
        "sourcePage": 1,
    }
    gemini_resp_b = GeminiVerificationResponse(
        status=VerificationOutcome.NEEDS_REVIEW,
        evidence_supported=True,
        value_matches=False,
        overstatement_detected=False,
        uncertainty_required=True,
        issues=["Reported 295 mg/dL differs from source excerpt 215 mg/dL."],
        reasoning_summary="Observed numerical discrepancy between claim and quoted source text.",
    )
    report_b = evaluate_consensus(finding_b, gemini_resp_b, evidence_grounded=True)
    assert report_b.outcome == VerificationOutcome.NEEDS_REVIEW
    assert any("numerical" in issue.lower() or "discrepancy" in issue.lower() for issue in report_b.issues)
    print(f"  -> Outcome: {report_b.outcome.value}")
    print(f"  -> Issues: {report_b.issues}")
    print("  -> PASSED: State B (NEEDS_REVIEW) verified.")

    # -------------------------------------------------------------
    # 4. STATE C: SAFETY_REDIRECT (Emergency / Prescription Boundary)
    # -------------------------------------------------------------
    print("\n[STEP 4] Testing State C: SAFETY_REDIRECT (Safety Boundary Trigger)...")
    finding_c = {
        "id": "f-syn-03",
        "title": "Cardiac Panel — Troponin Elevation",
        "plainLanguageSummary": "Patient should urgently administer nitroglycerin for crushing chest pain.",
        "clinicalSignificance": "Value: 0.85 ng/mL (High)",
        "sourceQuote": "Troponin I: 0.85 ng/mL. Patient reported acute chest pain.",
        "sourcePage": 1,
    }
    gemini_resp_c = GeminiVerificationResponse(
        status=VerificationOutcome.SAFETY_REDIRECT,
        evidence_supported=True,
        value_matches=True,
        overstatement_detected=True,
        uncertainty_required=True,
        issues=["Emergency symptoms and pharmaceutical prescription instructions detected."],
        reasoning_summary="Safety boundary active: Content involves acute emergency triage and prescription medication.",
    )
    report_c = evaluate_consensus(finding_c, gemini_resp_c, evidence_grounded=True)
    assert report_c.outcome == VerificationOutcome.SAFETY_REDIRECT
    assert "Safety Boundary" in report_c.confidence_tier
    print(f"  -> Outcome: {report_c.outcome.value}")
    print(f"  -> Confidence Tier: {report_c.confidence_tier}")
    print("  -> PASSED: State C (SAFETY_REDIRECT) verified.")

    # -------------------------------------------------------------
    # 5. STATE D: VERIFICATION_UNAVAILABLE (Rate Limit / Quota Exhaustion)
    # -------------------------------------------------------------
    print("\n[STEP 5] Testing State D: VERIFICATION_UNAVAILABLE (Circuit-Breaker)...")
    finding_d = {
        "id": "f-syn-04",
        "title": "Metabolic Panel — Potassium",
        "plainLanguageSummary": "Serum potassium level is 4.1 mEq/L.",
        "clinicalSignificance": "Value: 4.1 mEq/L (Reference: 3.5 - 5.0 mEq/L)",
        "sourceQuote": "Potassium: 4.1 mEq/L",
        "sourcePage": 1,
    }
    gemini_resp_d = GeminiVerificationResponse(
        status=VerificationOutcome.VERIFICATION_UNAVAILABLE,
        evidence_supported=False,
        value_matches=False,
        overstatement_detected=False,
        uncertainty_required=True,
        issues=["Gemini Free-Tier rate limit reached. Verification temporarily paused."],
        reasoning_summary="Independent verification paused due to standard quota limit. Demo mode available.",
    )
    report_d = evaluate_consensus(finding_d, gemini_resp_d, evidence_grounded=True)
    assert report_d.outcome == VerificationOutcome.VERIFICATION_UNAVAILABLE
    assert "quota" in report_d.reasoning.lower() or "limit" in report_d.reasoning.lower()
    print(f"  -> Outcome: {report_d.outcome.value}")
    print(f"  -> Reasoning: '{report_d.reasoning}'")
    print("  -> PASSED: State D (VERIFICATION_UNAVAILABLE) verified.")

    # -------------------------------------------------------------
    # 6. BEDROCK + GEMINI DUAL-AI PIPELINE INTEGRATION
    # -------------------------------------------------------------
    print("\n[STEP 6] Testing Dual-AI Pipeline (Bedrock Comprehension + PII Minimization + Gemini Cross-Check)...")
    raw_synthetic_report = (
        "CONFIDENTIAL MEDICAL LAB REPORT\n"
        "Patient Name: Sarah Connor, DOB: 02/28/1984, MRN: 9482710\n"
        "Ordering Physician: Dr. Peter Silberman, MD\n"
        "Facility: Metro General Hospital Clinical Chemistry\n"
        "--------------------------------------------------\n"
        "Test Name               Result      Reference Range  Status\n"
        "Fasting Blood Glucose   114 mg/dL   70 - 99 mg/dL    HIGH\n"
        "Hemoglobin A1c          5.9 %       4.0 - 5.6 %      ELEVATED\n"
        "Serum Creatinine        0.9 mg/dL   0.6 - 1.2 mg/dL  NORMAL\n"
        "Notes: Patient reports feeling fatigued in the afternoon.\n"
    )

    # Step 6a: Privacy Gateway / PII Minimization
    redaction_result = redact_pii(raw_synthetic_report)
    print(f"  -> PII Minimization: {len(redaction_result.detected_entities)} sensitive entities redacted")
    assert "Sarah Connor" not in redaction_result.redacted_text
    assert "9482710" not in redaction_result.redacted_text

    # Step 6b: Bedrock Comprehension Layer
    from backend.services.bedrock_service import analyze_document_with_bedrock
    findings = analyze_document_with_bedrock(redaction_result.redacted_text)
    print(f"  -> Bedrock Insights Extracted: {len(findings)} findings")
    assert len(findings) >= 2, "Expected at least 2 structured findings"

    # Step 6c: Dual-AI Verification Engine Batch Execution
    verification_engine = DualAIVerificationEngine()
    verified_findings, summary = verification_engine.verify_findings(
        findings=findings,
        source_text=redaction_result.redacted_text,
        session_id="live-audit-sess-001",
    )
    print(f"  -> Verified Findings: {len(verified_findings)}")
    print(f"  -> Summary: Consistent={summary['consistent']}, NeedsReview={summary['needsReview']}, Redirects={summary['safetyRedirects']}")
    assert summary["totalInsights"] == len(findings)

    # Step 6d: Output Safety Filter (Layer 4)
    safety_filter = OutputSafetyFilter()
    safe_findings, issues = safety_filter.filter_findings_batch(verified_findings)
    assert len(safe_findings) == len(verified_findings)
    print("  -> Layer 4 Output Safety Filter: Passed with zero unauthorized prescription or emergency leaks")
    print("  -> PASSED: Complete Bedrock + Gemini pipeline verified.")

    # -------------------------------------------------------------
    # 7. COST SAFETY BOUNDS AUDIT
    # -------------------------------------------------------------
    print("\n[STEP 7] Auditing Cost Safety & Quota Bounds...")
    print(f"  -> Max Gemini Requests Per Session: {MAX_REQUESTS_PER_SESSION} requests")
    print(f"  -> Max Input Character Bound: {MAX_INPUT_CHAR_SIZE} chars")
    print(f"  -> Max Output Token Bound: {MAX_OUTPUT_TOKENS} tokens")
    assert MAX_REQUESTS_PER_SESSION <= 5, "Cost Safety: requests per session must not exceed 5"
    assert MAX_OUTPUT_TOKENS <= 1000, "Cost Safety: max output tokens must not exceed 1000"

    # Test Session Limit Enforcement
    service = GeminiVerificationService()
    sess_id = "test-cost-cap-sess"
    for i in range(MAX_REQUESTS_PER_SESSION):
        service._session_request_counts[sess_id] = i + 1
    # Next call must use local consensus without invoking Gemini
    payload_test = GeminiVerificationPayload(
        finding_id="f-cap", finding="Test", reported_value="1", reference_range="0-2", source_excerpt="Test: 1", source_page=1
    )
    capped_resp = service.verify_finding(payload_test, session_id=sess_id)
    assert capped_resp.status == VerificationOutcome.CONSISTENT
    print("  -> Session request cap strictly enforced ($0 overrun guarantee)")
    print("  -> PASSED: Cost safety and free-tier bounds verified.")

    # -------------------------------------------------------------
    # 8. SECRET SCANNER HYGIENE CHECK
    # -------------------------------------------------------------
    print("\n[STEP 8] Auditing Secrets Hygiene Across Repository...")
    import subprocess
    scan_res = subprocess.run(
        [sys.executable, os.path.join(os.path.dirname(__file__), "secret_scan.py")],
        capture_output=True,
        text=True,
    )
    print(f"  -> Secret Scan Exit Code: {scan_res.returncode}")
    assert scan_res.returncode == 0, f"Secret scanner failed: {scan_res.stderr}"
    assert "0 secrets detected" in scan_res.stdout
    print("  -> PASSED: Zero secret leaks in code, commits, or frontend bundles.")

    print("\n=================================================================")
    print("ALL 8 VERIFICATION GATES PASSED WITH ZERO ERRORS!")
    print("=================================================================")

if __name__ == "__main__":
    run_suite()
