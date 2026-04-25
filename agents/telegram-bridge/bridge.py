#!/usr/bin/env python3
"""
Bridge CEO ↔ Telegram — Dig Dig
O CEO fala com o presidente (Regis) via Telegram.
"""

import asyncio
import json
import os
import sys
from functools import partial

import requests
from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
TELEGRAM_TOKEN    = os.getenv("TELEGRAM_TOKEN", "")
PRESIDENT_CHAT_ID = int(os.getenv("PRESIDENT_CHAT_ID", "0"))
PAPERCLIP_URL     = os.getenv("PAPERCLIP_URL", "http://localhost:3100")
COMPANY_ID        = os.getenv("COMPANY_ID", "")
CEO_AGENT_ID      = os.getenv("CEO_AGENT_ID", "")
POLL_INTERVAL     = int(os.getenv("POLL_INTERVAL", "8"))  # segundos

STATE_FILE = os.path.join(os.path.dirname(__file__), "bridge_state.json")

# ── Estado persistido ─────────────────────────────────────────────────────────
def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"seen_approvals": [], "last_comment_ids": {}}

def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

# ── Paperclip API (sync — rode via asyncio.to_thread) ────────────────────────
def _api(method: str, path: str, **kwargs):
    try:
        resp = getattr(requests, method)(f"{PAPERCLIP_URL}/api{path}", timeout=10, **kwargs)
        if resp.ok:
            return resp.json()
        print(f"[api] {method.upper()} {path} → {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[api] Erro em {method.upper()} {path}: {e}")
    return None

async def api(method: str, path: str, **kwargs):
    return await asyncio.to_thread(_api, method, path, **kwargs)

async def get_ceo_active_issue() -> dict | None:
    for status in ["in_progress", "todo"]:
        issues = await api("get", f"/companies/{COMPANY_ID}/issues",
                           params={"assigneeAgentId": CEO_AGENT_ID, "status": status, "limit": 1})
        if issues:
            return issues[0]
    return None

async def create_inbox_issue(first_message: str) -> dict | None:
    preview = first_message[:60] + ("…" if len(first_message) > 60 else "")
    return await api("post", f"/companies/{COMPANY_ID}/issues",
                     json={
                         "title": f"💬 {preview}",
                         "status": "todo",
                         "assigneeAgentId": CEO_AGENT_ID,
                         "description": "Mensagem direta do Presidente via Telegram.",
                     })

async def post_president_message(issue_id: str, text: str):
    return await api("post", f"/issues/{issue_id}/comments",
                     json={"body": f"**📱 Mensagem do Presidente (Regis):**\n\n{text}"})

async def wake_ceo(reason: str = "telegram_message"):
    return await api("post", f"/agents/{CEO_AGENT_ID}/wakeup",
                     json={"source": "on_demand", "triggerDetail": "ping", "reason": reason})

async def get_new_ceo_comments(issue_id: str, after_id: str | None) -> list:
    params = {"order": "asc", "limit": 50}
    if after_id:
        params["afterCommentId"] = after_id
    comments = await api("get", f"/issues/{issue_id}/comments", params=params) or []
    return [c for c in comments if c.get("agentId") == CEO_AGENT_ID]

async def get_pending_approvals() -> list:
    return await api("get", f"/companies/{COMPANY_ID}/approvals", params={"status": "pending"}) or []

async def do_approve(approval_id: str, note: str = "Aprovado pelo presidente via Telegram."):
    return await api("post", f"/approvals/{approval_id}/approve", json={"decisionNote": note})

async def do_reject(approval_id: str, note: str = "Rejeitado pelo presidente via Telegram."):
    return await api("post", f"/approvals/{approval_id}/reject", json={"decisionNote": note})

# ── Helpers Telegram ──────────────────────────────────────────────────────────
def is_president(update: Update) -> bool:
    return update.effective_chat.id == PRESIDENT_CHAT_ID

TELEGRAM_MAX = 4000  # Telegram suporta 4096, deixamos margem

def truncate(text: str, limit: int = TELEGRAM_MAX) -> str:
    return text if len(text) <= limit else text[:limit] + "…"

def split_message(text: str) -> list[str]:
    """Divide texto em partes de até 4000 chars sem cortar no meio de uma palavra."""
    if len(text) <= TELEGRAM_MAX:
        return [text]
    parts = []
    while text:
        if len(text) <= TELEGRAM_MAX:
            parts.append(text)
            break
        cut = text.rfind("\n", 0, TELEGRAM_MAX)
        if cut == -1:
            cut = text.rfind(" ", 0, TELEGRAM_MAX)
        if cut == -1:
            cut = TELEGRAM_MAX
        parts.append(text[:cut])
        text = text[cut:].lstrip()
    return parts

