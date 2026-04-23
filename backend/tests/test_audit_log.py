import pytest
import uuid
from unittest.mock import MagicMock
from app.services.audit_log import AuditLog


@pytest.mark.asyncio
async def test_registrar_adds_log_to_session():
    db = MagicMock()
    db.add = MagicMock()

    await AuditLog.registrar(
        db=db,
        acao="ATO_VISUALIZADO",
        user_id=uuid.uuid4(),
        tenant_slug="cau-pr",
        recurso_tipo="ato",
    )
    assert db.add.called
    from app.models.log import LogAtividade
    added = db.add.call_args[0][0]
    assert isinstance(added, LogAtividade)
    assert added.acao == "ATO_VISUALIZADO"
    assert added.tenant_slug == "cau-pr"


@pytest.mark.asyncio
async def test_registrar_erro_adds_erro_log():
    db = MagicMock()
    await AuditLog.registrar_erro(db, "LIMITE_CHAT_ATINGIDO", contexto={"plano": "cidadao"})
    from app.models.log import LogErroUsuario
    added = db.add.call_args[0][0]
    assert isinstance(added, LogErroUsuario)
    assert added.tipo_erro == "LIMITE_CHAT_ATINGIDO"
