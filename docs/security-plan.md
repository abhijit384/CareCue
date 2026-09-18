# CareCue — Security Plan

> Design security before implementation. Never claim more than we deliver.

---

## 1. Security Philosophy

CareCue handles sensitive health-related information. Our security posture is:

1. **Honest about scope.** We do not claim HIPAA compliance, complete anonymization, or medical-grade security. We implement strong security fundamentals appropriate for a hackathon product.
2. **Minimize exposure.** Reduce the amount of sensitive data that leaves controlled environments.
3. **Defense in depth.** Multiple layers of protection — no single point of failure.
4. **Secure by default.** Every new component starts locked down. Access is granted explicitly.

---

## 2. Threat Model

### 2.1 What We're Protecting

| Asset | Sensitivity | Location |
|-------|------------|----------|
| Uploaded medical documents | High | S3 (encrypted, 24h lifecycle) |
| Extracted document text | High | Lambda memory (transient), DynamoDB |
| Analysis results | Medium | DynamoDB |
| Privacy minimization records | Medium | DynamoDB |
| Doctor Visit Briefs | Medium | S3 + DynamoDB |
| Session metadata | Low | DynamoDB |
| Gemini API key | Critical | Secrets Manager |
| AWS credentials | Critical | IAM roles (never stored) |

### 2.2 Threat Vectors

| Threat | Mitigation |
|--------|-----------|
| **API key exposure** | Gemini key in Secrets Manager only. Never in frontend, env vars visible to client, or logs. |
| **Data exfiltration** | S3 private, no public access. Presigned URLs with 15-min expiry. |
| **Injection attacks** | Input validation on all API endpoints. Parameterized DynamoDB queries. |
| **Cross-site scripting (XSS)** | React's built-in escaping. CSP headers. No `dangerouslySetInnerHTML` with user content. |
| **CORS abuse** | API Gateway CORS locked to Amplify domain origin only. |
| **PII leakage to Gemini** | Privacy Gateway strips identifiers before verification payload is constructed. |
| **PII in logs** | CloudWatch logs never contain raw documents or extracted PII. Structured logging with redaction. |
| **Unauthorized access** | API key for hackathon. Cognito is stretch goal. |
| **Document persistence** | S3 lifecycle: 24-hour expiry. User can delete sessions manually. |
| **Man-in-the-middle** | TLS everywhere. HTTPS only. HSTS headers. |

---

## 3. Secret Management

### 3.1 Gemini API Key

```
Storage:       AWS Secrets Manager → carecue/dev/gemini (Key: GEMINI_API_KEY)
Access:        Lambda execution role only (ProcessFunction, VerificationFunction)
Policy:        Strict least-privilege (arn:aws:secretsmanager:...:secret:carecue/dev/gemini*)
Caching:       In-memory process cache (_CACHED_API_KEY) across warm invocations ($0 cost)
Exposure:      NEVER in:
               - Frontend code
               - Environment variables visible to client
               - API responses
               - CloudWatch logs
               - Git repository
               - Error messages
```

### 3.2 AWS Credentials

```
Method:        IAM execution roles (never access keys)
Scope:         Per-function least-privilege policies
Rotation:      Automatic (STS temporary credentials)
```

### 3.3 Client-Side Secrets

```
Rule:          ZERO secrets in the frontend.
API URL:       Environment variable at build time (VITE_API_URL) — not a secret.
API Key:       Sent as header, stored in environment variable — not in code.
               (Hackathon: this is an API Gateway key for basic throttling,
                not a security credential.)
```

---

## 4. Privacy Gateway (Technical Design)

The Privacy Gateway is both a security mechanism and a visible UI feature.

### 4.1 What Gets Minimized

| PII Type | Detection Method | Action |
|----------|-----------------|--------|
| **Person names** | Regex + pattern matching (Dr., Mr., Ms., followed by capitalized words) | Replace with `[PERSON]` |
| **Dates of birth** | Regex (MM/DD/YYYY, DD-Mon-YYYY, DOB:, Date of Birth:) | Replace with `[DATE]` |
| **Phone numbers** | Regex (multiple formats) | Replace with `[PHONE]` |
| **Addresses** | Line-level heuristic (number + street pattern) | Replace with `[ADDRESS]` |
| **SSN/ID numbers** | Regex (XXX-XX-XXXX, ID:, MRN:) | Replace with `[ID]` |
| **Email addresses** | Regex (standard email pattern) | Replace with `[EMAIL]` |
| **Account/policy numbers** | Regex (Account:, Policy:, followed by alphanumeric) | Replace with `[ACCOUNT]` |

