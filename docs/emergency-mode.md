# CareCue — Emergency Mode & Safety Triage

## 1. Overview & Philosophy
Emergency Mode provides immediate, calm, and structured safety triage when a user reports acute or alarming physical symptoms. Unlike generic search engines or conversational chatbots that may panic users or attempt invalid diagnoses, CareCue acts as a calm, safety-first triage companion.

---

## 2. Deterministic Safety Triage Engine

CareCue categorizes symptom presentations into three distinct clinical categories:

### 1. URGENT_ATTENTION (Tier 1)
- **Trigger**: Red-flag symptoms including severe chest pain, radiating pressure to jaw/arm, sudden unilateral facial drooping, acute slurred speech, sudden blindness, severe acute respiratory distress, heavy uncontrolled bleeding, or signs of anaphylaxis.
- **Tone**: Calm, unequivocal, direct.
- **Action**: Immediate guidance to dial emergency services (e.g. 911 / local emergency) or proceed directly to the nearest emergency department.
- **Prohibition**: Never suggests home remedies, waiting, or self-medication.

### 2. SAFETY_GUIDANCE (Tier 2)
- **Trigger**: Persistent moderate symptoms without acute red flags (e.g., persistent low-grade fever, moderate joint ache, recurring localized headache, mild stomach ache).
- **Tone**: Informative, balanced, reassuring.
- **Action**: Clear instructions on when to contact a primary care physician, what warning signs to monitor, and questions to ask.

### 3. NOT_ENOUGH_INFORMATION (Tier 3)
- **Trigger**: Highly ambiguous or single-word inputs (e.g., "dizzy", "pain", "unwell").
- **Tone**: Structured inquiry.
- **Action**: Prompts for onset, duration, severity, and explicitly highlights emergency symptoms that would require immediate 911 contact.

---

## 3. Emergency Information Card
When in Emergency Mode, CareCue synthesizes known patient information into an immediate, standardized **Emergency Information Card**:

| Card Section | Details Included |
| :--- | :--- |
| **Patient Identity** | Legal Name, Age / Date of Birth, Emergency Contact |
| **Active Symptoms** | Reported acute complaint, duration, severity rating |
| **Known Conditions** | Extracted from prior records or patient profile |
| **Current Medications** | Known active prescriptions or recorded dosages |
| **Known Allergies** | Drug or environmental allergies on file |
| **Recent Vitals / Biomarkers** | Most recent abnormal lab values (e.g. Potassium, Glucose, BP) |

### Actions Available:
- **Copy Emergency Card**: Formats a clean, high-visibility plaintext block ready to paste into messaging or notes.
- **Download Card (`.txt`)**: Exports an immediate text file for offline access or handing to first responders.
- **Emergency Call Button**: Direct click-to-call link for emergency dispatch (911).
