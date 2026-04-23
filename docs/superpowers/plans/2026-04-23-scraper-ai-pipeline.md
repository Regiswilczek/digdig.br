# Scraper + AI Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full data pipeline that imports CAU/PR acts, downloads PDFs, extracts text, and runs Haiku (triage) + Sonnet (deep analysis) to populate the database with audit results.

**Architecture:** Celery tasks handle each phase asynchronously — import from local JSONs → PDF download + pdfplumber extraction → Haiku classifies all acts → Sonnet deep-dives laranja/vermelho → admin endpoint triggers a full round. Person graph built during Haiku phase. Prompt caching slashes cost by ~30%.

**Tech Stack:** FastAPI, Celery+Redis, SQLAlchemy async, Anthropic SDK (claude-haiku-4-5-20251001 + claude-sonnet-4-6), pdfplumber, httpx, ftfy

---

## File Map

| File | Responsibility |
|------|---------------|
| `backend/app/services/pdf_service.py` | Download PDF via httpx + extract text with pdfplumber |
| `backend/app/services/importador.py` | Read local JSONs, upsert Ato rows for CAU/PR |
| `backend/app/services/pessoas_service.py` | Normalize names, upsert Pessoa + AparicaoPessoa |
| `backend/app/services/haiku_service.py` | Build system prompt, call Haiku, save Analise + Irregularidades |
| `backend/app/services/sonnet_service.py` | Build enriched context, call Sonnet, update Analise |
| `backend/app/workers/scraper_tasks.py` | Celery tasks: scrape one act, scrape a batch |
| `backend/app/workers/analise_tasks.py` | Celery tasks: Haiku batch, Sonnet batch, cost tracking |
| `backend/app/workers/orquestrador.py` | Celery task that chains: import → scrape → haiku → sonnet |
| `backend/app/routers/admin.py` | POST /admin/orgaos/{slug}/rodadas, GET status |
| `backend/tests/test_pdf_service.py` | Unit tests for PDF extraction |
| `backend/tests/test_importador.py` | Unit tests for JSON import |
| `backend/tests/test_haiku_service.py` | Unit tests for Haiku parsing + saving |
| `backend/tests/test_pessoas_service.py` | Unit tests for person normalization |

**Modify:**
- `backend/app/main.py` — add admin router
- `backend/scripts/seed_knowledge_base.sql` — seed regimento placeholder for CAU/PR

---

## Task 1: PDF Service (download + extraction)

**Files:**
- Create: `backend/app/services/pdf_service.py`
- Test: `backend/tests/test_pdf_service.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_pdf_service.py
import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.pdf_service import extract_text_pdfplumber, normalize_text


def test_extract_text_returns_text_and_page_count():
    # Create minimal PDF bytes using pdfplumber test fixture
    # We test the function by mocking pdfplumber
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Texto da página um"
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("app.services.pdf_service.pdfplumber.open", return_value=mock_pdf):
        text, pages = extract_text_pdfplumber(b"fake-pdf-bytes")

    assert "Texto da página um" in text
    assert pages == 1


def test_extract_text_handles_none_page():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = None
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("app.services.pdf_service.pdfplumber.open", return_value=mock_pdf):
        text, pages = extract_text_pdfplumber(b"fake-pdf-bytes")

    assert text == ""
    assert pages == 1


def test_normalize_text_fixes_whitespace():
    dirty = "texto   com\t\tespaços\n\n\nexcessivos"
    result = normalize_text(dirty)
    assert "   " not in result
    assert "\t" not in result


def test_normalize_text_handles_empty():
    assert normalize_text("") == ""
    assert normalize_text("   ") == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
python -m pytest tests/test_pdf_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.pdf_service'`

- [ ] **Step 3: Implement pdf_service.py**

```python
# backend/app/services/pdf_service.py
import io
import re
import pdfplumber
import httpx
import ftfy


async def download_pdf(url: str, timeout: float = 30.0) -> bytes:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def extract_text_pdfplumber(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
        full_text = "\n\n".join(pages)
        return normalize_text(full_text), len(pdf.pages)


def normalize_text(text: str) -> str:
    if not text or not text.strip():
        return ""
    text = ftfy.fix_text(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def estimate_tokens(text: str) -> int:
    return len(text) // 4
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_pdf_service.py -v
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/pdf_service.py backend/tests/test_pdf_service.py
git commit -m "feat: add PDF download and text extraction service"
```

---

## Task 2: Importador de atos dos JSONs

**Files:**
- Create: `backend/app/services/importador.py`
- Test: `backend/tests/test_importador.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_importador.py
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.importador import parse_data_publicacao, normalizar_tipo


def test_parse_data_publicacao_formato_brasileiro():
    from datetime import date
    result = parse_data_publicacao("02/04/2026")
    assert result == date(2026, 4, 2)


def test_parse_data_publicacao_invalida():
    assert parse_data_publicacao("invalid") is None
    assert parse_data_publicacao("") is None
    assert parse_data_publicacao(None) is None


def test_normalizar_tipo_portaria():
    assert normalizar_tipo("portaria", "administrativa") == "portaria"


def test_normalizar_tipo_deliberacao():
    assert normalizar_tipo("deliberacao", None) == "deliberacao"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_importador.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.importador'`

