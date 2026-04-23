import pytest
from app.services.sonnet_service import parse_sonnet_response


def test_parse_valid_sonnet_json():
    raw = '{"nivel_alerta_confirmado": "vermelho", "score_risco_final": 90, "confirmacao_suspeita": true, "analise_aprofundada": {"indicios_legais": [], "indicios_morais": [], "narrativa_completa": "texto"}, "ficha_denuncia": {"titulo": "titulo", "fato": "fato", "indicio_legal": "x", "indicio_moral": "y", "evidencias": [], "impacto": "imp", "recomendacao_campanha": "rec"}}'
    result = parse_sonnet_response(raw)
    assert result["nivel_alerta_confirmado"] == "vermelho"
    assert result.get("parse_error") is None


def test_parse_invalid_sonnet_json_returns_fallback():
    result = parse_sonnet_response("invalid json")
    assert "nivel_alerta_confirmado" in result
    assert result["parse_error"] is True
