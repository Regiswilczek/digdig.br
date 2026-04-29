import asyncio
import io
import ipaddress
import re
import socket
import logging
from urllib.parse import urlparse

import pdfplumber
import httpx
import ftfy

from app.config import settings

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_REDIRECTS = 3


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}


class UrlNotAllowedError(ValueError):
    """URL bloqueada por validação anti-SSRF."""


async def _resolve_ips(host: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """getaddrinfo em thread separada para não bloquear o event loop."""
    infos = await asyncio.to_thread(
        socket.getaddrinfo, host, None, 0, socket.SOCK_STREAM
    )
    ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for family, _, _, _, sockaddr in infos:
        ip_str = sockaddr[0]
        try:
            ips.append(ipaddress.ip_address(ip_str))
        except ValueError:
            continue
    return ips


async def _validate_url(url: str) -> str:
    """Valida URL contra SSRF: HTTPS, host na whitelist, IP público."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise UrlNotAllowedError(f"Apenas HTTPS é permitido (recebido: {parsed.scheme})")
    host = (parsed.hostname or "").lower()
    if not host:
        raise UrlNotAllowedError("URL sem hostname")
    if host not in settings.pdf_allowed_hosts_list:
        raise UrlNotAllowedError(f"Host não permitido: {host}")

    # Resolve para IP e verifica se não é privado/loopback/link-local/reservado.
    try:
        ips = await _resolve_ips(host)
    except socket.gaierror as exc:
        raise UrlNotAllowedError(f"DNS falhou para {host}: {exc}") from exc
    if not ips:
        raise UrlNotAllowedError(f"Sem IPs resolvidos para {host}")
    for ip in ips:
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise UrlNotAllowedError(f"IP bloqueado para {host}: {ip}")
    return url


async def download_pdf(url: str, timeout: float = 30.0) -> bytes:
    # Validação anti-SSRF do INPUT. Cada redirect também é re-validado abaixo.
    current_url = await _validate_url(url)

    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=False, headers=_BROWSER_HEADERS
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            response = await client.get(current_url)
            if response.is_redirect:
                location = response.headers.get("location", "")
                if not location:
                    raise httpx.HTTPStatusError(
                        "Redirect sem Location", request=response.request, response=response
                    )
                # Resolve relative location contra a URL atual.
                next_url = httpx.URL(current_url).join(location)
                current_url = await _validate_url(str(next_url))
                continue
            response.raise_for_status()
            if len(response.content) > MAX_PDF_BYTES:
                raise ValueError(
                    f"PDF too large: {len(response.content)} bytes from {url}"
                )
            return response.content
        raise httpx.HTTPStatusError(
            f"Excedeu {MAX_REDIRECTS} redirects", request=response.request, response=response
        )


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