- [ ] **Step 3: Implement importador.py**

```python
# backend/app/services/importador.py
import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.ato import Ato
from app.models.tenant import Tenant

# Paths relative to project root (where alembic runs from)
PORTARIAS_JSON = Path("extracted/agente_auditoria_caupr/portarias_completo.json")
DELIBERACOES_JSON = Path("extracted/agente_auditoria_caupr/deliberacoes_completo.json")


def parse_data_publicacao(data_str: Optional[str]) -> Optional[date]:
    if not data_str:
        return None
    try:
        return datetime.strptime(data_str.strip(), "%d/%m/%Y").date()
    except (ValueError, AttributeError):
        return None


def normalizar_tipo(fonte_tipo: str, subtipo: Optional[str]) -> str:
    return fonte_tipo.lower().strip()


async def importar_atos_cau_pr(db: AsyncSession) -> dict:
    result = await db.execute(select(Tenant).where(Tenant.slug == "cau-pr"))
    tenant = result.scalar_one()

    fontes = [
        (PORTARIAS_JSON, "portaria"),
        (DELIBERACOES_JSON, "deliberacao"),
    ]

    total_importados = 0
    total_existentes = 0
    total_erros = 0

    for json_path, tipo in fontes:
        if not json_path.exists():
            continue

        with open(json_path, encoding="utf-8") as f:
            atos_json = json.load(f)

        for item in atos_json:
            try:
                numero = str(item.get("numero", "")).strip()
                if not numero:
                    continue

                existing = await db.execute(
                    select(Ato).where(
                        Ato.tenant_id == tenant.id,
                        Ato.numero == numero,
                        Ato.tipo == tipo,
                    )
                )
                if existing.scalar_one_or_none():
                    total_existentes += 1
                    continue

                links_pdf = item.get("links_pdf") or []
                url_pdf = links_pdf[0] if links_pdf else None

                ato = Ato(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    numero=numero,
                    tipo=tipo,
                    titulo=item.get("titulo"),
                    data_publicacao=parse_data_publicacao(item.get("data")),
                    ementa=item.get("ementa"),
                    url_pdf=url_pdf,
                )
                db.add(ato)
                total_importados += 1

            except Exception:
                total_erros += 1
                continue

    await db.commit()
    return {
        "importados": total_importados,
        "existentes": total_existentes,
        "erros": total_erros,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_importador.py -v
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/importador.py backend/tests/test_importador.py
git commit -m "feat: add JSON importer service for CAU/PR acts"
```

---

## Task 3: Serviço de pessoas (grafo)

**Files:**
- Create: `backend/app/services/pessoas_service.py`
- Test: `backend/tests/test_pessoas_service.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_pessoas_service.py
from app.services.pessoas_service import normalizar_nome


def test_normalizar_nome_uppercase():
    assert normalizar_nome("João Silva") == "JOAO SILVA"


def test_normalizar_nome_remove_punctuation():
    assert normalizar_nome("DR. José Santos,") == "DR JOSE SANTOS"


def test_normalizar_nome_multiple_spaces():
    assert normalizar_nome("  Ana   Paula  ") == "ANA PAULA"


def test_normalizar_nome_empty():
    assert normalizar_nome("") == ""
    assert normalizar_nome("   ") == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_pessoas_service.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement pessoas_service.py**

```python
# backend/app/services/pessoas_service.py
import re
import uuid
from datetime import date
from typing import Optional
import unicodedata
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.pessoa import Pessoa, AparicaoPessoa


def normalizar_nome(nome: str) -> str:
    if not nome or not nome.strip():
        return ""
    # Remove accents
    nfkd = unicodedata.normalize("NFKD", nome)
    ascii_str = nfkd.encode("ASCII", "ignore").decode("ASCII")
    # Uppercase, remove punctuation except spaces
    upper = ascii_str.upper()
    clean = re.sub(r"[^A-Z\s]", "", upper)
    return re.sub(r"\s+", " ", clean).strip()


