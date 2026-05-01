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

---

## 7. Checklist completo de cobertura — menus do PTE

> Inventário item-a-item dos 10 círculos do topo do portal. Marcar conforme
> scraper for entregue + batch metadata-only rodado.
>
> Legenda: ✅ coletado · 🔄 rodando · 🟡 scraper pronto, não rodou · ⬜ pendente · ⏭️ fora de escopo (Fase 2+ ou descartado)

### 7.1 PLANEJAMENTO E ORÇAMENTO (CAT 2 — 13 sub-itens)

- [ ] ⬜ PPA — Plano Plurianual (4-em-4 anos, narrativo)
- [ ] ⬜ LDO — Lei de Diretrizes Orçamentárias (anual)
- [ ] ⬜ LOA — Lei Orçamentária Anual
- [ ] ⬜ Alterações Orçamentárias (créditos suplementares, especiais)
- [ ] ⬜ Programação Financeira
- [ ] ⬜ Cota Financeira / Orçamentária
- [ ] ⬜ Plano Anual de Contratações
- [ ] ⬜ Diretrizes de Execução
- [ ] ⬜ Decretos de Programação
- [ ] ⬜ Demonstrativos de Execução
- [ ] ⬜ Quadro de Detalhamento de Despesas
- [ ] ⬜ Anexos da LOA
- [ ] ⬜ Justificativas de Alterações

### 7.2 RECEITAS (CAT 3 — 30 sub-itens)

- [ ] ⏭️ Receita Arrecadada (números mensais, não ato)
- [ ] ⏭️ Consulta Detalhada de Receita
- [ ] 🟡 Dívida Ativa — sub-item alvo
- [ ] 🟡 Renúncias Fiscais — alto valor investigativo
- [ ] 🟡 Anistia / Remissão / Parcelamentos
- [ ] ⬜ Programa Paraná Competitivo
- [ ] ⬜ Emendas Parlamentares (impositivas)
- [ ] ⬜ Empréstimos Tomados pelo Estado
- [ ] ⬜ Repartição de Receitas com Municípios
- [ ] ⬜ ICMS Ecológico / Verde
- [ ] ⬜ FPE — Fundo de Participação dos Estados
- [ ] ⬜ ITCMD / IPVA / Taxas (consolidados)
- [ ] ⬜ Royalties (recursos hídricos, minerais)
- [ ] ⬜ Convênios de Receita (federais)
- [ ] ⬜ Operações de Crédito
- [ ] ⬜ Restos a Receber
- [ ] ⬜ Receita por Órgão
- [ ] ⬜ Receita por Fonte
- [ ] ⬜ Receita por Categoria Econômica
- [ ] ⬜ Atualização da Receita
- [ ] ⬜ Multas
- [ ] ⬜ Indenizações e Restituições
- [ ] ⬜ Sucumbência / Honorários
- [ ] ⬜ Outras Receitas Correntes
- [ ] ⬜ Outras Receitas de Capital
- [ ] ⬜ Receita Imobiliária
- [ ] ⬜ Receita de Serviços
- [ ] ⬜ Receitas Industriais
- [ ] ⬜ Receitas Agropecuárias
- [ ] ⬜ Transferências da União

### 7.3 DESPESAS (CAT 4 — 35 sub-itens)

