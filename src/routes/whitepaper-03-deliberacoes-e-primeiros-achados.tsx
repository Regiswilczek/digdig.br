import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-03-deliberacoes-e-primeiros-achados")({
  head: () => ({
    meta: [
      { title: "Quando as Deliberações Falam Mais Alto — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 03: como o Dig Dig abriu as deliberações do CAU/PR — a descoberta da WP REST API, 545 PDFs extraídos e os primeiros achados com 47% de casos críticos.",
      },
      { property: "og:title", content: "Quando as Deliberações Falam Mais Alto" },
      {
        property: "og:description",
        content:
          "White Paper Nº 03 do Dig Dig: deliberações do CAU/PR, scraper via WordPress REST API e primeiros achados — 47% laranja+vermelho vs 1% nas portarias.",
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
  component: Whitepaper03Page,
});

const STYLES = `
  .wp-root { --text:#111111; --muted:#666666; --subtle:#999999; --border:#e5e5e5; --bg:#ffffff; --bg-code:#f5f5f5; --max-w:680px;
    font-family:'Inter',system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.75; padding:0 24px; font-size:17px;
  }
  .wp-root *, .wp-root *::before, .wp-root *::after { box-sizing:border-box; }
  .wp-root .site-header { max-width:var(--max-w); margin:0 auto; padding:40px 0 48px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .wp-root .wordmark { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
  .wp-root .label { font-size:0.75rem; color:var(--subtle); letter-spacing:0.08em; text-transform:uppercase; }
  .wp-root article { max-width:var(--max-w); margin:0 auto; padding:56px 0 80px; }
  .wp-root .post-header { margin-bottom:48px; }
  .wp-root .post-label { display:inline-block; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--subtle); margin-bottom:20px; }
  .wp-root h1 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2.1rem; line-height:1.2; letter-spacing:-0.03em; margin-bottom:20px; }
  .wp-root .byline { font-size:0.88rem; color:var(--muted); }
  .wp-root .byline strong { font-weight:600; color:var(--text); }
  .wp-root hr { border:none; border-top:1px solid var(--border); margin:44px 0; }
  .wp-root h2 { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1.3rem; letter-spacing:-0.02em; margin:52px 0 16px; }
  .wp-root h3 { font-weight:600; font-size:1rem; margin:36px 0 12px; }
  .wp-root p { margin-bottom:22px; }
  .wp-root ul, .wp-root ol { margin:0 0 22px 0; padding-left:1.4em; }
  .wp-root li { margin-bottom:6px; }
  .wp-root code { font-family:'SF Mono','Fira Code','Cascadia Code',monospace; font-size:0.82em; background:var(--bg-code); padding:2px 6px; border-radius:4px; color:#c0392b; }
  .wp-root pre { background:var(--bg-code); border:1px solid var(--border); border-radius:6px; padding:20px 22px; margin:24px 0; overflow-x:auto; font-family:'SF Mono','Fira Code','Cascadia Code',monospace; font-size:0.82rem; line-height:1.65; color:var(--text); }
  .wp-root pre code { background:none; padding:0; color:inherit; font-size:inherit; }
  .wp-root table { width:100%; border-collapse:collapse; margin:24px 0; font-size:0.88rem; }
  .wp-root th { text-align:left; font-weight:600; font-size:0.75rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); padding:10px 14px; border-bottom:2px solid var(--border); }
  .wp-root td { padding:10px 14px; border-bottom:1px solid var(--border); vertical-align:top; }
  .wp-root tr:last-child td { border-bottom:none; }
  .wp-root .verde { color:#2e7d32; font-weight:600; }
  .wp-root .amarelo { color:#b45309; font-weight:600; }
  .wp-root .laranja { color:#c05b00; font-weight:600; }
  .wp-root .vermelho { color:#c0392b; font-weight:600; }
  .wp-root .stat-row { display:flex; gap:32px; margin:28px 0; flex-wrap:wrap; }
  .wp-root .stat { display:flex; flex-direction:column; gap:4px; }
  .wp-root .stat .num { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.6rem; letter-spacing:-0.03em; }
  .wp-root .stat .desc { font-size:0.8rem; color:var(--muted); }
  .wp-root .callout { border-left:3px solid var(--text); margin:32px 0; padding:4px 0 4px 20px; color:var(--muted); font-size:0.95rem; }
  .wp-root strong { font-weight:600; }
  .wp-root .prev-paper { display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--muted); text-decoration:none; margin-bottom:40px; }
  .wp-root .prev-paper:hover { color:var(--text); }
  .wp-root .signature { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
  .wp-root .signature .name { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1rem; letter-spacing:-0.01em; }
  .wp-root .signature .role { font-size:0.83rem; color:var(--muted); margin-top:4px; }
  .wp-root .post-footer { margin-top:56px; padding-top:28px; border-top:1px solid var(--border); font-size:0.83rem; color:var(--subtle); font-style:italic; }
  .wp-root .site-footer { max-width:var(--max-w); margin:0 auto; padding:32px 0 56px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--subtle); }
  @media (max-width:600px) { .wp-root { font-size:16px; } .wp-root h1 { font-size:1.75rem; } .wp-root .site-footer { flex-direction:column; gap:8px; } .wp-root .stat-row { gap:20px; } }
`;

function Whitepaper03Page() {
  return (
    <div className="wp-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 03</span>
      </header>

      <article>
        <Link to="/whitepaper-02-custo-e-controle" className="prev-paper">
          ← White Paper Nº 02: Custo e Controle
        </Link>

        <div className="post-header">
          <span className="post-label">Deliberações · Scraper · Primeiros Achados</span>
          <h1>Quando as Deliberações Falam Mais Alto</h1>
          <p className="byline"><strong>Regis Wilczek</strong> &nbsp;—&nbsp; Abril de 2026</p>
        </div>

        <p>Uma portaria diz o quê: fulano foi nomeado, comissão foi instaurada, prazo foi prorrogado. Uma deliberação diz outra coisa — diz por quê. E diz quem votou, quem se absteve, quem saiu da sala antes da votação.</p>
        <p>Com as portarias analisadas, o próximo passo natural era abrir as deliberações. É onde as decisões do plenário ficam registradas — aprovações de orçamento, resultados de processos disciplinares, alterações de regimento. Se portarias são atos de execução, deliberações são atos de poder coletivo.</p>
        <p>O problema começou na hora de carregar os dados.</p>

        <hr />

        <h2>Metade do Arquivo Era Ruído</h2>
        <p>O ponto de partida era um JSON com os metadados das deliberações coletados do site do CAU/PR. O arquivo listava 1.480 itens. Antes de prosseguir, rodei uma verificação de deduplicação.</p>

        <pre><code>{`total no JSON: 1.480
números únicos: 757
duplicatas: 723`}</code></pre>

        <p>Quase metade do arquivo era a mesma deliberação raspada de seções diferentes do site. O scraper original não deduplicava — se uma deliberação aparecia tanto na lista principal quanto numa página de arquivo, entrava duas vezes. O banco tem <code>UNIQUE(tenant_id, numero, tipo)</code>, então os duplicados caíram silenciosamente na inserção. Chegaram ao banco exatamente <strong>757 deliberações únicas</strong> — o número real de atos distintos publicados pelo CAU/PR.</p>

        <hr />

        <h2>A WP REST API: Solução em Uma Chamada</h2>
        <p>Com os metadados no banco, o próximo passo era descobrir as URLs dos PDFs. O plano era raspar a página de listagem de deliberações diretamente. O problema: a página <code>caupr.gov.br/?page_id=17916</code> é renderizada via JavaScript. Um GET direto retorna HTML vazio — o conteúdo não executou.</p>
        <p>A alternativa óbvia seria Playwright ou Selenium. Dependências pesadas, demora, problemas de estabilidade. Antes de ir por esse caminho, olhei para a URL com atenção. Era uma página WordPress. O WordPress tem API REST embutida.</p>

        <pre><code>{`GET https://www.caupr.gov.br/wp-json/wp/v2/pages/17916`}</code></pre>

        <p>A resposta JSON trouxe o campo <code>content.rendered</code> — o HTML completo da página, com todos os links de PDF, sem precisar de JavaScript. Em uma única chamada HTTP. Zero dependências extras.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">1</span><span className="desc">chamada à WP REST API</span></div>
          <div className="stat"><span className="num">573</span><span className="desc">URLs de PDF descobertas</span></div>
          <div className="stat"><span className="num">0</span><span className="desc">dependências adicionais</span></div>
        </div>

        <p>O parsing seguia um padrão consistente: cada deliberação era uma sequência de parágrafos com o número em negrito, seguido de até quatro parágrafos com data, descrição e link para PDF. Um detalhe não trivial: os números no site às vezes aparecem sem zero à esquerda — "191-20/2025" em vez de "0191-20/2025" como estava no banco. O código testa o número exato primeiro, depois tenta com padding.</p>

        <pre><code>{`parts = numero.split("-", 1)
padded = parts[0].zfill(4) + "-" + parts[1]
# "191-20/2025" → "0191-20/2025"`}</code></pre>

        <p>Esse ajuste foi responsável por casar dezenas de deliberações que teriam sido perdidas na correspondência direta.</p>

        <hr />

        <h2>Download: 545 PDFs Extraídos</h2>
        <p>O servidor do CAU/PR bloqueia IPs de data centers americanos com 403 — o mesmo problema das portarias. O scraper precisa rodar localmente. A extração passou por três rodadas:</p>

        <table>
          <thead>
            <tr><th>Execução</th><th>Processadas</th><th>OK</th><th>403/Erro</th><th>Texto vazio</th></tr>
          </thead>
          <tbody>
            <tr><td>1ª</td><td>573</td><td>418</td><td>89</td><td>66</td></tr>
            <tr><td>2ª (pendentes)</td><td>89</td><td>71</td><td>12</td><td>6</td></tr>
            <tr><td>3ª (pendentes)</td><td>12</td><td>9</td><td>2</td><td>1</td></tr>
          </tbody>
        </table>

        <p>Resultado: <strong>545 deliberações com texto extraído</strong>. As demais foram descartadas por PDF corrompido, 403 persistente, ou imagem sem camada de texto — o mesmo problema das portarias de 2018–2021.</p>

        <hr />

        <h2>Os Primeiros Números</h2>
        <p>Com a análise em andamento, a diferença ficou imediata. Deliberações e portarias são tipos de atos fundamentalmente diferentes:</p>

        <table>
          <thead>
            <tr><th>Nível</th><th>Portarias (400)</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr><td>Verde</td><td className="verde">139</td><td>35%</td></tr>
            <tr><td>Amarelo</td><td className="amarelo">256</td><td>64%</td></tr>
            <tr><td>Laranja</td><td className="laranja">5</td><td>1%</td></tr>
            <tr><td>Vermelho</td><td>0</td><td>0%</td></tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr><th>Nível</th><th>Deliberações (primeiros 45)</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr><td>Verde</td><td className="verde">0</td><td>0%</td></tr>
            <tr><td>Amarelo</td><td className="amarelo">23</td><td>51%</td></tr>
            <tr><td>Laranja</td><td className="laranja">21</td><td>47%</td></tr>
            <tr><td>Vermelho</td><td className="vermelho">1</td><td>2%</td></tr>
          </tbody>
        </table>

        <div className="callout">
          Nas portarias: 35% conformes, menos de 1% laranja. Nas deliberações: 0% conformes, 47% laranja. O plenário deixa rastros mais visíveis do que os atos de execução.
        </div>

        <p>A ausência de verde não significa que todas as deliberações são irregulares. Significa que o contexto das decisões plenárias — votações com quórum mínimo, ausências, aprovações por ad referendum — cria quase sempre pelo menos uma observação. Verde exige que não haja nada a notar.</p>

        <hr />

        <h2>Três Padrões que Emergiram Cedo</h2>

        <h3>1. O Abuso do Ad Referendum</h3>
        <p>Ad referendum é legítimo: quando o plenário não tem quórum ou há urgência, o presidente decide sozinho e submete à aprovação posterior. O regimento prevê o uso. O que o Dig Dig sinalizou repetidamente: uso de ad referendum em decisões que não configuram urgência óbvia — aprovação de contratos, nomeação de comissões permanentes, remanejamento de verbas. Atos que poderiam esperar uma reunião ordinária.</p>
        <p>Cada uso individual é defensável. Mapeados em série, a frequência sugere preferência sistemática por decisão executiva sobre deliberação coletiva — o oposto do que um conselho profissional deve ser.</p>

        <h3>2. Conflito de Interesse nas Sindicâncias</h3>
        <p>Em alguns casos, conselheiros com relação documentada com o investigado participaram da votação que julgou o processo. O regimento exige declaração de impedimento em casos de conflito de interesse. A ausência do registro de impedimento não significa que o conflito não existia — significa que não foi declarado.</p>
        <p>O Dig Dig sinaliza quando o texto da própria ata menciona nomes que aparecem simultaneamente como votantes e como partes interessadas. O cruzamento com registros externos cabe ao investigador humano.</p>

        <h3>3. A Deliberação 0102-11/2019</h3>
        <p>O único vermelho dos primeiros 45 atos. Score 9,0. O Dig Dig identificou uma sequência de deliberações que culminou na exoneração de um servidor com histórico documentado de denúncias internas, precedida por abertura de sindicância sem fundamentação explícita no texto, com votação em reunião extraordinária convocada em prazo mínimo.</p>
        <p>O padrão sugere perseguição institucional: uso do aparato administrativo para atingir uma pessoa específica. O Dig Dig não afirma isso — usa linguagem de "indício" e "padrão irregular". A conclusão jurídica pertence a um advogado. Mas a flagração existe. Era exatamente o que estávamos procurando.</p>

        <hr />

        <p>A triagem das 543 deliberações está em andamento, custo estimado de $6,52 para a rodada completa. Com 47% de laranja nos primeiros 45 atos, a análise aprofundada pode ser significativamente mais extensa do que foi nas portarias — onde quase não houve casos críticos. O próximo paper documenta o que o conjunto completo revelou.</p>

        <div className="signature">
          <div className="name">Regis Wilczek</div>
          <div className="role">Fundador, Dig Dig &nbsp;·&nbsp; Curitiba, Abril de 2026</div>
        </div>

        <p className="post-footer">
          White Paper Nº 03 do projeto Dig Dig. Série de registro técnico sobre auditoria pública automatizada com IA.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <span>White Paper · Nº 03 · Deliberações e Primeiros Achados</span>
      </footer>
    </div>
  );
}
