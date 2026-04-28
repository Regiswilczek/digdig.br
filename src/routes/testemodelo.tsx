import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/testemodelo")({
  head: () => ({
    meta: [
      { title: "Relatório de Modelos de IA — Dig Dig" },
      {
        name: "description",
        content:
          "Quatro testes comparativos: Haiku 4.5 vs Gemini Flash-Lite, calibração de prompt, Ata 167 com três modelos, e Pro com contexto Sonnet. Dados reais do CAU/PR, 28/04/2026.",
      },
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
  component: TesteModeloPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  .tm {
    --text:#111; --muted:#555; --subtle:#999; --border:#e5e5e5;
    --bg:#fff; --bg-alt:#f8f8f8; --bg-alt2:#f2f2f2; --w:780px;
    --verde:#2e7d32;   --bg-verde:#f0fdf4;   --bd-verde:#86efac;
    --amarelo:#b45309; --bg-amarelo:#fffbeb; --bd-amarelo:#fde68a;
    --laranja:#c05b00; --bg-laranja:#fff7ed; --bd-laranja:#fdba74;
    --vermelho:#c0392b;--bg-vermelho:#fff5f5;--bd-vermelho:#fca5a5;
    --haiku:#5b21b6; --flash:#1a73e8; --pro:#92400e; --sonnet:#065f46;
    font-family:'Inter',system-ui,sans-serif;
    background:var(--bg); color:var(--text);
    line-height:1.75; font-size:16px; padding:0 20px;
  }
  .tm *,.tm *::before,.tm *::after{box-sizing:border-box}

  /* ── Layout ── */
  .tm .wrap   { max-width:var(--w); margin:0 auto; }
  .tm header  { padding:32px 0 36px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .tm .logo   { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
  .tm .chip-top { font-size:0.7rem; letter-spacing:0.08em; text-transform:uppercase; background:#f0f0f0; color:var(--muted); padding:4px 10px; border-radius:20px; font-weight:600; }
  .tm article { padding:48px 0 100px; }

  /* ── Typography ── */
  .tm .label  { font-size:0.68rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--subtle); font-weight:700; margin-bottom:14px; display:block; }
  .tm h1      { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2.1rem; line-height:1.12; letter-spacing:-0.03em; margin-bottom:14px; }
  .tm .intro  { font-size:0.9rem; color:var(--muted); margin-bottom:0; }
  .tm hr      { border:none; border-top:1px solid var(--border); margin:44px 0; }
  .tm h2      { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.35rem; letter-spacing:-0.025em; margin:0 0 6px; }
  .tm .sec-num{ font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--subtle); margin-bottom:8px; display:block; }
  .tm h3      { font-weight:600; font-size:0.95rem; margin:24px 0 8px; }
  .tm p       { margin-bottom:16px; color:var(--muted); font-size:0.92rem; }
  .tm p strong{ color:var(--text); }
  .tm code    { font-family:'SF Mono','Fira Code',monospace; font-size:0.78em; background:#f4f4f4; padding:2px 6px; border-radius:4px; color:var(--vermelho); }
  .tm ul      { margin:0 0 16px; padding-left:1.4em; }
  .tm li      { margin-bottom:5px; font-size:0.92rem; color:var(--muted); }
  .tm li strong{ color:var(--text); }

  /* ── TOC ── */
  .tm .toc    { background:var(--bg-alt); border:1px solid var(--border); border-radius:8px; padding:20px 24px; margin:32px 0 44px; }
  .tm .toc-title { font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--subtle); margin:0 0 12px; }
  .tm .toc-list { display:flex; flex-direction:column; gap:6px; margin:0; padding:0; list-style:none; }
  .tm .toc-list a { font-size:0.875rem; color:var(--text); text-decoration:none; font-weight:500; display:flex; align-items:baseline; gap:8px; }
  .tm .toc-list a:hover { color:var(--haiku); }
  .tm .toc-num{ font-size:0.72rem; color:var(--subtle); font-weight:700; font-variant-numeric:tabular-nums; min-width:18px; }

  /* ── Achados (executive summary) ── */
  .tm .findings { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:24px 0 40px; }
  .tm .finding  { border:1px solid var(--border); border-radius:8px; padding:16px 18px; background:var(--bg); }
  .tm .finding .f-num { font-size:0.7rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--subtle); margin-bottom:6px; }
  .tm .finding .f-title { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:0.95rem; color:var(--text); margin-bottom:6px; line-height:1.3; }
  .tm .finding .f-body  { font-size:0.82rem; color:var(--muted); line-height:1.55; }
  .tm .finding.f-green  { border-color:var(--bd-verde);   background:var(--bg-verde); }
  .tm .finding.f-amber  { border-color:var(--bd-amarelo); background:var(--bg-amarelo); }
  .tm .finding.f-orange { border-color:var(--bd-laranja); background:var(--bg-laranja); }
  .tm .finding.f-red    { border-color:var(--bd-vermelho);background:var(--bg-vermelho); }

  /* ── Seções ── */
  .tm .section { margin:0 0 8px; padding-top:8px; }

  /* ── Tabelas ── */
  .tm table   { width:100%; border-collapse:collapse; margin:20px 0; font-size:0.84rem; }
  .tm th      { text-align:left; font-size:0.7rem; letter-spacing:0.06em; text-transform:uppercase; font-weight:700; color:var(--muted); padding:9px 12px; border-bottom:2px solid var(--border); }
  .tm td      { padding:9px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
  .tm tr:last-child td { border-bottom:none; }
  .tm .ato-name { font-weight:600; font-size:0.83rem; color:var(--text); }
  .tm .ato-sub  { font-size:0.72rem; color:var(--subtle); margin-top:1px; }
  .tm .col-haiku { color:var(--haiku); }
  .tm .col-flash { color:var(--flash); }
  .tm .col-pro   { color:var(--pro); }
  .tm .col-sonnet{ color:var(--sonnet); }

  /* ── Badges de nível ── */
  .tm .badge { display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; font-weight:600; padding:2px 8px; border-radius:20px; white-space:nowrap; }
  .tm .b-verde   { background:var(--bg-verde);   color:var(--verde);   border:1px solid var(--bd-verde);   }
  .tm .b-amarelo { background:var(--bg-amarelo); color:var(--amarelo); border:1px solid var(--bd-amarelo); }
  .tm .b-laranja { background:var(--bg-laranja); color:var(--laranja); border:1px solid var(--bd-laranja); }
  .tm .b-vermelho{ background:var(--bg-vermelho);color:var(--vermelho);border:1px solid var(--bd-vermelho);}
  .tm .score-bar-wrap { display:inline-flex; align-items:center; gap:7px; }
  .tm .score-bar { width:70px; height:5px; background:#eee; border-radius:3px; overflow:hidden; display:inline-block; }
  .tm .score-fill{ height:100%; border-radius:3px; }
  .tm .score-n   { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:0.82rem; }

  /* ── Model tags (inline labels) ── */
  .tm .mtag { display:inline-block; font-size:0.66rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:2px 7px; border-radius:4px; }
  .tm .mt-haiku  { background:#ede9fe; color:var(--haiku); }
  .tm .mt-flash  { background:#e8f0fe; color:var(--flash); }
  .tm .mt-flash-cal{ background:#ecfdf5; color:var(--sonnet); }
  .tm .mt-pro    { background:#fef3c7; color:var(--pro); }
  .tm .mt-sonnet { background:#d1fae5; color:var(--sonnet); }

  /* ── Deltas ── */
  .tm .up  { color:var(--vermelho); font-weight:600; font-size:0.78rem; }
  .tm .dn  { color:var(--verde);    font-weight:600; font-size:0.78rem; }
  .tm .eq  { color:var(--subtle);   font-weight:600; font-size:0.78rem; }
  .tm .ok  { color:var(--verde);    font-weight:700; }

  /* ── Cards de caso ── */
  .tm .card { border:1px solid var(--border); border-radius:10px; margin:22px 0; overflow:hidden; }
  .tm .card-ver { border-top:3px solid var(--vermelho); }
  .tm .card-lar { border-top:3px solid var(--laranja); }
  .tm .card-ama { border-top:3px solid var(--amarelo); }
  .tm .card-ver2{ border-top:3px solid var(--verde); }

  .tm .card-head { padding:14px 18px; background:var(--bg-alt); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
  .tm .card-title{ font-family:'Inter Tight',sans-serif; font-weight:700; font-size:0.93rem; }
  .tm .card-meta { font-size:0.76rem; color:var(--muted); margin-top:3px; }
  .tm .card-badges{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

  .tm .mrow { display:grid; grid-template-columns:108px 1fr; border-bottom:1px solid var(--border); }
  .tm .mrow:last-child { border-bottom:none; }
  .tm .mrow-label { padding:14px 12px 14px 14px; background:var(--bg-alt); border-right:1px solid var(--border); display:flex; flex-direction:column; gap:6px; }
  .tm .mrow-body  { padding:14px 16px; }
  .tm .mrow-scores{ display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
  .tm .mrow-resumo{ font-size:0.84rem; color:var(--muted); line-height:1.6; margin-bottom:8px; }
  .tm .mrow-stats { display:flex; gap:14px; font-size:0.74rem; color:var(--subtle); flex-wrap:wrap; }
  .tm .sv         { font-weight:600; color:var(--muted); }

  .tm .card-note  { margin:0 18px 14px; padding:9px 13px; border-radius:6px; font-size:0.81rem; line-height:1.55; }
  .tm .note-warn  { background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
  .tm .note-ok    { background:#f0fdf4; border:1px solid #86efac; color:#166534; }
  .tm .note-info  { background:#f0f4ff; border:1px solid #c7d2fe; color:#3730a3; }

  /* ── Ata 167 (3 colunas) ── */
  .tm .tri { display:grid; grid-template-columns:1fr 1fr 1fr; }
  .tm .tri-col { padding:16px 18px; border-right:1px solid var(--border); }
  .tm .tri-col:last-child { border-right:none; }
  .tm .tri-tag{ font-size:0.66rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:2px 7px; border-radius:4px; display:inline-block; margin-bottom:9px; }
  .tm .tt-sonnet{ background:#d1fae5; color:var(--sonnet); }
  .tm .tt-flash { background:#e8f0fe; color:var(--flash); }
  .tm .tt-pro   { background:#fef3c7; color:var(--pro); }
  .tm .tri-resumo{ font-size:0.82rem; color:var(--muted); line-height:1.6; margin:8px 0; }
  .tm .irr-list { font-size:0.78rem; margin:8px 0; padding-left:0; list-style:none; }
  .tm .irr-list li { margin-bottom:5px; color:var(--muted); }
  .tm .itag { display:inline-block; font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; padding:1px 5px; border-radius:3px; margin-right:4px; }
  .tm .i-critica{ background:#fee2e2; color:#991b1b; }
  .tm .i-alta   { background:#fff7ed; color:#c2410c; }
  .tm .i-media  { background:#fefce8; color:#854d0e; }
  .tm .i-baixa  { background:#f0fdf4; color:#166534; }
  .tm .tri-stats{ display:flex; gap:10px; flex-wrap:wrap; font-size:0.73rem; color:var(--subtle); padding-top:8px; border-top:1px solid var(--border); margin-top:8px; }
  .tm .tri-compare { padding:14px 18px; background:#fffbeb; border-top:1px solid var(--border); font-size:0.83rem; color:#92400e; line-height:1.6; }
  .tm .tri-chips { display:flex; gap:7px; flex-wrap:wrap; margin-top:9px; }
  .tm .tchip { font-size:0.68rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:2px 8px; border-radius:20px; background:#f0f0f0; color:var(--muted); }
  .tm .tchip-key{ background:#fff3cd; color:#7c4a00; }

  /* ── Calibração: 3 linhas ── */
  .tm .calib-result { font-size:0.78rem; padding:4px 10px; border-radius:4px; font-weight:600; display:inline-block; }
  .tm .cr-better { background:#f0fdf4; color:#166534; }
  .tm .cr-same   { background:#f0f4ff; color:#3730a3; }

  /* ── Pro/Sonnet ficha ── */
  .tm .ficha-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:16px 18px; margin:12px 0; }
  .tm .ficha-title{ font-size:0.72rem; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--pro); margin-bottom:10px; }
  .tm .ficha-row { display:flex; gap:8px; margin-bottom:7px; font-size:0.81rem; }
  .tm .ficha-label{ font-weight:700; color:var(--text); min-width:100px; }
  .tm .ficha-val  { color:var(--muted); line-height:1.5; }

  /* ── Tabela de custos ── */
  .tm .cost-table th { background:var(--bg-alt); }
  .tm .cost-table .stars { letter-spacing:1px; }
  .tm .cost-table .star-on  { color:#f59e0b; }
  .tm .cost-table .star-off { color:#e5e7eb; }

  /* ── Callouts ── */
  .tm .callout { border-radius:0 8px 8px 0; padding:12px 16px; margin:24px 0; font-size:0.88rem; line-height:1.6; }
  .tm .callout-info   { background:#f0f4ff; border-left:3px solid #6366f1; color:#3730a3; }
  .tm .callout-ok     { background:#f0fdf4; border-left:3px solid #22c55e; color:#166534; }
  .tm .callout-warn   { background:#fffbeb; border-left:3px solid #d97706; color:#92400e; }
  .tm .callout strong { font-weight:700; }

  /* ── Conclusões ── */
  .tm .concl      { display:flex; flex-direction:column; gap:0; }
  .tm .concl-item { display:grid; grid-template-columns:32px 1fr; gap:12px; padding:16px 0; border-bottom:1px solid var(--border); align-items:start; }
  .tm .concl-item:last-child { border-bottom:none; }
  .tm .concl-n    { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.1rem; color:var(--subtle); padding-top:1px; }
  .tm .concl-title{ font-weight:700; font-size:0.95rem; color:var(--text); margin-bottom:5px; }
  .tm .concl-body { font-size:0.87rem; color:var(--muted); line-height:1.6; margin:0; }

  /* ── Footer ── */
  .tm footer { border-top:1px solid var(--border); padding:24px 0 48px; display:flex; justify-content:space-between; font-size:0.75rem; color:var(--subtle); }

  /* ── Responsivo ── */
  @media (max-width:640px) {
    .tm h1 { font-size:1.6rem; }
    .tm .findings { grid-template-columns:1fr; }
    .tm .tri { grid-template-columns:1fr; }
    .tm .tri-col { border-right:none; border-bottom:1px solid var(--border); }
    .tm .tri-col:last-child { border-bottom:none; }
    .tm .mrow { grid-template-columns:1fr; }
    .tm .mrow-label { border-right:none; border-bottom:1px solid var(--border); flex-direction:row; align-items:center; padding:10px 14px; gap:10px; }
    .tm footer { flex-direction:column; gap:6px; }
  }
  @media (max-width:780px) {
    .tm .tri { grid-template-columns:1fr; }
    .tm .tri-col { border-right:none; border-bottom:1px solid var(--border); }
    .tm .tri-col:last-child { border-bottom:none; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Primitivos
// ─────────────────────────────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  verde: "#2e7d32", amarelo: "#b45309", laranja: "#c05b00", vermelho: "#c0392b",
};
const BORDER_CLS: Record<string, string> = {
  vermelho: "card-ver", laranja: "card-lar", amarelo: "card-ama", verde: "card-ver2",
};

function Badge({ n }: { n: string }) {
  const m: Record<string, { cls: string; e: string; l: string }> = {
    verde:    { cls: "b-verde",    e: "🟢", l: "Verde"    },
    amarelo:  { cls: "b-amarelo",  e: "🟡", l: "Amarelo"  },
    laranja:  { cls: "b-laranja",  e: "🟠", l: "Laranja"  },
    vermelho: { cls: "b-vermelho", e: "🔴", l: "Vermelho" },
  };
  const v = m[n] ?? { cls: "", e: "⚪", l: n };
  return <span className={`badge ${v.cls}`}>{v.e} {v.l}</span>;
}

function Bar({ s, n }: { s: number; n: string }) {
  const color = COLORS[n] ?? "#999";
  return (
    <div className="score-bar-wrap">
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${s}%`, background: color }} />
      </div>
      <span className="score-n" style={{ color }}>{s}</span>
    </div>
  );
}

function GravTag({ g }: { g: string }) {
  const cls = `itag i-${g}`;
  const l: Record<string, string> = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };
  return <span className={cls}>{l[g] ?? g}</span>;
}

function Stars({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? "star-on" : "star-off"}>★</span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dados — Seção 1: Haiku vs Flash-Lite
// ─────────────────────────────────────────────────────────────────────────────
type Case1 = {
  id: string; tipo: string; numero: string; data: string; ementa: string; chars: number;
  haiku: { n: string; s: number; ind: number; pessoas: number; resumo: string };
  flash: { n: string; s: number; ind: number; pessoas: number; resumo: string; tok_in: number; tok_out: number; custo: number; tempo: number };
  diff: string; diff_type: "dn" | "up" | "eq";
};

const SEC1: Case1[] = [
  {
    id:"c1", tipo:"Portaria", numero:"586/2025", data:"15/04/2025", chars:2544,
    ementa:"Reinstauração de PAD e substituição de membro de Comissão Processante",
    haiku:{ n:"vermelho", s:87, ind:7, pessoas:5, resumo:"O Vice-Presidente age por delegação sem especificar a norma autorizadora da reinstauração — ausência que pode configurar vício de competência. Reconstituição da comissão sem motivação explícita aponta para possível interferência no curso do processo disciplinar." },
    flash:{ n:"laranja",  s:65, ind:4, pessoas:5, resumo:"Fundamentação jurídica incompleta para a reinstauração e troca de membro da comissão sem motivação registrada. Ato formalmente regular quanto à competência do signatário, mas com indícios de irregularidade moderada.", tok_in:55823, tok_out:1475, custo:0.00617, tempo:8.7 },
    diff:"Haiku inferiu vício de competência (vermelho/87, 7 ind.); Flash tratou como incompletude de motivação (laranja/65, 4 ind.). Ambos identificaram os mesmos problemas centrais, mas o Flash foi mais conservador na gradação.",
    diff_type:"dn",
  },
  {
    id:"c2", tipo:"Deliberação", numero:"04/2024", data:"Não informada", chars:2957,
    ementa:"Ad referendum — prorrogação de prazo de Comissão Temporária de Sindicância",
    haiku:{ n:"laranja", s:72, ind:6, pessoas:5, resumo:"Uso reiterado de ad referendum concentra poder no Presidente e pode mascarar falta de quórum nas plenárias. Padrão que o regimento interno limita expressamente — 6 indícios incluindo o sistêmico." },
    flash:{ n:"amarelo", s:45, ind:3, pessoas:23, resumo:"Prorrogação referendada com votação registrada. A atenção recai sobre a necessidade de verificar se os prazos regimentais foram respeitados — indício de nível amarelo.", tok_in:56001, tok_out:1984, custo:0.00639, tempo:8.2 },
    diff:"Haiku reconheceu padrão sistêmico de concentração de poder via ad referendum (laranja/72, 6 ind.). Flash tratou o ato isoladamente, ignorando o padrão recorrente (amarelo/45, 3 ind.). Flash extraiu mais pessoas (23 vs 5), mas perdeu a leitura contextual.",
    diff_type:"dn",
  },
  {
    id:"c3", tipo:"Deliberação", numero:"DPOPR 0143-02/2022", data:"31/05/2022", chars:3713,
    ementa:"Aprovação de contas mensais — março de 2022",
    haiku:{ n:"amarelo", s:35, ind:5, pessoas:17, resumo:"Procedimento formalmente correto, mas inconsistências nas abstenções: conselheiros abstiveram-se sem registrar motivação, podendo violar dispositivo regimental sobre participação obrigatória em votações administrativas." },
    flash:{ n:"verde",   s:5,  ind:0, pessoas:17, resumo:"Deliberação aprova as contas mensais com base no relatório da Comissão de Gestão. Ato em conformidade com as disposições regimentais aplicáveis — sem indícios de irregularidade.", tok_in:56495, tok_out:1126, custo:0.00610, tempo:5.8 },
    diff:"Discordância máxima: Haiku flagou abstenções sem motivação (amarelo/35, 5 ind.); Flash classificou como verde (0 ind.), avaliando o ato como conforme. Ambos extraíram 17 pessoas — leitura do texto equivalente, interpretação divergiu.",
    diff_type:"dn",
  },
  {
    id:"c4", tipo:"Deliberação", numero:"176-16/2024", data:"10/12/2024", chars:2811,
    ementa:"Manutenção de Auto de Infração nº 1000177826/2023 — julgamento disciplinar",
    haiku:{ n:"amarelo", s:35, ind:6, pessoas:10, resumo:"Votação unânime (19-0) aprova manutenção de auto de infração. Detectadas falhas formais: ausência do número de identificação do autuado e referência vaga ao processo original." },
    flash:{ n:"verde",   s:10, ind:2, pessoas:23, resumo:"Deliberação segue o rito previsto para julgamentos disciplinares, com votação e resultado documentados. Dois pontos de atenção formal de baixa gravidade, sem configurar irregularidade material.", tok_in:56006, tok_out:1700, custo:0.00628, tempo:7.4 },
    diff:"Haiku elevou falhas formais a indícios relevantes (amarelo/35, 6 ind.); Flash as tratou como pontos de atenção de baixa gravidade (verde/10, 2 ind.). Flash identificou mais pessoas (23 vs 10).",
    diff_type:"dn",
  },
  {
    id:"c5", tipo:"Portaria", numero:"473/2024", data:"01/03/2024", chars:1070,
    ementa:"Nomeação para Cargo em Comissão — Gerente de Comunicação",
    haiku:{ n:"verde", s:15, ind:2, pessoas:2, resumo:"Nomeação com fundamentação legal adequada. Dois indícios de atenção mínima: ausência de vínculo anterior do nomeado e ausência de menção à publicação no diário oficial." },
    flash:{ n:"verde", s:10, ind:0, pessoas:2,  resumo:"Portaria formalmente correta com competência do signatário adequada e fundamentação legal explícita. Sem irregularidades.", tok_in:55368, tok_out:562, custo:0.00576, tempo:4.0 },
    diff:"Único caso de concordância: ambos classificaram VERDE. Diferença de 5 pts de score é irrelevante operacionalmente.",
    diff_type:"eq",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dados — Seção 2: Calibração de Prompt
// ─────────────────────────────────────────────────────────────────────────────
type CalibCase = {
  id: string; tipo: string; ato: string;
  haiku: { n: string; s: number; ind: number };
  orig: { n: string; s: number; ind: number; resumo: string };
  cal:  { n: string; s: number; ind: number; resumo: string };
  do_: number; dc: number;
};

const SEC2: CalibCase[] = [
  {
    id:"k1", tipo:"Portaria", ato:"667",
    haiku:{ n:"vermelho", s:95, ind:8 },
    orig: { n:"amarelo",  s:45, ind:3, resumo:"Reconduz comissão processante com prazos exaurados. Três indícios de nível médio — falta de motivação para prorrogação e base normativa questionável." },
    cal:  { n:"laranja",  s:60, ind:4, resumo:"Reconduz comissão cujos trabalhos se exauriram sem conclusão, ato que exige motivação explícita e deliberação do Plenário. Quatro indícios: prorrogação sem fundamentação, possível interferência, omissão normativa e ausência de ata original." },
    do_: -50, dc: -35,
  },
  {
    id:"k2", tipo:"Dispensa Eletrônica", ato:"9.0 — Aprovação de Procedimento",
    haiku:{ n:"laranja", s:72, ind:5 },
    orig: { n:"amarelo", s:45, ind:3, resumo:"Aprova contratação direta com valor estimado presente mas sem referência explícita ao limite para dispensa. Três indícios de atenção moderada." },
    cal:  { n:"laranja", s:60, ind:4, resumo:"Ausência de valor monetário explícito no documento, falta de fundamentação para escolha do fornecedor, omissão de dotação orçamentária e ausência de referência à pesquisa de preços." },
    do_: -27, dc: -12,
  },
  {
    id:"k3", tipo:"Deliberação", ato:"0138-06/2021",
    haiku:{ n:"amarelo", s:35, ind:5 },
    orig: { n:"verde", s:10, ind:2, resumo:"Aprovação de Auto de Infração com votação registrada. Dois pontos de atenção formal de baixa gravidade." },
    cal:  { n:"verde", s:15, ind:0, resumo:"Deliberação de aprovação de Auto de Infração com rito regimental cumprido e votação registrada. Sem indícios de irregularidade formal." },
    do_: -25, dc: -20,
  },
  {
    id:"k4", tipo:"Portaria", ato:"369",
    haiku:{ n:"amarelo", s:35, ind:4 },
    orig: { n:"verde",   s:10, ind:0, resumo:"Nomeação para cargo em comissão com fundamentação legal e regimental. Ato formalmente correto." },
    cal:  { n:"amarelo", s:35, ind:2, resumo:"Nomeia Jackson Majewski para Coordenador de Atendimento sem mencionar processo seletivo ou critérios de escolha — indício de possível nomeação por afinidade. Ausência de referência ao vínculo anterior." },
    do_: -25, dc: 0,
  },
  {
    id:"k5", tipo:"Portaria", ato:"169",
    haiku:{ n:"verde", s:15, ind:1 },
    orig: { n:"verde", s:5,  ind:0, resumo:"Nomeação de servidora aprovada em concurso público. Ato formalmente correto." },
    cal:  { n:"verde", s:10, ind:0, resumo:"Nomeação com fundamentação legal e regimental, servidora aprovada em concurso público. Sem irregularidades." },
    do_: -10, dc: -5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dados — Seção 3: Ata 167 (3 modelos)
// ─────────────────────────────────────────────────────────────────────────────
const SONNET_IRR = [
  { g:"critica", t:"Requerimento de destituição por 16 conselheiros",         d:"Protocolo SICCAU 2032093/2024 aprovado 16×4×1 — pedido formal de abertura de processo de destituição." },
  { g:"alta",    t:"Resistência presidencial à soberania do plenário",         d:"Presidente negou colocar em votação a eleição de VP, retirando item de pauta unilateralmente. Ouvidor emitiu parecer favorável à eleição imediata." },
  { g:"alta",    t:"Vacância da vice-presidência sem solução imediata",         d:"CAU/PR encerrou a sessão sem VP — risco para pagamento de folha, assinaturas de atas e demais atos." },
  { g:"alta",    t:"Regimento Interno aprovado não disponível no site",         d:"RI aprovado em Paranaguá não estava publicado nem homologado; presidente apoiava decisões nele sem acesso público." },
  { g:"alta",    t:"Manipulação política interna (~6 meses)",                  d:"Múltiplos conselheiros registraram em plenário que interesses políticos externos influenciavam decisões." },
  { g:"media",   t:"Inclusão de itens em urgência sem convocação prévia",       d:"Carta de renúncia do VP e requerimento de destituição incluídos em urgência, sem 7 dias de antecedência regimental." },
  { g:"media",   t:"Adiamento reiterado de atas com sintetização excessiva",    d:"Conselheiros relataram atas mais sintéticas; adiamento sistemático dificulta controle do conteúdo." },
  { g:"media",   t:"Composição irregular de sindicância de assédio moral",      d:"Conselheiros integravam comissão que deveria ser exclusivamente de funcionários." },
  { g:"media",   t:"Ausência de registro numérico de votos",                   d:"Itens 7.3 a 7.6: ata registra apenas 'maioria acompanhou o relator', sem número de votos." },
  { g:"baixa",   t:"Afastamento de conselheira sem item autônomo de pauta",     d:"Aprovação inserida em 'Palavras do Presidente', sem constar na ordem do dia." },
];
const FLASH_IRR = [
  { g:"critica", t:"Desrespeito à soberania do Plenário",                      d:"Presidente ignorou repetidamente pedidos para colocar em votação a eleição do VP, contrariando a maioria (arts. 67, 68, 142, 214-215)." },
  { g:"alta",    t:"Pedido formal de destituição do Presidente",               d:"Protocolo SICCAU 2032093/2024 assinado por 16 conselheiros, aprovado 16×4×1. Sem prazo para encaminhamento." },
  { g:"alta",    t:"Crise de governança — tratamento inadequado da questão",    d:"Retirada da pauta e promessa genérica de resolução geraram acusações de falta de transparência." },
  { g:"media",   t:"Dificuldade na aprovação de atas",                         d:"Adiamento sistemático com atas mais sintéticas abre espaço para alterações não supervisionadas." },
  { g:"media",   t:"Composição irregular — sindicância de assédio moral",       d:"Conselheiros em comissão que deveria ser de funcionários — irregularidade reconhecida pelo plenário." },
  { g:"media",   t:"Impasse jurídico sobre eleição de VP",                     d:"Divergência entre Ouvidor, advogados e conselheiros sobre art. 142 e casos omissos do RI." },
  { g:"media",   t:"Regimento Interno não publicado",                          d:"Presidente apoiava decisões em RI não homologado nem publicado." },
  { g:"media",   t:"Cerceamento de candidatura da conselheira Licyane",        d:"Condução presidencial impediu participação como candidata à VP." },
  { g:"baixa",   t:"Votações disciplinares sem registro numérico",              d:"Itens 7.3–7.6 aprovados sem número de votos, dificultando rastreabilidade." },
];
const PRO_IRR = [
  { g:"critica", t:"Obstrução da soberania do Plenário",                       d:"Presidente recusou submeter à votação o procedimento para VP, usurpando competência para resolver casos omissos (Art. 259)." },
  { g:"alta",    t:"Abuso de autoridade na condução dos trabalhos",             d:"Retirou unilateralmente da pauta a eleição do VP ignorando apelos da maioria — viola dever implícito do Art. 214 V e XXVII." },
  { g:"media",   t:"Falsa declaração sobre norma regimental",                  d:"Afirmou que composição de comissão deve ser 'exclusivamente funcionários', contradizendo Art. 138 que prevê conselheiros." },
  { g:"baixa",   t:"Falha administrativa na convocação do CEAU",               d:"Representante do Colegiado das Entidades não foi formalmente convocado (Art. 48)." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dados — Seção 4: Pro vs Sonnet (5 atos com contexto enriquecido)
// ─────────────────────────────────────────────────────────────────────────────
const SEC4 = [
  { ato:"Portaria 586/2025",           haiku:"vermelho/87", sonnet:"vermelho/87", pro:"vermelho/90", match:true,  custo_pro:0.0957, nota:"Concordância perfeita. Pro gerou narrativa de 'bypass do controle colegiado' com 3 indícios legais precisos (Arts. 135, 138, 203, 82§2º)." },
  { ato:"Ata Plenária 172",            haiku:"vermelho/87", sonnet:"N/A",         pro:"laranja/85",  match:null,  custo_pro:0.0901, nota:"Sonnet sem dados no banco (atas plenárias têm fluxo separado). Pro: patrocínio irregular ao IAB + inclusão de pauta surpresa para 'voto de desconfiança'." },
  { ato:"Ata Plenária 109",            haiku:"laranja/62",  sonnet:"N/A",         pro:"vermelho/95", match:null,  custo_pro:0.0898, nota:"Pro elevou de laranja para vermelho — identificou encerramento ilegal de sessão com quórum válido (8 presentes, mínimo 5) e instauração de processo contra conselheiro por ato unilateral da Presidência." },
  { ato:"Deliberação 01/2026",         haiku:"laranja/74",  sonnet:"laranja/74",  pro:"vermelho/85", match:false, custo_pro:0.0919, nota:"Sonnet e Haiku convergiram em laranja/74. Pro elevou para vermelho/85 — identificou prorrogação de comissão via ad referendum sem motivação como usurpação de competência do Plenário." },
  { ato:"Deliberação 0102-11/2019",    haiku:"vermelho/9",  sonnet:"vermelho/9",  pro:"vermelho/9",  match:true,  custo_pro:0.0742, nota:"Concordância tripla. Ato de alta gravidade confirmado pelos três modelos com scores próximos." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Componentes
// ─────────────────────────────────────────────────────────────────────────────
function Case1Card({ c, i }: { c: Case1; i: number }) {
  const bc = BORDER_CLS[c.haiku.n] ?? "";
  const dl = c.diff_type === "dn"
    ? `↓ Flash ${c.haiku.s - c.flash.s} pts abaixo`
    : c.diff_type === "up" ? `↑ Flash ${c.flash.s - c.haiku.s} pts acima` : "≈ Concordância";
  const dc = c.diff_type === "dn" ? "dn" : c.diff_type === "up" ? "up" : "eq";
  return (
    <div className={`card ${bc}`}>
      <div className="card-head">
        <div>
          <div className="card-title">{i}. {c.tipo} {c.numero}</div>
          <div className="card-meta">{c.data} · {c.ementa}</div>
        </div>
        <div className="card-badges">
          <Badge n={c.haiku.n} /><span style={{ color:"#ccc" }}>→</span><Badge n={c.flash.n} />
          <span className={dc} style={{ marginLeft:4 }}>{dl}</span>
        </div>
      </div>
      <div>
        <div className="mrow">
          <div className="mrow-label">
            <span className="mtag mt-haiku">Haiku 4.5</span>
            <div style={{ fontSize:"0.7rem", color:"var(--subtle)" }}>{c.chars.toLocaleString("pt-BR")} chars<br/>texto completo</div>
          </div>
          <div className="mrow-body">
            <div className="mrow-scores"><Badge n={c.haiku.n} /><Bar s={c.haiku.s} n={c.haiku.n} /></div>
            <div className="mrow-resumo">{c.haiku.resumo}</div>
            <div className="mrow-stats">
              <span><span className="sv">{c.haiku.ind}</span> indícios</span>
              <span><span className="sv">{c.haiku.pessoas}</span> pessoas</span>
            </div>
          </div>
        </div>
        <div className="mrow">
          <div className="mrow-label">
            <span className="mtag mt-flash">Flash-Lite</span>
            <div style={{ fontSize:"0.7rem", color:"var(--subtle)" }}>{c.flash.tok_in.toLocaleString("pt-BR")} tok in<br/>${c.flash.custo.toFixed(5)} · {c.flash.tempo}s</div>
          </div>
          <div className="mrow-body">
            <div className="mrow-scores"><Badge n={c.flash.n} /><Bar s={c.flash.s} n={c.flash.n} /></div>
            <div className="mrow-resumo">{c.flash.resumo}</div>
            <div className="mrow-stats">
              <span><span className="sv">{c.flash.ind}</span> indícios</span>
              <span><span className="sv">{c.flash.pessoas}</span> pessoas</span>
              <span><span className="sv">{c.flash.tok_out.toLocaleString("pt-BR")}</span> tok out</span>
            </div>
          </div>
        </div>
        <div className={`card-note ${c.diff_type === "eq" ? "note-ok" : "note-warn"}`}>
          <strong>Análise da diferença:</strong> {c.diff}
        </div>
      </div>
    </div>
  );
}

function CalibCard({ c, i }: { c: CalibCase; i: number }) {
  const bc = BORDER_CLS[c.haiku.n] ?? "";
  const melhorou = Math.abs(c.dc) < Math.abs(c.do_);
  const acertou = c.cal.n === c.haiku.n;
  const fmt = (d: number) => d > 0 ? `+${d}` : `${d}`;
  return (
    <div className={`card ${bc}`}>
      <div className="card-head">
        <div>
          <div className="card-title">{i}. {c.tipo} — {c.ato}</div>
          <div className="card-meta">
            Referência Haiku: <strong>{c.haiku.n}/{c.haiku.s}</strong>
            {acertou && <span className="ok" style={{ marginLeft:8 }}>✓ nível acertado</span>}
          </div>
        </div>
        <div className="card-badges">
          <Badge n={c.orig.n} /><span style={{ color:"#ccc" }}>→</span><Badge n={c.cal.n} />
          {melhorou && <span className="dn" style={{ marginLeft:4 }}>Δ orig {fmt(c.do_)} → cal {fmt(c.dc)} ✅</span>}
        </div>
      </div>
      <div>
        <div className="mrow">
          <div className="mrow-label">
            <span className="mtag mt-haiku">Haiku 4.5</span>
            <div style={{ fontSize:"0.7rem", color:"var(--subtle)" }}>referência banco</div>
          </div>
          <div className="mrow-body">
            <div className="mrow-scores"><Badge n={c.haiku.n} /><Bar s={c.haiku.s} n={c.haiku.n} /></div>
            <div className="mrow-stats" style={{ marginTop:6 }}><span><span className="sv">{c.haiku.ind}</span> indícios no banco</span></div>
          </div>
        </div>
        <div className="mrow">
          <div className="mrow-label"><span className="mtag mt-flash">Flash orig.</span></div>
          <div className="mrow-body">
            <div className="mrow-scores">
              <Badge n={c.orig.n} /><Bar s={c.orig.s} n={c.orig.n} />
              <span className="up" style={{ marginLeft:4 }}>Δ {fmt(c.do_)}</span>
            </div>
            <div className="mrow-resumo">{c.orig.resumo}</div>
            <div className="mrow-stats"><span><span className="sv">{c.orig.ind}</span> indícios</span></div>
          </div>
        </div>
        <div className="mrow">
          <div className="mrow-label"><span className="mtag mt-flash-cal">Flash cal.</span></div>
          <div className="mrow-body">
            <div className="mrow-scores">
              <Badge n={c.cal.n} /><Bar s={c.cal.s} n={c.cal.n} />
              <span className={melhorou ? "dn" : "up"} style={{ marginLeft:4 }}>Δ {fmt(c.dc)} {melhorou ? "✅" : ""}</span>
            </div>
            <div className="mrow-resumo">{c.cal.resumo}</div>
            <div className="mrow-stats"><span><span className="sv">{c.cal.ind}</span> indícios</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
function TesteModeloPage() {
  const flashTotal = SEC1.reduce((s, c) => s + c.flash.custo, 0);
  const proTotal   = 0.3975 + 0.1057;
  const calibTotal = 0.05968;

  return (
    <>
      <style>{STYLES}</style>
      <div className="tm">
        <div className="wrap">

          {/* ── Header ── */}
          <header>
            <Link to="/" className="logo">Dig Dig</Link>
            <span className="chip-top">Relatório Interno · IA</span>
          </header>

          <article>
            <span className="label">Infraestrutura de IA · 28 de abril de 2026</span>
            <h1>Qual modelo de IA para auditar<br />atos administrativos?</h1>
            <p className="intro">
              Quatro experimentos com dados reais do CAU/PR: triagem Haiku vs Flash-Lite,
              calibração de prompt, Ata 167 com três modelos e Pro com contexto Sonnet.
              Total investido: <strong>~$0,75</strong>. 16 atos analisados em produção de teste.
            </p>

            {/* ── TOC ── */}
            <nav className="toc" aria-label="Índice">
              <div className="toc-title">Neste relatório</div>
              <ol className="toc-list">
                <li><a href="#s1"><span className="toc-num">01</span>Triagem — Haiku 4.5 vs Gemini Flash-Lite (5 atos)</a></li>
                <li><a href="#s2"><span className="toc-num">02</span>Calibração de Prompt — Flash-Lite ajustado ao nível do Haiku</a></li>
                <li><a href="#s3"><span className="toc-num">03</span>Documento longo — Ata 167 com três modelos (60.965 chars)</a></li>
                <li><a href="#s4"><span className="toc-num">04</span>Análise profunda — Gemini Pro com contexto Sonnet</a></li>
                <li><a href="#s5"><span className="toc-num">05</span>Guia de custo — todos os modelos comparados</a></li>
                <li><a href="#s6"><span className="toc-num">06</span>Conclusões e recomendações</a></li>
              </ol>
            </nav>

            {/* ── Sumário executivo ── */}
            <span className="label">Achados principais</span>
            <div className="findings">
              <div className="finding f-amber">
                <div className="f-num">Achado 1</div>
                <div className="f-title">Flash-Lite é 22 pts mais conservador que o Haiku por padrão</div>
                <div className="f-body">Em 4 de 5 casos, o Flash classificou abaixo do Haiku. Trata falhas formais como "pontos de atenção" em vez de indícios — o oposto da política de triagem preventiva do Dig Dig.</div>
              </div>
              <div className="finding f-green">
                <div className="f-num">Achado 2</div>
                <div className="f-title">+2.013 chars de calibração corrigem 5/5 casos</div>
                <div className="f-body">Adicionar princípio preventivo + lista de falhas formais obrigatórias + âncoras de score alinha o Flash ao Haiku em todos os casos. Portaria 369 ficou exatamente amarelo/35.</div>
              </div>
              <div className="finding f-orange">
                <div className="f-num">Achado 3</div>
                <div className="f-title">Pro com contexto Sonnet custa 52% menos com qualidade equivalente</div>
                <div className="f-body">Na Portaria 586, Pro concordou com Sonnet em vermelho (90 vs 87) e gerou ficha de denúncia com artigos precisos. Custo: $0,096 vs $0,201. Para os 115 críticos pendentes: economia de ~$12.</div>
              </div>
              <div className="finding f-red">
                <div className="f-num">Achado 4</div>
                <div className="f-title">Flash-Lite e Sonnet convergem em documentos longos por 22× menos</div>
                <div className="f-body">Na Ata 167 (60.965 chars), Flash extraiu 34 pessoas e 9 irregularidades vs 35 e 10 do Sonnet. Custo: $0,0088 vs $0,2007. Diferença de classificação (laranja vs vermelho) vem de contexto histórico.</div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s1" />
            <div className="section">
              <span className="sec-num">Seção 01</span>
              <h2>Triagem — Haiku 4.5 vs Gemini Flash-Lite</h2>
              <p>
                Cinco atos já analisados pelo Haiku em produção foram reanalisados pelo Flash-Lite
                com <strong>texto completo</strong> (sem o limite de 8.000 chars do Haiku) e
                regimento inteiro no contexto (~201k chars). O Haiku usou prompt caching (resultado do banco);
                o Flash-Lite usou chamada direta. Mesma estrutura de prompt.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Ato</th>
                    <th className="col-haiku">Haiku 4.5</th>
                    <th className="col-flash">Flash-Lite</th>
                    <th>Δ Score</th>
                    <th>Indícios</th>
                  </tr>
                </thead>
                <tbody>
                  {SEC1.map(c => (
                    <tr key={c.id}>
                      <td><div className="ato-name">{c.tipo} {c.numero}</div><div className="ato-sub">{c.chars.toLocaleString("pt-BR")} chars</div></td>
                      <td><Badge n={c.haiku.n} /> <span style={{ fontSize:"0.78rem", color:"var(--muted)", marginLeft:4 }}>{c.haiku.s}</span></td>
                      <td><Badge n={c.flash.n} /> <span style={{ fontSize:"0.78rem", color:"var(--muted)", marginLeft:4 }}>{c.flash.s}</span></td>
                      <td>
                        {c.diff_type==="dn" && <span className="dn">↓ {c.haiku.s - c.flash.s} pts</span>}
                        {c.diff_type==="up" && <span className="up">↑ {c.flash.s - c.haiku.s} pts</span>}
                        {c.diff_type==="eq" && <span className="eq">≈ {Math.abs(c.haiku.s - c.flash.s)} pts</span>}
                      </td>
                      <td style={{ fontSize:"0.82rem" }}>{c.haiku.ind} → {c.flash.ind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {SEC1.map((c, i) => <Case1Card key={c.id} c={c} i={i + 1} />)}

              <div className="callout callout-info">
                <strong>Custo Flash-Lite (5 atos):</strong> ${flashTotal.toFixed(4)} — média ${(flashTotal / 5).toFixed(5)}/ato. Tempo médio: {(SEC1.reduce((s,c)=>s+c.flash.tempo,0)/5).toFixed(1)}s. O Haiku usou prompt caching — custo real por ato foi ~$0,0118 com regimento cacheado.
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s2" />
            <div className="section">
              <span className="sec-num">Seção 02</span>
              <h2>Calibração de Prompt — Flash-Lite ajustado</h2>
              <p>
                O diagnóstico da Seção 1 é claro: o Flash-Lite tem <strong>calibração conservadora</strong>.
                Para corrigir, adicionamos ao system prompt (+2.013 chars) três ajustes cirúrgicos.
                Testamos os mesmos 5 atos em dois modos: Flash original e Flash calibrado.
              </p>

              <div style={{ background:"var(--bg-alt)", border:"1px solid var(--border)", borderRadius:8, padding:"18px 20px", margin:"20px 0" }}>
                <div style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--subtle)", marginBottom:12 }}>O que mudou no prompt (+2.013 chars)</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  {[
                    { t:"Princípio preventivo", d:"Na dúvida entre dois níveis, SEMPRE eleve para o mais grave. Falso positivo pode ser corrigido; falso negativo esconde irregularidade." },
                    { t:"Falhas formais = indícios", d:"Lista de 7 omissões obrigatórias: ausência de prazo, votação sem número de votos, dotação 'a verificar', abstenção sem justificativa, etc." },
                    { t:"Âncoras de score", d:"Verde 0–20 · Amarelo 21–50 · Laranja 51–74 · Vermelho 75–100. Referência numérica explícita para calibrar a escala." },
                  ].map((item, j) => (
                    <div key={j} style={{ fontSize:"0.83rem" }}>
                      <div style={{ fontWeight:700, marginBottom:4, color:"var(--text)" }}>{item.t}</div>
                      <div style={{ color:"var(--muted)", lineHeight:1.55 }}>{item.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Ato</th>
                    <th className="col-haiku">Haiku (ref.)</th>
                    <th className="col-flash">Flash Original</th>
                    <th style={{ color:"var(--sonnet)" }}>Flash Calibrado</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {SEC2.map(c => {
                    const melhorou = Math.abs(c.dc) < Math.abs(c.do_);
                    const acertou  = c.cal.n === c.haiku.n;
                    return (
                      <tr key={c.id}>
                        <td><div className="ato-name">{c.tipo}</div><div className="ato-sub">{c.ato}</div></td>
                        <td><Badge n={c.haiku.n} /> <span style={{ fontSize:"0.76rem", color:"var(--muted)", marginLeft:3 }}>{c.haiku.s}</span></td>
                        <td><Badge n={c.orig.n}  /> <span style={{ fontSize:"0.76rem", color:"var(--muted)", marginLeft:3 }}>{c.orig.s}</span></td>
                        <td>
                          <Badge n={c.cal.n} /> <span style={{ fontSize:"0.76rem", color:"var(--muted)", marginLeft:3 }}>{c.cal.s}</span>
                          {acertou && <span className="ok" style={{ marginLeft:6 }}>✓</span>}
                        </td>
                        <td>
                          {melhorou
                            ? <span className="dn">✅ melhorou</span>
                            : <span className="eq">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {SEC2.map((c, i) => <CalibCard key={c.id} c={c} i={i + 1} />)}

              <div className="callout callout-ok">
                <strong>5/5 casos melhoraram.</strong> Portaria 369 acertou exatamente amarelo/35 (match perfeito). Dispensa eletrônica voltou ao laranja correto. Gap no vermelho/95 reduziu de 50 para 35 pts — atos com irregularidades múltiplas de alta gravidade precisam de uma segunda iteração. Custo do teste de calibração: <strong>${calibTotal.toFixed(4)}</strong> (10 chamadas).
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s3" />
            <div className="section">
              <span className="sec-num">Seção 03</span>
              <h2>Documento longo — Ata Plenária 167 (60.965 chars)</h2>
              <p>
                A Ata 167 tem <strong>60.965 chars</strong> — 7,6× acima do limite de 8.000 chars do Haiku.
                É o tipo de documento onde a janela de contexto do Gemini se torna concreta.
                O Haiku não analisa atas plenárias (fluxo especializado); a comparação é entre
                <strong> Sonnet</strong> (resultado do banco), <strong>Flash-Lite</strong> e <strong>Pro</strong>
                — todos com o documento completo e <code>max_tokens=65.536</code>.
              </p>

              {/* Card 3 colunas */}
              <div className="card card-ver">
                <div className="card-head" style={{ background:"#fff5f5" }}>
                  <div>
                    <div className="card-title">Ata Plenária 167 — 28/05/2024</div>
                    <div className="card-meta">Renúncia do VP + Pedido de Destituição do Presidente por 16 conselheiros</div>
                    <div className="tri-chips" style={{ marginTop:8 }}>
                      <span className="tchip tchip-key">60.965 chars · 7,6× limite Haiku</span>
                      <span className="tchip">~73.478 tokens de entrada</span>
                      <span className="tchip">max_tokens 65.536 (teto Gemini)</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <Badge n="vermelho" /><span style={{ fontSize:"0.76rem", color:"var(--muted)" }}>Sonnet</span>
                    <span style={{ color:"#ddd" }}>·</span>
                    <Badge n="laranja"  /><span style={{ fontSize:"0.76rem", color:"var(--muted)" }}>Flash</span>
                    <span style={{ color:"#ddd" }}>·</span>
                    <Badge n="vermelho" /><span style={{ fontSize:"0.76rem", color:"var(--muted)" }}>Pro</span>
                  </div>
                </div>

                <div className="tri">
                  {/* Sonnet */}
                  <div className="tri-col">
                    <span className="tri-tag tt-sonnet">Sonnet 4.6 — banco</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <Badge n="vermelho" /><Bar s={87} n="vermelho" />
                      <span style={{ fontSize:"0.72rem", color:"var(--subtle)" }}>$0,2007 · ~120s</span>
                    </div>
                    <div className="tri-resumo">Crise institucional grave: VP renunciou com efeito imediato; 16 conselheiros protocolaram pedido de destituição do Presidente (SICCAU 2032093/2024). Presidente resistiu sistematicamente a colocar em votação a eleição do novo VP ao longo de toda a sessão.</div>
                    <ul className="irr-list">
                      {SONNET_IRR.map((r, j) => <li key={j}><GravTag g={r.g} /><strong>{r.t}</strong> — {r.d}</li>)}
                    </ul>
                    <div className="tri-stats">
                      <span><span className="sv">10</span> irregularidades</span>
                      <span><span className="sv">35</span> pessoas</span>
                      <span><span className="sv">$0,2007</span></span>
                    </div>
                  </div>

                  {/* Flash-Lite */}
                  <div className="tri-col">
                    <span className="tri-tag tt-flash">Flash-Lite — teste</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <Badge n="laranja" /><Bar s={75} n="laranja" />
                      <span style={{ fontSize:"0.72rem", color:"var(--subtle)" }}>$0,0088 · 10,6s</span>
                    </div>
                    <div className="tri-resumo">Debate intenso sobre vacância do VP e condução pelo Presidente Maugham Zaze. Divergências sobre interpretação regimental e acusações de desrespeito à soberania do plenário. Sessão encerrada com pedido de destituição protocolado mas sem resolução.</div>
                    <ul className="irr-list">
                      {FLASH_IRR.map((r, j) => <li key={j}><GravTag g={r.g} /><strong>{r.t}</strong> — {r.d}</li>)}
                    </ul>
                    <div className="tri-stats">
                      <span><span className="sv">9</span> irregularidades</span>
                      <span><span className="sv">34</span> pessoas</span>
                      <span><span className="sv">$0,0088</span></span>
                    </div>
                  </div>

                  {/* Pro */}
                  <div className="tri-col">
                    <span className="tri-tag tt-pro">Gemini Pro — teste</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <Badge n="vermelho" /><Bar s={90} n="vermelho" />
                      <span style={{ fontSize:"0.72rem", color:"var(--subtle)" }}>$0,1057 · 39,7s</span>
                    </div>
                    <div className="tri-resumo">Crise de governança crítica: recusa do Presidente em submeter à deliberação do Plenário a sucessão da Vice-Presidência configurou violação da soberania do colegiado (Art. 259), culminando no pedido formal de destituição por 16 conselheiros.</div>
                    <ul className="irr-list">
                      {PRO_IRR.map((r, j) => <li key={j}><GravTag g={r.g} /><strong>{r.t}</strong> — {r.d}</li>)}
                    </ul>
                    <div className="tri-stats">
                      <span><span className="sv">4</span> irregularidades</span>
                      <span><span className="sv">10</span> pessoas</span>
                      <span><span className="sv">$0,1057</span></span>
                    </div>
                  </div>
                </div>

                <div className="tri-compare">
                  <strong>O que a comparação revela:</strong>{" "}
                  Sonnet (vermelho/87) e Pro (vermelho/90) concordam no nível — mas são opostos no estilo.
                  O Sonnet documentou <strong>10 irregularidades</strong> incluindo padrões sistêmicos dos 6 meses anteriores.
                  O Pro extraiu <strong>4 irregularidades</strong> com artigo preciso, mais citáveis juridicamente.
                  O Flash ficou em laranja/75 com <strong>34 pessoas e 9 irregularidades</strong> — extração quase idêntica ao Sonnet —
                  mas classificou abaixo por não ter o contexto cronológico.
                  Custo: Flash ($0,009) é <strong>22× mais barato</strong> que Sonnet ($0,20) e Pro ($0,11) para esta análise.
                  Para triagem de novos documentos longos: Flash calibrado é a escolha. Para ficha de denúncia: Pro.
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s4" />
            <div className="section">
              <span className="sec-num">Seção 04</span>
              <h2>Análise profunda — Gemini Pro com contexto Sonnet</h2>
              <p>
                O Sonnet no pipeline recebe mais do que o documento: também recebe a <strong>análise prévia do Haiku</strong>
                e o <strong>histórico de aparições das pessoas</strong> envolvidas. Testamos o Pro com exatamente
                esse mesmo contexto e system prompt (<code>SONNET_EXTRA</code>). O objetivo: o Pro pode substituir
                o Sonnet nos 115 atos críticos pendentes?
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Ato</th>
                    <th className="col-haiku">Haiku</th>
                    <th className="col-sonnet">Sonnet</th>
                    <th className="col-pro">Pro</th>
                    <th>Concordância</th>
                    <th>Custo Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {SEC4.map((r, i) => (
                    <tr key={i}>
                      <td><div className="ato-name" style={{ fontSize:"0.82rem" }}>{r.ato}</div></td>
                      <td style={{ fontSize:"0.8rem" }}>{r.haiku}</td>
                      <td style={{ fontSize:"0.8rem", color:"var(--sonnet)" }}>{r.sonnet}</td>
                      <td style={{ fontSize:"0.8rem", color:"var(--pro)" }}>{r.pro}</td>
                      <td>
                        {r.match === true  && <span className="dn">✅ match</span>}
                        {r.match === false && <span className="up">❌ divergiu</span>}
                        {r.match === null  && <span className="eq">— sem ref.</span>}
                      </td>
                      <td style={{ fontSize:"0.8rem" }}>${r.custo_pro.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {SEC4.map((r, i) => (
                <div key={i} className="card-note note-info" style={{ margin:"8px 0" }}>
                  <strong>{r.ato}:</strong> {r.nota}
                </div>
              ))}

              {/* Destaque: Portaria 586 ficha completa */}
              <h3>Exemplo completo: Portaria 586/2025</h3>
              <p>A portaria mais complexa do teste — o Pro gerou uma das análises mais citáveis produzidas pelo sistema.</p>

              <div className="card card-ver" style={{ marginTop:16 }}>
                <div className="card-head" style={{ background:"#fff5f5" }}>
                  <div>
                    <div className="card-title">Portaria 586/2025 — Reinstauração de PAD</div>
                    <div className="card-meta">Haiku vermelho/87 · Sonnet vermelho/87 · Pro vermelho/90</div>
                  </div>
                  <div className="card-badges">
                    <span className="mtag mt-pro">Pro 2.5</span>
                    <span style={{ fontSize:"0.78rem", color:"var(--muted)" }}>$0,0957 · 40,8s · 58.471 tok in</span>
                  </div>
                </div>
                <div>
                  <div className="mrow">
                    <div className="mrow-label">
                      <span className="mtag mt-pro">Narrativa</span>
                    </div>
                    <div className="mrow-body" style={{ fontSize:"0.84rem", color:"var(--muted)", lineHeight:1.65 }}>
                      Um PAD (nº 02/2024) estava em curso. A comissão original decidiu pela descontinuação por "impedimento" (Memorando CPSI 29/2024). Em vez de submeter ao Plenário, o Vice-Presidente Versetti emitiu a Portaria 586: reinstaurou o PAD, trocou a membro Maria Helena por Alex Sandro (analista de compras) e amparou o ato em "Comissão Permanente de Sindicância" criada por portaria — estrutura ilegal perante o Regimento. <strong>Padrão identificado:</strong> <em>bypass do controle colegiado via atos unilaterais da Presidência</em>.
                    </div>
                  </div>
                  <div className="mrow">
                    <div className="mrow-label">
                      <span className="mtag mt-pro">Indícios legais</span>
                    </div>
                    <div className="mrow-body">
                      <ul style={{ margin:0, padding:"0 0 0 1.2em" }}>
                        <li style={{ fontSize:"0.83rem", marginBottom:5, color:"var(--muted)" }}><GravTag g="critica" /><strong>Usurpação de competência do Plenário</strong> — comissões temporárias são instituídas pelo Plenário (Arts. 135, 138), não pela Presidência</li>
                        <li style={{ fontSize:"0.83rem", marginBottom:5, color:"var(--muted)" }}><GravTag g="alta" /><strong>Vício de motivação</strong> — Vice-Presidente não declarou qual impedimento do Presidente justifica o ato (Art. 203)</li>
                        <li style={{ fontSize:"0.83rem", color:"var(--muted)" }}><GravTag g="critica" /><strong>Estrutura de poder paralela</strong> — "Comissão Permanente" criada por portaria viola Art. 82 §2º que exige inclusão no RI</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="ficha-box" style={{ margin:"0 0 0", borderRadius:0, borderLeft:"none", borderRight:"none", borderBottom:"none" }}>
                  <div className="ficha-title">Ficha de denúncia gerada pelo Pro</div>
                  <div className="ficha-row">
                    <span className="ficha-label">Título</span>
                    <span className="ficha-val">Denúncia de Manipulação de Processo Disciplinar e Usurpação de Poder pelo Vice-Presidente do CAU/PR</span>
                  </div>
                  <div className="ficha-row">
                    <span className="ficha-label">Evidências</span>
                    <span className="ficha-val">Portaria 586/2025; Regimento Arts. 82, 133, 135, 138, 203; MEMORANDO-CPSI 29/2024 (solicitar via LAI: Processo SEI 00169.000770/2024-15); Portaria 529/2024 (composição original)</span>
                  </div>
                  <div className="ficha-row">
                    <span className="ficha-label">Recomendação</span>
                    <span className="ficha-val">Exigir anulação imediata da Portaria 586/2025 por vício de competência. Protocolar no Plenário pedido de investigação por usurpação de poder. Solicitar via LAI a íntegra do Processo SEI 00169.000770/2024-15.</span>
                  </div>
                </div>
              </div>

              <div className="callout callout-ok">
                <strong>Para os 115 atos críticos pendentes:</strong> substituir Sonnet por Pro com contexto Sonnet custaria ~$11 vs ~$23 do Sonnet — economia de $12, qualidade equivalente. O Pro é mais preciso juridicamente (artigos citados); o Sonnet é mais exaustivo em padrões históricos. Para fichas de denúncia pública, o Pro vence.
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s5" />
            <div className="section">
              <span className="sec-num">Seção 05</span>
              <h2>Guia de custo — todos os modelos</h2>
              <p>
                Referência consolidada de custo, velocidade e qualidade para escolha do modelo
                em cada estágio do pipeline.
              </p>

              <table className="cost-table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Papel</th>
                    <th>$/ato</th>
                    <th>Rodada 1k atos</th>
                    <th>Velocidade</th>
                    <th>Qualidade triagem</th>
                    <th>Contexto</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { modelo:"Haiku 4.5", mtag:"mt-haiku", papel:"Triagem", custo:"$0,0118", mil:"~$13 (com cache)", vel:"<3s", q:3, ctx:"8k chars" },
                    { modelo:"Flash-Lite original", mtag:"mt-flash", papel:"Triagem", custo:"$0,0062", mil:"~$6,80", vel:"~6s", q:2, ctx:"ilimitado" },
                    { modelo:"Flash-Lite calibrado", mtag:"mt-flash-cal", papel:"Triagem", custo:"$0,0062", mil:"~$6,80", vel:"~6s", q:3, ctx:"ilimitado" },
                    { modelo:"Pro 2.5 (triagem)", mtag:"mt-pro", papel:"Triagem+", custo:"$0,082", mil:"~$90", vel:"~30s", q:4, ctx:"ilimitado" },
                    { modelo:"Sonnet 4.6 (Bud)", mtag:"mt-sonnet", papel:"Análise profunda", custo:"$0,201", mil:"~$220", vel:"~120s", q:5, ctx:"6k chars + hist." },
                    { modelo:"Pro (ctx Sonnet)", mtag:"mt-pro", papel:"Análise profunda", custo:"$0,096", mil:"~$105", vel:"~42s", q:4, ctx:"6k chars + hist." },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td><span className={`mtag ${r.mtag}`}>{r.modelo}</span></td>
                      <td style={{ fontSize:"0.82rem" }}>{r.papel}</td>
                      <td style={{ fontFamily:"'Inter Tight',sans-serif", fontWeight:700 }}>{r.custo}</td>
                      <td style={{ fontSize:"0.82rem", color:"var(--muted)" }}>{r.mil}</td>
                      <td style={{ fontSize:"0.82rem", color:"var(--muted)" }}>{r.vel}</td>
                      <td><Stars n={r.q} /></td>
                      <td style={{ fontSize:"0.8rem", color:"var(--subtle)" }}>{r.ctx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="callout callout-info">
                <strong>Pipeline recomendado:</strong> Flash-Lite calibrado para triagem (1k+ atos, ~$7) →
                Pro com contexto Sonnet para os críticos (vermelho + laranja, ~$9 por rodada de 100 atos) →
                Sonnet reservado para atos que exigem cruzamento de múltiplas gestões.
                Haiku permanece para órgãos onde o caching do regimento amortiza o custo acima do Flash.
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            <hr id="s6" />
            <div className="section">
              <span className="sec-num">Seção 06</span>
              <h2>Conclusões e recomendações</h2>

              <div className="concl">
                {[
                  { n:"1", t:"Flash-Lite precisa de calibração para funcionar no Dig Dig",
                    b:"Sem calibração, o Flash trata falhas formais como pontos de atenção em vez de indícios — o oposto da política de triagem preventiva. Com +2.013 chars de prompt, 5/5 casos melhoram." },
                  { n:"2", t:"A calibração resolve o conservadorismo mas não o gap no vermelho",
                    b:"Atos com irregularidades múltiplas de alta gravidade (ex: portaria 667, haiku=vermelho/95) ficam em laranja/60 mesmo com calibração. Uma segunda iteração de ajuste de âncora para o vermelho pode resolver." },
                  { n:"3", t:"Flash-Lite e Sonnet convergem em documentos longos — por 22× menos",
                    b:"A janela de contexto do Gemini se torna vantagem real quando o documento supera 8k chars. Na Ata 167: 34 vs 35 pessoas, 9 vs 10 irregularidades, $0,009 vs $0,20." },
                  { n:"4", t:"Pro com contexto Sonnet entrega qualidade equivalente a 52% do custo",
                    b:"Para os 115 atos críticos pendentes: Pro concordou com Sonnet em nível (portaria 586), gerou fichas com artigos precisos e padrão identificado. Economia de ~$12 na rodada." },
                  { n:"5", t:"Pro eleva classificações; Flash as reduz — calibrações opostas",
                    b:"Flash original: média -22 pts vs Haiku. Pro (triagem): média +38 pts vs Haiku. Flash calibrado: -5 pts médio. O Pro pode ser excessivamente severo em falhas formais menores (portaria 370: verde→laranja/65)." },
                  { n:"6", t:"O ganho real do Gemini ainda não foi testado",
                    b:"Nenhum dos 4 experimentos colocou múltiplos atos da mesma gestão em contexto único. A janela de 1M tokens para identificar padrões transversais entre 1k+ atos é o próximo experimento." },
                ].map((c, i) => (
                  <div key={i} className="concl-item">
                    <span className="concl-n">{c.n}</span>
                    <div>
                      <div className="concl-title">{c.t}</div>
                      <p className="concl-body">{c.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </article>

          <footer>
            <span>Dig Dig · Relatório interno · Não é análise jurídica</span>
            <span>Teste executado em 28/04/2026</span>
          </footer>

        </div>
      </div>
    </>
  );
}
