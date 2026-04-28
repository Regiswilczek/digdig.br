import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-09-dados-o-que-fazer")({
  head: () => ({
    meta: [
      { title: "Dados: O Que Fazer Com Eles — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 09: pausa estratégica, tags como primeiro passo de indexação, a evolução da IA e o que acontece quando os dados são bons mas a pergunta mudou.",
      },
      { property: "og:title", content: "Dados: O Que Fazer Com Eles — Dig Dig" },
      {
        property: "og:description",
        content:
          "White Paper Nº 09 do Dig Dig: como o Dig Dig evoluiu de motor de análise para plataforma de inteligência — tags, Dune Analytics, Bud com linhas investigativas, e o próximo sprint.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@600;700&display=swap",
      },
    ],
  }),
  component: Whitepaper09Page,
});

const STYLES = `
  .wp09 { --text:#111111; --muted:#666666; --subtle:#999999; --border:#e5e5e5; --bg:#ffffff; --bg-code:#f5f5f5; --bg-warn:#fffbf0; --border-warn:#f0d060; --max-w:680px;
    font-family:'Inter',system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.75; padding:0 24px; font-size:17px; min-height:100vh;
  }
  .wp09 *, .wp09 *::before, .wp09 *::after { box-sizing:border-box; }
  .wp09 .site-header { max-width:var(--max-w); margin:0 auto; padding:40px 0 48px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .wp09 .wordmark { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
  .wp09 .label { font-size:0.75rem; color:var(--subtle); letter-spacing:0.08em; text-transform:uppercase; }
  .wp09 article { max-width:var(--max-w); margin:0 auto; padding:56px 0 80px; }
  .wp09 .post-header { margin-bottom:48px; }
  .wp09 .post-label { display:inline-block; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--subtle); margin-bottom:20px; }
  .wp09 h1 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2.1rem; line-height:1.2; letter-spacing:-0.03em; margin-bottom:20px; }
  .wp09 .byline { font-size:0.88rem; color:var(--muted); }
  .wp09 .byline strong { font-weight:600; color:var(--text); }
  .wp09 hr { border:none; border-top:1px solid var(--border); margin:44px 0; }
  .wp09 h2 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.35rem; letter-spacing:-0.02em; margin:44px 0 16px; }
  .wp09 h3 { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1.05rem; letter-spacing:-0.01em; margin:28px 0 10px; }
  .wp09 p { margin-bottom:1.1em; }
  .wp09 ul, .wp09 ol { margin:0 0 1.1em 1.5em; }
  .wp09 li { margin-bottom:0.4em; }
  .wp09 strong { font-weight:600; }
  .wp09 code { font-family:'SF Mono','Fira Code',monospace; font-size:0.82em; background:var(--bg-code); padding:1px 5px; border-radius:3px; }
  .wp09 .callout { background:var(--bg-warn); border-left:3px solid var(--border-warn); padding:16px 20px; margin:24px 0; font-size:0.93rem; line-height:1.6; }
  .wp09 .callout.info { background:#f5f9ff; border-left-color:#3366cc; }
  .wp09 .callout.success { background:#f0faf4; border-left-color:#2d7d46; }
  .wp09 .callout a { color:inherit; }
  .wp09 .stat-row { display:flex; gap:32px; margin:28px 0; flex-wrap:wrap; }
  .wp09 .stat { display:flex; flex-direction:column; }
  .wp09 .stat .num { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2rem; letter-spacing:-0.03em; }
  .wp09 .stat .desc { font-size:0.78rem; color:var(--muted); letter-spacing:0.02em; }
  .wp09 .agent-block { border:1px solid var(--border); border-radius:6px; padding:20px 24px; margin:20px 0; }
  .wp09 .agent-block.piper { border-left:4px solid #3366cc; }
  .wp09 .agent-block.bud   { border-left:4px solid #c05000; }
  .wp09 .agent-block.zew   { border-left:4px solid #6600cc; }
  .wp09 .agent-header { display:flex; align-items:baseline; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
  .wp09 .agent-name { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.01em; }
  .wp09 .agent-model { font-size:0.78rem; letter-spacing:0.04em; color:var(--muted); font-weight:600; }
  .wp09 .agent-block p { font-size:0.92rem; margin-bottom:0.6em; }
  .wp09 .agent-block p:last-child { margin-bottom:0; }
  .wp09 .prev-paper { display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--muted); text-decoration:none; margin-bottom:40px; }
  .wp09 .prev-paper:hover { color:var(--text); }
  .wp09 .nota-metodologica { background:#f9f9f9; border:1px solid var(--border); border-radius:6px; padding:20px 24px; margin-bottom:40px; font-size:0.88rem; }
  .wp09 .nota-metodologica h4 { font-family:'Inter Tight',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
  .wp09 .tag-grid { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 24px; }
  .wp09 .tag-pill { font-size:0.75rem; font-weight:600; letter-spacing:0.04em; padding:4px 10px; border-radius:12px; background:var(--bg-code); border:1px solid var(--border); color:var(--muted); }
  .wp09 .signature { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
  .wp09 .signature .name { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1rem; letter-spacing:-0.01em; }
  .wp09 .signature .role { font-size:0.83rem; color:var(--muted); margin-top:4px; }
  .wp09 .post-footer { margin-top:56px; padding-top:28px; border-top:1px solid var(--border); font-size:0.83rem; color:var(--subtle); font-style:italic; }
  .wp09 .site-footer { max-width:var(--max-w); margin:0 auto; padding:32px 0 56px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--subtle); }
  @media(max-width:600px){
    .wp09 h1{font-size:1.75rem;}
    .wp09 .site-footer{flex-direction:column;gap:8px;}
    .wp09 .stat-row{gap:20px;}
    .wp09 .agent-header{flex-direction:column;gap:4px;}
  }
`;

