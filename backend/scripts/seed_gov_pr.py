#!/usr/bin/env python3
"""
seed_gov_pr.py — cadastra/atualiza o tenant 'gov-pr' (Governo do Estado do
Paraná) e popula sua Knowledge Base inicial.

Idempotente — re-rodar não duplica registros (UPDATE quando já existe).

Uso (cd backend/):
    python scripts/seed_gov_pr.py
"""
import asyncio
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import select
from app.database import async_session_factory
from app.models.tenant import Tenant, KnowledgeBase

SLUG = "gov-pr"
NOME = "GOV/PR"
NOME_COMPLETO = "Governo do Estado do Paraná — Poder Executivo"
TIPO_ORGAO = "executivo_estadual"
ESTADO = "PR"
COR_TEMA = "#1d4ed8"  # azul institucional, distinto do verde do CAU
DESCRICAO_CURTA = "Executivo estadual paranaense — Governadoria, secretarias, autarquias e empresas estatais."
SITE_URL = "https://www.parana.pr.gov.br"
LOGO_URL = None

SCRAPER_CONFIG = {
    "fonte_principal": "pte_convenios",
    "fontes": [
        {
            "id": "pte_convenios",
            "tipo": "pte_jsf",
            "url": "https://www.transparencia.pr.gov.br/pte/assunto/4/127",
            "obscura": True,
            "needs_postback": False,
            "descricao": "Convênios estaduais — PDFs anexos no TCE-PR",
        },
        {
            "id": "pte_licitacoes",
            "tipo": "pte_jsf",
            "url": "https://www.transparencia.pr.gov.br/pte/assunto/5/115",
            "obscura": True,
            "needs_postback": True,
            "descricao": "Licitações — Download do BD CSV via PrimeFaces AJAX",
        },
        {
            "id": "pte_contratos",
            "tipo": "pte_jsf",
            "url": "https://www.transparencia.pr.gov.br/pte/assunto/5/114",
            "obscura": True,
            "needs_postback": True,
            "descricao": "Contratos firmados pelo Executivo",
        },
        {
            "id": "dioe_executivo",
            "tipo": "dioe_struts",
            "url": "https://www.documentos.dioe.pr.gov.br/dioe/consultaPublicaPDF.do",
            "diario_codigo": 3,
            "captcha": "manual_session",
            "obscura": False,
            "descricao": "Diário Oficial Executivo — 5.431 edições, captcha gated",
        },
    ],
}

MINDSET_AUDITORIA = """MINDSET DE AUDITORIA — EXECUTIVO ESTADUAL (CONTEXTO GOV-PR)

1. Omissões são evidências: O que NÃO está escrito (falta de motivação técnica, ausência de dotação orçamentária, ausência de impacto orçamentário-financeiro nas concessões de gratificação) é tão importante quanto o que está escrito.
2. Princípios Constitucionais (LIMPE — Art. 37 CF/88): Avalie sempre Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência. Ato formalmente legal pode violar esses princípios.
3. Linguagem de Camuflagem: Desconfie de "necessidade imperiosa", "interesse público inafastável", "situação excepcional" usados sem comprovação de fato/lei concreta. Atenção especial em decretos de calamidade que ampliam dispensa.
4. Padrões típicos de Executivo estadual a investigar:
   - Contratação direta via emergência/dispensa (Art. 75 da Lei 14.133/21) sem fundamentação fática suficiente
   - Fracionamento de despesa pra fugir de licitação obrigatória
   - Convênios com OSC aliadas politicamente, sem critério objetivo de seleção
   - Nomeações comissionadas em volume desproporcional à estrutura organizacional
   - Decretos de calamidade que ultrapassam escopo emergencial
   - Transferências entre rubricas sem autorização legislativa
   - Gratificações funcionais cumulativas em mesmo CPF (uso de DAS pra majoração disfarçada)
   - Convênios com municípios apenas próximos da eleição (ano eleitoral)
   - Pagamento a fornecedores recorrentes vinculados a doadores de campanha
5. Ato legalmente correto pode ser moralmente errado: nomeações de cônjuges/parentes em órgãos diferentes do que o nomeante ocupa (nepotismo cruzado), exonerações de servidores efetivos pra recolocação de aliados, formação de comissões de inquérito como instrumento de perseguição.
6. Princípio da motivação: todo ato administrativo precisa de motivação suficiente (Lei 9.784/99 federal aplicada subsidiariamente, Lei 18.465/2015 estadual). Atos sem motivação clara são suspeitos por si.
"""


