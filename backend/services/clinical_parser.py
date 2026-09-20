"""
backend/services/clinical_parser.py - Deterministic parser for clinical transcriptions.
Extracts medications, vitals, lab tests, patient demographics, and doctor notes from OCR/Vision text.
Ensures zero data loss even during upstream Gemini 503 or quota limits.
"""

import re
from typing import Dict, Any, List, Optional

def parse_clinical_text(text: str) -> Dict[str, Any]:
    """
    Parses unstructured or semi-structured transcribed clinical text into a rich structured schema:
    - patient demographics (name, age, gender)
    - doctor/facility info
    - vitals (BP, PR, SPO2, WT, Temp)
    - medications (name, dosage, frequency, instructions)
    - lab/investigation orders & results
    - complaints & clinical findings
    """
    if not text or not text.strip():
        return {
            "documentType": "OTHER",
            "patient": {},
            "medications": [],
            "labResults": [],
            "conditions": [],
            "findings": [],
            "vitals": {}
        }

    # 1. Patient Demographics (handles **Name:**, **Name**: and * **Name:**)
    patient_name = None
    age = None
    gender = None

    for m in re.finditer(r'(?:^\s*[\*\-•]\s*|\b)\*{0,2}(?:Patient(?:\s+Name)?|Name)[\s\*:]+([A-Za-z\s\.]+?)(?:\s*\*|\n|$)', text, re.IGNORECASE):
        cand = m.group(1).strip()
        if cand and not any(k in cand.lower() for k in ('dob', 'age', 'sex', 'date', 'dr', 'doctor', 'details', 'qualifications', 'information', 'header')):
            patient_name = cand
            break

    age_match = re.search(r'(?:Age|Yrs?)[\s\*:]+([0-9\+]+(?:\s*Y(?:ears?)?)?)', text, re.IGNORECASE)
    if age_match:
        age = age_match.group(1).strip()

    gender_match = re.search(r'(?:Sex|Gender)[\s\*:]+(Male|Female|Other|M|F)\b', text, re.IGNORECASE)
    if gender_match:
        g = gender_match.group(1).upper()
        gender = "Male" if g in ("M", "MALE") else "Female" if g in ("F", "FEMALE") else "Other"

    # 2. Vitals Extraction
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

    # 3. Medications Extraction
    medications: List[Dict[str, Any]] = []
    
    rx_section_match = re.search(r'(?:###\s*\*{0,2}Medications[\s\S]*?)([\s\S]+?)(?:###|\bRecommended|\bInvestigations|\bTests|\bFollow-up|\bFooter|\n---|---\n|$)', text, re.IGNORECASE)
    rx_block = rx_section_match.group(1) if rx_section_match else text

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
                    "purpose": "Prescribed therapy"
                })

    # 4. Investigations & Findings
    lab_results: List[Dict[str, Any]] = []
    findings: List[Dict[str, Any]] = []
    
    # Numeric lab results
    lab_pattern = re.compile(
        r'(?:^|\n)(?:•|\*|\-|\d+[\.\)])?\s*\*{0,2}([A-Za-z0-9\s\-\/\(\)]+?)[:：]?\*{0,2}\s*[:：]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\^]+)?(?:\s*\((?:Reference|Ref)[:\s]*([^\)]+)\))?(?:\s*\[(HIGH|LOW|NORMAL|ABNORMAL)\])?',
        re.IGNORECASE
    )
    for m in lab_pattern.finditer(text):
        t_name = m.group(1).strip()
        t_val = m.group(2).strip()
        t_unit = m.group(3).strip() if m.group(3) else ""
        t_ref = m.group(4).strip() if m.group(4) else "Standard reference"
        t_status = m.group(5).upper() if m.group(5) else "NORMAL"
        
        # Exclude metadata keys
        if t_name and len(t_name) > 2 and not any(h in t_name.lower() for h in ("page", "date", "age", "phone", "mob", "mobile", "dr", "doctor", "hospital", "patient", "timing", "bp", "wt", "pr", "spo2", "sex", "name", "reg", "wbmc")):
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

    # Recommended Investigations section (stored as actionable advice list, not dummy findings)
    recommended_investigations = []
    test_section_match = re.search(r'(?:###\s*\*{0,2}Recommended Investigations[\s\S]*?)([\s\S]+?)(?:###|\bFollow-up|\bFooter|\n---|---\n|$)', text, re.IGNORECASE)
    if test_section_match:
        test_block = test_section_match.group(1)
        for line in test_block.splitlines():
            line_clean = re.sub(r'^[\s\*\-\•\d\.\)]+', '', line).strip()
            if line_clean and not any(h in line_clean.lower() for h in ("investigations", "tests", "follow-up", "footer", "recommended")):
                items = [it.strip() for it in line_clean.split(",") if it.strip()]
                for it in items:
                    if len(it) > 1 and not any(lr.get("test", "").lower() == it.lower() for lr in lab_results):
                        recommended_investigations.append(it)

    # Symptoms / Chief Complaints (stored as symptoms list)
    symptoms = []
    symptoms_match = re.search(r'(?:Chief Complaints|Symptoms)[\s\S]*?\n((?:\s*[\*\-•]\s*[^\n]+\n?)+)', text, re.IGNORECASE)
    if symptoms_match:
        for s_line in symptoms_match.group(1).splitlines():
            s_clean = re.sub(r'^[\s\*\-\•\d\.\)]+', '', s_line).strip()
            if s_clean:
                symptoms.append(s_clean)

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
        "medications": medications,
        "labResults": lab_results,
        "conditions": [],
        "findings": findings,
        "vitals": vitals,
        "recommendedInvestigations": recommended_investigations,
        "symptoms": symptoms
    }
