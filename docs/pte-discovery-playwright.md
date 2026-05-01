# PTE Discovery — Playwright (render JS completo)

Total: **128** sub-itens.
- Com DataTable após render: **12**
- Com botão Download do BD: **20**
- Com iframe (Qlik/BI/etc): **85**

## DataTables (alvos do scraper)

| path | título | datatable | download | colunas | anos |
|---|---|---|---|---|---|
| `4/127` | CONVÊNIOS DO GOVERNO ESTADUAL | `formPesquisa:convenios` | ✓ | Concedente · Número · Objeto · Convenente | 2007..2036 (30) |
| `5/114` | CONTRATOS | `formPesquisa:contrato` | ✓ | Órgão · Nº Ano · Objeto · Fornecedor | 1285..9999 (31) |
| `5/115` | LICITAÇÕES | `formPesquisa:licitacoes` | ✓ | Modalidade · Resumo
do Edital · Órgão
Responsável · Órgãos
Participantes | 2007..7344 (26) |
| `5/116` | SITUAÇÃO FORNECEDORES | `formPesquisa:fornecedores` | ✓ | Razão Social/Nome Fantasia/Nome · CNPJ/CPF · Município · Linha de Fornecimento | 1001..9902 (324) |
| `5/117` | PREÇOS REGISTRADOS | `formPesquisa:precos` | ✓ | Descrição do Item · Valor Unitário · Órgão Gerenciador · Nº Licitação | 2768..5771 (3) |
| `5/204` | DISPENSAS E INEXIGIBILIDADE | `formPesquisa:dispensas` | ✓ | Modalidade · Natureza · Número/Ano · Órgão
Responsável | 1285..7344 (21) |
| `5/210` | LICITAÇÕES | `formPesquisa:licitacoes` | ✓ | Modalidade · Resumo
do Edital · Órgão
Responsável · Órgãos
Participantes | 2007..7344 (26) |
| `5/226` | AQUISIÇÕES POR DISPENSA DE LICITAÇÃO - C | `formPesquisa:dispensas` | ✓ | Modalidade · Natureza · Número/Ano · Órgão
Responsável | 1285..7344 (21) |
| `5/297` | CATÁLOGO DE ITENS | `formPesquisa:itens` | ✓ | Nº Item · Descrição do Item · Classe · Tipo | — |
| `6/1` | REMUNERAÇÃO | `formRemuneracoes:dataTableServidores` | ✓ | Nome · Instituição · Cargo · Município | 2012..2026 (15) |
| `6/2` | VIAGENS | `formViagens:dataTableServidores` | ✓ | Nome do Viajante · Instituição Solicitante · Ano: 2026Início: JANEIROTérmino: ABRIL | 2000..2026 (27) |
| `10/56` | Estado do Paraná | `initial:j_idt358, initial:j_idt369` |  |  | 1000..2900 (257) |

## Iframes (Qlik BI / outros)

