# Visão Geral e Modelo Comercial
## Plataforma de Auditoria de Atos Administrativos Públicos

**Data:** 22 de abril de 2026  
**Responsável:** Regis Alessander Wilczek  
**Status:** Planejamento aprovado — aguardando implementação

---

## 1. O Produto

Uma plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando inteligência artificial, detectando irregularidades legais, morais e éticas — e apresentando os resultados de forma acessível para jornalistas, advogados, campanhas políticas e cidadãos.

### Proposta de Valor

- **Para campanhas políticas:** evidências concretas e documentadas de má gestão, apresentadas de forma profissional
- **Para jornalistas:** banco de dados auditado de irregularidades, com links para documentos originais
- **Para advogados e ONGs:** base técnica para denúncias formais, com referência a artigos violados
- **Para cidadãos:** transparência real, não apenas acesso a documentos ilegíveis

### Diferencial Competitivo

Não existe hoje no Brasil nenhuma ferramenta que:
1. Baixe automaticamente documentos de órgãos públicos
2. Extraia o texto completo dos PDFs
3. Use IA para analisar irregularidades legais E morais/éticas
4. Construa um grafo de relacionamentos entre pessoas e atos
5. Gere tanto relatórios técnicos quanto fichas de denúncia prontas para uso

---

## 2. Estratégia de Lançamento

### Fase 1 — Lançamento com CAU-PR (MVP)
- Sistema completo no ar com todos os painéis funcionando
- Apenas o CAU/PR disponível como instituição ativa
- Marketing: "O primeiro órgão auditado é o CAU/PR — mais em breve"
- Objetivo: validar o produto, gerar primeiros clientes, criar caso de estudo

### Fase 2 — Expansão por Órgão
Cada novo órgão adicionado é um evento de produto:
- Câmaras Municipais (Curitiba, São Paulo, Rio...)
- Conselhos Profissionais (CREA, CRM, OAB estaduais...)
- Autarquias estaduais
- Tribunais de Contas (complexidade maior)

### Custo de Adicionar Novo Órgão
Para cada novo órgão é necessário:
1. Configurar o scraper (URL, paginação, estrutura HTML)
2. Inserir o regimento/lei orgânica como base de conhecimento
3. Definir as regras específicas daquele órgão
4. Rodar a análise inicial (~$7-15 em API Claude)
5. Revisar e publicar

Estimativa de esforço: **2-5 dias por órgão**.

---

## 3. Modelo de Negócio

### Planos

| Plano | Preço | Órgãos | Análises/mês | Público |
|-------|-------|--------|--------------|---------|
| **Free** | R$ 0 | 1 (visualização) | — | Jornalistas, curiosos |
| **Pro** | R$ 297/mês | Todos disponíveis | Ilimitado | Campanhas, assessorias políticas |
| **Enterprise** | R$ 997/mês | Todos + prioritários | Ilimitado + API | Escritórios de advocacia, ONGs, imprensa |

### Receitas Adicionais
- **Análise sob demanda:** cliente envia um órgão específico, equipe configura e entrega em 5-7 dias — R$ 1.500 por órgão
- **Relatório personalizado:** síntese executiva customizada por um analista humano + IA — R$ 500-2.000
- **White-label:** licenciar a plataforma para partidos políticos ou sindicatos — valor negociado

### Projeção de Receita (conservadora)

| Mês | Free | Pro | Enterprise | MRR |
|-----|------|-----|------------|-----|
| 1 | 50 | 5 | 0 | R$ 1.485 |
| 3 | 200 | 20 | 2 | R$ 7.934 |
| 6 | 500 | 50 | 5 | R$ 19.835 |
| 12 | 1000 | 120 | 15 | R$ 50.565 |

---

## 4. Público-Alvo e Personas

### Persona 1 — O Candidato / Chapa de Oposição
- Precisa de munição documentada para debates e campanha
- Não tem tempo para ler 1.800 portarias
- Quer fichas de denúncia prontas para usar em entrevistas
- **Plano:** Pro

### Persona 2 — O Jornalista Investigativo
- Cobre política local ou conselhos profissionais
- Precisa de dados verificáveis com links para fontes primárias
- Quer alertas quando novos atos suspeitos forem publicados
- **Plano:** Pro ou Enterprise

### Persona 3 — O Advogado / Escritório
- Atua em processos administrativos
- Precisa de levantamento completo de precedentes e irregularidades
- Quer exportar relatórios técnicos com referências legais
- **Plano:** Enterprise

### Persona 4 — O Cidadão Engajado / Ativista
- Acompanha um órgão específico
- Quer entender o que está acontecendo sem ser especialista
- **Plano:** Free

---

## 5. Posicionamento

**Nome sugerido do produto:** `AuditaPublico` / `TranspareceAI` / `VigiaPublico`  
*(nome final a definir)*

**Tagline:** "A IA que lê o que ninguém lê — e diz o que precisamos saber."

**Domínio:** a definir

---

## 6. Métricas de Sucesso

### Produto
- Tempo médio de análise por ato: < 30 segundos
- Taxa de falsos positivos (alertas incorretos): < 10%
- PDFs baixados com sucesso: > 95%
- Disponibilidade do sistema: 99,5%

### Negócio
- CAC (Custo de Aquisição de Cliente): < R$ 200
- LTV (Lifetime Value) Pro: > R$ 2.000
- Churn mensal: < 5%
- NPS: > 40

---

## 7. Roadmap de Produto

### v1.0 — Lançamento (mês 1-3)
- [x] CAU-PR auditado e publicado
- [x] Dashboard com filtros e busca
- [x] Fichas de denúncia exportáveis
- [x] Sistema de planos (Free/Pro/Enterprise)
- [x] Autenticação e multi-tenancy

### v1.5 — Crescimento (mês 4-6)
- [ ] 3-5 novos órgãos adicionados
- [ ] Alertas por email (novos atos suspeitos)
- [ ] API pública para Enterprise
- [ ] App mobile (visualização)

### v2.0 — Escala (mês 7-12)
- [ ] 20+ órgãos ativos
- [ ] Comparativo entre órgãos ("CAU-PR vs CAU-SC")
- [ ] Integração com portais de transparência (dados de contratos, licitações)
- [ ] Dashboard para imprensa (acesso press)
