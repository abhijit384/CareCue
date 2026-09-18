from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional

class PIIEntityType(str, Enum):
    NAME = "Name"
    PHYSICIAN = "Physician"
    DOB = "Date of Birth"
    PHONE = "Phone"
    EMAIL = "Email"
    MRN = "Patient ID"
    ADDRESS = "Address"

@dataclass
class RedactedField:
    field_type: str
    original: str
    minimized: str
    line: int

@dataclass
class RedactionResult:
    redacted_text: str
    detected_entities: List[RedactedField]
    entity_map: Dict[str, str]

@dataclass
class PrivacyMinimizationResult:
    original_text: str
    minimized_text: str
    fields_detected: int
    fields_minimized: int
    categories: List[str]
    fields: List[RedactedField]
    original_preview: str = ""
    minimized_preview: str = ""
    entity_map: Dict[str, str] = field(default_factory=dict)

    @property
    def redacted_text(self) -> str:
        return self.minimized_text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fieldsDetected": self.fields_detected,
            "fieldsMinimized": self.fields_minimized,
            "categories": self.categories,
            "fields": [
                {
                    "type": f.field_type,
                    "original": f.original,
                    "minimized": f.minimized,
                    "line": f.line,
                }
                for f in self.fields
            ],
            "originalPreview": self.original_preview,
            "minimizedPreview": self.minimized_preview,
        }
