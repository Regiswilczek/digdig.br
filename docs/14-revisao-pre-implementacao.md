# 14 — Revisão Pré-Implementação — Dig Dig

> Documento de auditoria técnica e comercial produzido antes do início da codificação.
> Data: 2026-04-22

> ## ⚠️ Status pós Sprint Abril 2026
>
> Este documento foi escrito **antes** da implementação. Muitos itens identificados como riscos/gaps já foram resolvidos:
>
> - ✅ **Schema reconciliado** — 32 tabelas em produção (era 23+4 no plano)
> - ✅ **Pipeline IA funcionando** — agora com 4 agentes (ATLAS, Piper, Bud, Zew em teste); arquitetura evoluiu de Haiku+Sonnet pra essa pra otimizar custo+qualidade
> - ✅ **Algoritmo de deduplicação de pessoas** — implementado em `app/services/pessoas_service.py` (rapidfuzz + heurísticas)
> - ✅ **Scraper local** — VPS bloqueada com 403 pelo CAU/PR; resolvido rodando local
> - ✅ **CVSS-A** — score reproduzível adicionado pra resolver subjetividade do nível
> - ✅ **Painel da conta** — perfil, assinatura, doação, favoritos, avatar
> - 🔄 **Alertas por email** — Resend configurado, código de disparo pendente
> - 🔄 **OCR escaneadas** — Tesseract integrado em scripts locais; pipeline VPS pendente
> - 🔄 **Geração de PDF de ficha de denúncia** — pendente
>
> O texto abaixo segue como **registro histórico** do raciocínio que precedeu a implementação. Útil pra entender por que algumas decisões foram tomadas.
>
> ---

## 1. Visão Geral do Estado do Projeto

O Dig Dig chega ao início da implementação em um estado incomum para um projeto ainda sem código: a documentação técnica está genuinamente boa. Os 13 documentos produzidos cobrem stack, banco de dados, pipeline de IA, API, frontend, segurança, testes, infraestrutura, logs, chat conversacional, modelo de negócios e API comercial — uma abrangência que a maioria dos projetos SaaS não atinge nem depois do lançamento. O schema de banco com 23 tabelas (mais 4 tabelas de log) é coerente, os prompts do pipeline estão pensados até o nível do JSON de resposta, e o modelo de negócio tem coerência interna real.

Dito isso, há problemas concretos que precisam de decisão antes de codar. O mais crítico é uma inconsistência estrutural entre documentos: os planos comerciais mudaram de nome e preço durante o processo de escrita, e vários documentos ainda usam a nomenclatura antiga — o que significa que o schema de banco, os prompts de tela e a lógica de acesso precisam ser reconciliados antes de a primeira linha de código ser escrita. Há também funcionalidades mencionadas em múltiplos documentos sem especificação suficiente para implementar (alertas por email, scraper de descoberta contínua, geração de PDF de ficha de denúncia), e um risco técnico relevante no grafo de pessoas que está planejado mas não tem algoritmo de deduplicação de nomes especificado. O nível geral de maturidade da documentação é alto — o problema não é ausência de pensamento, é que alguns pontos precisam de uma decisão final que ainda não foi tomada.

---

## 2. Avaliação por Módulo

### 2.1 Arquitetura Geral (doc 01)

**Nota: ✅ Sólido**

A escolha de FastAPI + Celery + Redis + Supabase + Lovable é coerente e adequada para o estágio do produto. A separação entre API service, worker service e beat service no Railway está correta — evita que jobs longos de análise bloqueiem endpoints da API. O fluxo de dados nos diagramas (scraper → haiku → sonnet → síntese) está bem descrito. A estrutura de diretórios é sensata e não vai criar conflitos sérios de organização.

O que é questionável: a decisão de usar Lovable como plataforma de frontend reduz o controle sobre o deploy e o build pipeline. O doc 01 menciona TanStack Router mas o doc 10 usa referências a `NEXT_PUBLIC_POSTHOG_KEY` — sintaxe de Next.js, não de Vite. Isso sugere que parte da documentação foi escrita com Next.js em mente e depois migrada para Lovable sem revisão completa. O doc 06 (Segurança) menciona "Frontend Next.js usa React que escapa HTML por padrão" — erro remanescente.

O que está faltando: não há documentação de como o frontend Lovable vai se comunicar com o backend Railway em termos de CORS durante desenvolvimento local. O dev workflow precisa ser definido antes de começar.

---

### 2.2 Banco de Dados (doc 02)

**Nota: ✅ Sólido**

O schema de 23 tabelas está bem projetado. A separação entre `atos` e `conteudo_ato` (texto completo em tabela separada) é uma decisão correta — evita inflar a tabela principal e facilita queries de metadados sem carregar texto. Os índices GIN para full-text search estão corretos. A decisão de usar `UUID[]` em `padroes_detectados.atos_envolvidos` é aceitável no MVP, mas vai causar problemas em queries de produção (arrays de UUID não permitem JOIN eficiente).

O que é problemático: o doc 02 tem seed data com planos `free/pro/enterprise` a R$0/R$297/R$997, mas o modelo comercial atual (doc 12) usa `cidadao/investigador/profissional/api_dados` a R$0/R$197/R$597/R$1.997. Essa inconsistência é direta: o seed SQL vai criar planos com nomes e preços errados. O `planos.nome` é usado em código (`user.plano.nome == "free"`) — se o nome mudar, todo o código de autorização quebra. Isso precisa ser resolvido antes de escrever qualquer linha de código de autorização.

O que está faltando: não há tabela para armazenar `api_keys` (necessária para o plano API & Dados descrito no doc 13). O doc 13 documenta completamente a autenticação via `X-API-Key`, mas não existe tabela correspondente no schema do banco. Isso precisa ser criado antes de implementar o módulo de API.

As 4 tabelas de log do doc 10 (`logs_sessao`, `logs_atividade`, `logs_erros_usuario`, `logs_acesso_negado`) não estão no schema do doc 02 — o doc 10 menciona isso explicitamente ("Adições ao Schema"), mas o doc 02 não foi atualizado. O schema final precisa consolidar tudo.

---

### 2.3 Pipeline de IA (doc 03)

**Nota: ✅ Sólido**

Este é o núcleo do produto e está bem especificado. O prompt caching está no lugar certo (system prompt com regimento cacheado, user prompt por ato não cacheado). O formato JSON de resposta do Haiku e do Sonnet está detalhado e é realista. A lógica de dois passes (Haiku triagem → Sonnet apenas para críticos) está correta tanto tecnicamente quanto economicamente.

