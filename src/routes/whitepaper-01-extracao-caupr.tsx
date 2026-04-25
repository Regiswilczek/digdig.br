import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-01-extracao-caupr")({
  head: () => ({
    meta: [
      { title: "Como Automatizamos a Auditoria do CAU/PR com IA — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 01: o processo, a arquitetura e os obstáculos reais ao auditar 1.789 atos administrativos do CAU/PR com Dig Dig Piper e Dig Dig Bug.",
      },
      { property: "og:title", content: "Como Automatizamos a Auditoria do CAU/PR com IA" },
      {
        property: "og:description",
        content:
          "White Paper Nº 01 do Dig Dig: arquitetura, problemas do mundo real e custos de uma auditoria pública automatizada.",
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
  component: WhitepaperPage,
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
  .wp-root table { width:100%; border-collapse:collapse; margin:24px 0; font-size:0.9rem; }
  .wp-root th { text-align:left; font-weight:600; font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); padding:10px 16px; border-bottom:2px solid var(--border); }
  .wp-root td { padding:11px 16px; border-bottom:1px solid var(--border); vertical-align:top; }
  .wp-root tr:last-child td { border-bottom:none; }
  .wp-root strong { font-weight:600; }
  .wp-root .signature { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
  .wp-root .signature .name { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1rem; letter-spacing:-0.01em; }
  .wp-root .signature .role { font-size:0.83rem; color:var(--muted); margin-top:4px; }
  .wp-root .post-footer { margin-top:56px; padding-top:28px; border-top:1px solid var(--border); font-size:0.83rem; color:var(--subtle); font-style:italic; }
  .wp-root .site-footer { max-width:var(--max-w); margin:0 auto; padding:32px 0 56px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--subtle); }
  @media (max-width: 600px) { .wp-root { font-size:16px; } .wp-root h1 { font-size:1.75rem; } .wp-root .site-footer { flex-direction:column; gap:8px; } }
`;

function WhitepaperPage() {
  return (
    <div className="wp-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 01</span>
      </header>

      <article>
        <div className="post-header">
          <span className="post-label">Transparência Pública · IA · Direito Administrativo</span>
          <h1>Como Automatizamos a Auditoria do CAU/PR com Inteligência Artificial</h1>
          <p className="byline"><strong>Regis Wilczek</strong> &nbsp;—&nbsp; Abril de 2026</p>
        </div>

        <h2>A Ferramenta Que Eu Não Tinha</h2>
        <p>Antes de falar de código, preciso falar do trabalho manual que me ensinou por que essa ferramenta precisava existir.</p>
        <p>Passei um período da minha carreira como Assessor Parlamentar no gabinete de um vereador de Curitiba. Parte do trabalho era fiscalizar a prefeitura — não de forma genérica, mas ir fundo nos portais de transparência, cruzar dados, entender quem estava comprando o quê, de quem, por quanto.</p>
        <p>Foi nesse trabalho que encontrei o que ficou conhecido como o escândalo da água San Pelegrino: dinheiro público sendo gasto em água mineral de alto padrão para uso interno da administração municipal, de forma sistemática e sem justificativa. Não foi uma denúncia que caiu no meu colo — foi o resultado de dias vasculhando planilhas de licitação, notas de empenho, contratos, cruzando dados de fornecedores com CNPJs. Fiz isso manualmente, com o Portal da Transparência aberto em abas, uma planilha do lado e muita paciência.</p>
        <p>Denunciei. Funcionou. O escândalo repercutiu.</p>
        <p>Mas o processo me deixou com uma sensação permanente de ineficiência. Havia mais irregularidades ali — eu sabia disso — e a limitação não era a minha vontade de encontrá-las. Era a capacidade humana de processar volume de informação. Um analista humano consegue revisar dezenas de documentos por dia. Os órgãos públicos publicam centenas ou milhares por ano.</p>
        <p>Depois desse período, fui trabalhar no próprio CAU/PR — primeiro como Chefe de Gabinete, depois como Assessor Especial. Vi a instituição por dentro. Entendi como as decisões são tomadas, onde as atas são publicadas, quais atos têm ementa vaga, quais nomeações chegam por Ad Referendum sem deliberação do plenário. Aprendi a linguagem administrativa que disfarça escolhas políticas em atos burocráticos.</p>
        <p>Quando decidi construir o Dig Dig, sabia exatamente o que queria: uma ferramenta que fizesse automaticamente o que eu fiz manualmente na prefeitura de Curitiba. Que baixasse cada ato, lesse o texto, entendesse o contexto e me dissesse onde olhar com atenção.</p>
        <p>Foi assim que nasceu o <strong>Dig Dig</strong>.</p>

        <hr />

        <h2>O Que Existe para Analisar</h2>
        <p>O CAU/PR publica dois tipos principais de atos administrativos:</p>
        <ul>
          <li><strong>551 portarias</strong> — nomeações, exonerações, instauração de comissões processantes, delegações de função</li>
          <li><strong>1.238 deliberações</strong> — decisões do plenário sobre questões institucionais, financeiras e disciplinares</li>
        </ul>
        <p><strong>Total: 1.789 atos documentados</strong>, cobrindo anos de gestão.</p>
        <p>O primeiro passo foi coletar os metadados de todos esses atos — número, data, ementa, link para o PDF — e salvar em arquivos JSON locais. Isso foi feito com scrapers Python antes mesmo de construir o sistema principal.</p>

        <hr />

        <h2>A Arquitetura Que Escolhemos</h2>
        <p>Antes de escrever uma linha de código de produção, documentamos tudo: 15 documentos cobrindo banco de dados, API, frontend, segurança, testes, infraestrutura, prompts de IA, modelo de negócio.</p>
        <p>O stack escolhido:</p>
        <ul>
          <li><strong>Backend:</strong> FastAPI + Celery + Redis no Railway</li>
          <li><strong>Banco:</strong> PostgreSQL via Supabase (29 tabelas, Row Level Security para multi-tenancy)</li>
          <li><strong>IA:</strong> Dig Dig Piper para triagem em lote + Dig Dig Bug para análise profunda dos casos críticos</li>
          <li><strong>Frontend:</strong> React + Vite + shadcn/ui via Lovable</li>
          <li><strong>PDFs:</strong> pdfplumber para extração de texto</li>
        </ul>
        <p>A lógica do pipeline é em duas fases. O <strong>Dig Dig Piper</strong> — triagem rápida em lote — analisa todos os atos e classifica em quatro níveis: verde (conforme), amarelo (suspeito), laranja (indício moderado-grave) e vermelho (indício crítico). O <strong>Dig Dig Bug</strong> entra só nos casos vermelho, gerando análise aprofundada, ficha de denúncia e mapeamento de pessoas.</p>
        <p>O custo estimado por rodada completa: algo em torno de R$25–30.</p>

        <hr />

        <h2>Quando o Mundo Real Bate na Porta</h2>
        <p>Teoria é teoria. Na prática, cada etapa trouxe um problema que não estava no planejamento.</p>

        <h3>Problema 1: O servidor do CAU/PR bloqueia o Railway</h3>
        <p>Quando o worker Celery no Railway tentou baixar os PDFs, recebeu <strong>403 Forbidden</strong> em 100% das tentativas. O servidor do CAU/PR estava bloqueando requisições vindas de data centers americanos — e o Railway usa infraestrutura nos EUA.</p>
        <p>Tentamos adicionar headers de navegador (<code>User-Agent</code>, <code>Referer</code>, <code>Accept</code>) imitando o Chrome. Não adiantou. O bloqueio era por IP, não por fingerprint.</p>
        <p>A solução foi pragmática: <strong>criar um script local</strong> que roda na minha máquina, com IP brasileiro, e baixa os PDFs diretamente. O <code>scrape_local.py</code> faz exatamente isso — conecta direto no banco Supabase, pega a fila de atos pendentes, baixa com rate limit de 1,5 segundos entre requests, extrai o texto e salva. 400 portarias processadas em aproximadamente 45 minutos.</p>

        <h3>Problema 2: Quase 30% das portarias são PDFs escaneados</h3>
        <p>Ao rodar o scraper, 151 portarias voltaram com "texto vazio". Minha primeira hipótese foi problema de encoding ou de extração. Testei com pymupdf, com extração raw, com diferentes modos. Tudo zero caracteres.</p>
        <p>Aí veio o momento de entender o que estava acontecendo: abri um desses PDFs no navegador e vi o texto perfeitamente. Mas ao inspecionar a estrutura do arquivo, a resposta foi clara: 1 bloco de imagem, 0 blocos de texto. <strong>O PDF é uma imagem.</strong> Não tem camada de texto. O navegador renderiza a imagem e parece texto, mas não dá para selecionar, copiar ou extrair nada.</p>
        <p>Isso é característico de documentos mais antigos — portarias de 2018, 2019, 2020 eram digitalizadas em scanner. As portarias a partir de 2022 foram geradas digitalmente e têm texto nativo.</p>
        <table>
          <thead>
            <tr><th>Período</th><th>Cobertura</th></tr>
          </thead>
          <tbody>
            <tr><td>2022–2026</td><td>95–100%</td></tr>
            <tr><td>2021</td><td>62%</td></tr>
            <tr><td>2019–2020</td><td>0–12%</td></tr>
            <tr><td>2018</td><td>2%</td></tr>
          </tbody>
        </table>
        <p>Isso é importante para o relatório: <strong>a auditoria cobre 400 portarias</strong> — principalmente o período mais recente — e documenta explicitamente quais 151 não puderam ser analisadas e por quê. Transparência sobre o escopo faz parte da credibilidade da auditoria.</p>

        <h3>Problema 3: As deliberações não têm PDF</h3>
        <p>Das 1.238 deliberações, 595 não têm link para PDF no site. Elas existem como páginas HTML — texto direto no site, sem documento anexado. O scraper de PDF simplesmente não consegue processar isso.</p>
        <p>Analisar as deliberações vai exigir um scraper diferente: um que leia o HTML da página em vez de baixar um arquivo. Isso entra na próxima sprint.</p>

        <h3>Problema 4: asyncio, Celery e o inferno dos event loops</h3>
        <p>Esse foi o mais técnico. O Celery usa um modelo de processos fork: cria um processo mestre e depois bifurca em workers. O SQLAlchemy async cria conexões com o banco ligadas ao event loop do processo mestre. Quando o worker é bifurcado, ele herda as conexões — mas não o event loop, que é diferente em cada processo. Resultado: <code>Future attached to a different loop</code>, e o worker trava.</p>
        <p>A solução foi usar o signal <code>worker_process_init</code> do Celery para recriar o engine do banco com <code>NullPool</code> em cada worker bifurcado, garantindo que cada processo tenha suas próprias conexões limpas.</p>
        <p>Outro problema relacionado: o orquestrador tentava chamar <code>.apply()</code> em subtarefas Celery dentro de um <code>asyncio.run()</code> que já estava rodando. Chamadas síncronas dentro de contextos assíncronos explodem. Resolvemos refatorando as subtarefas para funções async puras e chamando-as diretamente com <code>await</code>.</p>

        <h3>Problema 5: O banco não combinava com o modelo</h3>
        <p>Várias colunas tinham <code>NOT NULL</code> no banco mas <code>nullable=True</code> no modelo SQLAlchemy — e <code>server_default=func.now()</code> definido no modelo mas sem <code>DEFAULT NOW()</code> na tabela real. Isso foi herdado de uma migration inicial incompleta.</p>
        <p>O resultado eram erros de integridade na hora de salvar: <code>null value in column "nivel_alerta" violates not-null constraint</code>. A coluna tinha texto no modelo dizendo que aceitava nulo, mas o banco discordava.</p>
        <p>Resolvemos com uma migration explícita adicionando os defaults de timestamp em todas as 29 tabelas, e ajustando o código para não fazer <code>flush()</code> antes de preencher todos os campos obrigatórios.</p>

        <h3>Problema 6: O Dig Dig Piper não retornava JSON limpo</h3>
        <p>Configuramos o Dig Dig Piper para sempre responder em JSON com uma estrutura específica. Na prática, às vezes ele envolvia a resposta em blocos de código markdown — <code>```json ... ```</code> — ou adicionava uma frase introdutória antes do JSON.</p>
        <p>A função de parse inicial só tentava <code>json.loads()</code> direto. Falha, cai no fallback, salva "análise incompleta" no banco.</p>
        <p>Refizemos com 4 níveis de fallback:</p>
        <ol>
          <li>Tenta parsear o texto bruto</li>
          <li>Remove as marcações markdown e tenta de novo</li>
          <li>Extrai o primeiro bloco <code>{"{...}"}</code> do texto usando regex, mesmo que tenha prosa ao redor</li>
          <li>Só aí vai para o fallback de emergência com regex simples</li>
        </ol>

        <h3>Problema 7: Custo do regimento no prompt</h3>
        <p>O regimento interno do CAU/PR tem 201.814 caracteres — aproximadamente 68.000 tokens. Isso é muito mais do que os ~8.000 tokens que estimamos na documentação inicial.</p>
        <p>O impacto: a primeira chamada de cada janela de 5 minutos precisa escrever o regimento inteiro no cache da Anthropic (custo de escrita: $1,00/1M tokens ≈ $0,068 por janela). As chamadas seguintes leem do cache a $0,08/1M tokens — dez vezes mais barato.</p>
        <p>Na prática, cada ato custa entre $0,008 (cache quente) e $0,071 (cache frio). A média real na rodada está em $0,013 por ato, confirmando que o cache está funcionando. Para 398 portarias, a projeção é <strong>~$4,80 total para a fase Dig Dig Piper</strong>.</p>

        <hr />

        <h2>Onde Estamos Agora</h2>
        <p>O pipeline está rodando.</p>
        <p>O worker Celery no Railway está analisando portaria por portaria: lê o texto, envia para o Dig Dig Piper com o regimento interno cacheado como contexto, recebe o JSON com classificação, indícios e pessoas extraídas, salva tudo no banco.</p>
        <p>Dos primeiros atos processados:</p>
        <ul>
          <li><strong>~40% verde</strong> — atos conformes, sem irregularidades detectadas</li>
          <li><strong>~60% amarelo</strong> — suspeitos, requerem atenção</li>
          <li><strong>0% laranja/vermelho</strong> até agora</li>
        </ul>
        <p>O Dig Dig Piper está processando do mais recente para o mais antigo, então os atos de 2026 e 2025 vêm primeiro. Os casos mais graves tendem a aparecer quando chegar nos anos anteriores, onde comissões processantes, exonerações em massa e nomeações questionáveis foram mais frequentes.</p>

        <hr />

        <h2>O Que Ainda Falta</h2>
        <ol>
          <li><strong>Deliberações via scraper HTML</strong> — as 595 deliberações que existem só como HTML precisam de um scraper diferente</li>
          <li><strong>OCR nas portarias escaneadas</strong> — as 151 portarias de 2018–2021 precisam de Tesseract para ter o texto extraído</li>
          <li><strong>Fase Dig Dig Bug</strong> — quando o Dig Dig Piper terminar, o Dig Dig Bug vai aprofundar os casos vermelho: análise detalhada, ficha de denúncia pronta para uso, mapeamento completo de pessoas</li>
          <li><strong>Dashboard web</strong> — o frontend já existe, falta conectar na API com os resultados reais</li>
          <li><strong>Chat conversacional</strong> — o usuário poderá perguntar "mostre todas as portarias envolvendo comissões processantes em 2023" e receber uma resposta com contexto</li>
        </ol>

        <hr />

        <h2>O Que Aprendemos</h2>
        <p>Construir uma ferramenta de auditoria pública com IA é tecnicamente possível e financeiramente viável. O custo de processar quase 400 documentos com leitura completa do regimento interno como contexto fica em torno de R$27.</p>
        <p>O maior obstáculo não foi a tecnologia — foi a qualidade dos dados públicos. PDFs escaneados sem OCR, documentos sem texto, ausência de versões digitais de documentos mais antigos: tudo isso é um problema de acesso à informação pública que vai muito além de qualquer sistema de IA.</p>
        <p>A auditoria vai ter limitações de cobertura. Documentamos isso. Um relatório honesto sobre o que foi possível analisar e o que não foi é mais útil do que um relatório que finge ter analisado tudo.</p>
        <p>E sobre o futuro: portarias e deliberações são só o começo. A mesma lógica se aplica a notas de diárias, aumentos de patrimônio de gestores, gastos públicos em compras diretas, aditivos contratuais. Tudo isso é público. Tudo isso é passível de análise automatizada. O que fazia falta era a ferramenta.</p>
        <p>Agora ela existe.</p>

        <div className="signature">
          <div className="name">Regis Wilczek</div>
          <div className="role">Fundador, Dig Dig &nbsp;·&nbsp; Curitiba, Abril de 2026</div>
        </div>

        <p className="post-footer">
          Este documento é parte do registro técnico do projeto Dig Dig. O código é aberto e o método é replicável para qualquer órgão público brasileiro com atos administrativos publicados em PDF.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <span>White Paper · Nº 01 · Transparência Pública com IA</span>
      </footer>
    </div>
  );
}