- [ ] 🔄 **Convênios Estaduais (4/127)** — **batch metadata-only rodando** (38.915 únicos, página ~13/1297)
- [ ] ⬜ Convênios Federais
- [ ] ⬜ Pagamentos por Credor
- [ ] ⬜ Repasses a Municípios
- [ ] ⬜ Repasses a OSC (Organizações da Sociedade Civil)
- [ ] ⬜ Funsaude
- [ ] ⬜ Fundeb
- [ ] ⬜ Precatórios
- [ ] ⬜ Dívida Pública / Serviço da Dívida
- [ ] ⬜ Adiantamentos
- [ ] ⬜ Despesa por Função / Subfunção
- [ ] ⬜ Despesa por Programa
- [ ] ⬜ Despesa por Órgão / Unidade
- [ ] ⬜ Despesa por Categoria Econômica
- [ ] ⬜ Despesa por Modalidade de Aplicação
- [ ] ⬜ Despesa por Elemento
- [ ] ⬜ Despesa por Fonte
- [ ] ⬜ Despesa Detalhada (consulta livre)
- [ ] ⬜ Empenhos Emitidos
- [ ] ⬜ Liquidações
- [ ] ⬜ Pagamentos Efetivados
- [ ] ⬜ Restos a Pagar
- [ ] ⬜ Despesas com Pessoal
- [ ] ⬜ Despesas com Aposentados / Pensionistas
- [ ] ⬜ Subvenções Sociais
- [ ] ⬜ Auxílios e Contribuições
- [ ] ⬜ Indenizações Judiciais
- [ ] ⬜ Sentenças Judiciais (não-precatório)
- [ ] ⬜ Despesas Reservadas / Sigilosas (se houver)
- [ ] ⬜ Diárias e Passagens (Executivo) — análogo a Implanta CAU
- [ ] ⬜ Desapropriações
- [ ] ⬜ Aquisição de Imóveis
- [ ] ⬜ Patrocínios Culturais
- [ ] ⬜ Convênios Internacionais
- [ ] ⬜ Pagamentos a Estagiários

### 7.4 PESSOAL (CAT 6 — 17 sub-itens) **[da captura 1]**

- [ ] ⬜ **Remuneração** (mensal, base individual — alto volume, alto valor LGPD)
- [ ] ⬜ **Viagens** (diárias e passagens — Implanta-equivalente)
- [ ] ⬜ Concursos Públicos e Testes Seletivos
- [ ] ⬜ Tabelas Salariais e Carreiras
- [ ] ⬜ Relação Nominal (Art. 234 CE) — comissionados/gratificados
- [ ] ⬜ Estrutura Organizacional
- [ ] ⬜ **Relação de Servidores** (efetivos + comissionados)
- [ ] ⬜ Relação de Terceirizados
- [ ] ⏭️ Estatuto do Servidor Público (KB, não ato)
- [ ] ⬜ Relação de Servidores para Concorrer Mandato Eletivo em 2024
- [ ] ⬜ Aposentados e Pensionistas
- [ ] ⬜ Cessões e Requisições
- [ ] ⬜ Servidores em Licença
- [ ] ⬜ Servidores à Disposição
- [ ] ⬜ Tempo de Serviço / Quadro Funcional
- [ ] ⬜ Auxílios (saúde, alimentação, transporte)
- [ ] ⬜ Vale-Cultura / Outros Benefícios

### 7.5 COMPRAS (CAT 5 — 12 sub-itens visíveis na captura 2)

- [ ] ⬜ **Licitações (5/115)** — scraper v3 reutilizável, precisa adaptar
- [ ] ⬜ **Contratos (5/114)** — scraper v3 reutilizável, precisa adaptar
- [ ] ⬜ **Dispensas e Inexigibilidade**
- [ ] ⬜ Aquisições por Dispensa de Licitação - COVID-19
- [ ] ⬜ Transmissão de Sessão Pública (vídeos — fora de escopo IA)
- [ ] ⬜ Contratos - Recursos Externos
- [ ] ⬜ Situação Fornecedores
- [ ] ⬜ Preços Registrados (atas de RP)
- [ ] ⬜ Documentos Fiscais
- [ ] ⬜ Estoque de Suprimentos
- [ ] ⏭️ Catálogo de Itens (referencial, não ato)
- [ ] ⬜ Contratações Públicas (consolidado)

### 7.6 RESPONSABILIDADE FISCAL (CAT 7 — 5 sub-itens)

- [ ] ⬜ RREO — Relatório Resumido da Execução Orçamentária (bimestral)
- [ ] ⬜ RGF — Relatório de Gestão Fiscal (quadrimestral)
- [ ] ⬜ Balanço Geral do Estado (anual)
- [ ] ⬜ PAF — Programa de Ajuste Fiscal
- [ ] ⬜ Procedimentos Contábeis (manuais, KB)

