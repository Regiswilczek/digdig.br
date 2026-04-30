# Mapeamento — Governo do Estado do Paraná (GOV-PR)

> Levantamento inicial do que está disponível pra ingestão. Objetivo: enxergar
> todas as fontes antes de escrever scrapers, decidir prioridades e custo, e
> definir o que entra na Fase 1 do plano de onboarding (`/root/.claude/plans/sim-antes-de-codar-abundant-whistle.md`).

**Status do levantamento:** parcial — menu principal mapeado, conteúdo das
páginas internas requer renderização JS (Obscura/Playwright) pra ver detalhes.

**VPS NÃO está bloqueada** pelo portal-pr (HTTP 200 em todos os endpoints
testados de IP de data center). Diferente do CAU/PR. Isso significa que o
scraper pode rodar **na própria VPS** se quisermos — não precisa rodar local.

---

## 1. Portais identificados

| Portal | URL | Tecnologia | O que tem | Status |
|---|---|---|---|---|
| **Transparência PR (PTE)** | https://www.transparencia.pr.gov.br/pte/ | JSF / PrimeFaces (sessão + AJAX) | Atos, despesas, receitas, contratos, servidores | **Fonte primária** |
| **Dados Abertos PR (BDEweb)** | https://www.dados.pr.gov.br | HTML estático (IPARDES) | Estatísticas econômicas, PIB, IDH por município | Cruzamento, não atos |
| **CGE-PR** | https://www.cge.pr.gov.br | HTML estático | Controladoria Geral, glossário, FAQ, LAI | Sec/comunicação |
| **PIA-PR** | https://www.pia.pr.gov.br | Portal de serviços | Agenda de autoridades, etc. | Tangencial |
| **Imprensa Oficial PR** | https://www.imprensaoficial.pr.gov.br | (a verificar) | Diário Oficial Executivo + Atos do Governador | **Fonte primária** |

> **CKAN?** `https://www.dados.pr.gov.br/api/3/action/package_list` retorna 404.
> O Paraná **não tem CKAN público** — não há API formal de dados abertos.

---

## 2. Estrutura do Portal de Transparência (PTE)

### 2.1 Padrão de URL

```
https://www.transparencia.pr.gov.br/pte/assunto/{categoria}/{subitem}
```

12 categorias temáticas detectadas, ~180 sub-itens no menu (acessíveis
publicamente, mas conteúdo em JS).

### 2.2 Categorias mapeadas

| ID | Tema | Sub-itens | Mapeia pra (digdig) |
|----|------|-----------|---------------------|
| **2** | **Planejamento e Orçamento** | 13 — PPA, LDO, LOA, Alterações, Programação Financeira, Cota, Plano de Contratações Anual, Diretrizes | `atos` (tipo=`lei_estadual` / `decreto_executivo`) + KB |
| **3** | **Receitas** | 30 — Receita Arrecadada, Consulta Detalhada, Dívida Ativa, Renúncias Fiscais, Anistia, Programa PR Competitivo, Emendas Parlamentares, Empréstimos | `despesas_pub`/`receitas_pub` (tabela nova) + `atos` |
| **4** | **Despesas** | 35 — Pagamentos, Credores, Repasses, Convênios Estaduais e Federais, Funsaude, Fundeb, Precatórios, Dívida Pública, Adiantamentos | `despesas_pub`, `atos` (tipo=`convenio_estadual`) |
| **5** | **Compras / Licitações** | 23 — Licitações, Contratos, Dispensas, Inexigibilidades, Sit. Fornecedores, Preços Registrados, Aquisições COVID-19 | `licitacoes_pub`, `contratos_pub`, `atos` (tipo=`licitacao`) |
| **6** | **Pessoal / Servidores** | 17 — Remuneração, Viagens (diárias), Concursos, Tabelas Salariais, Relação Nominal (Art. 234 CE), Estrutura Organizacional, Servidores, Terceirizados | `pessoas_pub`, `diarias`, `atos` (tipo=`nomeacao_comissionado`) |
| **7** | **Contábil / LRF** | 5 — RREO, RGF, Balanço Geral, Procedimentos Contábeis, PAF | `atos` (tipo=`relatorio_lrf`) |
| **8** | **Legislação e Atos** | 36 — **Diários Oficiais**, Legislação Estadual, Cadastro de Autoridades, Conselhos, Comitês, Gráficos | **Fonte primária de atos** → `atos` (tipo=`lei_estadual`/`decreto_executivo`) |
| **10** | **Programas e Outras Esferas** | 8 — Desenvolvimento Social, Escolas, Órgãos de Governo, PPP, Parcerias OSC | `atos` (tipo=`convenio_estadual`) |
| **11** | **Obras** | 6 — Por Área, Acompanhamento, Audiências Públicas, Paralisadas | tabela nova `obras_pub` |
| **12** | **Sanções (CEIS / CNEP)** | 4 — Devedores, CEIS, CNEP | `pessoas_pub` enriquecimento |

