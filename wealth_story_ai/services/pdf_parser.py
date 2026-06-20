"""PDF text extraction.

Uses pdfplumber when available. Falls back gracefully to an empty string if a
file is missing or unparseable so the pipeline never hard-fails during a demo.
"""
from __future__ import annotations

from pathlib import Path

try:
    import pdfplumber  # type: ignore
    _HAS_PDFPLUMBER = True
except Exception:  # pragma: no cover - optional dependency at runtime
    _HAS_PDFPLUMBER = False


def parse_pdf(path: str | Path) -> tuple[str, int]:
    """Return (extracted_text, page_count)."""
    path = Path(path)
    if not path.exists() or not _HAS_PDFPLUMBER:
        return "", 0
    try:
        with pdfplumber.open(str(path)) as pdf:
            pages = pdf.pages
            text = "\n".join((p.extract_text() or "") for p in pages)
            return text.strip(), len(pages)
    except Exception:
        return "", 0


def parse_bytes(data: bytes) -> tuple[str, int]:
    """Parse an uploaded PDF from raw bytes."""
    if not _HAS_PDFPLUMBER:
        return "", 0
    import io
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = pdf.pages
            text = "\n".join((p.extract_text() or "") for p in pages)
            return text.strip(), len(pages)
    except Exception:
        return "", 0