### 7.7 JUSTIÇA FISCAL (CAT 12)

- [ ] ⬜ CEIS — Cadastro de Empresas Inidôneas e Suspensas
- [ ] ⬜ CNEP — Cadastro Nacional de Empresas Punidas
- [ ] ⬜ Devedores do Estado
- [ ] ⬜ Devedores Tributários

### 7.8 TRANSPARÊNCIA TEMÁTICA

- [ ] ⬜ Saúde / Educação / Segurança / Outras (recortes temáticos das demais)
- [ ] ⏭️ Geralmente é cross-reference das outras categorias, baixa prioridade

### 7.9 OBRAS E AÇÕES (CAT 11 — 6 sub-itens)

- [ ] ⬜ Obras por Área
- [ ] ⬜ Acompanhamento de Obras
- [ ] ⬜ Audiências Públicas
- [ ] ⬜ Obras Paralisadas
- [ ] ⬜ PPP / Concessões
- [ ] ⬜ Parcerias OSC

### 7.10 INFORMAÇÕES GERAIS / LEGISLAÇÃO E ATOS (CAT 8)

- [ ] ⬜ **Diários Oficiais** (DIOE — captcha gated)
- [ ] ⬜ Legislação Estadual (consolidada)
- [ ] ⬜ Cadastro de Autoridades
- [ ] ⬜ Conselhos
- [ ] ⬜ Comitês
- [ ] ⏭️ Gráficos / Indicadores

---

## 8. Resumo executivo de progresso

| Bloco | Total sub-itens | Coletados | Em rodada | Scraper pronto | Pendente | Fora de escopo |
|-------|---|---|---|---|---|---|
| Planejamento e Orçamento | 13 | 0 | 0 | 0 | 13 | 0 |
| Receitas | 30 | 0 | 0 | 0 | 27 | 3 |
| **Despesas** | 35 | 0 | **1 (convênios)** | 0 | 34 | 0 |
| **Pessoal** | 17 | 0 | 0 | 0 | 16 | 1 |
| **Compras** | 12 | 0 | 0 | 0 | 10 | 2 |
| Responsabilidade Fiscal | 5 | 0 | 0 | 0 | 5 | 0 |
| Justiça Fiscal | 4 | 0 | 0 | 0 | 4 | 0 |
| Obras e Ações | 6 | 0 | 0 | 0 | 6 | 0 |
| Legislação / DIOE | 5+ | 0 | 0 | 0 | 5 | 0 |
| **TOTAL** | **~127** | **0** | **1** | **0** | **120** | **6** |

**Cobertura atual: 0,8%** (1 sub-item de ~127). Plano: priorizar 6 sub-itens
de alto valor investigativo na Fase 1 → cobertura ~5%, mas com a maior
densidade de irregularidades por documento.

### 8.1 Top 6 prioridades pra Fase 1 (alto valor / esforço viável)

| # | Sub-item | Bloco | Volume estimado | Valor invest. | Status |
|---|----------|-------|-----------------|---------------|--------|
| 1 | Convênios Estaduais | Despesas | 38.9k únicos | 🔴 Alto (OSC aliadas) | 🔄 Rodando |
| 2 | Diários Oficiais (DIOE) | Legislação | 5.4k edições | 🔴 Alto (decretos, nomeações) | ⬜ Captcha pendente |
| 3 | Licitações | Compras | ~50k | 🔴 Alto (dispensas) | 🟡 Scraper v3 reutilizável |
| 4 | Contratos | Compras | ~30k | 🔴 Alto (fracionamento) | 🟡 Scraper v3 reutilizável |
| 5 | Dispensas e Inexigibilidade | Compras | ~15k | 🔴 Alto (Art. 75 LL) | ⬜ |
| 6 | Remuneração | Pessoal | ~80k servidores | 🟠 Médio (LGPD-sensitive) | ⬜ |

