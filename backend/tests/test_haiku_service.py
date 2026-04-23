import pytest
from app.services.haiku_service import parse_haiku_response, NIVEIS_VALIDOS


def test_parse_valid_json():
    raw = '{"nivel_alerta": "vermelho", "score_risco": 85, "resumo": "Suspeito", "indicios": [], "pessoas_extraidas": [], "valores_monetarios": [], "referencias_atos": [], "requer_aprofundamento": true}'
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "vermelho"
    assert result["score_risco"] == 85
    assert result.get("parse_error") is None


def test_parse_invalid_json_extracts_nivel():
    raw = 'blabla "nivel_alerta": "laranja" blabla'
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "laranja"
    assert result["parse_error"] is True


def test_parse_invalid_json_unknown_nivel_defaults_to_amarelo():
    raw = "completely invalid json with no nivel"
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "amarelo"
    assert result["parse_error"] is True


def test_niveis_validos_contain_all_four():
    assert "verde" in NIVEIS_VALIDOS
    assert "amarelo" in NIVEIS_VALIDOS
    assert "laranja" in NIVEIS_VALIDOS
    assert "vermelho" in NIVEIS_VALIDOS
