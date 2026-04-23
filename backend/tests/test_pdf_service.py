import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.pdf_service import extract_text_pdfplumber, normalize_text


def test_extract_text_returns_text_and_page_count():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Texto da página um"
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("app.services.pdf_service.pdfplumber.open", return_value=mock_pdf):
        text, pages = extract_text_pdfplumber(b"fake-pdf-bytes")

    assert "Texto da página um" in text
    assert pages == 1


def test_extract_text_handles_none_page():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = None
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("app.services.pdf_service.pdfplumber.open", return_value=mock_pdf):
        text, pages = extract_text_pdfplumber(b"fake-pdf-bytes")

    assert text == ""
    assert pages == 1


def test_normalize_text_fixes_whitespace():
    dirty = "texto   com\t\tespaços\n\n\nexcessivos"
    result = normalize_text(dirty)
    assert "   " not in result
    assert "\t" not in result


def test_normalize_text_handles_empty():
    assert normalize_text("") == ""
    assert normalize_text("   ") == ""
