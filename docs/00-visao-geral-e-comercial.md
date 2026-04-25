# Visão Geral e Modelo Comercial
## Plataforma de Auditoria de Atos Administrativos Públicos

**Data:** 24 de abril de 2026  
**Responsável:** Regis Alessander Wilczek  
**Status:** MVP em produção — pipeline Haiku em andamento (CAU/PR)

---

## 1. O Produto

O Dig Dig é uma ferramenta de fiscalização pública que audita automaticamente atos administrativos de órgãos públicos brasileiros usando inteligência artificial. O sistema baixa os PDFs dos sites oficiais, extrai o texto completo, classifica o nível de risco com Claude Haiku, aprofunda os casos críticos com Claude Sonnet e apresenta os resultados — irregularidades, padrões, pessoas envolvidas e fichas de denúncia — para jornalistas, cidadãos engajados, advogados e pesquisadores.

**Origem real:** Regis passou anos fazendo isso manualmente — primeiro como assessor parlamentar na Câmara de Curitiba (onde descobriu o escândalo da água San Pelegrino), depois como Chefe de Gabinete e Assessor Especial no CAU/PR. O Dig Dig é a ferramenta que não existia enquanto esse trabalho era feito a mão.

### Proposta de Valor

- **Para jornalistas:** banco de dados auditado com links para fontes primárias e fichas de denúncia prontas
- **Para cidadãos engajados:** entender o que está acontecendo em um órgão sem ser especialista em direito
- **Para advogados e ONGs:** levantamento técnico com referência a artigos violados para embasar denúncias formais
- **Para pesquisadores e fiscais políticos:** dados estruturados, exportáveis, rastreáveis até o documento original

### Diferencial

Não existe hoje no Brasil nenhuma ferramenta que:
1. Baixe automaticamente e audite documentos de órgãos públicos com IA
2. Separe irregularidades **legais** (violações diretas ao regimento) de **morais/éticas** (nepotismo, perseguição, concentração de poder)
3. Construa o grafo de relacionamentos entre pessoas, cargos e atos ao longo do tempo
4. Gere fichas de denúncia prontas para uso em imprensa, advocacia e transparência pública
5. Faça tudo isso a um custo previsível — ~$0,012 por ato analisado

### O que a IA não faz

A IA não afirma crimes. Usa linguagem de indício, suspeita e padrão irregular. A conclusão jurídica é sempre do advogado ou do jornalista. O Dig Dig fornece evidências documentadas — não vereditos.

---

## 2. Estratégia de Lançamento

### Fase 1 — MVP com CAU/PR

O CAU/PR é o primeiro órgão auditado porque é o que Regis conhece por dentro. Todos os 551 atos publicados entre 2017 e 2026 estão sendo analisados. Os resultados são o caso de estudo que prova o produto.

**Marketing:** conteúdo orgânico — white papers técnicos, análises publicadas em redes, transparência total sobre o processo. O produto se vende pelo que encontra.

### Fase 2 — Expansão por interesse e doações

Cada novo órgão auditado é decidido pela comunidade: quem doa via /apoiar indica prioridades. Não há campanha de crowdfunding com meta e prazo — há uma fila de órgãos priorizados pelo interesse demonstrado.

Órgãos naturais para a próxima fase:
- Câmaras Municipais (Curitiba, São Paulo, Rio...)
- Conselhos Profissionais (CREA, CRM, OAB estaduais...)
- Autarquias estaduais e federais
- Tribunais de Contas (mais complexos)

### Custo de adicionar novo órgão

1. Configurar o scraper (URL, paginação, estrutura HTML/PDF)
2. Inserir o regimento/lei orgânica como base de conhecimento
3. Rodar análise inicial (~$7–15 em API Claude)
4. Revisar, publicar, comunicar

Estimativa: **2–5 dias por órgão**. O custo de IA é marginal; o custo real é o tempo de configuração e revisão.

---

## 3. Modelo de Negócio

### Posicionamento: O dado é aberto. O trabalho é cobrado.

Todo o conteúdo gerado — fichas de denúncia, análises profundas (Sonnet), scores de risco, indícios e pessoas identificadas — é **gratuito e público**. Qualquer cidadão acessa sem cadastro.

A cobrança recai sobre **uso de IA produtiva**: chat conversacional sobre os atos auditados e geração de documentos prontos (peças jurídicas, artigos para blogs, relatórios em PDF ou .md).

### Planos de Assinatura

| Plano | Preço | Chat IA | Docs gerados/mês | Para quem |
|---|---|---|---|---|
| **Gratuito** | R$ 0 | — | — | Qualquer cidadão — acesso completo a todos os dados e análises |
| **Investigador** | R$ 179/mês | ✅ Teto R$30/mês | 5 (PDF ou .md) | Jornalistas, assessores, candidatos |
| **Patrocinador** ⭐ | R$ 990/ano (~R$82/mês) | ✅ Teto R$30/mês | 5 (PDF ou .md) | Quem apoia a causa — plano anual com desconto + nome listado |
| **Profissional** | R$ 679/mês | ✅ Teto R$114/mês | 15 (PDF ou .md) | Escritórios jurídicos, assessorias, mandatos |
| **API & Dados** | R$ 1.998/mês | via API ilimitado | Ilimitado via API | Plataformas, redações, pesquisa acadêmica |
| **Técnico** | Sob consulta | Ilimitado | Ilimitado | Órgãos públicos, empresas, monitoramento contínuo |

