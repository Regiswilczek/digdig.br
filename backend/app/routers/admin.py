import uuid
import hmac
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, text
from app.config import settings
from app.database import get_db
from app.models.ato import RodadaAnalise, Ato
from app.models.analise import Analise
from app.models.tenant import Tenant
import jwt as pyjwt
import httpx
import resend

router = APIRouter(prefix="/pnl", tags=["admin"])

STATUSES_ATIVOS = ("em_progresso", "pendente")


def verify_admin_secret(request: Request) -> None:
    secret = request.headers.get("X-Admin-Secret", "")
    if not secret or not hmac.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/orgaos/{slug}/rodadas")
async def iniciar_rodada(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_admin_secret(request)

    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Órgão '{slug}' não encontrado")

    # Guard: rejeita se já existe rodada ativa para este órgão
    ativa_result = await db.execute(
        select(RodadaAnalise).where(
            RodadaAnalise.tenant_id == tenant.id,
            RodadaAnalise.status.in_(STATUSES_ATIVOS),
        )
    )
    rodada_ativa = ativa_result.scalar_one_or_none()
    if rodada_ativa:
        raise HTTPException(
            status_code=409,
            detail={
                "erro": "rodada_ja_ativa",
                "mensagem": f"Já existe uma rodada {rodada_ativa.status} para '{slug}'. "
                            f"Cancele a rodada {rodada_ativa.id} antes de iniciar uma nova.",
                "rodada_id": str(rodada_ativa.id),
                "status": rodada_ativa.status,
            },
        )

    rodada = RodadaAnalise(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        status="pendente",
        criado_em=datetime.now(timezone.utc),
    )
    db.add(rodada)
    await db.commit()

    # Dispatch Celery task
    from app.workers.orquestrador import iniciar_rodada_task
    iniciar_rodada_task.delay(str(rodada.id), slug)

    return {
        "rodada_id": str(rodada.id),
        "tenant": slug,
        "status": "iniciada",
        "mensagem": "Pipeline iniciado. Acompanhe o status via GET /pnl/rodadas/{rodada_id}",
    }


@router.get("/rodadas/{rodada_id}")
async def status_rodada(
    rodada_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_admin_secret(request)

    result = await db.execute(
        select(RodadaAnalise).where(RodadaAnalise.id == uuid.UUID(rodada_id))
    )
    rodada = result.scalar_one_or_none()
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")

    return _rodada_dict(rodada)


@router.get("/orgaos/{slug}/rodadas")
async def listar_rodadas(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as rodadas de um órgão (mais recentes primeiro)."""
    verify_admin_secret(request)

    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Órgão '{slug}' não encontrado")

    result = await db.execute(
        select(RodadaAnalise)
        .where(RodadaAnalise.tenant_id == tenant.id)
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(20)
    )
    rodadas = result.scalars().all()
    return [_rodada_dict(r) for r in rodadas]


@router.post("/rodadas/{rodada_id}/cancelar")
async def cancelar_rodada(
    rodada_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Cancela uma rodada ativa. Os workers vão parar na próxima verificação."""
    verify_admin_secret(request)

    result = await db.execute(
        select(RodadaAnalise).where(RodadaAnalise.id == uuid.UUID(rodada_id))
    )
    rodada = result.scalar_one_or_none()
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")

    if rodada.status not in STATUSES_ATIVOS:
        raise HTTPException(
            status_code=409,
            detail=f"Rodada já está com status '{rodada.status}' — não é possível cancelar.",
        )

    await db.execute(
        update(RodadaAnalise)
        .where(RodadaAnalise.id == uuid.UUID(rodada_id))
        .values(status="cancelada", concluido_em=datetime.now(timezone.utc))
    )
    await db.commit()

    return {
        "rodada_id": rodada_id,
        "status": "cancelada",
        "mensagem": "Rodada marcada como cancelada. Workers em andamento vão concluir o ato atual e parar.",
    }


def _rodada_dict(rodada: RodadaAnalise) -> dict:
    return {
        "rodada_id": str(rodada.id),
        "status": rodada.status,
        "total_atos": rodada.total_atos,
        "atos_scrapeados": rodada.atos_scrapeados,
        "atos_analisados_haiku": rodada.atos_analisados_haiku,
        "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
        "custo_total_usd": float(rodada.custo_total_usd) if rodada.custo_total_usd else 0.0,
        "criado_em": rodada.criado_em.isoformat() if rodada.criado_em else None,
        "iniciado_em": rodada.iniciado_em.isoformat() if rodada.iniciado_em else None,
        "concluido_em": rodada.concluido_em.isoformat() if rodada.concluido_em else None,
        "erro_mensagem": rodada.erro_mensagem,
    }


# ── Painel Administrativo (JWT via Supabase session) ─────────────────────────

ADMIN_EMAIL = "regisalessander@gmail.com"
_bearer = HTTPBearer(auto_error=False)


async def require_admin(
    creds: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Token necessário")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {creds.credentials}",
                "apikey": settings.supabase_service_role_key,
            },
            timeout=10,
        )
    if not resp.is_success:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = resp.json()
    if user.get("email") != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user


@router.get("/admin/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    # Fila de espera por status
    waitlist = await db.execute(
        text("SELECT status, COUNT(*) FROM access_requests GROUP BY status")
    )
    waitlist_rows = waitlist.fetchall()
    wl = {row[0]: row[1] for row in waitlist_rows}

    # Total atos e custo acumulado
    atos_total = await db.execute(select(func.count()).select_from(Ato))
    analises_total = await db.execute(
        select(func.count()).where(Analise.nivel_alerta.isnot(None))
    )
    custo = await db.execute(
        select(func.sum(RodadaAnalise.custo_total_usd))
    )

    # Rodadas ativas
    rodadas_ativas = await db.execute(
        select(func.count()).where(RodadaAnalise.status.in_(["em_progresso", "pendente"]))
    )

    return {
        "waitlist": {
            "pendente": wl.get("pendente", 0),
            "aprovado": wl.get("aprovado", 0),
            "rejeitado": wl.get("rejeitado", 0),
            "total": sum(wl.values()),
        },
        "atos_total": atos_total.scalar_one(),
        "analises_total": analises_total.scalar_one(),
        "custo_total_usd": float(custo.scalar_one() or 0),
        "rodadas_ativas": rodadas_ativas.scalar_one(),
    }


@router.get("/admin/access-requests")
async def admin_list_access_requests(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if status:
        rows = await db.execute(
            text("SELECT id, nome, email, profissao, motivacao, status, created_at "
                 "FROM access_requests WHERE status = :s ORDER BY created_at DESC")
            .bindparams(s=status)
        )
    else:
        rows = await db.execute(
            text("SELECT id, nome, email, profissao, motivacao, status, created_at "
                 "FROM access_requests ORDER BY created_at DESC")
        )
    return [
        {
            "id": str(r[0]),
            "nome": r[1],
            "email": r[2],
            "profissao": r[3],
            "motivacao": r[4],
            "status": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
        }
        for r in rows.fetchall()
    ]


@router.post("/admin/access-requests/{req_id}/aprovar", status_code=200)
async def admin_aprovar(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    row = await db.execute(
        text("SELECT id, nome, email FROM access_requests WHERE id = :id").bindparams(id=req_id)
    )
    req = row.fetchone()
    if not req:
        raise HTTPException(404, "Pedido não encontrado")

    await db.execute(
        text("UPDATE access_requests SET status = 'aprovado' WHERE id = :id").bindparams(id=req_id)
    )
    await db.commit()

    # Envia invite via Supabase Admin API
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/invite",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
            json={"email": req[2], "data": {"nome": req[1]}},
            timeout=15,
        )

    if resp.status_code not in (200, 201, 422):
        # 422 = já existe usuário com esse email — ok, só notifica
        raise HTTPException(502, f"Erro ao enviar invite Supabase: {resp.text}")

    return {"ok": True, "email": req[2]}


@router.post("/admin/access-requests/{req_id}/rejeitar", status_code=200)
async def admin_rejeitar(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    result = await db.execute(
        text("UPDATE access_requests SET status = 'rejeitado' WHERE id = :id RETURNING id")
        .bindparams(id=req_id)
    )
    if not result.fetchone():
        raise HTTPException(404, "Pedido não encontrado")
    await db.commit()
    return {"ok": True}


@router.get("/admin/rodadas")
async def admin_all_rodadas(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    result = await db.execute(
        select(RodadaAnalise, Tenant.slug, Tenant.nome)
        .join(Tenant, RodadaAnalise.tenant_id == Tenant.id)
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(50)
    )
    rows = result.all()
    return [
        {
            **_rodada_dict(row[0]),
            "slug": row[1],
            "orgao": row[2],
        }
        for row in rows
    ]


@router.post("/admin/magic-link", status_code=200)
async def send_magic_link_via_resend(request: Request):
    """Gera magic link via Supabase Admin API e envia pelo Resend (sem limite de envios)."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()

    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/admin/generate_link",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
            json={
                "type": "magiclink",
                "email": email,
                "options": {"redirect_to": "https://digdig.com.br/pnl-login"},
            },
            timeout=15,
        )

    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Erro Supabase: {resp.text}")

    action_link = resp.json().get("action_link", "")

    resend.api_key = os.environ["RESEND_API_KEY"]
    resend.Emails.send({
        "from": os.environ.get("RESEND_FROM", "noreply@digdig.com.br"),
        "to": email,
        "subject": "Link de acesso — Dig Dig Admin",
        "html": f"""
<div style="font-family:monospace;background:#07080f;color:#fff;padding:40px 32px;max-width:440px;margin:0 auto">
  <p style="font-size:10px;letter-spacing:0.2em;color:#ffffff40;text-transform:uppercase;margin:0 0 28px">Dig Dig &middot; Admin</p>
  <h1 style="font-size:22px;margin:0 0 16px;font-weight:800">Link de acesso</h1>
  <p style="color:#ffffffb3;line-height:1.7;margin:0 0 28px;font-size:13px">
    Clique no botão abaixo para acessar o painel administrativo. O link expira em 1 hora e é de uso único.
  </p>
  <a href="{action_link}"
     style="display:inline-block;background:#fff;color:#07080f;padding:12px 24px;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none">
    Acessar painel →
  </a>
  <p style="color:#ffffff30;font-size:10px;margin-top:32px;line-height:1.6">
    Se você não solicitou este link, ignore este email.<br>
    Dig Dig &mdash; digdig.com.br
  </p>
</div>
        """,
    })

    return {"ok": True}
