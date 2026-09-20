# CareCue — Google Gemini Cross-Check Integration

## 1. Role in Architecture

Gemini acts as an **independent cross-check** in CareCue's multi-agent pipeline:
- **Primary Extraction & Interpretation**: Amazon Bedrock (Claude 3.5 Sonnet / Haiku).
- **Independent Verification**: Google Gemini (`gemini-3.5-flash`).
- **Consensus & Evidence Validation**: CareCue Verification Engine.

> **CRITICAL DISCLAIMER**:
> Gemini is **not a second doctor** and does not constitute proof of clinical truth. Its sole purpose is to detect discrepancies, ungrounded interpretations, and missing uncertainty between the primary extraction and the source document excerpts.

---

## 2. Authentication & Credential Architecture

- **No Browser Exposure**: The Gemini API key is **never** loaded in React, Vite client variables, HTML, or source maps.
- **Server-Side Retrieval**:
  1. Primary: AWS Secrets Manager secret named `carecue/dev/gemini` (contains key `GEMINI_API_KEY`).
  2. Fallback: Environment variable `GEMINI_API_KEY` in AWS Lambda.
  3. Secondary Fallback: AWS Secrets Manager secret named `carecue/gemini-api-key`.
- **Least-Privilege IAM Policy**:
  ```yaml
  - Effect: Allow
    Action:
      - secretsmanager:GetSecretValue
    Resource:
      - !Sub "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:carecue/dev/gemini*"
  ```
- **In-Memory Caching**: Retrieved API keys are cached in-memory (`_CACHED_API_KEY`) within the Lambda execution container to avoid repeated Secrets Manager charges ($0 cost).

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

## 5. Dual-AI Consensus States

CareCue defines four unambiguous verification states:

| Status | Meaning | Framing |
|---|---|---|
| `CONSISTENT` | Claim is supported verbatim by the cited excerpt | *"Consistent with the supplied evidence across primary analysis and independent cross-check."* |
| `NEEDS_REVIEW` | Numerical mismatch, boundary overstatement, or ungrounded assertion | *"Needs review: Discrepancy detected between extracted claim and cited evidence."* |
| `SAFETY_REDIRECT` | Emergency symptoms or prescription instructions detected | *"Care boundary active: topic touches emergency or medical prescription."* |
| `VERIFICATION_UNAVAILABLE` | Quota reached (HTTP 429) or service circuit broken | *"Independent verification paused due to standard quota limit. Primary analysis remains active."* |

---

## 6. Verified Production Setup

- **AWS Stack**: `carecue-backend-dev`
- **Region**: `us-east-1`
- **Secrets Manager Secret**: `carecue/dev/gemini` (Key: `GEMINI_API_KEY`)
- **Lambda Environment**: `GEMINI_SECRET_NAME: carecue/dev/gemini` (no plaintext secret values in environment variables)
- **IAM Policy**: Least-privilege `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:carecue/dev/gemini*`
- **Gemini Model**: `gemini-3.5-flash` (Free Tier, 15 RPM / 1,500 RPD)
- **Zero Spending Guarantee**: Google billing is NOT enabled; in-memory caching ensures zero repeated Secrets Manager read charges.