O que é problemático: o código de exemplo usa `HAIKU_MODEL = "claude-haiku-4-5-20251001"` como string literal no código. IDs de modelo mudam com novas versões. Isso deve ir para variável de ambiente desde o início (`CLAUDE_HAIKU_MODEL`, `CLAUDE_SONNET_MODEL`), não hardcoded.

O retry logic usa `time.sleep()` síncrono dentro de workers Celery. Em workers com `--concurrency`, isso bloqueia um slot de worker durante o sleep. A solução correta é usar Celery retry com `countdown` — `raise self.retry(exc=exc, countdown=espera)` — que libera o worker durante a espera. O doc 03 usa `time.sleep()` em código de retry mas o doc 07 usa `raise self.retry(countdown=60)` corretamente. Precisa ser unificado.

O que está faltando: não há especificação de o que acontece quando a Claude API retorna JSON inválido (o modelo "esquece" de fechar chaves, etc.). O pipeline precisa de um parser com fallback — tentar `json.loads()`, e se falhar, extrair campos via regex antes de descartar o ato. Isso vai acontecer em produção.

---

### 2.4 API Endpoints (doc 04)

**Nota: ✅ Sólido**

A API está bem especificada. O conjunto de endpoints cobre todos os fluxos descritos nos outros documentos. Os formatos de resposta são consistentes. Os códigos de erro são completos e úteis. O rate limiting está documentado e diferenciado por plano.

O que é questionável: há dois endpoints de chat para enviar mensagem: `POST /orgaos/{slug}/chat/sessoes/{sessao_id}/mensagens` (resposta completa) e `POST /orgaos/{slug}/chat/sessoes/{sessao_id}/stream` (streaming). Na prática, o frontend vai usar streaming quase sempre — a resposta completa só faz sentido para a API externa (doc 13) e para testes. O custo de manter dois endpoints é baixo, mas a lógica de streaming precisa ser testada separadamente do endpoint síncrono.

O que está faltando: não há endpoint de webhook para o Supabase Auth (onboarding de novo usuário). Quando o usuário se cadastra via Supabase Auth, o backend precisa ser notificado para criar o registro em `users` com `plano_id` do plano Cidadão. Sem esse webhook, o usuário vai existir no Supabase Auth mas não na tabela `users`, e todos os endpoints vão quebrar ao tentar buscar o plano do usuário.

O endpoint `GET /campanhas/{id}/votos/saldo` está escopiado incorretamente — o saldo de votos de um usuário não é específico de uma campanha, é global do usuário por mês. O design atual faz o frontend chamar esse endpoint passando qualquer `campaign_id`, o que é confuso. Seria mais limpo como `GET /campanhas/votos/saldo-mensal`.

---

### 2.5 Frontend (doc 05)

**Nota: ⚠️ Atenção**

O mapa de rotas está completo e o design das páginas está bem descrito em termos de layout e conteúdo. A especificação da página de chat é particularmente detalhada e clara.

O que é problemático: a página `/patrocinar/[slug]` menciona "acesso 48h antes" como benefício para doadores. Isso implica um mecanismo de controle de acesso temporário que não está especificado em nenhum documento técnico. Como funciona? Um campo `acesso_antecipado_ate` na tabela `doacoes_patrocinio`? Um Redis com TTL? Isso precisa ser especificado antes de implementar a página de campanha.

O doc 05 menciona o comportamento do chat por plano como "Free: 20 perguntas/mês". Porém, o doc 00 e o doc 12 dizem 5 perguntas/mês para o plano Cidadão. São números diferentes. Qual prevalece?

O grafo de relacionamentos usa `vis-network` ou `react-force-graph` como possibilidades. Essas são bibliotecas com trade-offs bem distintos (tamanho de bundle, API, suporte a touch). Escolher antes de implementar para não trocar depois.

O que está faltando: não há especificação de como o frontend vai lidar com o estado de "rodada em andamento" para o admin. O doc 05 menciona "Status da rodada em tempo real (WebSocket ou polling)" mas não decide qual. WebSocket é mais complexo de implementar no Railway e requer configuração adicional. Polling com intervalo de 5 segundos é suficiente para um painel admin e não exige WebSocket. Decidir antes de implementar o painel admin.

---

### 2.6 Segurança e LGPD (doc 06)

**Nota: ⚠️ Atenção**

Os fundamentos estão corretos: JWT validado em cada request, RLS no Supabase, Pydantic em todos os inputs, CORS restrito, sem secrets no código. A fundamentação legal da LGPD para processar dados de agentes públicos está bem embasada (art. 7º, II, III e IX + STF RE 1.010.606).

O que é problemático: o doc 06 tem um RLS Policy que é logicamente incorreto:

```sql
CREATE POLICY "free_readonly_first_tenant" ON atos
    FOR SELECT TO authenticated
    USING (
        TRUE  -- select liberado, controle no backend
    );
```

Isso significa que qualquer usuário autenticado pode fazer SELECT em qualquer ato de qualquer tenant via Supabase diretamente (sem passar pelo backend). Se o frontend acessa Supabase diretamente — como é comum com Supabase Auth — isso é um leak real de dados. O RLS precisa ser o gatekeeping real, não o backend. A policy correta é a que está acima (`user_reads_own_tenants`), e a `free_readonly_first_tenant` está errada e deve ser removida.

A autenticação de admin usa `auth.jwt() ->> 'role' = 'admin'` em RLS policies. Isso requer que o campo `role` esteja no JWT do Supabase. Não há especificação de como esse campo é adicionado ao JWT (via `app_metadata` no Supabase? via custom claim?). Isso precisa ser definido antes de implementar qualquer funcionalidade admin.

O que está faltando: não há menção a backup de API Keys (doc 13 descreve API Keys mas não há plano para o caso de vazamento massivo — rotation, revogação em lote, etc.).

---

### 2.7 Scraper e Instituições (doc 07)

**Nota: ✅ Sólido**

O scraper está bem especificado. O uso de `tenacity` para retry com backoff exponencial é correto. O rate limiting por domínio é responsável. O fallback para OCR está implementado. Os casos especiais (PDFs grandes, PDFs com senha, 404) estão tratados.

O que é questionável: a normalização de texto tem substituições hardcoded para encoding quebrado:

