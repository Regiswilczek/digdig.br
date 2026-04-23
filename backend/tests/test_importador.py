import pytest
from app.services.importador import parse_data_publicacao, normalizar_tipo


def test_parse_data_publicacao_formato_brasileiro():
    from datetime import date
    result = parse_data_publicacao("02/04/2026")
    assert result == date(2026, 4, 2)


def test_parse_data_publicacao_invalida():
    assert parse_data_publicacao("invalid") is None
    assert parse_data_publicacao("") is None
    assert parse_data_publicacao(None) is None


def test_normalizar_tipo_portaria():
    assert normalizar_tipo("portaria", "administrativa") == "portaria"


def test_normalizar_tipo_deliberacao():
    assert normalizar_tipo("deliberacao", None) == "deliberacao"
