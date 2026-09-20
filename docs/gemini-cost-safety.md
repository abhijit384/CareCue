# CareCue — Gemini Free-Tier Cost Safety & Quota Architecture

## 1. Zero Personal Cost Guarantee

CareCue is engineered to run strictly within **Google's Gemini API Free Tier**.
Under no circumstances should the project:
- Enable Google Cloud billing on the project.
- Attach personal credit cards, bank accounts, or payment methods.
- Prepay $5 or upgrade to a paid tier.
- Silently switch to a paid foundation model.

---

## 2. Selected Free-Tier Model & Limits

### Model Selection
- **Default Model**: `gemini-3.5-flash`
- **Environment Variable**: `GEMINI_MODEL_ID` (defaults to `gemini-3.5-flash`)
- **SDK**: Official `google-genai` Python SDK (`from google import genai`)

### Free-Tier Quota & Rate Limits
| Metric | Free-Tier Allowance | CareCue Enforced Cap | Safety Margin |
|---|---|---|---|
| **Requests Per Minute (RPM)** | 15 RPM | Max 5 requests / session | 66% headroom |
| **Tokens Per Minute (TPM)** | 1,000,000 TPM | Capped at 4,000 chars input | >95% headroom |
| **Requests Per Day (RPD)** | 1,500 RPD | ~50 test sessions / day | Free tier compliant |
| **Max Output Tokens** | Model limit | 1,000 tokens | Strict JSON output |

---

## 3. Application-Level Cost Protections

Inside [`backend/services/gemini_service.py`](file:///d:/CareCue/backend/services/gemini_service.py), the following hard barriers prevent accidental over-use:

1. **`MAX_GEMINI_REQUESTS_PER_SESSION = 5`**:
   A single session will never trigger more than 5 verification calls. Any additional requests return cached consensus.

2. **`MAX_GEMINI_INPUT_SIZE = 4000`**:
   Document context sent to Gemini is strictly restricted to the minimized verification payload (finding claim, observed value, and source quote). Full documents are **never** forwarded to Gemini.

3. **`MAX_GEMINI_OUTPUT_SIZE = 1000`**:
   Output token generation is constrained with temperature `0.1` and schema validation.

4. **Circuit Breaker on HTTP 429**:
   If a `429 (Too Many Requests)` or quota error is encountered from Google's API:
   - **Do NOT retry endlessly**.
   - Backoff exponential delay is capped at 1 retry.
   - Return status: `VERIFICATION_UNAVAILABLE`.
   - The user is seamlessly notified in the UI and allowed to continue in **Demo Mode**.

---

## 4. Disabling Live Gemini Integration

If you wish to run CareCue with live Amazon Bedrock while disabling external calls to Google Gemini:
Set in your environment or AWS Lambda configuration:
```bash
ENABLE_LIVE_GEMINI=false
```
When set to `false`, CareCue uses a deterministic, clinical verification simulator that generates consensus evaluation locally with zero outbound network calls and zero cost.
