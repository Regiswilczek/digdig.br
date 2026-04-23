# Como Automatizamos a Auditoria do CAU/PR com Inteligência Artificial

*Por Regis Wilczek — Abril de 2026*

---

## A Ferramenta Que Eu Não Tinha

Antes de falar de código, preciso falar do trabalho manual que me ensinou por que essa ferramenta precisava existir.

Passei um período da minha carreira como Assessor Parlamentar no gabinete de um vereador de Curitiba. Parte do trabalho era fiscalizar a prefeitura — não de forma genérica, mas ir fundo nos portais de transparência, cruzar dados, entender quem estava comprando o quê, de quem, por quanto.

Foi nesse trabalho que encontrei o que ficou conhecido como o escândalo da água San Pelegrino: dinheiro público sendo gasto em água mineral de alto padrão para uso interno da administração municipal, de forma sistemática e sem justificativa em viagens e diarias. Não foi uma denúncia que caiu no meu colo — foi o resultado de dias vasculhando planilhas de licitação, notas de empenho, contratos, cruzando dados de fornecedores com CNPJs. Fiz isso manualmente, com o Portal da Transparência aberto em abas, uma planilha do lado e muita paciência.

Denunciei. Funcionou. O escândalo repercutiu.

Mas o processo me deixou com uma sensação permanente de ineficiência. Havia mais irregularidades ali — eu sabia disso — e a limitação não era a minha vontade de encontrá-las. Era a capacidade humana de processar volume de informação. Um analista humano consegue revisar dezenas de documentos por dia. Os órgãos públicos publicam centenas ou milhares por ano.

Depois desse período, fui trabalhar no próprio CAU/PR — primeiro como Chefe de Gabinete, depois como Assessor Especial. Vi a instituição por dentro. Entendi como as decisões são tomadas, onde as atas são publicadas, quais atos têm ementa vaga, quais nomeações chegam por Ad Referendum sem deliberação do plenário. Aprendi a linguagem administrativa que disfarça escolhas políticas em atos burocráticos.

Quando decidi construir o Dig Dig, sabia exatamente o que queria: uma ferramenta que fizesse automaticamente o que eu fiz manualmente na prefeitura de Curitiba. Que baixasse cada ato, lesse o texto, entendesse o contexto e me dissesse onde olhar com atenção.

Foi assim que nasceu o **Dig Dig**.

---

## O Que Existe para Analisar

O CAU/PR publica dois tipos principais de atos administrativos:

- **551 portarias** — nomeações, exonerações, instauração de comissões processantes, delegações de função
- **1.238 deliberações** — decisões do plenário sobre questões institucionais, financeiras e disciplinares

**Total: 1.789 atos documentados**, cobrindo anos de gestão.

O primeiro passo foi coletar os metadados de todos esses atos — número, data, ementa, link para o PDF — e salvar em arquivos JSON locais. Isso foi feito com scrapers Python antes mesmo de construir o sistema principal.

---

## A Arquitetura Que Escolhemos

Antes de escrever uma linha de código de produção, documentamos tudo: 15 documentos cobrindo banco de dados, API, frontend, segurança, testes, infraestrutura, prompts de IA, modelo de negócio.

O stack escolhido:

- **Backend:** FastAPI + Celery + Redis no Railway
- **Banco:** PostgreSQL via Supabase (29 tabelas, Row Level Security para multi-tenancy)
- **IA:** Claude Haiku 4.5 para triagem em lote + Claude Sonnet 4.6 para análise profunda dos casos críticos
- **Frontend:** React + Vite + shadcn/ui via Lovable
- **PDFs:** pdfplumber para extração de texto

A lógica do pipeline é em duas fases. O **Haiku** — modelo rápido e barato — analisa todos os atos e classifica em quatro níveis: verde (conforme), amarelo (suspeito), laranja (indício moderado-grave) e vermelho (indício crítico). O **Sonnet** entra só nos casos vermelho, gerando análise aprofundada, ficha de denúncia e mapeamento de pessoas.

O custo estimado por rodada completa: algo em torno de R$25-30.

---

## Quando o Mundo Real Bate na Porta

Teoria é teoria. Na prática, cada etapa trouxe um problema que não estava no planejamento.

### Problema 1: O servidor do CAU/PR bloqueia o Railway

