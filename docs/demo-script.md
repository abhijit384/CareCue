# CareCue — 3-Minute Demo Video Script & Walkthrough

**Target Duration**: Exactly 3 Minutes (180 Seconds)  
**Resolution**: 1080p (1920 × 1080), 60fps  
**Audio**: Clear voiceover narration with subtle ambient sound  
**Audience**: AWS Hackathon Judges, Clinicians, Healthcare Consumers  

---

## Storyboard & Timing Breakdown

### 0:00 – 0:20 | The Problem
- **Visual**: Camera pans over a confusing, multi-page laboratory report filled with complex abbreviations (WBC, MCV, AST, Ferritin) and isolated reference numbers. A prompt on a generic search engine shows contradictory, alarming search results ("Do I have cancer?").
- **Voiceover**:
  > *"Medical reports contain information that can be difficult to understand, while AI answers online can be difficult to verify. Patients leave appointments confused, search engines provide alarming worst-case scenarios, and commercial chatbots hallucinate without citing evidence. There is a critical gap between raw clinical data and patient understanding."*

---

### 0:20 – 0:40 | Introducing CareCue
- **Visual**: Clean transition to the CareCue Landing Page (`http://localhost:5173/`). The 3D interactive hero tilts gently under cursor movement, revealing the core tagline: *"Understand. Verify. Prepare."* We see the multi-agent Trust Path: Source → Analysis → Verification → Next Step.
- **Voiceover**:
  > *"Meet CareCue — an intelligent, privacy-first healthcare companion designed to bridge that gap. CareCue helps individuals understand their lab results, verifies clinical findings across dual AI models, links every insight directly to source evidence, and prepares actionable discussion points for their next doctor visit."*

---

### 0:40 – 1:05 | Intake & The Privacy Gateway
- **Visual**: Click **"Explore Demo"** or **"Start Care Session"**. We see the document intake interface. A synthetic Complete Blood Count (CBC) report (`Sample_Blood_Panel.pdf`) is selected. Instantly, the **Privacy Gateway** appears, displaying real-time redaction preview: patient name `Jane Doe` is masked to `[PERSON]`, DOB is masked to `[DATE_OF_BIRTH]`, and Physician ID is masked.
- **Voiceover**:
  > *"Before any medical text touches the cloud, CareCue's client-side Privacy Gateway actively strips all personal identifiers — names, dates of birth, phone numbers, and record numbers. We believe privacy isn't an afterthought; it's a prerequisite for trust. The minimized document is securely encrypted and uploaded to an ephemeral, private Amazon S3 bucket with an automatic 7-day expiration lifecycle."*

---

### 1:05 – 1:35 | Amazon Bedrock Clinical Analysis
- **Visual**: The UI transitions to the active **Trust Path**. We see the staged execution timeline: Document Text Extraction (`pypdf`), followed by Clinical Entity Recognition powered by **Amazon Bedrock (Claude 3.5 Sonnet)**. Findings appear progressively with confidence metrics.
- **Voiceover**:
  > *"Processing begins in AWS Lambda. Amazon Bedrock analyzes the minimized document through the Bedrock Converse API, parsing structured biomarkers, reference intervals, and clinical notes with strict 1,200 token bounds for cost efficiency. Rather than producing uncontrolled conversational text, Bedrock outputs structured clinical claims mapped directly to document offsets."*

---

### 1:35 – 1:55 | Google Gemini Independent Verification
- **Visual**: The screen displays the **Dual-AI Verification Panel**. We see the Bedrock interpretation on the left and the independent **Google Gemini** cross-check on the right. An animated consensus badge confirms: *"CONSISTENT: Verified Consensus"*. Next, a simulated biomarker mismatch is demonstrated where values don't match, cleanly triggering the amber badge: *"NEEDS REVIEW: The systems could not be confidently aligned with the supplied evidence."*
- **Voiceover**:
  > *"Here is CareCue's key innovation: model agreement is not assumed. CareCue submits cited excerpts to Google Gemini for independent cross-verification. Gemini checks numerical accuracy, reference ranges, and diagnostic overstatement without seeing patient identities. If both models agree with the text, the insight is marked 'Verified Consistent'. If they differ, CareCue transparently flags the claim as 'Needs Review' rather than pretending certainty."*

---

### 1:55 – 2:20 | Evidence-Linked Insights
- **Visual**: User scrolls through the extracted **Evidence Cards**. The card for *Hemoglobin (10.8 g/dL)* is clicked, smoothly expanding to show the verbatim source quotation, page location, confidence score (94%), and clinical significance in plain English.
- **Voiceover**:
  > *"Every insight in CareCue is permanently grounded in source evidence. Clicking an evidence card reveals the exact verbatim quote from the lab report, the page number, and plain-language explanations. If an acute emergency or medication question is detected, our Safety Interception Engine immediately redirects the user to emergency care, upholding our strict non-diagnostic boundary."*

---

### 2:20 – 2:40 | The Doctor Visit Brief
- **Visual**: User clicks **"Generate Doctor Brief"**. The screen renders the formatted **Patient Appointment Brief**. Out-of-range biomarkers are prioritized. Suggested talking points for the doctor appear (e.g., *"Ask about iron saturation tests and dietary iron"*). The user types a personal question in the notes box, then clicks **"Print Brief"** and **"Copy Brief"**, showing the clean clipboard confirmation toast.
- **Voiceover**:
  > *"The culmination of CareCue is the Doctor Visit Brief. Instead of giving patients anxiety, CareCue empowers them with a clear, one-page summary highlighting priority findings and personalized questions to ask their physician. Patients can add personal symptom notes, export to text, or print a copy to take directly into the exam room."*

---

### 2:40 – 2:52 | AWS Architecture & Cost Safety
- **Visual**: Clean, high-resolution visual of the **AWS Serverless Architecture Diagram**:
  `CareCue Frontend → HTTP API Gateway → AWS Lambda → (Amazon S3 [7-day TTL] + Amazon DynamoDB [On-Demand] + Amazon Bedrock [Claude 3.5 Sonnet]) + Google Gemini → Output Safety Filter`.
- **Voiceover**:
  > *"Under the hood, CareCue is built on AWS Serverless: HTTP API Gateway, Python Lambda functions, encrypted S3 with auto-expiration, and DynamoDB with on-demand billing. When nobody is using CareCue, it costs exactly $0 in idle compute. It is scalable, HIPAA-conscious, and cost-safe."*

---

### 2:52 – 3:00 | Conclusion & Impact
- **Visual**: Final return to the CareCue interface showing Theme Toggle seamlessly switching between Deep Dark, Crisp Light, and System modes. Final slide displaying the GitHub repository link and hackathon credits.
- **Voiceover**:
  > *"CareCue doesn't replace a healthcare professional. It helps people understand the information they have, verify what supports it, and prepare for a better conversation with their doctor. CareCue: Understand, Verify, Prepare."*

---

## Technical Recording Checklist

- [x] Resolution: 1920 × 1080 (Full HD).
- [x] Zoom level: 100% (or 110% for crisp typography on 4K displays).
- [x] Audio: Noise gate enabled, 48kHz stereo, clean compression.
- [x] Theme: Start in dark theme, demonstrate light theme transition during final segment.
- [x] Synthetic Data: Use only synthetic CBC blood panel; zero real patient information.
- [x] Timing constraint: Keep strictly under 180 seconds.
- [x] Visibility: Ensure AWS architecture slide and Amazon Bedrock processing indicators are clearly legible.
