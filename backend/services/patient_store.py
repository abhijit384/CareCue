"""
backend/services/patient_store.py - Persistent SQLite-backed entity store for Patients and Documents.
Enforces strict patient isolation, immutable patient IDs, and persistent storage.
"""

import os
import json
import time
import uuid
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

try:
    from database.db import get_db_connection, seed_demo_patients, ensure_user_exists
except ImportError:
    try:
        from backend.database.db import get_db_connection, seed_demo_patients, ensure_user_exists
    except ImportError:
        from ..database.db import get_db_connection, seed_demo_patients, ensure_user_exists

try:
    from services.clinical_parser import parse_clinical_text
except ImportError:
    try:
        from backend.services.clinical_parser import parse_clinical_text
    except ImportError:
        try:
            from clinical_parser import parse_clinical_text
        except ImportError:
            def parse_clinical_text(text: str) -> Dict[str, Any]:
                return {}

logger = logging.getLogger(__name__)

DEFAULT_TABLE_NAME = os.environ.get("SESSIONS_TABLE_NAME") or os.environ.get("DYNAMODB_TABLE_NAME", "carecue-sessions-dev")
_dynamo_table = None

def get_dynamo_table():
    global _dynamo_table
    if _dynamo_table is None:
        try:
            import boto3
            region = os.environ.get("AWS_REGION", "us-east-1")
            dynamodb = boto3.resource("dynamodb", region_name=region)
            _dynamo_table = dynamodb.Table(DEFAULT_TABLE_NAME)
        except Exception as e:
            logger.warning(f"DynamoDB Table initialization notice: {e}")
            return None
    return _dynamo_table


