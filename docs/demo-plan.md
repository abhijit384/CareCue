# CareCue — Demo Plan

> 3 minutes. One flow. Unforgettable.

---

## 1. Demo Philosophy

The demo tells a **story**, not a feature list. The audience should feel the problem before they see the solution. Every second is allocated with purpose.

### Audience Goals

By the end of 3 minutes, the judges should understand:

1. **The problem** — Understanding medical documents is confusing and high-stakes
2. **The solution** — CareCue makes it clear, transparent, and actionable
3. **The differentiator** — Privacy Gateway + Dual-AI verification + Evidence linking
4. **The technology** — Real AWS + Gemini, working live
5. **The craft** — This UI belongs in the "Best UI" category

---

## 2. Demo Script (3:00)

### 0:00–0:25 — The Problem (25 seconds)

**Narration:**

> "You get a blood test back. 47 values, medical jargon, reference ranges. You Google the first abnormal number and end up on a forum convincing yourself it's serious. We've all been there."

> "CareCue changes that. Understand. Verify. Prepare."

**Screen:** Landing page. Hero is visible. The tagline animates in.

**Action:** Click "Start Care Session."

---

### 0:25–0:40 — Start a Session (15 seconds)

**Narration:**

> "You start a Care Session. Choose what you need — today we'll understand a blood panel report."

**Screen:** Session type selection. Three cards visible.

**Action:** Click "Understand a Report."

---

### 0:40–1:05 — Upload & Privacy Gateway (25 seconds)

**Narration:**

> "Upload your report. CareCue's Privacy Gateway automatically detects personal identifiers — your name, date of birth, phone number — and minimizes them before anything leaves for independent verification."

> "You can see exactly what was detected and what will be sent. Nothing hidden."

**Screen:** 
1. Drag sample PDF into upload zone → file accepted
2. Privacy Gateway appears: split view showing original (PII highlighted in amber) → minimized payload (PII replaced with placeholders)

**Action:** Click "Continue to Analysis."

---

### 1:05–1:30 — Processing & Trust Path (25 seconds)

**Narration:**

> "Now watch the CareCue Trust Path. Every insight follows this flow: Source. Analysis. Verification. Next Step."

> "Amazon Bedrock analyzes the full document. Then, the privacy-minimized claims are independently cross-checked by a second AI — Google Gemini. Two models. No blind trust."

**Screen:** Processing state with Trust Path animation.
- SOURCE ✓
- ANALYSIS ◎ (pulsing) → ✓
- VERIFICATION ◎ (pulsing) → ✓
- NEXT STEP ◎

Step-by-step status messages update in real time.

---

### 1:30–2:15 — Results & Evidence (45 seconds)

**Narration:**

> "Here are your insights. Each one is evidence-linked — you can see exactly what source data supports it."

**Action:** Point to first evidence card.

> "Hemoglobin: 11.2 g/dL. Below the reference range. And look — it's marked 'Consistent'. Both AI systems independently agreed on this interpretation."

**Action:** Point to the "Consistent" badge.

> "But this one — Cholesterol at 215 — is marked 'Needs Review'. The two AI systems had slightly different interpretations. That's not a failure. That's transparency. It tells you to bring this up with your doctor."

**Action:** Click "View Evidence" on the Needs Review card.

> "Drill into the evidence. See the original source text. The Bedrock interpretation. The Gemini assessment. Everything is traceable. Nothing is a black box."

**Screen:** Evidence detail view — source, Bedrock, Gemini, side-by-side.

---

### 2:15–2:40 — Doctor Visit Brief (25 seconds)

**Narration:**

> "Finally, CareCue generates a Doctor Visit Brief — a clean, structured document you can bring to your appointment."

**Action:** Click "Generate Doctor Visit Brief."

> "Key findings, reference ranges, verification status, items to discuss, and your own notes. All in one premium document you can print or download."

**Screen:** Doctor Visit Brief in its premium layout. Clean, medical-document aesthetic.

**Action:** Show the disclaimer at the bottom — brief pause.

> "And a clear disclaimer. CareCue never pretends to be your doctor."

---

### 2:40–3:00 — Architecture & Impact (20 seconds)

**Narration:**

> "Under the hood: React and TypeScript on AWS Amplify. API Gateway and Lambda for the backend. Amazon Bedrock for primary analysis. S3 and DynamoDB for storage. Gemini for independent verification — with the API key secured in Secrets Manager, never exposed to the browser."

