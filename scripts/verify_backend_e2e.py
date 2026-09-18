import sys
import os
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

print(f"Executing Python: {sys.executable}")
print(f"Python Version: {sys.version}")

# 1. Test package imports
print("\n--- 1. Testing Package Imports ---")
import boto3
import pypdf
import pytest
import botocore
print(f"boto3: {boto3.__version__}")
print(f"pypdf: {pypdf.__version__}")
print(f"pytest: {pytest.__version__}")

# 2. Test CareCue backend core imports
print("\n--- 2. Testing CareCue Backend Modules ---")
from backend.handlers.session_handler import lambda_handler as session_handler
from backend.handlers.upload_handler import lambda_handler as upload_handler
from backend.handlers.process_handler import lambda_handler as process_handler
from backend.handlers.brief_handler import lambda_handler as brief_handler
from backend.handlers.guidance_handler import lambda_handler as guidance_handler
from backend.services.bedrock_service import BedrockService
from backend.services.gemini_service import GeminiVerificationService
from backend.verification.verification_types import GeminiVerificationPayload
from backend.privacy.pii_redactor import redact_pii
from backend.verification.comparison_service import DualAIVerificationEngine
print("All CareCue backend modules successfully imported with zero errors!")

# 3. Test PII Redactor
print("\n--- 3. Testing PII Redaction ---")
sample_text = "Patient Name: Johnathan Smith\nDOB: 12/04/1975\nDoctor: Dr. Sarah Jenkins\nBlood Glucose was 145 mg/dL."
redact_res = redact_pii(sample_text)
redacted = redact_res.redacted_text
print(f"Redacted text:\n{redacted}")
print(f"PII entities redacted: {len(redact_res.detected_entities)}")
assert len(redact_res.detected_entities) >= 1, "Expected at least 1 PII entity to be redacted"

# 4. Test Bedrock Service integration path
print("\n--- 4. Testing Bedrock Service ---")
bedrock = BedrockService()
bedrock_result = bedrock.analyze_document(redacted)
print(f"Bedrock result summary: {bedrock_result.get('summary')}")
print(f"Bedrock insights count: {len(bedrock_result.get('insights', []))}")
assert len(bedrock_result.get('insights', [])) > 0

# 5. Test Gemini Service integration path
print("\n--- 5. Testing Gemini Service ---")
gemini = GeminiVerificationService()
payload = GeminiVerificationPayload(
    finding_id="f-001",
    finding="Fasting Blood Glucose",
    reported_value="145 mg/dL",
    reference_range="70-99 mg/dL",
    source_excerpt="Blood Glucose was 145 mg/dL.",
    source_page=1,
)
gemini_result = gemini.verify_finding(payload, session_id="verify-sess")
print(f"Gemini verification status: {gemini_result.status.value}")
print(f"Gemini reasoning summary: {gemini_result.reasoning_summary}")
assert gemini_result.status is not None

# 6. Test Document Processing Flow via process_handler
print("\n--- 6. Testing Complete Document Processing Flow ---")
event = {
    "httpMethod": "POST",
    "body": json.dumps({
        "sessionId": "cc-sess-e2e-verify",
        "documentText": (
            "Complete Blood Count (CBC) Report:\n"
            "Hemoglobin: 10.8 g/dL (Ref: 12.0-15.5)\n"
            "Ferritin: 14 ng/mL (Ref: 20-200)\n"
            "Platelets: 240 K/uL (Ref: 150-450)\n"
            "Patient: Emily Davis, DOB: 05/15/1990."
        ),
        "userNotes": "Mild dizziness on standing",
    })
}
resp = process_handler(event)
assert resp["statusCode"] == 200, f"Expected status 200, got {resp['statusCode']}"
body = json.loads(resp["body"])
print(f"Session: {body.get('sessionId')}")
print(f"Findings Extracted: {len(body.get('findings', []))}")
print(f"PII Entities Protected: {body.get('piiRedactedCount')}")
print(f"Overall Confidence: {body.get('overallConfidence')}%")

# 7. Test Doctor Brief Generation
print("\n--- 7. Testing Doctor Brief Flow ---")
brief_event = {
    "httpMethod": "POST",
    "body": json.dumps({
        "sessionId": "cc-sess-e2e-verify",
        "patientNotes": "Want to ask about iron supplements",
    })
}
brief_resp = brief_handler(brief_event)
assert brief_resp["statusCode"] == 200, f"Expected status 200, got {brief_resp['statusCode']}"
brief_body = json.loads(brief_resp["body"])
print(f"Brief Key Findings: {len(brief_body.get('keyFindings', []))}")
print(f"Discussion Items: {len(brief_body.get('discussionItems', []))}")

print("\n=======================================================")
print("SUCCESS: ALL CARECUE BACKEND PATHS VERIFIED ON D:\\venvs\\carecue!")
print("=======================================================")
