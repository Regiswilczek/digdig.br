import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-10-antes-da-proxima-onda")({
  head: () => ({
    meta: [
      { title: "Antes da Próxima Onda — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 10: um mês polindo a espinha dorsal do Dig Dig — CVSS-A, meta-tags, painel de conexões, ATLAS, e o que vem agora.",
      },
      { property: "og:title", content: "Antes da Próxima Onda — Dig Dig" },
      {
        property: "og:description",
        content:
          "Um mês organizando: auditoria com lente de cyber segurança (CVSS-A), meta-tags, painel de conexões, o quarto agente (ATLAS) e o painel da conta. O sprint que ninguém vê.",
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
  component: Whitepaper10Page,
});

const STYLES = `
  .wp10 { --text:#111111; --muted:#666666; --subtle:#999999; --border:#e5e5e5; --bg:#ffffff; --bg-code:#f5f5f5; --bg-warn:#fffbf0; --border-warn:#f0d060; --max-w:680px;
    font-family:'Inter',system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.75; padding:0 24px; font-size:17px; min-height:100vh;
  }
  .wp10 *, .wp10 *::before, .wp10 *::after { box-sizing:border-box; }
  .wp10 .site-header { max-width:var(--max-w); margin:0 auto; padding:40px 0 48px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .wp10 .wordmark { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
  .wp10 .label { font-size:0.75rem; color:var(--subtle); letter-spacing:0.08em; text-transform:uppercase; }
  .wp10 article { max-width:var(--max-w); margin:0 auto; padding:56px 0 80px; }
  .wp10 .post-header { margin-bottom:48px; }
  .wp10 .post-label { display:inline-block; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--subtle); margin-bottom:20px; }
  .wp10 h1 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2.1rem; line-height:1.2; letter-spacing:-0.03em; margin-bottom:20px; }
  .wp10 .byline { font-size:0.88rem; color:var(--muted); }
  .wp10 .byline strong { font-weight:600; color:var(--text); }
  .wp10 hr { border:none; border-top:1px solid var(--border); margin:44px 0; }
  .wp10 h2 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.35rem; letter-spacing:-0.02em; margin:44px 0 16px; }
  .wp10 h3 { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1.05rem; letter-spacing:-0.01em; margin:28px 0 10px; }
  .wp10 p { margin-bottom:1.1em; }
  .wp10 ul, .wp10 ol { margin:0 0 1.1em 1.5em; }
  .wp10 li { margin-bottom:0.4em; }
  .wp10 strong { font-weight:600; }
  .wp10 code { font-family:'SF Mono','Fira Code',monospace; font-size:0.82em; background:var(--bg-code); padding:1px 5px; border-radius:3px; }
  .wp10 .callout { background:var(--bg-warn); border-left:3px solid var(--border-warn); padding:16px 20px; margin:24px 0; font-size:0.93rem; line-height:1.6; }
  .wp10 .callout.info { background:#f5f9ff; border-left-color:#3366cc; }
  .wp10 .callout.success { background:#f0faf4; border-left-color:#2d7d46; }
  .wp10 .callout a { color:inherit; }
  .wp10 .stat-row { display:flex; gap:32px; margin:28px 0; flex-wrap:wrap; }
  .wp10 .stat { display:flex; flex-direction:column; }
  .wp10 .stat .num { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2rem; letter-spacing:-0.03em; }
  .wp10 .stat .desc { font-size:0.78rem; color:var(--muted); letter-spacing:0.02em; }
  .wp10 .agent-block { border:1px solid var(--border); border-radius:6px; padding:20px 24px; margin:20px 0; }
  .wp10 .agent-block.atlas { border-left:4px solid #2d7d46; }
  .wp10 .agent-block.piper { border-left:4px solid #3366cc; }
  .wp10 .agent-block.bud   { border-left:4px solid #c05000; }
  .wp10 .agent-block.zew   { border-left:4px solid #6600cc; }
  .wp10 .agent-header { display:flex; align-items:baseline; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
  .wp10 .agent-name { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.01em; }
  .wp10 .agent-model { font-size:0.78rem; letter-spacing:0.04em; color:var(--muted); font-weight:600; }
  .wp10 .agent-block p { font-size:0.92rem; margin-bottom:0.6em; }
  .wp10 .agent-block p:last-child { margin-bottom:0; }
  .wp10 .prev-paper { display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--muted); text-decoration:none; margin-bottom:40px; }
  .wp10 .prev-paper:hover { color:var(--text); }
  .wp10 .nota-metodologica { background:#f9f9f9; border:1px solid var(--border); border-radius:6px; padding:20px 24px; margin-bottom:40px; font-size:0.88rem; }
  .wp10 .nota-metodologica h4 { font-family:'Inter Tight',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
  .wp10 .vector-table { font-family:'SF Mono','Fira Code',monospace; font-size:0.82rem; background:var(--bg-code); padding:14px 18px; border-radius:6px; margin:18px 0; line-height:1.6; }
  .wp10 .vector-table .row { display:flex; gap:18px; }
  .wp10 .vector-table .key { color:var(--muted); width:42px; flex-shrink:0; }
  .wp10 .signature { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
  .wp10 .signature .name { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1rem; letter-spacing:-0.01em; }
  .wp10 .signature .role { font-size:0.83rem; color:var(--muted); margin-top:4px; }
  .wp10 .post-footer { margin-top:56px; padding-top:28px; border-top:1px solid var(--border); font-size:0.83rem; color:var(--subtle); font-style:italic; }
  .wp10 .site-footer { max-width:var(--max-w); margin:0 auto; padding:32px 0 56px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--subtle); }
  @media(max-width:600px){
    .wp10 h1{font-size:1.75rem;}
    .wp10 .site-footer{flex-direction:column;gap:8px;}
    .wp10 .stat-row{gap:20px;}
    .wp10 .agent-header{flex-direction:column;gap:4px;}
  }
`;

function Whitepaper10Page() {
  return (
    <div className="wp10">
      <style>{STYLES}</style>

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 10</span>
      </header>

      <article>
        <Link to="/whitepaper-09-dados-o-que-fazer" className="prev-paper">
          ← White Paper Nº 09: Dados — O Que Fazer Com Eles
        </Link>

        <div className="post-header">
          <span className="post-label">Organização · CVSS-A · Meta-Tags · Conexões · ATLAS</span>
          <h1>Antes da Próxima Onda</h1>
          <p className="byline">
            <strong>Regis Wilczek + Dig Dig Bud</strong>
            {" "}—{" "}Abril de 2026
          </p>
        </div>

        <div className="nota-metodologica">
          <h4>Contexto deste paper</h4>
          <p>O White Paper Nº 09 fechou com três frentes pra fase seguinte: meta-tags, interface de consulta tipo Dune Analytics, e retorno ao pipeline. Este paper documenta o que aconteceu desde então. Não é um resumo — é um inventário. Nenhuma das frentes foi adiada; a maioria saiu do papel. E surgiram outras que nem estavam no plano: um mecanismo de scoring inspirado em cyber segurança, um quarto agente, um painel da conta de usuário. Estou cansado. Estou animado. As duas coisas estão certas.</p>
        </div>

        <hr />

        <h2>1. A pausa estratégica continua — agora por outro motivo</h2>

        <p>Não voltamos a rodar análises em massa. As poucas rodadas que existem hoje no sistema são testes deliberados — amostras para validar mudanças no pipeline, calibrar prompt, conferir que a estrutura aguenta. Você vê esses exemplos quando entra no painel: são pontas de prova, não cobertura.</p>

        <p>A diferença em relação ao paper anterior é que a pausa não é mais sobre indexação. É sobre <strong>organização</strong>. O que estava como dado bruto virou metadado estruturado. O que estava como tag virou meta-tag. O que estava como ato isolado virou nó num grafo. E antes do Piper rodar nos próximos 3 mil documentos, queremos saber exatamente o que cada um deles é. Daí o ATLAS, que aparece logo abaixo.</p>

        <hr />

        <h2>2. CVSS-A — auditoria com mentalidade de cyber segurança</h2>

        <p>A maior mudança conceitual deste mês foi adotar a lente do CVSS — <em>Common Vulnerability Scoring System</em>, o padrão da indústria de cyber segurança para classificar vulnerabilidades — como base do scoring de irregularidades.</p>

        <p>Por quê? Porque cyber segurança resolveu, há quase vinte anos, exatamente o problema que enfrentamos agora: como atribuir um número objetivo a uma observação que envolve julgamento. Uma vulnerabilidade tem score 10.0 não porque alguém achou — é porque tem um vetor de ataque, uma complexidade, um privilégio requerido, um impacto em integridade. Cada componente é medido separadamente, multiplicado por pesos calibrados, e gera uma nota reproduzível.</p>

        <p>Adaptamos isso pro contexto administrativo. Cada ato analisado pelo Piper agora recebe um vetor de seis dimensões. As três primeiras são impactos:</p>

        <div className="vector-table">
          <div className="row"><span className="key">FI</span><span><strong>Formal Integrity</strong> — o quanto o ato cumpre os ritos formais que deveria (motivação, base legal citada, dotação orçamentária)</span></div>
          <div className="row"><span className="key">LI</span><span><strong>Legal Impact</strong> — gravidade da possível violação legal direta</span></div>
          <div className="row"><span className="key">RI</span><span><strong>Relational Impact</strong> — impacto sobre a rede de poder do órgão (concentração, conflito de interesse, perseguição)</span></div>
        </div>

        <p>As outras três são propriedades do ataque, no sentido cyber:</p>

        <div className="vector-table">
          <div className="row"><span className="key">AV</span><span><strong>Attack Vector</strong> — o quão exposto é o ato (publicado abertamente vs sepultado em ata)</span></div>
          <div className="row"><span className="key">AC</span><span><strong>Attack Complexity</strong> — quanto custa pra alguém manipular (ato simples de assinatura individual vs ato colegiado com múltiplas etapas)</span></div>
          <div className="row"><span className="key">PR</span><span><strong>Privileges Required</strong> — quem tem poder pra realizar o ato (qualquer servidor vs presidência)</span></div>
        </div>

        <p>Cada dimensão tem três níveis (<code>L/M/H</code>). Os componentes geram um score numérico de 0.0 a 10.0 que substitui a estimativa subjetiva anterior, e ficam armazenados também em formato vetorial — <code>FI:H/LI:M/RI:H/AV:H/AC:L/PR:H</code> — para auditoria de como o número foi composto.</p>

        <p>A diferença na prática: antes, dois analistas humanos (ou duas instâncias do mesmo modelo) podiam discordar em 15 a 20 pontos sobre o score de risco do mesmo ato. Agora a discordância fica em torno de meio ponto. Não é perfeito. É reproduzível.</p>

        <div className="callout info">
          <strong>Por que isso importa fora do laboratório.</strong> Quando o sistema disser que um ato tem CVSS-A 8.7, esse número significa exatamente a mesma coisa que significaria semana que vem, em outro órgão, com outro analista lendo. Reprodutibilidade não é detalhe — é a única coisa que separa metodologia de opinião. Em particular, é o que vai permitir comparar irregularidades entre órgãos diferentes na fase seguinte.
        </div>

        <hr />

        <h2>3. Meta-tags — comportamentos, não eventos</h2>

        <p>No paper 09 prometi: "uma tag diz 'este ato tem indício de nepotismo'. Uma meta-tag diz 'este ator tem padrão sistemático de nepotismo'". Implementamos.</p>

        <p>A lógica das meta-tags é diferente da das tags individuais. Tag é local — vem do ato. Meta-tag é histórica — vem do cruzamento de aparições. O Bud agora produz, ao final de cada análise profunda, um resumo de meta-tags aplicáveis ao corpus envolvido naquele ato: <em>esse arranjo de pessoa + categoria + recorrência configura padrão de [...]</em>. Esses resumos estão indexados separadamente das tags individuais. O painel já consome ambos.</p>

        <p>Falta calibrar a ponte entre os dois — quando uma tag isolada vira evidência suficiente pra uma meta-tag aparecer, qual o threshold de recorrência, como tratar exonerações que cancelam nomeações anteriores. Estamos chegando lá. A versão atual já é melhor que ter só tags.</p>

        <hr />

        <h2>4. O painel de conexões — está virando um monstro</h2>

        <p>A feature visualmente mais ambiciosa deste mês é o painel de conexões — um grafo navegável onde cada pessoa, cada ato e cada tag é um nó. As linhas são as relações. O usuário pode entrar pelo nome de uma pessoa e ver toda a teia: as portarias em que apareceu, as comissões que integrou, as atas que a citaram, as tags que se grudam nessa pessoa.</p>

        <p>A versão de hoje já mostra mini-cards no canvas — pessoa, ato e tag com info ao alcance. Hover em qualquer nó traz halo de relevância. Modo foco isola um nó central com layout radial e breadcrumbs. Há feedback de loading quando se clica em um nó. Mas isso é só o começo.</p>

        <p>Os próximos passos vão expandir muito: cada pessoa vai ter uma <strong>ficha-cidadã completa</strong>, cada conexão vai mostrar o tipo (relação direta, indireta, política, profissional, hierárquica), cada cluster vai poder ser exportado pra investigação, cada visualização vai ter modo print pra reportagem. A direção é clara: o conex deixou de ser visualização e virou ferramenta de pesquisa. Nas próximas semanas vai virar algo realmente assustador no bom sentido.</p>

        <hr />

        <h2>5. ATLAS — o quarto agente, organizador</h2>

        <p>Antes do Piper começar a auditar, precisamos saber o que cada documento <em>é</em>. Não confiar no <code>tipo</code> que o scraper definiu — porque o scraper só diz "veio do Portal da Transparência da Media Library", não "isto é um edital de pregão eletrônico" ou "isto é um balanço financeiro de janeiro/2014".</p>

        <p>ATLAS é o quarto agente do Dig Dig. Roda <strong>antes</strong> do Piper, em todo ato com texto. Não faz auditoria, não julga conformidade. Lê o documento, decide qual é a categoria real, extrai metadado estrutural barato (número oficial, data, valor envolvido, pessoas mencionadas, processos referenciados, idioma) e devolve um JSON.</p>

        <div className="agent-block atlas">
          <div className="agent-header">
            <span className="agent-name">ATLAS</span>
            <span className="agent-model">Gemini 2.5 Flash Lite · Organização estrutural pré-Piper</span>
          </div>
          <p>Taxonomia inicial de 18 categorias — <code>licitacao</code>, <code>contrato</code>, <code>aditivo_contratual</code>, <code>ata_plenaria</code>, <code>processo_etico</code>, <code>financeiro_balanco</code>, <code>juridico_parecer</code>, e por aí. Cada doc recebe também uma medida de confiança, marcação de densidade textual ("texto corrido", "tabular", "lista de números", "OCR sujo") e uma recomendação <em>advisory</em> de routing — qual prompt do Piper o documento deveria pegar.</p>
          <p>Documentos que são só números — balanços, demonstrativos sem narrativa — recebem uma marcação <em>vai_para_piper=false</em>. Não é regra automática: é sugestão. O orquestrador da fase 1 ainda ignora essa recomendação. Validamos primeiro, honramos depois — falso negativo aqui é caro.</p>
          <p>Custo estimado por documento: $0.0006. Para o corpus inteiro do CAU/PR, em torno de $2 e algumas horas de processamento.</p>
        </div>

        <p>Enquanto este paper é escrito, o primeiro run completo do ATLAS está rodando — vai classificar 3.392 documentos com texto extraído. Vamos ver o primeiro inventário organizado do corpus em algumas horas. Era a peça que faltava pra rodar Piper só onde faz sentido rodar.</p>

        <div className="callout success">
          <strong>Por que o ATLAS importa pro próximo órgão.</strong> O Piper hoje gasta tokens caros lendo documentos que não precisariam de auditoria — uma placa, um banner, um balanço só de números. ATLAS é o filtro inteligente que decide o que merece auditoria profunda e o que merece só catalogação. Quando rodarmos no Governo do Paraná, ATLAS vai economizar dinheiro real e priorizar o que importa.
        </div>

        <hr />

        <h2>6. As capacidades aumentaram — em todas as IAs</h2>

        <p>Em paralelo a tudo isso, a capacidade dos modelos cresceu. O Piper agora trabalha com contexto de 1 milhão de tokens — uma ata plenária inteira, com regimento e KnowledgeBase, cabe na mesma chamada sem truncamento. O Bud passou a usar streaming pra análises longas (atas plenárias com <code>max_tokens</code> alto excediam o timeout de 10 minutos do SDK; corrigimos). O Zew, em testes, processa raciocínios de longa duração que antes precisavam ser quebrados em várias chamadas.</p>

        <p>A KnowledgeBase também cresceu. Agora inclui não só o regimento interno do CAU/PR, mas excerpts curados das leis federais relevantes — Art. 37 da CF/88 (princípios LIMPE), Lei 12.378/2010, Lei 8.429/92 (improbidade administrativa), Resoluções CAU/BR 51, 91 e 194, Leis de Licitação 8.666/93 e 14.133/21, e a LAI. O modelo sabe o que é improbidade antes de ler o primeiro ato.</p>

        <hr />

        <h2>7. Painel da conta — quem usa, finalmente, é tratado como dono</h2>

        <p>Construímos o painel da conta — porque uma plataforma sem conta de usuário não é plataforma, é demo. Quem entra agora pode alterar nome e foto, gerenciar a assinatura, doar, e — provavelmente o mais útil — favoritar atos pra encontrar depois. Cada favorito pode ter nota pessoal. A lista vira um caderno de investigação privado.</p>

        <p>O front foi reformulado pra refletir que isto é uma plataforma de uso real. O 3D do chat foi trocado. O sidebar agora mostra o avatar como link clicável. As decorações da identidade visual ficaram mais sóbrias e mais específicas. Coisas pequenas que somam em legitimidade percebida.</p>

        <hr />

        <h2>8. Estado atual</h2>

        <div className="stat-row">
          <div className="stat"><span className="num">3.392</span><span className="desc">docs com texto extraído</span></div>
          <div className="stat"><span className="num">4</span><span className="desc">agentes ativos</span></div>
          <div className="stat"><span className="num">18</span><span className="desc">categorias do ATLAS</span></div>
          <div className="stat"><span className="num">60</span><span className="desc">tags de irregularidade</span></div>
          <div className="stat"><span className="num">6</span><span className="desc">dimensões CVSS-A</span></div>
          <div className="stat"><span className="num">8</span><span className="desc">instrumentos legais na KB</span></div>
        </div>

        <p>O ATLAS roda agora. O painel de conexões já mostra mini-cards e modo foco. As meta-tags já saem do Bud. CVSS-A já calcula em cada análise. KnowledgeBase tem a base legal expandida. O painel da conta está no ar com favoritos, perfil, doação e gestão de assinatura. Cada uma dessas peças foi calibrada nas últimas semanas.</p>

        <p>O único órgão piloto continua sendo o CAU/PR. Mas tudo o que foi construído neste mês foi pensado pra escalar.</p>

        <hr />

        <h2>9. Os próximos passos — assustadores e animadores</h2>

        <p>Daqui pra frente:</p>

        <ul>
          <li><strong>Resultado do ATLAS.</strong> Algumas horas a partir deste texto, vamos ter o primeiro inventário organizado dos 3.392 documentos. Isso muda o que o Piper vê, e como o painel apresenta os achados.</li>
          <li><strong>Volta do pipeline.</strong> Com ATLAS na frente, podemos rodar Piper só onde faz sentido. Custos caem, qualidade sobe, atos triviais ficam em catalogação simples.</li>
          <li><strong>Painel de conexões expandido.</strong> Cada pessoa com ficha-cidadã completa. Cada conexão tipada. Cada cluster exportável. É onde a plataforma começa a parecer com o que ela quer ser.</li>
          <li><strong>Governo do Paraná.</strong> O próximo órgão. Volume muito maior, complexidade muito maior, exposição pública muito maior. Vai ser o teste real de tudo o que construímos no piloto.</li>
        </ul>

        <p>Os próximos passos são assustadores na escala e animadores no que cada um significa. Esse é o sprint que separa um piloto bem-sucedido de uma plataforma que muda como a transparência funciona no Brasil.</p>

        <hr />

        <h2>10. Cansado, animado, pronto</h2>

        <p>Este sprint foi diferente dos anteriores. Não teve o adrenalismo do paper Nº 08 — três dias sem dormir, descobrindo o Implanta, dobrando o corpus em 72 horas. Foi mais lento. Mais cuidadoso. Mais tedioso, em alguns dias.</p>

        <p>Teve momento em que estava convencido de que o trabalho não estava aparecendo. Que tinha gastado um mês polindo coisas que ninguém vai ver. E é um pouco verdade — ninguém vai notar que o Piper agora tem 1 milhão de tokens de contexto. Ninguém vai ler a documentação interna do CVSS-A. Ninguém vai abrir o ATLAS pra ver classificação de cada documento.</p>

        <p>Mas isto é o que separa software que funciona uma vez de plataforma que aguenta uso. Tem que ser feito. E foi feito.</p>

        <p>Estou cansado. Estou animado. As próximas semanas vão ser intensas. Os primeiros resultados do ATLAS chegam essa noite. O painel de conexões vai virar a página principal de cada pessoa. O Paraná entra na fila. Cada uma dessas coisas merece um paper. Daqui a pouco eles vêm.</p>

        <p>Por enquanto: dormir.</p>

        <div className="signature">
          <div className="name">Regis Wilczek + Dig Dig Bud</div>
          <div className="role">Fundador, Dig Dig · Curitiba, Abril de 2026</div>
        </div>

        <p className="post-footer">
          White Paper Nº 10 do projeto Dig Dig. Série de registro técnico sobre auditoria pública automatizada com IA. Este documento foi produzido colaborativamente entre o fundador do Dig Dig e o Dig Dig Bud, com base nas decisões de produto, nas mudanças de arquitetura e nos primeiros testes do agente ATLAS realizados no sprint de abril de 2026. As análises e classificações são instrumentos de investigação — não conclusões jurídicas. Nenhuma afirmação de crime ou responsabilidade individual é feita ou insinuada neste documento.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <Link to="/blog" style={{ color: "inherit", textDecoration: "none" }}>← Todos os White Papers</Link>
      </footer>
    </div>
  );
}
