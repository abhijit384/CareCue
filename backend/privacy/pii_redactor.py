import re
from typing import List, Tuple, Dict, Any
from .privacy_types import RedactedField, RedactionResult, PIIEntityType

# Regex patterns for clinical document PII detection
PATIENT_NAME_PATTERN = re.compile(
    r'(?:Patient(?:\s*Name)?|Name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
    re.IGNORECASE
)
PHYSICIAN_PATTERN = re.compile(
    r'(?:Ordering\s+Physician|Physician|Doctor|Dr\.):\s*(?:Dr\.\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
    re.IGNORECASE
)
DOB_PATTERN = re.compile(
    r'(?:DOB|Date\s*of\s*Birth|Birth\s*Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})',
    re.IGNORECASE
)
PHONE_PATTERN = re.compile(
    r'(?:Phone|Tel|Mobile)?:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})',
    re.IGNORECASE
)
STANDALONE_PHONE = re.compile(
    r'\b(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})\b'
)
MRN_PATTERN = re.compile(
    r'(?:MRN|Patient\s*ID|Record\s*#|Acct\s*#|ID):\s*([A-Za-z0-9-]+)',
    re.IGNORECASE
)
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)
ADDRESS_PATTERN = re.compile(
    r'(?:Address):\s*([0-9]+\s+[A-Za-z0-9\s.,-]+(?:Avenue|Ave|Street|St|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way)[^,\n]*(?:,\s*[A-Za-z\s]+)?(?:,\s*[A-Z]{2}\s*\d{5})?)',
    re.IGNORECASE
)

class PIIRedactor:
    """Conservative, pattern-based PII minimization engine for clinical documents."""

    def redact_line(self, line: str, line_number: int) -> Tuple[str, List[RedactedField]]:
        fields: List[RedactedField] = []
        result = line

        # 1. Patient Name
        match = PATIENT_NAME_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            fields.append(RedactedField("Name", orig, "[PERSON]", line_number))
            result = result[:match.start(1)] + "[PERSON]" + result[match.end(1):]

        # 2. Physician Name
        match = PHYSICIAN_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            fields.append(RedactedField("Physician", orig, "[PHYSICIAN]", line_number))
            result = result[:match.start(1)] + "[PHYSICIAN]" + result[match.end(1):]

        # 3. Date of Birth
        match = DOB_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            fields.append(RedactedField("Date of Birth", orig, "[DATE_OF_BIRTH]", line_number))
            result = result[:match.start(1)] + "[DATE_OF_BIRTH]" + result[match.end(1):]

        # 4. MRN / Patient ID
        match = MRN_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            if orig not in ("[PERSON]", "[DATE_OF_BIRTH]", "[DATE]"):
                fields.append(RedactedField("Patient ID", orig, "[MRN_OR_ID]", line_number))
                result = result[:match.start(1)] + "[MRN_OR_ID]" + result[match.end(1):]

        # 5. Address
        match = ADDRESS_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            fields.append(RedactedField("Address", orig, "[ADDRESS]", line_number))
            result = result[:match.start(1)] + "[ADDRESS]" + result[match.end(1):]

        # 6. Phone
        match = PHONE_PATTERN.search(result)
        if match:
            orig = match.group(1).strip()
            fields.append(RedactedField("Phone", orig, "[PHONE_NUMBER]", line_number))
            result = result[:match.start(1)] + "[PHONE_NUMBER]" + result[match.end(1):]
        else:
            match2 = STANDALONE_PHONE.search(result)
            if match2:
                orig = match2.group(1).strip()
                fields.append(RedactedField("Phone", orig, "[PHONE_NUMBER]", line_number))
                result = result[:match2.start(1)] + "[PHONE_NUMBER]" + result[match2.end(1):]

        # 7. Email
        match = EMAIL_PATTERN.search(result)
        if match:
            orig = match.group(0).strip()
            fields.append(RedactedField("Email", orig, "[EMAIL_ADDRESS]", line_number))
            result = result[:match.start(0)] + "[EMAIL_ADDRESS]" + result[match.end(0):]

        return result, fields


def redact_pii(text: str) -> RedactionResult:
    """Helper function to redact PII across all lines and generate an entity mapping."""
    redactor = PIIRedactor()
    lines = text.split("\n")
    redacted_lines = []
    all_fields: List[RedactedField] = []
    entity_map: Dict[str, str] = {}

    for idx, line in enumerate(lines, start=1):
        redacted_line, fields = redactor.redact_line(line, idx)
        redacted_lines.append(redacted_line)
        all_fields.extend(fields)
        for f in fields:
            entity_map[f.minimized] = f.original

    return RedactionResult(
        redacted_text="\n".join(redacted_lines),
        detected_entities=all_fields,
        entity_map=entity_map,
    )


def restore_pii(text: str, entity_map: Dict[str, str]) -> str:
    """Restores redacted placeholders in text using the client-side entity map."""
    restored = text
    for placeholder, original in entity_map.items():
        restored = restored.replace(placeholder, original)
    return restored