Quando o worker Celery no Railway tentou baixar os PDFs, recebeu **403 Forbidden** em 100% das tentativas. O servidor do CAU/PR estava bloqueando requisições vindas de data centers americanos — e o Railway usa infraestrutura nos EUA.

Tentamos adicionar headers de navegador (User-Agent, Referer, Accept) imitando o Chrome. Não adiantou. O bloqueio era por IP, não por fingerprint.

A solução foi pragmática: **criar um script local** que roda na minha máquina, com IP brasileiro, e baixa os PDFs diretamente. O `scrape_local.py` faz exatamente isso — conecta direto no banco Supabase, pega a fila de atos pendentes, baixa com rate limit de 1,5 segundos entre requests (para não parecer um ataque), extrai o texto e salva. 400 portarias processadas em aproximadamente 45 minutos.

### Problema 2: Quase 30% das portarias são PDFs escaneados

Ao rodar o scraper, 151 portarias voltaram com "texto vazio". Minha primeira hipótese foi problema de encoding ou de extração. Testei com pymupdf, com extração raw, com diferentes modos. Tudo zero caracteres.

Aí veio o momento de entender o que estava acontecendo: abri um desses PDFs no navegador e vi o texto perfeitamente. Mas ao inspecionar a estrutura do arquivo com pymupdf (`rawdict`), a resposta foi clara: 1 bloco de imagem, 0 blocos de texto. **O PDF é uma imagem.** Não tem camada de texto. O navegador renderiza a imagem e parece texto, mas não dá para selecionar, copiar ou extrair nada.

Isso é característico de documentos mais antigos — portarias de 2018, 2019, 2020 eram digitalizadas em scanner e salvas como imagem dentro de um PDF. As portarias a partir de 2022 em diante foram geradas digitalmente e têm texto nativo.

A distribuição ficou assim:

| Período | Cobertura |
|---------|-----------|
| 2022–2026 | 95–100% |
| 2021 | 62% |
| 2019–2020 | 0–12% |
| 2018 | 2% |

Isso é importante para o relatório: **a auditoria cobre 400 portarias** — principalmente o período mais recente — e documenta explicitamente quais 151 não puderam ser analisadas e por quê. Transparência sobre o escopo faz parte da credibilidade da auditoria.

### Problema 3: As deliberações não têm PDF

Das 1.238 deliberações, 595 não têm link para PDF no site. Elas existem como páginas HTML — texto direto no site, sem documento anexado. O scraper de PDF simplesmente não consegue processar isso.

Analisar as deliberações vai exigir um scraper diferente: um que leia o HTML da página em vez de baixar um arquivo. Isso entra na próxima sprint.

### Problema 4: asyncio, Celery e o inferno dos event loops

Esse foi o mais técnico. O Celery usa um modelo de processos fork: cria um processo mestre e depois bifurca em workers. O SQLAlchemy async cria conexões com o banco ligadas ao event loop do processo mestre. Quando o worker é bifurcado, ele herda as conexões — mas não o event loop, que é diferente em cada processo. Resultado: `Future attached to a different loop`, e o worker trava.

A solução foi usar o signal `worker_process_init` do Celery para recriar o engine do banco com `NullPool` em cada worker bifurcado, garantindo que cada processo tenha suas próprias conexões limpas.

Outro problema relacionado: o orquestrador tentava chamar `.apply()` em subtarefas Celery dentro de um `asyncio.run()` que já estava rodando. Chamadas síncronas dentro de contextos assíncronos explodem. Resolvemos refatorando as subtarefas para funções async puras e chamando-as diretamente com `await`.

### Problema 5: O banco não combinava com o modelo

Várias colunas tinham `NOT NULL` no banco mas `nullable=True` no modelo SQLAlchemy — e `server_default=func.now()` definido no modelo mas sem `DEFAULT NOW()` na tabela real. Isso foi herdado de uma migration inicial incompleta.

O resultado eram erros de integridade na hora de salvar: `null value in column "nivel_alerta" violates not-null constraint`. A coluna tinha texto no modelo dizendo que aceitava nulo, mas o banco discordava.

Resolvemos com uma migration explícita adicionando os defaults de timestamp em todas as 29 tabelas, e ajustando o código para não fazer `flush()` antes de preencher todos os campos obrigatórios.

