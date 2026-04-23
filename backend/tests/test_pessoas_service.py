from app.services.pessoas_service import normalizar_nome


def test_normalizar_nome_uppercase():
    assert normalizar_nome("João Silva") == "JOAO SILVA"


def test_normalizar_nome_remove_punctuation():
    assert normalizar_nome("DR. José Santos,") == "DR JOSE SANTOS"


def test_normalizar_nome_multiple_spaces():
    assert normalizar_nome("  Ana   Paula  ") == "ANA PAULA"


def test_normalizar_nome_empty():
    assert normalizar_nome("") == ""
    assert normalizar_nome("   ") == ""
