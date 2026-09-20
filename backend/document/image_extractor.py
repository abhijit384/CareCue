import logging
from typing import Optional
from .pdf_extractor import ExtractedDocument, DocumentPage
from ..services.gemini_service import GeminiVerificationService

logger = logging.getLogger(__name__)

class ImageExtractor:
    """Extracts text from images using Gemini Vision API."""

    def __init__(self):
        self.gemini_service = GeminiVerificationService()

    def extract_from_bytes(self, image_bytes: bytes, mime_type: str) -> ExtractedDocument:
        if not image_bytes:
            raise ValueError("Image bytes are empty")

        try:
            extracted_text = self.gemini_service.extract_text_from_image(image_bytes, mime_type)
            
            if not extracted_text or not extracted_text.strip():
                extracted_text = "[Document image could not be read. No clinical text recognized.]"
                
            return ExtractedDocument(
                total_pages=1,
                pages=[DocumentPage(page_number=1, text=extracted_text.strip())],
                full_text=extracted_text.strip(),
                extraction_method="vision",
            )
        except Exception as e:
            logger.error(f"Image extraction failed: {e}")
            return ExtractedDocument(
                total_pages=1,
                pages=[DocumentPage(page_number=1, text=f"[Vision extraction error: {e}]")],
                full_text=f"[Vision extraction error: {e}]",
                extraction_method="vision",
            )
