import uuid
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, text
from app.config import settings
from app.database import get_db
from app.models.ato import RodadaAnalise, Ato, ConteudoAto
from app.models.analise import Analise
from app.models.tenant import Tenant
import jwt as pyjwt
import httpx
import resend

router = APIRouter(prefix="/pnl", tags=["admin"])

STATUSES_ATIVOS = ("em_progresso", "pendente")


# ── Auth admin (JWT via Supabase session, valida email contra ADMIN_EMAILS) ──
_bearer = HTTPBearer(auto_error=False)


def _is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() in settings.admin_emails_list


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
    if not _is_admin_email(user.get("email")):
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user


@router.post("/orgaos/{slug}/rodadas")
async def iniciar_rodada(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):

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
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
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
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Lista todas as rodadas de um órgão (mais recentes primeiro)."""
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
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Cancela uma rodada ativa. Os workers vão parar na próxima verificação."""
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
        "atos_analisados_piper": rodada.atos_analisados_piper,
        "atos_analisados_bud": rodada.atos_analisados_bud,
        "custo_total_usd": float(rodada.custo_total_usd) if rodada.custo_total_usd else 0.0,
        "criado_em": rodada.criado_em.isoformat() if rodada.criado_em else None,
        "iniciado_em": rodada.iniciado_em.isoformat() if rodada.iniciado_em else None,
        "concluido_em": rodada.concluido_em.isoformat() if rodada.concluido_em else None,
        "erro_mensagem": rodada.erro_mensagem,
    }