> Categorias 1, 9 não apareceram — provavelmente Comunicação / Controladoria
> (acessíveis por outros caminhos do menu).

### 2.3 Bloqueio técnico

Tudo no PTE renderiza via **PrimeFaces / JSF** com `windowId`, `jsessionid`
e `javax.faces.ViewState`. Sem JS engine não dá pra:
- Listar resultados de uma consulta (são tabelas AJAX)
- Baixar CSV/XLS gerado dinamicamente
- Paginar resultados
- Filtrar por ano/órgão

**→ Obscura é necessário** pra navegação interna (mesmo na VPS, que tem
acesso ao site, sem JS o conteúdo não chega).

---

## 3. Estratégia de ingestão por categoria

### 3.1 Prioridades (Fase 1 — smoke 1k atos)

| # | Origem | Tipo de ato | Esforço | Valor investigativo |
|---|--------|-------------|---------|---------------------|
| 1 | **Diário Oficial Executivo PR** (CAT 8) | Decretos do Governador, Leis, Portarias | Médio (encontra fonte ou scraper IO) | 🔴 **Alto** — atos típicos de irregularidade política |
| 2 | **Licitações + Contratos** (CAT 5) | `licitacao`, `contrato` | Médio-alto (PrimeFaces) | 🔴 **Alto** — contratação direta, dispensas |
| 3 | **Convênios** (CAT 4) | `convenio_estadual` | Médio | 🟠 OSC aliadas, ONG |
| 4 | **Remuneração + Concursos + Servidores** (CAT 6) | `nomeacao_comissionado` | Médio | 🟠 cargos comissionados |

### 3.2 Pra Fase 2

5. RREO/RGF (CAT 7) — relatórios fiscais
6. Repasses a municípios (CAT 4)
7. Diárias/Viagens (CAT 6) — analogia direta com Implanta do CAU
8. CEIS/CNEP (CAT 12) — enriquecimento de pessoas
9. Obras (CAT 11)

### 3.3 Postpone (Fase 3+)

- BDEweb / IPARDES (cruzamento estatístico — não é ato)
- Plano Plurianual (CAT 2) — narrativa, baixo valor pontual
- Receita arrecadada (CAT 3) — números, não ato

---

## 4. Decisões técnicas pendentes

1. **Obscura na VPS?** O binário Linux estaria no `obscura.zip`, mas o ZIP que
   examinei só tem o `.exe` Windows. Verificar se há build Linux. Caso
   contrário: rodar Obscura na máquina do Regis e exportar JSONs
   intermediários pra subir, OU usar Playwright/Chrome headless puro
   (sem stealth) — testar se o portal-pr bloqueia user-agent de bot.

2. **Diário Oficial — qual fonte?** Opções:
   - **imprensaoficial.pr.gov.br** — site oficial, possivelmente PDF por edição
   - **CAT 8 do PTE** sub-item "Diários Oficiais" (`/pte/assunto/8/38`) — provavelmente leva pro mesmo lugar
   - **AEN-PR** (`aen.pr.gov.br`) — agência de notícias, não DO formal
   - Decisão depende de inspeção dos PDFs/JSON disponíveis.

3. **Sessão JSF** — pra scrape automatizado, manter `jsessionid` e
   `javax.faces.ViewState` válidos durante a navegação. Implica que
   um único browser session percorre múltiplas páginas em sequência —
   não dá pra paralelizar scraping sem múltiplas sessions.

