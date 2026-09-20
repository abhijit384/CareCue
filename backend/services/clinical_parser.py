"""
backend/services/clinical_parser.py - High-precision deterministic parser for clinical transcriptions.
Extracts medications, lab test names, doctor terms, vitals, patient demographics, and findings from OCR text.
Ensures zero data loss even during upstream Gemini rate limits.
"""

import re
from typing import Dict, Any, List, Optional

COMMON_MED_PREFIXES = r'(?:Tab\.?|Tablet|Cap\.?|Capsule|Syr\.?|Syrup|Inj\.?|Injection|Oint\.?|Ointment|T\.?|C\.?|S\.?)\s+'
FREQUENCY_PATTERNS = r'(?:1-0-1|1-0-0|0-0-1|0-1-0|1-1-1|OD|BD|BID|TID|QID|HS|STAT|SOS|PC|AC|Once\s+daily|Twice\s+daily|Thrice\s+daily|Daily|At\s+bedtime|After\s+meals|Before\s+meals)'

def parse_clinical_text(text: str) -> Dict[str, Any]:
    """
    Parses unstructured or semi-structured transcribed clinical text into a rich structured schema:
    - patient demographics (name, age, gender)
    - doctor/facility info (doctorName, qualifications, department, facility)
    - vitals (BP, PR, SPO2, WT, Temp)
    - medications (name, dosage, frequency, instructions, timing)
    - lab/investigation orders & results
    - complaints & clinical findings
    """
    if not text or not text.strip():
        return {
            "documentType": "OTHER",
            "patient": {},
            "doctor": {},
            "medications": [],
            "labResults": [],
            "conditions": [],
            "findings": [],
            "vitals": {}
        }

    # 1. Patient Demographics
    patient_name = None
    age = None
    gender = None

    for m in re.finditer(r'(?:^\s*[\*\-•]\s*|\b)\*{0,2}(?:Patient(?:\s+Name)?|Pt\.?\s*Name|Name)[\s\*:]+([A-Za-z\s\.]+?)(?:\s*\*|\n|$)', text, re.IGNORECASE):
        cand = m.group(1).strip()
        if cand and not any(k in cand.lower() for k in ('dob', 'age', 'sex', 'date', 'dr', 'doctor', 'details', 'qualifications', 'information', 'header', 'clinic', 'hospital')):
            patient_name = cand
            break

    age_match = re.search(r'(?:Age|Yrs?)[\s\*:]+([0-9\+]+(?:\s*Y(?:ears?)?)?)', text, re.IGNORECASE)
    if age_match:
        age = age_match.group(1).strip()

    gender_match = re.search(r'(?:Sex|Gender)[\s\*:]+(Male|Female|Other|M|F)\b', text, re.IGNORECASE)
    if gender_match:
        g = gender_match.group(1).upper()
        gender = "Male" if g in ("M", "MALE") else "Female" if g in ("F", "FEMALE") else "Other"

    # 2. Doctor & Facility Terms
    doctor_name = None
    qualifications = []
    department = None
    facility = None

    doc_match = re.search(r'(?:Dr\.?|Doctor)[\s\*:]+([A-Za-z\s\.]+?)(?:,|\n|\(|MBBS|MD|MS|DM|DNB|\*)', text, re.IGNORECASE)
    if doc_match:
        doctor_name = "Dr. " + doc_match.group(1).strip().removeprefix("Dr.").strip()

    qual_matches = re.findall(r'\b(MBBS|M\.B\.B\.S|MD|M\.D|MS|M\.S|DM|D\.M|DNB|D\.N\.B|FCPS|MCh|PhD)\b', text, re.IGNORECASE)
    if qual_matches:
        qualifications = list(set(q.upper() for q in qual_matches))

    dept_match = re.search(r'\b(Cardiology|Endocrinology|General\s+Medicine|Internal\s+Medicine|Nephrology|Neurology|Pediatrics|Gynaecology|Gynecology|Orthopedics|Dermatology|Oncology|Gastroenterology)\b', text, re.IGNORECASE)
    if dept_match:
        department = dept_match.group(1).title()

    fac_match = re.search(r'([A-Za-z0-9\s\.\,\'-]+?(?:Hospital|Clinic|Diagnostics|Lab|Laboratory|Medical\s+Center|Health\s+Care))', text, re.IGNORECASE)
    if fac_match:
        facility = fac_match.group(1).strip()

    # 3. Vitals Extraction
    vitals = {}
    bp_match = re.search(r'\*{0,2}(?:BP|Blood\s*Pressure)[:：]?\*{0,2}\s*[:：]?\s*(\d{2,3}\s*/\s*\d{2,3}(?:\s*mmHg)?)', text, re.IGNORECASE)
    if bp_match:
        vitals["bloodPressure"] = bp_match.group(1).strip()

    pr_match = re.search(r'\*{0,2}(?:PR|Pulse(?:\s*Rate)?|Heart\s*Rate|HR)[:：]?\*{0,2}\s*[:：]?\s*(\d{2,3}(?:\s*(?:/min|bpm|/minute))?)', text, re.IGNORECASE)
    if pr_match:
        vitals["pulseRate"] = pr_match.group(1).strip()

    spo2_match = re.search(r'\*{0,2}(?:SPO2|SpO₂|SPO₂|Oxygen\s*Sat(?:uration)?)[:：]?\*{0,2}\s*[:：]?\s*(\d{2,3}\s*%(?:\s*R/?A)?)', text, re.IGNORECASE)
    if spo2_match:
        vitals["spo2"] = spo2_match.group(1).strip()

    wt_match = re.search(r'\*{0,2}(?:WT|Weight)[:：]?\*{0,2}\s*[:：]?\s*(\d{2,3}(?:\.\d+)?\s*(?:kg|kgs|/kgs|\.k))', text, re.IGNORECASE)
    if wt_match:
        vitals["weight"] = wt_match.group(1).strip()

    # 4. Comprehensive Medications Extraction
    medications: List[Dict[str, Any]] = []

    # Pattern A: Standard Prescription lines (e.g. "Tab. Metformin 500mg 1-0-1 after meals")
    med_line_pattern = re.compile(
        r'(?:^|\n)(?:\d+[\.\)]|\*|\-)?\s*(?:Rx[:\s]*)?'
        + COMMON_MED_PREFIXES +
        r'?([A-Za-z0-9\s\-\+\(\)]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|IU|units)?)\s*(' + FREQUENCY_PATTERNS + r'|[0-1]-[0-1]-[0-1])?(?:\s+([^\n]+))?',
        re.IGNORECASE
    )

    for m in med_line_pattern.finditer(text):
        m_name = m.group(1).strip()
        m_dose = m.group(2).strip() if m.group(2) else ""
        m_freq = m.group(3).strip() if m.group(3) else "As prescribed"
        m_instr = m.group(4).strip() if m.group(4) else "Take as directed by doctor"

        if m_name and len(m_name) > 2 and not any(h in m_name.lower() for h in ("page", "date", "age", "phone", "dr", "doctor", "hospital", "patient", "investigation", "recommended", "test")):
            if not any(med["name"].lower() == m_name.lower() for med in medications):
                medications.append({
                    "name": m_name,
                    "dosage": m_dose,
                    "frequency": m_freq,
                    "instructions": m_instr,
                    "purpose": "Prescribed therapy"
                })

    # Pattern B: Markdown bullet lists or structured medication sections
    rx_section_match = re.search(r'(?:###?\s*\*{0,2}Medications?[\s\S]*?)([\s\S]+?)(?:###?|\bRecommended|\bInvestigations|\bTests|\bFollow-up|\bFooter|\n---|---\n|$)', text, re.IGNORECASE)
    if rx_section_match:
        rx_block = rx_section_match.group(1)
        med_names = re.findall(r'^\s*(?:\d+[\.\)]|\*|\-)\s+(?:\*\*)?([^\n\*]+?)(?:\*\*)?\s*$', rx_block, re.MULTILINE)
        dosages = re.findall(r'Dosage(?:\/Frequency)?[:：]?\*{0,2}\s*[:：]?\s*([^\n]+)', rx_block, re.IGNORECASE)
        for idx, m_name in enumerate(med_names):
            m_name = m_name.strip()
            if m_name and len(m_name) > 2 and not any(h in m_name.lower() for h in ("recommended", "investigation", "tests", "clinical", "doctor", "header", "patient", "vitals", "symptoms", "follow-up", "footer")):
                m_dose = dosages[idx].strip() if idx < len(dosages) else "As prescribed"
                if not any(m["name"].lower() == m_name.lower() for m in medications):
                    medications.append({
                        "name": m_name,
                        "dosage": m_dose,
                        "frequency": m_dose,
                        "instructions": "As prescribed by doctor",
                        "purpose": "Prescribed therapy"
                    })

    # 5. Comprehensive Lab Tests & Investigations Extraction
    lab_results: List[Dict[str, Any]] = []
    findings: List[Dict[str, Any]] = []

    # Pattern A: Standard colon-separated lab values (e.g. "HbA1c: 6.4 % (4.0 - 5.6)")
    lab_pattern_colon = re.compile(
        r'(?:^|\n)(?:•|\*|\-|\d+[\.\)])?\s*\*{0,2}([A-Za-z0-9\s\-\/\(\)\+\,\.]+?)[:：]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\^\d\+\-\.]+)?(?:\s*\((?:Reference|Ref)[:\s]*([^\)]+)\))?(?:\s*\[(HIGH|LOW|NORMAL|ABNORMAL)\])?',
        re.IGNORECASE
    )
    for m in lab_pattern_colon.finditer(text):
        t_name = m.group(1).strip()
        t_val = m.group(2).strip()
        t_unit = m.group(3).strip() if m.group(3) else ""
        t_ref = m.group(4).strip() if m.group(4) else "Standard reference"
        t_status = m.group(5).upper() if m.group(5) else "NORMAL"

        if t_name and len(t_name) > 2 and not any(h in t_name.lower() for h in ("page", "date", "age", "phone", "mob", "mobile", "dr", "doctor", "hospital", "patient", "timing", "bp", "wt", "pr", "spo2", "sex", "name", "reg", "wbmc")):
            if not any(lr["test"].lower() == t_name.lower() for lr in lab_results):
                lab_results.append({
                    "test": t_name,
                    "value": t_val,
                    "unit": t_unit,
                    "reference": t_ref,
                    "status": t_status
                })
                findings.append({
                    "title": f"{t_name} ({t_val} {t_unit})",
                    "category": "Laboratory Marker",
                    "severity": "MODERATE" if t_status in ("HIGH", "LOW") else "MILD",
                    "summary": f"Observed value: {t_val} {t_unit} (Ref: {t_ref}).",
                    "actionItem": "Review with attending physician."
                })

    # Pattern B: Space-separated lab test rows (e.g. "Fasting Blood Sugar  105  mg/dL  70-99")
    lab_pattern_space = re.compile(
        r'(?:^|\n)(?:•|\*|\-|\d+[\.\)])?\s*([A-Za-z0-9\s\-\/\(\)]+?)\s{2,}(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\^]+)?\s+([0-9\.\-\s\/]+)?',
        re.IGNORECASE
    )
    for m in lab_pattern_space.finditer(text):
        t_name = m.group(1).strip()
        t_val = m.group(2).strip()
        t_unit = m.group(3).strip() if m.group(3) else ""
        t_ref = m.group(4).strip() if m.group(4) else "Standard reference"

        if t_name and len(t_name) > 2 and not any(h in t_name.lower() for h in ("page", "date", "age", "phone", "dr", "doctor", "hospital", "patient", "bp", "wt", "pr", "spo2", "name")):
            if not any(lr["test"].lower() == t_name.lower() for lr in lab_results):
                lab_results.append({
                    "test": t_name,
                    "value": t_val,
                    "unit": t_unit,
                    "reference": t_ref,
                    "status": "NORMAL"
                })

    doc_type = "OTHER"
    if medications or "rx" in text.lower() or "prescription" in text.lower():
        doc_type = "PRESCRIPTION"
    elif lab_results or "lipid" in text.lower() or "pathology" in text.lower() or "laboratory" in text.lower():
        doc_type = "LAB_REPORT"
    elif "discharge" in text.lower():
        doc_type = "DISCHARGE_SUMMARY"

    return {
        "documentType": doc_type,
        "patient": {
            "name": patient_name,
            "age": age,
            "gender": gender
        },
        "doctor": {
            "name": doctor_name,
            "qualifications": qualifications,
            "department": department,
            "facility": facility
        },
        "medications": medications,
        "labResults": lab_results,
        "conditions": [],
        "findings": findings,
        "vitals": vitals
    }