### 4.2 What Is NOT Minimized

These fields are intentionally preserved because they are necessary for clinical accuracy:

- Lab values (e.g., "11.2 g/dL")
- Reference ranges (e.g., "12.0–17.5")
- Test names (e.g., "Hemoglobin", "TSH")
- Medical terminology
- Dates of tests (not DOB — these are preserved for temporal context)
- Clinical observations and findings

### 4.3 Processing Flow

```
Original Document Text
        │
        ▼
┌───────────────────────┐
│  PII Scanner          │  Regex-based pattern matching
│  (Lambda, server-side)│  on extracted text
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  Minimization Record  │  Log which fields were found & replaced
│  (DynamoDB)           │  (without storing the original PII values)
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  Minimized Payload    │  Used for Gemini verification request
│  (structured JSON)    │  Contains claims + values + ranges only
└───────────────────────┘
```

### 4.4 Important Disclaimers

- This is **pattern-based minimization**, not guaranteed anonymization
- Unusual name formats, embedded identifiers, or context-dependent PII may not be caught
- We use the term "minimized" — never "anonymized" or "de-identified"
- The UI shows users exactly what was detected and what will be sent

---

## 5. Data Lifecycle

### 5.1 Document Lifecycle

```
Upload                  → S3 (encrypted at rest, SSE-S3)
                          ↓ 24 hours
Auto-Delete             → S3 lifecycle policy removes object
                          
Manual Delete           → User triggers delete → Lambda removes from S3 + DynamoDB
```

### 5.2 Session Data Lifecycle

```
Session Created         → DynamoDB (META record)
Analysis Complete       → DynamoDB (RESULTS record, PRIVACY record)
Brief Generated         → DynamoDB (BRIEF record) + S3 (brief file)
Session Deleted         → All DynamoDB records for sessionId deleted
                          All S3 objects for sessionId deleted
```

### 5.3 Transient Data

| Data | Persistence |
|------|-------------|
| Raw document text (extracted) | Lambda memory only — never persisted as raw text |
| Gemini API request body | Transient — not logged, not stored |
| Gemini API response | Parsed → stored as verification status only |
| Bedrock request body | Transient in Lambda memory |
| Bedrock response | Parsed → stored as structured results only |

---

## 6. API Security

### 6.1 Input Validation

Every API endpoint validates:

```typescript
// Example: POST /sessions/{id}/analyze
{
  // Session ID: must be valid UUID format
  sessionId: z.string().uuid(),
  
  // Options: limited allowed values
  analysisType: z.enum(['report', 'guidance', 'brief']),
  
  // Text input: max length, sanitized
  userNotes: z.string().max(5000).optional(),
  
  // File: validated on upload (type, size)
  // Allowed types: application/pdf, image/jpeg, image/png
  // Max size: 10 MB
}
```

### 6.2 CORS Configuration

```
Allowed Origins:    https://main.{AMPLIFY_APP_ID}.amplifyapp.com
Allowed Methods:    GET, POST, DELETE, OPTIONS
Allowed Headers:    Content-Type, Authorization, x-api-key
Max Age:            3600 (1 hour preflight cache)
```

### 6.3 Rate Limiting

```
API Gateway Throttle:   100 requests/second burst
                        50 requests/second sustained
Per-IP (stretch):       10 requests/second (requires WAF — stretch goal)
```

### 6.4 Request/Response Headers

```
Strict-Transport-Security:    max-age=31536000; includeSubDomains
Content-Security-Policy:      default-src 'self'; script-src 'self'; 
                              style-src 'self' 'unsafe-inline' fonts.googleapis.com;
                              font-src fonts.gstatic.com;
                              connect-src {API_URL};
X-Content-Type-Options:       nosniff
X-Frame-Options:              DENY
Referrer-Policy:              strict-origin-when-cross-origin
```

---

## 7. Logging & Monitoring Security

### 7.1 What We Log

| ✅ Logged | ❌ Never Logged |
|-----------|----------------|
| Request IDs | Raw document content |
| Session IDs | Extracted medical text |
| API route + method | Patient names or PII |
| Response status codes | Gemini API key |
| Execution duration | Bedrock prompt/response content |
| Error types (generic) | Full stack traces with data |
| Verification status (Consistent/Review) | Gemini request/response bodies |

### 7.2 Structured Logging Format

```json
{
  "timestamp": "2026-09-18T12:00:00Z",
  "level": "INFO",
  "requestId": "abc-123",
  "sessionId": "session-456",
  "action": "analyze",
  "step": "bedrock_complete",
  "duration_ms": 3200,
  "insights_count": 5,
  "verification_status": "3_consistent_2_review"
}
```

