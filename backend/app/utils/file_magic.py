import io
import zipfile
from typing import Literal

MimeType = Literal[
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
]

ALLOWED_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}

EXTENSION_MIME_MAP: dict[str, str] = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def sniff_mime_type(data: bytes) -> str | None:
    """Sniff MIME type from initial magic bytes (8-12 KB)."""
    if len(data) < 4:
        return None

    # PDF: starts with %PDF
    if data.startswith(b"%PDF"):
        return "application/pdf"

    # PNG: \x89PNG\r\n\x1a\n
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # JPEG: \xff\xd8\xff
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # DOCX: PK\x03\x04 followed by zip inspection
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                namelist = zf.namelist()
                if "[Content_Types].xml" in namelist or any(name.startswith("word/") for name in namelist):
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        except Exception:
            pass

    return None


def scan_malware_heuristic(data: bytes, mime_type: str) -> bool:
    """Scans for basic suspicious patterns such as executable headers or dangerous PDF actions.

    Returns True if suspicious / malicious patterns are detected.
    """
    # Reject Windows/DOS executable signatures anywhere in header
    if data.startswith(b"MZ"):
        return True

    # Reject ELF executable
    if data.startswith(b"\x7fELF"):
        return True

    if mime_type == "application/pdf":
        # Check for dangerous PDF action triggers
        suspicious_pdf_tokens = [
            b"/JavaScript",
            b"/JS",
            b"/Launch",
            b"/EmbeddedFiles",
        ]
        count = sum(data.count(token) for token in suspicious_pdf_tokens)
        if count > 5:
            return True

    return False
