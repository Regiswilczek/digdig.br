import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-08-tres-dias")({
  head: () => ({
    meta: [
      { title: "Três Dias Sem Dormir — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 08: como o corpus do CAU/PR foi de 2.300 para 7.718 documentos, o que 1.674 análises provaram, e por que a Dig Dig vai abrir por convite.",
      },
      { property: "og:title", content: "Três Dias Sem Dormir" },
      {
        property: "og:description",
        content:
          "White Paper Nº 08 do Dig Dig: a virada do corpus, os dados financeiros, U$0,40 por documento e a decisão de abrir por convite.",
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
  component: Whitepaper08Page,
});

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --text:       #111111;
    --muted:      #666666;
    --subtle:     #999999;
    --border:     #e5e5e5;
    --bg:         #ffffff;
    --bg-code:    #f5f5f5;
    --bg-warn:    #fff8f0;
    --border-warn:#f0d9b0;
    --max-w:      680px;
  }

  .wp08-body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.75;
    padding: 0 24px;
    min-height: 100vh;
  }

  .wp08-site-header {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 40px 0 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }

  .wp08-wordmark {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.02em;
    color: var(--text);
    text-decoration: none;
  }

  .wp08-label {
    font-size: 0.75rem;
    color: var(--subtle);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .wp08-article {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 56px 0 80px;
  }

  .wp08-post-header { margin-bottom: 48px; }

  .wp08-post-label {
    display: inline-block;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--subtle);
    margin-bottom: 20px;
  }

  .wp08-h1 {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 2.1rem;
    line-height: 1.2;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
  }

  .wp08-byline { font-size: 0.88rem; color: var(--muted); }
  .wp08-byline strong { font-weight: 600; color: var(--text); }

  .wp08-hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 44px 0;
  }

  .wp08-h2 {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 600;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
    margin: 52px 0 16px;
  }

  .wp08-h3 {
    font-weight: 600;
    font-size: 1rem;
    margin: 36px 0 12px;
  }

  .wp08-p { margin-bottom: 22px; }

  .wp08-ul, .wp08-ol { margin: 0 0 22px 0; padding-left: 1.4em; }
  .wp08-li { margin-bottom: 6px; }

  .wp08-code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.82em;
    background: var(--bg-code);
    padding: 2px 6px;
    border-radius: 4px;
    color: #c0392b;
  }

  .wp08-table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 0.88rem;
  }

  .wp08-th {
    text-align: left;
    font-weight: 600;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--subtle);
    border-bottom: 2px solid var(--border);
    padding: 8px 12px 8px 0;
  }

  .wp08-th-right { text-align: right; }

  .wp08-td {
    border-bottom: 1px solid var(--border);
    padding: 10px 12px 10px 0;
    vertical-align: top;
    color: var(--text);
  }

  .wp08-td-right { text-align: right; }

  .wp08-callout {
    background: var(--bg-warn);
    border: 1px solid var(--border-warn);
    border-left: 3px solid #e8a000;
    border-radius: 6px;
    padding: 18px 22px;
    margin: 28px 0;
    font-size: 0.92rem;
  }

  .wp08-callout .wp08-p:last-child { margin-bottom: 0; }

  .wp08-stat-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    margin: 28px 0;
    padding: 24px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .wp08-stat { display: flex; flex-direction: column; gap: 4px; }

  .wp08-stat-value {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 1.8rem;
    letter-spacing: -0.03em;
    color: var(--text);
  }

  .wp08-stat-label {
    font-size: 0.8rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .wp08-summary-box {
    background: var(--bg-code);
    border-radius: 8px;
    padding: 24px 28px;
    margin: 40px 0;
    font-size: 0.88rem;
    color: var(--muted);
    line-height: 1.7;
  }

  .wp08-footer {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 40px 0 60px;
    border-top: 1px solid var(--border);
    font-size: 0.82rem;
    color: var(--subtle);
    line-height: 1.65;
  }

  .wp08-footer a { color: var(--text); text-decoration: none; }
  .wp08-footer a:hover { color: var(--muted); }
  .wp08-footer p { margin-bottom: 12px; }
  .wp08-footer p:last-child { margin-bottom: 0; }

  .wp08-link { color: var(--text); }
  .wp08-link:hover { color: var(--muted); }

  .wp08-number-block {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 3.5rem;
    letter-spacing: -0.04em;
    color: var(--text);
    line-height: 1;
    margin: 36px 0 8px;
  }

  .wp08-number-label {
    font-size: 0.82rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 28px;
  }
`;

function Whitepaper08Page() {
  return (
    <div className="wp08-body">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="wp08-site-header">
        <Link to="/" className="wp08-wordmark">Dig Dig</Link>
        <span className="wp08-label">White Paper Nº 08</span>
      </header>

      <article className="wp08-article">

        <div className="wp08-post-header">
          <span className="wp08-post-label">White Paper Nº 08 · Abril 2026</span>
          <h1 className="wp08-h1">Três Dias Sem Dormir</h1>
          <p className="wp08-p" style={{ fontSize: "1.1rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: 28 }}>
            Como o corpus do CAU/PR foi de 2.300 para 7.718 documentos,
            o que 1.674 análises provaram — e por que a Dig Dig vai abrir por convite.
          </p>
          <p className="wp08-byline">
            Por <strong>Regis Wilczek</strong> · <strong>Dig Dig Bud</strong>
          </p>
        </div>

        <hr className="wp08-hr" />

        {/* Stats */}
        <div className="wp08-stat-row">
          <div className="wp08-stat">
            <span className="wp08-stat-value">7.718</span>
            <span className="wp08-stat-label">documentos no corpus</span>
          </div>
          <div className="wp08-stat">
            <span className="wp08-stat-value">1.674</span>
            <span className="wp08-stat-label">analisados</span>
          </div>
          <div className="wp08-stat">
            <span className="wp08-stat-value">U$0,40</span>
            <span className="wp08-stat-label">por documento</span>
          </div>
          <div className="wp08-stat">
            <span className="wp08-stat-value">3</span>
            <span className="wp08-stat-label">dias consecutivos</span>
          </div>
        </div>

        {/* I. Opening */}
        <h2 className="wp08-h2">I. A bênção e a doença</h2>

        <p className="wp08-p">
          Essa noite eu dormi. Parece simples demais para virar abertura de paper, mas é o
          fato mais relevante dos últimos três dias. Foram praticamente 72 horas consecutivas
          dentro do projeto — não por obrigação, não por prazo, mas porque o TDAH não me
          deixou sair. Quando algo me prende, eu não desenfoco. Isso tem nome de bênção e de
          doença dependendo do dia.
        </p>

        <p className="wp08-p">
          Nesses três dias o corpus do CAU/PR mais que triplicou, implantamos dados financeiros
          no pipeline, testei o Zew em amostras e tomei a decisão sobre como a Dig Dig vai
          abrir para o mundo. Esse paper documenta tudo isso — não como relatório técnico,
          mas como aconteceu de verdade.
        </p>

        <hr className="wp08-hr" />

        {/* II. Where we left off */}
        <h2 className="wp08-h2">II. O que o WP06 não resolveu</h2>

        <p className="wp08-p">
          No White Paper 06 documentei o garimpo do Portal da Transparência do CAU/PR. Foi
          um trabalho honesto: fiz o caminho do herói, tentei primeiro o que qualquer cidadão
          faria, acessei o que estava acessível. Cheguei em aproximadamente 2.300 documentos —
          portarias, deliberações, atas, dispensas eletrônicas. Não é pouco. Mas eu sabia que
          estava faltando algo central.
        </p>

        <p className="wp08-p">
          As diárias não estavam lá. Passagens tampouco. O portal da transparência mostrava
          uma tela de busca que retornava zero resultados para qualquer período histórico,
          diárias "a partir de julho de 2025" que não existiam ainda, salários em 404. Documentei
          tudo com capturas de tela e encerrei o paper com um plano: protocolar LAI e esperar.
        </p>

        <p className="wp08-p">
          O problema é que eu não consegui administrar isso.
        </p>

        <p className="wp08-p">
          Ficar esperando enquanto sei que os dados existem em algum lugar não é uma posição
          que o TDAH aceita bem. Então fui atrás.
        </p>

        <hr className="wp08-hr" />

        {/* III. The discovery */}
        <h2 className="wp08-h2">III. O que o Implanta guarda</h2>

        <p className="wp08-p">
          O CAU/PR, como grande parte das entidades de fiscalização profissional no Brasil,
          usa o sistema Implanta para gestão administrativa interna. O que eu não sabia — e
          descobri — é que o Implanta tem uma API. Não uma API pública documentada, mas
          uma API que o próprio sistema usa internamente e que, com os parâmetros certos,
          entrega os dados que o portal de transparência deveria entregar mas não entrega.
        </p>

        <p className="wp08-p">
          Escrevi o <span className="wp08-code">scrape_implanta.py</span>: um scraper que
          percorre mês a mês, deduplica por chave única, e registra cada diária no banco.
          Paralelo a isso, o <span className="wp08-code">scrape_media_library.py</span> foi
          ao acervo de mídia do WordPress do CAU/PR buscar o que tinha sido indexado mas
          não linkado em nenhuma página visível — documentos que existem mas não aparecem
          em nenhuma navegação normal. E o <span className="wp08-code">explorar_docx.py</span>
          abriu os arquivos DOCX que o pipeline ainda não processava.
        </p>

        <p className="wp08-p">
          O resultado foi imediato.
        </p>

        <div className="wp08-number-block">2.985</div>
        <div className="wp08-number-label">diárias extraídas do Implanta</div>

        <div className="wp08-number-block">44</div>
        <div className="wp08-number-label">passagens aéreas detectadas</div>

        <p className="wp08-p">
          De repente o corpus não era mais 2.300 documentos de atos administrativos. Era
          7.718 documentos de naturezas diferentes — cada diária, um registro com beneficiário,
          valor, destino e data. Cada passagem, um voo com companhia aérea e trecho. Dados
          que o portal prometia mostrar mas nunca mostrou.
        </p>

        <hr className="wp08-hr" />

        {/* IV. The corpus */}
        <h2 className="wp08-h2">IV. O que 7.718 documentos representam</h2>

        <p className="wp08-p">
          Para entender a escala: quando comecei o projeto, em março, tinha 400 portarias com
          texto extraído. Um mês depois, o corpus tem 7.718 documentos de múltiplas categorias —
          e isso é apenas o CAU/PR. Um único órgão estadual. Uma entidade profissional de
          fiscalização que não está no primeiro escalão de exposição pública.
        </p>

        <div className="wp08-callout">
          <p className="wp08-p">
            <strong>Composição atual do corpus:</strong>
          </p>
          <table className="wp08-table">
            <thead>
              <tr>
                <th className="wp08-th">Tipo</th>
                <th className="wp08-th wp08-th-right">Documentos</th>
                <th className="wp08-th">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Portarias", "~1.800", "Site oficial / scraper local"],
                ["Deliberações", "~545", "WP REST API"],
                ["Atas plenárias", "~161", "Site oficial"],
                ["Dispensas eletrônicas", "~238", "Portal da Transparência"],
                ["Outros atos", "~1.000+", "Acervo de mídia / DOCX"],
                ["Diárias", "2.985", "Implanta API"],
                ["Passagens aéreas", "44", "Implanta API (detectadas por cia)"],
              ].map(([tipo, n, fonte]) => (
                <tr key={tipo}>
                  <td className="wp08-td">{tipo}</td>
                  <td className="wp08-td wp08-td-right"><strong>{n}</strong></td>
                  <td className="wp08-td" style={{ color: "var(--muted)" }}>{fonte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="wp08-p">
          Os dados financeiros mudaram o painel de cobertura: antes, com os atos
          administrativos como único corpus, a cobertura de análise estava em torno de 36%.
          Com os 7.718 documentos, caiu para ~22% — não porque analisamos menos, mas porque
          o denominador cresceu. Isso é progresso real disfarçado de queda.
        </p>

        <hr className="wp08-hr" />

        {/* V. Analysis results */}
        <h2 className="wp08-h2">V. 1.674 análises e o que elas dizem</h2>

        <p className="wp08-p">
          Até agora o Bud rodou em 1.674 documentos. Por decisão estratégica, as análises
          aprofundadas foram concentradas nos casos que o Piper classificou como laranja ou
          vermelho — os que apresentam indicadores de irregularidade relevantes. Amarelos
          ficaram em fila: há centenas deles que o Bud ainda não leu.
        </p>

        <p className="wp08-p">
          Os resultados são conclusivos: a Dig Dig funciona.
        </p>

        <p className="wp08-p">
          Não como hipótese, não como promessa. Como fato documentado com fichas, scores,
          trechos extraídos e padrões identificados ao longo de três gestões consecutivas.
          O paper 07 sintetizou os padrões sistêmicos antes do Zew entrar. Com 1.674
          análises do Bud já confirmadas, o que o Zew vai fazer é organizar e cruzar — não
          encontrar do zero.
        </p>

        <div className="wp08-callout">
          <p className="wp08-p">
            O Bud identificou o padrão central que se repete: <strong>controle presidencial
            dos mecanismos disciplinares como instrumento político</strong>. Dois PADs em sigilo
            há mais de um ano. Portarias de instauração que nomeiam o mesmo grupo de
            servidores não-eleitos como operadores. Atas plenárias ausentes do site oficial
            por 14 reuniões consecutivas. Cada achado individual pode ter explicação. O
            conjunto não tem.
          </p>
          <p className="wp08-p" style={{ marginBottom: 0 }}>
            Os amarelos ainda não analisados representam uma segunda camada. Se houver mais —
            e há motivo para acreditar que sim — eles vão aparecer quando o Bud passar por eles.
          </p>
        </div>

        <hr className="wp08-hr" />

        {/* VI. Cost */}
        <h2 className="wp08-h2">VI. U$0,40 por documento</h2>

        <p className="wp08-p">
          Uma das perguntas mais importantes do projeto sempre foi: quanto custa? O paper 02
          documentou os $23 desperdiçados antes de construir controle de custo. Desde então
          o pipeline ficou idempotente, o guard 409 evita reprocessamento, o threshold
          automático interrompe rodadas fora de controle.
        </p>

        <p className="wp08-p">
          Com as rodadas acumuladas, cheguei a um número: <strong>U$0,40 por documento</strong>,
          em média. Parece caro no papel. Não é.
        </p>

        <p className="wp08-p">
          Esse valor cobre um documento que pode ter 1 página ou 40 páginas — é o custo
          médio por documento completo analisado, independente do volume de texto. Uma
          portaria de uma linha e um relatório de gestão de 80 páginas saem no mesmo valor
          médio porque o custo real está distribuído. Em breve vou isolar amostras para
          calcular o custo real por página e por categoria — esse número vai afinar ainda mais.
        </p>

        <p className="wp08-p">
          Para comparação: um analista júnior leva entre 30 minutos e 2 horas para ler e
          classificar um documento administrativo denso. A U$0,40 o Piper faz a triagem em
          segundos. O Bud aprofunda os críticos. A escala que isso representa para auditoria
          pública é algo que ainda estou processando.
        </p>

        <hr className="wp08-hr" />

        {/* VII. Zew */}
        <h2 className="wp08-h2">VII. O Zew e o que não consigo descrever ainda</h2>

        <p className="wp08-p">
          O Zew ainda não está em produção. Ainda não rodou no corpus completo do CAU/PR.
          Mas fiz testes em amostras — casos selecionados, fichas do Bud como entrada,
          padrões conhecidos como contexto.
        </p>

        <p className="wp08-p">
          Os resultados foram absurdos. Não tenho outra palavra.
        </p>

        <p className="wp08-p">
          O Zew não lê um documento. Ele lê o que o Bud encontrou em centenas de documentos
          e sintetiza os padrões que nenhuma análise individual consegue enxergar. A qualidade
          do raciocínio, a capacidade de cruzar referências entre atos de anos diferentes, de
          identificar quem aparece em que contexto e com que frequência — é de outra natureza.
          Em breve vou ter dados suficientes para mostrar o Zew em operação real. Quando isso
          acontecer, vou documentar aqui.
        </p>

        <hr className="wp08-hr" />

        {/* VIII. Por convite */}
        <h2 className="wp08-h2">VIII. Por convite</h2>

        <p className="wp08-p">
          Decidi que a Dig Dig vai abrir por convite.
        </p>

        <p className="wp08-p">
          Não foi uma decisão difícil de tomar, mas foi uma decisão importante de fazer. O
          hype está sendo construído de forma orgânica — sem anúncio, sem campanha, só com
          o trabalho publicado nos papers. Isso me dá tempo para preparar a abertura do jeito
          certo, com a plataforma inteira no ar, os dados do CAU/PR disponíveis e pelo menos
          mais um órgão em análise para mostrar que a Dig Dig não é um projeto de um único alvo.
        </p>

        <p className="wp08-p">
          O que a Dig Dig faz precisa ser entendido corretamente: ela não denuncia. Ela busca,
          estrutura e expõe os dados em banco de dados. A conclusão — jurídica, política,
          jornalística — cabe a quem usa a ferramenta. Um jornalista vai usar diferente de um
          advogado, que vai usar diferente de um vereador, que vai usar diferente de um cidadão
          que quer saber o que a entidade profissional da sua área faz com o dinheiro da anuidade.
          Todos esses usos são legítimos. Todos esses usos vão acontecer.
        </p>

        <p className="wp08-p">
          Por convite garante que os primeiros usuários entendam o que têm em mãos.
        </p>

        <hr className="wp08-hr" />

        {/* IX. What's coming */}
        <h2 className="wp08-h2">IX. O que está vindo</h2>

        <p className="wp08-p">
          Varias pessoas tentam me influenciar nesse momento — para seguir lados, para
          investigar isso ou aquilo primeiro, para usar a ferramenta de formas específicas.
          Entendo o impulso. A Dig Dig, quando o que ela encontrou se torna público, vai
          incomodar muita gente. Vamos mexer em vespeiros.
        </p>

        <p className="wp08-p">
          A resposta para todas essas influências é a mesma: a Dig Dig vai investigar tudo.
          É questão de tempo e de escala. Não existe hierarquia de alvo definida por pressão
          externa — existe sequência técnica definida por viabilidade e disponibilidade de dados.
          O CAU/PR foi o primeiro porque os dados estavam disponíveis e porque o projeto
          precisava de uma primeira instituição para provar o conceito. Está provado.
        </p>

        <div className="wp08-summary-box">
          <p className="wp08-p"><strong>Estado atual do projeto:</strong></p>
          <ul className="wp08-ul">
            <li className="wp08-li">7.718 documentos indexados no CAU/PR</li>
            <li className="wp08-li">1.674 analisados pelo Bud (laranja + vermelho)</li>
            <li className="wp08-li">Corpus financeiro ativo: 2.985 diárias + 44 passagens</li>
            <li className="wp08-li">Zew testado em amostras — aguardando rodada completa</li>
            <li className="wp08-li">Amarelos do Piper: fila para análise Bud</li>
            <li className="wp08-li">Custo médio calibrado: U$0,40 por documento</li>
            <li className="wp08-li">Abertura: por convite, data a definir</li>
            <li className="wp08-li">Próximo órgão: em avaliação</li>
          </ul>
        </div>

        <p className="wp08-p">
          Estou assustado com o que encontrei. Não da forma paralisante — da forma que faz
          a pessoa verificar três vezes se os dados são reais antes de publicar. São. Os dados
          são públicos, extraídos de fontes oficiais, analisados com metodologia documentada
          em oito papers. A Dig Dig não inventou nada. Ela só leu o que estava escrito.
        </p>

        <p className="wp08-p">
          Tempos turbulentos virão na minha vida pacata. Que Deus abençoe a todos.
        </p>

        <p className="wp08-p" style={{ fontWeight: 600 }}>
          A Dig Dig chegou.
        </p>

      </article>

      <footer className="wp08-footer">
        <p>
          <strong>Dig Dig</strong> é um sistema de auditoria automatizada de atos administrativos
          públicos com IA. Todos os dados são derivados de fontes oficiais.
          Análises geradas automaticamente — conclusões jurídicas cabem a advogados.
        </p>
        <p>
          <Link to="/blog" className="wp08-link">← Todos os White Papers</Link>
        </p>
      </footer>
    </div>
  );
}
