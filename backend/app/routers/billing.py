import hashlib
import hmac

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
import mercadopago
import structlog

from app.config import settings

log = structlog.get_logger()
router = APIRouter(prefix="/billing", tags=["billing"])


def _sdk() -> mercadopago.SDK:
    return mercadopago.SDK(settings.mercadopago_access_token)


class CriarPagamentoRequest(BaseModel):
    tipo: str       # "patrocinador" | "doacao"
    valor: float
    form_data: dict  # formData vindo do MP Payment Brick


@router.post("/criar-pagamento")
async def criar_pagamento(req: CriarPagamentoRequest):
    if req.valor < 1:
        raise HTTPException(status_code=400, detail="Valor mínimo: R$ 1,00")

    descricao = (
        "Patrocínio — Dig Dig"
        if req.tipo == "patrocinador"
        else "Doação — Dig Dig"
    )

    payment_data = {
        **req.form_data,
        "transaction_amount": req.valor,
        "description": descricao,
        "external_reference": req.tipo,
        "statement_descriptor": "DIG DIG",
        "binary_mode": False,  # permite status pending (PIX, anti-fraude)
    }

    sdk = _sdk()
    result = sdk.payment().create(payment_data)

    if result["status"] not in (200, 201):
        detail = result["response"].get("message", "Erro ao criar pagamento")
        log.error("mp_payment_create_failed", status=result["status"], detail=detail)
        raise HTTPException(status_code=400, detail=detail)

    response = result["response"]
    log.info(
        "mp_payment_created",
        payment_id=response["id"],
        status=response.get("status"),
        tipo=req.tipo,
        valor=req.valor,
    )

    out: dict = {
        "payment_id": response["id"],
        "status": response.get("status"),
        "status_detail": response.get("status_detail"),
    }

    # PIX — inclui QR code para exibir na tela
    pix = response.get("point_of_interaction", {}).get("transaction_data", {})
    if pix.get("qr_code"):
        out["pix_qr_code"] = pix["qr_code"]
        out["pix_qr_code_base64"] = pix.get("qr_code_base64", "")

    return out


def _verify_mp_signature(request: Request, data_id: str) -> bool:
    secret = settings.mercadopago_webhook_secret
    if not secret:
        return True  # sem secret configurado, aceita tudo (dev)

    x_signature = request.headers.get("x-signature", "")
    x_request_id = request.headers.get("x-request-id", "")

    ts = ""
    v1 = ""
    for part in x_signature.split(","):
        k, _, v = part.strip().partition("=")
        if k == "ts":
            ts = v
        elif k == "v1":
            v1 = v

    if not ts or not v1:
        return False

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


@router.post("/webhook/mp")
async def webhook_mp(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
    except Exception:
        body = {}

    notif_type = body.get("type")
    payment_id = body.get("data", {}).get("id")

    if payment_id and not _verify_mp_signature(request, str(payment_id)):
        log.warning("mp_webhook_invalid_signature", payment_id=payment_id)
        raise HTTPException(status_code=401, detail="Invalid signature")

    if notif_type == "payment" and payment_id:
        background_tasks.add_task(_processar_pagamento, int(payment_id))

    return {"ok": True}


async def _processar_pagamento(payment_id: int) -> None:
    sdk = _sdk()
    result = sdk.payment().get(payment_id)
    if result["status"] != 200:
        log.warning("mp_webhook_get_failed", payment_id=payment_id, status=result["status"])
        return

    p = result["response"]
    status = p.get("status")
    tipo = p.get("external_reference", "")
    email = p.get("payer", {}).get("email", "")
    valor = p.get("transaction_amount")

    log.info(
        "mp_payment_notification",
        payment_id=payment_id,
        status=status,
        tipo=tipo,
        email=email,
        valor=valor,
    )

    # TODO: quando status == "approved", atualizar plano do usuário pelo email
