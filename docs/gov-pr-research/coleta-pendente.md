# GOV-PR Coleta — Estado e Pendências (2026-05-01)

Documento mestre pra retomar a coleta de dados do Governo do Paraná.
Coleta ativa pausada — aguardando definição de **storage externo** ou **VPS dedicada**
antes de continuar com sistemas pesados (DOE, Legislação, FlexPortal, Qlik, PowerBI).

---

## 📊 O que JÁ TEMOS coletado (estado atual)

### Banco
- **Tenant gov-pr**: status=`active`, **95.034 atos**
- **17 tipos** de export REST consolidados
- Distribuição:
  ```
  convenio_estadual                18.900
  licitacao                        12.903
  catalogo_item                    11.910
  fornecedor_estado                10.816
  contrato_publico                  9.348
  preco_registrado                  1.813
  viagem_diaria                       479
  dispensa_inexigibilidade            103
  dump_remuneracao_mensal             168
  dump_remuneracao_financeira         168
  dump_despesa_anual                   23
  dump_receita_anual                   23
  dump_licitacao_anual                 20
  dump_contrato_anual                  20
  dump_convenio_anual                  20
  dump_viagem_anual                    15
  dump_dispensa_anual                  11
  dump_despesa_credor                  17
  dump_despesa_rp                      17
  dump_dispensa_covid                   2
  dump_remuneracao_funcional            1 (REMUNERACAO_RH snapshot)
  dump_servidores_relacao               1
  dump_fornecedores_geral               1
  dump_estoque_suprimentos              1
  dump_precos_registrados               1
  dump_catalogo_itens                   1
  inventario_pte_subitem              101 (todos sub-itens mapeados)
  ```

### Disco
- **`/opt/digdig/data/pte_bd/`** = **3.7 GB** em 20 buckets
- `/dev/sda1` total: 22 GB usado / 171 GB livre (após prune docker cache)

### URLs descobertas (`transparencia.download.pr.gov.br/exportacao/`)

Endpoint REST público sem autenticação:
```
https://www.transparencia.download.pr.gov.br/exportacao/{TIPO}/{TIPO}-{ANO}[-{MM}|_CSV].zip
```

| Tipo | Modo | Range | Coletado |
|------|------|-------|----------|
| CONVENIOS | anual | 2007-2026 | ✓ todos |
| CONTRATOS | anual | 2007-2026 | ✓ todos (alguns 2025 com erro transient) |
| LICITACOES | anual | 2007-2026 | ✓ todos |
| RECEITAS | anual | 2002-2024 | ✓ todos |
| DESPESAS | anual | 2002-2024 | ✓ todos |
| VIAGENS | anual | 2012-2026 | ✓ todos |
| DESPESA_CREDOR | anual | 2002-2018 | ✓ todos (mais recente 2002 ~30MB; 2018 ~108MB) |
| DESPESA_RP | anual | 2002-2018 | ✓ todos |
| DISPENSAS_INEXIGIBILIDADE | anual | 2016-2026 | ✓ todos |
| DISPENSAS_INEXIGIBILIDADE_COVID | anual_csv | 2020-2021 | ✓ todos |
| REMUNERACAO | mensal | 2012-2026 (168 arquivos) | ✓ todos |
| REMUNERACAO_RH | snapshot | atual | ✓ 30 MB |
| RELACAO_SERVIDORES | snapshot | atual | ✓ 3 MB |
| FORNECEDORES | snapshot | atual | ✓ 13 MB |
| ESTOQUE_SUPRIMENTOS | snapshot | atual | ✓ 8.5 MB |
| PRECOS_REGISTRADOS | snapshot | atual | ✓ 2.3 MB |
| CATALOGO_ITENS | snapshot | atual | ✓ 12 MB |

---

## 🔴 PENDENTE — Para retomar quando tiver storage adequado

### 1. Bens Móveis (8/177) — botão `parent_form:lnkDownloadBD`
- Existe mas exige seleção de Órgão obrigatória
- Estratégia: Playwright iterar 50+ órgãos, baixar 1 ZIP por órgão (~5-30 MB cada)
- Volume estimado: **2-15 GB** total
- Script: criar `scrape_bens_moveis.py` baseado em scrape_pte.py + Playwright

### 2. Sistemas externos (10 sistemas, complexidade variada)

Documentação completa em [docs/sistemas-externos.md](sistemas-externos.md).

