# CareCue — Product Specification

> **Understand. Verify. Prepare.**

---

## 1. Product Vision

CareCue is a **privacy-first healthcare information companion** that helps people understand medical documents, cross-check AI-generated interpretations using two independent AI systems, see the evidence behind every insight, and produce a structured preparation document for their next doctor visit.

CareCue is **NOT** a diagnostic tool, a prescription system, or a replacement for healthcare professionals. It is a *comprehension and preparation layer* that sits between raw medical information and an informed conversation with a doctor.

---

## 2. Core Differentiation (USP)

| # | Differentiator | Description |
|---|----------------|-------------|
| 1 | **Privacy Gateway** | A visible, user-facing pipeline that minimizes unnecessary PII before any document reaches an external verification model. The user *sees* the transformation happen. |
| 2 | **Dual-AI Cross-Check** | Amazon Bedrock performs primary analysis. Google Gemini independently verifies key claims. The system surfaces agreement/disagreement — it never claims that agreement equals medical truth. |
| 3 | **Evidence-Linked Insights** | Every important insight links back to the specific source text, value, or range that supports it. Nothing is "just said" — everything is traceable. |
| 4 | **Doctor Visit Brief** | User-provided information is transformed into a clean, structured preparation document designed for a healthcare professional's review. |
| 5 | **Safety Engine** | Proactive detection of unsafe requests (diagnosis-seeking, prescription-seeking, emergency symptoms) with clear, compassionate redirects. |
| 6 | **CareCue Trust Path** | A signature interaction pattern: **SOURCE → ANALYSIS → VERIFICATION → NEXT STEP**. Every insight flows through this visible pipeline. |

---

## 3. What CareCue Is / Is Not

### ✅ CareCue IS

- A comprehension tool for medical documents
- A preparation assistant for doctor visits
- A cross-referencing system for AI-generated health interpretations
- A privacy-respecting document processor
- An evidence-surfacing interface

### ❌ CareCue is NOT

- A diagnostic system
- A prescription or treatment recommender
- A replacement for medical professionals
- A medical records system (EHR/EMR)
- A HIPAA-compliant clinical tool (we do not claim compliance)
- A guaranteed anonymization system (we minimize, not guarantee)

---

## 4. Target Users

### Primary Persona: "Informed Patient"

- **Age:** 28–65
- **Context:** Has received a lab report, imaging report, or discharge summary and wants to understand it before or after a doctor visit
- **Behavior:** Searches health terms online, wants structured answers, often anxious about results
- **Need:** Clarity, not diagnosis. Preparation, not prescription.

### Secondary Persona: "Caregiver"

- **Age:** 35–70
- **Context:** Managing health information for a parent, child, or dependent
- **Behavior:** Collects documents from multiple providers, needs organized summaries
- **Need:** Consolidation and structured preparation for appointments

---

## 5. Core Features (MVP Scope)

### 5.1 Care Sessions

A "Care Session" is the primary unit of interaction. Each session has a clear purpose:

| Session Type | Input | Output |
|-------------|-------|--------|
| **Understand a Report** | PDF/image upload or text paste of a medical document | Evidence-linked insights with verification status |
| **Care Guidance** | Free-text health question or concern | Structured, evidence-aware informational response with safety guardrails |
| **Prepare for Doctor Visit** | One or more documents + user notes | Formatted Doctor Visit Brief |

### 5.2 Privacy Gateway

- Scans uploaded/entered content for identifiable information
- Shows the user a before/after view of what will be sent to the verification model
- Strips names, dates of birth, addresses, phone numbers, and other direct identifiers before Gemini verification
- Operates server-side via Lambda
- Does NOT claim complete anonymization — uses language like "minimized" and "reduced"

### 5.3 Document Processing

- PDF text extraction (text-based PDFs)
- Image OCR for photographed documents (stretch goal)
- Structured data extraction: values, ranges, dates, findings
- Section-aware parsing (e.g., "CBC Panel", "Lipid Panel", "Impression")

### 5.4 Amazon Bedrock Analysis

- Primary analysis engine
- Extracts key findings
- Identifies values outside reference ranges
- Generates plain-language explanations
- Produces structured JSON output for the UI
- Applies safety guardrails (no diagnosis, no prescription)

### 5.5 Gemini Cross-Check