**Soma Fase 1:** ~220k atos, custo IA ~$600-900 (Piper full + Bud em 5%).

---

## 9. Status REAL de captura (atualizado em 2026-04-30)

### 9.1 Scrapers que FUNCIONAM (httpx puro, sem JS)

| Slug | Path | Endpoint real | Tipo coleta | Universo | Status |
|------|------|---------------|-------------|----------|--------|
| **Convênios** | 4/127 | `/pte/compras/convenios` | paginate metadata | 38.915 | 🔄 rodando |
| **Contratos** | 5/114 | `/pte/compras/contratos` | paginate metadata | 9.364 | 🔄 rodando |
| **Licitações** | 5/115 | `/pte/compras/licitacoes/inicio` | paginate metadata anual | ~50-80k (2007-2026) | 🔄 rodando |
| **Dispensas** | 5/204 | `/pte/compras/dispensasInexigibilidade` | paginate metadata | 92.216 (mas trava em 110 — bug) | ⚠️ parcial |
| **Fornecedores** | 5/116 | `/pte/compras/situacao_fornecedores` | paginate metadata | 59.863 | 🔄 rodando |
| **Preços** | 5/117 | `/pte/...precos...` | paginate metadata | 51.413 | 🔄 rodando |
| **Itens (Catálogo)** | 5/297 | `/pte/...itens...` | paginate metadata | 61.491 | 🔄 rodando |
| **Remuneração** | 6/1 | `/pte/pessoal/servidores/poderexecutivo/remuneracao` | **dump ZIP mensal** | 180 arquivos × ~6MB = ~1.2GB | 🔄 rodando |

**Total atos no inventário:** ~322k metadata + ~1.2GB de dumps (~30M linhas de remuneração).

### 9.2 Sub-itens BLOQUEADOS (precisam técnica especial)

| Slug | Path | Endpoint real | Bloqueio |
|------|------|---------------|----------|
| **Viagens** | 6/2 | `/pte/pessoal/viagens` | Dropdown de Ano vem **vazio** (lazy load JS) — servidor exige ano. Precisa Playwright pra disparar AJAX que popula. |
| **Relação de Servidores** | 6/131 | `/pte/pessoal/relacao-servidores` | `<button type="false">` + lazy load — mesmo padrão de Viagens |
| **Estrutura Organizacional** | 6/18 | `/pte/pessoal/estrutura-organizacional` | conteúdo JS lazy-loaded |
| **Relação Nominal (Art. 234)** | 6/45 | `/pte/pessoal/servidores/poderexecutivo/relacao-nominal` | `formExibirPdf` — gera PDF unitário (precisa loop) |
| **Servidores Licença Eleitoral** | 6/207 | `/pte/.../relacao-servidor-em-licenca-eleitoral` | `formExibirPdf` |
| **Pagamentos Efetuados** | 4/30 | `/pte/despesas/pagamentosEfetuados` | sem botão Download do BD |
| **Consulta Livre Despesa** | 4/22 | `/pte/despesas/consultalivre` | tem botão mas exige seleção específica |
| **Consulta por Credor** | 4/28 | `/pte/despesas/consultacredor` | exige `tipoPesquisa`+filtros — busca individual, não dump |
| **Consulta Pré-formatada** | 4/77 | `/pte/despesas/consultapreformatada` | exige seleção de tipo |
| **Total Desembolsado** | 4/126 | `/pte/despesas/totalDesembolsado` | exige seleção |

**Padrão comum dos bloqueados:** formulários parametrizados pra busca individual, não pra dump em massa. Interface foi feita pra evitar exfiltração total.

### 9.3 Outras URLs descobertas

- `/pte/informacoes/webservices` — página oficial de Web Services. Provavelmente lista APIs JSON pra Receitas, Despesas, Dispensas, Remunerações, Licitações, Transparência Temática. **Conteúdo lazy-loaded — investigar com Playwright.**
- `/pte/informacoes/download` — página oficial de Downloads. Conteúdo lazy-loaded — provavelmente lista todos os arquivos pré-empacotados. **Investigar com Playwright.**