#### 🟢 FÁCIL — HTML estático JSP
| Sistema | URL | Estimativa |
|---------|-----|-----------|
| **Portal v4 Repasses Municípios** | `www4.pr.gov.br/Gestao/portaldatransparencia/repasses/index.jsp` | 28 anos × 399 municípios × {anual,mensal,semanal}. Volume: **~5 GB** |
| **Portal v4 Adiantamentos** | `www4.pr.gov.br/Gestao/portaldatransparencia/adiantamentos/adiantamentos.jsp` | 12 anos. Volume: **~500 MB** |
| **SISTAG Repasses Sociais** | `sistag.social.pr.gov.br/sis/publico/repasses-geral` | 1 form com 4 selects. Volume: **~200 MB** |
| **SEED Convênios** | `educacao.pr.gov.br/Convenios` | 2 forms. Volume: **~100 MB** |
| **RPV Requisições** | `rpv.fazenda.pr.gov.br/prpv/publico/transparencia` | sem forms detectados (precisa Playwright). Volume: **~500 MB** |
| **Recolhimento Diário** | `recdiario.fazenda.pr.gov.br/recdiario/index` | 4 tabelas, sem AJAX detectado. Volume: **~1 GB** |

**Total fácil: ~7 GB**

#### 🟡 MÉDIO — APIs específicas
| Sistema | URL | API |
|---------|-----|-----|
| **PowerBI Emendas PIX** | `app.powerbi.com/view?r=...` | API Embed: `wabi-{cluster}.analysis.windows.net/public/reports/...` |
| **PowerBI SEFA** | `app.powerbi.com/view?r=...` | idem |
| **SERPRO Transferências** | `dd-publico.serpro.gov.br/extensions/...` | endpoint via Qlik Sense Engine |

**Estratégia:** decodar token `r=eyJrIjoi...` (base64 JSON com {k,t,c}) e chamar API export. Vol: **~2-5 GB**

#### 🔴 DIFÍCIL — Adobe Flex / Qlik proprietários
| Sistema | URL | Tecnologia |
|---------|-----|-----------|
| **FlexPortal Receitas** | `transparencia.pr.gov.br/FlexPortal/#!Receitas` | Adobe Flex (AMF) |
| **FlexPortal Despesas** | `transparencia.pr.gov.br/FlexPortal/#!Despesas` | Adobe Flex |
| **FlexPortal Fornecedores** | `transparencia.pr.gov.br/FlexPortal/#!Fornecedores` | Adobe Flex |
| **SIAFIC Consulta1 (Dispêndios)** | `siafic.pr.gov.br/FlexPortal/#!Consulta1` | Adobe Flex |
| **SIAFIC ISSPAGOS** | `siafic.pr.gov.br/FlexPortal/#!ISSPAGOS` | Adobe Flex |
| **Qlik PTE (legacy)** | `bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=PTE.qvw` | QlikView |
| **Qlik Realizações de Governo** | `bi.pr.gov.br/.../document=RealizacoesdeGoverno.qvw` | QlikView |
| **Qlik Sense Terceirizados** | `bi2.pr.gov.br/single/?appid=d9284dcd-...` | Qlik Sense Engine API |
| **Qlik Sense CGEOuv+** | `bi2.pr.gov.br/single/?appid=3e7bea38-...` | Qlik Sense |

**Estratégia:**
- Flex → reverse-engineering AMF binary (BlazeDS endpoint)
- Qlik → Engine API via WebSocket (`wss://bi2.pr.gov.br/...`) ou export sheet
- Volume estimado: **5-30 GB** dependendo de quantos dashboards ativarmos

### 3. Fontes paralelas (fora do PTE) — alto valor investigativo

| Fonte | URL | Volume | Bloqueio |
|-------|-----|--------|----------|
| **DOE Executivo PR** | `documentos.dioe.pr.gov.br/dioe/consultaPublicaPDF.do` | 5.431 edições × 5 MB = **~27 GB** | Captcha-gated (sessão semi-manual ou 2captcha pago ~$10) |
| **Legislação Estadual PR** | `legislacao.pr.gov.br` | ~50.000 leis/decretos × 500KB = **~25 GB** | Struts (verificar captcha) |
| **ALEP** Assembleia Legislativa | `alep.pr.gov.br` | leis, projetos, votações, deputados | sem auth |
| **TCE-PR** julgamentos | `www1.tce.pr.gov.br` | acórdãos contra órgãos estaduais | sem auth |
| **TSE/TRE-PR** | `divulgacandcontas.tse.jus.br` | doações de campanha | API gratuita |
| **CNPJ.ws / RFB** | `cnpj.ws/api/cnpj/{cnpj}` | QSA dos ~60k fornecedores | API gratuita 3 req/min |
| **Wayback Machine** | `web.archive.org` | snapshots históricos do PR.gov | API gratuita |

**Total estimado: 50+ GB** sem contar Wayback.

---

## 🛠️ Scripts prontos (no repo)

Localização: `/opt/digdig/backend/scripts/`

