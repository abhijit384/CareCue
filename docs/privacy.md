# CareCue Privacy Architecture

## Overview
CareCue is designed from the ground up on the principle of **Data Minimization and Zero-Persistent Health Profiling**. Health records and clinical notes contain sensitive personal identifiable information (PII) and protected health information (PHI). CareCue guarantees that raw identifiers never leave the client without conservative local redaction, and uploaded documents are automatically purged via strict ephemeral storage lifecycles.

---

## 1. Privacy Gateway & Client-Side Minimization

Before any clinical text is analyzed or transmitted to Amazon Bedrock or Google Gemini, it passes through the **CareCue Privacy Gateway**:

```
[ Raw Patient Document ]
           │
           ▼
[ Layer 1: Regex & Heuristic Redaction Engine ]
  • Patient Names: [PERSON]
  • Dates of Birth: [DATE_OF_BIRTH]
  • Ordering Physicians: [PHYSICIAN]
  • Phone Numbers: [PHONE_NUMBER]
  • Email Addresses: [EMAIL_ADDRESS]
  • Medical Record Numbers (MRN): [PATIENT_ID]
  • Physical Street Addresses: [ADDRESS]
           │
           ▼
[ Minimized Clinical Document ]
(Transmitted to cloud models with zero identifying metadata)
```

### In-Memory Token Mapping
- Entity maps linking redacted tokens (e.g., `[PERSON]`) back to original values are retained solely within the active session memory on the client.
- Redacted fields are never persisted in cloud logs or DynamoDB.

---

## 2. Ephemeral Storage & Zero-Data-Accumulation Lifecycles

1. **Private S3 Document Storage**:
   - Uploaded PDF and image files are stored in an encrypted private S3 bucket (`carecue-documents-${AWS::AccountId}-${Environment}`).
   - S3 Block Public Access is strictly enabled (`BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets`).
   - Server-Side Encryption is enforced (`AES256`).
   - **7-Day Auto-Expiration Lifecycle**: An S3 lifecycle rule (`ExpireUserDocumentsAfter7Days`) automatically deletes documents after 7 days, preventing persistent data accumulation.

2. **DynamoDB Session Storage**:
   - Session metadata is stored in `carecue-sessions-${Environment}` using `PAY_PER_REQUEST` billing ($0 idle cost).
   - **30-Day TTL**: A Time-To-Live (TTL) attribute (`ttl`) ensures sessions expire and are purged by DynamoDB automatically.
   - **User-Initiated Deletion**: Patients can delete any session at any time from the History view.

---

## 3. Dual-AI Consensus & Zero Model Training

- **Amazon Bedrock**: Data submitted to Bedrock foundation models (Anthropic Claude 3.5 Sonnet / Claude 3 Haiku) is processed in VPC-scoped serverless environments. AWS does not use customer inputs or outputs to train foundation models.
- **Google Gemini Verification**: Only minimized excerpts (e.g., `"Hemoglobin: 10.8 g/dL (Ref: 12.0-15.5)"`) are transmitted to Gemini for independent mathematical verification. No full patient reports, names, or MRNs are ever transmitted.

---

## 4. Log Hygiene & Audit Trails

- Application logs in Amazon CloudWatch and local handlers log only operation status, token counts, and sanitized correlation IDs (`sessionId`, `correlationId`).
- Raw clinical document text, medical narratives, and patient notes are explicitly excluded from structured loggers.
- System error handlers return sanitized messages without leaking internal stack traces or database connection details.