async def salvar_pessoas(
    db: AsyncSession,
    ato_id: uuid.UUID,
    tenant_id: uuid.UUID,
    pessoas_extraidas: list[dict],
    data_ato: Optional[date] = None,
) -> None:
    for pessoa_data in pessoas_extraidas:
        nome_raw = pessoa_data.get("nome", "").strip()
        if not nome_raw:
            continue

        nome_norm = normalizar_nome(nome_raw)
        if not nome_norm:
            continue

        cargo = pessoa_data.get("cargo", "")
        tipo_aparicao = pessoa_data.get("tipo_aparicao", "mencionado")

        # Upsert Pessoa
        result = await db.execute(
            select(Pessoa).where(
                Pessoa.tenant_id == tenant_id,
                Pessoa.nome_normalizado == nome_norm,
            )
        )
        pessoa = result.scalar_one_or_none()

        if not pessoa:
            pessoa = Pessoa(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                nome_normalizado=nome_norm,
                variantes_nome=[nome_raw],
                cargo_mais_recente=cargo or None,
                total_aparicoes=0,
            )
            db.add(pessoa)
            await db.flush()
        else:
            # Add name variant if new
            variantes = pessoa.variantes_nome or []
            if nome_raw not in variantes:
                variantes.append(nome_raw)
                await db.execute(
                    update(Pessoa)
                    .where(Pessoa.id == pessoa.id)
                    .values(
                        variantes_nome=variantes,
                        cargo_mais_recente=cargo or pessoa.cargo_mais_recente,
                        total_aparicoes=Pessoa.total_aparicoes + 1,
                    )
                )

        # Check if AparicaoPessoa already exists for this ato
        ap_result = await db.execute(
            select(AparicaoPessoa).where(
                AparicaoPessoa.pessoa_id == pessoa.id,
                AparicaoPessoa.ato_id == ato_id,
            )
        )
        if ap_result.scalar_one_or_none():
            continue

        aparicao = AparicaoPessoa(
            id=uuid.uuid4(),
            pessoa_id=pessoa.id,
            ato_id=ato_id,
            tenant_id=tenant_id,
            tipo_aparicao=tipo_aparicao,
            cargo=cargo or None,
            data_ato=data_ato,
        )
        db.add(aparicao)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_pessoas_service.py -v
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/pessoas_service.py backend/tests/test_pessoas_service.py
git commit -m "feat: add person normalization and graph upsert service"
```

---

## Task 4: Serviço Haiku (triagem)

**Files:**
- Create: `backend/app/services/haiku_service.py`
- Test: `backend/tests/test_haiku_service.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_haiku_service.py
import pytest
from app.services.haiku_service import parse_haiku_response, NIVEIS_VALIDOS


def test_parse_valid_json():
    raw = '{"nivel_alerta": "vermelho", "score_risco": 85, "resumo": "Suspeito", "indicios": [], "pessoas_extraidas": [], "valores_monetarios": [], "referencias_atos": [], "requer_aprofundamento": true}'
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "vermelho"
    assert result["score_risco"] == 85
    assert result.get("parse_error") is None


def test_parse_invalid_json_extracts_nivel():
    raw = 'blabla "nivel_alerta": "laranja" blabla'
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "laranja"
    assert result["parse_error"] is True


def test_parse_invalid_json_unknown_nivel_defaults_to_amarelo():
    raw = "completely invalid json with no nivel"
    result = parse_haiku_response(raw)
    assert result["nivel_alerta"] == "amarelo"
    assert result["parse_error"] is True


def test_niveis_validos_contain_all_four():
    assert "verde" in NIVEIS_VALIDOS
    assert "amarelo" in NIVEIS_VALIDOS
    assert "laranja" in NIVEIS_VALIDOS
    assert "vermelho" in NIVEIS_VALIDOS
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_haiku_service.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement haiku_service.py**