| Script | Função | Status |
|--------|--------|--------|
| `scrape_pte_export.py` | Baixa qualquer tipo via /exportacao/ REST. Suporta `--tipo`, `--ano`, `--anos AAAA-AAAA`, `--todos`, `--todos-tipos` | ✅ usado |
| `scrape_pte.py` | Paginate metadata de DataTables PrimeFaces (legacy) | ✅ usado |
| `scrape_pte_bd.py` | Download via dialog AJAX (Remuneração) — legado, REST é melhor | legado |
| `scrape_pte_viagens.py` | Paginate viagens linha-a-linha (lento) — legado, REST é melhor | legado |
| `descobrir_downloads.py` | Auto-discovery de URLs via Playwright | ✅ |
| `mapear_subitens_pte.py` | Mapeia 101 sub-itens lazy-loaded com Playwright | ✅ |
| `inspect_externos.py` | Inspeção dos 18 sistemas externos | ✅ |
| `discover_pte_playwright.py` | Discovery do menu PTE via Playwright | ✅ |
| `discover_pte.py` | Discovery via httpx (sem JS) | ✅ |

**Como retomar uma coleta:**
```bash
cd /opt/digdig/backend
.venv/bin/python scripts/scrape_pte_export.py --todos-tipos --todos
# vai pular tudo que já está em disco (SKIP), só baixa novos
```

---

## 📁 Estrutura no disco

```
/opt/digdig/data/pte_bd/
├── export_convenios/        2007-2026.zip (20 ZIPs, 9.8 MB)
├── export_contratos/        2007-2026.zip (20 ZIPs, 11 MB)
├── export_licitacoes/       2007-2026.zip (20 ZIPs, 43 MB)
├── export_receitas/         2002-2024.zip (23 ZIPs, 20 MB)
├── export_despesas/         2002-2024.zip (23 ZIPs, 261 MB)
├── export_viagens/          2012-2026.zip (15 ZIPs, 258 MB)
├── export_remuneracao/      2012-01..2026-05.zip (168 ZIPs, 1.1 GB) ← MENSAL
├── export_remuneracao_rh/   snapshot.zip (30 MB)
├── export_relacao_servidores/ snapshot.zip (3 MB)
├── export_fornecedores/     snapshot.zip (13 MB)
├── export_estoque_suprimentos/ snapshot.zip (8.5 MB)
├── export_precos_registrados/  snapshot.zip (2.3 MB)
├── export_catalogo_itens/      snapshot.zip (12 MB)
├── export_dispensas_inexigibilidade/ 2016-2026.zip (11 ZIPs, 18 MB)
├── export_dispensas_inexigibilidade_covid/ 2020-2021_CSV.zip (2 ZIPs, 444 KB)
├── export_despesa_credor/   2002-2018.zip (17 ZIPs, ~700 MB)
├── export_despesa_rp/       2002-2018.zip (17 ZIPs, ~250 MB)
├── remuneracao/             [DUPLICATA do export_remuneracao — pode deletar pra liberar 1.1 GB]
├── consultacredor/          (vazio)
└── viagens/                 (vazio)
```

---

## 💾 Decisão de storage pendente

**Opções analisadas em** [docs/storage-strategy.md](storage-strategy.md):

1. **Cloudflare R2** — $0.015/GB/mês + egress grátis. Recomendado pra escala.
2. **Backblaze B2** — $0.005/GB/mês. Mais barato.
3. **Wasabi** — $0.0049/GB/mês. Sem egress.
4. **VPS dedicada de coleta** — Hostinger KVM 2 com 200 GB ~ R$25/mês. Inclui CPU pra rodar scrapers.
5. **Supabase Storage** — limites baixos no plano atual.

**Recomendação atual:** VPS separada (R$25/mês) faz mais sentido — combina storage + CPU pra rodar scrapers contínuos. R2 fica pra "arquivamento eterno" depois que o conteúdo for processado.

---

## ⏭️ Próximos passos (ordem sugerida)

1. **Decidir storage**: R2 ou VPS dedicada
2. **Migrar `/opt/digdig/data/pte_bd/` pra storage externo**
3. **Atacar fáceis primeiro:**
   - Portal v4 Repasses Municípios (1999-2026)
   - Portal v4 Adiantamentos
   - SISTAG, SEED Convênios, RPV, Recolhimento Diário
4. **PowerBI** (decode token + API REST)
5. **Qlik Sense** (Engine API)
6. **DOE com captcha** (sessão semi-manual ou 2captcha)
7. **Legislação Estadual** (~50k leis)
8. **CNPJ.ws cross-check** dos fornecedores (mata laranjas)
9. **Adobe Flex** (FlexPortal/SIAFIC) — pior caso, deixar pro fim
