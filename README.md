# CareCue

> **Understand. Verify. Prepare.**

An intelligent, privacy-first healthcare companion that bridges the gap between complex medical documents and productive doctor-patient conversations. Built on an AWS serverless **$0 Idle Cost** architecture with dual-AI consensus verification.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-orange.svg)](https://aws.amazon.com/serverless/)
[![Amazon Bedrock](https://img.shields.io/badge/Bedrock-Claude_3.5_Sonnet-blue.svg)](https://aws.amazon.com/bedrock/)
[![Google Gemini](https://img.shields.io/badge/Gemini-3.5_Flash_Verification-purple.svg)](https://ai.google.dev/)
[![Tests: 35 Passed](https://img.shields.io/badge/Tests-35%20Passed-brightgreen.svg)](backend/tests/)

---

## Problem

Medical reports, laboratory panels, and discharge summaries are notoriously difficult for patients and caregivers to interpret. Isolated numbers, abbreviations, and clinical jargon drive individuals to generic internet searches and consumer chatbots. This creates three critical failures:
1. **Health Anxiety & Hallucinations**: Generic chatbots often overstate diagnostic certainty or hallucinate serious illnesses without reference ranges.
2. **Privacy Violations**: Anxious patients paste unredacted records containing names, dates of birth, and medical record numbers (MRNs) into public AI services.
3. **Wasted Clinical Encounters**: In brief 15-minute consultations, patients struggle to remember or articulate the most important questions regarding out-of-range findings.

---

## Solution

**CareCue** transforms confusing medical documents into clear, verified, evidence-linked insights—without ever compromising patient privacy or attempting to replace the physician.

- **Minimizes First**: Strips all identifying PII before any data reaches cloud models.
- **Analyzes with Amazon Bedrock**: Extracts structured findings, reference intervals, and plain-language summaries grounded in document text.
- **Cross-Checks with Google Gemini**: Independently verifies that reported values, units, and ranges match original excerpts.
- **Links Every Claim to Evidence**: Displays verbatim source quotations and page references for every extracted insight.
- **Prepares the Doctor Visit Brief**: Compiles prioritized talking points and patient questions into a clean, printable one-page appointment guide.

---

## Key Innovation

1. **Client-Side Privacy Gateway**: Local regex and heuristic redaction masks names, DOBs, phone numbers, and MRNs prior to cloud transmission.
2. **Dual-AI Verification Engine (Bedrock + Gemini)**: We do not trust a single model's output blindly. Bedrock performs primary comprehension; Gemini independently verifies it against source quotes.
3. **Controlled Disagreement States**: If models differ or evidence is missing, CareCue flags the finding transparently as `NEEDS REVIEW` rather than pretending certainty.
4. **Safety Interception Engine**: Real-time filters intercept emergency queries (e.g., chest pain, stroke symptoms) and prescription questions, redirecting users to emergency care.
5. **Action-Oriented Output**: Instead of speculative diagnoses, CareCue produces a structured **Doctor Visit Brief** to make clinical conversations more collaborative.

---

## Core Features

- **Document Intake & OCR**: Ingests laboratory reports, pathology results, and discharge summaries.
- **Interactive Trust Path**: Visualizes the processing lifecycle: *Source → Analysis → Verification → Next Step*.
- **Expandable Evidence Cards**: View verbatim source quotes, confidence scores, and plain-English explanations.
- **Doctor Visit Brief**: Prioritizes out-of-range biomarkers, suggests physician discussion questions, accepts personal patient notes, and provides one-click print/copy/download.
- **Historical Session Timeline**: Tracks past visits with verification status pills, tag filters, and user-controlled deletion.
- **Theme & Accessibility**: Seamless Deep Dark, Crisp Light, and System themes with WCAG AA compliance and reduced motion support.
- **Demo Mode**: Includes built-in synthetic clinical datasets (Complete Blood Count and Metabolic Panels) for deterministic, offline testing.

---

## User Flow

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│ 1. SOURCE    │ ──> │ 2. ANALYSIS      │ ──> │ 3. VERIFICATION        │ ──> │ 4. NEXT STEP        │
│ Upload Lab   │     │ Bedrock Claude   │     │ Gemini Cross-Check     │     │ Doctor Visit Brief  │
│ Report (PDF) │     │ Structured Claims│     │ Verbatim Match Check   │     │ Questions for Doctor│
└──────────────┘     └──────────────────┘     └────────────────────────┘     └─────────────────────┘
       │                                                   ▲
       ▼                                                   │
┌──────────────────────┐                                   │
│ Privacy Gateway      │ ──────────────────────────────────┘
│ Masks Name, DOB, MRN │
└──────────────────────┘
```

---

## Architecture

```
                                      CARECUE ARCHITECTURE
                                    ($0 Idle Cost Serverless)

  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    CLIENT BROWSER                                      │
  │  React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion (Dark/Light/System)       │
  │  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────┐  │
  │  │   Hero 3D Parallax      │   │     Privacy Gateway      │   │  Doctor Visit Brief │  │
  │  └─────────────────────────┘   └──────────────────────────┘   └─────────────────────┘  │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ HTTPS / JSON
                                              ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                            AMAZON HTTP API GATEWAY (v2)                                │
  │                              CORS • Throttling • Routes                                │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
         ┌──────────────────┬─────────────────┼──────────────────┬──────────────────┐
         │                  │                 │                  │                  │
         ▼                  ▼                 ▼                  ▼                  ▼
  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   Session    │   │    Upload    │  │   Process    │   │ Verification │   │    Brief     │
  │   Handler    │   │   Handler    │  │   Handler    │   │   Handler    │   │   Handler    │
  │ (Lambda Py)  │   │ (Lambda Py)  │  │ (Lambda Py)  │   │ (Lambda Py)  │   │ (Lambda Py)  │
  └──────┬───────┘   └──────┬───────┘  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
         │                  │                 │                  │                  │
         │                  ▼                 │                  │                  │
         │           ┌──────────────┐         │                  │                  │
         │           │  Amazon S3   │ <───────┘                  │                  │
         │           │ (7-Day TTL)  │                            │                  │
         │           └──────────────┘                            │                  │
         │                                                       │                  │
         ▼                                                       │                  │
  ┌──────────────┐                                               │                  │
  │Amazon Dynamo │ <─────────────────────────────────────────────┴──────────────────┘
  │  (On-Demand) │
  └──────────────┘
         ▲
         │                               ┌─────────────────────────────┐
         ├─────────────────────────────> │   AMAZON BEDROCK            │
         │  Primary Analysis             │   (Claude 3.5 Sonnet /      │
         │                               │    Claude 3 Haiku)          │
         │                               └─────────────────────────────┘
         │
         │                               ┌─────────────────────────────┐
         └─────────────────────────────> │   GOOGLE GEMINI             │
            Independent Verification     │   (gemini-3.5-flash)        │
            (Excerpt Check Only)         └─────────────────────────────┘
```

---

## AWS Services Used

| Service | Specific Usage in CareCue | Idle Cost |
|---|---|---|
| **Amazon Bedrock** | Clinical entity recognition and document comprehension using `anthropic.claude-3-5-sonnet-20241022-v2:0` and `anthropic.claude-3-haiku-20240307-v1:0` via Converse API. | **$0.00** |
| **AWS Lambda** | 5 Python 3.12 functions for session management, pre-signed upload generation, PDF extraction, Bedrock processing, and brief generation. | **$0.00** |
| **Amazon HTTP API Gateway (v2)** | REST endpoints (`/sessions`, `/documents/upload-url`, `/analysis`, `/verification`, `/doctor-brief`, `/guidance`) with route-level CORS. | **$0.00** |
| **Amazon S3** | Ephemeral document storage with AES256 encryption, all Public Access Blocks enabled, and 7-day automatic deletion lifecycle. | **$0.00** |
| **Amazon DynamoDB** | `PAY_PER_REQUEST` session and metadata store with 30-day auto-expiration TTL. | **$0.00** |
| **AWS Secrets Manager** | Secure server-side store for external API credentials with in-memory caching. | ~$0.40/mo |

---

## AI Architecture

CareCue implements a **Dual-AI Verification Architecture**:
1. **Primary Analysis (Amazon Bedrock)**: Extracts clinical entities, numerical values, units, reference intervals, and clinical summaries.
2. **Independent Verification (Google Gemini)**: Cross-checks extracted findings against source quotes for factual alignment, numerical consistency, and avoidance of overstatement.
3. **Consensus Engine**:
   - **Consistent**: Both models agree and claim is grounded in verbatim text.
   - **Needs Review**: Numerical mismatch, missing reference range, or ungrounded claim.
   - **Safety Redirect**: User asked for diagnosis or medication prescriptions.

> **Important**: Model agreement is **not medical truth**. CareCue highlights verified evidence to prepare patients for informed consultations with licensed physicians.

---

## Privacy and Security

- **Client-Side PII Minimization**: Names, DOBs, phone numbers, and MRNs are redacted prior to cloud transmission.
- **Private S3 Storage**: Encrypted at rest (`AES256`) with all four public access blocks enabled.
- **7-Day S3 Lifecycle Expiration**: Reports are automatically expunged after 7 days.
- **Least-Privilege IAM**: Each Lambda function is granted only scoped permissions (e.g., S3 read-only, DynamoDB single-table CRUD).
- **Zero Raw PII in Logs**: CloudWatch logs omit patient names, unredacted reports, and credentials.
- **Prompt-Injection Defense**: Uploaded text is treated as untrusted data using multi-character delimiter fences and defensive prompt boundaries.

---

## Demo Mode

CareCue includes full offline **Demo Mode** capabilities:
- Uses synthetic, realistic Complete Blood Count (CBC) and Metabolic Panel datasets.
- Simulates realistic multi-agent processing latencies (extraction, entity recognition, consensus cross-checking).
- Enables judges to test every user flow—including controlled model disagreement (`NEEDS_REVIEW`)—without needing active AWS credentials.

---

## Setup & Running Locally

### Prerequisites
- Node.js 20+
- Python 3.12+
- Git

### 1. Clone & Configure
```bash
git clone https://github.com/<your-username>/CareCue.git
cd CareCue
```

### 2. Backend Virtual Environment
```bash
python -m venv D:\venvs\carecue
D:\venvs\carecue\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Run Backend Tests
```bash
pytest backend/tests/ -v
```

### 4. Frontend Setup & Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## AWS Deployment

### Prerequisites
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials (`aws configure`)
- [AWS SAM CLI](https://aws.amazon.com/serverless/sam/) installed

### 1. Validate SAM Template
```bash
cd infrastructure
sam validate
```

### 2. Build & Deploy
```bash
sam build
sam deploy --guided
```
Follow the prompts to specify the stack name (e.g., `carecue-backend-dev`) and region (e.g., `us-east-1`).

---

## Environment Variables

### Frontend (`frontend/.env`)
```env
# API Gateway Base URL (leave empty to use local Demo Mode)
VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/dev

# Toggle live AWS integration vs synthetic demo fixtures
VITE_ENABLE_LIVE_AWS=false

# Deployment environment label
VITE_APP_ENV=development
```

### Backend (Configured via SAM Template Parameters)
- `BEDROCK_MODEL_ID`: Amazon Bedrock model ID (default: `anthropic.claude-3-5-sonnet-20241022-v2:0`)
- `SESSIONS_TABLE_NAME`: DynamoDB table name
- `DOCUMENTS_BUCKET_NAME`: S3 document bucket name
- `GEMINI_API_KEY`: Stored securely in AWS Secrets Manager (`carecue/gemini-api-key`)

---

## Limitations

- **Educational Prototype**: CareCue is an educational communication aid and is not an FDA-cleared diagnostic device.
- **Supported Formats**: Best suited for digital text and clean OCR PDFs. Complex handwriting or low-resolution scans require manual verification.
- **Complex Edge Cases**: Genomic sequencing, complex oncological staging, and rare histopathology require specialized specialist interpretation.

---

## AI Development Tools

CareCue was built using:
- **Google Antigravity IDE**: Autonomous agentic coding environment for architecture, TypeScript typing, UI design tokens, AWS SAM templates, and end-to-end testing.
- **Amazon Bedrock (Claude 3.5 Sonnet / Haiku)**: Foundation model comprehension engine.
- **Google Gemini (gemini-3.5-flash)**: Independent verification cross-checker.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

**CareCue is an educational and communication aid only.** It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay seeking it because of something you read on CareCue.