```python
substituicoes = {
    'Ã£': 'ã', 'Ã§': 'ç', 'Ã©': 'é', 'Ã': 'Á', ...
}
```

Isso vai quebrar para outros órgãos com outros padrões de encoding. A solução robusta é usar `ftfy` (biblioteca Python que detecta e corrige encoding automaticamente) em vez de substituições manuais.

O scraper de descoberta (seção 5) está marcado como "opcional" mas é fundamental para o produto ser útil além do lançamento. Sem ele, o sistema fica estático após a análise inicial e precisa de rodada manual para cada órgão. O Celery Beat está configurado para rodar semanalmente — isso é razoável, mas precisa ser implementado no MVP, não como after-thought.

O que está faltando: não há especificação de deduplicação de atos. Se o scraper rodar duas vezes (por bug ou por design), o constraint `UNIQUE(tenant_id, numero, tipo)` vai lançar exceção. O código do scraper precisa tratar isso com `INSERT ... ON CONFLICT DO NOTHING` ou verificar antes de inserir.

---

### 2.8 Testes (doc 08)

**Nota: ⚠️ Atenção**

A estratégia de testes é boa: pirâmide correta (70% unitário, 25% integração, 5% E2E), fixtures bem pensadas, testes de segurança separados, CI com PostgreSQL e Redis como services. O teste de SQL injection está no lugar certo. Os exemplos de código de teste são realistas.

O que é problemático: os testes de integração têm um problema estrutural sutil: `TestAuth.test_signup_cria_usuario` chama `POST /auth/signup`, que por sua vez precisa chamar o Supabase Auth (serviço externo) para criar o usuário. Em ambiente de CI, isso vai falhar ou requerer mocking do Supabase. O doc 08 não resolve isso — não há mock do Supabase Auth nos fixtures.

O teste de performance `test_listar_atos_com_filtros_abaixo_de_200ms` cria 5000 atos em setup. Isso vai ser lento no CI (cada test run cria e destrói o banco). É melhor usar fixtures compartilhadas com `scope="session"` para dados de volume.

O que está faltando: não há testes para o pipeline de IA (além dos mocks do Haiku/Sonnet, que estão bem). Mas não há nenhum teste para o Celery — como validar que uma task é enfileirada corretamente, que o retry funciona, que o resultado é salvo no banco. Testar Celery em CI requer `CELERY_TASK_ALWAYS_EAGER=True` que executa tasks de forma síncrona. Isso está ausente dos fixtures.

---

### 2.9 Infraestrutura e Deploy (doc 09)

**Nota: ✅ Sólido**

A escolha de Railway + Lovable + Supabase é adequada para o MVP. O custo total de ~R$200-300/mês no início é razoável. O `railway.toml` está bem configurado. O Dockerfile usa `python:3.12-slim` com usuário não-root, o que é correto. As regras de migração segura (CONCURRENTLY, não dropar colunas sem deprecation period) estão corretas.

O que é problemático: a migração automática no deploy via `alembic upgrade head` no startup do FastAPI (`lifespan`) é um padrão arriscado. Se dois containers do API service subirem simultaneamente (o que acontece durante rolling deploys), dois processos tentarão rodar a mesma migração ao mesmo tempo. Alembic não tem lock distribuído por padrão. A solução correta é rodar a migração como um step separado no CI/CD, antes do deploy dos containers.

O staging está mencionado como `staging.digdig.com.br` mas não há especificação de como o banco de staging é gerenciado — é o mesmo banco de produção? Um projeto Supabase separado? Se for o mesmo banco, qualquer migration que quebra dados vai afetar produção também.

O que está faltando: não há plano de rollback explícito para migrations. "Rollback Railway" é simples para código, mas migrations de banco que adicionaram colunas ou criaram tabelas não revertem automaticamente. Precisa de `alembic downgrade` explícito.

---

### 2.10 Logs e Analytics (doc 10)

**Nota: ✅ Sólido**

A arquitetura de três camadas (Structlog + PostgreSQL + PostHog) é bem pensada. O catálogo de ações está completo. O serviço `AuditLog` tem interface limpa. A política de retenção com limpeza automática via Celery Beat é correta. A anonimização de IPs após 30 dias e de user_id ao deletar conta estão alinhadas com LGPD.

O que é problemático: `AuditLog.registrar()` faz `db.commit()` a cada chamada. Em endpoints que fazem múltiplas operações dentro de uma transação, isso vai committar parcialmente em caso de erro posterior. O correto é usar `db.add()` sem commit e deixar o commit para o final da request, ou usar uma sessão separada para logs. O padrão atual pode criar estados inconsistentes no banco.

O doc 10 usa `process.env.NEXT_PUBLIC_POSTHOG_KEY` na configuração do PostHog no frontend. Isso é sintaxe Next.js. No Vite/Lovable, a variável seria `import.meta.env.VITE_POSTHOG_KEY`. Este é um dos resquícios de when the docs were written assuming Next.js.

O que está faltando: não há política clara de quem pode acessar os logs de atividade de outros usuários. O endpoint `GET /admin/usuarios/{user_id}/atividade` retorna histórico completo de qualquer usuário. Isso precisa de proteção de role `admin` documentada explicitamente na API, não apenas implícita.

---

### 2.11 Chat e IA Conversacional (doc 11)

**Nota: ✅ Sólido**

O design do RAG está correto conceitualmente: classificar intenção → buscar dados no banco → montar contexto → chamar Sonnet. A separação de perguntas factuais (sem IA) das perguntas de análise (com IA) é uma boa decisão de custo. O limite de 15.000 tokens de contexto por pergunta é razoável para Sonnet. O system prompt do chat é bem calibrado — claro sobre o que pode e não pode fazer.

O que é problemático: a classificação de tipo de pergunta usa Haiku ("Passo 1: CLASSIFICAR INTENÇÃO (Haiku — rápido e barato)") no diagrama do doc 11, mas o código de implementação em `chat_pergunta` usa `tipo = classificar_pergunta(body.pergunta)` sem chamar a Claude. Isso sugere que a classificação é feita por regex/heurística no Python, não pela IA. Essas duas abordagens têm trade-offs muito diferentes: regex é mais rápido e mais barato mas vai errar em muitos casos; Haiku é mais caro (+$0,001/pergunta) mas mais acurado. Precisa decidir qual usar e documentar.