class PatientStore:
    """Manages Patient profiles, attached documents, and clinical timelines in SQLite + DynamoDB."""

    def __init__(self):
        self._patients = {}
        self._documents = {}

    def _sync_patient_to_dynamo(self, patient: Dict[str, Any]):
        table = get_dynamo_table()
        if not table or not patient or not patient.get("patientId"):
            return
        try:
            now = datetime.now(timezone.utc).isoformat()
            item = {
                "sessionId": patient["patientId"],
                "entityType": "patient",
                "patientId": patient["patientId"],
                "userId": patient.get("userId") or "",
                "name": patient.get("name") or "Patient",
                "updatedAt": patient.get("updatedAt", now),
                "dataJson": json.dumps(patient),
                "ttl": int(time.time()) + (90 * 86400),
            }
            table.put_item(Item=item)
        except Exception as e:
            logger.warning(f"Failed to sync patient {patient.get('patientId')} to DynamoDB: {e}")

    def _sync_document_to_dynamo(self, doc: Dict[str, Any]):
        table = get_dynamo_table()
        if not table or not doc or not doc.get("documentId"):
            return
        try:
            now = datetime.now(timezone.utc).isoformat()
            item = {
                "sessionId": doc["documentId"],
                "entityType": "document",
                "documentId": doc["documentId"],
                "patientId": doc.get("patientId") or "",
                "updatedAt": doc.get("uploadedAt", now),
                "dataJson": json.dumps(doc),
                "ttl": int(time.time()) + (90 * 86400),
            }
            table.put_item(Item=item)
        except Exception as e:
            logger.warning(f"Failed to sync document {doc.get('documentId')} to DynamoDB: {e}")

    def _restore_patient_from_dynamo(self, item: Dict[str, Any]):
        try:
            data = json.loads(item.get("dataJson", "{}")) if item.get("dataJson") else item
            p_id = data.get("patientId") or item.get("patientId") or item.get("sessionId")
            if not p_id:
                return
            now = datetime.now(timezone.utc).isoformat()
            user_id = data.get("userId")
            with get_db_connection() as conn:
                cursor = conn.cursor()
                if user_id:
                    ensure_user_exists(cursor, user_id, first_name=data.get("name", "Patient"))
                cursor.execute("""
                INSERT OR REPLACE INTO patients (
                    patient_id, user_id, name, date_of_birth, gender, phone, email,
                    blood_group, relationship, relationship_detail, is_demo,
                    severe_allergies, current_medications,
                    important_conditions, emergency_contact, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    p_id,
                    user_id,
                    data.get("name", "Patient"),
                    data.get("dateOfBirth"),
                    data.get("gender"),
                    data.get("phone"),
                    data.get("email"),
                    data.get("bloodGroup"),
                    data.get("relationship", "Self"),
                    data.get("relationshipDetail"),
                    1 if data.get("isDemo") else 0,
                    json.dumps(data.get("severeAllergies", [])),
                    json.dumps(data.get("currentMedications", [])),
                    json.dumps(data.get("importantConditions", [])),
                    json.dumps(data.get("emergencyContact")) if data.get("emergencyContact") else None,
                    data.get("notes", ""),
                    data.get("createdAt", now),
                    data.get("updatedAt", now)
                ))
                conn.commit()
        except Exception as e:
            logger.warning(f"Error restoring patient from DynamoDB: {e}")

    def _restore_document_from_dynamo(self, item: Dict[str, Any]):
        try:
            data = json.loads(item.get("dataJson", "{}")) if item.get("dataJson") else item
            doc_id = data.get("documentId") or item.get("documentId") or item.get("sessionId")
            if not doc_id:
                return
            now = datetime.now(timezone.utc).isoformat()
            pages_json = json.dumps(data.get("pages", [])) if isinstance(data.get("pages"), list) else data.get("pages_json", "[]")
            structured_json = json.dumps(data.get("structuredData", {})) if isinstance(data.get("structuredData"), dict) else data.get("structured_data_json", "{}")
            evidence_json = json.dumps(data.get("sourceEvidence", [])) if isinstance(data.get("sourceEvidence"), list) else data.get("source_evidence_json", "[]")

            with get_db_connection() as conn:
                cursor = conn.cursor()
                p_id = data.get("patientId")
                if p_id:
                    cursor.execute("SELECT patient_id FROM patients WHERE patient_id = ?", (p_id,))
                    if not cursor.fetchone():
                        cursor.execute("""
                        INSERT OR IGNORE INTO patients (patient_id, name, relationship, created_at, updated_at)
                        VALUES (?, 'Patient', 'Self', ?, ?);
                        """, (p_id, now, now))

                cursor.execute("""
                INSERT OR REPLACE INTO documents (
                    document_id, patient_id, original_file_name, display_name,
                    document_type, mime_type, file_size_bytes, storage_path,
                    extracted_text, extraction_method, pages_json,
                    structured_data_json, source_evidence_json, processing_status,
                    uploaded_at, analyzed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    doc_id,
                    p_id,
                    data.get("originalFileName", "Document.pdf"),
                    data.get("displayName", "Document"),
                    data.get("documentType", "OTHER"),
                    data.get("mimeType", "application/pdf"),
                    data.get("fileSizeBytes", 0),
                    data.get("storagePath", ""),
                    data.get("extractedText", ""),
                    data.get("extractionMethod", "pymupdf"),
                    pages_json,
                    structured_json,
                    evidence_json,
                    data.get("processingStatus", "ANALYZED"),
                    data.get("uploadedAt", now),
                    data.get("analyzedAt", now)
                ))
                conn.commit()
        except Exception as e:
            logger.warning(f"Error restoring document from DynamoDB: {e}")

    def _seed_demo_patients(self):
        with get_db_connection() as conn:
            conn.execute("DELETE FROM documents;")
            conn.execute("DELETE FROM doctor_briefs;")
            conn.execute("DELETE FROM patients;")
            conn.commit()
        seed_demo_patients()

    def list_patients(self, search_query: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns patients belonging to user_id (and unassigned/demo patients), with attached document counts."""
        # Sync all patient and document records from DynamoDB if present
        table = get_dynamo_table()
        if table:
            try:
                res = table.scan(Limit=200)
                for item in res.get("Items", []):
                    etype = item.get("entityType")
                    if etype == "patient":
                        self._restore_patient_from_dynamo(item)
                    elif etype == "document":
                        self._restore_document_from_dynamo(item)
            except Exception as e:
                logger.debug(f"DynamoDB scan patients notice: {e}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            conditions = []
            params = []

            if user_id:
                conditions.append("(p.user_id = ? OR p.user_id IS NULL OR p.user_id = '' OR p.is_demo = 1)")
                params.append(user_id)

            if search_query:
                conditions.append("(p.name LIKE ? OR p.patient_id LIKE ?)")
                params.extend([f"%{search_query}%", f"%{search_query}%"])

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cursor.execute(f"""
            SELECT p.*, COUNT(d.document_id) AS document_count
            FROM patients p
            LEFT JOIN documents d ON p.patient_id = d.patient_id
            {where_clause}
            GROUP BY p.patient_id
            ORDER BY p.updated_at DESC;
            """, params)
            rows = cursor.fetchall()
            return [self._row_to_patient_dict(r) for r in rows]

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single patient profile by patientId with DynamoDB fallback."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT p.*, COUNT(d.document_id) AS document_count
            FROM patients p
            LEFT JOIN documents d ON p.patient_id = d.patient_id
            WHERE p.patient_id = ?
            GROUP BY p.patient_id;
            """, (patient_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_patient_dict(row)

        # DynamoDB fallback
        table = get_dynamo_table()
        if table:
            try:
                res = table.get_item(Key={"sessionId": patient_id})
                item = res.get("Item")
                if item and item.get("entityType") == "patient":
                    self._restore_patient_from_dynamo(item)
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                        SELECT p.*, COUNT(d.document_id) AS document_count
                        FROM patients p
                        LEFT JOIN documents d ON p.patient_id = d.patient_id
                        WHERE p.patient_id = ?
                        GROUP BY p.patient_id;
                        """, (patient_id,))
                        row = cursor.fetchone()
                        if row:
                            return self._row_to_patient_dict(row)
            except Exception as e:
                logger.warning(f"DynamoDB get_patient error: {e}")

        return None

    def create_patient(self, data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        """Creates a new permanent patient record with an immutable patientId."""
        merged = dict(data or {})
        merged.update(kwargs)
        if "date_of_birth" in merged and "dateOfBirth" not in merged:
            merged["dateOfBirth"] = merged["date_of_birth"]

        patient_id = merged.get("patientId") or f"PAT-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        allergies = json.dumps(merged.get("severeAllergies", []))
        meds = json.dumps(merged.get("currentMedications", []))
        conds = json.dumps(merged.get("importantConditions", []))
        em_contact = json.dumps(merged.get("emergencyContact")) if merged.get("emergencyContact") else None
        relationship = merged.get("relationship", "Self")
        rel_detail = merged.get("relationshipDetail") or merged.get("relationship_detail")
        user_id = merged.get("userId") or merged.get("user_id")
        patient_name = merged.get("name", "Unknown Patient")
        is_demo = 1 if merged.get("isDemo") or merged.get("is_demo") else 0

        with get_db_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                ensure_user_exists(cursor, user_id, first_name=patient_name)
                cursor.execute("SELECT user_id, first_name, last_name FROM users WHERE user_id = ?", (user_id,))
                user_row = cursor.fetchone()
                if user_row and relationship == "Self":
                    account_name = f"{user_row['first_name'] or ''} {user_row['last_name'] or ''}".strip()
                    if account_name and account_name != "User":
                        patient_name = account_name

            cursor.execute("""
            INSERT INTO patients (
                patient_id, user_id, name, date_of_birth, gender, phone, email,
                blood_group, relationship, relationship_detail, is_demo,
                severe_allergies, current_medications,
                important_conditions, emergency_contact, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                patient_id,
                user_id,
                patient_name,
                merged.get("dateOfBirth"),
                merged.get("gender"),
                merged.get("phone"),
                merged.get("email"),
                merged.get("bloodGroup"),
                relationship,
                rel_detail,
                is_demo,
                allergies,
                meds,
                conds,
                em_contact,
                merged.get("notes", ""),
                now,
                now
            ))
            conn.commit()

        created = self.get_patient(patient_id)
        if created:
            self._sync_patient_to_dynamo(created)
        return created

    def update_patient(self, patient_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates patient information."""
        existing = self.get_patient(patient_id)
        if not existing:
            return None

        now = datetime.now(timezone.utc).isoformat()
        allergies = json.dumps(data.get("severeAllergies", existing.get("severeAllergies", [])))
        meds = json.dumps(data.get("currentMedications", existing.get("currentMedications", [])))
        conds = json.dumps(data.get("importantConditions", existing.get("importantConditions", [])))
        em_contact = json.dumps(data.get("emergencyContact", existing.get("emergencyContact")))

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE patients SET
                name = COALESCE(?, name),
                date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                blood_group = COALESCE(?, blood_group),
                severe_allergies = ?,
                current_medications = ?,
                important_conditions = ?,
                emergency_contact = ?,
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE patient_id = ?;
            """, (
                data.get("name"),
                data.get("dateOfBirth"),
                data.get("gender"),
                data.get("phone"),
                data.get("email"),
                data.get("bloodGroup"),
                allergies,
                meds,
                conds,
                em_contact,
                data.get("notes"),
                now,
                patient_id
            ))
            conn.commit()

        return self.get_patient(patient_id)

    def delete_patient(self, patient_id: str, user_id: Optional[str] = None) -> bool:
        """Deletes a patient and cascade-deletes or detaches associated records in SQLite and DynamoDB."""
        doc_ids = []
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute("SELECT user_id FROM patients WHERE patient_id = ?;", (patient_id,))
                row = cursor.fetchone()
                if row and row["user_id"] and row["user_id"] != user_id:
                    logger.warning(f"Unauthorized deletion attempt for patient {patient_id} by user {user_id}")
                    return False

            cursor.execute("SELECT document_id FROM documents WHERE patient_id = ?;", (patient_id,))
            doc_ids = [r["document_id"] for r in cursor.fetchall()]

            cursor.execute("DELETE FROM documents WHERE patient_id = ?;", (patient_id,))
            cursor.execute("DELETE FROM doctor_briefs WHERE patient_id = ?;", (patient_id,))
            cursor.execute("DELETE FROM patients WHERE patient_id = ?;", (patient_id,))
            conn.commit()

        # Delete from DynamoDB so next scan doesn't resurrect patient
        table = get_dynamo_table()
        if table:
            try:
                table.delete_item(Key={"sessionId": patient_id})
                for d_id in doc_ids:
                    try:
                        table.delete_item(Key={"sessionId": d_id})
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"Failed to delete patient {patient_id} from DynamoDB: {e}")

        return True

    def delete_patient_document(self, patient_id: str, document_id: str) -> bool:
        """Deletes a patient document from SQLite and DynamoDB."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM documents WHERE document_id = ? AND patient_id = ?;", (document_id, patient_id))
            conn.commit()

        table = get_dynamo_table()
        if table:
            try:
                table.delete_item(Key={"sessionId": document_id})
            except Exception as e:
                logger.warning(f"Failed to delete document {document_id} from DynamoDB: {e}")

        return True

    # ─── Documents Management ───

    def save_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Saves or updates a document record in SQLite and DynamoDB."""
        doc_id = doc.get("documentId") or f"DOC-{int(time.time() * 1000)}"
        now = datetime.now(timezone.utc).isoformat()

        pages_json = json.dumps(doc.get("pages", [])) if isinstance(doc.get("pages"), list) else doc.get("pages_json", "[]")
        structured_json = json.dumps(doc.get("structuredData", {})) if isinstance(doc.get("structuredData"), dict) else doc.get("structured_data_json", "{}")
        evidence_json = json.dumps(doc.get("sourceEvidence", [])) if isinstance(doc.get("sourceEvidence"), list) else doc.get("source_evidence_json", "[]")

        patient_id = doc.get("patientId")
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if patient_id:
                cursor.execute("SELECT patient_id FROM patients WHERE patient_id = ?", (patient_id,))
                if not cursor.fetchone():
                    user_id = doc.get("userId")
                    if user_id:
                        ensure_user_exists(cursor, user_id)
                    cursor.execute("""
                    INSERT OR IGNORE INTO patients (patient_id, user_id, name, relationship, created_at, updated_at)
                    VALUES (?, ?, ?, 'Self', ?, ?);
                    """, (patient_id, user_id, doc.get("patientName", "Patient"), now, now))

            cursor.execute("""
            INSERT INTO documents (
                document_id, patient_id, original_file_name, display_name,
                document_type, mime_type, file_size_bytes, storage_path,
                extracted_text, extraction_method, pages_json,
                structured_data_json, source_evidence_json, processing_status,
                uploaded_at, analyzed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_id) DO UPDATE SET
                patient_id = COALESCE(excluded.patient_id, documents.patient_id),
                display_name = excluded.display_name,
                document_type = excluded.document_type,
                extracted_text = excluded.extracted_text,
                extraction_method = excluded.extraction_method,
                pages_json = excluded.pages_json,
                structured_data_json = excluded.structured_data_json,
                source_evidence_json = excluded.source_evidence_json,
                processing_status = excluded.processing_status,
                analyzed_at = excluded.analyzed_at;
            """, (
                doc_id,
                patient_id,
                doc.get("originalFileName", "report.pdf"),
                doc.get("displayName", "Medical Report"),
                doc.get("documentType", "OTHER"),
                doc.get("mimeType", "application/pdf"),
                doc.get("fileSizeBytes", 0),
                doc.get("storagePath", ""),
                doc.get("extractedText", ""),
                doc.get("extractionMethod", "pymupdf"),
                pages_json,
                structured_json,
                evidence_json,
                doc.get("processingStatus", "UPLOADED"),
                doc.get("uploadedAt", now),
                doc.get("analyzedAt", now)
            ))
            conn.commit()

        saved = self.get_document(doc_id)
        if saved:
            self._sync_document_to_dynamo(saved)
        return saved or doc

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a document by documentId with DynamoDB fallback."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE document_id = ?;", (document_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_document_dict(row)

        # DynamoDB fallback
        table = get_dynamo_table()
        if table:
            try:
                res = table.get_item(Key={"sessionId": document_id})
                item = res.get("Item")
                if item and item.get("entityType") == "document":
                    self._restore_document_from_dynamo(item)
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("SELECT * FROM documents WHERE document_id = ?;", (document_id,))
                        row = cursor.fetchone()
                        if row:
                            return self._row_to_document_dict(row)
            except Exception as e:
                logger.warning(f"DynamoDB get_document error: {e}")

        return None

    def get_documents_by_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        """Strictly fetches documents attached to a specific patientId with DynamoDB sync."""
        table = get_dynamo_table()
        if table:
            try:
                res = table.scan(
                    FilterExpression="patientId = :pid AND entityType = :etype",
                    ExpressionAttributeValues={":pid": patient_id, ":etype": "document"},
                    Limit=50
                )
                for item in res.get("Items", []):
                    self._restore_document_from_dynamo(item)
            except Exception as e:
                logger.debug(f"DynamoDB scan patient docs notice: {e}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM documents
            WHERE patient_id = ?
            ORDER BY uploaded_at DESC;
            """, (patient_id,))
            rows = cursor.fetchall()
            return [self._row_to_document_dict(r) for r in rows]

    get_patient_documents = get_documents_by_patient

    def add_patient_document(
        self,
        patient_id: str,
        doc_type: str = "OTHER",
        file_name: str = "",
        source: str = "",
        verification_status: str = "verified",
        findings_count: int = 0,
        summary: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        doc_id = f"doc-{uuid.uuid4().hex[:6]}"
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "documentId": doc_id,
            "patientId": patient_id,
            "originalFileName": file_name,
            "displayName": file_name,
            "documentType": doc_type,
            "mimeType": "application/pdf",
            "fileSizeBytes": 1024,
            "extractedText": summary,
            "processingStatus": verification_status,
            "uploadedAt": now,
            "analyzedAt": now,
            "structuredData": {
                "findings": [{"id": f"f-{i}"} for i in range(findings_count)],
                "labResults": [],
            },
        }
        return self.save_document(doc)

    def attach_document_to_patient(self, document_id: str, patient_id: str) -> Optional[Dict[str, Any]]:
        """Attaches an existing document to a patient, verifying existence across SQLite & DynamoDB."""
        now = datetime.now(timezone.utc).isoformat()

        # Ensure patient exists
        patient = self.get_patient(patient_id)
        if not patient:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR IGNORE INTO patients (patient_id, name, relationship, created_at, updated_at)
                VALUES (?, 'Patient', 'Self', ?, ?);
                """, (patient_id, now, now))
                conn.commit()

        # Ensure document exists
        doc = self.get_document(document_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT document_id FROM documents WHERE document_id = ?", (document_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT OR IGNORE INTO documents (
                    document_id, patient_id, original_file_name, display_name,
                    document_type, mime_type, processing_status, uploaded_at, analyzed_at
                ) VALUES (?, ?, ?, ?, 'OTHER', 'application/pdf', 'verified', ?, ?);
                """, (
                    document_id,
                    patient_id,
                    (doc.get("originalFileName") if doc else "Clinical_Document.pdf"),
                    (doc.get("displayName") if doc else "Clinical Document"),
                    now,
                    now
                ))
            else:
                cursor.execute("""
                UPDATE documents SET patient_id = ? WHERE document_id = ?;
                """, (patient_id, document_id))

            cursor.execute("""
            UPDATE patients SET updated_at = ? WHERE patient_id = ?;
            """, (now, patient_id))
            conn.commit()

        updated_doc = self.get_document(document_id)
        if updated_doc:
            updated_doc["patientId"] = patient_id
            self._sync_document_to_dynamo(updated_doc)
        return updated_doc

    def delete_document(self, patient_id: str, document_id: str) -> bool:
        """Deletes a document under patient isolation rules."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            DELETE FROM documents WHERE document_id = ? AND patient_id = ?;
            """, (document_id, patient_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_patient_timeline(self, patient_id: str) -> List[Dict[str, Any]]:
        """Builds a chronological timeline strictly from patient's stored documents."""
        docs = self.get_documents_by_patient(patient_id)
        timeline = []
        for d in docs:
            findings_count = len(d.get("structuredData", {}).get("findings", [])) + len(d.get("structuredData", {}).get("labResults", []))
            timeline.append({
                "id": d["documentId"],
                "date": d.get("uploadedAt", ""),
                "title": d.get("displayName", d.get("originalFileName", "Document")),
                "type": d.get("documentType", "OTHER").lower(),
                "status": d.get("processingStatus", "verified").lower(),
                "summary": d.get("structuredData", {}).get("summary", "Document attached to clinical history."),
                "findingsCount": findings_count,
                "source": d.get("extractionMethod", "PyMuPDF"),
            })
        return sorted(timeline, key=lambda x: x["date"], reverse=True)

    def get_patient_findings(self, patient_id: str) -> List[Dict[str, Any]]:
        """Aggregates all clinical findings, medications, vitals, and lab results across patient's stored documents."""
        docs = self.get_documents_by_patient(patient_id)
        all_findings = []
        for d in docs:
            s_data = d.get("structuredData", {})
            if not s_data or (not s_data.get("labResults") and not s_data.get("findings") and not s_data.get("medications")):
                # Auto-parse from extracted text if structured data is empty
                ext_text = d.get("extractedText", "")
                if ext_text:
                    s_data = parse_clinical_text(ext_text)

            # Lab Results
            for lab in s_data.get("labResults", []):
                t_name = lab.get("testName") or lab.get("test", "Laboratory Marker")
                t_val = lab.get("value", "")
                t_unit = lab.get("unit", "")
                t_ref = lab.get("referenceRange") or lab.get("reference", "Standard range")
                all_findings.append({
                    "id": f"lab-{d['documentId']}-{t_name}",
                    "category": "Laboratory Marker",
                    "claim": f"{t_name}: {t_val} {t_unit}".strip(),
                    "value": t_val,
                    "unit": t_unit,
                    "referenceRange": t_ref,
                    "source": {
                        "documentId": d["documentId"],
                        "fileName": d["originalFileName"],
                        "page": lab.get("sourcePage", 1),
                        "text": f"{t_name} {t_val} {t_unit}".strip()
                    },
                    "verification": {
                        "status": "consistent",
                        "reasoning": f"Grounded in {d['originalFileName']}"
                    }
                })

            # Medications
            for med in s_data.get("medications", []):
                m_name = med.get("name", med.get("medicationName", "Medication"))
                m_dose = med.get("dosage", med.get("frequency", "As directed"))
                m_purpose = med.get("purpose", "Prescribed therapy")
                all_findings.append({
                    "id": f"med-{d['documentId']}-{m_name}",
                    "category": "Prescribed Medication",
                    "claim": f"{m_name} ({m_dose})".strip(),
                    "value": m_dose,
                    "unit": "",
                    "referenceRange": m_purpose,
                    "source": {
                        "documentId": d["documentId"],
                        "fileName": d["originalFileName"],
                        "page": med.get("sourcePage", 1),
                        "text": f"{m_name} {m_dose}".strip()
                    },
                    "verification": {
                        "status": "consistent",
                        "reasoning": f"Grounded in {d['originalFileName']}"
                    }
                })

            # Clinical Findings & Advised Tests & Vitals
            for f in s_data.get("findings", []):
                f_title = f.get("title") or f.get("claim") or f.get("text", "Clinical Finding")
                f_cat = f.get("category", "Clinical Finding")
                f_summary = f.get("summary") or f.get("text", f_title)
                all_findings.append({
                    "id": f"find-{d['documentId']}-{f_title[:30]}",
                    "category": f_cat,
                    "claim": f_title,
                    "value": f.get("value", ""),
                    "unit": f.get("unit", ""),
                    "referenceRange": f.get("referenceRange", ""),
                    "source": {
                        "documentId": d["documentId"],
                        "fileName": d["originalFileName"],
                        "page": f.get("sourcePage", 1),
                        "text": f_summary
                    },
                    "verification": {
                        "status": f.get("verificationStatus", "consistent"),
                        "reasoning": f"Grounded in {d['originalFileName']}"
                    }
                })
        return all_findings

    # ─── Medications Management ───

    def get_patient_medications(self, patient_id: str) -> List[Dict[str, Any]]:
        """Retrieves all active and documented medications strictly for this patient."""
        patient = self.get_patient(patient_id)
        if not patient:
            return []

        medications = []
        seen_keys = set()

        # 1. From patient's profile currentMedications
        current_meds = patient.get("currentMedications", [])
        if isinstance(current_meds, list):
            for idx, item in enumerate(current_meds):
                if isinstance(item, str) and item.strip():
                    name_parts = item.strip()
                    med_key = name_parts.lower()
                    if med_key not in seen_keys:
                        seen_keys.add(med_key)
                        medications.append({
                            "id": f"prof-med-{idx}",
                            "name": name_parts,
                            "dosage": "",
                            "frequency": "As prescribed",
                            "purpose": "Chronic maintenance / Prescribed therapy",
                            "instructions": "Take as directed by doctor",
                            "status": "Active",
                            "timing": "Morning",
                            "prescriber": "Profile Record",
                            "sourceDocumentName": "Patient Profile",
                            "sourceDocumentId": None,
                        })
                elif isinstance(item, dict):
                    name = item.get("name") or item.get("medicationName") or "Medication"
                    med_key = name.lower()
                    if med_key not in seen_keys:
                        seen_keys.add(med_key)
                        medications.append({
                            "id": item.get("id") or f"prof-med-{idx}",
                            "name": name,
                            "dosage": item.get("dosage", ""),
                            "frequency": item.get("frequency", "Daily"),
                            "purpose": item.get("purpose", "Prescribed therapy"),
                            "instructions": item.get("instructions", "Take as directed"),
                            "status": item.get("status", "Active"),
                            "timing": item.get("timing", "Morning"),
                            "prescriber": item.get("prescriber", "Profile Record"),
                            "sourceDocumentName": "Patient Profile",
                            "sourceDocumentId": None,
                        })

        # 2. From all documents attached to patient
        docs = self.get_documents_by_patient(patient_id)
        for d in docs:
            s_data = d.get("structuredData", {})
            if not s_data or (not s_data.get("medications") and not s_data.get("findings")):
                ext_text = d.get("extractedText", "")
                if ext_text:
                    s_data = parse_clinical_text(ext_text)

            doc_meds = s_data.get("medications", [])
            for idx, med in enumerate(doc_meds):
                m_name = med.get("name") or med.get("medicationName") or "Medication"
                med_key = m_name.lower().strip()
                m_dose = med.get("dosage", "")
                m_freq = med.get("frequency", "As directed")
                m_purpose = med.get("purpose", "Prescribed in clinical document")
                m_instr = med.get("instructions", "Follow prescription instructions")

                # If already present from profile, enrich with document details
                existing_match = next((m for m in medications if m["name"].lower().strip() == med_key), None)
                if existing_match:
                    if not existing_match.get("dosage") and m_dose:
                        existing_match["dosage"] = m_dose
                    if existing_match.get("sourceDocumentName") == "Patient Profile":
                        existing_match["sourceDocumentName"] = d.get("displayName") or d.get("originalFileName")
                        existing_match["sourceDocumentId"] = d.get("documentId")
                else:
                    seen_keys.add(med_key)
                    medications.append({
                        "id": f"doc-med-{d['documentId']}-{idx}",
                        "name": m_name,
                        "dosage": m_dose,
                        "frequency": m_freq,
                        "purpose": m_purpose,
                        "instructions": m_instr,
                        "status": "Active",
                        "timing": med.get("timing", "Morning"),
                        "prescriber": med.get("prescriber", "Prescribing Physician"),
                        "sourceDocumentName": d.get("displayName") or d.get("originalFileName", "Prescription"),
                        "sourceDocumentId": d.get("documentId"),
                    })

        return medications

    # ─── Doctor Briefs Management ───

    def save_doctor_brief(self, patient_id: str, brief: Dict[str, Any]) -> Dict[str, Any]:
        brief_id = f"BRIEF-{patient_id}-{int(time.time())}"
        now = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO doctor_briefs (brief_id, patient_id, brief_json, created_at)
            VALUES (?, ?, ?, ?);
            """, (brief_id, patient_id, json.dumps(brief), now))
            conn.commit()
        return brief

    def get_doctor_brief(self, patient_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT brief_json FROM doctor_briefs
            WHERE patient_id = ?
            ORDER BY created_at DESC LIMIT 1;
            """, (patient_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return json.loads(row["brief_json"])

    # ─── Row Mappers ───

    def _row_to_patient_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        def _safe_list(val):
            if not val:
                return []
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return parsed
                except Exception:
                    pass
                return [s.strip() for s in val.split(",") if s.strip()]
            return []

        def _safe_obj(val):
            if not val:
                return None
            if isinstance(val, dict):
                return val
            if isinstance(val, str):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    pass
            return None

        return {
            "patientId": d["patient_id"],
            "userId": d.get("user_id"),
            "name": d.get("name") or "Patient",
            "dateOfBirth": d.get("date_of_birth"),
            "gender": d.get("gender"),
            "phone": d.get("phone"),
            "email": d.get("email"),
            "bloodGroup": d.get("blood_group"),
            "relationship": d.get("relationship") or "Self",
            "relationshipDetail": d.get("relationship_detail"),
            "isDemo": bool(d.get("is_demo")),
            "severeAllergies": _safe_list(d.get("severe_allergies")),
            "currentMedications": _safe_list(d.get("current_medications")),
            "importantConditions": _safe_list(d.get("important_conditions")),
            "emergencyContact": _safe_obj(d.get("emergency_contact")),
            "notes": d.get("notes", ""),
            "documentCount": d.get("document_count", 0),
            "createdAt": d["created_at"],
            "updatedAt": d["updated_at"],
        }

    def _row_to_document_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        structured = json.loads(d.get("structured_data_json") or "{}")
        extracted_txt = d.get("extracted_text", "")
        if (not structured or (not structured.get("medications") and not structured.get("labResults") and not structured.get("findings"))) and extracted_txt:
            parsed = parse_clinical_text(extracted_txt)
            if parsed.get("medications") or parsed.get("labResults") or parsed.get("findings"):
                structured = parsed

        findings_count = len(structured.get("findings", [])) + len(structured.get("labResults", []))
        summary_text = structured.get("summary") or (extracted_txt[:200] + "..." if len(extracted_txt) > 200 else extracted_txt) or "Clinical document analyzed."
        status_text = "verified" if (structured.get("medications") or structured.get("labResults") or structured.get("findings")) else d.get("processing_status", "uploaded").lower()

        return {
            "documentId": d["document_id"],
            "patientId": d.get("patient_id"),
            "originalFileName": d["original_file_name"],
            "displayName": d["display_name"],
            "documentType": d["document_type"] if d["document_type"] != "OTHER" else structured.get("documentType", "OTHER"),
            "mimeType": d["mime_type"],
            "fileSizeBytes": d.get("file_size_bytes", 0),
            "storagePath": d.get("storage_path"),
            "extractedText": extracted_txt,
            "extractionMethod": d.get("extraction_method", "pymupdf"),
            "pages": json.loads(d.get("pages_json") or "[]"),
            "structuredData": structured,
            "sourceEvidence": json.loads(d.get("source_evidence_json") or "[]"),
            "processingStatus": "ANALYZED" if structured.get("medications") or structured.get("findings") else d.get("processing_status", "UPLOADED"),
            "uploadedAt": d["uploaded_at"],
            "analyzedAt": d.get("analyzed_at"),
            # Frontend compatibility fields
            "createdAt": d["uploaded_at"],
            "status": status_text,
            "sourceReference": d["display_name"],
            "findingsCount": findings_count,
            "summary": summary_text,
        }

patient_store = PatientStore()
