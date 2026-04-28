import pytest
from decimal import Decimal
from app.services.cvss_service import calcular_cvss_a, nivel_de_cvss

# ── Fórmula v2: CVSS-A = min((I_norm × 6) + (E_norm × 4), 10.0)
# I_norm = (FI + LI + RI) / 3  |  E_norm = AV × AC × PR


def test_calcular_cvss_a_maximo():
    score, vetor = calcular_cvss_a('alto', 'crime', 'sistemico', 'unilateral', 'baixa', 'alto_escalao')
    assert score == Decimal("8.9")
    assert vetor == "CVSS-A:2.0/AV:UNI/AC:BAX/PR:ALE/FI:ALT/LI:CRM/RI:SIS"


def test_calcular_cvss_a_minimo():
    score, vetor = calcular_cvss_a('nenhum', 'formal', 'interno', 'colegiado', 'alta', 'baixo_escalao')
    assert score == Decimal("1.0")
    assert vetor == "CVSS-A:2.0/AV:COL/AC:ALT/PR:BXE/FI:NEN/LI:FOR/RI:INT"


def test_calcular_cvss_a_colisao_chaves():
    # Garante que AC:BAX e PR:BXE têm abreviações distintas (bug B1 corrigido)
    score, vetor = calcular_cvss_a('baixo', 'formal', 'interno', 'colegiado', 'baixa', 'baixo_escalao')
    assert "AC:BAX" in vetor
    assert "PR:BXE" in vetor


def test_nivel_de_cvss():
    assert nivel_de_cvss(Decimal("10.0")) == "vermelho"
    assert nivel_de_cvss(Decimal("8.0")) == "vermelho"
    assert nivel_de_cvss(Decimal("7.9")) == "laranja"
    assert nivel_de_cvss(Decimal("6.0")) == "laranja"
    assert nivel_de_cvss(Decimal("5.9")) == "amarelo"
    assert nivel_de_cvss(Decimal("3.0")) == "amarelo"
    assert nivel_de_cvss(Decimal("2.9")) == "verde"
    assert nivel_de_cvss(Decimal("0.0")) == "verde"


def test_calibracao_ato_rotineiro():
    # Exoneração a pedido por presidente (unilateral mas sem irregularidade)
    # deve ser AMARELO — não satura o score por ser ato de alta autoridade
    score, _ = calcular_cvss_a('nenhum', 'formal', 'interno', 'unilateral', 'baixa', 'alto_escalao')
    assert score == Decimal("3.7")
    assert nivel_de_cvss(score) == "amarelo"


def test_calibracao_laranja_minimo():
    # Limiar mínimo para LARANJA: crime configurado + repercussão pública
    score, _ = calcular_cvss_a('nenhum', 'crime', 'publico', 'unilateral', 'baixa', 'alto_escalao')
    assert score == Decimal("6.1")
    assert nivel_de_cvss(score) == "laranja"


def test_calibracao_vermelho():
    # Vermelho exige impacto alto + crime + risco sistêmico
    score, _ = calcular_cvss_a('alto', 'crime', 'sistemico', 'unilateral', 'baixa', 'alto_escalao')
    assert score == Decimal("8.9")
    assert nivel_de_cvss(score) == "vermelho"


def test_defaults_conservadores():
    # Valores None devem usar defaults conservadores sem lançar exceção
    score, vetor = calcular_cvss_a(None, None, None, None, None, None)
    assert score >= Decimal("0.0")
    assert "CVSS-A:2.0" in vetor
