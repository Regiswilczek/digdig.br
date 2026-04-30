"""
conta.py — endpoints do painel do usuário.

GET    /me                       perfil + plano + assinatura ativa
PATCH  /me                       altera nome
POST   /me/avatar                upload da foto (multipart) → Supabase Storage
DELETE /me/avatar                remove foto

GET    /me/assinatura            assinatura ativa (status, próxima cobrança)
POST   /me/assinatura/cancelar   cancela assinatura no Mercado Pago

GET    /me/favoritos             lista atos favoritados (com info do ato)
POST   /me/favoritos/{ato_id}    adiciona favorito (body opcional: nota)
DELETE /me/favoritos/{ato_id}    remove favorito
"""
from datetime import datetime, timezone
from typing import Annotated

import httpx
import mercadopago
import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.ato import Ato
from app.models.favorito import AtoFavorito
from app.models.tenant import Tenant
from app.models.user import Assinatura, User

log = structlog.get_logger()

router = APIRouter(prefix="/me", tags=["conta"])

ALLOWED_AVATAR_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2MB


# ── Helpers ────────────────────────────────────────────────────────────────

async def _load_user(db: AsyncSession, user_id: str) -> User:
    r = await db.execute(
        select(User).options(selectinload(User.plano)).where(User.id == user_id)
    )
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    return user


async def _assinatura_ativa(db: AsyncSession, user_id: str) -> Assinatura | None:
    r = await db.execute(
        select(Assinatura)
        .options(selectinload(Assinatura.plano))
        .where(Assinatura.user_id == user_id, Assinatura.status == "active")
        .order_by(desc(Assinatura.criado_em))
        .limit(1)
    )
    return r.scalar_one_or_none()


# ── Schemas ────────────────────────────────────────────────────────────────

class PerfilResponse(BaseModel):
    id: str
    email: str
    nome: str | None
    avatar_url: str | None
    plano: dict
    assinatura: dict | None


class AtualizarPerfilRequest(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)


class AssinaturaResponse(BaseModel):
    id: str
    status: str
    plano_nome: str
    plano_preco_mensal: float
    periodo_inicio: datetime
    periodo_fim: datetime
    cancelado_em: datetime | None
    mercadopago_subscription_id: str | None


class FavoritoRequest(BaseModel):
    nota: str | None = Field(None, max_length=2000)


class FavoritoItem(BaseModel):
    ato_id: str
    tenant_slug: str
    tenant_nome: str
    tipo: str
    numero: str
    data_publicacao: datetime | None
    titulo: str | None
    ementa: str | None
    nota: str | None
    favoritado_em: datetime


# ── Perfil ─────────────────────────────────────────────────────────────────