async def main() -> None:
    async with async_session_factory() as db:
        # ── 1. Tenant ─────────────────────────────────────────────────
        r = await db.execute(select(Tenant).where(Tenant.slug == SLUG))
        tenant = r.scalar_one_or_none()
        if tenant:
            print(f"Tenant '{SLUG}' já existe (id={tenant.id}). Atualizando campos.")
            tenant.nome = NOME
            tenant.nome_completo = NOME_COMPLETO
            tenant.tipo_orgao = TIPO_ORGAO
            tenant.estado = ESTADO
            tenant.cor_tema = COR_TEMA
            tenant.descricao_curta = DESCRICAO_CURTA
            tenant.site_url = SITE_URL
            tenant.scraper_config = SCRAPER_CONFIG
            tenant.mindset_auditoria_md = MINDSET_AUDITORIA
        else:
            tenant = Tenant(
                id=uuid.uuid4(),
                slug=SLUG,
                nome=NOME,
                nome_completo=NOME_COMPLETO,
                descricao=None,
                descricao_curta=DESCRICAO_CURTA,
                logo_url=LOGO_URL,
                site_url=SITE_URL,
                cor_tema=COR_TEMA,
                estado=ESTADO,
                tipo_orgao=TIPO_ORGAO,
                status="coming_soon",  # vira 'active' após pipeline rodar
                scraper_config=SCRAPER_CONFIG,
                mindset_auditoria_md=MINDSET_AUDITORIA,
                total_atos=0,
            )
            db.add(tenant)
            print(f"Tenant '{SLUG}' criado (id={tenant.id}).")

        await db.commit()

        # ── 2. Knowledge Base inicial ─────────────────────────────────
        # Esqueleto enxuto — base legal do Executivo estadual.
        # As leis completas devem ser carregadas depois via scripts dedicados
        # (cada lei é um INSERT separado pra permitir re-curadoria).
        KB_INICIAL = [
            {
                "tipo": "regimento",
                "titulo": "Constituição do Estado do Paraná",
                "url": "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=iniciarProcesso&tipoAto=23",
                "conteudo": (
                    "Constituição Estadual do Paraná de 1989 — base regulatória do Estado.\n\n"
                    "PLACEHOLDER: conteúdo curado a inserir via script dedicado.\n"
                    "Áreas-chave para auditoria do Executivo: Art. 87 (atribuições do Governador), "
                    "Art. 27 (provimento de cargos), Capítulo VII (Administração Pública)."
                ),
            },
            {
                "tipo": "lei",
                "titulo": "Lei Estadual 15.608/2007 — Lei de Licitações do PR",
                "url": "https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=8030&codItemAto=72017",
                "conteudo": (
                    "Lei Estadual 15.608, de 16 de agosto de 2007 — disciplina licitações no PR. "
                    "Aplicável a contratações no âmbito da Administração Pública estadual.\n\n"
                    "PLACEHOLDER: artigos relevantes a curar (limites, modalidades, dispensa)."
                ),
            },
            {
                "tipo": "lei_federal",
                "titulo": "Lei 14.133/2021 — Nova Lei de Licitações (federal, aplicação subsidiária)",
                "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
                "conteudo": "PLACEHOLDER: excerpts do Art. 75 (dispensa), Art. 74 (inexigibilidade), Art. 79 (convênios).",
            },
            {
                "tipo": "lei_federal",
                "titulo": "Lei 8.429/1992 — Lei de Improbidade Administrativa",
                "url": "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm",
                "conteudo": "PLACEHOLDER: excerpts dos Arts. 9, 10, 11.",
            },
            {
                "tipo": "lei_complementar",
                "titulo": "LRF — Lei Complementar 101/2000 (Lei de Responsabilidade Fiscal)",
                "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm",
                "conteudo": "PLACEHOLDER: limites de despesa com pessoal (Art. 19, 20), restos a pagar, transparência.",
            },
            {
                "tipo": "lei",
                "titulo": "Lei Estadual 18.465/2015 — Processo Administrativo PR",
                "url": "https://www.legislacao.pr.gov.br/",
                "conteudo": "PLACEHOLDER: motivação obrigatória dos atos, prazos, recursos administrativos.",
            },
        ]

        for doc in KB_INICIAL:
            r = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == tenant.id,
                    KnowledgeBase.titulo == doc["titulo"],
                )
            )
            existing = r.scalar_one_or_none()
            if existing:
                print(f"  KB já existe: {doc['titulo']}")
                continue
            kb = KnowledgeBase(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                tipo=doc["tipo"],
                titulo=doc["titulo"],
                conteudo=doc["conteudo"],
                versao=None,
                vigente_desde=None,
                url_original=doc.get("url"),
            )
            db.add(kb)
            print(f"  KB inserido: {doc['titulo']}")

        await db.commit()

        # ── 3. Resumo ────────────────────────────────────────────────
        kb_count = (await db.execute(
            select(KnowledgeBase).where(KnowledgeBase.tenant_id == tenant.id)
        )).scalars().all()
        print(f"\n✓ Tenant gov-pr: id={tenant.id}, status={tenant.status}")
        print(f"✓ KB documentos: {len(kb_count)}")
        print(f"✓ scraper_config fontes: {len(tenant.scraper_config.get('fontes', []))}")
        print(f"✓ mindset_md: {len(tenant.mindset_auditoria_md or '')} chars")


if __name__ == "__main__":
    asyncio.run(main())
