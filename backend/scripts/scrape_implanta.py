#!/usr/bin/env python3
"""
Scraper da API Implanta — Portal da Transparência CAU

Coleta dados financeiros estruturados via API REST pública do sistema Implanta,
usado pelo CAU/PR (cau-pr.implanta.net.br) e CAU-BR (cau-br.implanta.net.br).

Uso:
    python scripts/scrape_implanta.py --tenant cau-pr --categoria diarias
    python scripts/scrape_implanta.py --tenant cau-br --categoria todas
    python scripts/scrape_implanta.py --tenant cau-pr --categoria contratos --ano-inicio 2020

Categorias disponíveis:
    diarias       — DiariasDeslocamentos (viagens, eventos, beneficiários)
    passagens     — PassagensAereas + PassagensTerrestres
    contratos     — Contratos
    convenios     — Convenios (salvo em contratos_pub com tipo='convenio')
    licitacoes    — Licitacoes
    empenhos      — Empenhos (salvo em despesas_pub com tipo='empenho')
    pagamentos    — Pagamentos (salvo em despesas_pub com tipo='pagamento')
    conselheiros  — Conselheiros (salvo em pessoas_pub com tipo='conselheiro')
    todas         — Todas as categorias acima
"""

import asyncio
import asyncpg
import httpx
import os
import sys
import argparse
import uuid
import json
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

# ── Config ────────────────────────────────────────────────────────────────────

HOSTS = {
    "cau-pr": "https://cau-pr.implanta.net.br/portaltransparencia/api",
    "cau-br": "https://cau-br.implanta.net.br/portaltransparencia/api",
}

SLUGS_TENANT = {
    "cau-pr": "cau-pr",
    "cau-br": "cau-br",
}

ANO_INICIO_PADRAO = 2018

ASYNCPG_URL = (os.environ.get("ASYNCPG_URL") or os.environ.get("DATABASE_URL") or "").replace("postgresql+asyncpg://", "postgresql://")
if not ASYNCPG_URL:
    print("ERRO: ASYNCPG_URL não definida")
    sys.exit(1)


# ── Helpers ───────────────────────────────────────────────────────────────────

def meses_ate_hoje(ano_inicio: int):
    """Gera tuplas (mes, ano) de ano_inicio/01 até o mês atual."""
    atual = date(ano_inicio, 1, 1)
    hoje = date.today().replace(day=1)
    while atual <= hoje:
        yield atual.month, atual.year
        atual += relativedelta(months=1)


def fmt_periodo(mes: int, ano: int) -> str:
    return f"{mes:02d}/{ano}"


def trunc(val, n: int) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s[:n] if len(s) > n else s


def parse_date(val: str | None) -> date | None:
    if not val:
        return None
    v = str(val).strip()
    for fmt, length in (("%Y-%m-%dT%H:%M:%S", 19), ("%Y-%m-%d", 10), ("%d/%m/%Y", 10)):
        try:
            return datetime.strptime(v[:length], fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def parse_decimal(val) -> float | None:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "."))
    except (ValueError, TypeError):
        return None


async def get_tenant_id(conn, slug: str) -> uuid.UUID:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug = $1", slug)
    if not row:
        raise RuntimeError(f"Tenant '{slug}' não encontrado no banco. Rode seed_cau_br.py primeiro.")
    return row["id"]


async def fetch_endpoint(client: httpx.AsyncClient, base_url: str, endpoint: str, periodo: str) -> list[dict]:
    """Busca um endpoint da API Implanta para um período MM/AAAA."""
    url = f"{base_url}/v1.0/{endpoint}"
    params = {"referenciaInicio": periodo, "referenciaTermino": periodo}
    try:
        r = await client.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            # Alguns endpoints retornam {"items": [...]} ou {"data": [...]}
            for key in ("items", "data", "resultado", "registros"):
                if key in data and isinstance(data[key], list):
                    return data[key]
        return []
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return []
        print(f"  ⚠ HTTP {e.response.status_code} em {endpoint} ({periodo})")
        return []
    except Exception as e:
        print(f"  ⚠ Erro em {endpoint} ({periodo}): {e}")
        return []


# ── Inserções ─────────────────────────────────────────────────────────────────

