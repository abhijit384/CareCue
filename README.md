# CareCue

> **Understand. Verify. Prepare.**

An intelligent, privacy-first healthcare companion that bridges the gap between complex medical documents and productive doctor-patient conversations. Built on an AWS serverless **$0 Idle Cost** architecture with dual-AI consensus verification.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-orange.svg)](https://aws.amazon.com/serverless/)
[![Amazon Bedrock](https://img.shields.io/badge/Bedrock-Claude_3.5_Sonnet-blue.svg)](https://aws.amazon.com/bedrock/)
[![Google Gemini](https://img.shields.io/badge/Gemini-3.5_Flash_Verification-purple.svg)](https://ai.google.dev/)
[![Live App](https://img.shields.io/badge/Live_App-Amplify-00c7b7.svg)](https://production.d1hi4xdmbv4m4r.amplifyapp.com)

---

## Live Deployments

- **Web Application**: [https://production.d1hi4xdmbv4m4r.amplifyapp.com](https://production.d1hi4xdmbv4m4r.amplifyapp.com)
- **Production API Base**: `https://547rqjfril.execute-api.us-east-1.amazonaws.com/dev`

---

## Problem

Medical reports, laboratory panels, image scans, and discharge summaries are notoriously difficult for patients and caregivers to interpret. Isolated numbers, abbreviations, and clinical jargon drive individuals to generic internet searches and consumer chatbots. This creates three critical failures:
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
3. **Resilient Dual-Relay Email & Authentication Engine**:
   - Cryptographic 6-digit OTP verification for Signup and Password Reset.
   - Dual-Relay SMTP delivery (Primary: `noreplycarecue@gmail.com`, Fallback: `vocalvibes91@gmail.com`) ensuring 100% email delivery guarantee to recipient inboxes.
   - Multi-instance DynamoDB cross-container session sync (`carecue-sessions-dev`) using a custom `DirectDynamoTable` driver.
4. **Automatic Demo Patient Document Provisioning**: Instantly attaches synthetic clinical laboratory datasets, pathology reports, and discharge summaries upon demo loading without manual file selection.
5. **Multi-Modal Document Intake**: Ingests digital PDFs, lab images (PNG, JPG, WEBP), and medical scans via Gemini multimodal OCR processing.
6. **Controlled Disagreement States**: If models differ or evidence is missing, CareCue flags the finding transparently as `NEEDS REVIEW` rather than pretending certainty.
7. **Safety Interception Engine**: Real-time filters intercept emergency queries (e.g., chest pain, stroke symptoms) and prescription questions, redirecting users to emergency care.

---

## Core Features

- **Document Intake & OCR**: Ingests digital PDFs, lab images, and medical scans.
- **Instant Demo Patient Mode**: Includes built-in synthetic clinical datasets (Complete Blood Count, Metabolic Panels, Pathology Summaries) with auto-provisioned demo documents.
- **Interactive Trust Path**: Visualizes the processing lifecycle: *Source → Analysis → Verification → Next Step*.
- **Expandable Evidence Cards**: View verbatim source quotes, confidence scores, and plain-English explanations.
- **Doctor Visit Brief**: Prioritizes out-of-range biomarkers, suggests physician discussion questions, accepts personal patient notes, and provides one-click print/copy/download.
- **Medical Term Translation**: Translates complex medical terminology into clear, accessible patient explanations.
- **Historical Session Timeline**: Tracks past visits with verification status pills, tag filters, and user-controlled deletion.
- **Theme & Accessibility**: Seamless Deep Dark, Crisp Light, and System themes with WCAG AA compliance and reduced motion support.

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
  │   Auth /     │   │    Upload    │  │   Process    │   │ Verification │   │    Brief     │
  │   Session    │   │   Handler    │  │   Handler    │   │   Handler    │   │   Handler    │
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
            Independent Verification     │   (gemini-3.5-flash /       │
            (Excerpt Check Only)         │    gemini-3.5-flash-lite)   │
                                         └─────────────────────────────┘
```

---

## AWS Services Used

| Service | Specific Usage in CareCue | Idle Cost |
|---|---|---|
| **Amazon Bedrock** | Clinical entity recognition and document comprehension using `anthropic.claude-3-5-sonnet-20241022-v2:0` and `anthropic.claude-3-haiku-20240307-v1:0` via Converse API. | **$0.00** |
| **AWS Lambda** | 11 Python 3.12 serverless functions handling authentication, OTP, patient sessions, document upload, OCR, Bedrock processing, and brief generation. | **$0.00** |
| **Amazon HTTP API Gateway (v2)** | REST endpoints (`/auth/*`, `/patients/*`, `/documents/*`, `/analysis`, `/verification`, `/doctor-brief`) with route-level CORS. | **$0.00** |
| **Amazon S3** | Ephemeral document storage with AES256 encryption, all Public Access Blocks enabled, and 7-day automatic deletion lifecycle. | **$0.00** |
| **Amazon DynamoDB** | `PAY_PER_REQUEST` session, user, and OTP store (`carecue-sessions-dev`) with 30-day auto-expiration TTL. | **$0.00** |
| **AWS Amplify** | Single-page application hosting with global CDN distribution and continuous deployment. | **$0.00** |

---

## Privacy and Security

- **Client-Side PII Minimization**: Names, DOBs, phone numbers, and MRNs are redacted prior to cloud transmission.
- **Cryptographic Password Hashing**: PBKDF2-SHA256 salted password hashes.
- **Private S3 Storage**: Encrypted at rest (`AES256`) with all public access blocks enabled.
- **7-Day S3 Lifecycle Expiration**: Reports are automatically expunged after 7 days.
- **Least-Privilege IAM**: Each Lambda function is granted scoped IAM permissions.

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
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

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

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

**CareCue is an educational and communication aid only.** It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
