"""
backend/services/patient_service.py - Patient identity extraction, normalized matching, and document attachment.
"""

import re
import uuid
import logging
from typing import Dict, Any, List, Optional
from .patient_store import PatientStore

logger = logging.getLogger(__name__)

class PatientService:
    def __init__(self, store: Optional[PatientStore] = None):
        self.store = store or PatientStore()

    def extract_patient_info_from_text(self, document_text: str) -> Dict[str, Any]:
        """
        Extracts patient name and date of birth using heuristic patterns.
        """
        name = None
        dob = None
        confidence = 0.0

        name_match = re.search(
            r'(?:patient\s*(?:name)?|pt\s*name|name)\s*[:\-]\s*([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){1,3})',
            document_text,
            re.IGNORECASE
        )
        if name_match:
            candidate = name_match.group(1).split('\n')[0].strip()
            invalid_words = ("report", "test", "laboratory", "specimen", "hospital", "clinic", "panel", "complete", "blood", "chemistry", "order")
            if not any(w in candidate.lower() for w in invalid_words) and len(candidate) > 2:
                name = candidate
                confidence += 0.7

        dob_match = re.search(
            r'(?:dob|date\s*of\s*birth|birth\s*date)\s*[:\-]\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})',
            document_text,
            re.IGNORECASE
        )
        if dob_match:
            dob = dob_match.group(1).strip()
            confidence += 0.25

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
        n = re.sub(r'^(mr|mrs|ms|dr|prof)\.?\s+', '', name.strip(), flags=re.IGNORECASE)
        n = re.sub(r',?\s+(md|phd|do|mbbs)$', '', n, flags=re.IGNORECASE)
        n = re.sub(r'[^a-zA-Z\s]', '', n)
        return " ".join(n.lower().split())

    def match_patient(
        self,
        extracted_name: Optional[str],
        extracted_dob: Optional[str] = None,
        target_patient_id: Optional[str] = None,
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
        patients = self.store.list_patients()

        # Target selected patient verification
        if target_patient_id:
            target = self.store.get_patient(target_patient_id)
            if target:
                is_self = (target.get("relationship") == "Self")
                norm_target = self.normalize_name(target["name"])
                if norm_extracted == norm_target:
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
                else:
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