async def inserir_diarias(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict]) -> tuple[int, int]:
    inseridos = 0
    existentes = 0
    for r in rows:
        codigo = str(r.get("codigoProcesso") or "")
        try:
            await conn.execute("""
                INSERT INTO diarias (
                    id, tenant_id, fonte_sistema, periodo_ref,
                    codigo_processo, nome_despesa_padrao, nome_passageiro, cpf_mascarado,
                    origem_passageiro, valor_unitario, quantidade, valor_total,
                    data_pagamento, periodo_deslocamento, nome_evento, cidade, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3,
                    $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14, $15, $16
                )
                ON CONFLICT ON CONSTRAINT uq_diaria_processo_periodo DO NOTHING
            """,
                tenant_id, fonte, periodo,
                trunc(codigo, 100) or None,
                trunc(r.get("nomeDespesaPadrao"), 300),
                trunc(r.get("nomePassageiro"), 300),
                trunc(r.get("cpfPassageiro") or r.get("cpf"), 20),
                trunc(r.get("origemPassageiro"), 100),
                parse_decimal(r.get("valorUnitario")),
                parse_decimal(r.get("quantidade")),
                parse_decimal(r.get("valorTotal")),
                parse_date(r.get("dataPagamento")),
                trunc(r.get("periodoDeslocamentoFormatado") or r.get("periodoDeslocamento"), 200),
                trunc(r.get("nomeEvento"), 500),
                trunc(r.get("cidade"), 200),
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_contratos(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict], tipo: str = "contrato") -> tuple[int, int]:
    inseridos = 0
    existentes = 0
    for r in rows:
        numero = str(r.get("numeroContrato") or r.get("numero") or "")
        try:
            await conn.execute("""
                INSERT INTO contratos_pub (
                    id, tenant_id, fonte_sistema, periodo_ref, tipo,
                    numero_contrato, objeto, contratado_nome, contratado_cnpj,
                    valor_total, data_inicio, data_fim, situacao, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12, $13
                )
                ON CONFLICT ON CONSTRAINT uq_contrato_numero_fonte DO NOTHING
            """,
                tenant_id, fonte, periodo, tipo,
                numero or None,
                r.get("objeto") or r.get("descricao"),
                r.get("nomeContratado") or r.get("nomeEmpresa") or r.get("nome"),
                r.get("cnpjContratado") or r.get("cnpj"),
                parse_decimal(r.get("valorTotal") or r.get("valor")),
                parse_date(r.get("dataInicio") or r.get("dataAssinatura")),
                parse_date(r.get("dataFim") or r.get("dataVencimento")),
                r.get("situacao") or r.get("status"),
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_licitacoes(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict]) -> tuple[int, int]:
    inseridos = 0
    existentes = 0
    for r in rows:
        numero = str(r.get("numeroLicitacao") or r.get("numero") or "")
        try:
            await conn.execute("""
                INSERT INTO licitacoes_pub (
                    id, tenant_id, fonte_sistema, periodo_ref,
                    numero_licitacao, modalidade, objeto,
                    valor_estimado, valor_homologado, data_abertura,
                    situacao, vencedor_nome, vencedor_cnpj, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3,
                    $4, $5, $6,
                    $7, $8, $9,
                    $10, $11, $12, $13
                )
                ON CONFLICT ON CONSTRAINT uq_licitacao_numero_fonte DO NOTHING
            """,
                tenant_id, fonte, periodo,
                numero or None,
                r.get("modalidade"),
                r.get("objeto") or r.get("descricao"),
                parse_decimal(r.get("valorEstimado")),
                parse_decimal(r.get("valorHomologado")),
                parse_date(r.get("dataAbertura")),
                r.get("situacao"),
                r.get("nomeVencedor") or r.get("vencedor"),
                r.get("cnpjVencedor"),
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_despesas(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict], tipo: str) -> tuple[int, int]:
    inseridos = 0
    existentes = 0
    for r in rows:
        numero = str(r.get("numero") or r.get("numeroEmpenho") or r.get("codigoEmpenho") or "")
        try:
            await conn.execute("""
                INSERT INTO despesas_pub (
                    id, tenant_id, fonte_sistema, periodo_ref, tipo,
                    numero, descricao, credor_nome, credor_cnpj,
                    valor, data_lancamento, centro_custo, categoria, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12, $13
                )
                ON CONFLICT ON CONSTRAINT uq_despesa_tipo_numero_periodo DO NOTHING
            """,
                tenant_id, fonte, periodo, tipo,
                numero or None,
                r.get("descricao") or r.get("historico"),
                r.get("nomeCredor") or r.get("credor") or r.get("fornecedor"),
                r.get("cnpjCredor") or r.get("cnpj"),
                parse_decimal(r.get("valor") or r.get("valorTotal")),
                parse_date(r.get("dataLancamento") or r.get("data")),
                r.get("centroCusto") or r.get("unidadeOrcamentaria"),
                r.get("categoria") or r.get("naturezaDespesa"),
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_conselheiros(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict]) -> tuple[int, int]:
    inseridos = 0
    existentes = 0
    for r in rows:
        nome = r.get("nome") or r.get("nomeConselheiro") or ""
        cargo = r.get("cargo") or r.get("funcao") or "Conselheiro"
        try:
            await conn.execute("""
                INSERT INTO pessoas_pub (
                    id, tenant_id, fonte_sistema, periodo_ref, tipo,
                    nome, cpf_mascarado, cargo, categoria,
                    remuneracao, data_inicio, data_fim, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, 'conselheiro',
                    $4, $5, $6, $7,
                    $8, $9, $10, $11
                )
                ON CONFLICT ON CONSTRAINT uq_pessoa_nome_cargo_periodo DO NOTHING
            """,
                tenant_id, fonte, periodo,
                nome or None,
                r.get("cpf"),
                cargo,
                r.get("categoria") or r.get("tipoConselheiro"),
                parse_decimal(r.get("remuneracao") or r.get("subsidio")),
                parse_date(r.get("dataInicio") or r.get("dataPosse")),
                parse_date(r.get("dataFim") or r.get("dataFimMandato")),
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_despesas_viagens(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict]) -> tuple[int, int]:
    """DespesasViagens: estrutura simples, salva em diarias com codigo=numeroProcesso."""
    inseridos = 0
    existentes = 0
    for r in rows:
        codigo = trunc(r.get("numeroProcesso") or r.get("codigoProcesso"), 100)
        try:
            await conn.execute("""
                INSERT INTO diarias (
                    id, tenant_id, fonte_sistema, periodo_ref,
                    codigo_processo, nome_despesa_padrao, nome_passageiro, cpf_mascarado,
                    origem_passageiro, valor_unitario, quantidade, valor_total,
                    data_pagamento, periodo_deslocamento, nome_evento, cidade, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3,
                    $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14, $15, $16
                )
                ON CONFLICT ON CONSTRAINT uq_diaria_processo_periodo DO NOTHING
            """,
                tenant_id, fonte, periodo,
                codigo or None,
                trunc(r.get("nomeDespesaPadrao") or r.get("nomeDespesa"), 300),
                trunc(r.get("nomeFavorecido") or r.get("nomePassageiro"), 300),
                trunc(r.get("cpf"), 20),
                trunc(r.get("tipoPessoa"), 100),
                parse_decimal(r.get("valor")),
                parse_decimal(r.get("quantidade")),
                parse_decimal(r.get("valorTotal")),
                parse_date(r.get("dataPagamento")),
                None,
                trunc(r.get("nomeEvento"), 500),
                None,
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


async def inserir_passagens_aereas(conn, tenant_id: uuid.UUID, fonte: str, periodo: str, rows: list[dict]) -> tuple[int, int]:
    """PassagensAereas: estrutura aninhada com passagens[] e despesas[]."""
    inseridos = 0
    existentes = 0
    for r in rows:
        codigo = trunc(r.get("codigoProcesso") or r.get("numeroProcesso"), 100)
        passagens = r.get("passagensAereas") or []
        cia = "; ".join(p.get("ciaAerea", "") for p in passagens if p.get("ciaAerea"))
        trecho = "; ".join(p.get("origemDestinoFormatado", "") for p in passagens if p.get("origemDestinoFormatado"))
        valor_total = sum(p.get("totalTarifas", 0) or 0 for p in passagens) or None
        eventos = r.get("eventos") or []
        nome_evento = "; ".join(e.get("nomeEventoFormatado", "") for e in eventos if e.get("nomeEventoFormatado"))
        try:
            await conn.execute("""
                INSERT INTO diarias (
                    id, tenant_id, fonte_sistema, periodo_ref,
                    codigo_processo, nome_despesa_padrao, nome_passageiro, cpf_mascarado,
                    origem_passageiro, valor_unitario, quantidade, valor_total,
                    data_pagamento, periodo_deslocamento, nome_evento, cidade, payload_raw
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3,
                    $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14, $15, $16
                )
                ON CONFLICT ON CONSTRAINT uq_diaria_processo_periodo DO NOTHING
            """,
                tenant_id, fonte, periodo,
                codigo or None,
                trunc(cia or "Passagem Aérea", 300),
                trunc(r.get("nomePassageiro"), 300),
                None,
                trunc(r.get("tipoPassageiro"), 100),
                None,
                None,
                parse_decimal(valor_total),
                parse_date(r.get("dataPagamento")),
                trunc(trecho, 200),
                trunc(nome_evento, 500),
                None,
                json.dumps(r),
            )
            inseridos += 1
        except asyncpg.UniqueViolationError:
            existentes += 1
    return inseridos, existentes


# ── Runner principal ──────────────────────────────────────────────────────────

CATEGORIAS_ENDPOINTS = {
    "diarias":      [("DiariasDeslocamentos", "diarias", inserir_diarias),
                     ("DespesasViagens", "diarias", inserir_despesas_viagens)],
    "passagens":    [("PassagensAereas", "diarias", inserir_passagens_aereas)],
    "contratos":    [("Contratos", "contratos", inserir_contratos)],
    "convenios":    [("Convenios", "convenios", lambda c, t, f, p, r: inserir_contratos(c, t, f, p, r, tipo="convenio"))],
    "licitacoes":   [("Licitacoes", "licitacoes", inserir_licitacoes)],
    "empenhos":     [("Empenhos", "empenhos", lambda c, t, f, p, r: inserir_despesas(c, t, f, p, r, tipo="empenho"))],
    "pagamentos":   [("Pagamentos", "pagamentos", lambda c, t, f, p, r: inserir_despesas(c, t, f, p, r, tipo="pagamento"))],
    "conselheiros": [("Conselheiros", "conselheiros", inserir_conselheiros)],
}

TODAS = list(CATEGORIAS_ENDPOINTS.keys())


async def main():
    parser = argparse.ArgumentParser(description="Scraper API Implanta — CAU")
    parser.add_argument("--tenant", required=True, choices=list(HOSTS.keys()), help="cau-pr ou cau-br")
    parser.add_argument("--categoria", required=True,
                        choices=TODAS + ["todas"],
                        help="Categoria de dados para importar")
    parser.add_argument("--ano-inicio", type=int, default=ANO_INICIO_PADRAO, help="Ano de início (padrão: 2018)")
    args = parser.parse_args()

    base_url = HOSTS[args.tenant]
    slug = SLUGS_TENANT[args.tenant]
    fonte = args.tenant  # 'cau-pr' ou 'cau-br'

    categorias = TODAS if args.categoria == "todas" else [args.categoria]

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    tenant_id = await get_tenant_id(conn, slug)

    print(f"\n{'='*60}")
    print(f"  Tenant : {args.tenant} ({tenant_id})")
    print(f"  Base   : {base_url}")
    print(f"  Cats   : {', '.join(categorias)}")
    print(f"  Período: {args.ano_inicio}/01 → hoje")
    print(f"{'='*60}\n")

    total_inseridos = 0
    total_existentes = 0

    async with httpx.AsyncClient(timeout=30) as client:
        for categoria in categorias:
            endpoints = CATEGORIAS_ENDPOINTS[categoria]
            print(f"\n── {categoria.upper()} ──")

            for mes, ano in meses_ate_hoje(args.ano_inicio):
                periodo = fmt_periodo(mes, ano)

                for endpoint_name, _, inserir_fn in endpoints:
                    rows = await fetch_endpoint(client, base_url, endpoint_name, periodo)
                    if not rows:
                        continue

                    ins, ex = await inserir_fn(conn, tenant_id, fonte, periodo, rows)
                    total_inseridos += ins
                    total_existentes += ex

                    if ins > 0:
                        print(f"  ✓ {periodo} {endpoint_name}: {ins} inseridos ({ex} já existiam)")

    await conn.close()

    print(f"\n{'='*60}")
    print(f"CONCLUÍDO")
    print(f"  ✓ Inseridos : {total_inseridos}")
    print(f"  ─ Existentes: {total_existentes}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