```python
# backend/app/services/haiku_service.py
import json
import re
import uuid
from decimal import Decimal
from typing import Optional
from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.models.tenant import Tenant, KnowledgeBase
from app.services.pessoas_service import salvar_pessoas

client = AsyncAnthropic()

NIVEIS_VALIDOS = {"verde", "amarelo", "laranja", "vermelho"}

PRECOS_HAIKU = {
    "input": 0.80 / 1_000_000,
    "output": 4.00 / 1_000_000,
    "cache_read": 0.08 / 1_000_000,
}

SYSTEM_PROMPT_TEMPLATE = """Você é um auditor especializado em direito administrativo brasileiro e ética pública.

Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios de irregularidades legais, morais e éticas com base no Regimento Interno vigente.

═══════════════════════════════════════════════
REGIMENTO INTERNO — {nome_orgao}
{regimento}
═══════════════════════════════════════════════

REGRAS ESPECÍFICAS DESTE ÓRGÃO:
{regras_especificas}

NÍVEIS DE ALERTA:
- VERDE: ato conforme, sem irregularidades detectadas
- AMARELO: suspeito, requer atenção — possível irregularidade moral ou procedimental
- LARANJA: indício moderado-grave — possível irregularidade moral, ética ou legal
- VERMELHO: indício crítico — padrão altamente suspeito ou aparente violação legal direta

CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS:

1. LEGAL: Violações diretas ao Regimento Interno e à Lei 12.378/2010
   - Autoridade incompetente para o ato
   - Violação de quórum, prazos excedidos, composição irregular de comissão

2. MORAL/ÉTICO (mesmo que "legal"):
   - Nepotismo, concentração de poder (Ad Referendum excessivo)
   - Perseguição política via comissões processantes
   - Cabide de empregos, gastos questionáveis, falta de transparência

3. EXTRAÇÃO ESTRUTURADA:
   - Nomes completos, cargos, valores monetários, referências a atos anteriores

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": 0,
  "resumo": "2-3 frases",
  "indicios": [{"categoria": "legal|moral|etica|processual", "tipo": "string", "descricao": "string", "artigo_violado": "string|null", "gravidade": "baixa|media|alta|critica"}],
  "pessoas_extraidas": [{"nome": "string", "cargo": "string", "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado|mencionado"}],
  "valores_monetarios": [],
  "referencias_atos": [],
  "requer_aprofundamento": false,
  "motivo_aprofundamento": "string|null"
}"""


def parse_haiku_response(raw_text: str) -> dict:
    try:
        result = json.loads(raw_text)
        if result.get("nivel_alerta") not in NIVEIS_VALIDOS:
            result["nivel_alerta"] = "amarelo"
        return result
    except json.JSONDecodeError:
        nivel_match = re.search(r'"nivel_alerta"\s*:\s*"(\w+)"', raw_text)
        nivel = nivel_match.group(1) if nivel_match else "amarelo"
        if nivel not in NIVEIS_VALIDOS:
            nivel = "amarelo"
        return {
            "nivel_alerta": nivel,
            "score_risco": 50,
            "resumo": "Análise incompleta — resposta malformada. Reprocessar manualmente.",
            "indicios": [],
            "pessoas_extraidas": [],
            "valores_monetarios": [],
            "referencias_atos": [],
            "requer_aprofundamento": False,
            "motivo_aprofundamento": None,
            "parse_error": True,
        }


async def montar_system_prompt(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one()

    kb_result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.tenant_id == tenant_id, KnowledgeBase.ativo == True)
        .order_by(KnowledgeBase.criado_em.desc())
        .limit(1)
    )
    kb = kb_result.scalar_one_or_none()
    regimento = kb.conteudo if kb else "Regimento não cadastrado — analise com base na Lei 12.378/2010."

    return SYSTEM_PROMPT_TEMPLATE.format(
        nome_orgao=tenant.nome_completo,
        regimento=regimento,
        regras_especificas="Sem regras específicas cadastradas.",
    )


async def analisar_ato_haiku(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt: str,
) -> Analise:
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:8000] if conteudo else "(texto não disponível)"

    user_prompt = f"""Analise o seguinte ato administrativo:

TIPO: {ato.tipo}
NÚMERO: {ato.numero}
DATA: {ato.data_publicacao or 'não informada'}
EMENTA: {ato.ementa or 'não informada'}

TEXTO COMPLETO:
{texto}"""

    response = await client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=1500,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )

    resultado = parse_haiku_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_HAIKU["input"]
        + response.usage.output_tokens * PRECOS_HAIKU["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_HAIKU["cache_read"]
    )

    # Upsert Analise
    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()

    if not analise:
        analise = Analise(
            id=uuid.uuid4(),
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            rodada_id=rodada_id,
        )
        db.add(analise)
        await db.flush()

    analise.status = "haiku_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_haiku = True
    analise.resultado_haiku = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_haiku = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = Decimal(str(custo))

    # Save Irregularidades
    for indicio in resultado.get("indicios", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"),
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        )
        db.add(irr)

    ato.processado = True
    await db.flush()

    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_haiku_service.py -v
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/haiku_service.py backend/tests/test_haiku_service.py
git commit -m "feat: add Haiku analysis service with JSON fallback parsing"
```

---

## Task 5: Serviço Sonnet (análise profunda)

**Files:**
- Create: `backend/app/services/sonnet_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_sonnet_service.py
import pytest
from app.services.sonnet_service import parse_sonnet_response


def test_parse_valid_sonnet_json():
    raw = '{"nivel_alerta_confirmado": "vermelho", "score_risco_final": 90, "confirmacao_suspeita": true, "analise_aprofundada": {"indicios_legais": [], "indicios_morais": [], "narrativa_completa": "texto"}, "ficha_denuncia": {"titulo": "titulo", "fato": "fato", "indicio_legal": "x", "indicio_moral": "y", "evidencias": [], "impacto": "imp", "recomendacao_campanha": "rec"}}'
    result = parse_sonnet_response(raw)
    assert result["nivel_alerta_confirmado"] == "vermelho"
    assert result.get("parse_error") is None


def test_parse_invalid_sonnet_json_returns_fallback():
    result = parse_sonnet_response("invalid json")
    assert "nivel_alerta_confirmado" in result
    assert result["parse_error"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_sonnet_service.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement sonnet_service.py**

```python
# backend/app/services/sonnet_service.py
import json
import re
import uuid
from decimal import Decimal
from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.models.pessoa import AparicaoPessoa, Pessoa
from app.services.haiku_service import montar_system_prompt, NIVEIS_VALIDOS

client = AsyncAnthropic()

PRECOS_SONNET = {
    "input": 3.00 / 1_000_000,
    "output": 15.00 / 1_000_000,
    "cache_read": 0.30 / 1_000_000,
}

