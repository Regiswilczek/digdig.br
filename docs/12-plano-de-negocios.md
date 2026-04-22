# 12 — Plano de Negócios e Estratégia Comercial — Dig Dig

> **Documento interno para tomada de decisão do fundador.**  
> Revisão: abril/2026. Não é prospecto para investidor.

---

## Sumário

1. [Posicionamento e Proposta de Valor](#1-posicionamento-e-proposta-de-valor)
2. [Modelo de Receita](#2-modelo-de-receita)
3. [Patrocine uma Auditoria](#3-patrocine-uma-auditoria)
4. [Go-to-Market — 3 Fases](#4-go-to-market--3-fases)
5. [Personas](#5-personas)
6. [Projeção de Receita](#6-projeção-de-receita)
7. [Unit Economics](#7-unit-economics)
8. [Métricas de Sucesso](#8-métricas-de-sucesso)
9. [Riscos e Mitigações](#9-riscos-e-mitigações)

---

## 1. Posicionamento e Proposta de Valor

### Nome e Tagline

**Dig Dig** — digdig.com.br  
*"Escavamos os atos públicos. Você decide o que fazer com o que encontramos."*

### O que é, em uma frase

Dig Dig é um motor de busca e análise de atos administrativos públicos brasileiros — portarias, deliberações, resoluções, contratos — processados com IA para que qualquer pessoa os entenda sem ser advogado.

### Por que isso importa

Órgãos públicos publicam milhares de documentos por ano. São PDFs em sites antigos, em linguagem técnica, sem contexto, sem histórico. A informação é pública por lei — ninguém a lê porque ninguém consegue.

Dig Dig não cria o dado. Ele já existe. Nós escavamos, limpamos e entregamos o que está enterrado.

### Diferencial real frente ao que existe

| O que existe hoje | Problema |
|---|---|
| Diário Oficial (busca textual simples) | Retorna documentos brutos, sem análise |
| Portais de transparência dos próprios órgãos | Feitos para cumprir lei, não para ser lidos |
| Jornalistas investigativos | Caros, lentos, cobrem só o que é notícia grande |
| Advogados e auditores | R$300-600/hora, inacessível para cidadão comum |

**Dig Dig:** análise automática, linguagem simples, disponível em segundos, R$0 para o cidadão que só quer ler.

### Posicionamento de marca

Dig Dig não é ativismo. É infraestrutura de informação.

A plataforma não afirma crimes. Não acusa pessoas. Usa linguagem de indícios: "padrão irregular", "suspeita de conflito de interesse", "recomenda-se verificação". A conclusão jurídica fica com quem usa — advogado, jornalista, candidato, cidadão.

Isso é o que mantém a empresa viva juridicamente e politicamente. Neutralidade declarada, utilidade real.

### Texto de venda (homepage, acima da dobra)

> **Você sabia que o CAU/PR publicou 1.789 atos administrativos nos últimos anos?**  
> Quantos você conseguiu ler?  
>
> Dig Dig leu todos. Analisou cada um com inteligência artificial. Classificou os que merecem atenção. E agora você pode perguntar qualquer coisa sobre eles — em português, sem precisar de advogado.  
>
> **Os dados são públicos. Agora eles também são legíveis.**  
> [Acesse grátis] [Ver análise do CAU/PR]

---

## 2. Modelo de Receita

### Assinaturas mensais

| Plano | Preço | Chat/mês | Exportação | Assentos | Para quem |
|---|---|---|---|---|---|
| **Cidadão** | R$ 0 | 5 perguntas | Nenhuma | 1 | Quem quer ler e entender, sem compromisso |
| **Investigador** | R$ 197/mês | 200 | PDF e HTML | 1 | Jornalista, vereador, candidato, militante ativo |
| **Profissional** | R$ 597/mês | 1.000 | CSV, JSON, PDF, HTML | 2 | Escritório jurídico, assessoria política, ONG |
| **API & Dados** | R$ 1.997/mês | — | API REST + webhooks | 5 | Veículos de imprensa, plataformas, pesquisadores |

### Detalhamento por plano

**Cidadão (R$0)**
- Acesso de leitura a todos os órgãos ativos na plataforma
- Visualização das fichas de análise completas (classificação, indícios, contexto)
- 5 perguntas de chat por mês (sem histórico)
- Sem exportação, sem alertas
- Objetivo: volume, viralização, legitimidade política do produto

**Investigador (R$197/mês)**
- Tudo do Cidadão
- 200 perguntas de chat com histórico completo
- Alertas por email quando novo ato do órgão selecionado é publicado e analisado
- Exportação em PDF e HTML das fichas de denúncia
- Filtros avançados por data, tipo de ato, nível de alerta
- Objetivo: monetizar o usuário que usa ativamente — jornalista freelance, candidato a cargo eletivo, assessor parlamentar

**Profissional (R$597/mês)**
- Tudo do Investigador
- 1.000 perguntas de chat
- Exportação em CSV e JSON (para integração com outras ferramentas)
- 2 assentos (times pequenos)
- Histórico completo e auditável de todas as perguntas feitas
- Objetivo: escritórios jurídicos, assessorias políticas, ONGs com operação continuada

**API & Dados (R$1.997/mês)**
- Acesso completo via API REST e webhooks
- 10.000 calls/mês
- 5 assentos com permissões granulares
- SLA de disponibilidade com suporte prioritário
- Objetivo: veículos de imprensa que querem integrar dados ao próprio CMS, plataformas de compliance, pesquisadores acadêmicos com financiamento

### Política de upgrade/downgrade

- Upgrade: imediato, cobra diferença proporcional
- Downgrade: ativo até fim do ciclo atual
- Anual: 2 meses grátis (equivale a ~17% de desconto) — disponível a partir do mês 3

---

## 3. Patrocine uma Auditoria

Esta é a funcionalidade mais original do produto. Não é só monetização — é mecanismo de crescimento, engajamento e PR.

### Conceito

Qualquer pessoa pode nominar um órgão público para ser auditado pelo Dig Dig. A comunidade financia coletivamente a análise. Quando a meta é atingida, a auditoria acontece em até 7 dias úteis e o resultado é publicado para todos — incluindo quem não doou.

### Mecânica completa

**1. Nominação**
- Qualquer usuário cadastrado (mesmo Cidadão gratuito) pode nominar uma instituição
- Formulário: nome do órgão, URL do portal, breve justificativa pública (até 280 caracteres)
- A nominação fica pública imediatamente no termômetro

**2. Votos gratuitos**
- Todo usuário tem 3 votos por mês para distribuir entre qualquer nominação ativa
- Votos influenciam a ordem de visibilidade na página (não substituem doações)
- Objetivo: dar voz a quem não pode pagar e criar sinal orgânico de demanda

**3. Doações**
- Valor mínimo: R$ 25 por doação
- Sem teto máximo por doador
- Pagamento via Stripe (cartão de crédito, PIX)
- Doação é voluntária e não dá direito a reembolso após auditoria executada

**4. Termômetro por instituição**
- Barra de progresso visível publicamente: R$ X de R$ 3.000
- Número de apoiadores (não valor individual — privacidade)
- Prazo de expiração: 90 dias para atingir a meta; se não atingir, doadores recebem crédito em conta para usar em outra nominação ou reembolso

**5. Meta e execução**
- Meta fixa: R$ 3.000 por instituição (cobre custo de IA + scraping + 3 meses de margem de manutenção)
- Ao atingir 100%: status muda para "Em análise"
- Prazo de entrega: 7 dias úteis
- Fila de execução: uma instituição por vez (Dig Dig controla o cronograma)

**6. Benefícios para doadores**
- 6 meses do plano Investigador grátis (independente do valor doado — é por ter doado, não por quanto)
- Badge "Patrocinador [Nome da Instituição]" permanente no perfil
- Acesso antecipado ao resultado 48 horas antes da publicação pública
- Email de atualização de progresso a cada 25% do termômetro preenchido

### Mensagens para o doador

**Email de confirmação de doação:**
> Assunto: Você acaba de financiar uma auditoria pública — obrigado  
>
> Olá, [Nome].  
>
> Sua contribuição de R$ [X] para a auditoria do [Nome do Órgão] foi confirmada.  
>
> A meta está em [Y]% — [Z] pessoas já apoiaram esta auditoria junto com você.  
>
> Quando atingirmos R$ 3.000, a análise começa. Você vai receber o resultado 48 horas antes do público geral.  
>
> Enquanto isso, seu plano Investigador já está ativo na sua conta.  
>
> — Equipe Dig Dig

**Email de progresso (a cada 25%):**
> Assunto: A auditoria do [Órgão] chegou a [25/50/75]%  
>
> A campanha que você apoiou está avançando.  
>
> [Barra de progresso visual: R$ X / R$ 3.000]  
>
> [Número] pessoas já contribuíram. Se você conhece alguém que deveria saber disso, agora é a hora de compartilhar.  
>
> [Link para a página do termômetro]

**Email de entrega (resultado publicado):**
> Assunto: A auditoria do [Órgão] está pronta — você tem acesso exclusivo por 48h  
>
> Olá, [Nome].  
>
> A análise do [Órgão] que você ajudou a financiar está completa.  
>
> Encontramos [X] atos que merecem atenção. [Y] classificados como alto risco. [Z] padrões recorrentes identificados.  
>
> Você tem acesso exclusivo por 48 horas antes da publicação pública.  
>
> [Ver resultado agora]  
>
> Obrigado por tornar isso possível.

### Campanha de lançamento — "Patrocine uma Auditoria"

**O momento certo para lançar:** depois que o CAU/PR estiver ao vivo e funcionando. A auditoria do CAU/PR serve de prova social. O lançamento da mecânica de patrocínio acontece na Fase 2 do go-to-market.

**Primeira campanha pré-selecionada (para gerar momentum imediato):**  
O Dig Dig escolhe 3 instituições pré-nominadas antes de abrir ao público — instituições de alta visibilidade e fácil cobertura de mídia:
1. CAU/PR (já auditado — serve como exemplo do que vem)
2. Uma câmara municipal de cidade média do Paraná
3. Um conselho profissional federal (ex: CRM-PR ou CRC-PR)

**Copy de lançamento para redes sociais:**

> *Post de lançamento — Twitter/X e LinkedIn:*  
>
> O CAU/PR tem 1.789 atos administrativos publicados.  
> Nossa IA leu todos.  
>
> Agora você pode pedir que façamos o mesmo com qualquer órgão público do Brasil.  
>
> Nominie. A comunidade financia. Nós executamos. O resultado é público.  
>
> R$ 25 é o mínimo. Uma auditoria completa custa R$ 3.000.  
>
> digdig.com.br/patrocine  
> #TransparênciaPublica #AuditoriaCidadã

> *Reels/TikTok — roteiro de 30 segundos:*  
>
> [Off] "Você sabia que seu conselho profissional pode estar publicando portarias que violam o próprio regimento interno?"  
> [Corte] Tela do Dig Dig mostrando uma ficha de análise real  
> [Off] "Nós lemos os documentos. A IA analisa. Você pergunta o que quiser."  
> [Corte] Campo de chat sendo preenchido  
> [Off] "E se quiser que a gente audite qualquer órgão do Brasil — qualquer um — você financia coletivamente."  
> [CTA] "R$ 25 já é suficiente. digdig.com.br"

**Sequência de eventos desde o lançamento da campanha:**

| Dia | Ação |
|---|---|
| D+0 | Publicação do resultado do CAU/PR ao vivo no site. Post nas redes com dados reais. |
| D+1 | Email para lista de espera: "O CAU/PR já está analisado. Qual órgão você quer ver a seguir?" |
| D+3 | Abertura oficial da mecânica "Patrocine uma Auditoria" com as 3 instituições pré-nominadas |
| D+5 | Primeira nota para veículos de imprensa regionais do Paraná |
| D+7 | Live no Instagram/YouTube: "Como funciona uma auditoria com IA — mostrando ao vivo" |
| D+14 | Abertura de nominações por usuários (qualquer órgão do Brasil) |
| D+30 | Meta da primeira campanha atingida → comunicado + cobertura de mídia da entrega |

### Como cada nova instituição desbloqueada vira evento de mídia

Cada auditoria entregue tem potencial de cobertura local — a instituição auditada é relevante para uma comunidade específica (arquitetos no caso do CAU, médicos no caso do CRM, contribuintes de um município no caso de câmaras).

**Protocolo de PR para cada entrega:**

1. **48h antes:** Doadores recebem o resultado. São instruídos a compartilhar nas redes profissionais.
2. **No lançamento público:** Release enviado para os 5 principais veículos de imprensa da área de cobertura do órgão + repórteres de investigação que cobrem o setor.
3. **Tweet/post de lançamento:** "[Nome do Órgão] acabou de ser auditado pelo Dig Dig. Encontramos [X] irregularidades de alto risco. Leia aqui: [link]"
4. **Fio de Twitter com os principais achados** — cada ponto é um tweet independente, citável, compartilhável.
5. **PDF executivo disponível para download direto** — facilita o trabalho do jornalista.

O objetivo não é viralidade nacional. É ser a referência local quando o assunto for "atos públicos desse órgão". Uma câmara municipal de Maringá auditada vira notícia em Maringá. Isso gera backlinks, usuários locais e credibilidade segmentada.

---

## 4. Go-to-Market — 3 Fases

### Fase 1: CAU/PR ao vivo (semanas 1–4)

**Objetivo:** Produto funcionando com dados reais, primeiros usuários pagantes, prova de conceito pública.

**Ações:**
- Lançar o site com o CAU/PR completo analisado (551 portarias + 1.238 deliberações)
- Publicar os dados abertamente — toda análise é pública no plano Cidadão
- Divulgar em grupos de arquitetos no WhatsApp e Telegram do Paraná
- Divulgar no LinkedIn de Regis com contexto da candidatura à oposição do CAU/PR
- Meta de usuários: 500 cadastros no mês 1
- Meta de receita: R$0 a R$5.000 (primeiros Investigadores via network pessoal)

**Canais:**
- LinkedIn pessoal (Regis)
- Grupos profissionais de arquitetura/urbanismo no WhatsApp
- Twitter/X com fio explicando o que foi encontrado no CAU/PR
- Abordagem direta a 10 jornalistas que cobrem CAU e conselhos profissionais no Paraná

**Não fazer na Fase 1:**
- Ads pagos (ainda sem dados de conversão)
- Abrir para outros órgãos (foco total no CAU/PR)
- Oferecer demo ou onboarding personalizado

### Fase 2: Campanha "Patrocine uma Auditoria" (semanas 5–12)

**Objetivo:** Escalar o modelo de crowdfunding, gerar cobertura de imprensa, validar willingness-to-pay fora do network pessoal.

**Ações:**
- Lançar a mecânica de patrocínio com as 3 instituições pré-nominadas
- Campanha de conteúdo: um post diário com dado real tirado da análise do CAU/PR
- Email semanal para lista de usuários com "o que encontramos esta semana"
- Primeira campanha atingida → press release para G1, Folha de SP, UOL, Gazeta do Povo, Band Paraná
- Onboarding de primeiros clientes Profissional (escritórios jurídicos, vereadores)

**Canais adicionais:**
- SEO: páginas de resultado de cada órgão auditado indexáveis pelo Google
- Podcasts de direito e política no Brasil (guest do fundador)
- Parceria com associações de vereadores do Paraná

**Meta:**
- 2.000 usuários cadastrados
- 3 campanhas de patrocínio ativas simultaneamente
- Primeira auditoria extra-CAU entregue
- MRR: R$15.000–R$30.000

### Fase 3: Expansão nacional (meses 4–12)

**Objetivo:** Múltiplos órgãos ativos, MRR recorrente estável, mecanismo de aquisição funcionando sem o fundador.

**Ações:**
- Abrir nominações para qualquer órgão do Brasil (câmaras municipais, CRM, CRC, CFM, conselhos estaduais)
- Plano API & Dados: abordar ativamente 10 veículos de imprensa (The Intercept Brasil, Agência Pública, Piauí, Gazeta do Povo)
- SEO estrutural: uma página por órgão, por tipo de ato, por nível de alerta
- Programa de afiliados: jornalistas e advogados ganham comissão por indicação de plano Investigador ou Profissional
- Avaliar contratação de 1 pessoa de suporte/operações

**Meta ao fim de 12 meses:**
- 15+ órgãos analisados
- 50+ campanhas de patrocínio concluídas
- MRR: R$80.000–R$150.000
- CAC estabilizado abaixo de R$200

---

## 5. Personas

### Persona 1 — Cidadão Curioso (plano Cidadão, R$0)

**Nome fictício:** Fernanda, 34 anos, arquiteta, Curitiba  
**Contexto:** Membra do CAU/PR, insatisfeita com a gestão atual. Ouviu falar do Dig Dig num grupo de WhatsApp.  
**Comportamento:** Acessa o site, lê a ficha de 3 portarias que a afetam diretamente, faz 2 perguntas no chat. Compartilha o link no grupo.  
**O que precisa:** Entender o que está acontecendo, sem precisar ser advogada.  
**Valor entregue:** Legibilidade instantânea. Zero fricção para começar.  
**Risco de churn:** N/A (é gratuito — o risco é não converter para Investigador)  
**Gatilho de upgrade:** Precisar exportar uma ficha para levar a uma assembleia ou processo.

---

### Persona 2 — Investigador Ativo (plano Investigador, R$197/mês)

**Nome fictício:** Thiago, 41 anos, jornalista freelance especializado em transparência pública, São Paulo  
**Contexto:** Cobre conselhos profissionais e câmaras municipais. Perde tempo procurando atos em portais ruins.  
**Comportamento:** Usa o chat extensivamente para cruzar informações, exporta fichas em PDF para incluir em reportagens, recebe alertas quando novo ato é publicado.  
**O que precisa:** Velocidade. O que demora 3 dias de pesquisa manual, quer em 15 minutos.  
**Valor entregue:** Alavancagem — produz mais reportagens com menos tempo.  
**Gatilho de contratação:** Ver a análise do CAU/PR no Twitter e perceber que isso existe para qualquer órgão.  
**LTV estimado:** R$197 × 18 meses = R$3.546

---

### Persona 3 — Profissional (plano Profissional, R$597/mês)

**Nome fictício:** Dra. Carla, 48 anos, advogada, sócia de escritório em Maringá  
**Contexto:** Defende profissionais em processos disciplinares perante conselhos. Precisa de evidências de irregularidades processuais dos próprios conselhos.  
**Comportamento:** Usa com um assistente (2 assentos), exporta CSV para cruzar com dados do processo, consulta histórico de deliberações para encontrar precedentes.  
**O que precisa:** Dados estruturados e rastreáveis para fundamentar petições.  
**Valor entregue:** Um assistente de pesquisa jurídica especializado em atos administrativos, disponível 24h.  
**Gatilho de contratação:** Indicação de colega que já usa, ou encontrar o Dig Dig no Google pesquisando por nome de um conselho.  
**LTV estimado:** R$597 × 24 meses = R$14.328

---

### Persona 4 — Operação de Dados (plano API & Dados, R$1.997/mês)

**Nome fictício:** Pedro, 37 anos, editor de dados de veículo de imprensa nacional  
**Contexto:** Mantém banco de dados de atos públicos para alimentar o CMS do veículo. Hoje faz scraping manual instável.  
**Comportamento:** Integra via API, configura webhooks para receber alertas quando ato crítico é publicado, distribui acesso para 5 repórteres.  
**O que precisa:** Dados confiáveis, estruturados, com SLA — não quer manter scraper próprio.  
**Valor entregue:** Infraestrutura de dados que custaria R$50.000+ para construir internamente.  
**Gatilho de contratação:** Proposta comercial direta após o Dig Dig demonstrar cobertura do órgão relevante para o veículo.  
**LTV estimado:** R$1.997 × 36 meses = R$71.892

---

## 6. Projeção de Receita

### Premissas

- Lançamento: maio/2026
- Crescimento de usuários: orgânico via conteúdo + network pessoal nos primeiros 6 meses
- Conversão Cidadão → Investigador: 2% (conservador)
- Churn mensal: 5% (Investigador), 3% (Profissional), 2% (API)
- Doações: média de R$80 por doador, 8% dos usuários Cidadão doa pelo menos uma vez

### Receita por assinatura

| | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|---|
| Usuários Cidadão | 500 | 1.500 | 4.000 | 12.000 |
| Investigador (assinantes) | 8 | 25 | 70 | 200 |
| Profissional (assinantes) | 1 | 4 | 12 | 35 |
| API & Dados (assinantes) | 0 | 1 | 2 | 6 |
| **MRR Assinaturas** | **R$3.173** | **R$9.916** | **R$29.177** | **R$83.239** |

Memória de cálculo — Mês 12:
- Investigador: 200 × R$197 = R$39.400
- Profissional: 35 × R$597 = R$20.895
- API & Dados: 6 × R$1.997 = R$11.982
- **Total assinaturas mês 12: R$72.277** *(nota: tabela acima inclui estimativa de plano anual com desconto aplicado sobre base parcial)*

### Receita de patrocínio ("Patrocine uma Auditoria")

Premissa: meta de R$3.000 por instituição. Margem de contribuição por auditoria após custos de IA e infraestrutura: ~R$2.200 (custo real de IA estimado em ~R$500/rodada + overhead).

| | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|---|
| Campanhas concluídas no mês | 0 | 1 | 3 | 8 |
| Receita bruta de doações | R$0 | R$3.000 | R$9.000 | R$24.000 |
| Margem de contribuição | R$0 | R$2.200 | R$6.600 | R$17.600 |

### Receita total

| | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|---|
| MRR (assinaturas) | R$3.173 | R$9.916 | R$29.177 | R$72.277 |
| Receita de patrocínios | R$0 | R$3.000 | R$9.000 | R$24.000 |
| **Receita total no mês** | **R$3.173** | **R$12.916** | **R$38.177** | **R$96.277** |

### ARR projetado ao fim de 12 meses

**~R$870.000** (extrapolando MRR de dezembro × 12, conservador porque ignora sazonalidade positiva de eleições municipais em 2026).

---

## 7. Unit Economics

### CAC por canal (estimativa mês 1–6)

| Canal | Custo estimado | Conversões esperadas | CAC |
|---|---|---|---|
| Network pessoal (LinkedIn, WhatsApp) | R$0 | 15 Investigadores | R$0 |
| Conteúdo orgânico (Twitter/X, SEO) | R$500/mês (tempo) | 10 Investigadores | R$50 |
| Outreach para jornalistas | R$0 | 5 Investigadores | R$0 |
| Ads (teste no mês 4) | R$2.000 | 8 Investigadores | R$250 |
| **Média ponderada** | | | **~R$80–R$120** |

### LTV por plano

| Plano | Ticket | Churn mensal | Vida média (meses) | LTV |
|---|---|---|---|---|
| Investigador | R$197 | 5% | 20 | R$3.940 |
| Profissional | R$597 | 3% | 33 | R$19.701 |
| API & Dados | R$1.997 | 2% | 50 | R$99.850 |

### Payback period (tempo para recuperar CAC)

| Plano | CAC médio | Margem bruta (estimada 70%) | Payback |
|---|---|---|---|
| Investigador | R$100 | R$138/mês | < 1 mês |
| Profissional | R$200 | R$418/mês | < 1 mês |
| API & Dados | R$500 | R$1.398/mês | < 1 mês |

**Interpretação:** O modelo é altamente eficiente. CAC baixo porque o produto tem distribuição orgânica natural (cada análise publicada é marketing). Payback quase imediato em qualquer plano pago.

### Margem de contribuição por auditoria patrocinada

| Item | Valor |
|---|---|
| Receita por campanha | R$3.000 |
| Custo de IA (Haiku + Sonnet) | R$150–R$500 |
| Custo de infraestrutura (scraping, storage, processamento) | R$100 |
| Custo de Stripe (3,5% + R$0,60) | ~R$105 |
| **Margem de contribuição** | **R$2.295–R$2.645** (~76–88%) |

O benefício de 6 meses de Investigador para doadores (R$197 × 6 = R$1.182 de valor de tabela) é custo de IA marginal muito baixo — o custo incremental de 1 usuário Investigador adicional é próximo de zero. Não entra como custo direto da campanha.

---

## 8. Métricas de Sucesso

### Métricas de produto (monitorar semanalmente)

| Métrica | Definição | Meta mês 3 | Meta mês 12 |
|---|---|---|---|
| DAU/MAU | Usuários ativos diários / mensais | 15% | 25% |
| Perguntas de chat por usuário/mês | Volume médio de uso do chat | 8 | 20 |
| Taxa de retorno D7 | Usuários que voltam em 7 dias | 30% | 45% |
| NPS | Net Promoter Score | > 40 | > 60 |
| Exportações por Investigador/mês | Sinal de uso real | 3 | 8 |

### Métricas de negócio (monitorar mensalmente)

| Métrica | Meta mês 3 | Meta mês 6 | Meta mês 12 |
|---|---|---|---|
| MRR | R$10.000 | R$30.000 | R$80.000 |
| Churn MRR mensal | < 8% | < 6% | < 5% |
| Órgãos auditados (ativos) | 3 | 8 | 20 |
| Campanhas de patrocínio concluídas | 3 | 12 | 40 |
| CAC blended | < R$200 | < R$150 | < R$100 |
| LTV/CAC | > 10x | > 20x | > 30x |

### Métricas de campanha "Patrocine uma Auditoria"

| Métrica | Definição | Meta |
|---|---|---|
| Tempo médio para atingir meta | Dias entre abertura e R$3.000 | < 30 dias |
| % de doadores que viram Investigadores | Conversão pós-benefício | > 25% |
| Doações médias por campanha | Número de apoiadores | > 40 por campanha |
| PR earned per launch | Menções em veículos de imprensa | > 2 por auditoria entregue |

---

## 9. Riscos e Mitigações

### Risco 1 — Ação legal por parte de órgão auditado

**Probabilidade:** Média (especialmente se a análise expõe gestão atual com nomes)  
**Impacto:** Alto (poderia gerar desgaste reputacional ou ordem de retirada de conteúdo)

**Mitigação:**
- Linguagem sempre de "indícios" e "padrões", nunca acusação direta
- Dados usados são públicos por lei — a IA só os organiza
- Termos de uso explícitos: a análise é automatizada e não constitui opinião jurídica
- Disclaimer visível em cada ficha: "Esta análise é gerada por inteligência artificial e não substitui avaliação jurídica profissional"
- Consulta preventiva com advogado especialista em direito digital antes do lançamento público

### Risco 2 — Alucinação da IA gerando análise factualmente incorreta

**Probabilidade:** Baixa (dados são PDFs com texto nativo, prompts são conservadores)  
**Impacto:** Alto (pode destruir credibilidade se viralizar um erro)

**Mitigação:**
- Haiku faz triagem, Sonnet analisa profundamente — dois passes
- Todo trecho de análise é acompanhado da citação direta do texto do ato (rastreabilidade)
- Usuário pode reportar erro em qualquer ficha — revisão manual em até 48h
- Versão beta pública com aviso de "análise em fase de validação"

### Risco 3 — Custo de IA escala antes da receita

**Probabilidade:** Baixa no curto prazo (custo real do CAU/PR foi ~R$500, não R$10.000 como estimativa conservadora inicial)  
**Impacto:** Médio (pode apertar caixa se muitos órgãos forem adicionados sem receita)

**Mitigação:**
- Cada novo órgão só entra quando há receita de patrocínio pagando o custo
- Prompt caching reduz custo em ~60-70% nas rodadas de reprocessamento
- Haiku 4.5 para triagem mantém custo baixo na maior parte do volume
- Plano API & Dados (R$1.997/mês) sozinho cobre custo de 4 novas auditorias por mês

### Risco 4 — Dependência excessiva do CAU/PR como caso de uso

**Probabilidade:** Alta no curto prazo (é o único órgão no lançamento)  
**Impacto:** Médio (se Regis ganhar a eleição ou a pauta esfriar, o produto perde urgência)

**Mitigação:**
- A mecânica "Patrocine uma Auditoria" desvincula o produto de qualquer órgão específico
- SEO estruturado por órgão garante tráfego independente da pauta do dia
- Meta de 8 órgãos ativos ao fim de 6 meses

### Risco 5 — Concorrência ou cópia por ator maior

**Probabilidade:** Baixa no curto prazo (o mercado não conhece o produto ainda)  
**Impacto:** Médio no longo prazo

**Mitigação:**
- Moat está nos dados acumulados (histórico de análises), não só na tecnologia
- Network effect: quanto mais órgãos auditados, mais valiosa a assinatura
- Velocidade de execução: Dig Dig pode ter 20+ órgãos antes de qualquer concorrente perceber a oportunidade
- A relação com a comunidade (arquitetos, jornalistas, advogados) é mais difícil de copiar que o código

### Risco 6 — Baixa conversão de Cidadão para pago

**Probabilidade:** Média  
**Impacto:** Médio (afeta ritmo de crescimento mas não viabilidade)

**Mitigação:**
- Limite de 5 chats/mês no plano gratuito é o principal gatilho de upgrade — testar se está no nível certo
- Email nurturing com exemplos de uso do Investigador para usuários gratuitos ativos
- Oferta de trial: 14 dias de Investigador grátis para usuários que atingirem o limite de chat
- O plano de patrocínio garante 6 meses de Investigador para doadores — cria base pagante via outro vetor

---

*Documento criado em abril/2026. Revisar projeções em julho/2026 com dados reais dos primeiros 3 meses.*
