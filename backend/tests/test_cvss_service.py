import pytest
from decimal import Decimal
from app.services.cvss_service import calcular_cvss_a, nivel_de_cvss

def test_calcular_cvss_a_maximo():
    score, vetor = calcular_cvss_a('alto', 'crime', 'sistemico', 'unilateral', 'baixa', 'alto_escalao')
    assert score == Decimal("10.0")
    assert vetor == "CVSS-A:1.0/AV:UNI/AC:BAX/PR:ALE/FI:ALT/LI:CRM/RI:SIS"

def test_calcular_cvss_a_minimo():
    # Score mínimo real com pesos base é 5.3, não 0.0
    score, vetor = calcular_cvss_a('nenhum', 'formal', 'interno', 'colegiado', 'alta', 'baixo_escalao')
    assert score == Decimal("5.3")
    assert vetor == "CVSS-A:1.0/AV:COL/AC:ALT/PR:BXE/FI:NEN/LI:FOR/RI:INT"

def test_calcular_cvss_a_colisao_chaves():
    # Teste para garantir que o bug B1 foi corrigido
    score, vetor = calcular_cvss_a('baixo', 'formal', 'interno', 'colegiado', 'baixa', 'baixo_escalao')
    assert "AC:BAX" in vetor
    assert "PR:BXE" in vetor

def test_nivel_de_cvss():
    # _NIVEL_MAP: vermelho>=8.0, laranja>=6.0, amarelo>=3.0, verde>=0.0
    assert nivel_de_cvss(Decimal("10.0")) == "vermelho"
    assert nivel_de_cvss(Decimal("8.0")) == "vermelho"
    assert nivel_de_cvss(Decimal("7.9")) == "laranja"
    assert nivel_de_cvss(Decimal("6.0")) == "laranja"
    assert nivel_de_cvss(Decimal("5.9")) == "amarelo"
    assert nivel_de_cvss(Decimal("3.0")) == "amarelo"
    assert nivel_de_cvss(Decimal("2.9")) == "verde"
    assert nivel_de_cvss(Decimal("0.0")) == "verde"