SONNET_EXTRA = """

MODO: ANÁLISE PROFUNDA

Você está recebendo um ato que foi PRÉ-CLASSIFICADO como suspeito.
Use o histórico das pessoas envolvidas e os atos relacionados para:
1. Confirmar ou refutar a suspeita inicial do Haiku
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa política coerente
4. Gerar uma ficha de denúncia pronta para uso

Responda em JSON com esta estrutura:
{
  "nivel_alerta_confirmado": "verde|amarelo|laranja|vermelho",
  "score_risco_final": 0,
  "confirmacao_suspeita": true,
  "analise_aprofundada": {
    "indicios_legais": [{"tipo": "string", "descricao": "string", "artigo_violado": "string", "gravidade": "string"}],
    "indicios_morais": [{"tipo": "string", "descricao": "string", "impacto_politico": "string", "gravidade": "string"}],
    "padrao_identificado": "string|null",
    "narrativa_completa": "string"
  },
  "ficha_denuncia": {
    "titulo": "string",
    "fato": "string",
    "indicio_legal": "string",
    "indicio_moral": "string",
    "evidencias": ["string"],
    "impacto": "string",
    "recomendacao_campanha": "string"
  }
}"""


def parse_sonnet_response(raw_text: str) -> dict:
    try:
        result = json.loads(raw_text)
        if result.get("nivel_alerta_confirmado") not in NIVEIS_VALIDOS:
            result["nivel_alerta_confirmado"] = "laranja"
        return result
    except json.JSONDecodeError:
        nivel_match = re.search(r'"nivel_alerta_confirmado"\s*:\s*"(\w+)"', raw_text)
        nivel = nivel_match.group(1) if nivel_match else "laranja"
        return {
            "nivel_alerta_confirmado": nivel if nivel in NIVEIS_VALIDOS else "laranja",
            "score_risco_final": 60,
            "confirmacao_suspeita": True,
            "analise_aprofundada": {
                "indicios_legais": [],
                "indicios_morais": [],
                "narrativa_completa": "Análise incompleta — resposta malformada.",
            },
            "ficha_denuncia": {
                "titulo": "Análise indisponível",
                "fato": "",
                "indicio_legal": "",
                "indicio_moral": "",
                "evidencias": [],
                "impacto": "",
                "recomendacao_campanha": "",
            },
            "parse_error": True,
        }


async def _montar_contexto_enriquecido(
    db: AsyncSession, ato_id: uuid.UUID, analise_haiku: Analise
) -> str:
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:6000] if conteudo else ""

    # Get involved persons with history
    aparicoes_result = await db.execute(
        select(AparicaoPessoa).where(AparicaoPessoa.ato_id == ato_id).limit(10)
    )
    aparicoes = aparicoes_result.scalars().all()

    historico_pessoas = []
    for ap in aparicoes:
        pessoa_result = await db.execute(select(Pessoa).where(Pessoa.id == ap.pessoa_id))
        pessoa = pessoa_result.scalar_one_or_none()
        if pessoa:
            historico_pessoas.append({
                "nome": pessoa.nome_normalizado,
                "cargo": ap.cargo,
                "total_aparicoes": pessoa.total_aparicoes,
            })

    return f"""TEXTO DO ATO:
{texto}

ANÁLISE PRÉVIA DO HAIKU:
{json.dumps(analise_haiku.resultado_haiku, ensure_ascii=False, indent=2)}

HISTÓRICO DAS PESSOAS ENVOLVIDAS:
{json.dumps(historico_pessoas, ensure_ascii=False, indent=2)}"""


async def analisar_ato_sonnet(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt_base: str,
) -> Analise:
    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one()

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    contexto = await _montar_contexto_enriquecido(db, ato_id, analise)
    system_prompt = system_prompt_base + SONNET_EXTRA

    response = await client.messages.create(
        model=settings.claude_sonnet_model,
        max_tokens=3000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": contexto}],
    )

    resultado = parse_sonnet_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_SONNET["input"]
        + response.usage.output_tokens * PRECOS_SONNET["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_SONNET["cache_read"]
    )

    analise.status = "sonnet_completo"
    analise.nivel_alerta = resultado["nivel_alerta_confirmado"]
    analise.score_risco = resultado.get("score_risco_final", analise.score_risco)
    analise.analisado_por_sonnet = True
    analise.resultado_sonnet = resultado
    analise.recomendacao_campanha = (
        resultado.get("ficha_denuncia", {}).get("recomendacao_campanha")
    )
    analise.tokens_sonnet = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = analise.custo_usd + Decimal(str(custo))

    # Save Sonnet irregularidades
    for indicio in resultado.get("analise_aprofundada", {}).get("indicios_legais", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria="legal",
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "alta"),
        )
        db.add(irr)

    for indicio in resultado.get("analise_aprofundada", {}).get("indicios_morais", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria="moral",
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=None,
            gravidade=indicio.get("gravidade", "alta"),
            impacto_politico=indicio.get("impacto_politico"),
        )
        db.add(irr)

    await db.commit()
    return analise
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_sonnet_service.py -v
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sonnet_service.py backend/tests/test_sonnet_service.py
git commit -m "feat: add Sonnet deep analysis service with enriched context"
```

---

## Task 6: Celery tasks de scraping

**Files:**
- Create: `backend/app/workers/scraper_tasks.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_scraper_tasks.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import uuid


