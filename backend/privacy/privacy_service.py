from typing import List, Dict
from .privacy_types import PrivacyMinimizationResult, RedactedField
from .pii_redactor import PIIRedactor

class PrivacyService:
    """Service to minimize clinical document PII before AI processing."""

    def __init__(self):
        self.redactor = PIIRedactor()

    def minimize_text(self, text: str) -> PrivacyMinimizationResult:
        lines = text.split("\n")
        minimized_lines = []
        all_fields: List[RedactedField] = []
        entity_map: Dict[str, str] = {}

        for idx, line in enumerate(lines, start=1):
            minimized_line, fields = self.redactor.redact_line(line, idx)
            minimized_lines.append(minimized_line)
            all_fields.extend(fields)
            for f in fields:
                entity_map[f.minimized] = f.original

        minimized_text = "\n".join(minimized_lines)
        categories = sorted(list({f.field_type.lower() for f in all_fields}))

        # Generate side-by-side previews (first 25 lines)
        orig_preview = "\n".join(lines[:25])
        min_preview = "\n".join(minimized_lines[:25])

        return PrivacyMinimizationResult(
            original_text=text,
            minimized_text=minimized_text,
            fields_detected=len(all_fields),
            fields_minimized=len(all_fields),
            categories=categories,
            fields=all_fields,
            original_preview=orig_preview,
            minimized_preview=min_preview,
            entity_map=entity_map,
        )

def redact_for_cloud(text: str) -> PrivacyMinimizationResult:
    """Convenience helper to redact PII prior to cloud transit."""
    service = PrivacyService()
    return service.minimize_text(text)