> "CareCue. Understand. Verify. Prepare."

**Screen:** Quick architecture diagram (can be a dedicated "About" or overlay slide, or spoken over the final landing page view).

---

## 3. Demo Timeline Summary

| Time | Duration | Beat | Screen |
|------|----------|------|--------|
| 0:00 | 25s | **Problem** | Landing page |
| 0:25 | 15s | **Session start** | Type selection |
| 0:40 | 25s | **Upload + Privacy** | Upload → Privacy Gateway |
| 1:05 | 25s | **Processing** | Trust Path animation |
| 1:30 | 45s | **Results + Evidence** | Evidence cards → detail |
| 2:15 | 25s | **Doctor Brief** | Brief document |
| 2:40 | 20s | **Architecture + Close** | Architecture / landing |

---

## 4. Synthetic Demo Data

### Sample Report: "Complete Blood Count + Lipid Panel"

A synthetic medical report with realistic but entirely fabricated values:

```
═══════════════════════════════════════
     SAMPLE MEDICAL LABORATORY
     123 Health Avenue, Suite 100
     Anytown, ST 12345
═══════════════════════════════════════

Patient: Jane Sample               DOB: 01/15/1985
MRN: SMP-2026-00421               Phone: (555) 123-4567
Ordering Physician: Dr. Alex Rivera
Collection Date: 09/10/2026
Report Date: 09/12/2026

─── COMPLETE BLOOD COUNT (CBC) ───────

Test                Value    Units     Reference Range    Flag
Hemoglobin          11.2     g/dL      12.0 – 17.5       LOW
Hematocrit          34.1     %         36.0 – 50.0       LOW
WBC                 7.2      K/uL      4.5 – 11.0
RBC                 4.1      M/uL      4.0 – 5.5
Platelets           245      K/uL      150 – 400
MCV                 83.2     fL        80.0 – 100.0
MCH                 27.3     pg        27.0 – 33.0
MCHC                32.8     g/dL      32.0 – 36.0
RDW                 14.8     %         11.5 – 14.5       HIGH

─── LIPID PANEL ──────────────────────

Test                Value    Units     Reference Range    Flag
Total Cholesterol   215      mg/dL     < 200              HIGH
LDL Cholesterol     138      mg/dL     < 100              HIGH
HDL Cholesterol     52       mg/dL     > 40
Triglycerides       126      mg/dL     < 150
VLDL                25       mg/dL     5 – 40

─── METABOLIC PANEL ──────────────────

Test                Value    Units     Reference Range    Flag
Glucose (Fasting)   98       mg/dL     70 – 100
BUN                 15       mg/dL     7 – 20
Creatinine          0.9      mg/dL     0.6 – 1.2
eGFR                92       mL/min    > 60
Sodium              141      mEq/L     136 – 145
Potassium           4.2      mEq/L     3.5 – 5.1

═══════════════════════════════════════
```

### Expected Analysis Output

| Finding | Value | Range | Expected Status |
|---------|-------|-------|----------------|
| Hemoglobin LOW | 11.2 g/dL | 12.0–17.5 | Consistent |
| Hematocrit LOW | 34.1% | 36.0–50.0 | Consistent |
| RDW HIGH | 14.8% | 11.5–14.5 | Consistent |
| Total Cholesterol HIGH | 215 mg/dL | < 200 | Needs Review (borderline) |
| LDL Cholesterol HIGH | 138 mg/dL | < 100 | Consistent |
| Glucose (borderline) | 98 mg/dL | 70–100 | Needs Review (borderline high-normal) |

### Privacy Gateway Expected Detection

| PII Type | Original | Minimized |
|----------|----------|-----------|
| Patient name | Jane Sample | [PERSON] |
| DOB | 01/15/1985 | [DATE] |
| MRN | SMP-2026-00421 | [ID] |
| Phone | (555) 123-4567 | [PHONE] |
| Physician | Dr. Alex Rivera | [PERSON] |
| Address | 123 Health Avenue, Suite 100, Anytown, ST 12345 | [ADDRESS] |

---

## 5. Demo Preparation Checklist

### Night Before