def test_scraper_tasks_module_imports():
    from app.workers.scraper_tasks import scrape_ato_task, scrape_lote_task
    assert callable(scrape_ato_task)
    assert callable(scrape_lote_task)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_scraper_tasks.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement scraper_tasks.py**

```python
# backend/app/workers/scraper_tasks.py
import uuid
import asyncio
from anthropic import RateLimitError, APIError
from celery import shared_task
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto
from app.models.analise import RodadaAnalise
from app.services.pdf_service import download_pdf, extract_text_pdfplumber, estimate_tokens


@celery_app.task(bind=True, max_retries=3, queue="scraper", name="scraper.scrape_ato")
def scrape_ato_task(self, ato_id: str, rodada_id: str) -> dict:
    return asyncio.run(_scrape_ato(ato_id, rodada_id))


async def _scrape_ato(ato_id_str: str, rodada_id_str: str) -> dict:
    ato_id = uuid.UUID(ato_id_str)
    rodada_id = uuid.UUID(rodada_id_str)

    async with async_session_factory() as db:
        result = await db.execute(select(Ato).where(Ato.id == ato_id))
        ato = result.scalar_one_or_none()
        if not ato:
            return {"status": "erro", "motivo": "ato_nao_encontrado"}

        if not ato.url_pdf:
            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(
                    erro_download="sem_url_pdf"
                )
            )
            await db.commit()
            return {"status": "erro", "motivo": "sem_url"}

        # Check if already extracted
        conteudo_result = await db.execute(
            select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
        )
        if conteudo_result.scalar_one_or_none():
            return {"status": "existente", "ato_id": ato_id_str}

        try:
            pdf_bytes = await download_pdf(ato.url_pdf)
            text, pages = extract_text_pdfplumber(pdf_bytes)

            if not text:
                await db.execute(
                    update(Ato).where(Ato.id == ato_id).values(
                        erro_download="texto_vazio"
                    )
                )
                await db.commit()
                return {"status": "erro", "motivo": "texto_vazio"}

            conteudo = ConteudoAto(
                ato_id=ato_id,
                texto_completo=text,
                metodo_extracao="pdfplumber",
                qualidade="boa",
                tokens_estimados=estimate_tokens(text),
            )
            db.add(conteudo)

            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(
                    pdf_baixado=True,
                    pdf_paginas=pages,
                    pdf_tamanho_bytes=len(pdf_bytes),
                )
            )

            await db.execute(
                update(RodadaAnalise).where(RodadaAnalise.id == rodada_id).values(
                    atos_scrapeados=RodadaAnalise.atos_scrapeados + 1
                )
            )

            await db.commit()
            return {"status": "ok", "ato_id": ato_id_str, "pages": pages}

        except Exception as exc:
            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(
                    erro_download=str(exc)[:500]
                )
            )
            await db.commit()
            raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 5)


@celery_app.task(queue="scraper", name="scraper.scrape_lote")
def scrape_lote_task(ato_ids: list[str], rodada_id: str) -> dict:
    results = {"ok": 0, "erro": 0, "existente": 0}
    for ato_id in ato_ids:
        try:
            result = scrape_ato_task.apply(args=[ato_id, rodada_id]).get(timeout=60)
            results[result.get("status", "erro")] = results.get(result.get("status", "erro"), 0) + 1
        except Exception:
            results["erro"] += 1
    return results
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_scraper_tasks.py -v
```

Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/workers/scraper_tasks.py backend/tests/test_scraper_tasks.py
git commit -m "feat: add Celery scraping tasks for PDF download and extraction"
```

---

## Task 7: Celery tasks de análise (Haiku + Sonnet)

**Files:**
- Create: `backend/app/workers/analise_tasks.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_analise_tasks.py
def test_analise_tasks_module_imports():
    from app.workers.analise_tasks import analisar_lote_haiku_task, analisar_criticos_sonnet_task
    assert callable(analisar_lote_haiku_task)
    assert callable(analisar_criticos_sonnet_task)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_analise_tasks.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement analise_tasks.py**

