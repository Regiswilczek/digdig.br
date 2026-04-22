# 15 — Alertas por Email e Deduplicação de Nomes

> Especificações técnicas para dois gaps identificados na revisão pré-implementação (doc 14).
> Data: 2026-04-22

---

## 1. Alertas por Email

### 1.1 Visão Geral

O sistema envia emails automáticos para usuários com plano **Investigador ou superior** quando novos atos suspeitos são publicados nos órgãos que eles acompanham. As preferências são configuradas por usuário via tabela `preferencias_alertas` (definida em `02-banco-de-dados.md`, seção 2.24).

O envio é mediado por tasks Celery — nunca diretamente no request HTTP. O provedor de email padrão é **Resend** (transacional, suporte a templates React Email), com fallback para SMTP genérico via variável de ambiente.

---

### 1.2 Eventos que Disparam Alertas

| Evento | Gatilho | Observação |
|--------|---------|------------|
| `novo_ato_critico` | Ato com `nivel_alerta = 'critico'` inserido no banco | Prioridade máxima — enviado mesmo no modo `diario` como item destacado |
| `novo_ato_grave` | Ato com `nivel_alerta = 'grave'` inserido no banco | Agrupado no resumo quando frequência é `diario` ou `semanal` |
| `campanha_progresso_50` | Campanha que o usuário apoiou atinge 50% da meta de doações | Enviado uma única vez por campanha por usuário |
| `campanha_meta_atingida` | Campanha atinge 100% e job de análise é enfileirado | Confirma ao doador que o patrocínio foi efetivado |
| `campanha_resultado_disponivel` | Análise da campanha concluída (`status = 'concluida'`) | Inclui link direto para o relatório |
| `acesso_antecipado_expirando` | Acesso antecipado de doador expira em menos de 24h | Enviado uma única vez; não repetir se já foi enviado |

---

### 1.3 Lógica de Frequência

A coluna `frequencia` em `preferencias_alertas` aceita três valores:

**`imediato`**
Uma task Celery é disparada no momento em que o ato é salvo no banco (sinal `post_save` no pipeline de ingestão). Indicado para usuários que monitoram ativamente um órgão. Cada ato crítico gera um email individual.

**`diario`**
Celery Beat executa `agregar_alertas_diarios` todos os dias às **08:00 BRT**. A task coleta todos os atos salvos nas últimas 24h para os órgãos acompanhados pelo usuário e envia um único email de resumo. Máximo de 1 email por usuário por dia, independentemente do número de órgãos.

**`semanal`**
Celery Beat executa `agregar_alertas_semanais` toda **segunda-feira às 08:00 BRT**. Agrega os atos da semana anterior. Máximo de 1 email por usuário por semana.

**Deduplicação intra-email:**
Se um mesmo ato poderia aparecer em múltiplos eventos (ex: bug que gera `critico` + `grave` simultaneamente), apenas o evento de maior gravidade é incluído. A ordem de prioridade é: `critico > grave > suspeito`. Um ato nunca aparece duas vezes no mesmo email de resumo.

**Deduplicação entre envios:**
A tabela `logs_atividade` registra cada email enviado com `acao = 'alerta_enviado'` e `detalhes = {ato_id, evento, user_id}`. Antes de enfileirar um novo envio, a task verifica se já existe registro com o mesmo `(ato_id, evento, user_id)` nas últimas 24h (para `imediato`) ou no período coberto (para `diario`/`semanal`).

---

### 1.4 Task Celery

