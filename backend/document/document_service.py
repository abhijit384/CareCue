"""
backend/document/document_service.py - Multi-stage document extraction service.
Orchestrates PyMuPDF text extraction, scanned PDF pixmap rendering, and Gemini Vision OCR fallback.
"""

import logging
from typing import Optional, List
from .pdf_extractor import PDFExtractor, ExtractedDocument, DocumentPage

logger = logging.getLogger(__name__)
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

class DocumentService:
    """Manages document validation, PyMuPDF extraction, and Vision fallback."""

    def __init__(self):
        self.pdf_extractor = PDFExtractor()
        self._image_extractor = None

    @property
    def image_extractor(self):
        if self._image_extractor is None:
            from .image_extractor import ImageExtractor
            self._image_extractor = ImageExtractor()
        return self._image_extractor

    def validate_upload_request(self, file_name: str, file_type: str, file_size: int) -> Optional[str]:
        valid_extensions = (".pdf", ".jpg", ".jpeg", ".png")
        if not any(file_name.lower().endswith(ext) for ext in valid_extensions):
            return "Only PDF, JPG, and PNG documents are supported for clinical report analysis."

        valid_mime_types = ("application/pdf", "binary/octet-stream", "image/jpeg", "image/png")
        if file_type not in valid_mime_types and not any(file_name.lower().endswith(ext) for ext in valid_extensions):
            return "Invalid file MIME type. Only application/pdf, image/jpeg, and image/png are accepted."

        if file_size <= 0:
            return "File is empty."

        if file_size > MAX_FILE_SIZE_BYTES:
            return f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        return None

    def process_document(self, file_bytes: bytes, file_name: str, mime_type: str) -> ExtractedDocument:
        """
        Unified multi-stage extraction pipeline:
        1. PDF -> PyMuPDF page-by-page extraction.
        2. If PDF has minimal text (<40 chars), render page pixmaps -> Gemini Vision OCR fallback.
        3. Images -> Gemini Vision OCR.
        """
        lower_name = file_name.lower()
        is_pdf = lower_name.endswith(".pdf") or mime_type == "application/pdf"

        if is_pdf:
            extracted = self.pdf_extractor.extract_from_bytes(file_bytes)
            # If scanned PDF with rendered images, run Vision OCR on each rendered page
            if extracted.rendered_images:
                logger.info("Running Vision OCR on scanned PDF pages...")
                vision_pages: List[DocumentPage] = []
                vision_full_parts: List[str] = []
                for p_idx, img_data in enumerate(extracted.rendered_images, start=1):
                    page_doc = self.image_extractor.extract_from_bytes(img_data, "image/png")
                    vision_pages.append(DocumentPage(page_number=p_idx, text=page_doc.full_text))
                    vision_full_parts.append(page_doc.full_text)

                return ExtractedDocument(
                    total_pages=len(vision_pages),
                    pages=vision_pages,
                    full_text="\n\n--- PAGE BREAK ---\n\n".join(vision_full_parts),
                    extraction_method="vision",
                    metadata=extracted.metadata,
                )
            return extracted
        else:
            # Image file (PNG, JPG, JPEG)
            img_mime = "image/png" if lower_name.endswith(".png") else "image/jpeg"
            return self.image_extractor.extract_from_bytes(file_bytes, img_mime)