@router.get("", response_model=PerfilResponse)
async def get_perfil(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    user = await _load_user(db, cu["id"])
    assin = await _assinatura_ativa(db, cu["id"])
    return PerfilResponse(
        id=str(user.id),
        email=user.email,
        nome=user.nome,
        avatar_url=user.avatar_url,
        plano={
            "id": str(user.plano.id),
            "nome": user.plano.nome,
            "preco_mensal": float(user.plano.preco_mensal or 0),
            "limite_chat_mensal": user.plano.limite_chat_mensal,
            "tem_exportacao": user.plano.tem_exportacao,
            "tem_api": user.plano.tem_api,
        },
        assinatura={
            "id": str(assin.id),
            "status": assin.status,
            "plano_nome": assin.plano.nome,
            "periodo_inicio": assin.periodo_inicio,
            "periodo_fim": assin.periodo_fim,
            "cancelado_em": assin.cancelado_em,
        } if assin else None,
    )


@router.patch("", response_model=PerfilResponse)
async def atualizar_perfil(
    payload: AtualizarPerfilRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    user = await _load_user(db, cu["id"])
    user.nome = payload.nome.strip()
    await db.commit()
    return await get_perfil(db, cu)


# ── Avatar ─────────────────────────────────────────────────────────────────

async def _upload_avatar_supabase(user_id: str, content: bytes, content_type: str) -> str:
    """Faz upload pro bucket 'avatars' usando service_role e retorna URL pública."""
    if not settings.supabase_service_role_key:
        raise HTTPException(500, "Supabase Storage não configurado (service_role_key vazio)")

    ext_map = {
        "image/jpeg": "jpg", "image/png": "png",
        "image/webp": "webp", "image/gif": "gif",
    }
    ext = ext_map.get(content_type, "bin")
    # Path segue convenção das policies RLS: avatars/{user_id}/avatar.{ext}
    object_path = f"{user_id}/avatar.{ext}"
    url = f"{settings.supabase_url}/storage/v1/object/avatars/{object_path}"
    # Supabase Secret Key (sb_secret_*) precisa ser passada também no header
    # apikey, não só no Authorization. Sem o apikey o Storage devolve 400.
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": content_type,
        # Substitui se já existe (idempotente)
        "x-upsert": "true",
        "Cache-Control": "max-age=3600",
    }

    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.put(url, headers=headers, content=content)

    if resp.status_code not in (200, 201):
        log.error("avatar_upload_failed", status=resp.status_code, body=resp.text[:300])
        raise HTTPException(502, f"Falha no upload pro Storage ({resp.status_code})")

    # URL pública (bucket é público, sem signed URL)
    return f"{settings.supabase_url}/storage/v1/object/public/avatars/{object_path}"


@router.post("/avatar", response_model=PerfilResponse)
async def upload_avatar(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
    file: Annotated[UploadFile, File(...)],
):
    if file.content_type not in ALLOWED_AVATAR_MIMES:
        raise HTTPException(400, f"Tipo não permitido. Use: {', '.join(sorted(ALLOWED_AVATAR_MIMES))}")
    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(400, f"Arquivo muito grande (máx 2MB)")
    if len(content) < 100:
        raise HTTPException(400, "Arquivo vazio ou inválido")

    public_url = await _upload_avatar_supabase(cu["id"], content, file.content_type)
    # Cache-bust: adiciona timestamp pra navegador buscar a nova versão
    public_url_with_v = f"{public_url}?v={int(datetime.now(timezone.utc).timestamp())}"

    user = await _load_user(db, cu["id"])
    user.avatar_url = public_url_with_v
    await db.commit()
    log.info("avatar_uploaded", user_id=cu["id"], size=len(content))
    return await get_perfil(db, cu)


@router.delete("/avatar", response_model=PerfilResponse)
async def deletar_avatar(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    user = await _load_user(db, cu["id"])
    user.avatar_url = None
    await db.commit()
    return await get_perfil(db, cu)


# ── Assinatura ─────────────────────────────────────────────────────────────

@router.get("/assinatura", response_model=AssinaturaResponse | None)
async def get_assinatura(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    assin = await _assinatura_ativa(db, cu["id"])
    if not assin:
        return None
    return AssinaturaResponse(
        id=str(assin.id),
        status=assin.status,
        plano_nome=assin.plano.nome,
        plano_preco_mensal=float(assin.plano.preco_mensal or 0),
        periodo_inicio=assin.periodo_inicio,
        periodo_fim=assin.periodo_fim,
        cancelado_em=assin.cancelado_em,
        mercadopago_subscription_id=assin.mercadopago_subscription_id,
    )


@router.post("/assinatura/cancelar")
async def cancelar_assinatura(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    assin = await _assinatura_ativa(db, cu["id"])
    if not assin:
        raise HTTPException(404, "Sem assinatura ativa")

    # Tenta cancelar no MP se houver subscription_id (recorrente real, não one-shot)
    if assin.mercadopago_subscription_id:
        try:
            sdk = mercadopago.SDK(settings.mercadopago_access_token)
            result = sdk.preapproval().update(
                assin.mercadopago_subscription_id,
                {"status": "cancelled"},
            )
            if result["status"] not in (200, 201):
                log.error(
                    "mp_cancel_failed", status=result["status"],
                    body=result.get("response"),
                )
                # Não bloqueia — marca como cancelada localmente
        except Exception as exc:
            log.error("mp_cancel_exception", error=str(exc))

    assin.status = "cancelled"
    assin.cancelado_em = datetime.now(timezone.utc)
    await db.commit()
    log.info("assinatura_cancelada", user_id=cu["id"], assinatura_id=str(assin.id))
    return {"status": "cancelled", "ate": assin.periodo_fim}


# ── Favoritos ──────────────────────────────────────────────────────────────

@router.get("/favoritos", response_model=list[FavoritoItem])
async def listar_favoritos(
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    r = await db.execute(
        select(AtoFavorito, Ato, Tenant)
        .join(Ato, Ato.id == AtoFavorito.ato_id)
        .join(Tenant, Tenant.id == Ato.tenant_id)
        .where(AtoFavorito.user_id == cu["id"])
        .order_by(desc(AtoFavorito.criado_em))
    )
    return [
        FavoritoItem(
            ato_id=str(a.id),
            tenant_slug=t.slug,
            tenant_nome=t.nome_completo or t.slug,
            tipo=a.tipo,
            numero=a.numero,
            data_publicacao=(
                datetime.combine(a.data_publicacao, datetime.min.time())
                if a.data_publicacao else None
            ),
            titulo=a.titulo,
            ementa=a.ementa,
            nota=f.nota,
            favoritado_em=f.criado_em,
        )
        for f, a, t in r.all()
    ]


@router.post("/favoritos/{ato_id}")
async def adicionar_favorito(
    ato_id: str,
    payload: FavoritoRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    # Confere que o ato existe (e pega o tenant_id)
    r = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = r.scalar_one_or_none()
    if not ato:
        raise HTTPException(404, "Ato não encontrado")

    # Idempotente — se já existe, atualiza nota
    existing = await db.execute(
        select(AtoFavorito).where(
            AtoFavorito.user_id == cu["id"],
            AtoFavorito.ato_id == ato_id,
        )
    )
    fav = existing.scalar_one_or_none()
    if fav:
        if payload.nota is not None:
            fav.nota = payload.nota
        await db.commit()
        return {"status": "atualizado"}

    fav = AtoFavorito(
        user_id=cu["id"],
        ato_id=ato_id,
        tenant_id=ato.tenant_id,
        nota=payload.nota,
    )
    db.add(fav)
    await db.commit()
    return {"status": "adicionado"}


@router.delete("/favoritos/{ato_id}")
async def remover_favorito(
    ato_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    cu: Annotated[dict, Depends(get_current_user)],
):
    r = await db.execute(
        select(AtoFavorito).where(
            AtoFavorito.user_id == cu["id"],
            AtoFavorito.ato_id == ato_id,
        )
    )
    fav = r.scalar_one_or_none()
    if not fav:
        return {"status": "ja_removido"}
    await db.delete(fav)
    await db.commit()
    return {"status": "removido"}
