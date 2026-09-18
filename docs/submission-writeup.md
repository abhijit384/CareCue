# CareCue — Hackathon Submission Writeup

### PROJECT
**CareCue**

### TAGLINE
**Understand. Verify. Prepare.**

---

### PROBLEM
Medical reports and laboratory test results are notoriously difficult for patients and caregivers to interpret. Confronted with medical jargon, abbreviations, and isolated numbers, individuals frequently turn to search engines or generic consumer AI chatbots. This creates two acute risks:
1. **Health Anxiety & Alarming Hallucinations**: Generic chatbots frequently overstate diagnostic certainty, hallucinate phantom conditions, or fail to mention reference ranges, driving panic.
2. **Privacy Exposure**: Well-intentioned users paste unredacted, deeply personal lab reports containing names, dates of birth, MRNs, and addresses into public cloud models.
3. **Unproductive Clinical Encounters**: Patients arrive at appointments either terrified by internet misinformation or unable to articulate actionable questions for their physician in the brief 15-minute exam window.

---

### SOLUTION
**CareCue** is an intelligent, privacy-first healthcare companion that bridges the gap between raw clinical documents and productive doctor-patient conversations. CareCue operates on a simple, transparent workflow:
1. **Intake & Local PII Minimization**: Strips personal identifiers before any data touches the cloud.
2. **Clinical Document Comprehension via Amazon Bedrock**: Extracts structured findings, reference intervals, and plain-language explanations grounded in the text.
3. **Independent Dual-AI Cross-Verification via Google Gemini**: Independently verifies extracted numbers, units, and quotes against original source excerpts to check for hallucinations.
4. **Evidence-Linked Insights**: Every claim in the interface is linked to a verbatim quotation and document page reference.
5. **Doctor Visit Brief**: Automatically compiles out-of-range biomarkers and recommended talking points into an exportable, one-page summary for the patient's next appointment.

---

### WHY IT IS DIFFERENT
Unlike generic AI health chatbots, CareCue introduces five distinct architectural safeguards:
- **Client-Side Privacy Gateway**: Conservative regex and pattern matching mask names, DOBs, phone numbers, and MRNs prior to cloud transmission.
- **Dual-AI Consensus Engine (Bedrock + Gemini)**: We do not treat a single model's output as infallible. Amazon Bedrock extracts findings; Google Gemini independently verifies them. Consensus is computed explicitly, with disagreements flagged transparently as *Needs Review*.
- **Strict Evidence Grounding**: An internal token n-gram and quote verification algorithm ensures no claim is presented to the user unless supported by verbatim text in the source report.
- **Safety Interception Engine & Output Filter**: Intercepts emergency queries (e.g. chest pain, stroke symptoms), prescription questions, and diagnostic certainty claims, enforcing statutory disclaimers and emergency redirects.
- **Action-Oriented Doctor Visit Brief**: Rather than replacing healthcare professionals, CareCue's primary objective is to prepare patients for better, more collaborative conversations with their doctors.

---

### HOW AWS IS USED
CareCue is built on a serverless, **$0 Idle Cost** AWS architecture:
- **Amazon Bedrock**: Powers primary clinical document comprehension using the Bedrock Converse API with Claude 3.5 Sonnet and Claude 3 Haiku, constrained to 1,200 max tokens and 0.1 temperature.
- **AWS Lambda (Python 3.12)**: Serverless compute handlers for session management, pre-signed upload generation, PDF extraction (`pypdf`), PII redaction, Bedrock analysis, and brief compilation.
- **Amazon HTTP API Gateway (v2)**: Low-latency, cost-efficient REST API with CORS validation and route-level throttling.
- **Amazon S3**: Private encrypted bucket with Block Public Access and an automatic 7-day lifecycle expiration rule (`ExpireUserDocumentsAfter7Days`) that purges uploaded reports automatically.
- **Amazon DynamoDB**: On-demand (`PAY_PER_REQUEST`) session store with automatic 30-day Time-To-Live (TTL) expiration.
- **AWS Secrets Manager**: Secure server-side credential store for API keys with in-memory caching.

---

### AI ARCHITECTURE
- **Primary Comprehension (Amazon Bedrock)**: Extracts clinical entities, numerical values, units, reference intervals, and clinical summaries into strict JSON schemas.
- **Independent Cross-Check (Google Gemini via Google GenAI SDK)**: Receives only the isolated excerpt and claimed value (zero patient metadata), verifying verbatim agreement and checking for overstatement.
- **Crucial Principle**: *Model agreement is not medical truth.* When Bedrock and Gemini agree, the finding is labeled **Consistent**. When they diverge or evidence is missing, the finding is labeled **Needs Review: Systems could not be confidently aligned with the supplied evidence**.

---

### SECURITY & PRIVACY
- **S3 Bucket Encryption**: `AES256` server-side encryption with all four Public Access Blocks enabled.
- **Zero Raw PII in Cloud Logs**: CloudWatch logs record only sanitized session IDs and token metrics; raw health narratives and patient identifiers are excluded.
- **Prompt-Injection Defense**: Uploaded documents are encapsulated as untrusted data using multi-character delimiter fences and strict system instruction boundaries.
- **Server-Side Credentials**: No API keys or AWS credentials exist in client-side code or git history.

---

### USER IMPACT
CareCue shifts the patient posture from passive confusion or panic to organized, informed empowerment. In testing with complex synthetic metabolic and complete blood count panels, CareCue reduces the time required to understand out-of-range biomarkers from hours of stressful online searches to under 60 seconds of verified clarity, equipping patients with crisp, actionable questions for their doctor.

---

### WHAT WE LEARNED
1. **Dual-Model Verification Eliminates Silent Hallucinations**: Cross-checking with two distinct foundation model families (Anthropic on Bedrock + Google Gemini) caught subtle numerical range mismatches that single-model prompting missed.
2. **Serverless Idle Cost Discipline**: Designing with DynamoDB `PAY_PER_REQUEST` and S3 7-day lifecycle rules proves that production-grade health companions can run at essentially $0 when idle.
3. **Restrained UI Builds Trust**: Health interfaces require calm, high-contrast, distraction-free visual systems. Subtle 3D depth and clear verification badges communicate reliability better than flashy animations.

---

### AI TOOLS USED
- **Antigravity IDE**: Autonomous agentic pair programming environment for scaffolding, architectural design, TypeScript safety, AWS SAM templates, and end-to-end testing.
- **Amazon Bedrock (Claude 3.5 Sonnet / Haiku)**: Foundation model runtime for clinical document parsing.
- **Google Gemini (gemini-2.5-flash)**: Independent verification cross-checker.

---

### LIMITATIONS
- **Prototype Status**: CareCue is an educational and preparation tool, not an approved medical device or diagnostic instrument.
- **File Support**: Currently optimized for digital and OCR-extracted text PDFs and images.
- **Clinical Nuance**: Edge-case anatomical pathology reports or complex genomic sequencing results require specialized clinical review beyond general lab panels.

---

### FUTURE DIRECTIONS
- Integration with FHIR/HL7 standards for direct export to patient portals (Epic MyChart, Cerner).
- Multi-lingual clinical translation for non-English speaking patients.
- Longitudinal biomarker trend analysis across multi-year lab histories.