### 9.4 Sub-itens AINDA NÃO PROBADOS (109 dos 128)

A maioria dos 109 que retornaram "Aguarde..." (lazy load) na primeira GET:
- **Categoria 2 (Planejamento)**: 13 sub-itens — PPA, LDO, LOA, Alterações...
- **Categoria 3 (Receitas)**: 30 sub-itens — Arrecadada, Dívida Ativa, Renúncias...
- **Categoria 4 (Despesas)**: 35 sub-itens — Pagamentos, Repasses, Funsaude...
- **Categoria 7 (LRF)**: 5 sub-itens — RREO, RGF, Balanço, PAF
- **Categoria 11 (Obras)**: 6 sub-itens
- **Categoria 12 (Justiça Fiscal)**: 4 sub-itens — CEIS, CNEP, Devedores

Estes precisam:
- (a) Playwright pra renderizar JS e ver se há datatable interno
- (b) Inspect_pte_download.py pra capturar request real do download
- (c) Caso a caso, descobrir o fluxo

### 9.5 DIOE (Diário Oficial Executivo)

Sistema separado em `documentos.dioe.pr.gov.br`. **Captcha-gated** após algumas requests. Estratégia separada (sessão semi-manual ou 2captcha pago).

---

## 10. Caminho à frente

**Curto prazo (durante esta sessão):**
- Os 7 paginate batches terminam em ~2-3h → ~322k atos no inventário
- Remuneração BD termina em ~10min → 180 arquivos / ~1.2GB

**Médio prazo (próxima sessão):**
- Resolver fluxo lazy-loaded com Playwright pra Viagens/Servidores/Despesas
- Probar todos os 109 sub-itens não testados via Playwright
- Implementar suporte a `webservices` e `download` (páginas oficiais)
- DIOE com sessão semi-manual

**Longo prazo (Fase 2):**
- Cruzar com CNPJ.ws (laranjas)
- Cruzar com TSE/TRE-PR (doações)
- Wayback Machine sistemático
- Outros portais (TCE-PR, ALEP, MP-PR)

---

## 11. Discovery Playwright — descoberta completa (2026-04-30)

Após varredura com browser real (Playwright) dos 128 sub-itens, descobertas:
- **12 DataTables** (renderizam após JS — confirmados)
- **20 sub-itens com `lnkDownloadBD`** (botão Download do BD)
- **85 sub-itens com iframes externos** (sistemas externos!)

### 11.1 Sub-itens com Download do BD que ainda NÃO foram capturados

Detectados pelo Playwright mas pendentes de implementação:

| Path | Título | Form |
|------|--------|------|
| 3/3 | Consulta Detalhada da Receita | formPesquisaReceita |
| 3/57 | Outras Consultas da Receita | formPesquisaReceitaOrcamentaria |
| 4/22 | Consulta Detalhada da Despesa | formPesquisaDespesa |
| 4/28 | Consulta por Credor | formPesquisa |
| 4/77 | Outras Consultas da Despesa | formPesquisaPreFormatada |
| 4/126 | Total Desembolsado | formPesquisaTotalDesembolsado |
| 5/213 | Estoque de Suprimentos | parent_form |
| 6/131 | Relação de Servidores | formRelacaoServidores |
| 8/177 | **Bens Móveis** | parent_form |

Próxima sessão: usar Playwright pra automatizar preenchimento de filtros + clicar download → captura via `expect_download()`.

### 11.2 Sistemas externos descobertos (iframes)

**ALTO valor — sistemas paralelos com dados massivos:**

