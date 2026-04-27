import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-06-do-gabinete-ao-terminal")({
  head: () => ({
    meta: [
      { title: "Do Gabinete ao Terminal — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 06: Mapeamos o Portal da Transparência do CAU/PR e encontramos diárias que só mostram o futuro, salários em 404 e uma ferramenta capaz de ver o que o portal esconde.",
      },
      { property: "og:title", content: "Do Gabinete ao Terminal" },
      {
        property: "og:description",
        content:
          "White Paper Nº 06 do Dig Dig: o garimpo completo do Portal da Transparência do CAU/PR, o que ele não mostra, e o que o Dig Dig conseguiu encontrar mesmo assim.",
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
  component: Whitepaper06Page,
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

  .wp06-body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.75;
    padding: 0 24px;
    min-height: 100vh;
  }

  .wp06-site-header {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 40px 0 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }

  .wp06-wordmark {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.02em;
    color: var(--text);
    text-decoration: none;
  }

  .wp06-label {
    font-size: 0.75rem;
    color: var(--subtle);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .wp06-article {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 56px 0 80px;
  }

  .wp06-post-header { margin-bottom: 48px; }

  .wp06-post-label {
    display: inline-block;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--subtle);
    margin-bottom: 20px;
  }

  .wp06-h1 {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 2.1rem;
    line-height: 1.2;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
  }

  .wp06-byline { font-size: 0.88rem; color: var(--muted); }
  .wp06-byline strong { font-weight: 600; color: var(--text); }

  .wp06-hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 44px 0;
  }

  .wp06-h2 {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 600;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
    margin: 52px 0 16px;
  }

  .wp06-h3 {
    font-weight: 600;
    font-size: 1rem;
    margin: 36px 0 12px;
  }

  .wp06-p { margin-bottom: 22px; }

  .wp06-ul, .wp06-ol { margin: 0 0 22px 0; padding-left: 1.4em; }
  .wp06-li { margin-bottom: 6px; }

  .wp06-code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.82em;
    background: var(--bg-code);
    padding: 2px 6px;
    border-radius: 4px;
    color: #c0392b;
  }

  .wp06-table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 0.88rem;
  }

  .wp06-th {
    text-align: left;
    font-weight: 600;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--subtle);
    border-bottom: 2px solid var(--border);
    padding: 8px 12px 8px 0;
  }

  .wp06-th-right { text-align: right; }

  .wp06-td {
    border-bottom: 1px solid var(--border);
    padding: 10px 12px 10px 0;
    vertical-align: top;
    color: var(--text);
  }

  .wp06-td-right { text-align: right; }

  .wp06-star { color: #c8a000; }
  .wp06-empty { color: var(--subtle); }

  .wp06-callout {
    background: var(--bg-warn);
    border: 1px solid var(--border-warn);
    border-left: 3px solid #e8a000;
    border-radius: 6px;
    padding: 18px 22px;
    margin: 28px 0;
    font-size: 0.92rem;
  }

  .wp06-callout .wp06-p:last-child { margin-bottom: 0; }

  .wp06-stat-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    margin: 28px 0;
    padding: 24px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .wp06-stat { display: flex; flex-direction: column; gap: 4px; }

  .wp06-stat-value {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 700;
    font-size: 1.8rem;
    letter-spacing: -0.03em;
    color: var(--text);
  }

  .wp06-stat-label {
    font-size: 0.8rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .wp06-figure {
    margin: 36px 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .wp06-figure img {
    width: 100%;
    display: block;
  }

  .wp06-figcaption {
    padding: 12px 16px;
    font-size: 0.82rem;
    color: var(--muted);
    background: var(--bg-code);
    border-top: 1px solid var(--border);
    line-height: 1.5;
  }

  .wp06-figcaption strong { color: var(--text); font-weight: 600; }

  .wp06-summary-box {
    background: var(--bg-code);
    border-radius: 8px;
    padding: 24px 28px;
    margin: 40px 0;
    font-size: 0.88rem;
    color: var(--muted);
    line-height: 1.7;
  }

  .wp06-footer {
    max-width: var(--max-w);
    margin: 0 auto;
    padding: 40px 0 60px;
    border-top: 1px solid var(--border);
    font-size: 0.82rem;
    color: var(--subtle);
    line-height: 1.65;
  }

  .wp06-footer a { color: var(--text); text-decoration: none; }
  .wp06-footer a:hover { color: var(--muted); }
  .wp06-footer p { margin-bottom: 12px; }
  .wp06-footer p:last-child { margin-bottom: 0; }

  .wp06-link { color: var(--text); }
  .wp06-link:hover { color: var(--muted); }
`;

function Whitepaper06Page() {
  return (
    <div className="wp06-body">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="wp06-site-header">
        <Link to="/" className="wp06-wordmark">Dig Dig</Link>
        <span className="wp06-label">White Paper Nº 06</span>
      </header>

      <article className="wp06-article">

        <div className="wp06-post-header">
          <span className="wp06-post-label">White Paper Nº 06 · Abril 2026</span>
          <h1 className="wp06-h1">Do Gabinete ao Terminal</h1>
          <p className="wp06-p" style={{ fontSize: "1.1rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: 28 }}>
            Mapeamos o Portal da Transparência do CAU/PR de ponta a ponta.<br />
            O que encontramos foi revelador — e não da forma que esperávamos.
          </p>
          <div className="wp06-byline">
            Por <strong>Regis Alessander Wilczek</strong> · Fundador do Dig Dig
          </div>
        </div>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">Um Desvio que Virou uma Descoberta</h2>

        <p className="wp06-p">
          Há alguns anos, antes de existir qualquer linha de código do Dig Dig, eu passava semanas
          sentado numa sala da Câmara Municipal de Curitiba tentando entender o que estava acontecendo
          com o dinheiro público. Era o gabinete do Vereador Professor Euler. Meu trabalho, na prática,
          era investigar.
        </p>

        <p className="wp06-p">
          Investigar, naquele contexto, significava abrir portais que não carregavam, baixar planilhas
          com formatação quebrada, ligar para servidores que não atendiam e interpretar atas escritas
          em juridiquês denso. Uma pista por vez. Quando encontrava algo bom — uma licitação suspeita,
          uma diária fora do padrão, um contrato assinado no limite do expediente — era pauta.
          Era denúncia. Era a semana que valeu a pena.
        </p>

        <p className="wp06-p">
          Essa experiência é a origem do Dig Dig. A ferramenta que eu não tinha enquanto precisava.
        </p>

        <p className="wp06-p">
          Esta semana, alguns dias depois de publicar o White Paper Nº 05, resolvi fazer o que qualquer
          investigador faria: mapear todo o Portal da Transparência do CAU/PR antes de decidir o que
          raspar a seguir. Não para entrar cegamente numa seção e baixar o que aparecesse — mas para
          entender a magnitude do que existe lá e o que está realmente acessível.
        </p>

        <p className="wp06-p">
          O que encontrei foi fascinante. E também foi, em partes, frustrante da forma mais familiar possível.
        </p>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">O Garimpo: 96 Páginas, 28 Seções</h2>

        <p className="wp06-p">
          O Portal da Transparência do CAU/PR é construído em WordPress. Isso tem uma vantagem técnica
          enorme: o WordPress expõe uma API REST pública em{" "}
          <code className="wp06-code">/wp-json/wp/v2/pages</code> que retorna todos os metadados de
          cada página — título, conteúdo renderizado, links embutidos.
        </p>

        <p className="wp06-p">
          Escrevi um script simples usando <code className="wp06-code">httpx</code> (sem renderização
          de JavaScript — apenas chamadas diretas à API) e vasculhei as 96 páginas do portal.
          De cada uma extraí o HTML renderizado e contei os documentos vinculados: PDFs, XLS, DOCX, ZIPs.
        </p>

        <div className="wp06-stat-row">
          {[
            { value: "96", label: "páginas encontradas" },
            { value: "28", label: "seções analisadas" },
            { value: "400+", label: "documentos mapeados" },
            { value: "238", label: "dispensas eletrônicas" },
          ].map((s) => (
            <div key={s.label} className="wp06-stat">
              <span className="wp06-stat-value">{s.value}</span>
              <span className="wp06-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="wp06-p">Aqui está o mapa completo das seções com documentos acessíveis:</p>

        <table className="wp06-table">
          <thead>
            <tr>
              <th className="wp06-th">Seção</th>
              <th className="wp06-th">Status</th>
              <th className={`wp06-th wp06-th-right`}>Docs</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Dispensa Eletrônica", "★", "acessível", "238"],
              ["Relatórios e Pareceres", "★", "acessível", "85"],
              ["Relação de Convênios", "★", "acessível", "26"],
              ["Relatórios ao TCU", "★", "acessível", "12"],
              ["Contratações Diretas / Inexigibilidades", "★", "acessível", "12"],
              ["Auditoria Independente", "★", "acessível", "8"],
              ["Atas de Registro de Preço", "★", "acessível", "7"],
              ["Contratos Vigentes", "★", "acessível", "2 (PDF + XLS, Jul/2025)"],
              ["Quadro de Empregados", "★", "acessível", "2 (Mar/2026)"],
              ["Diárias e Deslocamentos", "∅", "JS-only / vazio", "0"],
              ["Folhas de Pagamento", "∅", "sem conteúdo", "0"],
              ["Resoluções", "∅", "JS-only", "0"],
              ["Portarias Presidenciais", "∅", "JS-only", "0"],
              ["Atas de Reuniões de Comissões", "·", "texto, sem docs", "0"],
              ["Orientações Jurídicas", "·", "texto, sem docs", "0"],
            ].map(([secao, icon, status, docs]) => (
              <tr key={secao}>
                <td className="wp06-td">{secao}</td>
                <td className="wp06-td">
                  <span className={icon === "★" ? "wp06-star" : "wp06-empty"}>{icon}</span>{" "}
                  {status}
                </td>
                <td className="wp06-td wp06-td-right">{docs}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="wp06-p">
          À primeira vista, o resultado é promissor. Há documentos reais acessíveis — 238 dispensas
          eletrônicas de 2024 a 2026 são um alvo de altíssimo valor para auditoria de licitações.
          Relatórios trimestrais, convênios desde 2016, auditorias independentes, o quadro de
          funcionários atualizado. Isso existe, está publicado e o Dig Dig consegue ler.
        </p>

        <p className="wp06-p">
          Mas há um buraco enorme no centro do portal. E esse buraco é exatamente onde estão os dados
          que mais interessam ao cidadão comum.
        </p>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">Quando o Portal Contradiz o Próprio Nome</h2>

        <p className="wp06-p">
          O Portal se chama "Portal da Transparência e Prestação de Contas". O menu superior tem
          abas chamadas VIAGENS, SERVIDORES e FINANÇAS. São as categorias que qualquer pessoa
          leiga — qualquer arquiteto pagando sua anuidade ao CAU/PR — esperaria encontrar ao
          acessar o site.
        </p>

        <p className="wp06-p">
          Fui verificar uma por uma, do mesmo jeito que faria naquele trabalho.
          Só que desta vez com capturas de tela.
        </p>

        <h3 className="wp06-h3">Salários: uma página que não existe mais</h3>

        <div className="wp06-figure">
          <img src="/img/wp06/01-salarios-offline.png" alt="404 - Página não encontrada ao tentar acessar salários do CAU/PR" />
          <div className="wp06-figcaption">
            <strong>Captura 1:</strong> Ao tentar acessar os dados de remuneração dos servidores,
            o portal retorna uma página 404. O link que deveria levar às tabelas salariais simplesmente
            não existe. O rodapé da página é do CAU/SC — indício de que o link estava quebrado e
            redirecionou para outro estado.
          </div>
        </div>

        <p className="wp06-p">
          Não há dados de salário dos servidores do CAU/PR acessíveis no portal. A seção existe no menu,
          mas o destino é uma página 404. Não é um dado difícil de publicar — é uma planilha.
          Qualquer servidor público no Brasil tem sua remuneração de direito público.
        </p>

        <h3 className="wp06-h3">Diárias: o portal que só olha para o futuro</h3>

        <div className="wp06-figure">
          <img src="/img/wp06/02-diarias-futuro.png" alt="Buscador de diárias mostrando apenas meses futuros: julho/2026, agosto/2026..." />
          <div className="wp06-figcaption">
            <strong>Captura 2:</strong> O buscador de "Diárias, Deslocamentos, Jetons e Auxílio
            Representação" tem um dropdown de REFERÊNCIA — mas ao abri-lo, os únicos meses disponíveis
            são futuros: julho/2026, agosto/2026, setembro/2026. Não há nenhum mês passado disponível
            para consulta. Em abril de 2026, é impossível ver qualquer diária já paga.
          </div>
        </div>

        <div className="wp06-figure">
          <img src="/img/wp06/07-jetons-futuro.png" alt="Buscador de diárias com novembro/2026 selecionado — dados futuros" />
          <div className="wp06-figcaption">
            <strong>Captura 3:</strong> O mesmo buscador em outro momento de teste — com novembro/2026
            selecionado como referência. O sistema literalmente só permite consultar meses que ainda
            não aconteceram. Os dados do passado simplesmente não estão lá.
          </div>
        </div>

        <p className="wp06-p">
          Isso não é um bug de interface. É uma falha de dados na origem: o sistema de gestão do
          CAU/PR não está alimentando o portal com dados históricos. O resultado prático é que qualquer
          cidadão que tente ver quanto foi pago em diárias em 2024 vai embora de mãos vazias.
        </p>

        <h3 className="wp06-h3">O setor "histórico" que não tem histórico</h3>

        <div className="wp06-figure">
          <img src="/img/wp06/03-diarias-sem-dados.png" alt="Pesquisa de diárias de 2021 a 2026 retorna: Sua pesquisa não retornou nenhum resultado" />
          <div className="wp06-figcaption">
            <strong>Captura 4:</strong> O portal tem uma seção separada chamada "Diárias,
            Deslocamentos e Passagens Aéreas (pagos até 31/12/2015)" — o próprio nome sugere que
            deveria cobrir o período histórico até 2015. Ao pesquisar de 2021 a 2026: nenhum resultado.
          </div>
        </div>

        <div className="wp06-figure">
          <img src="/img/wp06/08-diarias-passagens.png" alt="Outra busca histórica de diárias e passagens sem resultado" />
          <div className="wp06-figcaption">
            <strong>Captura 5:</strong> Segunda tentativa com a mesma seção histórica, intervalo
            diferente. Mesmo resultado: "Sua pesquisa não retornou nenhum resultado."
            A base de dados está vazia ou inacessível.
          </div>
        </div>

        <h3 className="wp06-h3">Passagens Aéreas: o mesmo problema</h3>

        <div className="wp06-figure">
          <img src="/img/wp06/05-passagens-futuro.png" alt="Buscador de Passagens Aéreas mostrando apenas meses futuros: julho/2026 em diante" />
          <div className="wp06-figcaption">
            <strong>Captura 6:</strong> A seção de Passagens Aéreas repete exatamente o mesmo
            problema das diárias: dropdown com apenas meses futuros. Julho/2026 é o mês mais antigo
            disponível. Qualquer passagem aérea comprada nos últimos anos é invisível ao cidadão.
          </div>
        </div>

        <div className="wp06-figure">
          <img src="/img/wp06/06-passagens-sem-dados.png" alt="Busca histórica de passagens aéreas não retorna resultados" />
          <div className="wp06-figcaption">
            <strong>Captura 7:</strong> A versão histórica da seção de passagens também retorna
            zero para qualquer período pesquisado. O padrão é consistente: o portal existe,
            a interface funciona, mas os dados não estão lá.
          </div>
        </div>

        <h3 className="wp06-h3">Quando o servidor expõe o próprio erro</h3>

        <div className="wp06-figure">
          <img src="/img/wp06/04-diarias-erro-buscador.png" alt="Stack trace Java exposto publicamente na página de busca de diárias" />
          <div className="wp06-figcaption">
            <strong>Captura 8:</strong> Em uma das tentativas de busca, o servidor do portal retornou
            um stack trace Java diretamente na página — o erro técnico interno exposto ao público.
            Isso é ao mesmo tempo um problema de segurança (vazamento de informação de infraestrutura)
            e um diagnóstico involuntário: o sistema de busca simplesmente quebrou.
          </div>
        </div>

        <div className="wp06-callout">
          <p className="wp06-p">
            <strong>Resumo do que está inacessível:</strong> diárias e deslocamentos, passagens aéreas,
            jetons e auxílio representação, folhas de pagamento e tabelas de remuneração. São exatamente
            os dados financeiros mais sensíveis e mais esperados pelo cidadão — e pelo jornalista,
            pelo advogado, pelo pesquisador.
          </p>
          <p className="wp06-p" style={{ marginBottom: 0 }}>
            O portal existe. O menu existe. A promessa de transparência existe. Os dados, não.
          </p>
        </div>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">O Que a Lei Exige</h2>

        <p className="wp06-p">
          O Art. 8º da Lei 12.527/2011 (Lei de Acesso à Informação) exige que órgãos públicos
          publiquem, em local de fácil acesso, informações de interesse coletivo — incluindo
          remuneração e despesas com viagens e diárias. O Decreto 8.777/2016 foi mais longe:
          exige dados abertos em formato reutilizável, atualizados periodicamente.
        </p>

        <p className="wp06-p">
          O CAU/PR é um conselho federal com personalidade jurídica de direito público, criado pela
          Lei 12.378/2010. Não é uma empresa privada. Seus recursos vêm das anuidades obrigatórias
          de mais de 40 mil arquitetos e urbanistas do Paraná.
        </p>

        <p className="wp06-p">
          O arquiteto que paga sua anuidade hoje não consegue ver quanto o presidente do CAU/PR
          gastou em passagem aérea no ano passado. Não consegue ver as diárias pagas em 2023.
          Não consegue ver os salários dos funcionários. O portal existe para cumprir a lei no papel.
          Na prática, os dados mais relevantes simplesmente não estão lá.
        </p>

        <p className="wp06-p">
          Isso não é uma acusação de má-fé. É um registro factual: o portal falha no seu objetivo
          central de transparência. Se é por falta de recursos técnicos, por negligência administrativa
          ou por conveniência, não cabe a mim afirmar. Cabe ao CAU/PR explicar.
        </p>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">O Que Conseguimos Ver Mesmo Assim</h2>

        <p className="wp06-p">
          Apesar das limitações, o garimpo revelou dados reais de alto valor investigativo.
          O Dig Dig consegue acessar e analisar:
        </p>

        <ul className="wp06-ul">
          {[
            ["238 dispensas eletrônicas (2024–2026):", "contratações diretas sem licitação, com valores, justificativas e fornecedores. É o corpus de maior risco para auditoria de licitações — e está acessível."],
            ["85 relatórios trimestrais:", "prestações de contas financeiras periódicas com balanços e execução orçamentária."],
            ["26 convênios desde 2016:", "acordos de cooperação, repasses e parcerias — com histórico de dez anos."],
            ["12 relatórios anuais ao TCU:", "os relatórios de gestão enviados ao Tribunal de Contas da União — a fonte mais completa de prestação de contas disponível."],
            ["12 contratações diretas e inexigibilidades:", "contratos onde o CAU/PR dispensou o processo licitatório normal."],
            ["8 auditorias independentes:", "laudos de auditoria externa, incluindo pareceres sobre as contas do exercício."],
            ["Quadro de empregados (março/2026):", "lista atualizada de todos os servidores — sem remuneração, mas com cargos e unidades."],
            ["Contratos vigentes (julho/2025):", "planilha de todos os contratos ativos do CAU/PR em um único arquivo."],
          ].map(([label, desc]) => (
            <li key={label} className="wp06-li">
              <strong>{label}</strong> {desc}
            </li>
          ))}
        </ul>

        <p className="wp06-p">
          Isso é substancial. Não é tudo que deveria estar disponível, mas é muito mais do que eu
          conseguia acessar manualmente em semanas naquele período.
        </p>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">O Que Vem Agora: Fase 3</h2>

        <p className="wp06-p">
          A Fase 3 da operação CAU/PR no Dig Dig vai focar no que está acessível e não foi analisado.
          A sequência planejada:
        </p>

        <ol className="wp06-ol">
          {[
            ["Dispensa Eletrônica (238 docs):", "prioridade máxima. Contratações diretas são o terreno fértil da irregularidade administrativa — é onde fornecedores favorecidos aparecem, onde o teto de dispensa é tocado repetidamente, onde os mesmos nomes retornam. O Dig Dig vai ler cada uma."],
            ["Contratos Vigentes:", "a planilha de julho/2025 com todos os contratos ativos do CAU/PR vai para o Bud. É um único arquivo, mas concentra informação densa sobre fornecedores, valores e vigências."],
            ["Relatórios ao TCU:", "os relatórios anuais de gestão são documentos longos e ricos. Com 12 anos de histórico, o Dig Dig pode detectar padrões que evoluem ao longo do tempo — algo impossível de fazer manualmente."],
            ["Pedido de Acesso à Informação (LAI):", "para os dados que o portal não publica — diárias, passagens, folhas de pagamento — vou protocolar um pedido formal via e-SIC. O CAU/PR tem prazo legal de 20 dias para responder. A resposta, ou a negativa, também vira dado."],
          ].map(([label, desc]) => (
            <li key={label} className="wp06-li">
              <strong>{label}</strong> {desc}
            </li>
          ))}
        </ol>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">Sobre Ir a Público — e Como Financiar Isso</h2>

        <p className="wp06-p">
          Estou muito orgulhoso do que foi construído. E também ansioso.
        </p>

        <p className="wp06-p">
          O Dig Dig chegou a um ponto onde já tem resultados reais: 1.340 documentos mapeados,
          análises com score de risco, fichas de denúncia geradas, pipeline em tempo real, painel
          conectado. Mas ainda está em modo privado — só eu acesso.
        </p>

        <p className="wp06-p">
          A questão de ir a público não é técnica. É estratégica. Abrir antes da hora significa
          lançar um produto incompleto para um público que ainda não existe. Abrir no momento certo
          significa ter uma história clara para contar: "O Dig Dig analisou X atos do CAU/PR,
          encontrou Y casos que merecem investigação, e aqui estão as fichas."
        </p>

        <p className="wp06-p">
          O momento certo está próximo — mas ainda não chegou. Preciso terminar a Fase 3,
          ter resultados concretos das dispensas eletrônicas e dos contratos, e resolver a questão
          do financiamento.
        </p>

        <p className="wp06-p">
          O modelo de negócio do Dig Dig é incomum: todo o conteúdo gerado é gratuito e aberto.
          Qualquer pessoa pode ler as fichas, os scores, os resumos. O que é pago é o chat com a IA
          — a camada de conversa onde você pode perguntar "mostre os atos com score acima de 70
          nos últimos dois anos" e a ferramenta responde em linguagem natural.
        </p>

        <p className="wp06-p">
          Estou considerando formas de financiamento que preservem essa abertura: um plano de
          patrocínio anual para quem acredita no projeto, parcerias com veículos de imprensa,
          e potencialmente uma chamada pública quando o primeiro conjunto de resultados for revelador
          o suficiente para gerar interesse espontâneo.
        </p>

        <p className="wp06-p">
          O nome "Dig Dig" — eu realmente gosto. É um nome engraçado para uma ferramenta séria.
          Faz o que diz: cava, cava, cava. Até encontrar algo. E guarda o que encontra.
        </p>

        <hr className="wp06-hr" />

        <h2 className="wp06-h2">O Que É o Dig Dig, Afinal</h2>

        <p className="wp06-p">
          Essa semana de garimpo me ajudou a ver com mais clareza o que estou construindo.
        </p>

        <p className="wp06-p">
          O Dig Dig não é um scraper. Não é um buscador. Não é um portal de denúncias.
          É uma <em>memória institucional automatizada</em> — uma ferramenta que lê o que os
          órgãos publicam (e o que não publicam), guarda tudo com estrutura, analisa com critério
          legal e moral, e apresenta o resultado de uma forma que qualquer pessoa consegue usar.
        </p>

        <p className="wp06-p">
          Quando um arquiteto quer saber se o CAU/PR está contratando fornecedores recorrentes
          sem licitação, não vai ficar abrindo 238 PDFs manualmente. Não vai conseguir cruzar
          os nomes dos contratos com os dos conselheiros. Não vai detectar o padrão de compra
          repetida que toca o teto de dispensa várias vezes seguidas com o mesmo fornecedor.
        </p>

        <p className="wp06-p">
          O Dig Dig consegue. Já consegue. Agora é questão de apontar a ferramenta para os dados certos.
        </p>

        <p className="wp06-p">
          Naquela investigação, levei semanas para encontrar o escândalo da água San
          Pelegrino. Com o Dig Dig, teria levado dias — e teria documentação, score, ficha e PDF
          prontos para o jornalista, o vereador e o advogado ao mesmo tempo.
        </p>

        <p className="wp06-p">
          Essa é a capacidade real do Dig Dig. E ainda estamos no começo.
        </p>

        <hr className="wp06-hr" />

        <div className="wp06-summary-box">
          <p className="wp06-p" style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--text)" }}>Estado do projeto em abril/2026</strong>
          </p>
          <ul className="wp06-ul" style={{ margin: 0 }}>
            {[
              "1.340+ documentos mapeados no CAU/PR (portarias, deliberações, atas plenárias)",
              "262 portarias analisadas pelo Piper (rodada em andamento)",
              "179 atas plenárias identificadas, 161 com PDF disponível",
              "96 páginas do portal de transparência mapeadas via WP REST API",
              "238 dispensas eletrônicas acessíveis — prioridade da Fase 3",
              "Portal falha em publicar: diárias, passagens, salários, folhas de pagamento",
              "LAI em preparação para os dados ausentes",
            ].map((item) => (
              <li key={item} className="wp06-li">{item}</li>
            ))}
          </ul>
        </div>

      </article>

      <footer className="wp06-footer">
        <p>
          <strong>Dig Dig</strong> · Auditoria Automatizada de Atos Administrativos Públicos<br />
          Dados derivados dos atos oficiais publicados pelo CAU/PR. Análises geradas por IA —
          conclusões jurídicas cabem a advogados.
        </p>
        <p>
          <Link to="/blog" className="wp06-link">← Todos os White Papers</Link>
          {" · "}
          <Link to="/whitepaper-05-quando-a-maquina-entra-na-sala" className="wp06-link">White Paper Nº 05</Link>
        </p>
      </footer>
    </div>
  );
}