```python
# backend/app/workers/analise_tasks.py
import uuid
import asyncio
from decimal import Decimal
from anthropic import RateLimitError, APIError
from celery import shared_task
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato
from app.models.analise import Analise, RodadaAnalise
from app.models.tenant import Tenant
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt
from app.services.sonnet_service import analisar_ato_sonnet


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.haiku_lote")
def analisar_lote_haiku_task(self, ato_ids: list[str], rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_lote_haiku(ato_ids, rodada_id, tenant_id))
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 5)
    except APIError as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_lote_haiku(
    ato_ids: list[str], rodada_id_str: str, tenant_id_str: str
) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        system_prompt = await montar_system_prompt(db, tenant_id)

        results = {"ok": 0, "erro": 0}
        for ato_id_str in ato_ids:
            ato_id = uuid.UUID(ato_id_str)
            try:
                await analisar_ato_haiku(db, ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1)
                )
                await db.commit()
                results["ok"] += 1
            except Exception as exc:
                results["erro"] += 1
                continue

        return results


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.sonnet_criticos")
def analisar_criticos_sonnet_task(self, rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_criticos_sonnet(rodada_id, tenant_id))
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 10)
    except APIError as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_criticos_sonnet(rodada_id_str: str, tenant_id_str: str) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        # Find all laranja/vermelho acts from this round
        criticos_result = await db.execute(
            select(Analise).where(
                Analise.rodada_id == rodada_id,
                Analise.nivel_alerta.in_(["laranja", "vermelho"]),
                Analise.analisado_por_sonnet == False,
            )
        )
        criticos = criticos_result.scalars().all()

        if not criticos:
            return {"ok": 0, "motivo": "nenhum_critico"}

        system_prompt = await montar_system_prompt(db, tenant_id)
        results = {"ok": 0, "erro": 0}

        for analise in criticos:
            try:
                await analisar_ato_sonnet(db, analise.ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1)
                )
                await db.commit()
                results["ok"] += 1
            except Exception:
                results["erro"] += 1
                continue

        return results
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_analise_tasks.py -v
```

Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/workers/analise_tasks.py backend/tests/test_analise_tasks.py
git commit -m "feat: add Celery Haiku and Sonnet analysis tasks"
```

---

## Task 8: Orquestrador da rodada

**Files:**
- Create: `backend/app/workers/orquestrador.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_orquestrador.py
def test_orquestrador_imports():
    from app.workers.orquestrador import iniciar_rodada_task
    assert callable(iniciar_rodada_task)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_orquestrador.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement orquestrador.py**

```python
# backend/app/workers/orquestrador.py
import uuid
import asyncio
from datetime import datetime, timezone
from math import ceil
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato
from app.models.analise import RodadaAnalise
from app.models.tenant import Tenant
from app.services.importador import importar_atos_cau_pr
from app.workers.scraper_tasks import scrape_lote_task
from app.workers.analise_tasks import analisar_lote_haiku_task, analisar_criticos_sonnet_task

LOTE_SIZE = 50


@celery_app.task(queue="analise", name="orquestrador.iniciar_rodada")
def iniciar_rodada_task(rodada_id: str, tenant_slug: str) -> dict:
    return asyncio.run(_iniciar_rodada(rodada_id, tenant_slug))


async def _iniciar_rodada(rodada_id_str: str, tenant_slug: str) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)

    async with async_session_factory() as db:
        # Mark rodada as running
        await db.execute(
            update(RodadaAnalise)
            .where(RodadaAnalise.id == rodada_id)
            .values(status="em_progresso", iniciado_em=datetime.now(timezone.utc))
        )
        await db.commit()

        try:
            # Step 1: Import acts from JSONs (CAU/PR only for now)
            if tenant_slug == "cau-pr":
                import_result = await importar_atos_cau_pr(db)
            else:
                import_result = {"importados": 0, "existentes": 0}

            # Step 2: Get all acts without extracted text
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.slug == tenant_slug)
            )
            tenant = tenant_result.scalar_one()

            atos_result = await db.execute(
                select(Ato).where(
                    Ato.tenant_id == tenant.id,
                    Ato.pdf_baixado == False,
                    Ato.url_pdf != None,
                ).limit(500)
            )
            atos_para_scrape = atos_result.scalars().all()
            ato_ids = [str(a.id) for a in atos_para_scrape]

            # Update total count
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(total_atos=len(ato_ids))
            )
            await db.commit()

            # Step 3: Scrape PDFs in batches (synchronous for simplicity in MVP)
            for i in range(0, len(ato_ids), LOTE_SIZE):
                lote = ato_ids[i:i + LOTE_SIZE]
                scrape_lote_task.apply(args=[lote, rodada_id_str])

            # Step 4: Haiku analysis — all acts with text
            atos_com_texto_result = await db.execute(
                select(Ato).where(
                    Ato.tenant_id == tenant.id,
                    Ato.pdf_baixado == True,
                    Ato.processado == False,
                ).limit(1000)
            )
            atos_com_texto = atos_com_texto_result.scalars().all()
            ids_para_haiku = [str(a.id) for a in atos_com_texto]

            for i in range(0, len(ids_para_haiku), LOTE_SIZE):
                lote = ids_para_haiku[i:i + LOTE_SIZE]
                analisar_lote_haiku_task.apply(
                    args=[lote, rodada_id_str, str(tenant.id)]
                )

            # Step 5: Sonnet on critical acts
            analisar_criticos_sonnet_task.apply(
                args=[rodada_id_str, str(tenant.id)]
            )

            # Mark rodada as complete
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(
                    status="concluida",
                    concluido_em=datetime.now(timezone.utc),
                )
            )
            await db.commit()

            return {
                "status": "concluida",
                "importados": import_result.get("importados", 0),
                "scrapeados": len(ato_ids),
                "haiku": len(ids_para_haiku),
            }

        except Exception as exc:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(status="erro", erro_mensagem=str(exc)[:1000])
            )
            await db.commit()
            raise
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_orquestrador.py -v
```

Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/workers/orquestrador.py backend/tests/test_orquestrador.py
git commit -m "feat: add pipeline orchestrator Celery task"
```

---

## Task 9: Admin router + seed knowledge base

**Files:**
- Create: `backend/app/routers/admin.py`
- Create: `backend/scripts/seed_knowledge_base.sql`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_admin_router.py
def test_admin_router_imports():
    from app.routers.admin import router
    assert router is not None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_admin_router.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Create admin.py router**

```python
# backend/app/routers/admin.py
import uuid
import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.analise import RodadaAnalise
from app.models.tenant import Tenant