function Whitepaper09Page() {
  return (
    <div className="wp09">
      <style>{STYLES}</style>

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 09</span>
      </header>

      <article>
        <Link to="/whitepaper-07-pre-auditoria-integrada" className="prev-paper">
          ← White Paper Nº 07: Pré-Auditoria Integrada do CAU/PR
        </Link>

        <div className="post-header">
          <span className="post-label">Dados · Estrutura · IA · Próximos Passos</span>
          <h1>Dados: O Que Fazer Com Eles</h1>
          <p className="byline">
            <strong>Regis Wilczek + Dig Dig Bud (Claude Sonnet 4.6)</strong>
            {" "}—{" "}Abril de 2026
          </p>
        </div>

        <div className="nota-metodologica">
          <h4>Contexto deste paper</h4>
          <p>O White Paper Nº 07 terminou com uma promessa: o que o Zew vai fazer. Este paper documenta o que aconteceu entre essa promessa e o momento em que você lê este texto. Não é um relatório de análise — é um relatório de evolução. A pergunta mudou. Deixou de ser "o que a máquina encontrou?" e passou a ser "o que fazemos com o que a máquina já encontrou?". A resposta a essa pergunta está moldando a próxima fase do Dig Dig.</p>
        </div>

        <hr />

        <h2>1. Uma Pausa Necessária — e o Que Ela Revelou</h2>

        <p>Parei as rodadas de análise. Não porque os dados são ruins — são bons, as amostras são representativas, o sistema funciona. Parei porque percebi que estava acumulando dados sem ter uma resposta clara para a pergunta mais importante: <em>onde isso vive? Como esse dado fica acessível, consultável, utilizável por quem não sabe SQL e não vai instalar um dashboard de BI?</em></p>

        <p>A transparência pública não é uma questão de ter os dados — é uma questão de ter os dados em um formato que as pessoas consigam usar. Toda investigação jornalística relevante das últimas décadas foi possível não por acesso a dados, mas por acesso a dados estruturados de forma que permitem cruzamento. Panama Papers, Lava Jato, Pandora Papers — o que esses projetos têm em comum não é o volume, é a arquitetura.</p>

        <p>O Dig Dig tem o volume. O que estamos construindo agora é a arquitetura.</p>

        <div className="callout info">
          <strong>Para entender a escala do que está em jogo:</strong> publicamos em <Link to="/escala" style={{ color: "inherit" }}>digdig.com.br/escala</Link> uma estimativa do universo de documentos públicos no Brasil. Os números são difíceis de absorver — mas são reais. O CAU/PR é o piloto. O que estamos aprendendo aqui vai determinar como escalamos para o resto do país.
        </div>

        <hr />

        <h2>2. A Conversa com um Amigo — Questões de Indexação</h2>

        <p>Em uma conversa com um amigo com experiência em inteligência de dados, o problema da estruturação ganhou um ângulo que não tinha considerado.</p>

        <p>Dan trouxe o exemplo do <strong>Dune Analytics</strong>: uma plataforma que permite que qualquer pessoa construa dashboards e faça queries sobre dados de blockchain sem saber escrever código. Não é um sistema fechado com relatórios pré-definidos — é uma infraestrutura de dados indexados onde o usuário define a pergunta. Um jornalista pode perguntar "quais portarias envolvem esse CPF especificamente?". Um advogado pode perguntar "qual a distribuição temporal dos processos disciplinares neste órgão?". Um pesquisador pode perguntar "quais servidores aparecem juntos em mais de dez atos?". Cada um com a sua pergunta, todos respondidos pela mesma base.</p>

        <p>O que isso exige é que os dados não estejam apenas armazenados — estejam <em>indexados</em>. Cada ato, cada pessoa, cada valor monetário, cada irregularidade precisa ser um objeto consultável com suas próprias propriedades e relações. O que temos hoje no banco do Dig Dig é exatamente isso — um grafo de relações entre atos, pessoas, tags, scores e irregularidades. O que ainda não temos é a interface que deixa esse grafo acessível sem mediação técnica.</p>

        <p>Está nos planos de curto prazo. Dan plantou a semente certa na hora certa.</p>

        <div className="callout">
          <strong>O modelo Dune como referência de produto.</strong> O que é poderoso na arquitetura do Dune não é a tecnologia — é o princípio de que dados complexos podem ser democratizados sem simplificação. O usuário não recebe um resumo; recebe acesso à base completa com ferramentas de consulta. Para transparência pública, esse modelo é especialmente relevante: não queremos ser o árbitro do que é importante. Queremos que qualquer pessoa com uma pergunta possa encontrar a resposta nos dados.
        </div>

        <hr />

        <h2>3. Tags — O Primeiro Passo da Indexação</h2>

        <p>A ideia das tags também veio dessa conversa. A lógica é simples: se você quer que os dados sejam consultáveis por tipo de irregularidade, você precisa que cada ato seja marcado com os tipos de irregularidade que apresenta — não apenas com um score numérico e um nível de alerta, mas com categorias nomeadas e consistentes.</p>

        <p>Implementamos uma taxonomia de 60 tipos de irregularidade em 9 categorias:</p>

        <div className="tag-grid">
          {["fraude_financeira", "sobrepreco", "fracionamento_despesa", "dispensa_indevida", "nepotismo", "concentracao_poder", "perseguicao_politica", "ad_referendum_excessivo", "comissao_irregular", "opacidade_deliberada", "violacao_lai", "conflito_interesse", "cabide_emprego", "desvio_finalidade", "…"].map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>

        <p>Cada tag tem código fixo, categoria, nível de gravidade (<em>baixa, média, alta, crítica</em>) e uma justificativa que cita o trecho exato do documento que a fundamenta. Não é um rótulo — é uma evidência indexada.</p>

        <p>O fluxo funciona em duas camadas. O <strong>Piper</strong> (triagem) identifica as tags com base no texto do ato. O <strong>Bud</strong> (análise profunda) revisa esse trabalho com contexto histórico: confirma as tags que têm base real, remove os falsos positivos, adiciona o que o Piper não viu por falta de contexto — especialmente os padrões que só aparecem quando se cruza o ato atual com o histórico de aparições das pessoas envolvidas. Cada mudança de tag fica registrada com autor, modelo e motivo. O histórico completo de revisões é auditável.</p>

        <p>O próximo sprint vai expandir essa lógica para o que chamamos de <em>meta-tags</em> — classificadores de padrão, não de irregularidade individual. A diferença: uma tag diz "este ato tem indício de nepotismo". Uma meta-tag diz "este ator tem padrão sistemático de nepotismo ao longo de 24 meses". É a diferença entre catalogar eventos e nomear comportamentos.</p>

        <div className="callout success">
          <strong>Por que isso importa comercialmente.</strong> Um advogado que precisa de evidências sobre práticas de um órgão específico não quer ler 700 portarias. Quer uma query: "mostre todos os atos com tag <code>comissao_irregular</code> entre 2023 e 2026 envolvendo os nomes X e Y". O sistema já tem os dados para responder isso. As tags são o que torna essa resposta possível sem intervenção manual.
        </div>

        <hr />

        <h2>4. A Evolução da IA — O Que Mudou nos Critérios</h2>

        <p>Passei um tempo considerável refinando os critérios de auditoria dos modelos. Não é trabalho visível — não aparece no frontend, não muda o número de atos analisados — mas é o que determina a qualidade do que o sistema produz.</p>

        <p>O prompt base do sistema ganhou três elementos que estavam ausentes na versão anterior:</p>

        <p><strong>O Mindset de Auditoria.</strong> Os modelos agora têm instrução explícita de que omissões são evidências tão válidas quanto afirmações. Um ato que gera despesa mas não cita dotação orçamentária não é um ato incompleto — é um indício de irregularidade formal. Um ato de nomeação sem critério técnico documentado não é burocracia padrão — é indício de violação do princípio da impessoalidade. Esse deslocamento — de "o que o ato diz" para "o que o ato deveria dizer e não diz" — é o que separa triagem de auditoria.</p>

        <p><strong>A base legal expandida.</strong> A KnowledgeBase do sistema era composta exclusivamente pelo Regimento Interno do CAU/PR. Agora inclui excerpts curados de seis instrumentos legais: o Art. 37 da CF/88 (princípios LIMPE), a Lei 12.378/2010 (lei de criação do CAU), a Lei 8.429/92 (improbidade administrativa), as Resoluções CAU/BR nº 51, 91 e 194, as Leis de Licitação 8.666/93 e 14.133/21, e a LAI (Lei 12.527/2011). O modelo agora sabe o que é um ato de improbidade antes de ler o primeiro documento do CAU.</p>

        <p><strong>O princípio de linguagem.</strong> Formalizamos algo que já praticávamos informalmente: o sistema nunca afirma crimes, nunca rotula pessoas como corruptas, nunca conclui sobre dolo. Apresenta indícios, nomeia padrões, documenta suspeitas. A conclusão jurídica pertence ao advogado. O julgamento moral pertence ao leitor. O que o sistema faz é tornar a evidência acessível e estruturada o suficiente para que essas conclusões possam ser alcançadas por quem tem competência para fazê-las.</p>

        <hr />

        <h2>5. O Pipeline — Três Agentes, Uma Arquitetura</h2>

        <p>O pipeline do Dig Dig tem três estágios, cada um com um modelo diferente e uma responsabilidade distinta:</p>

        <div className="agent-block piper">
          <div className="agent-header">
            <span className="agent-name">Piper</span>
            <span className="agent-model">Gemini 2.5 Pro · 1 milhão de tokens de contexto</span>
          </div>
          <p>Triagem investigativa. Primeiro contato com o documento. Piper lê o texto integral — sem truncamento —, classifica o nível de alerta, extrai pessoas, valores e referências cruzadas, e identifica as tags iniciais de irregularidade. O Piper é rápido e abrangente. O contexto de 1 milhão de tokens significa que uma ata plenária de 80 páginas chega inteira ao modelo, sem corte.</p>
          <p>Em benchmarks comparativos, o Piper processa mais volume e apresenta recall mais alto que o Bud — encontra mais coisas. O Bud é mais preciso — encontra as coisas certas. A divisão de papéis é intencional: Piper varre, Bud investiga.</p>
        </div>

        <div className="agent-block bud">
          <div className="agent-header">
            <span className="agent-name">Bud</span>
            <span className="agent-model">Claude Sonnet 4.6 · Análise profunda · Casos críticos</span>
          </div>
          <p>Análise aprofundada dos atos classificados como laranja e vermelho pelo Piper. O Bud não lê apenas o ato — lê o ato com contexto. Recebe a análise do Piper, o histórico completo das pessoas envolvidas no corpus inteiro do órgão, e os textos dos atos referenciados no documento.</p>
          <p>A atualização mais significativa desta fase foi a implementação das <strong>linhas investigativas</strong>: para cada pessoa mencionada no ato, o Bud recebe as últimas 30 aparições dessa pessoa no corpus, distribuídas por tipo (nomeado, exonerado, membro de comissão, investigador, defensor) e por período. O modelo pode identificar que uma pessoa nomeada para uma comissão investigativa apareceu 12 vezes antes em funções semelhantes — padrão que um ato isolado nunca revelaria.</p>
          <p>Isso é algo que, no White Paper Nº 07, descrevemos como tarefa do Zew. Conseguimos implementar no Bud nesta atualização.</p>
        </div>

        <div className="agent-block zew">
          <div className="agent-header">
            <span className="agent-name">Zew</span>
            <span className="agent-model">Claude Opus 4.7 · Padrões sistêmicos · Em implementação</span>
          </div>
          <p>O terceiro estágio. O Zew não analisa atos individuais — analisa o corpus como sistema. Seu papel é construir a narrativa que conecta os achados do Piper e do Bud em uma história coerente: grafos de poder, cronologias de decisão, cruzamento entre atas plenárias e portarias, identificação de padrões que só emergem quando o conjunto inteiro é tratado como uma unidade.</p>
          <p>Com as linhas investigativas já implementadas no Bud, o que sobra para o Zew é o que realmente exige o modelo mais capaz: síntese de longa duração, raciocínio sobre ausências e contradições, e a construção de hipóteses que conectam o que foi documentado com o que foi deliberadamente omitido. Estimamos que o Zew vai entregar 30% mais em profundidade e riqueza de resposta que o Bud para as mesmas questões sistêmicas — não por ser mais rápido, mas por pensar mais longo.</p>
        </div>

        <hr />

        <h2>6. O Que Acontece em Paralelo — Features de UI</h2>

        <p>Uma parte do trabalho desta fase raramente aparece nos papers porque acontece em paralelo e em camadas — são as decisões de produto e interface que determinam como os dados chegam ao usuário.</p>

        <p>Adicionamos a exibição de tags nas fichas de atos — chips coloridos por gravidade que tornam imediatamente visível o tipo de irregularidade, sem que o usuário precise ler o texto completo da análise. Atualizamos a exibição de scores para refletir a nova calibração de níveis. Refinamos o fluxo de acesso por plano para separar o que é público do que requer conta.</p>

        <p>Essas mudanças não têm nome bonito — não são features de produto, são a diferença entre um banco de dados e uma plataforma. A distinção que importa para o usuário é simples: antes, para entender o que o sistema encontrou em um ato, era preciso ler. Agora, é possível ver.</p>

        <hr />

        <h2>7. Estado Atual — De Onde Partimos Daqui</h2>

        <div className="stat-row">
          <div className="stat"><span className="num">1.789</span><span className="desc">atos no corpus</span></div>
          <div className="stat"><span className="num">60</span><span className="desc">tipos de tag</span></div>
          <div className="stat"><span className="num">9</span><span className="desc">categorias de irregularidade</span></div>
          <div className="stat"><span className="num">3</span><span className="desc">agentes no pipeline</span></div>
        </div>

        <p>Os dados são reais. As amostras do CAU/PR cobrem portarias, deliberações, atas plenárias e portarias normativas com cobertura superior a 90% do período 2022–2026. Os modelos foram calibrados. A base legal está na KnowledgeBase. As tags estão indexadas.</p>

        <p>A decisão de pausar as rodadas de pipeline foi estratégica, não técnica. O sistema estava produzindo análises corretas sobre uma infraestrutura que ainda não estava pronta para entregar esse valor de forma consultável. Resolver a camada de indexação e interface antes de analisar mais 1.000 atos faz mais sentido do que ter 3.000 atos analisados que ninguém consegue cruzar eficientemente.</p>

        <p>O próximo ciclo de trabalho tem três frentes:</p>

        <ul>
          <li><strong>Meta-tags e padrões.</strong> O sprint de classificação de padrões comportamentais — não apenas irregularidades pontuais, mas comportamentos sistêmicos ao longo do tempo.</li>
          <li><strong>Interface de consulta.</strong> O primeiro protótipo da camada Dune-like: permitir que usuários construam queries sobre os dados sem código.</li>
          <li><strong>Retorno ao pipeline.</strong> Quando a infraestrutura de indexação estiver sólida, voltamos a rodar análises. Piper nos atos pendentes, Bud nos críticos, Zew na síntese final.</li>
        </ul>

        <div className="callout">
          <strong>Uma nota sobre escala.</strong> Em <Link to="/escala" style={{ color: "inherit" }}>digdig.com.br/escala</Link> estimamos o universo de documentos públicos no Brasil que o Dig Dig poderia auditar. O número é grande o suficiente para ser assustador e pequeno o suficiente para ser alcançável. O CAU/PR foi o piloto porque é o órgão que conheço por dentro. O que aprendemos aqui — sobre coleta, análise, indexação, interface — é a metodologia que vai se replicar para cada novo órgão. Resolver bem é mais importante do que resolver rápido.
        </div>

        <hr />

        <h2>8. O que Mudou na Pergunta</h2>

        <p>Quando o Dig Dig começou, a pergunta era operacional: <em>conseguimos extrair e analisar atos administrativos com IA?</em> A resposta foi sim. 1.789 atos, $0,40 por documento, pipeline funcionando.</p>

        <p>Quando o White Paper Nº 07 foi escrito, a pergunta era investigativa: <em>o que o sistema encontrou?</em> A resposta foi detalhada — processos disciplinares secretos, rede de servidores não-eleitos com acesso ao aparato investigativo, 14 atas plenárias ausentes.</p>

        <p>A pergunta agora é estrutural: <em>o que fazemos com o que encontramos, de forma que seja utilizável por quem precisa usar?</em> Não é uma pergunta de produto — é uma pergunta de responsabilidade. Dados que existem mas não são acessíveis têm o mesmo impacto prático que dados que não existem. A transparência real não é ter a informação; é ter a informação organizada de forma que possa ser compreendida, consultada e acionada por quem tem poder de agir sobre ela.</p>

        <p>É isso que estamos construindo.</p>

        <div className="signature">
          <div className="name">Regis Wilczek + Dig Dig Bud</div>
          <div className="role">Fundador, Dig Dig · Claude Sonnet 4.6 · Curitiba, Abril de 2026</div>
        </div>

        <p className="post-footer">
          White Paper Nº 09 do projeto Dig Dig. Série de registro técnico sobre auditoria pública automatizada com IA. Este documento foi produzido colaborativamente entre o fundador do Dig Dig e o Dig Dig Bud (Claude Sonnet 4.6), com base nos dados estruturados no banco de dados do sistema e nas decisões de produto e arquitetura tomadas durante o sprint de abril de 2026. As análises e classificações são instrumentos de investigação — não conclusões jurídicas. Nenhuma afirmação de crime ou responsabilidade individual é feita ou insinuada neste documento.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <Link to="/blog" style={{ color: "inherit", textDecoration: "none" }}>← Todos os White Papers</Link>
      </footer>
    </div>
  );
}
