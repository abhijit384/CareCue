"""
backend/handlers/patient_handler.py - Lambda handler for patient management, extraction, and timeline APIs.
"""

import json
from typing import Dict, Any, Optional

try:
    from backend.services.patient_store import PatientStore
    from backend.services.patient_service import PatientService
    from backend.services.gemini_service import GeminiVerificationService
    from backend.database.db import init_db
except ImportError:
    from services.patient_store import PatientStore
    from services.patient_service import PatientService
    from services.gemini_service import GeminiVerificationService
    from database.db import init_db

try:
    init_db()
except Exception:
    pass

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,PATCH,DELETE",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id,X-User-Id,X-Correlation-Id",
}

patient_store = PatientStore()
patient_service = PatientService(patient_store)
gemini_service = GeminiVerificationService()


def _json_response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body) if not isinstance(body, str) else body,
    }


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")
    path = (event.get("rawPath") or event.get("path") or "/patients").rstrip("/")

    if http_method == "OPTIONS":
        return _json_response(200, {"status": "ok"})

    headers = event.get("headers") or {}
    user_id = headers.get("x-user-id") or headers.get("X-User-Id")

    try:
        # Route 1: Identify patient from document text
        if path.endswith("/documents/identify-patient") and http_method == "POST":
            return handle_identify_patient(event)

        # Route 2: Match patient against existing profiles
        if path.endswith("/documents/match-patient") and http_method == "POST":
            return handle_match_patient(event)

        # Route 3: Create patient from document
        if path.endswith("/patients/from-document") and http_method == "POST":
            return handle_create_from_document(event, user_id=user_id)

        # Route 4: Patient sub-resources (/patients/{id}/...)
        if "/patients/" in path:
            parts = path.split("/patients/")[1].split("/")
            patient_id = parts[0]
            sub_resource = parts[1] if len(parts) > 1 else None

            if sub_resource == "documents":
                if len(parts) > 2:
                    # /patients/{id}/documents/{docId}
                    doc_id = parts[2]
                    if http_method == "DELETE":
                        deleted = patient_store.delete_patient_document(patient_id, doc_id)
                        if deleted:
                            return _json_response(200, {"deleted": True})
                        return _json_response(404, {"error": "Document not found or patient mismatch"})

                if http_method == "GET":
                    docs = patient_store.get_patient_documents(patient_id)
                    return _json_response(200, docs)
                elif http_method == "POST":
                    return handle_add_document(event, patient_id)

            elif sub_resource == "attach-document" and http_method == "POST":
                return handle_attach_document(event, patient_id)

            elif sub_resource == "timeline" and http_method == "GET":
                timeline = patient_store.get_patient_timeline(patient_id)
                return _json_response(200, timeline)

            elif sub_resource == "findings" and http_method == "GET":
                findings = patient_store.get_patient_findings(patient_id)
                return _json_response(200, findings)

            elif sub_resource == "medications":
                if http_method == "GET":
                    meds = patient_store.get_patient_medications(patient_id)
                    return _json_response(200, meds)
                elif http_method == "POST":
                    body_str = event.get("body", "{}")
                    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
                    patient = patient_store.get_patient(patient_id)
                    if not patient:
                        return _json_response(404, {"error": f"Patient {patient_id} not found"})
                    curr_meds = patient.get("currentMedications", [])
                    curr_meds.append(payload)
                    patient_store.update_patient(patient_id, {"currentMedications": curr_meds})
                    return _json_response(200, patient_store.get_patient_medications(patient_id))

            elif sub_resource == "doctor-brief":
                if http_method == "GET":
                    brief = patient_store.get_doctor_brief(patient_id)
                    return _json_response(200, brief or {})
                elif http_method == "POST":
                    body_str = event.get("body", "{}")
                    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
                    # If payload already has full brief, save it
                    if isinstance(payload, dict) and payload.get("documentSummary") and payload.get("keyFindings"):
                        brief = patient_store.save_doctor_brief(patient_id, payload)
                        return _json_response(200, brief)

                    # Otherwise synthesize real grounded brief from patient's documents & findings
                    p = patient_store.get_patient(patient_id)
                    if not p:
                        return _json_response(404, {"error": f"Patient {patient_id} not found"})
                    docs = patient_store.get_documents_by_patient(patient_id)
                    findings = patient_store.get_patient_findings(patient_id)
                    user_notes = payload.get("userNotes", "") if isinstance(payload, dict) else ""
                    synthesized = gemini_service.synthesize_doctor_brief(
                        patient_info=p,
                        documents=docs,
                        findings=findings,
                        user_notes=user_notes,
                    )
                    saved = patient_store.save_doctor_brief(patient_id, synthesized)
                    return _json_response(200, saved)

            elif sub_resource == "emergency-profile":
                if http_method == "PUT":
                    return handle_update_emergency_profile(event, patient_id)
                elif http_method == "GET":
                    p = patient_store.get_patient(patient_id)
                    if not p:
                        return _json_response(404, {"error": f"Patient {patient_id} not found"})
                    return _json_response(200, {
                        "patientId": p["patientId"],
                        "name": p["name"],
                        "bloodGroup": p.get("bloodGroup"),
                        "severeAllergies": p.get("severeAllergies", []),
                        "currentMedications": p.get("currentMedications", []),
                        "importantConditions": p.get("importantConditions", []),
                        "emergencyContact": p.get("emergencyContact"),
                    })

            elif not sub_resource:
                if http_method == "GET":
                    p = patient_store.get_patient(patient_id)
                    if not p:
                        return _json_response(404, {"error": f"Patient {patient_id} not found"})
                    return _json_response(200, p)
                elif http_method in ("PATCH", "PUT"):
                    body_str = event.get("body", "{}")
                    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
                    updated = patient_store.update_patient(patient_id, payload)
                    if not updated:
                        return _json_response(404, {"error": f"Patient {patient_id} not found"})
                    return _json_response(200, updated)
                elif http_method == "DELETE":
                    deleted = patient_store.delete_patient(patient_id, user_id=user_id)
                    return _json_response(200, {"deleted": deleted})

        # Route 5: Base /patients collection
        if http_method == "GET":
            params = event.get("queryStringParameters") or {}
            q = params.get("q")
            patients = patient_store.list_patients(search_query=q, user_id=user_id)
            return _json_response(200, patients)

        elif http_method == "POST":
            return handle_create_patient(event, user_id=user_id)

        return _json_response(404, {"error": f"Endpoint not found: {http_method} {path}"})

    except Exception as exc:
        return _json_response(500, {"error": "Patient operation failed", "details": str(exc)})


