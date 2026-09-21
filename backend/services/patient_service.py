"""
backend/services/patient_service.py - Patient identity extraction, normalized matching, and document attachment.
"""

import re
import uuid
import logging
from typing import Dict, Any, List, Optional
try:
    from .patient_store import PatientStore
except ImportError:
    try:
        from services.patient_store import PatientStore
    except ImportError:
        from backend.services.patient_store import PatientStore

logger = logging.getLogger(__name__)

class PatientService:
    def __init__(self, store: Optional[PatientStore] = None):
        self.store = store or PatientStore()

    def extract_patient_info_from_text(self, document_text: str) -> Dict[str, Any]:
        """
        Extracts patient name and date of birth using comprehensive heuristic patterns.
        """
        if not document_text:
            return {"patientName": None, "dateOfBirth": None, "confidence": 0.0, "sourcePage": 1, "isReliable": False}

        name = None
        dob = None
        confidence = 0.0

        name_patterns = [
            r'(?:patient\s*(?:name)?|pt\.?\s*name|name\s*of\s*patient|patient\'s\s*name|prescribed\s*(?:for|to)|rx\s*for|name)\s*[:\-]\s*([^\n\r]+)',
            r'(?:mr|mrs|ms|shri|smt|master|baby)\.?\s+([A-Za-z\.\'\-]+(?:\s+[A-Za-z\.\'\-]+){1,3})',
        ]

        stop_words = (
            "age", "dob", "sex", "gender", "date", "dr", "doctor", "mrn", "id", "phone", "mobile",
            "ref", "referred", "address", "yrs", "years", "male", "female", "weight", "height", "bp",
            "report", "lab", "test", "clinic", "hospital", "department", "diag", "page", "summary"
        )

        for pat in name_patterns:
            for match in re.finditer(pat, document_text, re.IGNORECASE):
                raw_val = match.group(1).strip()
                # Split by delimiters or field headers (Age, DOB, Sex, Date, etc.)
                cleaned = re.split(r'\s*[\/\,\;\|\t\(\)]\s*|\s+(?=(?:Age|DOB|Sex|Gender|Date|Dr|Doctor|MRN|Ref|Phone|Mobile)\b[:\s\-\d])', raw_val, flags=re.IGNORECASE)[0]
                cleaned = re.sub(r'^(?:Mr|Mrs|Ms|Miss|Shri|Smt|Master|Baby|Pt|Patient)\.?\s+', '', cleaned, flags=re.IGNORECASE).strip()
                cleaned = re.sub(r'[\d\:\*\#\_\-\(\)]+$', '', cleaned).strip()
                
                words = [w for w in cleaned.split() if w.isalpha() or '.' in w]
                if len(words) >= 1 and len(cleaned) >= 3:
                    cand_lower = cleaned.lower()
                    if not any(w in cand_lower for w in stop_words):
                        name = cleaned.title()
                        confidence = 0.85
                        break
            if name:
                break

        dob_patterns = [
            r'(?:dob|date\s*of\s*birth|birth\s*date)\s*[:\-]\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})',
            r'(?:age\s*/\s*sex|age\s*:\s*\d+)\s*[:\-]?\s*(\d{1,3}\s*(?:y|yrs|years)?)',
        ]
        for d_pat in dob_patterns:
            dob_match = re.search(d_pat, document_text, re.IGNORECASE)
            if dob_match:
                dob = dob_match.group(1).strip()
                confidence += 0.10
                break

        confidence = min(confidence, 0.98)
        if not name:
            confidence = 0.0

        return {
            "patientName": name,
            "dateOfBirth": dob,
            "confidence": round(confidence, 2),
            "sourcePage": 1,
            "isReliable": confidence >= 0.65,
        }

    def normalize_name(self, name: str) -> str:
        """Normalizes a name for robust matching: removes titles, qualifications, and punctuation."""
        if not name:
            return ""
        n = re.sub(r'^(mr|mrs|ms|miss|dr|prof|shri|smt|master|baby)\.?\s+', '', name.strip(), flags=re.IGNORECASE)
        n = re.sub(r',?\s+(md|phd|do|mbbs|ms|frcs|mrcp)$', '', n, flags=re.IGNORECASE)
        n = re.sub(r'[^a-zA-Z\s]', '', n)
        return " ".join(n.lower().split())

    def match_patient(
        self,
        extracted_name: Optional[str],
        extracted_dob: Optional[str] = None,
        target_patient_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Compares extracted patient name against existing patients or active target patient.
        Returns matchType: EXACT_NAME_MATCH, DIFFERENT_PATIENT, LIKELY_MATCH, or NO_MATCH.
        """
        if not extracted_name:
            return {
                "matchType": "NO_MATCH",
                "extractedName": None,
                "matchedPatient": None,
                "confidence": 0.0,
                "message": "Patient name could not be reliably detected in the document.",
            }

        norm_extracted = self.normalize_name(extracted_name)
        patients = self.store.list_patients(user_id=user_id) if user_id else self.store.list_patients()

        # Target selected patient verification
        if target_patient_id:
            target = self.store.get_patient(target_patient_id)
            if target:
                is_self = (target.get("relationship") == "Self")
                norm_target = self.normalize_name(target["name"])
                
                # Check for exact or single-word containment
                is_exact = (norm_extracted == norm_target)
                extracted_tokens = norm_extracted.split()
                target_tokens = norm_target.split()

                if is_exact:
                    return {
                        "matchType": "EXACT_NAME_MATCH",
                        "extractedName": extracted_name,
                        "matchedPatient": target,
                        "targetPatient": target,
                        "isSelfProfile": is_self,
                        "confidence": 0.98,
                        "isTargetMatch": True,
                        "message": f"Document matches selected patient {target['name']}.",
                    }
                
                # Single name vs full name matching (e.g. "Rahul" vs "Rahul Sharma")
                if len(extracted_tokens) >= 1 and len(target_tokens) >= 1:
                    if extracted_tokens[0] == target_tokens[0] and (len(extracted_tokens) == 1 or len(target_tokens) == 1):
                        return {
                            "matchType": "EXACT_NAME_MATCH",
                            "extractedName": extracted_name,
                            "matchedPatient": target,
                            "targetPatient": target,
                            "isSelfProfile": is_self,
                            "confidence": 0.92,
                            "isTargetMatch": True,
                            "message": f"Document matches selected patient {target['name']}.",
                        }

                # Check if there is already an existing patient with the extracted name
                existing_named_patient = None
                for p in patients:
                    if self.normalize_name(p["name"]) == norm_extracted:
                        existing_named_patient = p
                        break

                msg = (
                    f"This document/prescription belongs to '{extracted_name}', but this is your personal Self profile for '{target['name']}'. Please upload your own document, or create a separate profile for '{extracted_name}'."
                    if is_self else
                    f"Document name '{extracted_name}' does not match selected patient '{target['name']}'."
                )
                return {
                    "matchType": "DIFFERENT_PATIENT",
                    "extractedName": extracted_name,
                    "matchedPatient": existing_named_patient,
                    "targetPatient": target,
                    "isSelfProfile": is_self,
                    "confidence": 0.95,
                    "isTargetMatch": False,
                    "message": msg,
                }

        # Global matching across existing patients
        for p in patients:
            norm_p = self.normalize_name(p["name"])
            if norm_extracted == norm_p:
                return {
                    "matchType": "EXACT_NAME_MATCH",
                    "extractedName": extracted_name,
                    "matchedPatient": p,
                    "confidence": 0.95,
                    "isTargetMatch": True,
                    "message": f"A patient profile for '{p['name']}' already exists (Patient ID: {p['patientId']}).",
                }

        # Partial/likely match check
        extracted_parts = norm_extracted.split()
        for p in patients:
            p_parts = self.normalize_name(p["name"]).split()
            if len(extracted_parts) >= 2 and len(p_parts) >= 2:
                if extracted_parts[-1] == p_parts[-1] and extracted_parts[0] == p_parts[0]:
                    return {
                        "matchType": "LIKELY_MATCH",
                        "extractedName": extracted_name,
                        "matchedPatient": p,
                        "confidence": 0.80,
                        "message": f"Likely match with existing patient {p['name']}.",
                    }

        return {
            "matchType": "NO_MATCH",
            "extractedName": extracted_name,
            "matchedPatient": None,
            "confidence": 0.0,
            "message": f"No existing profile found matching '{extracted_name}'.",
        }

    def create_patient_from_document(
        self,
        document_id: str,
        patient_name: str,
        dob: Optional[str] = None,
        relationship: str = "Self",
        relationship_detail: Optional[str] = None,
        notes: str = "",
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a new permanent patient record from extracted document data
        and securely attaches the document.
        """
        patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"
        patient_data = {
            "patientId": patient_id,
            "name": patient_name,
            "dateOfBirth": dob,
            "relationship": relationship,
            "relationshipDetail": relationship_detail,
            "notes": notes or f"Created from document {document_id}",
            "userId": user_id,
        }
        new_patient = self.store.create_patient(patient_data)
        if document_id:
            self.store.attach_document_to_patient(document_id, patient_id)
        return new_patient