- [ ] Full end-to-end test with sample report (3 times)
- [ ] Verify Bedrock model access is working
- [ ] Verify Gemini API key is valid
- [ ] Pre-warm Lambda functions (trigger a dummy request)
- [ ] Test on demo laptop/browser
- [ ] Confirm internet connectivity at venue
- [ ] Load sample PDF in a known location on the laptop
- [ ] Test drag-and-drop with the specific browser that will be used
- [ ] Practice the narration aloud with timer

### 10 Minutes Before

- [ ] Open browser to landing page
- [ ] Close all other tabs/applications
- [ ] Disable notifications
- [ ] Ensure PDF file is on desktop for easy drag-and-drop
- [ ] One final warm-up API call (to avoid cold start during demo)
- [ ] Confirm Wi-Fi is connected

---

## 6. Fallback Scenarios

| Failure | Fallback |
|---------|----------|
| **Bedrock times out** | Pre-cached results in DynamoDB. Load from cache if live call fails. |
| **Gemini is unavailable** | Show results with "Verification unavailable" badge. Narrate: "The verification service is temporarily unavailable, but the primary analysis from Bedrock is complete." |
| **Upload fails** | Have the text content pre-pasted. Use the "Paste Text" alternative input. |
| **Internet drops** | Have screenshots/recording of the full flow as backup. |
| **Lambda cold start is slow** | Pre-warm with a dummy call 2 minutes before demo. Narrate during any wait: "The analysis pipeline is processing through multiple AI systems..." |

---

## 7. Scoring Alignment

### "Ship It" Category

| Criterion | How CareCue Delivers |
|-----------|---------------------|
| Working product | End-to-end flow: upload → analysis → verification → brief |
| Real technology | Amazon Bedrock, Lambda, S3, DynamoDB, API Gateway, Gemini |
| Innovation | Dual-AI cross-check, Privacy Gateway, Trust Path |
| Completeness | Full pipeline with history, deletion, and safety guardrails |

### "Best UI" Category

| Criterion | How CareCue Delivers |
|-----------|---------------------|
| Visual design | Premium health-tech aesthetic. Custom design system. Not a template. |
| User experience | Five Pillars of Clarity. Trust Path. Evidence linking. |
| Interaction quality | Purposeful animations. Responsive. Accessible. |
| Information design | Evidence cards, verification badges, Doctor Visit Brief |
| Craft | Typography hierarchy, spacing system, color restraint, print stylesheet |
| Signature moments | Privacy Gateway transformation, Trust Path animation, Brief layout |

---

## 8. Key Demo Phrases

Memorable lines to anchor the presentation:

| Concept | Phrase |
|---------|--------|
| Tagline | *"Understand. Verify. Prepare."* |
| Trust Path | *"Every insight follows this path: Source. Analysis. Verification. Next Step."* |
| Privacy | *"You can see exactly what was detected and what will be sent. Nothing hidden."* |
| Dual-AI | *"Two AI systems. Independent verification. No blind trust."* |
| Verification | *"That's not a failure. That's transparency."* |
| Honesty | *"CareCue never pretends to be your doctor."* |
| Evidence | *"Everything is traceable. Nothing is a black box."* |

---

## 9. Post-Demo Q&A Preparation

| Likely Question | Answer |
|----------------|--------|
| "Is this HIPAA compliant?" | "CareCue implements privacy-focused practices like PII minimization and encrypted storage, but we do not claim HIPAA compliance. This is an informational tool, not a clinical system." |
| "What if the two AIs disagree?" | "That's by design. Disagreement is surfaced as 'Needs Review' — it tells the user this insight deserves special attention from their doctor. We never claim that agreement equals medical truth." |
| "Why two different AI systems?" | "Independence. If one model has a systematic bias, a second independent model helps surface that. It's the same principle as a second opinion in medicine — not a guarantee, but a valuable check." |
| "How do you handle privacy?" | "We minimize PII before sending data for verification. The Privacy Gateway shows users exactly what was detected and what is sent. We use the term 'minimized' — not 'anonymized' — because we're honest about the limitations of pattern-based detection." |
| "What AWS services are you using?" | "Amplify for hosting, API Gateway and Lambda for the serverless backend, S3 for encrypted document storage with automatic expiry, DynamoDB for session data, Bedrock with Claude 3.5 Sonnet for primary analysis, Secrets Manager for the Gemini API key, and CloudWatch for monitoring." |
| "Would you use this for your own health?" | "Yes, as a comprehension and preparation tool — not as a diagnostic tool. I'd use it to understand my lab results better and to prepare organized questions for my doctor." |