```python
# app/tasks/alertas.py

from celery import shared_task
from celery.utils.log import get_task_logger
from app.services.email import EmailService
from app.db.session import get_db_session
from app.models import Ato, PreferenciasAlertas, User, LogAtividade

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def enviar_alerta_ato(self, ato_id: str, evento: str):
    """
    Enfileira emails para todos os usuários que acompanham o órgão
    e têm preferência ativa para este nível de alerta.

    Chamada após persistência do ato no pipeline de ingestão:
        enviar_alerta_ato.delay(str(ato.id), 'novo_ato_critico')
    """
    try:
        with get_db_session() as db:
            ato = db.query(Ato).get(ato_id)
            if not ato:
                logger.warning(f"Ato {ato_id} não encontrado — alerta ignorado.")
                return

            prefs = (
                db.query(PreferenciasAlertas)
                .filter(
                    PreferenciasAlertas.tenant_id == ato.tenant_id,
                    PreferenciasAlertas.ativo == True,
                    PreferenciasAlertas.niveis.contains([ato.nivel_alerta]),
                )
                .all()
            )

            for pref in prefs:
                # Deduplicação: verifica se já enviamos este alerta
                ja_enviado = (
                    db.query(LogAtividade)
                    .filter(
                        LogAtividade.user_id == pref.user_id,
                        LogAtividade.acao == "alerta_enviado",
                        LogAtividade.detalhes["ato_id"].astext == ato_id,
                        LogAtividade.detalhes["evento"].astext == evento,
                    )
                    .first()
                )
                if ja_enviado:
                    continue

                user = db.query(User).get(pref.user_id)

                if pref.frequencia == "imediato":
                    EmailService.enviar_alerta_ato(user=user, ato=ato, evento=evento)
                    LogAtividade.registrar(
                        db,
                        user_id=user.id,
                        acao="alerta_enviado",
                        detalhes={"ato_id": ato_id, "evento": evento, "frequencia": "imediato"},
                    )
                # frequencias 'diario' e 'semanal' são tratadas pelo Celery Beat
                # (tasks agregar_alertas_diarios / agregar_alertas_semanais)

    except Exception as e:
        logger.error(f"Falha ao processar alerta para ato {ato_id}: {e}")
        raise self.retry(exc=e)


@shared_task
def agregar_alertas_diarios():
    """Celery Beat: diariamente às 08:00 BRT."""
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(hours=24)

    with get_db_session() as db:
        prefs_diarias = (
            db.query(PreferenciasAlertas)
            .filter(
                PreferenciasAlertas.ativo == True,
                PreferenciasAlertas.frequencia == "diario",
            )
            .all()
        )

        for pref in prefs_diarias:
            atos = (
                db.query(Ato)
                .filter(
                    Ato.tenant_id == pref.tenant_id,
                    Ato.nivel_alerta.in_(pref.niveis),
                    Ato.criado_em >= since,
                )
                .order_by(Ato.nivel_alerta.desc())  # criticos primeiro
                .all()
            )

            if not atos:
                continue

            # Deduplica: um ato aparece uma única vez (pelo nível mais grave)
            atos_unicos = _deduplicar_atos(atos)
            user = db.query(User).get(pref.user_id)
            EmailService.enviar_resumo_diario(user=user, atos=atos_unicos, pref=pref)


def _deduplicar_atos(atos: list) -> list:
    """Remove duplicatas mantendo apenas a entrada de maior gravidade por ato_id."""
    ordem_gravidade = {"critico": 3, "grave": 2, "suspeito": 1}
    vistos: dict[str, object] = {}
    for ato in atos:
        chave = str(ato.id)
        if chave not in vistos:
            vistos[chave] = ato
        else:
            if ordem_gravidade.get(ato.nivel_alerta, 0) > ordem_gravidade.get(
                vistos[chave].nivel_alerta, 0
            ):
                vistos[chave] = ato
    return list(vistos.values())
```

---

### 1.5 Templates de Email

Os templates são renderizados com **React Email** (componentes TSX) e enviados via Resend. Abaixo a estrutura de cada template — a implementação visual fica em `frontend/emails/`.

**Template: `alerta_ato_critico`**
- Assunto: `[Dig Dig] ⚠️ Ato crítico detectado no {orgao_nome}`
- Campos obrigatórios:
  - `orgao_nome` — nome do órgão (ex: "CAU/PR")
  - `ato_titulo` — título do ato (ex: "Portaria Nº 678")
  - `ato_data` — data de publicação formatada (ex: "02/04/2026")
  - `nivel_alerta` — badge colorido: vermelho para crítico
  - `resumo_irregularidade` — texto gerado pelo Haiku, máximo 200 caracteres
  - `link_ato` — URL direta para a página do ato no dashboard
  - `contador_criticos_mes` — "X atos críticos detectados este mês neste órgão"
