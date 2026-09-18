# CareCue — Google Gemini Cross-Check Integration

## 1. Role in Architecture

Gemini acts as an **independent cross-check** in CareCue's multi-agent pipeline:
- **Primary Extraction & Interpretation**: Amazon Bedrock (Claude 3.5 Sonnet / Haiku).
- **Independent Verification**: Google Gemini (`gemini-2.5-flash`).
- **Consensus & Evidence Validation**: CareCue Verification Engine.

> **CRITICAL DISCLAIMER**:
> Gemini is **not a second doctor** and does not constitute proof of clinical truth. Its sole purpose is to detect discrepancies, ungrounded interpretations, and missing uncertainty between the primary extraction and the source document excerpts.

---

## 2. Authentication & Credential Architecture

- **No Browser Exposure**: The Gemini API key is **never** loaded in React, Vite client variables, HTML, or source maps.
- **Server-Side Retrieval**:
  1. Primary: Environment variable `GEMINI_API_KEY` in AWS Lambda.
  2. Fallback: AWS Secrets Manager secret named `carecue/gemini-api-key`.
- **In-Memory Caching**: Retrieved API keys are cached in-memory within the Lambda execution container to avoid repeated Secrets Manager charges.

---

## 3. Privacy Gateway & Minimal Payload

Full medical documents are **never** forwarded to Gemini.
Instead, the Privacy Gateway extracts only the minimal assertion tuple:
```json
{
  "finding": "Total Cholesterol elevated above standard cutoff",
  "reported_value": "215 mg/dL",
  "reference_range": "< 200 mg/dL",
  "source_excerpt": "Total Cholesterol 215 mg/dL < 200 HIGH",
  "source_page": 1
}
```
Patient names, dates of birth, MRNs, phone numbers, and addresses are strictly excluded.

---

## 4. Structured Output Schema

The `google-genai` client requires structured JSON adhering to:
```json
{
  "verification": {
    "status": "CONSISTENT | NEEDS_REVIEW | SAFETY_REDIRECT",
    "evidence_supported": true,
    "value_matches": true,
    "overstatement_detected": false,
    "uncertainty_required": false
  },
  "issues": [],
  "reasoning_summary": "string"
}
```

If the returned payload fails schema validation or is malformed, CareCue marks the finding as `NEEDS_REVIEW`.
