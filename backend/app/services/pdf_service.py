import io
import re
import logging
import pdfplumber
import httpx
import ftfy

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}


async def download_pdf(url: str, timeout: float = 30.0) -> bytes:
    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=True, headers=_BROWSER_HEADERS
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        if len(response.content) > MAX_PDF_BYTES:
            raise ValueError(f"PDF too large: {len(response.content)} bytes from {url}")
        return response.content


def extract_text_pdfplumber(pdf_bytes: bytes) -> tuple[str, int]:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages.append(text)
            full_text = "\n\n".join(pages)
            return normalize_text(full_text), len(pdf.pages)
    except Exception as exc:
        logger.warning("pdf_extraction_failed", extra={"error": str(exc)})
        return "", 0


def normalize_text(text: str) -> str:
    if not text or not text.strip():
        return ""
    text = ftfy.fix_text(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def estimate_tokens(text: str) -> int:
    return len(text) // 4 if text else 0