Pagamentos processados via **Mercado Pago** (Brasil-nativo, PIX, cartão, boleto).

**Teto de tokens:** O custo de IA por usuário é controlado por plano. Um usuário Investigador custa no máximo R$30/mês em tokens — garantindo margem positiva em qualquer volume de uso.

### Doações Voluntárias

A página `/apoiar` permite contribuições sem contraprestação — quem acredita no projeto e quer ver mais órgãos auditados contribui como quiser. Não há meta pública nem termômetro. As doações financiam a infraestrutura e o tempo de configuração de novos órgãos.

### Projeção de Receita (conservadora)

| Mês | Investigador | Profissional | API & Dados | MRR |
|-----|--------------|--------------|-------------|-----|
| 1 | 5 | 0 | 0 | R$ 985 |
| 3 | 20 | 2 | 0 | R$ 5.134 |
| 6 | 50 | 5 | 1 | R$ 14.842 |
| 12 | 120 | 15 | 3 | R$ 38.876 |

---

## 4. Público-Alvo e Personas

### Persona 1 — O Jornalista Investigativo

- Cobre política local, conselhos profissionais, autarquias
- Precisa de dados verificáveis com links para fontes primárias
- Quer fichas de denúncia com referências a artigos, prontas para publicar
- **Plano:** Investigador ou API & Dados

### Persona 2 — O Fiscal Político / Conselheiro de Oposição

- Acompanha um órgão específico (câmara, conselho, autarquia)
- Precisa de evidências documentadas para debates, audiências públicas, recursos
- Não tem tempo para ler centenas de portarias manualmente
- **Plano:** Investigador

### Persona 3 — O Advogado / Escritório

- Atua em processos administrativos ou ações populares
- Precisa de levantamento completo de precedentes e irregularidades
- Quer exportar relatórios técnicos com referências legais
- **Plano:** Profissional

### Persona 4 — O Cidadão Engajado / Ativista

- Acompanha um órgão por interesse cívico ou pessoal
- Quer entender o que está acontecendo sem ser especialista
- Usa o chat para fazer perguntas em linguagem natural
- **Plano:** Free ou Investigador

### Persona 5 — O Pesquisador / Acadêmico

- Estuda governança, transparência ou controle social
- Precisa de dados estruturados para análise quantitativa
- **Plano:** API & Dados

### Persona 6 — O Veículo de Imprensa / Plataforma de Dados

- Quer integrar os dados do Dig Dig em sua própria plataforma
- Consome via API REST com webhooks para novos alertas
- **Plano:** API & Dados

---

## 5. Posicionamento

**Nome:** Dig Dig

**Tagline:** "Escavamos os atos públicos. Você decide o que fazer com o que encontramos."

**Tom:** transparência radical, linguagem técnica acessível, sem alarmismo e sem partidarismo. O produto encontra padrões — a interpretação é do usuário.

**Domínio:** digdig.com.br / app.digdig.com.br / api.digdig.com.br

---

## 6. Métricas de Sucesso

### Produto
- Tempo médio de análise por ato (Haiku): < 30 segundos
- Taxa de falsos positivos: < 10%
- PDFs baixados com sucesso: > 95%
- Disponibilidade: 99,5%

### Negócio
- CAC: < R$ 200
- LTV Investigador: > R$ 1.200 (6 meses)
- LTV Profissional: > R$ 3.600 (6 meses)
- Churn mensal: < 5%
- NPS: > 40

---

## 7. Roadmap de Produto

### v1.0 — Lançamento (em andamento)
- [x] CAU/PR analisado (portarias 2017–2026)
- [x] Pipeline Haiku + Sonnet em produção
- [x] White Papers técnicos publicados
- [ ] Dashboard com dados reais conectados
- [ ] Sistema de planos + Mercado Pago
- [ ] Chat conversacional (RAG)

### v1.5 — Expansão (meses 4–6)
- [ ] 3–5 novos órgãos adicionados
- [ ] Deliberações do CAU/PR (595 atos via HTML)
- [ ] OCR para portarias escaneadas (2018–2021)
- [ ] Alertas por email (novos atos suspeitos)
- [ ] API pública (plano API & Dados)

### v2.0 — Inteligência Expandida (meses 7–12)
- [ ] **Gastos com diárias e passagens** — monitoramento automático de despesas de viagem de servidores e conselheiros, cruzamento com calendário de eventos e quórum de votações
- [ ] **Cartões corporativos** — análise de gastos com cartões institucionais, detecção de padrões anômalos por beneficiário, período ou fornecedor
- [ ] **Pedidos de informação automáticos (LAI)** — quando a IA detecta indício e não há documento público, o sistema elabora automaticamente o texto do pedido via Lei de Acesso à Informação e notifica o usuário
- [ ] **Todos os órgãos públicos do Brasil** — escalabilidade horizontal com configuração padronizada de scraper; o objetivo final é cobrir câmaras municipais, conselhos federais e estaduais, autarquias e tribunais de contas de todo o país

### v3.0 — Plataforma (2027+)
- [ ] Comparativo entre órgãos da mesma categoria
- [ ] Integração com dados de contratos e licitações (portal da transparência)
- [ ] Dashboard público para imprensa (acesso press sem login)
- [ ] Grafo nacional de pessoas com múltiplas aparições em órgãos diferentes
