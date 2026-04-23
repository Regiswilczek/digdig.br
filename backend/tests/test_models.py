def test_plano_model_attributes():
    from app.models.plano import Plano
    cols = {c.name for c in Plano.__table__.columns}
    assert "nome" in cols
    assert "preco_mensal" in cols
    assert "limite_chat_mensal" in cols
    assert "tem_api" in cols

def test_user_model_attributes():
    from app.models.user import User, Assinatura
    user_cols = {c.name for c in User.__table__.columns}
    assert "plano_id" in user_cols
    assert "mercadopago_customer_id" in user_cols
    sub_cols = {c.name for c in Assinatura.__table__.columns}
    assert "mercadopago_subscription_id" in sub_cols
    assert "status" in sub_cols

def test_tenant_model_attributes():
    from app.models.tenant import Tenant, UserTenantAcesso, KnowledgeBase, TenantRegra
    cols = {c.name for c in Tenant.__table__.columns}
    assert "slug" in cols
    assert "scraper_config" in cols
    assert "status" in cols
    uta_cols = {c.name for c in UserTenantAcesso.__table__.columns}
    assert "user_id" in uta_cols
    assert "tenant_id" in uta_cols

def test_all_models_import():
    from app.models import (
        Base, Plano, User, Assinatura, Tenant, UserTenantAcesso,
        KnowledgeBase, TenantRegra, Ato, ConteudoAto, RodadaAnalise,
        Analise, Irregularidade, Pessoa, AparicaoPessoa, RelacaoPessoa,
        PadraoDetectado, ChatSessao, ChatMensagem, ChatFeedback,
        Relatorio, CampanhaPatrocinio, DoacaoPatrocinio, VotoPatrocinio,
        ApiKey, PreferenciaAlerta,
        LogSessao, LogAtividade, LogErroUsuario, LogAcessoNegado,
    )
    assert len(Base.metadata.tables) == 29

def test_ato_unique_constraint():
    from app.models.ato import Ato
    col_sets = [frozenset(c.columns.keys()) for c in Ato.__table__.constraints]
    assert frozenset(["tenant_id", "numero", "tipo"]) in col_sets