- Receives a **privacy-minimized** structured payload (not the raw document)
- Independently evaluates key claims from the Bedrock analysis
- Returns agreement/disagreement/nuance for each claim
- Server-side only — API key never exposed to browser

### 5.6 Verification Status

Three states displayed per insight:

| Status | Meaning | Visual |
|--------|---------|--------|
| **Consistent** | Both AI systems produced compatible interpretations | Teal indicator |
| **Needs Review** | The systems produced different or nuanced interpretations | Amber indicator |
| **Safety Redirect** | The content triggers safety guardrails | Muted red indicator + guidance |

### 5.7 Evidence Cards

Each insight rendered as a card showing:

- The claim in plain language
- The source value/text from the original document
- The reference range or context (if applicable)
- The verification status
- A "View Source" action linking back to the relevant portion of the original

### 5.8 Doctor Visit Brief

A single-page, printable/downloadable document containing:

- Session date
- Document summary (type, key sections)
- Key findings (with reference ranges)
- Items flagged for discussion
- User's own notes/questions
- Clear disclaimer that this is an AI-generated preparation aid

### 5.9 Session History

- List of past care sessions
- Session type, date, document name
- Quick access to results and briefs
- Session deletion with clear confirmation

### 5.10 Privacy Center

- View what data is stored
- Understand what is sent to each AI system
- Delete individual sessions or all data
- Read the privacy approach (not a legal "privacy policy" — a human-readable explanation)

---

## 6. Safety Architecture

### Hard Boundaries

| Trigger | Response |
|---------|----------|
| User asks for a diagnosis | Compassionate redirect: "CareCue helps you understand information, but cannot diagnose conditions. Please consult a healthcare professional." |
| User asks for medication recommendations | Redirect: "CareCue cannot recommend medications. Your doctor can discuss treatment options." |
| Content suggests emergency symptoms | Prominent redirect to emergency services with local emergency number guidance |
| User uploads content about minors | Extra caution layer — no behavioral health interpretation |

### Soft Boundaries

- All AI-generated text includes contextual disclaimers
- Doctor Visit Brief includes a visible, non-removable disclaimer
- Results page includes a persistent "This is not medical advice" footer
- Language uses "may indicate", "could suggest", "your doctor can help clarify" — never definitive clinical language

---

## 7. Success Metrics (Hackathon Context)

| Metric | Target |
|--------|--------|
| End-to-end flow completion | Upload → Privacy Gateway → Analysis → Verification → Brief in < 45 seconds |
| UI quality | Best UI category competitive — premium, calm, accessible |
| Demo reliability | 3-minute demo completes without failure |
| Real AWS usage | Bedrock, Lambda, API Gateway, S3, DynamoDB all in production use |
| Dual-AI verification | At least 3 insights per report show verification status |
| Safety | Zero instances of diagnosis/prescription language in any output |

---

## 8. Out of Scope (Hackathon MVP)

- User authentication (Cognito integration is stretch)
- Multi-language support
- Real-time collaboration
- Mobile native apps
- Integration with EHR/EMR systems
- Image/X-ray analysis
- Audio/video input
- Export to third-party health platforms
- HIPAA compliance certification
- Comprehensive anonymization guarantees

---

## 9. Naming & Language

| Term | Usage |
|------|-------|
| **Care Session** | A single interaction unit (not "chat", not "conversation") |
| **Trust Path** | The SOURCE → ANALYSIS → VERIFICATION → NEXT STEP flow |
| **Privacy Gateway** | The PII minimization step (not "anonymizer") |
| **Evidence Card** | An insight with its source linked (not "result card") |
| **Doctor Visit Brief** | The preparation document (not "report", not "summary") |
| **Verification Status** | Consistent / Needs Review / Safety Redirect |
| **Care Guidance** | Informational health Q&A (not "diagnosis", not "advice") |

---

## 10. Regulatory & Ethical Positioning

- CareCue is an **informational tool**, not a medical device
- We do not claim FDA clearance, HIPAA compliance, or CE marking
- We do not claim that AI cross-checking validates medical accuracy
- We explicitly state: "Two AI systems agreeing does not constitute medical proof"
- We use language like "privacy-minimized" rather than "anonymized"
- All outputs carry disclaimers
- The product actively guides users toward professional healthcare consultation
