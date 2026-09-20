import logging
from typing import Optional
from .pdf_extractor import ExtractedDocument, DocumentPage
try:
    from services.gemini_service import GeminiVerificationService
except ImportError:
    try:
        from backend.services.gemini_service import GeminiVerificationService
    except ImportError:
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
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
                clean_err = "Gemini quota limit reached. Please wait a moment and try again."
            else:
                clean_err = err_msg.split("\n")[0] if err_msg else "Vision extraction unavailable"
            return ExtractedDocument(
                total_pages=1,
                pages=[DocumentPage(page_number=1, text=f"[Vision extraction notice: {clean_err}]")],
                full_text=f"[Vision extraction notice: {clean_err}]",
                extraction_method="vision",
            )