4. **`scraper_config` JSONB** do tenant `gov-pr` — propor formato:
   ```json
   {
     "fonte_principal": "doe-pr",
     "fontes": [
       {"id": "doe-pr",            "tipo": "diario_oficial",  "url": "..."},
       {"id": "transparencia-pr",  "tipo": "pte_jsf",          "url_base": "https://www.transparencia.pr.gov.br/pte/"},
       {"id": "ipardes-bde",       "tipo": "html_estatico",    "url": "https://www.dados.pr.gov.br/"}
     ],
     "obscura_required": ["transparencia-pr"]
   }
   ```

---

## 5. Reconhecimento empírico — abril/2026

### 5.1 Obscura instalado e funcional

`tools/obscura/install.sh v0.1.1` extrai o binário Linux x86_64 (~80MB)
do GitHub releases. Rodou na VPS sem precisar Wine:

```bash
./obscura fetch --stealth --wait 5 --wait-until networkidle --dump html "<URL>"
./obscura fetch --eval "JSON.stringify({fn: download.toString()})" "<URL>"  # introspecção JS
./obscura serve --port 9222 --stealth --workers 4   # CDP server pra Playwright
```

JS errors do PrimeFaces (jQuery `undefined`) aparecem mas **não impedem
extração de links/HTML** — Obscura captura o DOM final mesmo com inits
quebrados.

### 5.2 PTE — categorias inspecionadas

| Categoria | URL | HTML pós-JS | Achados |
|-----------|-----|-------------|---------|
| **Licitações** (5/115) | `/pte/assunto/5/115` | 303 KB | Botão `formpesquisa:lnkdownloadbd` ("Download do BD CSV/ano"). Tabela ui-datatable renderiza, paginação AJAX. |
| **Convênios** (4/127) | `/pte/assunto/4/127` | 896 KB | **31 PDFs já visíveis no HTML** (anexos no TCE-PR). Mesmo botão de Download do BD. |
| **Diários Oficiais** (8/38) | `/pte/assunto/8/38` | 1.2 KB | Redireciona pro DIOE (sistema separado). |

> **Achado-chave:** Convênios entrega PDFs anexados (no TCE-PR) já no HTML
> renderizado, sem precisar interagir. **É a fonte mais simples pra primeiro
> batch** — não precisa AJAX postback, não precisa captcha.

### 5.3 DIOE — Diário Oficial Executivo

Sistema diferente do PTE: **Struts/Java tradicional** em
`https://www.documentos.dioe.pr.gov.br/dioe/`.

**Endpoint de busca** (sem JS):
```
GET /dioe/consultaPublicaPDF.do
    ?action=pgLocalizar&enviado=true
    &diarioCodigo=3                # 3=Executivo, 2=ComInd, 10=Assembleia, 8=Concursos, 9=Curitiba
    &dataInicialEntrada=&dataFinalEntrada=
    &search=&submit=Localizar
    &pg={N}                        # paginação (1..363 com qtd=5431, 15/pág)
    &ec={TOKEN_DE_SESSAO}
```

Retorna HTML 67 KB com 15 edições por página, formato:
- `EX_2026-04-29` (Executivo, data ISO)
- `arquivoCodigo=24552` (ID interno da edição)
- IDs sequenciais — abril/2026 está em ~24494-24552

**Função `download()` decodificada via `obscura --eval`:**
```javascript
function download(ec, arquivoCodigo, pagina, ok, janela, posicao) {
  if (ok == 'true') {
    var url = 'consultaPublicaPDF.do?action=download'
            + (pagina ? 'Pagina&pg='+pagina+'&posicao='+posicao : '')
            + '&ec='+ec+'&arquivoCodigo='+arquivoCodigo;
    window.location.href = url;
  } else {
    abrirCaptcha(ec, arquivoCodigo, pagina, janela, '', posicao);
  }
}
```

> 🚧 **Bloqueio: CAPTCHA na primeira chamada.** GET direto retorna HTML
> "O arquivo não pode ser baixado desta forma." A flag `ok='true'` exige
> sessão validada por captcha. Nas listagens públicas, o 4º argumento é
> sempre vazio → cai no `abrirCaptcha`.

**Opções pra contornar o captcha do DIOE (em ordem de preferência):**

1. **Sessão semi-manual:** resolver captcha 1× num browser, capturar
   cookies (`JSESSIONID`, `_ga`) e o token `ec`, mantê-los no scraper
   por algumas horas/dias até expirar. Operacionalmente factível pra
   batch grande de uma vez.