### Problema 6: O Haiku não retornava JSON limpo

Configuramos o Haiku para sempre responder em JSON com uma estrutura específica. Na prática, às vezes ele envolvia a resposta em blocos de código markdown — ` ```json ... ``` ` — ou adicionava uma frase introdutória antes do JSON.

A função de parse inicial só tentava `json.loads()` direto. Falha, cai no fallback, salva "análise incompleta" no banco.

Refizemos com 4 níveis de fallback:
1. Tenta parsear o texto bruto
2. Remove as marcações markdown e tenta de novo
3. Extrai o primeiro bloco `{...}` do texto usando regex, mesmo que tenha prosa ao redor
4. Só aí vai para o fallback de emergência com regex simples

### Problema 7: Custo do regimento no prompt

O regimento interno do CAU/PR tem 201.814 caracteres — aproximadamente 68.000 tokens. Isso é muito mais do que os ~8.000 tokens que estimamos na documentação inicial.

O impacto: a primeira chamada de cada janela de 5 minutos precisa escrever o regimento inteiro no cache da Anthropic (custo de escrita: $1,00/1M tokens = ~$0,068 por janela). As chamadas seguintes leem do cache a $0,08/1M tokens — dez vezes mais barato.

Na prática, cada ato custa entre $0,008 (com cache quente) e $0,071 (cache frio). A média real na rodada está em $0,013 por ato, confirmando que o cache está funcionando. Para 398 portarias, a projeção é **~$4,80 total para a fase Haiku**.

---

## Onde Estamos Agora

O pipeline está rodando.

O worker Celery no Railway está analisando portaria por portaria: lê o texto, envia para o Haiku com o regimento interno cacheado como contexto, recebe o JSON com classificação, indícios e pessoas extraídas, salva tudo no banco.

Dos primeiros 81 atos processados:
- **40% verde** — atos conformes, sem irregularidades detectadas
- **59% amarelo** — suspeitos, requerem atenção
- **0% laranja/vermelho** até agora

O Haiku está processando do mais recente para o mais antigo, então os atos de 2026 e 2025 vêm primeiro. Os casos mais graves tendem a aparecer quando chegar nos anos anteriores, onde comissões processantes, exonerações em massa e nomeações questionáveis foram mais frequentes.

---

## O Que Ainda Falta

1. **Deliberações via scraper HTML** — as 595 deliberações que existem só como HTML precisam de um scraper diferente
2. **OCR nas portarias escaneadas** — as 151 portarias de 2018-2021 precisam de Tesseract para ter o texto extraído
3. **Fase Sonnet** — quando o Haiku terminar, o Sonnet vai aprofundar os casos vermelho: análise detalhada, ficha de denúncia pronta para uso, mapeamento completo de pessoas
4. **Dashboard web** — o frontend já existe (Lovable + React), falta conectar na API com os resultados reais
5. **Chat conversacional** — o usuário poderá perguntar "mostre todas as portarias envolvendo comissões processantes em 2023" e receber uma resposta com contexto

---

## O Que Aprendemos

Construir uma ferramenta de auditoria pública com IA é tecnicamente possível e financeiramente viável. O custo de processar quase 400 documentos com leitura completa do regimento interno como contexto fica em torno de R$27.

O maior obstáculo não foi a tecnologia — foi a qualidade dos dados públicos. PDFs escaneados sem OCR, documentos sem texto, ausência de versões digitais de documentos mais antigos: tudo isso é um problema de acesso à informação pública que vai muito além de qualquer sistema de IA.

A auditoria vai ter limitações de cobertura. Documentamos isso. Um relatório honesto sobre o que foi possível analisar e o que não foi é mais útil do que um relatório que finge ter analisado tudo.

E sobre o futuro: portarias e deliberações são só o começo. A mesma lógica se aplica a notas de diárias, aumentos de patrimônio de gestores, gastos públicos em compras diretas, aditivos contratuais. Tudo isso é público. Tudo isso é passível de análise automatizada. O que fazia falta era a ferramenta.

Agora ela existe.

---

*Este documento é parte do registro técnico do projeto Dig Dig. O código é aberto e o método é replicável para qualquer órgão público brasileiro com atos administrativos publicados em PDF.*