A "memória da conversa" carrega as últimas 8 trocas. Com perguntas de investigação gerando ~2.000 tokens de resposta cada, 8 trocas de histórico + contexto de 15.000 tokens + pergunta podem facilmente passar de 30.000 tokens de input — o que aumenta muito o custo por pergunta e pode causar `context_length_exceeded`. Precisa de truncação do histórico baseada em tokens, não em número de trocas.

O que está faltando: não há definição de como as "sugestões de perguntas contextuais" são geradas. O doc 05 e 11 mencionam sugestões como `[5 piores casos] [Pessoas suspeitas] [Padrões]`. Isso é hardcoded no frontend? Gerado pela IA? Baseado no contexto da conversa? Precisa ser especificado.

---

### 2.12 Plano de Negócios (doc 12)

**Nota: ✅ Sólido**

O plano de negócios é consistente e realista. O modelo de "Patrocine uma Auditoria" é genuinamente diferenciado — não é apenas monetização, é um mecanismo de aquisição de usuários e de geração de PR. A mecânica de votos gratuitos + doações é inteligente: cria engajamento sem exigir pagamento imediato. As projeções de receita são conservadoras e credíveis (não assumem crescimento viral). O unit economics com payback < 1 mês em qualquer plano pago é forte.

O que é questionável: a projeção assume conversão Cidadão → Investigador de 2%. Para um produto B2B com personas muito específicas (jornalistas, advogados, candidatos), 2% é plausível somente se o produto tiver boa visibilidade com essas personas. A estratégia de distribuição no Paraná via redes de arquitetura é adequada para o lançamento, mas estreita — os planos Investigador e Profissional dependem de jornalistas e advogados que podem não estar nesses canais.

O risco de ação legal (Risco 1) está subestimado. A linguagem de "indícios" protege, mas um órgão que se sente prejudicado pode fazer notificação extrajudicial alegando dano reputacional antes de qualquer processo. O custo de defesa legal — mesmo de uma causa sem mérito — pode ser alto para um produto no estágio inicial. A mitigação mencionada ("consulta preventiva com advogado especialista em direito digital antes do lançamento público") é certa e não deve ser pulada.

O que está faltando: não há estratégia clara para o cenário em que Regis ganhe a eleição no CAU/PR. A oposição vira situação, e o produto perde seu caso de uso original mais impactante (auditar o próprio CAU/PR como oposição). Isso não invalida o produto — mas a narrativa de go-to-market precisa de uma versão que funcione independentemente do resultado eleitoral.

---

### 2.13 API Comercial (doc 13)

**Nota: ✅ Sólido**

O doc 13 é o mais completo e profissional da coleção. A autenticação via `X-API-Key` (distinta do JWT de sessão) é a decisão correta para integração backend-to-backend. O sandbox environment é uma adição de valor real para clientes técnicos. Os casos de uso reais (consultoria política, jornal, escritório de advocacia) são concretos e bem pensados. O SDK Python e TypeScript com exemplos de uso real é um diferencial.

O que é problemático: o endpoint de chat na API (`POST /chat`) tem um design diferente do endpoint de chat no dashboard (`POST /orgaos/{slug}/chat/sessoes/{sessao_id}/mensagens`). O endpoint da API recebe `orgao_slug` e `session_id` no body, enquanto o endpoint do dashboard usa path parameters para ambos. Isso cria dois sistemas de chat com lógica diferente para manter. Idealmente, o endpoint da API externa deveria ser um proxy fino sobre o mesmo serviço interno, não uma implementação separada.

O doc 13 especifica que o export consome 100 chamadas da cota, mas não documenta o comportamento quando o export é muito grande (o CAU/PR com 1.789 atos em JSON completo com análises pode ter 50-100MB). Precisa de um mecanismo de export assíncrono (criar job, receber URL de download depois) para volumes grandes, não resposta síncrona.

O que está faltando: não há endpoint para listar e gerenciar `api_keys` no doc 04 (API principal). O doc 13 menciona que o usuário gera API Keys no dashboard em "Configurações → API Keys", mas não há endpoint correspondente no doc 04. Isso precisa ser adicionado.

---

## 3. Riscos Críticos Antes de Codar

### Risco 1 — Inconsistência nos nomes e preços dos planos entre documentos

**O problema:** O doc 02 (seed SQL) cria planos `free/pro/enterprise` a R$0/R$297/R$997. O modelo comercial atual usa `cidadao/investigador/profissional/api_dados` a R$0/R$197/R$597/R$1.997. O doc 05 ainda menciona "Free: 20 perguntas/mês" mas o doc 12 define 5 para Cidadão. O código de autorização usa `user.plano.nome == "free"` — se o nome mudar, tudo quebra.

**Impacto:** Alto. Vai gerar bugs de autorização difíceis de rastrear. O retrabalho de renomear planos depois que estão no banco e em código é custoso.

**Solução:** Decidir os nomes finais dos planos antes de escrever qualquer linha de código de autorização. Atualizar o seed SQL, o doc 02, e criar uma tabela de equivalência. Usar constantes no código (`PLANO_CIDADAO = "cidadao"`) em vez de strings literais espalhadas.

---

### Risco 2 — Tabela de API Keys não existe no schema

**O problema:** O doc 13 documenta completamente o sistema de API Keys para o plano API & Dados. Não existe tabela correspondente no doc 02. O sistema de autenticação via `X-API-Key` precisa armazenar, validar e revogar chaves.

**Impacto:** Alto. O plano mais caro do produto (R$1.997/mês) não pode ser implementado sem essa tabela.

**Solução:** Criar a tabela `api_keys` antes de começar. Estrutura mínima: `id`, `user_id`, `nome`, `chave_hash` (nunca armazenar a chave em texto claro — armazenar SHA256), `ultimo_uso`, `ativo`, `criado_em`, `revogado_em`. Adicionar ao doc 02.

---

### Risco 3 — RLS policy com `USING (TRUE)` cria leak de dados

**O problema:** O doc 06 tem uma policy de RLS que libera SELECT para todos os usuários autenticados sem restrição de tenant. Em um ambiente onde o frontend acessa Supabase diretamente (comum com Supabase Auth), qualquer usuário pode consultar atos de qualquer tenant fazendo uma query direta no Supabase.

**Impacto:** Crítico de segurança. Compromete o modelo de multi-tenancy e potencialmente viola contratos com clientes que esperavam isolamento.

**Solução:** Remover a policy incorreta. Garantir que a policy `user_reads_own_tenants` seja a única em vigor para SELECT. Testar explicitamente tentando acessar dados de outro tenant com token válido de usuário diferente.

---