# ── Handlers ──────────────────────────────────────────────────────────────────
async def handle_message(update: Update, context):
    """Mensagem do Regis → comentário na issue do CEO → acorda o CEO."""
    if not is_president(update):
        return

    text = update.message.text
    issue = await get_ceo_active_issue()

    if not issue:
        issue = await create_inbox_issue(text)
        if not issue:
            await update.message.reply_text("❌ Erro ao criar issue. Verifique se o Paperclip está rodando.")
            return

    if await post_president_message(issue["id"], text):
        await wake_ceo()
        title = issue.get("title", "")
        # Escapa caracteres especiais do Markdown para o título
        safe_title = title.replace("_", "\\_").replace("*", "\\*").replace("`", "\\`")
        await update.message.reply_text(
            f"✅ Enviado ao CEO.\n_{safe_title}_",
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text("❌ Erro ao enviar. Verifique se o Paperclip está rodando.")

async def handle_approval_button(update: Update, context):
    """Botão de aprovação/rejeição no Telegram."""
    query = update.callback_query
    await query.answer()

    if ":" not in (query.data or ""):
        return

    action, approval_id = query.data.split(":", 1)
    original = query.message.text or ""

    if action == "approve":
        await do_approve(approval_id)
        await wake_ceo("approval_granted")
        await query.edit_message_text(f"✅ *Aprovado!*\n\n{truncate(original)}", parse_mode="Markdown")
    elif action == "reject":
        await do_reject(approval_id)
        await wake_ceo("approval_rejected")
        await query.edit_message_text(f"❌ *Rejeitado.*\n\n{truncate(original)}", parse_mode="Markdown")

async def cmd_status(update: Update, context):
    """/status — mostra o estado atual do CEO."""
    if not is_president(update):
        return

    issue = await get_ceo_active_issue()
    approvals = await get_pending_approvals()

    lines = ["*Status do CEO*\n"]
    if issue:
        lines.append(f"📋 *Tarefa ativa:* {issue['title']}")
        lines.append(f"   Status: `{issue['status']}`\n")
    else:
        lines.append("📋 Sem tarefa ativa no momento.\n")

    if approvals:
        lines.append(f"⚠️ *{len(approvals)} aprovação(ões) pendente(s)*")
    else:
        lines.append("✅ Sem aprovações pendentes.")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def cmd_help(update: Update, context):
    """/help — comandos disponíveis."""
    if not is_president(update):
        return
    msg = (
        "*CEO — Comandos disponíveis*\n\n"
        "/status — ver tarefa ativa e aprovações pendentes\n"
        "/help — esta mensagem\n\n"
        "Qualquer outra mensagem é enviada diretamente ao CEO."
    )
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Loop de polling do Paperclip ──────────────────────────────────────────────
async def poll_paperclip(app: Application):
    state = load_state()
    seen_approvals: set = set(state.get("seen_approvals", []))
    last_comment_ids: dict = state.get("last_comment_ids", {})

    while True:
        try:
            # 1. Novos comentários do CEO
            issue = await get_ceo_active_issue()
            if issue:
                issue_id = issue["id"]
                after = last_comment_ids.get(issue_id)
                new_comments = await get_new_ceo_comments(issue_id, after)

                for comment in new_comments:
                    body = comment.get("body", "").strip()
                    parts = split_message(body)
                    for i, part in enumerate(parts):
                        prefix = "🤝 *CEO:*\n\n" if i == 0 else "🤝 *(cont.)*\n\n"
                        try:
                            await app.bot.send_message(
                                PRESIDENT_CHAT_ID,
                                f"{prefix}{part}",
                                parse_mode="Markdown",
                            )
                        except Exception:
                            await app.bot.send_message(PRESIDENT_CHAT_ID, f"{prefix}{part}")
                    last_comment_ids[issue_id] = comment["id"]

                if new_comments:
                    state["last_comment_ids"] = last_comment_ids
                    save_state(state)

            # 2. Aprovações pendentes
            approvals = await get_pending_approvals()
            for approval in approvals:
                if approval["id"] in seen_approvals:
                    continue

                seen_approvals.add(approval["id"])
                state["seen_approvals"] = list(seen_approvals)
                save_state(state)

                title = approval.get("title") or approval.get("type", "Aprovação")
                payload = approval.get("payload") or approval.get("description") or {}
                detail = json.dumps(payload, ensure_ascii=False, indent=2) if isinstance(payload, dict) else str(payload)

                msg = f"⚠️ *CEO solicita aprovação:*\n\n*{title}*\n\n{truncate(detail, 600)}"
                keyboard = [[
                    InlineKeyboardButton("✅ Aprovar", callback_data=f"approve:{approval['id']}"),
                    InlineKeyboardButton("❌ Rejeitar", callback_data=f"reject:{approval['id']}"),
                ]]
                await app.bot.send_message(
                    PRESIDENT_CHAT_ID, msg,
                    reply_markup=InlineKeyboardMarkup(keyboard),
                    parse_mode="Markdown",
                )

        except Exception as e:
            print(f"[poll] Erro: {e}")

        await asyncio.sleep(POLL_INTERVAL)

# ── Startup ───────────────────────────────────────────────────────────────────
async def post_init(app: Application):
    asyncio.create_task(poll_paperclip(app))
    print("Bridge CEO <-> Telegram rodando!")
    if PRESIDENT_CHAT_ID:
        try:
            await app.bot.send_message(
                PRESIDENT_CHAT_ID,
                "🚀 *Bridge CEO x Telegram iniciado.*\n\n"
                "Fale comigo aqui - suas mensagens chegam direto ao CEO.\n"
                "Use /status para ver o estado atual.",
                parse_mode="Markdown",
            )
        except Exception as e:
            print(f"[startup] Nao foi possivel enviar mensagem inicial: {e}")
            print("[startup] Envie /start para o bot no Telegram para ativar a conversa.")

def main():
    missing = []
    if not TELEGRAM_TOKEN:
        missing.append("TELEGRAM_TOKEN")
    if not PRESIDENT_CHAT_ID:
        missing.append("PRESIDENT_CHAT_ID")
    if not COMPANY_ID:
        missing.append("COMPANY_ID")
    if not CEO_AGENT_ID:
        missing.append("CEO_AGENT_ID")
    if missing:
        print(f"❌ Variáveis faltando no .env: {', '.join(missing)}")
        sys.exit(1)

    app = (
        Application.builder()
        .token(TELEGRAM_TOKEN)
        .post_init(post_init)
        .build()
    )
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CallbackQueryHandler(handle_approval_button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Iniciando bridge CEO <-> Telegram...")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