| Sistema | URL | O que tem |
|---------|-----|-----------|
| **Legislação Estadual** | `legislacao.pr.gov.br` | TODAS as leis, decretos, portarias do PR. Estruturado, indexado. |
| **FlexPortal Receitas** | `transparencia.pr.gov.br/FlexPortal/#!Receitas` | Receitas via Flex (legacy mas ativo) |
| **FlexPortal Despesas** | `transparencia.pr.gov.br/FlexPortal/#!Despesas` | Despesas detalhadas |
| **FlexPortal Fornecedores** | `transparencia.pr.gov.br/FlexPortal/#!Fornecedores` | Fornecedores via Flex |
| **SIAFIC** | `siafic.pr.gov.br/FlexPortal/#!Consulta1` | Sistema Integrado de Adm Financeira |
| **SIAFIC ISSPAGOS** | `siafic.pr.gov.br/FlexPortal/#!ISSPAGOS` | Pagamentos detalhados |
| **Recolhimento Diário** | `recdiario.fazenda.pr.gov.br/recdiario/index` | Receita arrecadada diária |
| **Portal v4** (Repasses) | `www4.pr.gov.br/Gestao/portaldatransparencia/repasses` | Repasses aos municípios (HTML estático) |
| **Portal v4** (Adiantamentos) | `www4.pr.gov.br/Gestao/portaldatransparencia/adiantamentos` | Adiantamentos a servidores |
| **RPV** | `rpv.fazenda.pr.gov.br/prpv/publico/transparencia` | Requisição de Pequeno Valor (precatórios) |
| **Qlik PTE** | `bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=PTE.qvw` | Dashboard Qlik antigo do PTE |
| **Qlik Realizações** | `bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=RealizacoesdeGoverno.qvw` | Realizações de Governo |
| **Qlik Sense Terceirizados** | `bi2.pr.gov.br/single/?appid=d9284dcd-...` | 6/271 Relação de Terceirizados |
| **Qlik Sense CGEOUV+** | `bi2.pr.gov.br/single/?appid=3e7bea38-...` | Ouvidoria |
| **PowerBI Emendas PIX** | `app.powerbi.com/view?r=eyJrIjoiN2UzN2Uy...` | Emendas Parlamentares PIX |
| **PowerBI SEFA** | `app.powerbi.com/view?r=eyJrIjoiN2E1YzRm...` | Despesas SEFA |
| **SERPRO Transferências** | `dd-publico.serpro.gov.br/extensions/transferencias-discricionarias-e-legais` | Transferências federais |
| **SISTAG Social** | `sistag.social.pr.gov.br/sis/publico/repasses-geral` | Repasses sociais |
| **GCAU Casa Civil** | `gcau-consulta.casacivil.pr.gov.br/gcau_internet/pesquisa` | Atos administrativos da Casa Civil |
| **SEED Convênios** | `educacao.pr.gov.br/Convenios` | Convênios da Secretaria de Educação |

Cada sistema requer estratégia de captura própria:
- **HTML estático (www4, rpv)**: scraping simples com httpx
- **Qlik (bi.pr.gov.br, bi2.pr.gov.br)**: API Qlik Engine ou export
- **PowerBI**: API REST (`api.powerbi.com`) ou render via Playwright
- **FlexPortal Adobe Flex**: API AMF ou XML legacy
- **SIAFIC**: idem FlexPortal
- **legislacao.pr.gov.br**: Struts (igual DIOE) — pode ter captcha

### 11.3 Volume estimado quando todos forem capturados

| Origem | Volume estimado |
|--------|-----------------|
| PTE paginate (8 endpoints) | ~322k atos no inventário |
| PTE BD dump (Remuneração) | 168 arquivos × 6MB ≈ 1.1GB |
| PTE BD dump (Viagens) | ~150 arquivos × ?MB (TBD via Playwright) |
| PTE BD dump (outros 9) | TBD |
| Legislação Estadual | ~50.000 leis/decretos (estimativa baseada em outros estados) |
| SIAFIC | dezenas de milhões de empenhos |
| Repasses Municípios | dezenas de milhares |
| RPV | milhares de precatórios |
| Qlik Realizações de Governo | dashboard, exportável CSV |
| Sistemas restantes | a estimar |

**Total real estimado para "GOV-PR completo": dezenas de milhões de registros + dezenas de GBs de dumps.**

