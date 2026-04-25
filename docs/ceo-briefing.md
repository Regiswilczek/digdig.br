# Dig Dig — Briefing Executivo para o CEO
### Documento de Transferência de Conhecimento e Direção Estratégica

**Versão:** 1.0 — Abril de 2026  
**Preparado por:** Regis Alessander Wilczek — Fundador  
**Destinatário:** CEO contratado  
**Classificação:** Confidencial — uso interno exclusivo

---

> Este documento foi escrito para que você, ao assumir a operação do Dig Dig, tenha acesso a tudo que está na cabeça do fundador — a origem real do produto, o que foi construído, o que ainda está por construir, como a empresa ganha dinheiro, onde estão os riscos, o que não pode ser errado e quais são as apostas estratégicas de longo prazo. Leia na íntegra antes de tomar qualquer decisão.

---

## Sumário

1. [A Origem — Por Que o Dig Dig Existe](#1-a-origem)
2. [O Produto — O Que É e O Que Não É](#2-o-produto)
3. [O Mercado — Tamanho, Urgência e Momento](#3-o-mercado)
4. [Arquitetura Técnica — Como Funciona por Dentro](#4-arquitetura-técnica)
5. [Estado Atual — O Que Foi Construído](#5-estado-atual)
6. [Modelo de Negócio — Como a Empresa Ganha Dinheiro](#6-modelo-de-negócio)
7. [Go-to-Market — Como Chegamos ao Cliente](#7-go-to-market)
8. [Personas — Quem Paga e Por Quê](#8-personas)
9. [Projeções e Unit Economics](#9-projeções-e-unit-economics)
10. [Riscos Críticos e Mitigações](#10-riscos-críticos)
11. [Roadmap de Produto](#11-roadmap-de-produto)
12. [Cultura e Princípios Inegociáveis](#12-cultura-e-princípios-inegociáveis)
13. [Operação Dia a Dia](#13-operação-dia-a-dia)
14. [O Que o CEO Precisa Fazer Primeiro](#14-primeiras-prioridades-do-ceo)
15. [Referências Técnicas e Documentação Interna](#15-referências)

---

## 1. A Origem

### Por que o Dig Dig existe

O Dig Dig não começou como ideia de produto. Começou como dor real de trabalho.

Regis Wilczek passou anos como Assessor Parlamentar na Câmara Municipal de Curitiba fazendo investigações de transparência de forma manual — baixando PDFs de portais públicos, lendo ato por ato, cruzando nomes, datas e valores em planilhas. Foi nesse trabalho que descobriu o escândalo da água San Pelegrino: contratos superfaturados para fornecimento de água mineral em eventos da câmara, escondidos dentro de dezenas de atos administrativos rotineiros que ninguém lia. O escândalo virou notícia, mas o processo foi lento, trabalhoso e dependeu de horas de leitura que nenhum cidadão comum faria.

Depois, Regis foi trabalhar no próprio CAU/PR — o Conselho de Arquitetura e Urbanismo do Paraná — como Chefe de Gabinete e depois Assessor Especial. Ele voltou a fazer o mesmo trabalho manual de análise de atos, agora por dentro de uma autarquia federal. Viu de perto como as irregularidades acontecem: não em escândalos dramáticos, mas em portarias numeradas burocraticamente que ninguém lê, comissões compostas por pessoas conectadas politicamente, prazos violados reiteradamente sem consequência, nomeações que seguem padrões de concentração de poder mas que exigem leitura de décadas de documentos para serem percebidas como padrão.

A pergunta que ficou foi simples: **por que isso ainda é feito à mão?**

Regis não é arquiteto, portanto não pode disputar eleições no CAU/PR. Mas tinha o acervo completo na cabeça, entendia a estrutura de documentos e sabia que a inteligência artificial havia atingido o ponto em que era possível automatizar o que ele fazia manualmente. Em 2025, ele construiu o Dig Dig.

### O que isso significa para você como CEO

A origem importa porque ela define tudo que não pode ser negociado: **o produto precisa ser honesto**. Não é ativismo, não é ferramenta de campanha, não é arma política. É infraestrutura de informação. A linguagem é sempre de indícios, nunca de acusações. O dado vem do documento público, a análise é da IA, a conclusão jurídica é do advogado ou do jornalista. Esse posicionamento é o que mantém a empresa politicamente neutra, juridicamente defensável e comercialmente viável para qualquer espectro político que queira fiscalizar o poder.

Se o Dig Dig virar ferramenta de partido ou facção, ele perde a credibilidade que é seu único ativo real. Tudo que você fizer deve preservar a neutralidade declarada com a utilidade real.

---

## 2. O Produto

### Definição precisa

O Dig Dig é um motor de coleta, análise e compreensão de atos administrativos públicos brasileiros, processados com inteligência artificial para que qualquer pessoa os entenda sem precisar ser advogado.

Mais especificamente: o sistema baixa automaticamente os PDFs publicados por órgãos públicos em seus sites oficiais, extrai o texto completo de cada documento, analisa o conteúdo com modelos de linguagem da Anthropic (Claude), classifica o nível de risco de cada ato e apresenta os resultados de forma estruturada — via dashboard web, chat conversacional e API.

### O que a IA faz

O pipeline de análise opera em dois estágios:

**Estágio 1 — Triagem com Claude Haiku 4.5:** Cada ato administrativo é analisado individualmente. O modelo lê o texto completo do documento e o regimento interno ou lei orgânica do órgão (carregado como contexto cacheado), e classifica o ato em quatro níveis de alerta:

- **Verde:** conforme, sem irregularidades aparentes
- **Amarelo:** suspeito, requer atenção — pode ser violação menor, linguagem ambígua ou padrão que exige contexto
- **Laranja:** indício moderado-grave — violação identificável, recomenda-se aprofundamento
- **Vermelho:** irregularidade crítica — violação direta ao regimento, indício de abuso ou crime administrativo

O Haiku também extrai entidades: pessoas mencionadas, cargos, artigos citados, datas, valores.

**Estágio 2 — Análise profunda com Claude Sonnet 4.6:** Os atos classificados como laranja e vermelho são aprofundados pelo Sonnet. O modelo recebe contexto ampliado: o texto do ato, os atos relacionados, o histórico de aparições das pessoas envolvidas e o regimento completo. O Sonnet produz:

- Análise profunda em linguagem técnica acessível
- Lista de irregularidades com referência ao artigo violado
- Identificação e contextualização das pessoas envolvidas
- Recomendação de ação (denúncia, recurso, pedido de informação via LAI)
- Linha do tempo de eventos relacionados

**Estágio 3 — Síntese de padrões:** Após uma rodada completa, o Sonnet analisa o conjunto de resultados e identifica padrões transversais — comportamentos recorrentes que aparecem em múltiplos atos e não são visíveis se cada documento for analisado isoladamente. Exemplos: uso sistemático de processos disciplinares contra opositores políticos, concentração de funções comissionadas em grupo restrito, nomeações que seguem laços familiares ao longo do tempo.

### O que a IA não faz — e nunca deve fazer

A IA não afirma crimes. A IA não acusa pessoas. A IA não faz julgamentos morais definitivos. Toda a linguagem de análise é de probabilidade e indício: "padrão irregular", "suspeita de conflito de interesse", "recomenda-se verificação", "indício de".

Isso não é fraqueza do produto — é sua proteção jurídica e sua credibilidade. Um produto que afirma crimes é um produto que pode ser processado por difamação ou calúnia. Um produto que aponta indícios com base em documentos públicos e cita os artigos potencialmente violados é jornalismo de dados — constitucionalmente protegido, replicável e auditável.

A conclusão jurídica e a responsabilidade pela interpretação são sempre do usuário final: advogado, jornalista, cidadão. O Dig Dig entrega o mapa. O usuário decide o caminho.

### O que o dashboard mostra

O painel autenticado (que acabou de ser construído e está em produção) inclui:

- **Visão Geral:** 4 cards de estatísticas (total de atos, por nível de alerta, progresso da análise), gráfico de distribuição por nível ao longo do tempo
- **Portarias:** tabela filtrável e paginável com todos os atos por nível, data, número, ementa e score de risco. Link para o PDF original no site do órgão.
- **Deliberações:** mesma estrutura, para deliberações plenárias e ad referendum
- **Denúncias:** grid com os atos de nível laranja e vermelho, exibindo resumo executivo e botão para ficha completa
- **Pipeline:** visualização ao vivo do estado da rodada de análise em andamento (via Supabase Realtime)
- **Relatório:** acesso ao relatório executivo da última rodada

A ficha completa de cada ato (acessível a qualquer usuário autenticado no básico, com análise Sonnet desbloqueada para planos Investigador+) mostra:
- Resumo executivo
- Análise profunda (gated)
- Lista de irregularidades com artigo violado
- Pessoas identificadas (gated)
- Recomendação de ação (gated)
- Link para PDF original e para o regimento interno

### O chat conversacional (ainda não lançado)

O chat é o diferencial de experiência do produto. Em vez de filtrar tabelas, o usuário pergunta em linguagem natural: "Existe padrão de nomeações para comissões feitas por pessoas com o mesmo sobrenome?", "Quem mais aparece em atos de alto risco desde 2023?", "O que aconteceu com o processo contra o conselheiro X?"

O sistema responde usando RAG (Retrieval-Augmented Generation) — não re-processa PDFs, mas consulta o banco já estruturado de atos, análises, irregularidades e pessoas. A resposta é rápida (~2–5 segundos) e custosa por pergunta (~$0,07 USD), o que justifica a limitação por plano.

---

## 3. O Mercado

### O que existe hoje — e por que é insuficiente

O Brasil tem um arcabouço legal robusto de transparência pública: Lei de Acesso à Informação (LAI), Diário Oficial digital, portais de transparência por nível federativo, obrigação de publicação de atos em sites dos próprios órgãos. **A informação é pública por lei. O problema é que ela é ilegível na prática.**

Os PDFs dos sites dos conselhos e autarquias são escaneados, mal formatados ou em linguagem técnica que pressupõe formação jurídica. Os portais de busca são buscas textuais simples sem qualquer análise. Ninguém cruza portarias com o regimento interno. Ninguém rastreia as mesmas pessoas ao longo de anos de documentos. Ninguém gera fichas de denúncia prontas.

As alternativas hoje:

| Alternativa | Limitação fundamental |
|---|---|
| Diário Oficial (busca textual) | Retorna documentos brutos, sem análise, sem contexto |
| Portais dos próprios órgãos | Feitos para cumprir a lei, não para ser usados por cidadãos |
| Jornalistas investigativos | Caros, lentos, dependem de pauta editorial, não cobrem órgãos menores |
| Advogados e auditores | R$300–600/hora, inacessível para cidadão médio, não escalam |
| Tribunais de Contas | Cobrem contratos e licitações, não atos administrativos internos |

Não existe hoje no Brasil nenhuma ferramenta que:
1. Colete automaticamente atos de órgãos públicos em escala nacional
2. Analise com IA separando irregularidades legais de morais
3. Construa o grafo de relacionamentos entre pessoas, cargos e atos ao longo do tempo
4. Gere fichas de denúncia prontas para uso em imprensa, advocacia e transparência
5. Faça tudo isso com custo previsível e acessível

### Tamanho do mercado

O Brasil tem aproximadamente:

- **5.568 municípios** — cada um com câmara municipal, secretarias, fundações e autarquias
- **36 Conselhos Federais de fiscalização profissional** (CRM, CREA, CFC, OAB, CAU federal, etc.)
- **36 × 27 estados = ~972 Conselhos Regionais** correlatos
- **27 Assembleias Legislativas estaduais**
- **Dezenas de tribunais, autarquias e agências reguladoras federais**

Estima-se conservadoramente que existem entre 50.000 e 100.000 fontes de publicação de atos administrativos no Brasil, publicando coletivamente milhões de documentos por ano. O volume de organizações que se beneficiariam de acesso a esse banco de dados analisado é vastíssimo: escritórios de advocacia, veículos de imprensa, assessorias políticas, ONGs de transparência, partidos políticos, candidatos a cargos eletivos, pesquisadores.

O Dig Dig não precisa cobrir todos para ser um negócio muito grande. Ele precisa cobrir os que importam para quem paga. E quem paga — jornalistas, advogados, partidos, assessorias — tem interesse em órgãos específicos de alto impacto político.

### O momento

2026 é ano eleitoral no Brasil — municipal no segundo semestre. Conselhos profissionais como CAU, CREA e CRM têm eleições internas. A demanda por análise de gestão de órgãos públicos está no pico. Não por acaso o produto foi iniciado agora.

Mas o momento vai além do ciclo eleitoral. A combinação de três fatores torna 2026 o momento certo para um produto como o Dig Dig:

1. **Modelos de linguagem chegaram ao custo operacional viável:** analisar um ato completo com Haiku custa ~$0,012. Isso era impossível a $1,00/ato.
2. **A Lei de Acesso à Informação completou 15 anos** — os portais estão mais estruturados, os PDFs mais digitalizados, a pressão social por transparência maior.
3. **Há uma geração de jornalistas de dados no Brasil** que precisa de ferramentas mas não tem orçamento para construí-las.

---

## 4. Arquitetura Técnica

### Visão macro

```
Frontend (React/Vite — Lovable — produção)
    ↓ API REST HTTPS
Backend (FastAPI — Railway — produção)
    ↓ Jobs assíncronos via Redis
Workers Celery (Railway)
    ├── Scraper: baixa PDFs → extrai texto → PostgreSQL
    │   (roda localmente — Railway bloqueado pelo CAU/PR)
    ├── Haiku: analisa todos os atos → classifica nível
    ├── Sonnet: aprofunda laranja/vermelho → fichas de denúncia
    └── Sonnet: chat conversacional via RAG

Banco: PostgreSQL (Supabase) + Storage (PDFs)
Auth: Supabase Auth (JWT, validado no backend via JWKS)
Cache: Anthropic prompt caching — regimento 68k tokens, TTL 5min
```

### Stack e por que foi escolhido

**Backend — FastAPI (Python 3.12)**
FastAPI foi escolhido sobre Django REST porque o sistema é I/O intensivo: baixa PDFs, chama APIs externas, processa filas. FastAPI tem async nativo, validação Pydantic 2.x embutida e performance comparável a frameworks Go para esse caso de uso. Não há nada de CPU intensivo no backend — toda computação pesada é delegada à API da Anthropic.

**Fila de Jobs — Celery + Redis**
Jobs de scraping e análise levam de segundos a horas. `FastAPI BackgroundTasks` não é adequado para isso — não tem retry, não tem monitoramento, não sobrevive a restart do processo. Celery com Redis como broker é o padrão da indústria para esse perfil. Em produção no Railway, o backend e os workers rodam como processos separados no mesmo projeto.

**Banco de dados — PostgreSQL via Supabase**
PostgreSQL foi a escolha natural para multi-tenancy com RLS (Row Level Security). O Supabase agrega Auth, Storage, Realtime e RLS numa plataforma gerenciada — poupa semanas de implementação. O banco tem 29 tabelas. A estrutura completa está documentada em `docs/02-banco-de-dados.md`.

**Frontend — React + Vite via Lovable**
O frontend é gerenciado pela Lovable — uma plataforma que hospeda o deploy, integra com o repositório GitHub e permite edição visual e por IA. O repositório é `github.com/Regiswilczek/dig-dig`. Toda mudança no branch `main` dispara rebuild automático no Lovable. O roteamento usa TanStack Router com rotas baseadas em arquivos — cada arquivo em `src/routes/` é uma rota.

**IA — Anthropic Claude**
- **Haiku 4.5** (`claude-haiku-4-5-20251001`): triagem de todos os atos. Rápido, barato (~$0,012/ato com caching). Classifica nível de alerta, extrai entidades, escreve resumo executivo.
- **Sonnet 4.6** (`claude-sonnet-4-6`): análise profunda de laranja e vermelho, chat conversacional. Mais caro, mais capaz. Usado só onde é necessário.
- **Prompt caching:** o regimento interno do órgão (~68.000 tokens) é carregado como cache ephemeral com TTL de 5 minutos. Isso reduz o custo de análise em ~60-70% porque o regimento é enviado uma vez e reutilizado nas N análises seguintes da janela de cache. Esta é uma decisão arquitetural crítica — nunca remover o `cache_control` dos prompts.

**Billing — Mercado Pago**
Originalmente planejado para Stripe, migrado para Mercado Pago porque o público-alvo é brasileiro e o Mercado Pago suporta PIX nativo, boleto e cartões de crédito parcelados — que são os métodos de pagamento dominantes no Brasil. A integração ainda não está live, mas o SDK está configurado no backend.

### A restrição de IP do scraper

O servidor do CAU/PR bloqueia requisições originadas de IPs de data centers americanos. O Railway roda nos EUA — qualquer request de scraping a partir do Railway recebe 403. Isso é uma limitação operacional permanente que exige que o script de scraping (`backend/scripts/scrape_local.py`) rode na máquina do Regis, em IP brasileiro, antes de subir os dados para o banco.

Quando o produto escalar para outros órgãos, será necessário avaliar: (a) proxy brasileiro, (b) VPS com IP brasileiro, ou (c) desenvolver um mecanismo de scraping distribuído. Para o CAU/PR especificamente, já existe um workaround estável.

### Multi-tenancy

O sistema foi projetado para múltiplos órgãos desde o início. Cada órgão é um "tenant" — tem seu próprio registro na tabela `tenants`, seu próprio `scraper_config` (URL do site, estrutura de paginação, seletor de links), e seus atos são separados por `tenant_id` em todas as tabelas.

O RLS (Row Level Security) do Supabase garante que um usuário autenticado só enxerga os dados dos tenants aos quais tem acesso. No backend, toda query verifica `tenant_id` antes de retornar resultados. Há uma camada dupla de proteção — RLS no banco e validação explícita no código.

---

## 5. Estado Atual

### O que está em produção hoje (abril/2026)

| Componente | Status |
|---|---|
| Backend FastAPI + Celery + Redis | ✅ em produção no Railway |
| 29 tabelas PostgreSQL (Supabase) com RLS | ✅ completo |
| Scraper de portarias do CAU/PR | ✅ 551 portarias coletadas |
| Pipeline Haiku (triagem) | 🔄 262/400 portarias (66%) |
| Painel autenticado (React + Lovable) | ✅ em produção — login, 6 abas, Realtime, ficha de ato com gating |
| White Papers Nº 01 e Nº 02 | ✅ publicados e indexáveis |
| Billing Mercado Pago | ✅ SDK configurado — integração live pendente |

**Pipeline de análise do CAU/PR:**
- 551 portarias coletadas (2017–2026)
- 400 portarias com texto nativo extraído e prontas para análise
- 151 portarias escaneadas (2018–2021) — na fila para OCR
- 595 deliberações existem como HTML-only — scraper específico ainda não construído
- Rodada Haiku em andamento: 262/400 portarias (~66%)
- Distribuição atual: 168 amarelo / 93 verde / 1 laranja / 0 vermelho
- Custo acumulado: ~$3,09 (média $0,0118/ato)

**Backend:**
- Endpoints do painel: `GET /painel/orgaos/{slug}/atos`, `GET /painel/orgaos/{slug}/atos/{id}`, `GET /painel/orgaos/{slug}/stats`, `GET /painel/orgaos/{slug}/rodadas`
- Guard de 4 camadas contra duplicatas de rodada: endpoint 409, idempotência na task, cancellation check, limite de $15/rodada
- Autenticação via JWKS (ES256/RS256) com fallback HS256

**Frontend:**
- Landing pública em `digdig.com.br` com stats ao vivo da API
- White Papers: `/whitepaper-01-extracao-caupr` e `/whitepaper-02-custo-e-controle`
- Painel autenticado: login Supabase Auth, sidebar de órgãos, 6 abas (Visão Geral, Portarias, Deliberações, Denúncias, Pipeline, Relatório), feed Realtime, ficha completa com gating por plano

### Sprint atual (o que está sendo desenvolvido agora)

| # | Item | Detalhe |
|---|---|---|
| 1 | Terminar rodada Haiku | 138 portarias pendentes — executar pipeline no Railway |
| 2 | Pipeline Sonnet | Análise profunda dos atos Laranja e Vermelho — custo ~$2–5 |
| 3 | Chat conversacional | RAG no banco, Sonnet responde em linguagem natural — endpoint + interface |
| 4 | Billing live | Webhook Mercado Pago → ativação de plano no banco — fluxo end-to-end |

---

## 6. Modelo de Negócio

### Estrutura de receita

O Dig Dig tem três fontes de receita distintas e complementares:

#### Fonte 1 — Assinaturas mensais recorrentes

| Plano | Preço | Chat/mês | Exportação | Para quem |
|---|---|---|---|---|
| Cidadão | R$0 | 5 perguntas | Nenhuma | Qualquer brasileiro — leitura e compreensão básica |
| Investigador | R$197/mês | 200 | PDF e HTML | Jornalistas, pesquisadores, fiscais políticos |
| Profissional | R$597/mês | 1.000 | CSV, JSON, PDF, HTML | Escritórios jurídicos, assessorias, ONGs |
| API & Dados | R$1.997/mês | via API | API REST + webhooks | Plataformas, veículos de imprensa, pesquisa acadêmica |

**Lógica do plano gratuito:** O Cidadão existe para volume, viralização e legitimidade política. Se o produto só fosse pago, ele seria atacado como ferramenta elitista. Com o plano gratuito, qualquer arquiteto do Paraná, qualquer cidadão, pode ler as análises do CAU/PR sem pagar nada. Isso cria um efeito de distribuição orgânica: cada usuário que achar algo interessante compartilha, e a rede cresce. O limite de 5 chats/mês é o principal gatilho de upgrade para o Investigador.

**Lógica do plano API & Dados:** Este plano (R$1.997/mês) foi desenhado para clientes que querem integrar os dados do Dig Dig em seus próprios sistemas — jornais que querem alimentar o CMS, plataformas de compliance, pesquisadores com financiamento. Sozinho, 1 cliente API & Dados cobre o custo de 4 novas rodadas de análise. É o plano que financia a expansão.

#### Fonte 2 — Doações voluntárias

A página `/apoiar` permite contribuições sem contraprestação — quem acredita no projeto contribui como quiser (mínimo R$25). A primeira doação ativa 1 mês grátis do plano Investigador.

Filosofia importante: **não existe meta pública atrelada a órgão específico.** Outros projetos de transparência erram ao prometer "se você arrecadar R$X, a gente audita o órgão Y" — isso cria expectativa que pode não ser cumprida (diferentes órgãos têm volumes muito diferentes de atos), inverte a lógica (a auditoria deve acontecer por ser relevante, não por ter sido financiada) e gera frustração. No Dig Dig, as doações cobrem custos operacionais e a fila de próximos órgãos é decidida pela equipe com base em votos e capacidade técnica.

#### Fonte 3 — Apoio institucional

Empresas e organizações podem se tornar apoiadores institucionais. Modelo negociado diretamente, sem tabela fixa. Contato: `apoie@digdig.com.br`.

### Política de preços

- Upgrade: imediato, cobra diferença proporcional
- Downgrade: ativo até fim do ciclo atual
- Desconto anual: 2 meses grátis (~17%) — disponível a partir do mês 3 de operação

### Por que Mercado Pago e não Stripe

Decisão irreversível a curto prazo. O público-alvo é brasileiro. PIX é o método de pagamento dominante no Brasil — Stripe não suporta PIX de forma nativa em planos básicos. Boleto bancário é usado por escritórios de advocacia e prefeituras. Parcelamento no cartão é a norma para assinaturas acima de R$200. Mercado Pago tem tudo isso com uma API de qualidade razoável e integração nativa com o mercado local.

---

## 7. Go-to-Market

### Fase 1 — CAU/PR ao vivo (semanas 1–4 pós-lançamento)

**Objetivo:** Produto com dados reais, primeiros usuários pagantes, prova de conceito pública.

O CAU/PR é o case de lançamento porque é o órgão que o fundador conhece por dentro. Todos os 551 atos de 2017 a 2026 sendo analisados. O produto se vende pelo que encontra.

**Canais:**
- LinkedIn pessoal do Regis (50.000+ seguidores relevantes na intersecção de política, direito e tecnologia)
- Grupos de WhatsApp e Telegram de arquitetos e urbanistas do Paraná
- Twitter/X: fio com os achados mais relevantes do CAU/PR, cada tuíte citando o número da portaria e o link para o PDF original
- Abordagem direta a 10–15 jornalistas que cobrem CAU, conselhos profissionais e transparência pública no Paraná e em São Paulo
- Email para lista de espera (já existe lista de cadastros de interesse)

**Meta mês 1:** 500 cadastros, R$3.000–5.000 de MRR (primeiros Investigadores via network).

**O que não fazer na Fase 1:** Ads pagos (sem dados de conversão ainda). Abrir múltiplos órgãos simultâneos (foco). Oferecer onboarding personalizado (não escala).

### Fase 2 — Votação aberta + segunda auditoria (semanas 5–12)

**Objetivo:** Abrir a fila de votação para o público, publicar a segunda auditoria, gerar primeira cobertura de imprensa significativa, validar willingness-to-pay fora do network pessoal.

**O segundo órgão a ser auditado** deve ser escolhido com critério: volume de atos razoável (não começar com câmara de São Paulo, que tem 60.000 documentos), relevância política para uma comunidade específica com presença online, e órgão em que seja possível fazer o scraping sem bloqueio de IP.

Candidatos naturais: CREA/PR (engenheiros e arquitetos), CRM/PR (médicos — grande base online), Câmara Municipal de uma cidade de porte médio com histórico de irregularidades conhecidas.

**Canal novo nessa fase:** SEO. Cada órgão auditado gera uma página indexável no Google. Uma pessoa que pesquisa "irregularidades CAU PR portarias" deve encontrar o Dig Dig. Isso exige estrutura de URL limpa, meta tags corretas e conteúdo real.

**Meta mês 3:** R$12.000–15.000 de MRR, 2.000 usuários cadastrados.

### Fase 3 — Expansão nacional (meses 4–12)

**Objetivo:** Múltiplos órgãos ativos, mecanismo de aquisição funcionando sem o fundador no loop.

**Plano API & Dados como motor:** Ao abordar diretamente 10 veículos de imprensa — The Intercept Brasil, Agência Pública, Piauí, Gazeta do Povo, Poder360 — com proposta comercial personalizada (mostrar análise do órgão de cobertura preferido deles), um único fechamento de API & Dados (R$1.997/mês) cobre custos de 4 novas auditorias.

**SEO estrutural:** Uma página por órgão, por tipo de ato, por nível de alerta, por padrão detectado. Cada análise publicada é conteúdo indexável. No ano 1, projetamos 15+ órgãos analisados — isso gera centenas de páginas com conteúdo único e referenciável.

**Programa de afiliados:** Jornalistas e advogados que indicam Investigador ou Profissional recebem comissão. Esse canal é de alto LTV porque os indicadores tendem a indicar pessoas da mesma área de atuação.

**Meta mês 12:** R$80.000–96.000 de MRR, 15+ órgãos ativos.

---

## 8. Personas

### Persona 1 — O Jornalista Investigativo (plano Investigador, R$197/mês)

**Representante fictício:** Thiago, 41 anos, freelance, São Paulo, especializado em transparência pública.

Thiago cobre conselhos profissionais e câmaras municipais para veículos digitais. Hoje passa 3 dias de pesquisa manual para um levantamento que deveria ser feito em 3 horas. O Dig Dig não substitui o jornalismo dele — amplia sua capacidade. Em vez de 4 reportagens por mês, ele produz 10. Em vez de depender de fontes internas que vazam documentos, ele encontra os documentos sozinho nos dados públicos.

**O que ele precisa do produto:**
- Chat para cruzar informações rapidamente ("Qual o histórico de processos contra o mesmo conselheiro?")
- Exportação de ficha em PDF para incluir em reportagem
- Alerta por email quando novo ato crítico é publicado
- Link direto para o PDF original (nunca parafrasear sem a fonte)

**Gatilho de compra:** Ver a análise do CAU/PR no Twitter, perceber que o produto existe para qualquer órgão, e calcular que R$197/mês é menos do que 1h do tempo que economiza por semana.

**LTV estimado:** R$197 × 18 meses = R$3.546.

---

### Persona 2 — O Advogado / Escritório Jurídico (plano Profissional, R$597/mês)

**Representante fictício:** Dra. Carla, 48 anos, sócia de escritório em Maringá, especializada em processos disciplinares perante conselhos.

Carla defende profissionais em processos que os conselhos movem. Para construir a defesa, precisa mostrar que outros processos do mesmo conselho foram conduzidos de forma diferente ou que há padrão de perseguição. Hoje ela faz isso manualmente — pedindo documentos via LAI, esperando 20 dias, recebendo PDFs incompletos. Com o Dig Dig, ela tem acesso estruturado ao histórico completo do órgão.

**O que ela precisa do produto:**
- Export em CSV para cruzar com dados do processo judicial
- 2 assentos (ela + assistente)
- Histórico auditável de perguntas para documentar a pesquisa
- Filtros por nome de pessoa, data e tipo de ato

**Gatilho de compra:** Indicação de colega, ou encontrar o Dig Dig pesquisando no Google o nome do conselho em que está trabalhando.

**LTV estimado:** R$597 × 24 meses = R$14.328.

---

### Persona 3 — A Assessoria Política / Candidato (plano Investigador ou Profissional)

**Representante fictício:** Paulo, 35 anos, assessor de vereador em campanha para câmara municipal.

Paulo precisa de munição para debates e para o material de campanha do candidato. Quer dados verificáveis sobre a gestão dos órgãos que o adversário controla ou frequenta. Não quer especulação — quer documentos com número, data e artigo violado que ele possa citar sem ser processado por difamação.

**Atenção política importante:** O Dig Dig não trabalha para candidatos específicos. O produto é para qualquer pessoa, de qualquer partido, que queira fiscalizar qualquer órgão. Se o produto começa a ser percebido como ferramenta de ataque de um lado específico, ele perde credibilidade com o outro lado — e com a imprensa. Personas políticas são bem-vindas como clientes, mas o posicionamento do produto permanece neutro.

---

### Persona 4 — O Veículo de Imprensa / Plataforma de Dados (plano API & Dados, R$1.997/mês)

**Representante fictício:** Pedro, 37 anos, editor de dados de veículo de imprensa nacional.

Pedro mantém um banco de dados de atos públicos para alimentar o CMS do veículo. Hoje faz scraping manual que quebra toda vez que o site do órgão muda. O Dig Dig entrega uma API estável, documentada, com SLA, que inclui análise já processada — não apenas documentos brutos. Pedro integra via API e configura webhooks para receber alertas quando ato crítico for publicado.

**Valor entregue:** Infraestrutura de dados que custaria R$50.000–100.000 para construir internamente, por R$1.997/mês.

---

### Persona 5 — O Cidadão Engajado (plano Cidadão, R$0)

**Representante fictício:** Fernanda, 34 anos, arquiteta, membra do CAU/PR insatisfeita com a gestão.

Fernanda não é jornalista nem advogada. Ela quer entender o que está acontecendo no órgão da sua categoria profissional. Com o plano gratuito, ela lê as fichas, faz 5 perguntas por mês, e compartilha o que encontra no grupo de WhatsApp das arquitetas.

**Por que ela importa:** Fernanda é a distribuição orgânica. Cada Fernanda que compartilha o link vale mais do que qualquer ad pago. O produto cresce porque o que ele encontra é interessante para a comunidade que se preocupa com aquele órgão específico.

---

## 9. Projeções e Unit Economics

### Premissas de projeção

- Lançamento público: maio/2026
- Crescimento orgânico nos primeiros 6 meses (sem ads)
- Conversão Cidadão → Investigador: 2% (conservadora)
- Churn mensal: 5% Investigador / 3% Profissional / 2% API & Dados
- Doações: ~R$80 por doador, 8% dos usuários Cidadão contribui pelo menos uma vez

### Projeção de MRR por assinaturas

| | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|---|
| Usuários Cidadão | 500 | 1.500 | 4.000 | 12.000 |
| Investigador | 8 | 25 | 70 | 200 |
| Profissional | 1 | 4 | 12 | 35 |
| API & Dados | 0 | 1 | 2 | 6 |
| **MRR** | **R$3.173** | **R$9.916** | **R$29.177** | **R$72.277** |

### Receita total incluindo doações

| | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|---|
| MRR assinaturas | R$3.173 | R$9.916 | R$29.177 | R$72.277 |
| Receita doações | R$0 | R$3.000 | R$9.000 | R$24.000 |
| **Total no mês** | **R$3.173** | **R$12.916** | **R$38.177** | **R$96.277** |

**ARR projetado ao fim de 12 meses: ~R$870.000**

Nota: as projeções ignoram sazonalidade positiva de eleições municipais (segundo semestre de 2026) e eventuais auditorias virais que podem acelerar aquisição significativamente.

### LTV por plano

| Plano | Ticket | Churn mensal | Vida média | LTV |
|---|---|---|---|---|
| Investigador | R$197 | 5% | 20 meses | R$3.940 |
| Profissional | R$597 | 3% | 33 meses | R$19.701 |
| API & Dados | R$1.997 | 2% | 50 meses | R$99.850 |

### CAC por canal

| Canal | CAC estimado |
|---|---|
| Network pessoal (LinkedIn, WhatsApp) | R$0 |
| Conteúdo orgânico (Twitter/X, SEO) | R$50 |
| Outreach a jornalistas | R$0 |
| Ads (a partir do mês 4) | R$250 |
| **Blended** | **R$80–120** |

### Payback period

Com CAC de R$100 e margem bruta estimada de 70%:

| Plano | Payback |
|---|---|
| Investigador | < 1 mês |
| Profissional | < 1 mês |
| API & Dados | < 1 mês |

O modelo é altamente eficiente. O produto tem distribuição orgânica natural — cada análise publicada é marketing. O CAC é baixo porque o conteúdo se distribui sozinho entre as comunidades que se importam com o órgão auditado.

### Custo de operação da IA

Este é o custo variável mais importante do modelo:

| Item | Custo real medido |
|---|---|
| Análise Haiku por ato (com caching) | ~$0,0118 USD |
| Rodada completa CAU/PR (400 portarias) | ~$4,80 USD (~R$24) |
| Cache write do regimento (68k tokens) | $0,255 USD (uma vez por rodada) |
| Análise Sonnet por ato (via cache read) | ~$0,06 USD |
| Custo mensal de infraestrutura (Railway + Supabase) | ~R$150–300 |

O custo de IA de uma rodada completa de análise de um novo órgão é, na prática, bem abaixo de R$100. O custo real de adicionar um novo órgão é o tempo humano de configuração (scraper, regimento, revisão), não o custo de IA.

---

## 10. Riscos Críticos

### Risco 1 — Ação legal por parte de órgão auditado

**Probabilidade:** Média. Órgãos com gestões irregulares têm incentivo para tentar silenciar o produto.  
**Impacto:** Potencialmente alto se gerar desgaste reputacional ou ordem liminar de retirada de conteúdo.

**Mitigação:**
- Linguagem sempre de indícios, nunca de acusação direta
- Dados usados são públicos por lei — a IA só os organiza
- Disclaimer em cada ficha: "Esta análise é gerada por inteligência artificial. Não constitui opinião jurídica. Os documentos citados estão disponíveis nas fontes originais."
- Consulta preventiva com advogado especializado em direito digital antes de qualquer lançamento de órgão com achados sensíveis
- Os documentos citados são sempre linkados na fonte original — o Dig Dig não afirma nada que o próprio órgão não publicou

**O que fazer se receber notificação:**
1. Não deletar nada antes de consultar advogado
2. Verificar se a análise tem erro factual. Se sim, corrigir e comunicar. Se não, manter com documentação
3. Analisar se é intimidação sem fundamento (comum) ou demanda legítima (raro dado que o dado é público)
4. A exposição pública de uma tentativa de censura de dados públicos geralmente é mais danosa para o órgão do que para o Dig Dig

### Risco 2 — Alucinação da IA gerando análise incorreta

**Probabilidade:** Baixa para portarias com texto nativo (o modelo lê o documento real). Média para portarias escaneadas com OCR ruim.  
**Impacto:** Alto se um erro factual viralizar.

**Mitigação:**
- Dois passes: Haiku triagem + Sonnet análise — modelo mais caro analisa só os casos que já foram sinalizados
- Todo ponto de análise referencia o trecho exato do documento
- Usuário pode reportar erro em qualquer ficha — botão "Reportar erro" na interface
- Revisão manual de todos os atos classificados como vermelho antes de publicar
- Versão beta com aviso explícito de "análise em fase de validação"

### Risco 3 — Custo de IA escala antes da receita

**Probabilidade:** Baixa no curto prazo — o custo real de uma rodada é muito menor do que as estimativas iniciais.  
**Impacto:** Médio se a expansão for muito rápida sem receita correspondente.

**Mitigação:**
- Cada novo órgão só entra quando há receita para cobrir o custo da análise inicial
- Prompt caching reduz custo em 60–70% nas rodadas repetidas
- O plano API & Dados (R$1.997/mês) sozinho cobre o custo de 4 novas auditorias completas
- Limite de $15/rodada implementado no backend — rodada cancela automaticamente se ultrapassar

**Contexto histórico importante:** Em abril de 2026, um bug de debug causou rodadas paralelas que consumiram $23 sem resultado rastreado. As 4 camadas de proteção foram implementadas depois disso. Nunca reverter essas proteções. O documento `docs/whitepaper-02-custo-e-controle.html` narra o incidente completo e serve como referência para não repetir o erro.

### Risco 4 — Dependência excessiva do fundador como distribuição

**Probabilidade:** Alta no curto prazo — o produto está sendo lançado via LinkedIn e rede pessoal do Regis.  
**Impacto:** Médio se o Regis se afastar antes do produto ter canais de aquisição próprios.

**Mitigação:**
- SEO estrutural por órgão precisa ser prioridade a partir do mês 2
- Programa de afiliados (jornalistas indicam colegas) como canal independente
- Cada auditoria entregue gera PR local independente da pessoa do fundador
- A conta institucional @digdig_brasil precisa ganhar presença própria

### Risco 5 — Concorrência ou cópia por ator maior

**Probabilidade:** Baixa no curto prazo — o mercado ainda não percebeu a oportunidade.  
**Impacto:** Médio no longo prazo se uma plataforma maior (Serasa, Exame, G1) decidir construir algo similar.

**Mitigação:**
- O moat do Dig Dig está nos **dados acumulados**, não na tecnologia. Código pode ser copiado. Um banco de 10+ anos de atos analisados e estruturados não pode.
- Network effect: quanto mais órgãos auditados, mais valiosa a assinatura para quem monitora múltiplos órgãos
- Velocidade de execução: o Dig Dig pode ter 20+ órgãos antes de qualquer concorrente perceber a oportunidade e sair do zero
- A relação com a comunidade de usuários (jornalistas, advogados, ativistas) é mais difícil de replicar do que o produto

### Risco 6 — Rejeição política por um dos lados do espectro

**Probabilidade:** Média se a narrativa de lançamento focar demais no CAU/PR e em pessoas específicas.  
**Impacto:** Alto — se o produto for percebido como ferramenta de oposição política, perde credibilidade com metade do mercado potencial.

**Mitigação:**
- Posicionamento rígido: o Dig Dig analisa qualquer órgão, de qualquer gestão, de qualquer orientação política
- Quando possível, lançar auditorias de órgãos com orientações políticas diferentes no mesmo período
- Nunca fazer declaração política pública em nome do produto
- Separar completamente a pessoa do Regis (que tem opinião política) do produto (que é neutro por design)

---

## 11. Roadmap de Produto

O roadmap está organizado em cinco frentes que evoluem em paralelo conforme o time cresce. As frentes não são sequenciais — coleta, análise e plataforma avançam simultaneamente.

### v1.0 — Lançamento (onde estamos agora)

| Item | Status |
|---|---|
| Pipeline Haiku + Sonnet em produção | ✅ |
| White Papers publicados | ✅ |
| Painel autenticado com 6 abas e Realtime | ✅ |
| Ficha completa de ato com gating por plano | ✅ |
| Terminar rodada Haiku (138 atos pendentes) | 🔄 |
| Rodar fase Sonnet nos atos críticos | 🔄 |
| Chat conversacional (RAG + Sonnet) | ⬜ |
| Billing live (Mercado Pago — webhook + ativação de plano) | ⬜ |
| Alertas por email quando ato crítico é publicado (Resend) | ⬜ |

---

### Frente 1 — Coleta e cobertura (meses 2–4)

O CAU/PR é o case de lançamento, mas o produto cresce por volume de órgãos cobertos. Esta frente expande a base de dados.

| # | Item | Detalhe técnico |
|---|---|---|
| 5 | Scraper de deliberações HTML | 595 deliberações do CAU/PR existem só como HTML — sem PDF, sem extração de texto. Requer scraper específico que extraia conteúdo do HTML e salve no banco no mesmo formato que as portarias. |
| 6 | OCR de portarias escaneadas | 151 portarias de 2018–2021 foram digitalizadas como imagem — sem camada de texto. Requer Tesseract ou API de OCR (Google Vision, AWS Textract). Esses atos cobrem o período mais antigo da gestão atual — possivelmente os mais relevantes para análise de padrão histórico. |
| 7 | Novos tipos de dados | Diárias e passagens (despesas de viagem de conselheiros), pagamentos a fornecedores, contratos firmados. Cada tipo precisa de scraper e schema próprio, mas integra ao mesmo pipeline de análise. |
| 8 | ATAs notariais | Extração e validação de atas com autenticidade notarial — requer pipeline adicional de verificação de assinatura e integridade. |
| 9 | Votações de pautas | Incluir registro de votações em deliberações plenárias — quem votou a favor, contra, se absteve. Permite detectar padrões de alinhamento e identifica casos de votos irregulares em pautas que afetam conselheiros diretamente. |

---

### Frente 2 — Análise e cruzamento de dados (meses 4–8)

Com múltiplos tipos de dados e múltiplos órgãos no banco, a IA passa a trabalhar em nível de correlação — não só de documento individual.

| # | Item | Detalhe técnico |
|---|---|---|
| 10 | Cruzamento de documentos | Ligar atos relacionados entre si automaticamente: a portaria que nomeia uma comissão é ligada à deliberação que essa comissão aprovou, que é ligada ao contrato resultante. Grafo de relações dentro do mesmo órgão. |
| 11 | Cruzamento entre instituições | Quando a mesma pessoa aparece como signatária em atos de dois órgãos diferentes, o sistema conecta os registros. Exemplo: conselheiro do CAU/PR que também assina contratos como servidor do governo estadual. Esta é a feature que transforma o Dig Dig de ferramenta de órgão em ferramenta de investigação sistêmica. |
| 12 | Gerador de pedidos LAI | Quando a IA detecta indício e não há documento público correspondente (ex.: menção a contrato sem o contrato publicado), o sistema elabora automaticamente o texto do pedido de acesso à informação via Lei de Acesso à Informação e notifica o usuário para submeter. O texto já sai formatado, com o artigo legal correto e o órgão responsável. |
| 13 | Histórico eleitoral | Consultar candidatos e histórico parlamentar — integrar base de dados do TSE para cruzar signatários de atos com candidatos e eleitos. Feature central para o projeto eleição 2026: permite identificar quando um gestor de órgão público é simultaneamente candidato e assina atos que beneficiam aliados. |

---

### Frente 3 — Plataforma e infraestrutura (meses 3–12)

Decisões de infraestrutura que desbloqueiam escala sem aumentar custo operacional proporcionalmente.

| # | Item | Detalhe técnico |
|---|---|---|
| 14 | Automação do scraper | O scraper hoje roda na máquina do Regis porque o Railway tem IP americano bloqueado pelo CAU/PR. Mover para servidor com IP brasileiro (VPS na AWS São Paulo, DigitalOcean Rio, ou proxy residencial) — desvincula a operação do laptop do fundador. |
| 15 | Servidor próprio | Avaliar consolidação de Railway + Lovable em infraestrutura própria (VPS + Coolify ou Dokku) para reduzir custo mensal e eliminar dependência de plataformas de terceiros em cada camada do stack. Não é prioridade antes de R$30k de MRR — custo atual de Railway + Lovable é aceitável. |
| 16 | API Enterprise | Exportação de dados via API REST para planos Enterprise — endpoint documentado, autenticado por token, com paginação, filtros por órgão/tipo/nível e webhook para novos atos. Habilita a Persona 4 (veículos de imprensa, plataformas de compliance) de forma self-service. |

---

### Frente 4 — Comunidade e engajamento (meses 6–12)

Features que transformam usuários passivos em participantes ativos — reduz churn, aumenta LTV e cria defesa de rede que concorrentes não conseguem copiar.

| # | Item | Detalhe técnico |
|---|---|---|
| 17 | Comunidade editorial | Usuários do plano Investigador+ podem enviar artigos de análise, ementas contextualizadas ou anexos a investigações em andamento. O material passa por conselho editorial antes de ser publicado na plataforma. Cria conteúdo qualificado gerado pela comunidade sem custo de redação. |
| 18 | Votação de próxima auditoria | Todo usuário cadastrado recebe votos mensais para indicar qual órgão quer ver auditado a seguir. A fila de votação é pública. A equipe decide o cronograma com base em votos + capacidade técnica. Este mecanismo resolve o problema de priorização de forma transparente e cria expectativa de entrega que engaja a comunidade. |
| 19 | Sistema de recompensas | Recompensas por denúncias verificadas e contribuições relevantes (artigos publicados, documentos submetidos, achados que geraram cobertura de imprensa). Pode ser crédito de plano, acesso antecipado a features, ou reconhecimento público. Alinha o incentivo do usuário com o valor que ele entrega ao produto. |

---

### v3.0 — Plataforma Nacional (2027+)

Com múltiplos órgãos ativos, dados cruzados e comunidade formada:

- Comparativo entre órgãos da mesma categoria (ex.: CAU/PR vs. CAU/SP vs. CAU/RJ — qual gestão é mais irregular?)
- Integração com portal da transparência federal — contratos, licitações, empenhos
- Dashboard público para imprensa — sem login, para repórteres credenciados
- Grafo nacional de pessoas que aparecem em múltiplos órgãos ao longo do tempo

---

## 12. Cultura e Princípios Inegociáveis

### Neutralidade como produto

O Dig Dig não tem lado político. Isso não é marketing — é sobrevivência. Um produto percebido como ferramenta de partido perde imediatamente metade do mercado e toda a credibilidade com a imprensa. A neutralidade é um ativo econômico, não uma posição ideológica.

Isso significa: o produto analisa órgãos geridos por qualquer partido. Não faz declarações políticas. Não faz campanha para candidatos. Não escolhe órgãos auditados por critérios políticos.

### Rastreabilidade absoluta

Cada afirmação do produto tem que poder ser verificada pelo usuário na fonte original. Isso significa: sempre linkar o PDF original, sempre citar o artigo violado pelo número exato, sempre mostrar o trecho do documento que embasou a análise. Nenhuma afirmação de segunda mão. Nenhum "segundo fontes".

### Custo controlado como disciplina

O incidente de $23 em rodadas paralelas foi um alerta que levou à implementação de 4 camadas de proteção. O custo de IA deve ser monitorado com a mesma atenção que a receita. O `CLAUDE.md` do repositório tem as regras de operação — leia antes de disparar qualquer rodada.

### Sem sensacionalismo

A tentação de viralizar um achado com linguagem exagerada é real. Resista. "Processo disciplinar usado como instrumento de perseguição política" é uma afirmação forte o suficiente — não precisa de ponto de exclamação, não precisa de linguagem de crime. A seriedade do produto é parte do produto.

### Velocidade com qualidade

O produto está sendo construído rápido porque o mercado espera e o momento é agora. Mas velocidade não significa lançar análises com erros factuais. Toda ficha de análise de ato vermelho ou laranja deve ser revisada por um humano antes de ser publicada publicamente. A credibilidade é o único ativo que não se reconstrói se for destruída.

---

## 13. Operação Dia a Dia

### O repositório

**GitHub:** `github.com/Regiswilczek/dig-dig`  
**Branch principal:** `main`  
**Deploy:** Todo push no `main` dispara rebuild automático no Lovable (frontend). O backend no Railway requer deploy manual ou CI/CD configurado.

### Infraestrutura

| Serviço | Função | Status |
|---|---|---|
| Railway | Backend FastAPI + Workers Celery | Em produção |
| Supabase | PostgreSQL + Auth + Storage + Realtime | Em produção |
| Redis (Railway) | Broker Celery | Em produção |
| Lovable | Frontend React + Vite + deploy | Em produção |
| Anthropic | Claude API (Haiku + Sonnet) | Em uso ativo |
| Mercado Pago | Billing | Configurado, não lançado |
| Resend | Email transacional | Configurado, não em uso |

### Variáveis de ambiente críticas

Todas em `backend/.env` (nunca commitar). As variáveis mais críticas:
- `ANTHROPIC_API_KEY`: chave de produção da Anthropic — todo custo de IA passa por ela. Monitorar uso no dashboard da Anthropic semanalmente.
- `SUPABASE_SERVICE_ROLE_KEY`: acesso admin ao banco. Nunca expor no frontend.
- `DATABASE_URL`: conexão direta ao PostgreSQL do Supabase.
- `MERCADOPAGO_ACCESS_TOKEN`: ainda em ambiente de teste — deve ser trocado para live antes do billing entrar em produção.

O frontend no Lovable precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto Lovable.

### Regras de operação do pipeline de IA

**NUNCA dispare uma nova rodada de análise sem antes verificar se existe uma ativa:**
```
GET /pnl/orgaos/{slug}/rodadas
```
Se retornar rodada com status `em_progresso` ou `pendente`, cancele antes de criar nova:
```
POST /pnl/rodadas/{id}/cancelar
```

Isso não é opcional. O histórico mostra o que acontece quando se ignora: $23 perdidos em rodadas paralelas sem resultado.

### Documentação técnica completa

| Documento | Conteúdo |
|---|---|
| `docs/01-arquitetura.md` | Stack, fluxos, estrutura de pastas |
| `docs/02-banco-de-dados.md` | 29 tabelas com SQL completo, RLS, índices |
| `docs/03-pipeline-ia.md` | Prompts, caching, código do pipeline |
| `docs/04-api-endpoints.md` | Todos os endpoints REST |
| `docs/05-frontend.md` | Páginas, componentes, roteamento |
| `docs/06-seguranca-e-lgpd.md` | Auth, RLS, CORS, LGPD |
| `docs/07-scraper-e-instituicoes.md` | Como adicionar novo órgão |
| `docs/08-testes.md` | Testes unitários, integração, E2E |
| `docs/09-infraestrutura-e-deploy.md` | Railway, Lovable, Supabase |
| `docs/14-revisao-pre-implementacao.md` | **LEIA ANTES DE CODAR** — 8 riscos |
| `CLAUDE.md` | Contexto completo para agentes de IA |

---

## 14. Primeiras Prioridades do CEO

Você assume um produto com backend em produção, pipeline de IA funcionando, painel autenticado recém-lançado e um caso de estudo (CAU/PR) quase completo. O que falta para o lançamento público é mensurável e entregável em 30 dias. Aqui está o que precisa acontecer, em ordem.

### Semana 1 — Fechar a infraestrutura mínima de receita

**1a. Variáveis de ambiente no Lovable**

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas no Lovable, o painel existe mas não conecta ao Supabase — login não funciona, API calls falham.

→ Lovable → Settings → Environment Variables → adicionar as duas variáveis com os valores do projeto Supabase.

**1b. Billing live (Mercado Pago)**

O SDK está configurado em ambiente de teste. Precisa ser migrado para live: criar conta live no Mercado Pago, configurar webhook de confirmação de pagamento, implementar endpoint de ativação de plano no banco, testar fluxo completo end-to-end com PIX e cartão.

**1c. Terminar a rodada Haiku**

138 portarias pendentes. Verificar se existe rodada ativa (`GET /pnl/orgaos/cau-pr/rodadas`), disparar se não existir, monitorar via aba Pipeline. Revisar manualmente todos os atos que saírem como laranja ou vermelho — nenhum é publicado sem olho humano.

### Semana 2–3 — Produto completo para o lançamento

**2. Rodar fase Sonnet nos atos críticos**

Com o Haiku terminado e os laranjas/vermelhos identificados, rodar o Sonnet para produzir as fichas de denúncia completas. Custo estimado: $2–5.

**3. Chat conversacional**

O chat é o diferencial de experiência que justifica o plano Investigador. A infraestrutura está pronta (banco, API, Sonnet). Falta implementar `POST /chat` com RAG no banco e a interface no frontend.

**4. Alertas por email**

Usuários do plano Investigador+ precisam receber email quando novo ato crítico for publicado. Implementar via Resend — já está configurado, falta o código de disparo no pipeline Haiku.

### Semana 3–4 — Lançamento público do CAU/PR

Com pipeline completo, billing funcionando e chat no ar, fazer o lançamento público:
- Post no LinkedIn do Regis com os achados mais relevantes
- Fio no Twitter citando número de portaria + link para PDF original de cada achado
- Email para lista de espera
- Abordagem direta a 10–15 jornalistas que cobrem CAU, conselhos e transparência

O material de imprensa deve ser preparado durante a semana 2, enquanto o pipeline Sonnet ainda roda.

### Mês 2 — Expansão para segundo órgão

Escolher o segundo órgão: CREA/PR ou CRM/PR são os candidatos naturais — grande base de profissionais online, relevância política, histórico de irregularidades conhecido, scraping tecnicamente viável. Configurar scraper, carregar regimento, disparar rodada, publicar. O objetivo é mostrar que o produto não é CAU/PR — é um motor que escala para qualquer órgão.

### Meses 1–2, paralelo — SEO estrutural

Cada órgão auditado precisa de página indexável. Meta tags corretas, URLs limpas, conteúdo real na página do órgão. Os efeitos aparecem no mês 4–6, mas o investimento precisa começar agora. Uma pessoa que pesquisa "irregularidades CAU PR" deve encontrar o Dig Dig antes de qualquer outra coisa.

### Próximos 90 dias — Frentes a avançar em paralelo

Conforme o time cresce, as frentes do roadmap avançam simultaneamente. As prioridades de médio prazo, por frente:

| Frente | Próxima entrega |
|---|---|
| Coleta e cobertura | Scraper de deliberações HTML (595 atos do CAU/PR ainda sem texto) |
| Análise | Cruzamento automático de documentos relacionados (portaria → comissão → deliberação) |
| Infraestrutura | Mover scraper para servidor com IP brasileiro — tirar da máquina do Regis |
| Comunidade | Votação de próxima auditoria — mecanismo público de fila de órgãos |
| Dados | Novos tipos: diárias, contratos, votações de pautas |

---

## 15. Referências

### Repositório e deploy
- **Código:** `github.com/Regiswilczek/dig-dig`
- **Frontend produção:** URL no painel do Lovable
- **Backend produção:** URL no painel do Railway
- **Banco:** Painel do Supabase — projeto `pnmtlpcdivzihspnnuid`

### Documentação técnica interna
Todos os documentos estão em `docs/` no repositório. Leia nesta ordem se precisar se aprofundar:
1. `CLAUDE.md` — visão geral e regras de trabalho
2. `docs/14-revisao-pre-implementacao.md` — riscos críticos antes de qualquer implementação
3. `docs/01-arquitetura.md` — como o sistema funciona
4. `docs/02-banco-de-dados.md` — schema completo
5. `docs/03-pipeline-ia.md` — como a IA funciona, prompts e caching
6. `docs/12-plano-de-negocios.md` — estratégia comercial detalhada

### White Papers públicos
- `/whitepaper-01-extracao-caupr` — jornada de coleta dos 551 atos do CAU/PR
- `/whitepaper-02-custo-e-controle` — diagnóstico do incidente de $23 e as proteções implementadas

### Contatos
- **Fundador:** Regis Alessander Wilczek — regisalessander@gmail.com
- **Suporte:** suporte@digdig.com.br
- **Apoio institucional:** apoie@digdig.com.br
- **Status da API:** https://status.digdig.com.br

---

*Este documento é um retrato do produto em abril de 2026. Atualize-o conforme o produto evolui — especialmente as seções de Estado Atual (seção 5) e Primeiras Prioridades (seção 14). Um documento de briefing desatualizado é pior do que nenhum documento.*

---

**Versão 1.0 — Abril de 2026**  
**Regis Alessander Wilczek — Fundador, Dig Dig**