def handle_create_patient(event: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    name = payload.get("name")
    if not name or not name.strip():
        return _json_response(400, {"error": "Patient name is required"})

    patient = patient_store.create_patient(
        data=payload,
        user_id=user_id or payload.get("userId"),
    )
    return _json_response(201, patient)


def handle_create_from_document(event: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    doc_id = payload.get("documentId")
    patient_name = payload.get("patientName") or "New Patient"
    dob = payload.get("dateOfBirth")
    notes = payload.get("notes", "")

    patient = patient_store.create_patient({
        "name": patient_name,
        "dateOfBirth": dob,
        "notes": notes,
        "relationship": "Other",
    }, user_id=user_id or payload.get("userId"))

    if doc_id:
        patient_store.attach_document_to_patient(doc_id, patient["patientId"])

    return _json_response(201, patient)


def handle_attach_document(event: Dict[str, Any], patient_id: str) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    doc_id = payload.get("documentId")
    if not doc_id:
        return _json_response(400, {"error": "documentId is required"})

    doc = patient_store.attach_document_to_patient(doc_id, patient_id)
    if not doc:
        return _json_response(404, {"error": f"Document {doc_id} or Patient {patient_id} not found"})

    return _json_response(200, {"success": True, "document": doc, "patientId": patient_id})


def handle_add_document(event: Dict[str, Any], patient_id: str) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str

    file_name = payload.get("originalFileName", payload.get("fileName", "Uploaded_Report.pdf"))
    display_name = payload.get("displayName", file_name)
    mime_type = payload.get("mimeType", "application/pdf")
    doc_type = payload.get("documentType", payload.get("type", "lab_report"))
    source = payload.get("sourceReference", payload.get("source", "Patient Upload"))
    summary = payload.get("summary", "Document processed.")
    findings_count = payload.get("findingsCount", 0)

    try:
        doc = patient_store.add_patient_document(
            patient_id=patient_id,
            doc_type=doc_type,
            file_name=file_name,
            display_name=display_name,
            mime_type=mime_type,
            source=source,
            verification_status="verified",
            findings_count=findings_count,
            summary=summary,
        )
        return _json_response(201, doc)
    except ValueError as e:
        return _json_response(400, {"error": str(e)})


def handle_identify_patient(event: Dict[str, Any]) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    doc_text = payload.get("documentText", "")
    info = patient_service.extract_patient_info_from_text(doc_text)
    return _json_response(200, info)


def handle_match_patient(event: Dict[str, Any]) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    name = payload.get("extractedName")
    dob = payload.get("dateOfBirth")
    target_id = payload.get("targetPatientId")
    headers = event.get("headers", {}) or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    match_result = patient_service.match_patient(name, extracted_dob=dob, target_patient_id=target_id, user_id=user_id)
    return _json_response(200, match_result)


def handle_update_emergency_profile(event: Dict[str, Any], patient_id: str) -> Dict[str, Any]:
    body_str = event.get("body", "{}")
    payload = json.loads(body_str) if isinstance(body_str, str) else body_str
    
    updated_p = patient_store.update_patient_emergency_profile(
        patient_id=patient_id,
        blood_group=payload.get("bloodGroup"),
        severe_allergies=payload.get("severeAllergies"),
        current_medications=payload.get("currentMedications"),
        important_conditions=payload.get("importantConditions"),
        emergency_contact=payload.get("emergencyContact"),
    )
    
    if not updated_p:
        return _json_response(404, {"error": f"Patient {patient_id} not found"})
        
    return _json_response(200, updated_p)
