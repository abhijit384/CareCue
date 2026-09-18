import io
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

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

    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalPages": self.total_pages,
            "pages": [
                {"page": p.page_number, "text": p.text}
                for p in self.pages
            ],
            "fullText": self.full_text,
        }

class PDFExtractor:
    """Extracts text from PDF streams or bytes while preserving page references."""

    def extract_from_bytes(self, pdf_bytes: bytes) -> ExtractedDocument:
        if PdfReader is None:
            # Fallback if pypdf is not available
            text = pdf_bytes.decode("utf-8", errors="ignore")
            return ExtractedDocument(
                total_pages=1,
                pages=[DocumentPage(1, text)],
                full_text=text,
            )

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
        )

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> ExtractedDocument:
    """Helper to extract text from raw PDF bytes."""
    extractor = PDFExtractor()
    return extractor.extract_from_bytes(pdf_bytes)

def extract_text_from_pdf_path(file_path: str) -> ExtractedDocument:
    """Helper to extract text from a file path."""
    with open(file_path, "rb") as f:
        return extract_text_from_pdf_bytes(f.read())
