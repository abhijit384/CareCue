"""
backend/document/pdf_extractor.py - PyMuPDF (fitz) text extractor with scanned document fallback.
Extracts page-by-page text, preserving boundaries, and renders page pixmaps for vision fallback
when the PDF contains scanned images or minimal extractable text.
"""

import io
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import pymupdf as fitz  # PyMuPDF
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

@dataclass
class DocumentPage:
    page_number: int
    text: str

@dataclass
class ExtractedDocument:
    total_pages: int
    pages: List[DocumentPage]
    full_text: str
    extraction_method: str = "pymupdf"  # 'pymupdf' or 'vision' or 'ocr'
    rendered_images: List[bytes] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalPages": self.total_pages,
            "pages": [
                {"page": p.page_number, "text": p.text}
                for p in self.pages
            ],
            "fullText": self.full_text,
            "extractionMethod": self.extraction_method,
            "metadata": self.metadata,
        }

class PDFExtractor:
    """Extracts text from PDF bytes using PyMuPDF while preserving page references."""

    def extract_from_bytes(self, pdf_bytes: bytes) -> ExtractedDocument:
        if fitz is not None:
            return self._extract_with_fitz(pdf_bytes)
        elif PdfReader is not None:
            return self._extract_with_pypdf(pdf_bytes)
        else:
            text = pdf_bytes.decode("utf-8", errors="ignore")
            return ExtractedDocument(
                total_pages=1,
                pages=[DocumentPage(1, text)],
                full_text=text,
                extraction_method="fallback_text",
            )

    def _extract_with_fitz(self, pdf_bytes: bytes) -> ExtractedDocument:
        pages: List[DocumentPage] = []
        full_text_parts: List[str] = []
        rendered_images: List[bytes] = []
        metadata: Dict[str, Any] = {}

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = len(doc)
            metadata = {
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "creationDate": doc.metadata.get("creationDate", ""),
            }

            total_extracted_chars = 0
            for idx in range(total_pages):
                page = doc[idx]
                page_text = page.get_text("text") or ""
                clean_text = "\n".join(line.rstrip() for line in page_text.splitlines() if line.strip())
                pages.append(DocumentPage(page_number=idx + 1, text=clean_text))
                full_text_parts.append(clean_text)
                total_extracted_chars += len(clean_text)

            # Quality Check: if text is empty or less than 40 chars across the PDF (e.g. scanned document)
            is_scanned = total_extracted_chars < 40
            if is_scanned:
                logger.info("PDF has < 40 characters of extractable text. Rendering page pixmaps for Vision OCR...")
                for idx in range(min(total_pages, 5)):  # Render up to first 5 pages
                    page = doc[idx]
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    rendered_images.append(img_bytes)

            doc.close()

            full_text = "\n\n--- PAGE BREAK ---\n\n".join(full_text_parts)
            return ExtractedDocument(
                total_pages=total_pages,
                pages=pages,
                full_text=full_text,
                extraction_method="pymupdf",
                rendered_images=rendered_images,
                metadata=metadata,
            )
        except Exception as exc:
            logger.error(f"PyMuPDF extraction failed: {exc}, falling back to pypdf...")
            if PdfReader is not None:
                return self._extract_with_pypdf(pdf_bytes)
            raise

    def _extract_with_pypdf(self, pdf_bytes: bytes) -> ExtractedDocument:
        stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(stream)
        pages: List[DocumentPage] = []
        full_text_parts: List[str] = []

        for idx, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            clean_text = "\n".join(line.rstrip() for line in text.splitlines() if line.strip())
            pages.append(DocumentPage(page_number=idx, text=clean_text))
            full_text_parts.append(clean_text)

        full_text = "\n\n--- PAGE BREAK ---\n\n".join(full_text_parts)
        return ExtractedDocument(
            total_pages=len(pages),
            pages=pages,
            full_text=full_text,
            extraction_method="pypdf",
        )

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> ExtractedDocument:
    return PDFExtractor().extract_from_bytes(pdf_bytes)
