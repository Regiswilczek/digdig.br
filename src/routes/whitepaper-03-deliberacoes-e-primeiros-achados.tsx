import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-03-deliberacoes-e-primeiros-achados")({
  head: () => ({
    meta: [
      { title: "Quando as Deliberações Falam Mais Alto — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 03: como o Dig Dig abriu as deliberações do CAU/PR — a descoberta da WP REST API, 545 PDFs extraídos e os primeiros achados com 41% de casos críticos.",
      },
      { property: "og:title", content: "Quando as Deliberações Falam Mais Alto" },
      {
        property: "og:description",
        content:
          "White Paper Nº 03 do Dig Dig: deliberações do CAU/PR, scraper via WordPress REST API e primeiros achados — 41% de laranja+vermelho vs 3% nas portarias.",
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
  .wp-root .verde    { color:#2e7d32; font-weight:600; }
  .wp-root .amarelo  { color:#b45309; font-weight:600; }
  .wp-root .laranja  { color:#c05b00; font-weight:600; }
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
          ← White Paper Nº 02: Quando a IA Custa Mais do Que Deveria
        </Link>

        <div className="post-header">
          <span className="post-label">Deliberações · Scraper · Primeiros Achados</span>
          <h1>Quando as Deliberações Falam Mais Alto</h1>
          <p className="byline"><strong>Regis Wilczek</strong> &nbsp;—&nbsp; Abril de 2026</p>
        </div>

        <h2>Onde Paramos</h2>
        <p>No White Paper anterior documentei o incidente de custo: $23,72 consumidos por rodadas paralelas e workers zumbis, e as quatro camadas de proteção que implementamos para que não aconteça de novo — guard no endpoint, idempotência no serviço, verificação cooperativa de cancelamento no worker, e teto automático de $15 por rodada.</p>
        <p>Com a infra corrigida, a rodada das portarias foi concluída. Os resultados finais:</p>

        <div className="stat-row">
          <div className="stat"><span className="num">551</span><span className="desc">portarias analisadas</span></div>
          <div className="stat"><span className="num">$8,87</span><span className="desc">custo total rastreado</span></div>
          <div className="stat"><span className="num">3%</span><span className="desc">laranja + vermelho</span></div>
        </div>

        <p>A distribuição das portarias foi: 23% verde (conformes), 74% amarelo (suspeitas), 2% laranja, 1% vermelho. O Dig Dig aprofundou 21 casos críticos com análise completa e fichas de denúncia estruturadas.</p>
        <p>O próximo passo natural era o segundo tipo de ato do CAU/PR: as deliberações. É onde as decisões plenárias ficam registradas — aprovações de orçamento, resultados de processos disciplinares, alterações de regimento, nomeações de comissões. Se as portarias são os atos de execução, as deliberações são os atos de poder.</p>

        <hr />

        <h2>O Primeiro Obstáculo: Dados Duplicados</h2>
        <p>O ponto de partida era um arquivo JSON com os metadados das deliberações coletados anteriormente do site do CAU/PR. O arquivo listava 1.480 itens.</p>
        <p>Antes de prosseguir, rodamos uma verificação de deduplicação:</p>
        <pre><code>{`import json
from pathlib import Path

with open("deliberacoes_completo.json") as f:
    dados = json.load(f)

numeros = [d.get("numero", "").strip() for d in dados]
unicos = set(n for n in numeros if n)

print(f"Total no JSON: {len(dados)}")
print(f"Números únicos: {len(unicos)}")
print(f"Duplicatas: {len(dados) - len(unicos)}")`}</code></pre>

        <p>Resultado:</p>
        <pre><code>{`Total no JSON: 1.480
Números únicos: 757
Duplicatas: 723`}</code></pre>

        <p>Quase metade do arquivo era ruído — a mesma deliberação raspada de diferentes seções do site, cadastrada múltiplas vezes com o mesmo número. O banco tem uma constraint <code>UNIQUE(tenant_id, numero, tipo)</code> que ignorou silenciosamente as duplicatas na inserção. O que chegou ao banco foram exatamente <strong>757 deliberações únicas</strong> — que é o número real de atos distintos publicados pelo CAU/PR.</p>

        <hr />

        <h2>O Segundo Obstáculo: JavaScript</h2>
        <p>Com os metadados no banco, o próximo passo era descobrir as URLs dos PDFs. O plano inicial era raspar a página de listagem de deliberações diretamente.</p>
        <p>O problema: a página <code>caupr.gov.br/?page_id=17916</code> é renderizada via JavaScript. Um GET direto retorna o HTML do WordPress com o conteúdo completamente ausente — o JavaScript que monta a lista não executou. BeautifulSoup não vê nada.</p>
        <p>A alternativa óbvia seria usar Playwright ou Selenium. Mas isso adiciona dependências pesadas, demora, e traz seus próprios problemas de estabilidade.</p>
        <p>Então olhamos para a URL com atenção. Era uma página do WordPress. O WordPress tem uma API REST embutida.</p>
        <pre><code>{`GET https://www.caupr.gov.br/wp-json/wp/v2/pages/17916`}</code></pre>
        <p>A resposta JSON trouxe o campo <code>content.rendered</code> — o HTML completo da página, já com todos os links de PDF, sem precisar de JavaScript. Em uma única chamada HTTP.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">1</span><span className="desc">chamada à WP REST API</span></div>
          <div className="stat"><span className="num">573</span><span className="desc">URLs de PDF descobertas</span></div>
          <div className="stat"><span className="num">0</span><span className="desc">dependências extras</span></div>
        </div>

        <p>A estrutura do HTML retornado seguia um padrão consistente: cada deliberação era representada por uma sequência de parágrafos — um com o título em negrito contendo o número, seguido de até quatro parágrafos com data, descrição e link para o PDF.</p>
        <pre><code>{`soup = BeautifulSoup(content_html, "lxml")
paragraphs = soup.find_all("p")

for i, p in enumerate(paragraphs):
    if not p.find("strong"):
        continue
    texto = p.get_text(" ", strip=True)
    candidatos = normalizar_numero(texto)
    if not candidatos:
        continue

    pdf_url = None
    for j in range(i, min(i + 4, len(paragraphs))):
        for a in paragraphs[j].find_all("a", href=True):
            if a["href"].lower().endswith(".pdf"):
                pdf_url = a["href"]
                break
        if pdf_url:
            break

    if pdf_url:
        await conn.execute(
            "UPDATE atos SET url_pdf=$1 WHERE id=$2",
            pdf_url, row["id"]
        )`}</code></pre>

        <p>Um detalhe não trivial: os números de deliberação no site às vezes aparecem sem zero à esquerda — "191-20/2025" em vez de "0191-20/2025" como está no banco. O código testa primeiro o número exato, depois tenta com padding:</p>
        <pre><code>{`parts = numero.split("-", 1)
padded = parts[0].zfill(4) + "-" + parts[1]
# "191-20/2025" → "0191-20/2025"`}</code></pre>
        <p>Esse ajuste foi responsável por casar dezenas de deliberações que teriam sido perdidas na correspondência direta.</p>

        <hr />

        <h2>Fase 1: Download dos PDFs</h2>
        <p>Com 573 URLs descobertas, a próxima etapa foi baixar cada PDF e extrair o texto. O mesmo scraper das portarias, adaptado para deliberações — rodando localmente com IP brasileiro, já que o servidor do CAU/PR bloqueia IPs de data centers americanos com 403.</p>
        <p>A extração passou por três rodadas para processar o conjunto completo:</p>

        <table>
          <thead>
            <tr><th>Execução</th><th>Processadas</th><th>OK</th><th>403 / Erro</th><th>Texto vazio</th></tr>
          </thead>
          <tbody>
            <tr><td>1ª</td><td>573</td><td>418</td><td>89</td><td>66</td></tr>
            <tr><td>2ª (pendentes)</td><td>89</td><td>71</td><td>12</td><td>6</td></tr>
            <tr><td>3ª (pendentes)</td><td>12</td><td>9</td><td>2</td><td>1</td></tr>
          </tbody>
        </table>

        <p>Resultado final: <strong>545 deliberações com texto extraído</strong>. As demais foram descartadas por PDF corrompido, resposta 403 persistente, ou PDFs escaneados sem camada de texto — o mesmo problema dos 151 portarias de 2018–2021.</p>
        <p>Um detalhe prático: o Python em Windows usa cp1252 como encoding padrão no stdout. Scripts com caracteres UTF-8 nos logs crasham silenciosamente quando rodam em segundo plano. A correção vai no topo de cada script:</p>
        <pre><code>{`if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")`}</code></pre>

        <hr />

        <h2>Montando a Rodada</h2>
        <p>Com 543 deliberações prontas para análise, criamos a rodada:</p>
        <pre><code>{`INSERT INTO rodadas_analise (
    id, tenant_id, status, total_atos,
    atos_analisados_haiku, custo_total_usd, criado_em
) VALUES (
    '5b365c0d-43be-4a7e-a22d-159f50fbe3c2',
    'f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4',
    'em_progresso', 543,
    0, 0, NOW()
);`}</code></pre>
        <p>A query de seleção discrimina por tipo e prioriza ordem cronológica — deliberações mais antigas tendem a estabelecer precedentes que contextualizam as mais recentes:</p>
        <pre><code>{`SELECT * FROM atos
WHERE tenant_id = $1
  AND tipo = 'deliberacao'
  AND pdf_baixado = true
  AND processado = false
ORDER BY data_publicacao ASC NULLS LAST`}</code></pre>

        <hr />

        <h2>Os Primeiros Números</h2>
        <p>Com a análise em andamento, os primeiros resultados deixaram imediatamente claro que deliberações são um tipo de ato fundamentalmente diferente das portarias.</p>
        <p>Para comparação, a distribuição final das portarias:</p>

        <table>
          <thead>
            <tr><th>Nível</th><th>Portarias</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr><td>Verde</td><td className="verde">124</td><td>23%</td></tr>
            <tr><td>Amarelo</td><td className="amarelo">409</td><td>74%</td></tr>
            <tr><td>Laranja</td><td className="laranja">12</td><td>2%</td></tr>
            <tr><td>Vermelho</td><td className="vermelho">6</td><td>1%</td></tr>
          </tbody>
        </table>

        <p>E a distribuição dos primeiros 88 atos de deliberação analisados:</p>

        <table>
          <thead>
            <tr><th>Nível</th><th>Deliberações</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr><td>Verde</td><td className="verde">3</td><td>3%</td></tr>
            <tr><td>Amarelo</td><td className="amarelo">49</td><td>56%</td></tr>
            <tr><td>Laranja</td><td className="laranja">32</td><td>36%</td></tr>
            <tr><td>Vermelho</td><td className="vermelho">4</td><td>5%</td></tr>
          </tbody>
        </table>

        <div className="callout">
          Nas portarias: 3% de casos críticos (laranja+vermelho). Nas deliberações: 41%. O plenário deixa rastros mais visíveis do que os atos de execução.
        </div>

        <p>A ausência de verde quase absoluta não significa que todas as deliberações são irregulares. Significa que o contexto das decisões plenárias — votações com quórum mínimo, ausências registradas, aprovações por ad referendum — cria, quase sempre, pelo menos uma observação que merece atenção. Verde exige que não haja absolutamente nada a notar.</p>

        <hr />

        <h2>Três Padrões que Emergiram Cedo</h2>

        <h3>1. O Abuso do Ad Referendum</h3>
        <p>Ad referendum é um mecanismo legítimo: quando o plenário não tem quórum ou quando há urgência, o presidente pode decidir sozinho e submeter a decisão à aprovação posterior do plenário. O regimento interno do CAU/PR prevê o uso.</p>
        <p>O que o Dig Dig sinalizou repetidamente nas primeiras deliberações: uso de ad referendum em decisões que não configuram urgência óbvia — aprovação de contratos, nomeação de comissões permanentes, remanejamento de verbas. Atos que poderiam esperar uma reunião plenária ordinária, mas foram decididos unilateralmente e homologados depois.</p>
        <p>O padrão é sutil. Cada uso individual é defensável. Mas quando mapeados em série, a frequência sugere uma preferência sistemática por decisões executivas sobre deliberações coletivas — o oposto do que um conselho profissional deve ser.</p>

        <h3>2. Conflito de Interesse nas Sindicâncias</h3>
        <p>O segundo padrão envolveu deliberações sobre resultados de processos disciplinares. Em alguns casos, conselheiros com relação documentada com o investigado participaram da votação que julgou o processo.</p>
        <p>O regimento exige impedimento em casos de conflito de interesse. A ausência de registros de impedimento nas atas não significa que o conflito não existia — significa que não foi declarado.</p>
        <p>Para o Dig Dig, isso é exatamente o tipo de irregularidade que um auditor humano encontraria consultando a composição do plenário na data do voto e cruzando com os nomes mencionados nos processos. O sistema não faz esse cruzamento de registros externos — mas sinaliza quando o texto da própria ata menciona nomes que aparecem simultaneamente como votantes e como partes interessadas.</p>

        <h3>3. A Deliberação 0102-11/2019</h3>
        <p>O único vermelho identificado nos primeiros atos analisados foi a deliberação <code>0102-11/2019</code>, que recebeu score 9,0 numa escala de 0 a 10.</p>
        <p>O Dig Dig identificou um conjunto de elementos que, isoladamente, seriam apenas suspeitos — mas combinados apontam para algo mais sério: uma sequência de deliberações que culminou na exoneração de um servidor com histórico documentado de denúncias internas, precedida por abertura de sindicância sem fundamentação explícita no texto, com votação realizada em reunião extraordinária convocada em prazo mínimo.</p>
        <p>O padrão sugere perseguição institucional: uso do aparato administrativo — sindicância, reunião extraordinária, deliberação formal — para atingir uma pessoa específica. O Dig Dig não afirma isso — usa linguagem de "indício" e "padrão irregular". A conclusão jurídica pertence a um advogado.</p>
        <p>Mas a flagração existe. E era exatamente isso que estávamos procurando.</p>

        <hr />

        <h2>Por Que Deliberações São Diferentes</h2>
        <p>Há uma diferença estrutural entre portarias e deliberações que explica a diferença nas taxas de sinalização.</p>
        <p>Portarias são atos de execução: alguém nomeia, alguém exonera, alguém instala uma comissão. O texto é enxuto, padronizado, repetitivo. A irregularidade, quando existe, tende a ser direta — nepotismo evidente, cargo criado sem previsão, prazo violado.</p>
        <p>Deliberações são atos de poder coletivo. O texto registra quem votou, quem se absteve, quem estava ausente, qual foi a motivação declarada para a decisão. Há argumentos e contrapontos. Há votações divididas. Há registros de quórum e de impedimentos — e a ausência de um registro de impedimento quando deveria existir é, ela mesma, uma informação.</p>
        <p>É um texto muito mais rico para análise. E muito mais revelador.</p>

        <hr />

        <h2>Estado Atual e Próximos Passos</h2>
        <p>A triagem das 543 deliberações pelo Dig Dig está em andamento. O custo estimado para a rodada completa é de $6,52 — em linha com o custo das portarias, já que os textos têm tamanho similar.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">543</span><span className="desc">deliberações na rodada</span></div>
          <div className="stat"><span className="num">~$6,52</span><span className="desc">custo estimado (triagem)</span></div>
          <div className="stat"><span className="num">$0,012</span><span className="desc">custo por análise</span></div>
        </div>

        <p>Quando a triagem terminar, os casos vermelho e laranja passarão pela análise aprofundada do Dig Dig: ficha de denúncia estruturada, identificação de pessoas envolvidas. Com 41% de casos críticos nos primeiros 88 atos, essa fase pode ser significativamente mais extensa do que foi nas portarias.</p>
        <p>Os outros itens pendentes no pipeline:</p>
        <ul>
          <li><strong>OCR para portarias escaneadas</strong> — 151 portarias de 2018–2021 sem camada de texto precisam de Tesseract. Esse período cobre os anos anteriores às eleições do conselho e pode ser o mais relevante para padrões de longo prazo.</li>
          <li><strong>Deliberações HTML-only</strong> — algumas deliberações mais antigas existem apenas como HTML na página do CAU/PR, sem PDF. A Fase 3 do scraper lida com isso via extração direta da página de destino.</li>
          <li><strong>Dashboard conectado</strong> — o frontend em React já existe no ar. Falta ligar os endpoints da API para mostrar os resultados reais aos usuários.</li>
          <li><strong>Chat conversacional</strong> — RAG sobre os atos analisados, permitindo perguntas como "quais deliberações mencionam esse nome?" ou "mostre os casos de ad referendum entre 2020 e 2022".</li>
        </ul>
        <p>A diferença mais importante entre portarias e deliberações não está nos números de sinalização. Está no que os números representam: portarias registram quem foi nomeado, deliberações registram por que. E o porquê — quando analisado em volume suficiente, com contexto suficiente — é onde as instituições se revelam.</p>

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