### Risco 4 — Webhook de onboarding de novo usuário não documentado

**O problema:** Quando o usuário se cadastra via Supabase Auth, não há mecanismo especificado para criar o registro correspondente na tabela `users` com o `plano_id` do Cidadão. Todos os endpoints do backend assumem que `users` existe — sem esse registro, qualquer chamada autenticada vai quebrar com um erro obscuro.

**Impacto:** Alto. Todo novo usuário vai ter uma conta quebrada no momento do cadastro.

**Solução:** Implementar um Supabase Database Webhook (ou Supabase Edge Function) que cria o registro em `users` quando um novo usuário é criado no Auth. Alternativamente, o endpoint `POST /auth/signup` pode fazer isso explicitamente. Decidir qual abordagem e implementar primeiro.

---

### Risco 5 — Deduplicação de nomes de pessoas não tem algoritmo definido

**O problema:** O grafo de pessoas (`pessoas`, `aparicoes_pessoa`, `relacoes_pessoas`) depende de identificar que "JOÃO DA SILVA", "João Silva" e "Dr. João da Silva Santos" são a mesma pessoa. O doc 07 menciona `NormalizadorNomes.sao_a_mesma_pessoa()` mas não especifica o algoritmo. Sem isso, o grafo vai ter centenas de duplicatas.

**Impacto:** Alto. O grafo de pessoas é uma feature central do produto. Com duplicatas, as estatísticas de aparições ficam erradas, as relações ficam incorretas, e o "score_concentracao" perde significado.

**Solução:** Antes de implementar o grafo, decidir o algoritmo. Opções: (1) fuzzy matching com `rapidfuzz` usando threshold de 85% de similaridade; (2) pedir ao Haiku que normalize os nomes para uma forma canônica no prompt de triagem; (3) combinação de ambos. A opção 2 é elegante porque aproveita a IA já sendo chamada para cada ato.

---

### Risco 6 — Migração automática no startup pode causar race condition em deploy

**O problema:** Rodar `alembic upgrade head` no startup do FastAPI significa que se dois containers subirem simultâneamente durante um rolling deploy, dois processos tentam aplicar a mesma migração ao mesmo tempo. Alembic usa uma tabela `alembic_version` como lock, mas sem lock distribuído real, podem ocorrer erros.

**Impacto:** Médio. Pode travar o deploy e requerer intervenção manual para resolver o estado inconsistente do banco.

**Solução:** Mover a migração para um step dedicado no CI/CD antes do deploy. No Railway, isso pode ser um "release command" que roda antes dos containers subirem. Remover a chamada de `alembic upgrade head` do `lifespan` do FastAPI.

---

### Risco 7 — Ausência de especificação para alertas por email

**O problema:** Os alertas por email (novos atos suspeitos, progresso de campanhas de patrocínio, entrega de auditoria) são mencionados em múltiplos documentos como funcionalidade central do plano Investigador. Não há especificação técnica de como são disparados — quando exatamente, qual o template, quem recebe, como o usuário configura quais alertas quer.

**Impacto:** Médio-alto. É uma feature que o plano Investigador vende explicitamente. Construir isso depois pode ser mais complexo que parece.

**Solução:** Antes de implementar o fluxo de scraping e análise, definir: (1) que eventos disparam alertas; (2) como o usuário configura preferências de alerta; (3) qual a estrutura da task Celery que enfileira emails via Resend; (4) qual o template mínimo para o MVP.

---

### Risco 8 — O JSON inválido da Claude API vai acontecer em produção sem tratamento

**O problema:** O pipeline de análise espera JSON válido de volta do Haiku e do Sonnet. Em produção com 1.171+ atos, a Claude vai eventualmente retornar JSON malformado (truncado por `max_tokens`, com caracteres especiais não escapados, ou com erro de formatação). O código atual usa `json.loads()` sem try/except — uma resposta inválida vai derrubar a task Celery e o ato ficará com status `erro`.

**Impacto:** Alto. Em uma rodada de 1.171 atos, mesmo 1% de falha gera ~12 atos sem análise. Sem tratamento, o erro é silencioso (registrado no banco como `erro` mas sem saber que foi JSON inválido).

**Solução:** Envolver todo `json.loads(response.content[0].text)` em try/except. Em caso de falha, logar o texto bruto (primeiro 500 caracteres), tentar extrair campos críticos com regex, e só então marcar como erro. Adicionar `response_format` instruções no prompt para reforçar que o JSON deve ser válido.

---

## 4. Inconsistências Remanescentes

**Planos — nomes e limites de chat:**
O doc 02 (seed SQL) usa `free/pro/enterprise`. O doc 00 e doc 12 usam `cidadao/investigador/profissional/api_dados`. O doc 05 diz "Free: 20 perguntas/mês". O doc 12 diz 5 perguntas para Cidadão. O CLAUDE.md diz 5 perguntas para Cidadão. Qual prevalece: 5 ou 20? O doc 11 diz "Free: 20 perguntas/mês" na seção de comportamento por plano. A fonte mais recente (CLAUDE.md e doc 12) diz 5. Adotar 5.

**Frontend — Next.js vs. Vite:**
O doc 06 menciona "Frontend Next.js usa React que escapa HTML por padrão". O doc 10 usa `process.env.NEXT_PUBLIC_POSTHOG_KEY` em vez de `import.meta.env.VITE_POSTHOG_KEY`. A decisão do fundador é Lovable (React + Vite). Os docs 06 e 10 têm resquícios de Next.js que precisam ser corrigidos antes de implementar.

**Rate limiting — endpoints públicos:**
O doc 04 diz "API pública (Free): 60 req/hora". O doc 06 diz "Endpoints públicos: 30 req/minuto por IP". São janelas de tempo diferentes (hora vs. minuto) e valores diferentes. Qual se aplica a usuários Free? Precisam ser reconciliados numa tabela única de rate limiting.

**Webhook de Stripe para doações:**
O doc 04 descreve o endpoint `POST /campanhas/{id}/doacoes/confirmar` como o handler do webhook Stripe. O doc 11 (Webhooks de Stripe) lista apenas eventos de assinatura (`customer.subscription.*`, `invoice.*`). O evento `payment_intent.succeeded` para doações de patrocínio não está na lista do doc 11, mas está descrito no doc 04. Os dois precisam estar na mesma lista para não ser esquecido na implementação.