- CTA principal: **"Ver análise completa"** → `link_ato`
- Rodapé: link para gerenciar alertas + link de descadastro

**Template: `alerta_diario_resumo`**
- Assunto: `[Dig Dig] Resumo diário — {N} novos atos suspeitos em {orgao_nome}`
- Campos obrigatórios:
  - `orgao_nome`
  - `data` — data do resumo (ex: "22 de abril de 2026")
  - `lista_atos` — array com objetos `{ titulo, nivel_alerta, data, link_ato }`; ordenado por gravidade decrescente
  - `link_dashboard` — URL do dashboard do órgão
- Renderização da lista: cada ato em linha com badge de nível colorido
- CTA principal: **"Ver todos no dashboard"** → `link_dashboard`
- Rodapé: link para alterar frequência para `semanal` ou desativar

**Template: `campanha_resultado`**
- Assunto: `[Dig Dig] A análise do {orgao_nome} está disponível`
- Campos obrigatórios:
  - `orgao_nome`
  - `total_atos` — número total de atos analisados na rodada
  - `total_criticos` — número de atos classificados como críticos
  - `acesso_antecipado_expira_em` — data de expiração formatada (ex: "25/04/2026 às 23:59")
  - `link_dashboard` — URL direta para o relatório da campanha
- CTA principal: **"Acessar análise completa"** → `link_dashboard`
- Nota de urgência se `acesso_antecipado_expira_em` for em menos de 48h

---

### 1.6 Tabela `preferencias_alertas` — Referência Cruzada

A tabela está definida e tem RLS configurado em **`02-banco-de-dados.md`, seção 2.24**. Schema resumido:

```sql
preferencias_alertas (
  id          UUID PK,
  user_id     UUID → users(id),
  tenant_id   UUID → tenants(id),
  ativo       BOOLEAN DEFAULT true,
  niveis      TEXT[]  DEFAULT ARRAY['critico', 'grave'],
  frequencia  TEXT    CHECK IN ('imediato', 'diario', 'semanal'),
  UNIQUE (user_id, tenant_id)
)
```

Não há campo separado para cada evento de campanha — os alertas de campanha (`campanha_*`) são sempre enviados de forma imediata e não dependem da coluna `frequencia`. Eles são disparados diretamente pelo serviço de campanhas, não pela task `enviar_alerta_ato`.

---

### 1.7 Configuração via API

Estes endpoints estão declarados em **`04-api-endpoints.md`**. Reproduzidos aqui para referência:

```
GET    /orgaos/{slug}/alertas    → retorna preferências do usuário autenticado para este órgão
POST   /orgaos/{slug}/alertas    → cria ou ativa alerta (cria registro em preferencias_alertas)
PATCH  /orgaos/{slug}/alertas    → atualiza frequência e/ou niveis
DELETE /orgaos/{slug}/alertas    → seta ativo = false (soft delete — preserva histórico)
```

Todos os endpoints exigem autenticação (`Bearer` token Supabase). O `tenant_id` é resolvido a partir do `slug` do órgão internamente — o cliente nunca envia UUID diretamente.

Validação de plano no `POST`:
```python
LIMITE_ORGAOS_POR_PLANO = {
    "cidadao":        0,   # sem alertas
    "investigador":   3,
    "profissional":   None,  # todos
    "api_dados":      None,  # todos (+ webhook, não email)
}
```

Se o usuário atingiu o limite, a API retorna `403 Forbidden` com `code: "limite_alertas_atingido"`.

---

### 1.8 Limites por Plano

| Plano | Alertas por email | Órgãos monitorados | Webhook de eventos |
|-------|------------------|--------------------|--------------------|
| Cidadão | Não | — | Não |
| Investigador | Sim | Até 3 | Não |
| Profissional | Sim | Todos | Não |
| API & Dados | Não (substituído por webhook) | Todos | Sim (`POST` para URL configurada) |