2. **Fonte alternativa Jusbrasil:** `jusbrasil.com.br/diarios/DOEPR/`
   indexa o DOE-PR. A verificar se conteúdo completo está acessível
   (provavelmente exige conta paga).
3. **Captcha solver pago** (2captcha, AntiCaptcha): ~$0,001/captcha.
   ~5400 edições históricas custariam $5–10, viável.
4. **API/Open data oficial:** `radardatransparencia.atricon.org.br`
   dá rating mas não conteúdo. Sem alternativa oficial encontrada.

### 5.4 Tipos de Diário Oficial mapeados

| diarioCodigo | Nome |
|---|---|
| **3** | Diário Oficial Executivo (5.431 edições, prioridade auditoria) |
| 2 | Diário Oficial Comércio, Indústria e Serviços |
| 10 | Diário Oficial da Assembleia |
| 8 | Suplemento de Concursos Públicos |
| 9 | Diário do Município de Curitiba (escopo separado, não-PR) |

---

## 6. Próximos passos (revisados pós-reconhecimento)

1. **Primeiro scraper: PTE Convênios (4/127)** — caminho mais limpo, sem
   captcha, PDFs no TCE-PR já visíveis no HTML pós-JS. Use Obscura `fetch
   --dump html`, parse os 31+ links de anexo, baixe PDFs do TCE.
2. **Segundo scraper: PTE Licitações + Contratos (5/115, 5/114)** —
   simular clique em "Download do BD" via Obscura serve + Playwright CDP,
   capturar CSVs anuais.
3. **Terceiro scraper: DIOE com sessão manual** — investigar 2captcha
   ou pedir resolução manual em batch (Regis resolve 1× por dia, scraper
   processa atrás). Estimar custo total se for via captcha solver.
4. **Cadastrar tenant `gov-pr`** com `scraper_config` JSONB:
   ```json
   {
     "fonte_principal": "pte_convenios",
     "fontes": [
       {"id": "pte_convenios",   "tipo": "pte_jsf",      "url": "https://www.transparencia.pr.gov.br/pte/assunto/4/127", "obscura": true},
       {"id": "pte_licitacoes",  "tipo": "pte_jsf",      "url": "https://www.transparencia.pr.gov.br/pte/assunto/5/115", "obscura": true, "needs_postback": true},
       {"id": "dioe_executivo",  "tipo": "dioe_struts",  "diario_codigo": 3, "captcha": "manual_session", "obscura": false}
     ]
   }
   ```
4. **Cadastrar tenant `gov-pr`** com `scraper_config` preenchido.
5. **Popular KB própria do GOV-PR** com Constituição PR, Lei 15.608/2007
   (Lei Estadual de Licitações), LRF curada, organograma do Executivo,
   organização das secretarias.
6. **Ampliar taxonomia ATLAS** (ALTER do CHECK constraint em
   `classificacao_atlas` + UPDATE em `atlas_categoria_tipo_orgao` com
   `tipo_orgao='executivo_estadual'`):
   - `lei_estadual`, `decreto_executivo`, `decreto_calamidade`
   - `parecer_pge`, `convenio_estadual`, `mensagem_governamental`
   - `nomeacao_comissionado`, `gratificacao`
7. **Primeiro scraper:** tentar DOE-PR (fonte mais simples, PDF direto).
   Smoke em 100 edições recentes → ATLAS classifica → revisar saída.
8. **Segundo scraper:** PTE/Licitações via Obscura.

---

## 6. Riscos identificados

- **JSF state bloqueia paralelismo** — ingestão de massa será mais lenta
  que CAU/PR (que tinha download direto de PDF).
- **Volume real desconhecido** — estimativa de 350k docs no plano é
  ordem de magnitude; pode ser maior ou menor. Confirmar após 1 mês de
  dados puxados.
- **LGPD** — remuneração de servidores expõe nome + cargo + valor.
  Já é informação pública por força do Art. 39 §6º CF/88, mas requer
  atenção no tratamento (não derivar inferências sensíveis).
- **Obscura como dependência crítica** — se a ferramenta sair de
  manutenção, precisamos plano B (Playwright + stealth manual).
