"""
backend/database/db.py - SQLite database engine and repository for CareCue.
Provides permanent persistence for Users, Email OTPs, Patients, Documents,
Extracted Text, Structured Findings, Doctor Briefs, and Timelines.
"""

import os
import json
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or os.environ.get("LAMBDA_TASK_ROOT"):
    DB_PATH = os.environ.get("DB_PATH", "/tmp/carecue.db")
    DOCUMENTS_STORAGE_DIR = os.environ.get("DOCUMENTS_STORAGE_DIR", "/tmp/documents")
else:
    DB_PATH = os.environ.get("DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "carecue.db")))
    DOCUMENTS_STORAGE_DIR = os.environ.get("DOCUMENTS_STORAGE_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "documents")))

try:
    os.makedirs(DOCUMENTS_STORAGE_DIR, exist_ok=True)
except OSError:
    pass

_db_initialized = False

def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row access."""
    global _db_initialized
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    if not _db_initialized:
        _db_initialized = True
        try:
            init_db(conn)
        except Exception as e:
            logger.warning(f"Auto init_db notice: {e}")
    return conn

def init_db(conn: Optional[sqlite3.Connection] = None):
    """Initializes tables. Never seeds demo patients automatically."""
    close_when_done = False
    if conn is None:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        close_when_done = True

    try:
        cursor = conn.cursor()

        # Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Email OTPs Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_otps (
            otp_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            purpose TEXT NOT NULL, -- 'signup' or 'reset'
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 5,
            resend_available_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # Patients Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            patient_id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT NOT NULL,
            date_of_birth TEXT,
            gender TEXT,
            phone TEXT,
            email TEXT,
            blood_group TEXT,
            relationship TEXT DEFAULT 'Self', -- Self, Mother, Father, Brother, Sister, Spouse, Child, Grandparent, Other
            relationship_detail TEXT, -- e.g. Aunt, Guardian, Friend
            is_demo INTEGER DEFAULT 0, -- 1 if synthetic demonstration patient
            severe_allergies TEXT, -- JSON array
            current_medications TEXT, -- JSON array
            important_conditions TEXT, -- JSON array
            emergency_contact TEXT, -- JSON object
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
        );
        """)

        # Migrate patients table if columns missing
        for col, col_def in [
            ("user_id", "TEXT"),
            ("relationship", "TEXT DEFAULT 'Self'"),
            ("relationship_detail", "TEXT"),
            ("is_demo", "INTEGER DEFAULT 0"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE patients ADD COLUMN {col} {col_def};")
            except sqlite3.OperationalError:
                pass  # Column already exists

        # Documents Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            document_id TEXT PRIMARY KEY,
            patient_id TEXT,
            original_file_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            document_type TEXT NOT NULL, -- LAB_REPORT, PRESCRIPTION, MEDICAL_REPORT, DISCHARGE_SUMMARY, OTHER
            mime_type TEXT NOT NULL,
            file_size_bytes INTEGER DEFAULT 0,
            storage_path TEXT,
            extracted_text TEXT,
            extraction_method TEXT DEFAULT 'pymupdf', -- pymupdf, vision, ocr
            pages_json TEXT, -- JSON array of {page: int, text: str}
            structured_data_json TEXT, -- JSON object (medications, findings, labResults, conditions, etc.)
            source_evidence_json TEXT, -- JSON array of citations
            processing_status TEXT DEFAULT 'UPLOADED', -- UPLOADED, EXTRACTING, EXTRACTED, ANALYZING, ANALYZED, VERIFIED, FAILED
            uploaded_at TEXT NOT NULL,
            analyzed_at TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE SET NULL
        );
        """)

        # Doctor Briefs Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctor_briefs (
            brief_id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            brief_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
        );
        """)

        conn.commit()
    finally:
        if close_when_done:
            conn.close()

def ensure_user_exists(cursor: sqlite3.Cursor, user_id: str, first_name: str = "User", last_name: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT OR IGNORE INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'placeholder_hash', 1, ?, ?);
    """, (user_id, first_name, last_name, f"{user_id.lower()}@carecue.local", now, now))

def seed_demo_patients(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Explicitly loads synthetic demo patient records AND sample clinical documents ONLY
    when the user clicks 'Load Demo Patient' or 'Load Demo Data'. All records are marked is_demo = 1.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        valid_user_id = user_id if user_id else None
        if valid_user_id:
            ensure_user_exists(cursor, valid_user_id)

        pat1_id = f"PAT-DEMO-RAHUL-{valid_user_id[:8]}" if valid_user_id else "PAT-A1B2C3D4"
        pat2_id = f"PAT-DEMO-PRIYA-{valid_user_id[:8]}" if valid_user_id else "PAT-E5F6G7H8"

        now = datetime.now(timezone.utc).isoformat()
        demo_patients = [
            (
                pat1_id,
                valid_user_id,
                "Rahul Sharma",
                "1982-07-14",
                "Male",
                "+1 (555) 234-5678",
                "rahul.sharma@example.com",
                "O+",
                "Self",
                None,
                1,  # is_demo
                json.dumps(["Penicillin"]),
                json.dumps(["Metformin 500mg", "Atorvastatin 10mg"]),
                json.dumps(["Mild Hypertension", "Prediabetes"]),
                json.dumps({"name": "Priya Sharma", "phone": "+1 (555) 345-6789", "relationship": "Spouse"}),
                "Executive metabolic checkup & prescription monitoring (Synthetic Demo)",
                now,
                now
            ),
            (
                pat2_id,
                valid_user_id,
                "Priya Sharma",
                "1986-11-20",
                "Female",
                "+1 (555) 876-5432",
                "priya.sharma@example.com",
                "A+",
                "Spouse",
                None,
                1,  # is_demo
                json.dumps(["Sulfa drugs"]),
                json.dumps(["Amlodipine 5mg", "Vitamin D3 2000 IU"]),
                json.dumps(["Essential Hypertension", "Mild Osteopenia"]),
                json.dumps({"name": "Rahul Sharma", "phone": "+1 (555) 234-5678", "relationship": "Spouse"}),
                "Cardiovascular & bone density wellness review (Synthetic Demo)",
                now,
                now
            )
        ]

        cursor.executemany("""
        INSERT OR REPLACE INTO patients (
            patient_id, user_id, name, date_of_birth, gender, phone, email, blood_group,
            relationship, relationship_detail, is_demo,
            severe_allergies, current_medications, important_conditions,
            emergency_contact, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, demo_patients)

        # ─── Seed Demo Documents for Instant Clinical Analysis ───
        doc1_id = f"DOC-DEMO-RAHUL-01-{valid_user_id[:8]}" if valid_user_id else "DOC-DEMO-RAHUL-01"
        doc2_id = f"DOC-DEMO-PRIYA-01-{valid_user_id[:8]}" if valid_user_id else "DOC-DEMO-PRIYA-01"

        doc1_text = (
            "METROPOLITAN CLINICAL LABORATORIES\n"
            "Patient: Rahul Sharma | DOB: 14-Jul-1982 | Age: 42 | Gender: Male\n"
            "Referring Physician: Dr. Sunita Rao, MD\n"
            "Date of Collection: 10-Jan-2026\n\n"
            "COMPLETE LIPID & METABOLIC PANEL\n"
            "• Total Cholesterol: 220 mg/dL (Reference: < 200 mg/dL) [HIGH]\n"
            "• Triglycerides: 185 mg/dL (Reference: < 150 mg/dL) [HIGH]\n"
            "• HDL Cholesterol: 42 mg/dL (Reference: > 40 mg/dL) [NORMAL]\n"
            "• LDL Cholesterol: 141 mg/dL (Reference: < 100 mg/dL) [HIGH]\n"
            "• Fasting Blood Glucose: 112 mg/dL (Reference: 70-99 mg/dL) [HIGH / Impaired Fasting Glucose]\n"
            "• HbA1c: 6.1 % (Reference: < 5.7 %) [PREDIABETES RANGE]\n\n"
            "CURRENT MEDICATIONS & PLAN:\n"
            "1. Metformin 500mg - 1 tablet orally twice daily with meals.\n"
            "2. Atorvastatin 10mg - 1 tablet orally once daily at bedtime.\n"
            "Clinical Notes: Patient demonstrates mild borderline dyslipidemia and prediabetes. Advised dietary lifestyle modification and repeat lipid panel in 90 days."
        )

        doc1_structured = {
            "documentType": "LAB_REPORT",
            "patient": {"name": "Rahul Sharma", "age": 42, "dob": "1982-07-14", "gender": "Male"},
            "medications": [
                {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily", "purpose": "Prediabetes / Glycemic control"},
                {"name": "Atorvastatin", "dosage": "10mg", "frequency": "once daily at bedtime", "purpose": "Hyperlipidemia"}
            ],
            "labResults": [
                {"test": "Total Cholesterol", "value": "220", "unit": "mg/dL", "status": "HIGH", "reference": "< 200 mg/dL"},
                {"test": "Triglycerides", "value": "185", "unit": "mg/dL", "status": "HIGH", "reference": "< 150 mg/dL"},
                {"test": "HDL Cholesterol", "value": "42", "unit": "mg/dL", "status": "NORMAL", "reference": "> 40 mg/dL"},
                {"test": "LDL Cholesterol", "value": "141", "unit": "mg/dL", "status": "HIGH", "reference": "< 100 mg/dL"},
                {"test": "Fasting Blood Glucose", "value": "112", "unit": "mg/dL", "status": "HIGH", "reference": "70-99 mg/dL"},
                {"test": "HbA1c", "value": "6.1", "unit": "%", "status": "HIGH", "reference": "< 5.7 %"}
            ],
            "conditions": ["Mild Hypertension", "Prediabetes", "Borderline Dyslipidemia"],
            "findings": [
                {"title": "Elevated LDL Cholesterol (141 mg/dL)", "category": "Cardiovascular", "severity": "MODERATE", "summary": "Above optimal range of 100 mg/dL.", "actionItem": "Continue statin and reduce dietary saturated fats."},
                {"title": "Impaired Fasting Glucose (112 mg/dL) & HbA1c (6.1%)", "category": "Endocrine", "severity": "MODERATE", "summary": "Consistent with prediabetes.", "actionItem": "Maintain Metformin 500mg BID and 30 min daily aerobic exercise."}
            ]
        }

        doc2_text = (
            "APEX MULTISPECIALTY CLINIC\n"
            "Patient: Priya Sharma | DOB: 20-Nov-1986 | Age: 39 | Gender: Female\n"
            "Attending: Dr. Arun Patel, MD (Cardiology)\n"
            "Date of Consultation: 15-Feb-2026\n\n"
            "CLINICAL CONSULTATION & PRESCRIPTION\n"
            "Diagnosis: Essential Hypertension (Stage 1), Mild Osteopenia (Spine T-score -1.4)\n\n"
            "PRESCRIBED MEDICATIONS:\n"
            "1. Amlodipine 5mg - Take 1 tablet orally every morning.\n"
            "2. Vitamin D3 2000 IU (Cholecalciferol) - 1 capsule daily with food.\n"
            "3. Calcium Carbonate 500mg - 1 tablet daily.\n\n"
            "Allergies: Sulfa drugs (causes maculopapular rash).\n"
            "Vitals: BP 128/82 mmHg, HR 74 bpm, Weight 62 kg."
        )

        doc2_structured = {
            "documentType": "PRESCRIPTION",
            "patient": {"name": "Priya Sharma", "age": 39, "dob": "1986-11-20", "gender": "Female"},
            "medications": [
                {"name": "Amlodipine", "dosage": "5mg", "frequency": "every morning", "purpose": "Essential Hypertension"},
                {"name": "Vitamin D3", "dosage": "2000 IU", "frequency": "once daily with food", "purpose": "Bone health & Osteopenia"},
                {"name": "Calcium Carbonate", "dosage": "500mg", "frequency": "once daily", "purpose": "Bone mineral support"}
            ],
            "labResults": [
                {"test": "Blood Pressure", "value": "128/82", "unit": "mmHg", "status": "NORMAL", "reference": "< 130/80 mmHg"},
                {"test": "Spine DEXA T-Score", "value": "-1.4", "unit": "SD", "status": "LOW", "reference": "> -1.0 SD"}
            ],
            "conditions": ["Essential Hypertension", "Mild Osteopenia"],
            "findings": [
                {"title": "Controlled Blood Pressure on Amlodipine", "category": "Cardiovascular", "severity": "MILD", "summary": "BP is within target at 128/82 mmHg.", "actionItem": "Continue morning dosing and regular home BP logging."},
                {"title": "Osteopenia Bone Mineral Density", "category": "Musculoskeletal", "severity": "MILD", "summary": "T-score -1.4 indicates mild bone density reduction.", "actionItem": "Maintain Vitamin D3 + Calcium supplementation."}
            ]
        }

        demo_docs = [
            (
                doc1_id,
                pat1_id,
                "Metabolic_Lipid_Panel_Report.pdf",
                "Metabolic & Lipid Panel Report (Synthetic Demo)",
                "LAB_REPORT",
                "application/pdf",
                124500,
                None,
                doc1_text,
                "pymupdf",
                json.dumps([{"page": 1, "text": doc1_text}]),
                json.dumps(doc1_structured),
                json.dumps(["Lipid Panel: Total Cholesterol 220 mg/dL", "HbA1c: 6.1%"]),
                "ANALYZED",
                now,
                now
            ),
            (
                doc2_id,
                pat2_id,
                "Cardiovascular_Prescription_Review.pdf",
                "Cardiovascular & Bone Health Prescription (Synthetic Demo)",
                "PRESCRIPTION",
                "application/pdf",
                98200,
                None,
                doc2_text,
                "pymupdf",
                json.dumps([{"page": 1, "text": doc2_text}]),
                json.dumps(doc2_structured),
                json.dumps(["Prescription: Amlodipine 5mg", "Spine DEXA T-Score: -1.4"]),
                "ANALYZED",
                now,
                now
            )
        ]

        cursor.executemany("""
        INSERT OR REPLACE INTO documents (
            document_id, patient_id, original_file_name, display_name, document_type,
            mime_type, file_size_bytes, storage_path, extracted_text, extraction_method,
            pages_json, structured_data_json, source_evidence_json, processing_status,
            uploaded_at, analyzed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, demo_docs)

        conn.commit()

        if valid_user_id:
            cursor.execute("SELECT * FROM patients WHERE is_demo = 1 AND user_id = ?", (valid_user_id,))
        else:
            cursor.execute("SELECT * FROM patients WHERE is_demo = 1")
        try:
            from services.patient_store import patient_store
        except ImportError:
            try:
                from backend.services.patient_store import patient_store
            except ImportError:
                from ..services.patient_store import patient_store
        return [patient_store._row_to_patient_dict(r) for r in rows]

def clear_demo_patients(user_id: Optional[str] = None):
    """Removes synthetic demo patients and their demo documents for the given user (or all if none specified)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT patient_id FROM patients WHERE is_demo = 1 AND user_id = ?", (user_id,))
            p_ids = [r["patient_id"] for r in cursor.fetchall()]
            if p_ids:
                placeholders = ",".join("?" for _ in p_ids)
                cursor.execute(f"DELETE FROM documents WHERE patient_id IN ({placeholders})", p_ids)
                cursor.execute(f"DELETE FROM doctor_briefs WHERE patient_id IN ({placeholders})", p_ids)
            cursor.execute("DELETE FROM patients WHERE is_demo = 1 AND user_id = ?", (user_id,))
        else:
            cursor.execute("SELECT patient_id FROM patients WHERE is_demo = 1")
            p_ids = [r["patient_id"] for r in cursor.fetchall()]
            if p_ids:
                placeholders = ",".join("?" for _ in p_ids)
                cursor.execute(f"DELETE FROM documents WHERE patient_id IN ({placeholders})", p_ids)
                cursor.execute(f"DELETE FROM doctor_briefs WHERE patient_id IN ({placeholders})", p_ids)
            cursor.execute("DELETE FROM patients WHERE is_demo = 1")
        conn.commit()

# Initialize schema immediately on module import
init_db()