| path | título | iframe |
|---|---|---|
| `2/25` | PLANEJA PARANÁ
PLANEJA PARANÁ |  |
| `2/62` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/63` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/64` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/67` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/68` | SECRETARIA DO PLANEJAMENTO
SECRETARIA DO | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/69` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/70` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/214` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/268` | SECRETARIA DO PLANEJAMENTO
SECRETARIA DO |  |
| `2/326` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `2/327` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/27` | RECEITA ARRECADADA | https://recdiario.fazenda.pr.gov.br/recdiario/index |
| `3/242` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/243` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/247` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/248` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/250` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/251` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/253` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/261` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/262` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/265` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/266` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/267` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/285` | RECEITA ORÇAMENTÁRIA – A PARTIR DE 2024 | https://www.transparencia.pr.gov.br/FlexPortal/#!Receitas |
| `3/289` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/304` | EMENDAS PARLAMENTARES PIX | https://app.powerbi.com/view?r=eyJrIjoiN2UzN2UyMTQtODgxMC00N2NiLWE1NzQtZjFkYmZkZ |
| `3/309` | EMENDAS PARLAMENTARES | https://dd-publico.serpro.gov.br/extensions/transferencias-discricionarias-e-leg |
| `3/310` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `3/316` | FOMENTO PARANÁ |  |
| `4/50` | ADIANTAMENTOS | https://www4.pr.gov.br/Gestao/portaldatransparencia/adiantamentos/adiantamentos. |
| `4/96` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/99` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/100` | REPASSES DO GOVERNO ESTADUAL AOS MUNICÍP | https://www4.pr.gov.br/Gestao/portaldatransparencia/repasses/index.jsp |
| `4/101` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/102` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/104` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/191` | REQUISIÇÃO DE PEQUENO VALOR | https://rpv.fazenda.pr.gov.br/prpv/publico/transparencia |
| `4/254` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/255` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/256` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/284` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `4/287` | DESPESAS | https://www.transparencia.pr.gov.br/FlexPortal/#!Despesas |
| `4/288` | FORNECEDORES | https://www.transparencia.pr.gov.br/FlexPortal/#!Fornecedores |
| `4/324` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://app.powerbi.com/view?r=eyJrIjoiN2E1YzRmN2EtOGMwMi00NDM0LWFhMWEtOWYzNzNjM |
| `4/325` | DISPÊNDIOS EXTRAORÇAMENTÁRIOS | https://www.siafic.pr.gov.br/FlexPortal/#!Consulta1 |
| `5/318` | CONTRATAÇÕES PÚBLICAS
CONTRATAÇÕES PÚBLI |  |
| `6/34` | RECURSOS HUMANOS
RECURSOS HUMANOS | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `6/35` | SECRETARIA DA ADMINISTRAÇÃO E DA PREVIDÊ | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `6/271` | RELAÇÃO DE TERCEIRIZADOS | https://bi2.pr.gov.br/single/?appid=d9284dcd-1ab8-4044-8fee-28393520e405&sheet=e |
| `6/308` | RECURSOS HUMANOS
RECURSOS HUMANOS | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `7/36` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `7/53` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `7/54` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://www.siafic.pr.gov.br/FlexPortal/#!ISSPAGOS |
| `7/257` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `7/258` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/17` | CASA CIVIL
CASA CIVIL | https://www.gcau-consulta.casacivil.pr.gov.br/gcau_internet/pesquisa |
| `8/20` | LEGISLAÇÃO ESTADUAL | https://www.legislacao.pr.gov.br/legislacao/entradaSite.do?action=iniciarProcess |
| `8/38` | ? | about:blank |
| `8/46` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/113` | ? | http://bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=PTE.qvw&host=QVS%40sparana005 |
| `8/130` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/211` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/259` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/291` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/293` | PROGRAMA ESTADUAL DE DESBUROCRATIZAÇÃO | https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto |
| `8/294` | REGULAMENTO DA PRESTAÇÃO DIGITAL DE SERV | https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto |
| `8/295` | CGEOUV+ | https://bi2.pr.gov.br/single/?appid=3e7bea38-ccca-4d8f-9853-5484f1630aad&sheet=4 |
| `8/300` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/307` | CGE-PR - CONTROLADORIA GERAL DO ESTADO D | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/317` | INSTITUTO ÁGUA E TERRA | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/321` | JUNTA COMERCIAL DO PARANÁ | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/322` | JUNTA COMERCIAL DO PARANÁ | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `8/323` | AGÊNCIA DE ASSUNTOS METROPOLITANOS DO PA | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `10/48` | GOVERNO DO ESTADO DO PARANÁ |  |
| `10/140` | DESENVOLVIMENTO SOCIAL | https://www.sistag.social.pr.gov.br/sis/publico/repasses-geral |
| `10/315` | PARANÁ PARCERIAS | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `10/319` | SECRETARIA DA EDUCAÇÃO
SECRETARIA DA EDU | https://www.educacao.pr.gov.br/Convenios?windowId=988 |
| `11/61` | ? | http://bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=RealizacoesdeGoverno.qvw&host |
| `11/208` | Transparência de Obras, Ações e Projetos |  |
| `11/209` | Projetos Autorizados Para Licitação |  |
| `11/305` | DEPARTAMENTO DE <BR />ESTRADAS DE RODAGE |  |
| `12/222` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |
| `12/290` | SECRETARIA DA FAZENDA
SECRETARIA DA FAZE | https://static.addtoany.com/menu/sm.25.html#type=core&event=load |

## Sub-itens com Download do BD (mas sem datatable)

- `3/3` — CONSULTA DETALHADA DA RECEITA (ids: ['formPesquisaReceita:lnkDownloadBD'])
- `3/57` — OUTRAS CONSULTAS DA RECEITA (ids: ['formPesquisaReceitaOrcamentaria:lnkDownloadBD'])
- `4/126` — TOTAL DESEMBOLSADO (ids: ['formPesquisaTotalDesembolsado:lnkDownloadBD'])
- `4/22` — CONSULTA DETALHADA DA DESPESA (ids: ['formPesquisaDespesa:lnkDownloadBD'])
- `4/28` — CONSULTA POR CREDOR (ids: ['formPesquisa:lnkDownloadBD'])
- `4/77` — OUTRAS CONSULTAS DA DESPESA (ids: ['formPesquisaPreFormatada:lnkDownloadBD'])
- `5/213` — ESTOQUE DE SUPRIMENTOS (ids: ['parent_form:lnkDownloadBD'])
- `6/131` — RELAÇÃO DE SERVIDORES (ids: ['formRelacaoServidores:lnkDownloadBD'])
- `8/177` — BENS MÓVEIS (ids: ['parent_form:lnkDownloadBD'])
