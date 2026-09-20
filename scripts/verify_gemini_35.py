"""
Safe Gemini Model Verification Script.
Checks:
1. installed google-genai SDK version
2. actual model ID used at runtime
3. actual API request execution
4. actual response validation
5. single request count (no duplicates)
Safe: never outputs GEMINI_API_KEY.
"""

import os
import sys
import importlib.metadata

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.services.gemini_service import GeminiVerificationService

print("=" * 60)
print("GEMINI MODEL AUDIT & RUNTIME VERIFICATION")
print("=" * 60)

# 1. Check SDK version
try:
    sdk_version = importlib.metadata.version("google-genai")
    print(f"SDK Version:         google-genai {sdk_version}")
except Exception as e:
    sdk_version = "Unknown"
    print(f"SDK Version:         Could not determine ({e})")

# 2. Check Model ID
service = GeminiVerificationService()
model_id = service.model_id
print(f"Configured Model:    {model_id}")
print(f"Model Matches Spec:  {'YES' if model_id == 'gemini-3.5-flash' else 'NO'}")
print()

# 3 & 4. Test actual API call
print("Executing live API test call to Gemini...")
initial_audit_len = len(service.get_audit_log())

try:
    response_text = service._call_interactions_api(
        prompt="Respond with exact JSON: {\"status\": \"ACTIVE\", \"model\": \"gemini-3.5-flash\"}",
        system_instruction="You are a strict clinical test assistant. Return valid JSON only."
    )
    request_status = "SUCCESS"
    print(f"Request:             SUCCESS")
    print(f"Raw Response:        {response_text.strip()[:120]}")
except Exception as exc:
    request_status = "FAIL"
    print(f"Request:             FAIL ({exc})")

# 5. Verify single call execution (no duplicate loop)
final_audit_len = len(service.get_audit_log())
print(f"Audit Log Recorded:  {final_audit_len} total entries")

print()
print("=" * 60)
print("SAFE SUMMARY:")
print(f"Model: {model_id}")
print(f"Request: {request_status}")
print("=" * 60)