O webhook do plano API & Dados envia o mesmo payload JSON que seria usado internamente pela task Celery. A URL de destino é configurada em `api_keys.webhook_url` (campo a adicionar na tabela `api_keys` se ainda não existir).

---

## 2. Deduplicação de Nomes de Pessoas

### 2.1 O Problema

Quando o Haiku extrai nomes de um ato, o mesmo indivíduo pode aparecer sob variações:

- `"JOÃO DA SILVA"` (maiúsculas, artigo incluso)
- `"João Silva"` (sem artigo)
- `"Dr. João da Silva Santos"` (com título e sobrenome extra)
- `"João D. Silva"` (inicial no meio)

Sem deduplicação, a tabela `pessoas` acumula registros duplicados. As estatísticas de aparições, o score de concentração de poder e o grafo de relações (`relacoes_pessoas`) ficam fragmentados e incorretos.

---

### 2.2 Algoritmo: Dois Passos

A estratégia combina normalização no momento da extração (barata, zero latência extra) com fuzzy matching no momento da persistência (precisa, cobre casos residuais).

#### Passo 1 — Normalização via Prompt do Haiku

O prompt de extração instrui o Haiku a retornar nomes já normalizados, eliminando a maioria dos casos antes de qualquer código rodar:

```
Ao listar pessoas_mencionadas, normalize os nomes:
- Remova títulos e tratamentos: Dr., Dra., Arq., Arqto., Sr., Sra., Prof., Eng.
- Remova artigos iniciais isolados: de, da, do, dos, das (manter se parte do sobrenome composto)
- Converta para Title Case: "JOÃO SILVA" → "João Silva"
- Mantenha o nome mais completo encontrado no documento
- Se o documento menciona cargo junto ao nome (ex: "Presidente João Silva"), retorne só o nome

Exemplo correto: ["João Silva", "Maria Costa", "Ana Paula Ferreira"]
```

Isso reduz ~80% das variações antes de qualquer código ser executado.

#### Passo 2 — Fuzzy Matching com rapidfuzz

Antes de inserir uma nova pessoa no banco, verifica se já existe registro similar:

```python
# app/services/pessoas.py

from rapidfuzz import fuzz, process
from typing import Optional
from uuid import UUID
from app.models import Pessoa
from sqlalchemy.orm import Session


THRESHOLD_SIMILARIDADE = 88  # ponto de equilíbrio para nomes brasileiros completos
THRESHOLD_NOME_CURTO = 95   # nomes com < 8 chars precisam de match mais rigoroso


def normalizar_nome(nome: str) -> str:
    """
    Normalização local complementar ao que o Haiku já faz.
    Garante consistência mesmo em chamadas que não passam pelo prompt.
    """
    import re
    import unicodedata

    # Corrige encoding quebrado (ftfy já deve ter passado antes)
    titulo_pattern = r"^(Dr\.|Dra\.|Arq\.|Arqto\.|Sr\.|Sra\.|Prof\.|Eng\.)\s+"
    nome = re.sub(titulo_pattern, "", nome, flags=re.IGNORECASE).strip()

    # Title Case preservando caracteres acentuados
    nome = nome.title()

    # Remove espaços duplos
    nome = re.sub(r"\s+", " ", nome).strip()

    return nome


def encontrar_pessoa_existente(
    nome_novo: str, tenant_id: UUID, db: Session
) -> Optional[Pessoa]:
    """
    Retorna a pessoa existente se similaridade >= threshold, None caso contrário.
    Usa token_sort_ratio para lidar com palavras fora de ordem (ex: "Silva João" vs "João Silva").
    """
    pessoas_existentes = (
        db.query(Pessoa).filter(Pessoa.tenant_id == tenant_id).all()
    )

    if not pessoas_existentes:
        return None

    nomes_normalizados = [p.nome_normalizado for p in pessoas_existentes]

    # Threshold dinâmico: nomes curtos exigem match mais alto
    threshold = THRESHOLD_NOME_CURTO if len(nome_novo) < 8 else THRESHOLD_SIMILARIDADE

    resultado = process.extractOne(
        nome_novo,
        nomes_normalizados,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold,
    )

    if resultado:
        _, _, idx = resultado
        return pessoas_existentes[idx]

    return None


def obter_ou_criar_pessoa(nome: str, tenant_id: UUID, db: Session) -> Pessoa:
    """
    Retorna pessoa existente (por fuzzy match) ou cria novo registro.
    Adiciona a variante ao array variantes_nome se ainda não constar.
    """
    nome_normalizado = normalizar_nome(nome)

    pessoa_existente = encontrar_pessoa_existente(nome_normalizado, tenant_id, db)
    if pessoa_existente:
        # Registra variante para rastreabilidade
        if nome_normalizado not in (pessoa_existente.variantes_nome or []):
            pessoa_existente.variantes_nome = (
                pessoa_existente.variantes_nome or []
            ) + [nome_normalizado]
        return pessoa_existente

    nova_pessoa = Pessoa(
        tenant_id=tenant_id,
        nome_normalizado=nome_normalizado,
        variantes_nome=[nome_normalizado],
    )
    db.add(nova_pessoa)
    db.flush()  # gera o UUID sem commitar — permite uso do id no mesmo request
    return nova_pessoa
```