**Access antecipado de 48h para doadores:**
Mencionado no doc 05 (página de campanha), no doc 12 (benefícios para doadores) e no doc 13 (acesso antecipado como benefício do plano API). Não há nenhum campo no schema, nenhum endpoint na API, e nenhum mecanismo técnico descrito em nenhum documento. É uma promessa comercial sem implementação técnica definida.

**Número de atos do CAU/PR:**
O CLAUDE.md diz 551 portarias + 1.238 deliberações = 1.789. O doc 03 diz "1.171 atos". O doc 11 diz "1.789 atos". O doc 04 (exemplo de resposta) diz "1.789 atos". A diferença entre 1.171 e 1.789 é significativa — o doc 03 provavelmente usa só os que têm PDF disponível, e os documentos de produto usam o total. Isso deve ser deixado explícito no código (distinção entre `total_atos` e `atos_com_pdf`).

---

## 5. O Que Está Muito Bom (não mudar)

**A separação Haiku + Sonnet está certa.** Haiku processa todos os atos em lote, Sonnet aprofunda só os críticos. Isso é a decisão de custo mais importante do produto. O custo estimado de ~$10 por rodada do CAU/PR é realista e validado pelo teste com PDFs reais. Não tentar otimizar isso antes de ter dados de produção.

**O schema de banco está correto na sua estrutura fundamental.** A separação `atos` / `conteudo_ato` é inteligente. A tabela `irregularidades` extraindo dados do JSONB para queries rápidas é o padrão certo (JSONB para flexibilidade, tabela relacional para performance de filtragem). A tabela `padroes_detectados` como entidade de primeiro nível — não derivada — permite edição manual e rastreabilidade.

**O prompt caching está no lugar certo.** Cachear o system prompt com o regimento interno (8.000 tokens) e não cachear o user prompt (360 tokens por ato) é a configuração de máxima economia. Não mexer nisso.

**O mecanismo de Patrocine uma Auditoria é genuinamente diferenciado.** A combinação de votos gratuitos + doações via Stripe + benefício de 1 mês Investigador para doadores (primeira doação) + acesso antecipado é um loop de engajamento que vai funcionar. É o segundo maior diferencial do produto depois da análise de IA.

**A decisão de RAG sobre dados pré-computados no chat está certa.** Re-ler os PDFs a cada pergunta seria inviável em custo e latência. Navegar o banco de análises já computadas é a arquitetura correta para o caso de uso.

**A infraestrutura de logs em três camadas é sólida.** Structlog para logs de aplicação, PostgreSQL para auditoria de usuário, PostHog para analytics de produto. São ferramentas corretas para cada propósito e não há sobreposição desnecessária.

**O ambiente sandbox para a API comercial é a decisão certa.** Clientes técnicos precisam de um ambiente seguro para desenvolver integrações. Colocar isso na documentação desde o início evita que vire um débito técnico depois.

**A policy de não afirmar crimes e usar linguagem de indícios está certa juridicamente.** É também o que mantém a IA honesta — ela não tem dados suficientes para afirmar nada além do que os documentos mostram.

---

## 6. O Que É Questionável (merece discussão antes de codar)

**1. Lovable como plataforma de frontend.**
Lovable abstrai o deploy mas também abstrai o controle. Quando precisar de configuração específica de CORS, headers de segurança customizados, ou integração com ferramentas de CI/CD além do GitHub push, a plataforma pode ser um limitante. O benefício de geração assistida de UI é real, mas o lock-in em uma plataforma de terceiro para o frontend de um produto SaaS sério é um risco que merece ser reconhecido conscientemente, não por omissão.

**2. O plano Cidadão com 5 perguntas de chat/mês pode ser restritivo demais para viralização.**
A estratégia de go-to-market depende de usuários gratuitos compartilhando achados e trazendo novos usuários. Se o limite de 5 perguntas for atingido na primeira sessão de uso (o que é provável para um usuário engajado), a conversão vai parecer forçada — "pague ou pare". 5 perguntas é provavelmente certo para usuário casual, mas considerar 10-15 para o lançamento e ajustar com dados.

**3. O texto extraído do PDF ser armazenado em `conteudo_ato.texto_completo` é uma decisão de make vs. buy de storage.**
Com 1.789 atos × ~360 tokens × ~4 bytes/token = ~2.5MB para o CAU/PR. Para 20 órgãos × 5.000 atos médios = 100.000 atos = ~140MB. O Supabase Free tem 500MB de banco. Com 10+ órgãos, o banco vai crescer significativamente por causa do texto dos PDFs. Considerar armazenar o texto bruto no Supabase Storage (como arquivo .txt por ato) e manter no banco apenas o texto normalizado truncado (primeiros 5.000 caracteres para preview) ou nada. Isso alonga o prazo para implementar, mas evita um problema de escala real no mês 6.

**4. A meta de R$3.000 por campanha de patrocínio pode ser alta para o lançamento.**
R$3.000 é um número razoável para cobrir custos de IA + overhead, mas vai demorar para a primeira campanha ser bem-sucedida se a base de usuários for pequena. Uma primeira campanha que não atinge a meta em 90 dias destrói o momentum do mecanismo. Considerar começar com meta menor (R$1.500 ou R$2.000) para as 3 campanhas iniciais, e só então ajustar para R$3.000 quando a base crescer.

**5. Guardar o `texto_completo` do ato na resposta do endpoint de detalhe.**
O endpoint `GET /orgaos/{slug}/atos/{ato_id}` retorna o `texto_completo` do ato. Para atos com PDFs longos (múltiplas páginas), isso pode ser 50-100KB por resposta. Para o dashboard web, o texto completo raramente é necessário — o usuário lê a análise da IA, não o texto bruto. Considerar um endpoint separado `GET /orgaos/{slug}/atos/{ato_id}/texto` e retirar o texto completo da resposta padrão. Isso reduz payload e latência.

---

## 7. Gaps Que Devem Ser Documentados Antes de Codar

**7.1 Alertas por Email — Especificação Completa**
O que falta: quais eventos disparam alertas (novo ato classificado como vermelho/laranja? qualquer novo ato do órgão selecionado?); como o usuário configura preferências (toggle por órgão? por nível de alerta? por tipo de irregularidade?); frequência (imediato? diário? semanal?); template de email com campos exatos; lógica da task Celery (agrupamento de múltiplos atos em um único email ou um email por ato?); tabela de preferências de alerta no banco (não existe no schema atual).