router = APIRouter(prefix="/admin", tags=["admin"])


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

    rodada = RodadaAnalise(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        status="pendente",
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
        "mensagem": "Pipeline iniciado. Acompanhe o status via GET /admin/rodadas/{rodada_id}",
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

    return {
        "rodada_id": str(rodada.id),
        "status": rodada.status,
        "total_atos": rodada.total_atos,
        "atos_scrapeados": rodada.atos_scrapeados,
        "atos_analisados_haiku": rodada.atos_analisados_haiku,
        "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
        "custo_total_usd": float(rodada.custo_total_usd),
        "iniciado_em": rodada.iniciado_em.isoformat() if rodada.iniciado_em else None,
        "concluido_em": rodada.concluido_em.isoformat() if rodada.concluido_em else None,
        "erro_mensagem": rodada.erro_mensagem,
    }
```

- [ ] **Step 4: Update main.py to include admin router**

```python
# backend/app/main.py — replace the full file
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, webhooks
from app.routers.admin import router as admin_router


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
        )

    app = FastAPI(
        title="Dig Dig API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Admin-Secret"],
    )

    app.include_router(health.router)
    app.include_router(webhooks.router, prefix="/webhooks")
    app.include_router(admin_router)

    return app


app = create_app()
```

- [ ] **Step 5: Create knowledge base seed SQL**

```sql
-- backend/scripts/seed_knowledge_base.sql
-- Run in Supabase SQL Editor after importing the actual regimento text
-- Replace 'TEXTO_DO_REGIMENTO_AQUI' with the actual content of the CAU/PR regimento

INSERT INTO knowledge_base (
    id,
    tenant_id,
    titulo,
    tipo,
    conteudo,
    versao,
    ativo,
    criado_em,
    atualizado_em
)
SELECT
    gen_random_uuid(),
    t.id,
    'Regimento Interno CAU/PR — 6ª versão (DPOPR 0191-02/2025)',
    'regimento',
    'PLACEHOLDER — substitua este texto pelo conteúdo completo do Regimento Interno do CAU/PR disponível em https://www.caupr.gov.br/regimento/',
    '6',
    true,
    NOW(),
    NOW()
FROM tenants t
WHERE t.slug = 'cau-pr'
ON CONFLICT DO NOTHING;
```

- [ ] **Step 6: Run tests**

```bash
python -m pytest tests/test_admin_router.py -v
```

Expected: 1 test PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/admin.py backend/app/main.py backend/scripts/seed_knowledge_base.sql backend/tests/test_admin_router.py
git commit -m "feat: add admin router for triggering analysis rounds"
```

---

## Task 10: Run all tests and push

- [ ] **Step 1: Run the full test suite**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: all tests PASS (29 existing + ~14 new = ~43 total)

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Verify Railway redeploys successfully**

Check Railway dashboard — new deploy should show `Uvicorn running on http://0.0.0.0:8000`

- [ ] **Step 4: Test admin endpoint**

```bash
curl -X POST https://dig-dig-production.up.railway.app/admin/orgaos/cau-pr/rodadas \
  -H "X-Admin-Secret: f9dd2e697eac56a70a32531af02c7b58089983023dde1e6eccfd2170f750fef1"
```

Expected: `{"rodada_id": "...", "status": "iniciada"}`

---

## Self-Review

**Spec coverage:**
- ✅ Import atos from local JSONs
- ✅ Download PDFs via httpx
- ✅ Extract text with pdfplumber
- ✅ Haiku triagem with prompt caching
- ✅ JSON parse fallback with regex
- ✅ Save Analise + Irregularidades
- ✅ Person graph (Pessoa + AparicaoPessoa)
- ✅ Sonnet deep analysis for laranja/vermelho
- ✅ Celery tasks with exponential backoff retry
- ✅ Cost tracking (PRECOS_HAIKU / PRECOS_SONNET)
- ✅ Orchestrator coordinates full pipeline
- ✅ Admin endpoint to trigger a round
- ✅ Status endpoint for round monitoring

**Missing from this plan (deferred to Plan 3):**
- Full regimento text (must be manually inserted via seed_knowledge_base.sql)
- Redis required for Celery (Railway must have Redis service)
- Public API endpoints for frontend to read results