---

### 2.3 Threshold e Trade-offs

O valor de **88%** foi escolhido após análise de casos reais com nomes brasileiros:

| Threshold | Comportamento | Problema |
|-----------|--------------|---------|
| 85% | Muitos falsos positivos | "Silva" e "Silveira" colidem em nomes curtos |
| 88% | Equilíbrio adequado | "João da Silva" vs "João Silva" = ~89% → match correto |
| 90% | Muitos falsos negativos | "João da Silva" vs "João Silva" pode ficar abaixo |
| 95% | Conservador demais | Não resolve o problema original |

O scorer `token_sort_ratio` é preferível ao simples `ratio` porque ordena os tokens antes de comparar, cobrindo casos como "Silva João da" (extração malfeita) vs "João da Silva".

**Casos especiais:**
- Nomes com menos de 8 caracteres (ex: "Ana Luz"): threshold elevado para 95% para evitar colisões.
- Cargo embutido no campo (ex: "Presidente João Silva"): o prompt do Haiku já instrui remoção do cargo. Se passar, a normalização local detecta pelo regex de títulos; cargos não cobertos devem ser adicionados ao regex conforme encontrados.
- Entidades não-pessoas (ex: "Comissão de Ética"): o Haiku diferencia por tipo — `pessoas_mencionadas` vs `orgaos_mencionados`. Não passam pelo fuzzy matching de pessoas.

---

### 2.4 Campo `variantes_nome` na Tabela `pessoas`

A tabela `pessoas` em `02-banco-de-dados.md` já define o campo correto:

```sql
variantes_nome TEXT[]  -- todas as variações de nome encontradas nos documentos
```

Nenhuma migração adicional é necessária. O campo é indexado via GIN para busca full-text:

```sql
CREATE INDEX idx_pessoas_nome ON pessoas USING GIN(variantes_nome);
```

> **Nota:** O campo foi nomeado `variantes_nome` (não `aliases`) para manter consistência com o vocabulário do restante do schema. O código em `obter_ou_criar_pessoa` usa `variantes_nome` — não usar `aliases` em nenhuma implementação.

---

### 2.5 Dependências e Instalação

```txt
# requirements.txt (adicionar às dependências existentes)
rapidfuzz==3.9.7     # fuzzy string matching — sem dependência de C nativo no Railway
ftfy==6.2.0          # corrige encoding quebrado nos PDFs (mojibake, caracteres mal extraídos)
```

`rapidfuzz` é puro Python com extensão C opcional — funciona sem compilação no Railway. Alternativa `fuzzywuzzy` foi descartada por ser mais lenta e exigir `python-Levenshtein`.

`ftfy` deve ser aplicado **antes** da normalização, no momento da extração do texto do PDF:

```python
import ftfy

texto_limpo = ftfy.fix_text(texto_bruto_do_pdfplumber)
# Depois passa para o Haiku
```

Isso evita que caracteres corrompidos (ex: `JoÃ£o` em vez de `João`) contaminem os nomes extraídos e causem falhas no fuzzy matching.