**7.2 Acesso Antecipado de 48h para Doadores — Mecanismo Técnico**
O que falta: onde é armazenada a data de expiração do acesso antecipado; como o frontend verifica se o usuário tem acesso antecipado vs. acesso normal; como o tenant muda de status de "acesso antecipado doadores" para "acesso público"; se o acesso antecipado funciona no mesmo endpoint que o acesso normal (com middleware que verifica o período) ou em endpoints separados.

**7.3 Deduplicação de Nomes de Pessoas — Algoritmo e Thresholds**
O que falta: qual biblioteca usar (rapidfuzz, jellyfish, difflib); qual threshold de similaridade (80%? 90%?); como tratar casos de empate (dois nomes igualmente similares a um terceiro); como tratar nomes curtos comuns onde falsos positivos são prováveis ("Silva" + "da Silva" = mesma pessoa?); como o sistema lida com erros de deduplicação detectados manualmente depois (merge de duas pessoas).

**7.4 Geração de PDF de Ficha de Denúncia**
O que falta: qual biblioteca usar para geração de PDF (WeasyPrint, ReportLab, xhtml2pdf, Playwright headless); template HTML da ficha com layout exato; onde o PDF gerado é armazenado (Supabase Storage); vida útil dos PDFs gerados (gerados sob demanda ou pré-gerados durante a análise?); qual endpoint retorna o PDF (o doc 04 tem `GET /orgaos/{slug}/atos/{ato_id}/ficha-denuncia` com `Accept: application/pdf` mas não especifica a geração).

**7.5 Webhook de Onboarding de Novo Usuário (Supabase Auth → tabela users)**
O que falta: qual mecanismo usar (Database Webhook do Supabase? Edge Function? Endpoint próprio chamado pelo frontend após signup?); o que fazer se a criação do registro em `users` falhar (o usuário existe no Auth mas não no banco — como tratar?); qual o `plano_id` default para novos usuários (assumindo que o registro do plano Cidadão existe no banco).

**7.6 Streaming de Chat no Frontend**
O que falta: qual biblioteca usar no frontend para consumir SSE (EventSource nativo? uma lib?); como o Lovable/React vai gerenciar o estado durante o streaming (tokens chegando progressivamente); o que acontece se a conexão SSE cair no meio da resposta (retry? mensagem de erro? resposta parcial salva?); como o custo e o tipo de pergunta são retornados após o streaming terminar.

**7.7 Admin Role no Supabase JWT**
O que falta: como o campo `role: admin` é adicionado ao JWT do Supabase (via `app_metadata` atualizado manualmente? via trigger no banco? via endpoint admin protegido?); quem pode promover um usuário a admin (só via console do Supabase? existe endpoint?); o que acontece se um usuário admin cancela a assinatura (mantém role admin?).

---

## 8. Sugestões de Alto Valor (não estão nos docs, mas seriam ótimas)

**8.1 Página pública indexável por órgão e por ato**

Cada ato com nível de alerta alto deveria ter uma URL pública e indexável pelo Google, mesmo sem login. Exemplo: `digdig.com.br/cau-pr/portaria-678` com título, ementa, nível de alerta, e CTA para ver a análise completa (que requer cadastro). Isso transforma cada análise em uma landing page que pode rankear para buscas como "portaria 678 cau pr irregularidade". O custo de implementação é baixo (uma rota pública no frontend que chama o endpoint público da API), e o valor de SEO e aquisição orgânica é muito alto. É o tipo de distribuição que funciona sem budget de marketing.

**8.2 Modo de comparação entre dois períodos ou duas gestões**

Um endpoint e uma página que comparam métricas entre dois períodos (ex: "Gestão A (2021-2024) vs. Gestão B (2025-atual)"). Pode ser simples: filtrar atos por período e comparar contagens de níveis de alerta, tipos de irregularidade, pessoas mais citadas. Para o contexto político do produto (oposição auditando situação), isso é uma feature de alto impacto que pode ser implementada em uma tarde — toda a lógica está nos dados que já existem. Seria uma das features mais compartilhadas em campanhas eleitorais.

**8.3 Exportação de ficha de denúncia diretamente para Google Docs**

Integração com Google Docs via OAuth para criar um documento pré-formatado com a ficha de denúncia. Jornalistas e assessores políticos (os melhores clientes do plano Investigador) trabalham no Google Workspace. Um botão "Abrir no Google Docs" que cria o documento com título, corpo, referências legais e links para as portarias é uma redução de fricção significativa no workflow deles. Tecnicamente: Google Docs API + OAuth scope de escrita. Não é trivial, mas o impacto no NPS do plano Investigador justifica.

**8.4 Feed RSS público por órgão**

Um feed RSS em `digdig.com.br/cau-pr/feed.rss` com os últimos atos classificados como vermelho e laranja. Jornalistas e advogados que cobrem um órgão específico podem assinar o feed e receber alertas sem precisar de conta ou login. Tecnicamente é trivial (endpoint que retorna XML com os últimos 20 atos críticos). O valor é duplo: adquire usuários que descobrem o produto via RSS reader, e demonstra transparência radical ("nossas análises estão disponíveis mesmo sem cadastro"). Aumenta a confiança no produto.

**8.5 Score de gestão histórico (trend line)**

Além da análise de atos individuais, um "índice de saúde da gestão" calculado mensalmente — uma nota de 0 a 100 baseada na proporção de atos vermelhos/laranjas vs. verde no período. Mostrar como esse score evoluiu ao longo dos anos cria um narrativa poderosa: "a gestão atual tem score médio de 34 vs. 71 da gestão anterior". Tecnicamente é uma view materializada calculada após cada rodada de análise, sem IA adicional. O impacto em termos de viralidade (gráfico compartilhável, título de reportagem) é alto. É o tipo de métrica que um veículo de mídia vai querer publicar.

---

## 9. Ordem Recomendada de Implementação

A sequência recomendada é baseada em duas regras: (1) implementar o que tem mais dependências antes do que depende dele; (2) entregar valor verificável o mais cedo possível para detectar problemas de design antes de acumular débito.

**Fase 0 — Fundações (deve ser feita antes de qualquer código de produto)**

1. Decidir e documentar os nomes finais dos planos e limites de chat
2. Criar a tabela `api_keys` no schema
3. Criar as 4 tabelas de log (consolidar doc 10 no doc 02)
4. Definir o algoritmo de deduplicação de nomes
5. Especificar o mecanismo de onboarding de novo usuário (Auth → banco)
6. Definir como o admin role é adicionado ao JWT do Supabase

