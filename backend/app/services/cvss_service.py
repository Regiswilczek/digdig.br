"""
cvss_service.py — CVSS-A (Score de Vulnerabilidade Adaptado para Auditoria Pública)

Baseado no CVSS v4.0 (FIRST, 2023), adaptado para risco administrativo.
O LLM extrai variáveis qualitativas; este módulo calcula o score deterministicamente.

Fórmula:
  I = 10.41 × (1 − (1−FI) × (1−LI) × (1−RI))
  E = 20 × AV × AC × PR
  CVSS-A = round(min(I + E, 10.0), 1)
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

PESOS_FI = {"nenhum": 0.00, "baixo": 0.22, "medio": 0.40, "alto": 0.56}
PESOS_LI = {"formal": 0.22, "grave": 0.56, "crime": 0.85}
PESOS_RI = {"interno": 0.22, "publico": 0.56, "sistemico": 0.85}
PESOS_AV = {"colegiado": 0.20, "unilateral": 0.85}
PESOS_AC = {"alta": 0.44, "baixa": 1.00}
PESOS_PR = {"baixo_escalao": 0.68, "alto_escalao": 0.85}

_DEFAULTS = {
    "fi": "baixo",
    "li": "formal",
    "ri": "interno",
    "av": "unilateral",
    "ac": "baixa",
    "pr": "baixo_escalao",
}

_ABREV = {
    "nenhum": "NEN", "baixo": "BAX", "medio": "MED", "alto": "ALT",
    "formal": "FOR", "grave": "GRV", "crime": "CRM",
    "interno": "INT", "publico": "PUB", "sistemico": "SIS",
    "colegiado": "COL", "unilateral": "UNI",
    "alta": "ALT", "baixa": "BAX",
    "baixo_escalao": "BXE", "alto_escalao": "ALE",
}

_NIVEL_MAP = [
    (Decimal("8.0"), "vermelho"),
    (Decimal("6.0"), "laranja"),
    (Decimal("3.0"), "amarelo"),
    (Decimal("0.0"), "verde"),
]


def calcular_cvss_a(
    fi: str | None,
    li: str | None,
    ri: str | None,
    av: str | None,
    ac: str | None,
    pr: str | None,
) -> tuple[Decimal, str]:
    """
    Calcula CVSS-A a partir das variáveis qualitativas extraídas pelo Piper.
    Retorna (score, vetor_string).
    Usa defaults conservadores para valores ausentes ou inválidos.
    """
    fi_v = PESOS_FI.get(fi or "", PESOS_FI[_DEFAULTS["fi"]])
    li_v = PESOS_LI.get(li or "", PESOS_LI[_DEFAULTS["li"]])
    ri_v = PESOS_RI.get(ri or "", PESOS_RI[_DEFAULTS["ri"]])
    av_v = PESOS_AV.get(av or "", PESOS_AV[_DEFAULTS["av"]])
    ac_v = PESOS_AC.get(ac or "", PESOS_AC[_DEFAULTS["ac"]])
    pr_v = PESOS_PR.get(pr or "", PESOS_PR[_DEFAULTS["pr"]])

    impacto = 10.41 * (1 - (1 - fi_v) * (1 - li_v) * (1 - ri_v))
    explorabilidade = 20 * av_v * ac_v * pr_v
    score_raw = min(impacto + explorabilidade, 10.0)
    score = Decimal(str(score_raw)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    av_key = _ABREV.get(av or _DEFAULTS["av"], (av or _DEFAULTS["av"])[:3].upper())
    ac_key = _ABREV.get(ac or _DEFAULTS["ac"], (ac or _DEFAULTS["ac"])[:3].upper())
    pr_key = _ABREV.get(pr or _DEFAULTS["pr"], (pr or _DEFAULTS["pr"])[:3].upper())
    fi_key = _ABREV.get(fi or _DEFAULTS["fi"], (fi or _DEFAULTS["fi"])[:3].upper())
    li_key = _ABREV.get(li or _DEFAULTS["li"], (li or _DEFAULTS["li"])[:3].upper())
    ri_key = _ABREV.get(ri or _DEFAULTS["ri"], (ri or _DEFAULTS["ri"])[:3].upper())
    vetor = f"CVSS-A:1.0/AV:{av_key}/AC:{ac_key}/PR:{pr_key}/FI:{fi_key}/LI:{li_key}/RI:{ri_key}"

    return score, vetor


def nivel_de_cvss(score: Decimal) -> str:
    """Converte CVSS-A score para nível de alerta (verde/amarelo/laranja/vermelho)."""
    for limiar, nivel in _NIVEL_MAP:
        if score >= limiar:
            return nivel
    return "verde"
