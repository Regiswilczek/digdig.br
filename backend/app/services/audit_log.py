import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.log import LogAtividade, LogErroUsuario, LogAcessoNegado


class AuditLog:
    @staticmethod
    async def registrar(
        db: AsyncSession,
        acao: str,
        user_id: uuid.UUID | None = None,
        tenant_slug: str | None = None,
        recurso_tipo: str | None = None,
        recurso_id: uuid.UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        log = LogAtividade(
            user_id=user_id,
            acao=acao,
            tenant_slug=tenant_slug,
            recurso_tipo=recurso_tipo,
            recurso_id=recurso_id,
            metadados=metadata or {},
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)

    @staticmethod
    async def registrar_erro(
        db: AsyncSession,
        tipo_erro: str,
        user_id: uuid.UUID | None = None,
        contexto: dict | None = None,
    ) -> None:
        log = LogErroUsuario(
            user_id=user_id,
            tipo_erro=tipo_erro,
            contexto=contexto or {},
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)

    @staticmethod
    async def registrar_acesso_negado(
        db: AsyncSession,
        rota_tentada: str,
        motivo: str,
        user_id: uuid.UUID | None = None,
        ip_anonimizado: str | None = None,
    ) -> None:
        log = LogAcessoNegado(
            user_id=user_id,
            ip_anonimizado=ip_anonimizado,
            rota_tentada=rota_tentada,
            motivo=motivo,
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)