**Fase 1 — Backend Core (semanas 1-3)**

1. Setup Railway + banco Supabase + Redis + variáveis de ambiente
2. FastAPI app esqueleto com health check, CORS, Sentry
3. Schema SQL completo no Supabase (incluindo RLS correto)
4. Alembic migrations configurado (sem rodar no startup)
5. Webhook de onboarding de usuário (Auth → tabela users)
6. Autenticação JWT + middleware de plano
7. Seed data (planos, CAU-PR tenant)

**Fase 2 — Pipeline de IA (semanas 3-5)**

1. Celery + Redis configurado
2. Scraper (downloader + extrator de texto) com as fixtures de PDF reais
3. Task `scrape_ato` com deduplicação e rate limiting
4. Task `analisar_lote_haiku` com prompt caching e tratamento de JSON inválido
5. Task `analisar_ato_sonnet` com contexto enriquecido
6. Task `sintetizar_resultados`
7. Rodada completa no CAU/PR e verificação dos resultados

**Fase 3 — API REST (semanas 5-7)**

1. Endpoints de órgãos (público)
2. Endpoints de atos com filtros e paginação
3. Endpoints de pessoas e grafo
4. Endpoints de padrões e irregularidades
5. Endpoints de admin (disparar rodada, status)
6. Endpoints de billing (Stripe integration + webhook)
7. Endpoints de relatórios (gerar + download)

**Fase 4 — Chat (semanas 7-9)**

1. Classificador de pergunta (factual vs. análise)
2. Montagem de contexto RAG por tipo de pergunta
3. Endpoint de chat síncrono
4. Endpoint de chat com streaming (SSE)
5. Controle de cota por plano

**Fase 5 — Frontend (semanas 9-13)**

1. Lovable: setup do projeto, rotas, autenticação Supabase
2. Landing page pública
3. Dashboard de órgãos
4. Lista de atos com filtros
5. Detalhe do ato + ficha de denúncia
6. Grafo de pessoas
7. Interface de chat com streaming
8. Página de planos + Stripe checkout
9. Painel admin

**Fase 6 — Patrocínio e API Comercial (semanas 13-16)**

1. Endpoints de campanhas + votos + doações
2. Webhook Stripe para doações
3. Páginas de patrocínio no frontend
4. Sistema de API Keys (tabela + geração + revogação)
5. Autenticação via X-API-Key
6. Rate limiting e cota por API Key
7. Sandbox environment
8. Webhooks de eventos para clientes API

**Fase 7 — Alertas e Produção (semanas 16-18)**

1. Especificar e implementar alertas por email (Resend)
2. Celery Beat para scraping semanal de novos atos
3. Testes E2E completos
4. Checklist de deploy de produção
5. Lançamento

A Fase 5 (frontend) pode começar em paralelo com a Fase 3 se houver dois desenvolvedores trabalhando, usando dados mockados no frontend enquanto a API é construída.

---

## 10. Checklist Pré-Implementação

### Decisões que precisam ser tomadas agora

- [ ] Nomes finais dos planos confirmados e documentados: `cidadao / investigador / profissional / api_dados`
- [ ] Limites de chat por plano decididos: Cidadão = 5 ou 20?
- [ ] Algoritmo de deduplicação de nomes escolhido (rapidfuzz? Haiku? combinação?)
- [ ] Biblioteca de geração de PDF de ficha escolhida (WeasyPrint? Playwright headless?)
- [ ] Biblioteca de grafo no frontend escolhida (vis-network ou react-force-graph)
- [ ] Mecanismo de acesso antecipado de 48h para doadores especificado tecnicamente
- [ ] Polling vs. WebSocket para status de rodada no admin decidido
- [ ] Estratégia de staging definida (banco separado ou mesmo banco?)

### Schema de banco

- [ ] Seed SQL atualizado com nomes corretos dos planos e preços atuais
- [ ] Tabela `api_keys` criada e adicionada ao doc 02
- [ ] Tabelas de log (`logs_sessao`, `logs_atividade`, `logs_erros_usuario`, `logs_acesso_negado`) adicionadas ao doc 02
- [ ] Tabela de preferências de alertas por email criada
- [ ] Campo ou mecanismo para acesso antecipado de doadores definido
- [ ] RLS policy com `USING (TRUE)` removida e substituída pela policy correta
- [ ] Política de admin role no JWT do Supabase definida e implementada

### Segurança

- [ ] Mecanismo de onboarding de novo usuário (Auth → tabela users) especificado e implementado
- [ ] Confirmado que service_role key nunca vai no frontend
- [ ] Confirmado que API Keys serão armazenadas como hash (não plaintext)
- [ ] Consulta com advogado de direito digital realizada antes do lançamento público

### Pipeline de IA

- [ ] IDs de modelo em variáveis de ambiente (não hardcoded)
- [ ] Retry logic unificado usando `raise self.retry(countdown=N)` (não `time.sleep()`)
- [ ] Handler de JSON inválido implementado com try/except + fallback
- [ ] Deduplicação de atos implementada (INSERT ON CONFLICT)
- [ ] Normalização de encoding usando `ftfy` (ou substituições validadas para todos os órgãos planejados)

### Infraestrutura

- [ ] Migração Alembic movida para step de CI/CD, não startup do FastAPI
- [ ] Railway configurado com release command para migrations
- [ ] Celery Beat configurado para scraping semanal e limpeza de logs
- [ ] Sentry configurado e recebendo eventos de teste
- [ ] Alertas de custo da Claude API configurados (threshold $20)

### Documentação

- [ ] Doc 02 atualizado com todas as tabelas (logs + api_keys)
- [ ] Doc 06 corrigido (remover referências a Next.js)
- [ ] Doc 10 corrigido (variáveis de ambiente Vite, não Next.js)
- [ ] Rate limiting consolidado numa tabela única (reconciliar doc 04 e doc 06)
- [ ] Evento `payment_intent.succeeded` adicionado ao doc 11 (Webhooks Stripe)
- [ ] Endpoint de listagem/gerenciamento de API Keys adicionado ao doc 04

### Antes de cada fase de implementação

- [ ] Lido o documento relevante completamente antes de começar o código
- [ ] Inconsistências identificadas acima resolvidas para o módulo em questão
- [ ] Variáveis de ambiente necessárias listadas e configuradas antes de testar
- [ ] Fixtures de teste criadas antes dos testes (PDFs reais do CAU/PR para testes de extração)
