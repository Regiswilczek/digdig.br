import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-02-custo-e-controle")({
  head: () => ({
    meta: [
      { title: "Quando a IA Custa Mais do Que Deveria — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 02: como dez rodadas paralelas consumiram $23 sem resultado, o diagnóstico pelo banco e as quatro camadas de proteção implementadas.",
      },
      { property: "og:title", content: "Quando a IA Custa Mais do Que Deveria" },
      {
        property: "og:description",
        content:
          "White Paper Nº 02 do Dig Dig: controle de custos em pipelines de LLM — o problema, o diagnóstico e a solução.",
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
  component: Whitepaper02Page,
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
  .wp-root .erro { color:#c0392b; font-weight:600; }
  .wp-root .stat-row { display:flex; gap:32px; margin:28px 0; flex-wrap:wrap; }
  .wp-root .stat { display:flex; flex-direction:column; gap:4px; }
  .wp-root .stat .num { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.6rem; letter-spacing:-0.03em; }
  .wp-root .stat .desc { font-size:0.8rem; color:var(--muted); }
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

function Whitepaper02Page() {
  return (
    <div className="wp-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 02</span>
      </header>

      <article>
        <Link to="/whitepaper-01-extracao-caupr" className="prev-paper">
          ← White Paper Nº 01: Como Automatizamos a Auditoria do CAU/PR
        </Link>

        <div className="post-header">
          <span className="post-label">Infraestrutura · Custos · Controle de Pipeline</span>
          <h1>Quando a IA Custa Mais do Que Deveria</h1>
          <p className="byline"><strong>Regis Wilczek</strong> &nbsp;—&nbsp; Abril de 2026</p>
        </div>

        <h2>Onde Paramos</h2>
        <p>No White Paper anterior documentei o processo de construção da pipeline de auditoria: o scraper local para contornar o bloqueio de IP do servidor do CAU/PR, os 151 PDFs escaneados sem camada de texto, os sete problemas técnicos que precisaram ser resolvidos antes de uma rodada completa funcionar.</p>
        <p>Quando terminei de escrever aquele texto, o pipeline estava rodando. O worker Celery no Railway analisava portaria por portaria, enviando cada texto ao Claude Haiku com o regimento interno de 68 mil tokens cacheado como contexto. O banco mostrava progresso constante.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">262</span><span className="desc">portarias analisadas</span></div>
          <div className="stat"><span className="num">66%</span><span className="desc">do total disponível</span></div>
          <div className="stat"><span className="num">$3,09</span><span className="desc">custo registrado no banco</span></div>
        </div>

        <p>Aí abri o Claude Console.</p>
        <p><strong>$23,72.</strong></p>
        <p>A diferença de $20 não era ruído. Era um problema real — e precisava de diagnóstico antes de qualquer outra coisa.</p>

        <hr />

        <h2>A Conta Que Não Fechava</h2>
        <p>Minha primeira hipótese foi custo de desenvolvimento. Durante a sessão anterior corrigimos sete bugs diferentes: flush prematuro no SQLAlchemy, rodada_id nulo passado como UUID, constraint NOT NULL violada no banco, JSON malformado do Haiku, event loop do asyncio conflitando com o Celery fork. Cada ciclo de debug executava o script de teste — e cada execução carregava os 68 mil tokens do regimento como escrita de cache a $0,068 por janela de 5 minutos.</p>
        <p>Mas mesmo somando todas as execuções de teste, a conta não chegava a $20 de diferença. O banco registrava 262 análises com custo médio de $0,0118 cada. Para chegar em $23,72 ao custo médio registrado, seriam necessárias 2.009 chamadas à API. Tínhamos 400 atos para analisar. Algo estava chamando a API muito mais do que deveria.</p>

        <hr />

        <h2>O Diagnóstico</h2>
        <p>Rodei uma query diretamente no banco:</p>
        <pre><code>{`SELECT id, status, atos_analisados_haiku, criado_em
FROM rodadas_analise
ORDER BY criado_em;`}</code></pre>

        <p>O resultado mostrou algo que não estava no plano: <strong>dez rodadas criadas em menos de duas horas</strong>.</p>

        <table>
          <thead>
            <tr><th>Rodada</th><th>Status</th><th>Haiku</th><th>Criado em</th></tr>
          </thead>
          <tbody>
            <tr><td><code>a8480297</code></td><td className="erro">concluida</td><td>0</td><td>20:06</td></tr>
            <tr><td><code>3e4a63aa</code></td><td className="erro">concluida</td><td>0</td><td>20:12</td></tr>
            <tr><td><code>20e298bc</code></td><td className="erro">concluida</td><td>0</td><td>20:21</td></tr>
            <tr><td><code>5609a0fd</code></td><td className="amarelo">pendente</td><td>0</td><td>20:39</td></tr>
            <tr><td><code>8a5caf61</code></td><td className="amarelo">em_progresso</td><td>142</td><td>20:42</td></tr>
            <tr><td><code>beda0942</code></td><td className="amarelo">em_progresso</td><td>169</td><td>20:46</td></tr>
            <tr><td><code>7b615f4a</code></td><td className="erro">concluida</td><td>0</td><td>20:47</td></tr>
            <tr><td><code>bc409003</code></td><td className="verde">teste</td><td>0</td><td>21:05</td></tr>
            <tr><td><code>d7a0467c</code></td><td className="verde">teste</td><td>0</td><td>21:12</td></tr>
            <tr><td><code>9063d83c</code></td><td className="amarelo">em_progresso</td><td>168</td><td>21:44</td></tr>
          </tbody>
        </table>

        <p>Três workers no Railway processando os mesmos 400 atos ao mesmo tempo. O upsert na tabela de análises garante que cada ato tenha apenas um resultado salvo — o último a escrever vence. Mas a API da Anthropic foi chamada três vezes para cada ato. Só uma chamada gerou um registro. As outras duas foram cobradas sem deixar rastro no banco.</p>
        <p>Além disso, as três rodadas com status <code>concluida</code> e contador zerado: criadas durante a fase de debug, chamaram a API, encontraram os bugs que estávamos corrigindo, falharam antes de salvar — mas já tinham consumido crédito.</p>

        <table>
          <thead><tr><th>Origem</th><th>Estimativa</th></tr></thead>
          <tbody>
            <tr><td>3 rodadas de debug (concluida, haiku=0)</td><td>~$14</td></tr>
            <tr><td>2 rodadas paralelas duplicando trabalho</td><td>~$4</td></tr>
            <tr><td>Rodada atual (rastreada no banco)</td><td>$3,09</td></tr>
            <tr><td>Scripts de teste e desenvolvimento</td><td>~$2</td></tr>
            <tr><td><strong>Total</strong></td><td><strong>~$23</strong></td></tr>
          </tbody>
        </table>

        <hr />

        <h2>A Causa Raiz</h2>
        <p>O endpoint <code>POST /pnl/orgaos/{"{slug}"}/rodadas</code> não verificava se já existia uma rodada ativa antes de criar uma nova. Cada chamada criava uma rodada, despachava um task no Celery, e o worker começava a trabalhar — independente do que já estivesse rodando.</p>
        <p>Durante o desenvolvimento, esse endpoint foi chamado repetidamente enquanto depurávamos outros bugs. Cada chamada virou uma rodada zumbi: workers no Railway consumindo crédito de API sem produzir resultado utilizável.</p>
        <p>O segundo problema: sem idempotência no nível do ato. Quando um worker Celery retentava uma tarefa após um erro, re-analisava todos os atos do lote — incluindo os que já tinham sido salvos com sucesso na tentativa anterior. O upsert sobrescrevia o resultado no banco, mas a API foi chamada de novo.</p>
        <p>Sistemas de CRUD toleraram ausência de idempotência há décadas porque chamadas duplicadas custam milissegundos. Com LLMs, cada chamada duplicada tem custo financeiro direto. O problema não é novo — a escala da consequência é.</p>

        <hr />

        <h2>A Solução: Quatro Camadas</h2>
        <p>Corrigir um ponto não seria suficiente. O problema se manifestou em três lugares diferentes: no endpoint, no serviço, e nos workers. A proteção precisava existir em todas as camadas — e ter um backup no banco para o caso de qualquer delas falhar.</p>

        <h3>Camada 1 — Guard no endpoint</h3>
        <p>Antes de criar qualquer rodada, o endpoint agora consulta se existe uma <code>em_progresso</code> ou <code>pendente</code> para aquele órgão. Se existir, retorna 409 com o ID da rodada conflitante no corpo da resposta. Para criar uma nova rodada é preciso cancelar a anterior explicitamente — via o novo endpoint <code>POST /pnl/rodadas/{"{id}"}/cancelar</code>. A intenção precisa ser deliberada.</p>
        <pre><code>{`ativa_result = await db.execute(
    select(RodadaAnalise).where(
        RodadaAnalise.tenant_id == tenant.id,
        RodadaAnalise.status.in_(["em_progresso", "pendente"]),
    )
)
if ativa_result.scalar_one_or_none():
    raise HTTPException(status_code=409, detail={
        "erro": "rodada_ja_ativa",
        "rodada_id": str(rodada_ativa.id),
    })`}</code></pre>

        <h3>Camada 2 — Idempotência no serviço</h3>
        <p>Antes de chamar a API do Haiku, o serviço verifica se <code>ato.processado == true</code>. Se o ato já foi analisado, retorna o resultado existente sem fazer nenhuma chamada de API. Retries de Celery, reinicializações de worker, rodadas paralelas que escapem do guard — nada disso gera chamada extra para atos já processados.</p>
        <pre><code>{`if ato.processado:
    existing = await db.execute(
        select(Analise).where(Analise.ato_id == ato_id)
    )
    analise = existing.scalar_one_or_none()
    if analise:
        return analise  # gratuito — nenhuma chamada de API`}</code></pre>

        <h3>Camada 3 — Verificação de cancelamento no worker</h3>
        <p>Antes de processar cada ato, o worker relê o status da rodada no banco. Se a rodada foi cancelada externamente, o worker para na fronteira entre atos — não no meio de uma operação. Isso permite intervenção de emergência sem precisar matar o processo no Railway.</p>
        <pre><code>{`async def _rodada_esta_ativa(db, rodada_id) -> bool:
    result = await db.execute(
        select(RodadaAnalise.status).where(RodadaAnalise.id == rodada_id)
    )
    return result.scalar_one_or_none() in ("em_progresso", "pendente")

# dentro do loop por ato:
if not await _rodada_esta_ativa(db, rodada_id):
    results["cancelado"] = True
    break`}</code></pre>

        <h3>Camada 4 — Teto de custo por rodada</h3>
        <p>Cada rodada tem um limite de $15. Se o custo acumulado ultrapassar esse valor, o worker aborta e registra o motivo. Uma rodada completa das 400 portarias custa ~$5. O teto de $15 dá margem tripla antes de parar — suficiente para absorver retentativas legítimas, insuficiente para deixar uma rodada duplicada rodar até o fim.</p>
        <pre><code>{`CUSTO_LIMITE_USD = Decimal("15.00")

if custo_acumulado > CUSTO_LIMITE_USD:
    await db.execute(
        update(RodadaAnalise).where(...).values(
            status="cancelada",
            erro_mensagem=f"Limite de custo atingido: USD {custo_acumulado}",
        )
    )
    break`}</code></pre>

        <h3>Backup no banco</h3>
        <p>Como última linha de defesa, uma migration criou um índice único parcial no PostgreSQL. Um índice parcial indexa apenas as linhas que satisfazem a condição — aqui, apenas as rodadas ativas. O custo de manutenção é mínimo: a maioria das rodadas está <code>concluida</code> ou <code>cancelada</code> e fica fora do índice.</p>
        <pre><code>{`-- migration b2c41fae9012
CREATE UNIQUE INDEX idx_rodada_uma_ativa_por_tenant
ON rodadas_analise (tenant_id)
WHERE status IN ('em_progresso', 'pendente');`}</code></pre>
        <p>Mesmo que o código seja contornado — uma chamada direta ao banco, um bug futuro, dois deploys simultâneos — o PostgreSQL rejeita a segunda inserção com violação de constraint. A proteção existe independente da aplicação.</p>

        <hr />

        <h2>O Que Aprendemos</h2>
        <p>Sistemas convencionais toleraram ausência de idempotência por décadas porque chamadas duplicadas custam milissegundos e são invisíveis. Com LLMs, cada chamada de API tem custo real e imediato — e o custo escala com o tamanho do contexto. Um sistema com 68 mil tokens de contexto cacheado não é só mais poderoso que um sem cache: ele também é mais caro quando algo sai errado.</p>
        <p>A proteção precisa existir em três lugares ao mesmo tempo. O endpoint evita a criação do problema. O serviço garante que retries sejam gratuitos. O banco garante que o serviço não seja o único guardião.</p>
        <p>Há uma lição mais ampla sobre desenvolvimento com APIs de IA: o ambiente de produção e o ambiente de debug compartilham as mesmas chaves de API e os mesmos créditos. Durante o desenvolvimento normal de software, chamar a mesma função dez vezes enquanto você resolve um bug custa basicamente zero. Com LLMs, cada chamada tem preço. O reflexo de "executa de novo para ver o que acontece" precisa ser substituído por "verifica o estado antes de executar".</p>
        <p>As quatro camadas implementadas codificam exatamente esse princípio: verificar antes de agir, tornar cada ação idempotente, e ter um limite automático que para o sistema quando algo sai do esperado.</p>
        <p>A rodada atual ainda está em progresso. Os próximos papers vão documentar o que o Haiku encontrou.</p>

        <div className="signature">
          <div className="name">Regis Wilczek</div>
          <div className="role">Fundador, Dig Dig &nbsp;·&nbsp; Curitiba, Abril de 2026</div>
        </div>

        <p className="post-footer">
          White Paper Nº 02 do projeto Dig Dig. Série de registro técnico sobre auditoria pública automatizada com IA.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <span>White Paper · Nº 02 · Controle de Custos em Pipelines de LLM</span>
      </footer>
    </div>
  );
}