# ── Painel Administrativo (rotas internas com require_admin) ─────────────────


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

    nome, email = req[1], req[2]
    primeiro_nome = nome.split()[0] if nome else "Olá"

    # Gera link de invite via Supabase (sem enviar email pelo Supabase)
    async with httpx.AsyncClient() as client:
        invite_resp = await client.post(
            f"{settings.supabase_url}/auth/v1/admin/generate_link",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
            json={
                "type": "invite",
                "email": email,
                "data": {"nome": nome},
                "options": {"redirect_to": "https://pnl.digdig.com.br/pnl/dashboard"},
            },
            timeout=15,
        )

    action_link = ""
    if invite_resp.is_success:
        action_link = invite_resp.json().get("action_link", "")
    else:
        # Usuário já existe — gera magic link para login direto
        async with httpx.AsyncClient() as client:
            ml_resp = await client.post(
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
        if ml_resp.is_success:
            action_link = ml_resp.json().get("action_link", "")

    if not action_link:
        raise HTTPException(502, "Não foi possível gerar o link de acesso")

    resend.api_key = os.environ["RESEND_API_KEY"]
    resend.Emails.send({
        "from": os.environ.get("RESEND_FROM", "noreply@digdig.com.br"),
        "to": email,
        "subject": "Seu acesso ao Dig Dig foi liberado",
        "html": f"""
<div style="font-family:monospace;background:#07080f;color:#fff;padding:40px 32px;max-width:480px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:0.18em;color:#ffffff60;text-transform:uppercase;margin:0 0 28px">Dig Dig &middot; Acesso Liberado</p>
  <h1 style="font-size:26px;margin:0 0 16px;font-weight:800">{primeiro_nome}, seu acesso foi aprovado.</h1>
  <p style="color:#ffffffb3;line-height:1.7;margin:0 0 20px;font-size:13px">
    Você agora tem acesso ao painel de investigações do Dig Dig. Clique no botão abaixo para definir sua senha e entrar na plataforma.
  </p>
  <p style="color:#ffffff70;line-height:1.7;margin:0 0 28px;font-size:12px">
    O link é válido por 24 horas e de uso único.
  </p>
  <a href="{action_link}"
     style="display:inline-block;background:#fff;color:#07080f;padding:12px 28px;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none">
    Acessar o painel →
  </a>
  <hr style="border:none;border-top:1px solid #ffffff15;margin:32px 0">
  <p style="color:#ffffff40;font-size:11px;line-height:1.6;margin:0">
    Dig Dig analisa automaticamente atos administrativos de órgãos públicos com IA.<br>
    Use os dados com responsabilidade — jornalismo, advocacy e transparência pública.<br><br>
    <a href="https://digdig.com.br" style="color:#ffffff40">digdig.com.br</a>
  </p>
</div>
    """,
    })

    return {"ok": True, "email": email}


@router.post("/admin/access-requests/{req_id}/rejeitar", status_code=200)
async def admin_rejeitar(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    row = await db.execute(
        text("SELECT nome, email FROM access_requests WHERE id = :id").bindparams(id=req_id)
    )
    req = row.fetchone()
    if not req:
        raise HTTPException(404, "Pedido não encontrado")

    result = await db.execute(
        text("UPDATE access_requests SET status = 'rejeitado' WHERE id = :id RETURNING id")
        .bindparams(id=req_id)
    )
    if not result.fetchone():
        raise HTTPException(404, "Pedido não encontrado")
    await db.commit()

    nome, email = req[0], req[1]
    primeiro_nome = nome.split()[0] if nome else "Olá"

    resend.api_key = os.environ["RESEND_API_KEY"]
    resend.Emails.send({
        "from": os.environ.get("RESEND_FROM", "noreply@digdig.com.br"),
        "to": email,
        "subject": "Sobre seu pedido de acesso — Dig Dig",
        "html": f"""
<div style="font-family:monospace;background:#07080f;color:#fff;padding:40px 32px;max-width:480px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:0.18em;color:#ffffff60;text-transform:uppercase;margin:0 0 28px">Dig Dig &middot; Pedido de Acesso</p>
  <h1 style="font-size:24px;margin:0 0 16px;font-weight:800">{primeiro_nome}, obrigado pelo interesse.</h1>
  <p style="color:#ffffffb3;line-height:1.7;margin:0 0 20px;font-size:13px">
    Analisamos seu pedido de acesso e, por ora, não conseguimos abrir uma vaga para o seu perfil.
  </p>
  <p style="color:#ffffff70;line-height:1.7;margin:0 0 28px;font-size:12px">
    O Dig Dig está em fase beta fechada — o acesso é liberado gradualmente para garantir que os dados de investigação pública sejam usados com responsabilidade. Estamos expandindo aos poucos.
  </p>
  <p style="color:#ffffff70;line-height:1.7;margin:0 0 28px;font-size:12px">
    Fique de olho nos nossos canais. Quando abrirmos novas vagas, você pode solicitar acesso novamente em <a href="https://digdig.com.br" style="color:#ffffff90">digdig.com.br</a>.
  </p>
  <hr style="border:none;border-top:1px solid #ffffff15;margin:32px 0">
  <p style="color:#ffffff40;font-size:11px;line-height:1.6;margin:0">
    Dig Dig &mdash; Transparência com dentes<br>
    <a href="https://digdig.com.br" style="color:#ffffff40">digdig.com.br</a>
  </p>
</div>
    """,
    })

    return {"ok": True}


@router.get("/admin/usuarios-auth")
async def admin_list_auth_users(
    _: dict = Depends(require_admin),
):
    """Lista todos os usuários cadastrados no Supabase Auth."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/admin/users?per_page=200",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=15,
        )
    if not resp.is_success:
        raise HTTPException(status_code=502, detail="Erro ao buscar usuários")
    data = resp.json()
    users = data.get("users", [])
    return [
        {
            "id": u.get("id"),
            "email": u.get("email"),
            "nome": (u.get("user_metadata") or {}).get("nome") or (u.get("user_metadata") or {}).get("full_name"),
            "criado_em": u.get("created_at"),
            "ultimo_login": u.get("last_sign_in_at"),
            "confirmado": u.get("email_confirmed_at") is not None,
        }
        for u in users
    ]


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


@router.get("/admin/pipeline-status/{slug}")
async def pipeline_status(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Status agregado das filas de análise (para o painel /pnl/pipeline).

    Retorna 3 filas — aguardando cada agente — com total e amostra dos 10
    documentos mais recentes em cada fila.
    """
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Órgão '{slug}' não encontrado")
    tid = tenant.id

    def _serialize_ato_rows(rows) -> list[dict]:
        out = []
        for row in rows:
            ato_id, tipo, numero, data, nivel = row[0], row[1], row[2], row[3], (row[4] if len(row) > 4 else None)
            out.append({
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": numero or "?",
                "data_publicacao": data.isoformat() if data else None,
                "nivel_alerta": nivel,
            })
        return out

    # ── Fila 1: Aguarda Piper (triagem) ─────────────────────────────────────
    # Ato com texto extraído (boa/parcial/ruim) que ainda não tem resultado_piper.
    aguarda_piper_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            ConteudoAto.qualidade.in_(["boa", "parcial", "ruim"]),
            ~select(Analise.id).where(
                Analise.ato_id == Ato.id, Analise.resultado_piper.isnot(None)
            ).exists(),
        )
    )
    piper_total = (await db.execute(select(func.count()).select_from(aguarda_piper_base.subquery()))).scalar_one()
    piper_amostra = (
        await db.execute(aguarda_piper_base.order_by(Ato.data_publicacao.desc().nullslast()).limit(10))
    ).all()

    # ── Fila 2: Aguarda Bud (aprofundamento de críticos) ────────────────────
    # Análise Piper marcou vermelho/laranja, sem resultado_bud.
    aguarda_bud_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Analise.nivel_alerta)
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            Analise.resultado_piper.isnot(None),
            Analise.nivel_alerta.in_(["vermelho", "laranja"]),
            Analise.resultado_bud.is_(None),
        )
    )
    bud_total = (await db.execute(select(func.count()).select_from(aguarda_bud_base.subquery()))).scalar_one()
    bud_amostra = (
        await db.execute(aguarda_bud_base.order_by(Analise.criado_em.desc()).limit(10))
    ).all()

    # ── Fila 3: Aguarda New (revisão sistêmica de vermelhos) ────────────────
    aguarda_new_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Analise.nivel_alerta)
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            Analise.resultado_bud.isnot(None),
            Analise.nivel_alerta == "vermelho",
            Analise.resultado_new.is_(None),
        )
    )
    new_total = (await db.execute(select(func.count()).select_from(aguarda_new_base.subquery()))).scalar_one()
    new_amostra = (
        await db.execute(aguarda_new_base.order_by(Analise.criado_em.desc()).limit(10))
    ).all()

    return {
        "tenant": {"id": str(tid), "slug": slug, "nome": tenant.nome_completo},
        "filas": {
            "aguarda_piper": {
                "total": piper_total,
                "amostra": _serialize_ato_rows(piper_amostra),
                "agente": "Piper (Gemini 2.5 Pro)",
                "descricao": "Triagem inicial — todo ato com texto entra aqui",
            },
            "aguarda_bud": {
                "total": bud_total,
                "amostra": _serialize_ato_rows(bud_amostra),
                "agente": "Bud (Claude Sonnet)",
                "descricao": "Aprofundamento de críticos (vermelho ou laranja)",
            },
            "aguarda_new": {
                "total": new_total,
                "amostra": _serialize_ato_rows(new_amostra),
                "agente": "New (Claude Opus)",
                "descricao": "Revisão sistêmica de vermelhos confirmados pelo Bud",
            },
        },
    }


@router.post("/admin/magic-link", status_code=200)
async def send_magic_link_via_resend(request: Request):
    """Gera magic link via Supabase Admin API e envia pelo Resend (sem limite de envios)."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()

    if not _is_admin_email(email):
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