Never:
```json
{
  "document_text": "Patient John Doe, DOB 01/15/1980...",  // ❌ NEVER
  "bedrock_response": "The patient's hemoglobin..."        // ❌ NEVER
}
```

### 7.3 CloudWatch Alarms

| Alarm | Condition | Action |
|-------|-----------|--------|
| High error rate | Lambda errors > 5% in 5 min | Notification |
| Bedrock throttling | Bedrock 429 responses | Notification |
| Unusual traffic | API Gateway 4xx > 50% in 5 min | Notification |

---

## 8. Frontend Security

### 8.1 Rules

- **No secrets in frontend code.** Period.
- **No raw document rendering.** Documents are processed server-side; only structured results are displayed.
- **Content sanitization.** All AI-generated text is rendered through React's built-in escaping. No `dangerouslySetInnerHTML`.
- **No local storage of sensitive data.** Session IDs may be cached; document content never is.
- **File validation before upload.** Check type and size client-side (server-side validation is the real gate).

### 8.2 Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data:;
connect-src https://{API_GATEWAY_URL};
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

---

## 9. Compliance Positioning

### What We Say

> "CareCue implements privacy-focused data handling including PII minimization, encrypted storage, and automatic data expiry. CareCue is an informational tool and does not claim regulatory compliance for medical device or clinical use."

### What We Do NOT Say

- ❌ "HIPAA compliant"
- ❌ "Fully anonymized"
- ❌ "Clinically validated"
- ❌ "Medical-grade security"
- ❌ "Zero data risk"
- ❌ "No data leaves our systems"

### What We Are Honest About

- Documents are processed by Amazon Bedrock (within AWS)
- Privacy-minimized data is sent to Google Gemini for verification
- PII minimization is pattern-based, not guaranteed
- Documents are automatically deleted after 24 hours
- Users can manually delete their data at any time

---

## 10. Security Checklist (Pre-Demo)

### Critical (P0)

- [ ] Gemini API key in Secrets Manager (not in code, not in env vars visible to client)
- [ ] S3 bucket: private, encrypted, lifecycle enabled
- [ ] No PII in CloudWatch logs
- [ ] CORS locked to Amplify domain
- [ ] Input validation on all API endpoints
- [ ] No `dangerouslySetInnerHTML` with user/AI content
- [ ] Privacy Gateway functional (PII detection + minimization)
- [ ] HTTPS everywhere

### Important (P1)

- [ ] Rate limiting on API Gateway
- [ ] Structured logging (no raw data)
- [ ] Presigned URL expiry configured (15 min)
- [ ] Lambda IAM policies are least-privilege
- [ ] CSP headers configured
- [ ] Session deletion cleans up all data (S3 + DynamoDB)

### Nice-to-Have (P2)

- [ ] CloudWatch alarms configured
- [ ] WAF rate limiting per IP
- [ ] Cognito authentication
- [ ] Automated security scanning in CI/CD

---

## 11. Document Prompt-Injection Defense & Layered Safety Architecture (Stage 4)

### 11.1 Medical Document Prompt-Injection Defense
Uploaded clinical PDFs and text are treated strictly as **untrusted data**:
1. **Pattern Detection** ([`backend/security/prompt_injection.py`](file:///d:/CareCue/backend/security/prompt_injection.py)):
   Scans for injection patterns such as:
   - `"ignore previous instructions"`
   - `"reveal system prompt"`
   - `"disregard safety rules"`
   - `"act as administrator"`
   - `"exfiltrate"`
2. **Untrusted Boundary Delimiters**:
   Encapsulates document text inside `<<<BEGIN_UNTRUSTED_DOCUMENT_DATA>>>` delimiters, instructing models never to execute directives embedded within passive patient records.

### 11.2 4-Layer Safety Engine
- **Layer 1 (Application Rules)**: Fast heuristic regex check for acute emergencies (911 redirect), prescription requests, and diagnostic inquiries before calling foundation models.
- **Layer 2 (Bedrock Prompt Constraints)**: Strict system instructions enforcing non-diagnostic, evidence-bound extractions.
- **Layer 3 (Gemini Free-Tier Cross-Check)**: Independent validation checking whether claimed findings and reference ranges match verbatim source excerpts.
- **Layer 4 (Output Safety Filter)**: Validates generated insights before egress to client, blocking any unminimized PII, credential leakage, or hallucinated clinical certainties.

