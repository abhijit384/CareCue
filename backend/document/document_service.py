from typing import Optional
from .pdf_extractor import PDFExtractor, ExtractedDocument

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

class DocumentService:
    """Manages document validation and text extraction."""

    def __init__(self):
        self.extractor = PDFExtractor()

    def validate_upload_request(self, file_name: str, file_type: str, file_size: int) -> Optional[str]:
        if not file_name.lower().endswith(".pdf"):
            return "Only PDF documents are supported for clinical report analysis."
        if file_type not in ("application/pdf", "binary/octet-stream"):
            return "Invalid file MIME type. Only application/pdf is accepted."
        if file_size > MAX_FILE_SIZE_BYTES:
            return f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        return None

    def process_pdf_bytes(self, pdf_bytes: bytes) -> ExtractedDocument:
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError("Document exceeds maximum size threshold.")
        return self.extractor.extract_from_bytes(pdf_bytes)
