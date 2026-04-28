import pytest
from app.services.icp_service import _interpretar_sistemico

def test_interpretar_sistemico():
    # Limites reais: <0.25 = saudável, 0.25-0.50 = moderada, 0.50-0.75 = alta, >=0.75 = captura
    assert _interpretar_sistemico(0.05) == "Poder distribuído (saudável)"
    assert _interpretar_sistemico(0.15) == "Poder distribuído (saudável)"
    assert _interpretar_sistemico(0.25) == "Concentração moderada"
    assert _interpretar_sistemico(0.40) == "Concentração moderada"
    assert _interpretar_sistemico(0.50) == "Alta concentração"
    assert _interpretar_sistemico(0.74) == "Alta concentração"
    assert _interpretar_sistemico(0.75) == "Captura institucional provável"
    # Resultado real do CAU-PR (ICP sistêmico = 0.9593)
    assert _interpretar_sistemico(0.9593) == "Captura institucional provável"
