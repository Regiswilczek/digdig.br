import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções — Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig escava automaticamente atos administrativos públicos com IA — pipeline completo, fichas de denúncia, chat conversacional e roadmap para auditar todo o Brasil.",
      },
      { property: "og:title", content: "Soluções — Dig Dig" },
    ],
  }),
  component: SolucoesPage,
});

const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace",
};

const GOLD = "#F0C81E";

// ─── Types ────────────────────────────────────────────────
type Solucao = {
  slug: string;
  publico: string;
  titulo: string;
  dor: string;
  beneficios: string[];
  planoSugerido: string;
  cor: string;
};

// ─── Data ─────────────────────────────────────────────────
const SOLUCOES: Solucao[] = [
  {
    slug: "jornalistas",
    publico: "Jornalismo investigativo",
    titulo: "Da pauta à matéria em horas, não meses.",
    dor: "O Diário Oficial tem 20 anos de PDFs. Lê tudo manualmente ou abandona a pauta.",
    beneficios: [
      "Fichas com fonte e número do ato",
      "Busca conversacional em linguagem natural",
      "Exportação em CSV/PDF para a redação",
      "Alertas por email ao detectar novo padrão",
    ],
    planoSugerido: "Investigador — R$ 197/mês",
    cor: GOLD,
  },
  {
    slug: "advogados",
    publico: "Direito e compliance",
    titulo: "Provas documentais organizadas para a petição inicial.",
    dor: "Reunir evidências exige semanas de leitura de atos esparsos em sites mal indexados.",
    beneficios: [
      "Citações com artigo, inciso e parágrafo exatos",
      "Linha do tempo de atos correlacionados",
      "Grafo de relacionamentos entre nomeados",
      "Exportação em PDF formatado para autos",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#3b6fa0",
  },
  {
    slug: "conselheiros",
    publico: "Conselheiros e oposição",
    titulo: "Munição para o plenário, sem virar pesquisador.",
    dor: "A gestão produz mais documentos do que dá para ler. Você reage tarde — quando reage.",
    beneficios: [
      "Digest semanal — só o que importa",
      "Histórico de votações e ad referendum",
      "Detecção de quebra de quórum",
      "Chat para preparar pronunciamentos",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#00823c",
  },
  {
    slug: "vereadores",
    publico: "Parlamentares e assessorias",
    titulo: "Fiscalize o executivo sem montar equipe de pesquisa.",
    dor: "Câmaras têm orçamento limitado para análise. A oposição perde por desinformação, não argumento.",
    beneficios: [
      "Cobertura completa do executivo municipal",
      "Comparativo entre gestões",
      "Material para TV e redes com fontes",
      "Até 5 assessores no plano Profissional",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#a78bfa",
  },
  {
    slug: "cidadaos",
    publico: "Cidadãos e coletivos",
    titulo: "Transparência não é privilégio de quem tem assessoria.",
    dor: "O site oficial é hostil e os atos são técnicos. Você quer entender, mas não tem como.",
    beneficios: [
      "Acesso vitalício e gratuito",
      "3 votos/mês nas próximas auditorias",
      "Pode nominar qualquer órgão público",
      "Resultados públicos — sem paywall",
    ],
    planoSugerido: "Cidadão — Grátis",
    cor: "#e8a87c",
  },
  {
    slug: "api",
    publico: "Empresas e redações",
    titulo: "Dados estruturados de atos públicos via API REST.",
    dor: "Sua plataforma precisa de dados de atos públicos — raspar manualmente não escala.",
    beneficios: [
      "10.000 chamadas/mês via API REST",
      "Webhooks de novos atos e alertas",
      "5 assentos incluídos para a equipe",
      "SLA e suporte técnico dedicado",
    ],
    planoSugerido: "API & Dados — R$ 1.997/mês",
    cor: "#67e8f9",
  },
];

// ─── Nav ──────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.06]"
      style={INTER}
    >
      <Link
        to="/"
        className="text-white text-[12px] uppercase tracking-[0.2em] font-bold hover:opacity-55 transition"
      >
        DIG DIG
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/30">
        <Link to="/solucoes" className="text-white/65 font-medium">Soluções</Link>
        <Link to="/apoiar" className="hover:text-white/70 transition">Apoiar</Link>
      </div>
      <a href="/entrar" className="text-[12px] text-white/30 hover:text-white/65 transition">
        Entrar
      </a>
    </nav>
  );
}

// ─── Status bar ───────────────────────────────────────────
function StatusBar() {
  return (
    <div
      className="border-b border-white/[0.05] py-3.5 px-6 md:px-12 overflow-x-auto"
      style={{ background: "rgba(255,255,255,0.018)" }}
    >
      <div className="flex items-center gap-5 text-[11px] whitespace-nowrap" style={MONO}>
        <span className="flex items-center gap-2">
          <span
            className="h-[6px] w-[6px] rounded-full flex-shrink-0"
            style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }}
          />
          <span style={{ color: "rgba(255,255,255,0.50)" }}>PIPELINE ATIVO</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span style={{ color: "rgba(255,255,255,0.40)" }}>CAU/PR</span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span>
          <span style={{ color: "rgba(255,255,255,0.70)" }}>262</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> / 400 portarias analisadas</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span>
          <span style={{ color: GOLD }}>1</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> alerta laranja detectado</span>
        </span>
      </div>
    </div>
  );
}

// ─── Papers sidebar ───────────────────────────────────────
function PapersSidebar() {
  const papers = [
    {
      n: "01",
      titulo: "Como Automatizamos a Auditoria do CAU/PR com IA",
      desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.",
      to: "/whitepaper-01-extracao-caupr" as const,
      publicado: true,
    },
    {
      n: "02",
      titulo: "Quando a IA Custa Mais do Que Deveria",
      desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.",
      to: "/whitepaper-02-custo-e-controle" as const,
      publicado: true,
    },
    {
      n: "03",
      titulo: "Os Primeiros Vermelhos",
      desc: "Quando o pipeline chegou nos anos anteriores e encontrou os primeiros casos críticos.",
      to: null,
      publicado: false,
    },
  ];

  return (
    <aside className="hidden lg:block flex-shrink-0" style={{ width: "260px" }}>
      <div className="sticky" style={{ top: "32px" }}>
        <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-4" style={MONO}>
          White Papers
        </p>
        <div className="flex flex-col gap-3">
          {papers.map((p) => (
            <div
              key={p.n}
              className="border border-white/[0.06] p-5"
              style={!p.publicado ? { borderColor: "rgba(255,255,255,0.03)" } : undefined}
            >
              <p
                className="text-[9px] uppercase tracking-[0.16em] mb-2.5 flex items-center gap-2"
                style={{ ...MONO, color: "rgba(255,255,255,0.20)" }}
              >
                Nº {p.n}
                {!p.publicado && (
                  <span style={{ color: "rgba(255,255,255,0.14)" }}>— em breve</span>
                )}
              </p>
              <h4
                className="text-[0.82rem] font-semibold leading-snug mb-2"
                style={{
                  ...INTER,
                  color: p.publicado ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)",
                }}
              >
                {p.titulo}
              </h4>
              <p
                className="text-[11px] leading-relaxed mb-3"
                style={{
                  ...INTER,
                  color: p.publicado ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)",
                }}
              >
                {p.desc}
              </p>
              {p.publicado && p.to ? (
                <Link
                  to={p.to}
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-80"
                  style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}
                >
                  Ler →
                </Link>
              ) : (
                <span
                  className="text-[10px] uppercase tracking-[0.14em]"
                  style={{ ...INTER, color: "rgba(255,255,255,0.16)" }}
                >
                  Em breve
                </span>
              )}
            </div>
          ))}
        </div>
        <p
          className="mt-5 text-[11px] leading-relaxed"
          style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}
        >
          Registro técnico público sobre a construção do Dig Dig.
        </p>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────
function SolucoesPage() {
  const niveis = [
    {
      cor: "#16a34a",
      label: "Verde",
      desc: "Conforme. Ato rotineiro sem indícios de irregularidade.",
      exemplo: "PORTARIA Nº 676 — Exonera de Cargo a pedido (CJV)",
      pct: "~70%",
    },
    {
      cor: "#eab308",
      label: "Amarelo",
      desc: "Atenção. Padrão a observar — ainda não é irregularidade clara.",
      exemplo: "PORTARIA Nº 677 — Nomeia para Cargo em Comissão",
      pct: "~20%",
    },
    {
      cor: "#f97316",
      label: "Laranja",
      desc: "Indício forte. Padrão repetido ou violação procedimental.",
      exemplo: "PORTARIA Nº 678 — Prorroga Comissão Processante (3ª vez)",
      pct: "~8%",
    },
    {
      cor: "#dc2626",
      label: "Vermelho",
      desc: "Crítico. Provável violação direta do regimento — ficha de denúncia gerada.",
      exemplo: "Ad referendum sucessivo sem ratificação plenária",
      pct: "~2%",
    },
  ];

  const features = [
    {
      titulo: "Grafo de relacionamentos",
      texto: "Visualize quem nomeou quem, em que ato, e quantas vezes. Padrões de favorecimento aparecem na hora.",
    },
    {
      titulo: "Linha do tempo",
      texto: "Atos correlacionados em ordem cronológica. Veja o histórico de uma comissão processante do início ao fim.",
    },
    {
      titulo: "Alertas por email",
      texto: "Receba notificação quando um padrão novo for detectado, ou no digest semanal do seu órgão.",
    },
    {
      titulo: "Exportação completa",
      texto: "Tudo em PDF, CSV ou JSON. Material pronto para a redação, petição inicial ou plenário.",
    },
    {
      titulo: "API REST",
      texto: "Plano API & Dados libera 10.000 chamadas/mês com webhooks de novos atos e alertas.",
    },
    {
      titulo: "Multi-órgão",
      texto: "Comece com CAU/PR. Em breve: prefeituras, câmaras, conselhos profissionais de todo o Brasil.",
    },
  ];

  const roadmap = [
    {
      n: "01",
      status: "Em desenvolvimento",
      titulo: "Gastos com diárias e passagens",
      texto:
        "Cruzamento automático de gastos declarados em portais de transparência com os atos que os autorizam. Quando o valor não bate ou a viagem não tem justificativa no ato, o sistema sinaliza.",
    },
    {
      n: "02",
      status: "Em desenvolvimento",
      titulo: "Cartões corporativos",
      texto:
        "Análise de extratos de cartões corporativos de gestores públicos. A IA identifica gastos fora do escopo do cargo, padrões de uso em finais de semana e compras em estabelecimentos incompatíveis com a função.",
    },
    {
      n: "03",
      status: "Planejado",
      titulo: "Pedidos de informação automáticos (LAI)",
      texto:
        "Quando o pipeline detecta padrão suspeito mas faltam documentos para concluir, a plataforma rascunha automaticamente um pedido de acesso à informação endereçado ao órgão — com fundamentos legais preenchidos. Pronto para enviar com um clique.",
    },
    {
      n: "04",
      status: "Planejado",
      titulo: "Todos os órgãos públicos do Brasil",
      texto:
        "O CAU/PR é o primeiro. A arquitetura foi projetada para escalar: cada novo órgão leva dias para integrar. Prefeituras, câmaras, conselhos profissionais, autarquias — o Brasil tem mais de 5.000 municípios. Planejamos cobrir todos.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080f] text-white overflow-x-hidden" style={INTER}>
      <Nav />
      <StatusBar />

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div className="flex gap-12 xl:gap-16 pt-14 md:pt-20">

          {/* ─── Main ─── */}
          <main className="flex-1 min-w-0">

            {/* ── Hero ── */}
            <header className="pb-14 md:pb-18">
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/22 mb-7" style={MONO}>
                SOLUÇÕES — DIG DIG
              </p>
              <h1
                className="text-[2.4rem] md:text-[3.6rem] font-bold text-white leading-[1.03] tracking-[-0.03em] mb-9"
                style={INTER}
              >
                Uma escavadeira digital
                <br />para os arquivos
                <br /><span className="text-white/28">do poder público.</span>
              </h1>
              <div className="space-y-4 text-[15px] md:text-[16px] text-white/70 leading-[1.80] max-w-xl" style={INTER}>
                <p>
                  O Dig Dig coleta, lê e analisa automaticamente todos os atos administrativos
                  de órgãos públicos brasileiros — portarias, deliberações, resoluções. A IA
                  classifica o nível de risco, cruza com o regimento interno e gera fichas
                  de denúncia para os casos críticos.
                </p>
                <p>
                  Aqui está tudo que a plataforma faz hoje, para quem é, e onde ela vai nos
                  próximos meses.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-12 pt-10 border-t border-white/[0.06]">
                {[
                  { valor: "1.789", label: "atos coletados" },
                  { valor: "262", label: "analisados" },
                  { valor: "136", label: "ad referendum" },
                  { valor: "R$ 0", label: "para começar" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[1.5rem] font-bold text-white leading-none mb-1" style={MONO}>
                      {s.valor}
                    </p>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.12em]" style={INTER}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </header>

            {/* ── O que nos diferencia ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                O que nos diferencia
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Não é uma busca. É uma análise.
              </h2>
              <ol className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
                {[
                  {
                    n: "01",
                    titulo: "Cruzamento regimental",
                    texto:
                      "Qualquer sistema encontra documentos. O Dig Dig cruza cada ato com o regimento interno do órgão e aponta a violação exata — artigo, inciso, parágrafo.",
                  },
                  {
                    n: "02",
                    titulo: "Documentos acionáveis",
                    texto:
                      "Os alertas não ficam no dashboard. Viram fichas formatadas — prontas para jornalistas, advogadas e plenário — com sugestão de questionamento já redigida.",
                  },
                  {
                    n: "03",
                    titulo: "Pipeline contínuo",
                    texto:
                      "Roda sem intervenção humana. Cada novo ato publicado pelo órgão entra na fila automaticamente. Você não precisa lembrar de checar.",
                  },
                  {
                    n: "04",
                    titulo: "Memória permanente",
                    texto:
                      "Tudo que coletamos fica armazenado no banco. Mesmo que o órgão tire o site do ar ou mude de gestão, o histórico continua disponível.",
                  },
                ].map((e) => (
                  <li key={e.n} className="bg-[#07080f] p-6 flex flex-col gap-3">
                    <span className="text-[1.3rem] font-bold leading-none" style={{ ...MONO, color: GOLD }}>
                      {e.n}
                    </span>
                    <h3 className="text-[0.88rem] font-semibold text-white/78" style={INTER}>
                      {e.titulo}
                    </h3>
                    <p className="text-[12px] text-white/55 leading-relaxed" style={INTER}>
                      {e.texto}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Como funciona ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Como funciona
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Quatro etapas. Zero leitura humana.
              </h2>
              <ol className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
                {[
                  {
                    n: "01",
                    titulo: "Coleta",
                    texto: "Scraper baixa 100% dos atos do site oficial. PDFs ficam armazenados — nada se perde quando a gestão muda o site.",
                    detalhe: "1.789 atos coletados no CAU/PR",
                  },
                  {
                    n: "02",
                    titulo: "Extração de texto",
                    texto: "pdfplumber extrai o texto nativo dos PDFs. Para documentos escaneados, OCR via Tesseract garante cobertura total.",
                    detalhe: "400 portarias com texto extraído",
                  },
                  {
                    n: "03",
                    titulo: "Triagem — Haiku 4.5",
                    texto: "Cada ato recebe nível de alerta: verde / amarelo / laranja / vermelho. Baixo custo, escala milhar de atos por hora.",
                    detalhe: "136 ad referendum sinalizados (7,6% do total)",
                  },
                  {
                    n: "04",
                    titulo: "Análise — Sonnet 4.6",
                    texto: "Atos críticos viram fichas com violação de regimento, citação direta e sugestão de questionamento público.",
                    detalhe: "32 prorrogações de comissão processante aprofundadas",
                  },
                ].map((e) => (
                  <li key={e.n} className="bg-[#07080f] p-6 flex flex-col gap-3">
                    <span className="text-[1.3rem] font-bold leading-none" style={{ ...MONO, color: GOLD }}>
                      {e.n}
                    </span>
                    <h3 className="text-[0.88rem] font-semibold text-white/78" style={INTER}>
                      {e.titulo}
                    </h3>
                    <p className="text-[12px] text-white/55 leading-relaxed flex-1" style={INTER}>
                      {e.texto}
                    </p>
                    <p
                      className="text-[11px] pt-3 border-t border-white/[0.05]"
                      style={{ ...MONO, color: "rgba(255,255,255,0.30)" }}
                    >
                      {e.detalhe}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Níveis de alerta ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Classificação de alertas
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Quatro níveis. Foco no que importa.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {niveis.map((n) => (
                  <div key={n.label} className="border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-[6px] w-[6px] rounded-full flex-shrink-0" style={{ background: n.cor }} />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{ ...INTER, color: n.cor }}
                      >
                        {n.label}
                      </span>
                      <span className="ml-auto text-[10px] text-white/22" style={MONO}>{n.pct}</span>
                    </div>
                    <p className="text-[12px] text-white/62 leading-relaxed mb-3" style={INTER}>{n.desc}</p>
                    <p
                      className="text-[11px] pt-3 border-t border-white/[0.05]"
                      style={{ ...MONO, color: "rgba(255,255,255,0.28)" }}
                    >
                      {n.exemplo}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Ficha de denúncia ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Ficha de denúncia
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Cada ato crítico vira documento acionável.
              </h2>

              <div className="border border-white/[0.06] p-7 md:p-9">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-5 border-b border-white/[0.05]">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 mb-3"
                      style={{ color: "#f97316", background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.22)" }}
                    >
                      ● Laranja
                    </span>
                    <h3 className="text-[1.1rem] font-bold text-white/82" style={INTER}>Portaria nº 678 / 2026</h3>
                    <p className="text-[12px] text-white/35 mt-1" style={INTER}>02/04/2026 · CAU/PR · Comissão Processante</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.14em] text-white/22 block mb-1" style={INTER}>Confiança IA</span>
                    <span className="text-[1.4rem] font-bold text-white/65" style={MONO}>87%</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-3" style={MONO}>Ementa</p>
                    <p className="text-[13px] text-white/65 leading-relaxed mb-5" style={INTER}>
                      Prorroga o prazo da Comissão Processante nomeada pela Portaria nº 580 de 07/04/2025
                      e reconduzida pela Portaria 667 de 02/02/2026.
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-3" style={MONO}>Alertas detectados</p>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-[12px] text-white/65 leading-relaxed" style={INTER}>
                        <ChevronRight className="!size-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f97316" }} />
                        <span><strong className="text-white/82">Processo disciplinar:</strong> instauração ou prorrogação de comissão processante</span>
                      </li>
                      <li className="flex items-start gap-2 text-[12px] text-white/65 leading-relaxed" style={INTER}>
                        <ChevronRight className="!size-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f97316" }} />
                        <span><strong className="text-white/82">Prazo excessivo:</strong> comissão com múltiplas prorrogações (3ª desde abril/2025)</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] mb-3" style={{ ...MONO, color: GOLD }}>
                      Violação regimental
                    </p>
                    <div className="pl-4 mb-6" style={{ borderLeft: `2px solid ${GOLD}` }}>
                      <p className="text-[12px] text-white/65 leading-relaxed italic" style={MONO}>
                        "As comissões processantes terão prazo de 60 dias, prorrogáveis uma única vez por igual período."
                      </p>
                      <p className="text-[11px] text-white/28 mt-2" style={INTER}>
                        Regimento Interno CAU/PR — Art. 47, §2º (DPOPR 0191-02/2025)
                      </p>
                    </div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-3" style={MONO}>Sugestão de questionamento</p>
                    <p className="text-[12px] text-white/58 leading-relaxed" style={INTER}>
                      Solicitar ao plenário justificativa formal para a 3ª prorrogação consecutiva,
                      com cronograma de conclusão e identificação dos investigados.
                    </p>
                  </div>
                </div>

                <div className="mt-7 pt-5 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
                  <a
                    href="https://www.caupr.gov.br/wp-content/uploads/2026/04/CAUPR-PRES-Portaria2026.0678-PAD_2025.01_PRT2025.0580-20260402-v01-FPBM_WGL.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition"
                    style={MONO}
                  >
                    <ArrowUpRight className="!size-3.5" /> PDF original no caupr.gov.br
                  </a>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/22" style={INTER}>
                    Exportar PDF · CSV · JSON
                  </span>
                </div>
              </div>
            </section>

            {/* ── Padrões detectados ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Padrões detectados
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                A IA conecta o que está fragmentado.
              </h2>
              <div className="flex flex-wrap gap-x-8 gap-y-5 pt-6 border-t border-white/[0.05] mb-8">
                {[
                  { v: "1.789", l: "atos analisados" },
                  { v: "136", l: "ad referendum" },
                  { v: "32", l: "prorrogações suspeitas" },
                  { v: "154", l: "nomeações comissionadas" },
                  { v: "7,6%", l: "ratio ad referendum" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-[1.3rem] font-bold text-white leading-none mb-1" style={MONO}>{s.v}</p>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.12em]" style={INTER}>{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="border border-white/[0.06] p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="!size-4 flex-shrink-0 mt-0.5" style={{ color: "#fb7185" }} />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/28 mb-2" style={MONO}>
                      Alerta de padrão — CAU/PR (2020–2026)
                    </p>
                    <p className="text-[13px] text-white/68 leading-relaxed" style={INTER}>
                      <strong className="text-white/88">136 atos Ad Referendum</strong> em 5 anos —
                      indício de concentração de poder na presidência sem deliberação plenária.{" "}
                      <strong className="text-white/88">32 prorrogações de comissões processantes</strong> —
                      possível uso do instrumento disciplinar com finalidade política.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Chat ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Chat conversacional
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Pergunte como se fosse um pesquisador.
              </h2>
              <div className="border border-white/[0.06] p-6 md:p-7">
                <div className="flex gap-3 mb-5">
                  <div
                    className="h-7 w-7 border border-white/[0.10] flex items-center justify-center flex-shrink-0 text-[10px] text-white/30"
                    style={MONO}
                  >
                    U
                  </div>
                  <div className="flex-1 bg-white/[0.025] border border-white/[0.05] p-4">
                    <p className="text-[13px] text-white/72" style={INTER}>
                      Quantas vezes a presidência usou ad referendum em 2025 sem ratificação plenária?
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="h-7 w-7 border flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{ borderColor: `${GOLD}44`, color: GOLD, ...MONO }}
                  >
                    DD
                  </div>
                  <div className="flex-1 p-4 border" style={{ borderColor: `${GOLD}20`, background: `${GOLD}06` }}>
                    <p className="text-[13px] text-white/80 leading-relaxed mb-3" style={INTER}>
                      Em 2025, a presidência do CAU/PR emitiu <strong className="text-white">28 atos ad referendum</strong>.
                      Destes, <strong className="text-white">11 não foram ratificados</strong> em plenária dentro do
                      prazo regimental de 30 dias (Art. 41 do Regimento Interno).
                    </p>
                    <p className="text-[12px] text-white/52 leading-relaxed mb-4" style={INTER}>
                      Os atos sem ratificação concentram-se em: nomeações para cargos comissionados (6),
                      prorrogações de comissões processantes (3) e contratações emergenciais (2).
                    </p>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.05]">
                      {["Portaria 612/2025", "Portaria 634/2025", "Deliberação Plen. 89/2025", "+8 fontes"].map((f) => (
                        <span key={f} className="text-[10px] px-2 py-1 border border-white/[0.06] text-white/30" style={MONO}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-white/25" style={INTER}>
                Plano Cidadão: 5 perguntas/mês · Investigador: 200/mês · Profissional: 1.000/mês
              </p>
            </section>

            {/* ── O que mais vem junto ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                O que mais vem junto
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Mais do que uma busca: um sistema.
              </h2>
              <div className="border-t border-white/[0.05]">
                {features.map((f) => (
                  <div
                    key={f.titulo}
                    className="border-b border-white/[0.05] py-4 flex flex-col sm:flex-row gap-2 sm:gap-8"
                  >
                    <h3
                      className="text-[0.88rem] font-semibold text-white/72 flex-shrink-0"
                      style={{ ...INTER, minWidth: "200px" }}
                    >
                      {f.titulo}
                    </h3>
                    <p className="text-[13px] text-white/45 leading-relaxed" style={INTER}>{f.texto}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Divider ── */}
            <div className="border-t border-white/[0.05] mb-16 md:mb-20" />

            {/* ── Para quem é ── */}
            <section className="mb-16 md:mb-20" id="para-quem">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Para quem é
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-2" style={INTER}>
                Seis perfis. Uma ferramenta.
              </h2>
              <p className="text-[13px] text-white/48 leading-relaxed mb-6 max-w-lg" style={INTER}>
                O acesso ao banco auditado é gratuito para qualquer cidadão. Os planos existem
                para quem usa profissionalmente — volume de chat, exportações, API e alertas.
              </p>

              {/* Quick nav */}
              <div className="flex flex-wrap gap-2 mb-6">
                {SOLUCOES.map((s) => (
                  <a
                    key={s.slug}
                    href={`#${s.slug}`}
                    className="text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border border-white/[0.07] text-white/28 hover:text-white/55 hover:border-white/14 transition"
                    style={INTER}
                  >
                    {s.publico.split(" ")[0]}
                  </a>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SOLUCOES.map((s) => (
                  <div
                    key={s.slug}
                    id={s.slug}
                    className="border border-white/[0.06] p-5 flex flex-col"
                  >
                    <div style={{ height: "2px", width: "22px", background: s.cor, marginBottom: "12px" }} />
                    <p
                      className="text-[9px] uppercase tracking-[0.18em] font-medium mb-2"
                      style={{ ...INTER, color: s.cor }}
                    >
                      {s.publico}
                    </p>
                    <h3 className="text-[0.88rem] font-semibold text-white/75 leading-snug mb-2" style={INTER}>
                      {s.titulo}
                    </h3>
                    <p className="text-[12px] text-white/42 leading-relaxed mb-4" style={INTER}>
                      {s.dor}
                    </p>
                    <ul className="space-y-1.5 mb-5 flex-1">
                      {s.beneficios.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-[11px] text-white/48 leading-relaxed"
                          style={INTER}
                        >
                          <span className="flex-shrink-0 mt-[5px] h-[4px] w-[4px] rounded-full" style={{ background: s.cor }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.05] mt-auto">
                      <span className="text-[10px] text-white/25" style={INTER}>{s.planoSugerido}</span>
                      <Link
                        to="/apoiar"
                        className="text-[9px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 transition-opacity hover:opacity-75 flex-shrink-0"
                        style={{ ...INTER, background: s.cor, color: "#0a0a0a" }}
                      >
                        Ver plano →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Divider ── */}
            <div className="border-t border-white/[0.05] mb-16 md:mb-20" />

            {/* ── Roadmap / O que vem depois ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                O que vem depois
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-4" style={INTER}>
                O Brasil tem mais de 5.000 municípios.<br />
                <span className="text-white/40">E uma lei de acesso à informação.</span>
              </h2>
              <p className="text-[14px] text-white/58 leading-[1.80] mb-8 max-w-xl" style={INTER}>
                O Dig Dig é uma plataforma em construção aberta. O CAU/PR é o início —
                o que vem depois está planejado e em desenvolvimento agora.
              </p>
              <ol className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
                {roadmap.map((item) => (
                  <li key={item.n} className="bg-[#07080f] p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[1.1rem] font-bold leading-none" style={{ ...MONO, color: GOLD }}>
                        {item.n}
                      </span>
                      <span
                        className="text-[8px] uppercase tracking-[0.16em] px-2 py-1 border"
                        style={{
                          ...INTER,
                          borderColor: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.28)",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-[0.88rem] font-semibold text-white/78" style={INTER}>
                      {item.titulo}
                    </h3>
                    <p className="text-[12px] text-white/52 leading-relaxed" style={INTER}>
                      {item.texto}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-[12px] text-white/28 leading-relaxed max-w-lg" style={INTER}>
                Tudo isso está sendo construído com a mesma arquitetura do pipeline atual — código aberto,
                custos rastreados, decisões documentadas em White Papers.
              </p>
            </section>

            {/* ── White Papers — mobile only ── */}
            <section className="lg:hidden mb-14">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-4" style={MONO}>
                White Papers
              </p>
              <div className="flex flex-col gap-3 mb-4">
                {([
                  { n: "01", titulo: "Como Automatizamos a Auditoria do CAU/PR com IA", desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.", to: "/whitepaper-01-extracao-caupr" as const, publicado: true },
                  { n: "02", titulo: "Quando a IA Custa Mais do Que Deveria", desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.", to: "/whitepaper-02-custo-e-controle" as const, publicado: true },
                  { n: "03", titulo: "Os Primeiros Vermelhos", desc: "Quando o pipeline chegou nos anos anteriores e encontrou os primeiros casos críticos.", to: null, publicado: false },
                ] as const).map((p) => (
                  <div
                    key={p.n}
                    className="border border-white/[0.06] p-5"
                    style={!p.publicado ? { borderColor: "rgba(255,255,255,0.03)" } : undefined}
                  >
                    <p
                      className="text-[9px] uppercase tracking-[0.16em] mb-2.5 flex items-center gap-2"
                      style={{ ...MONO, color: "rgba(255,255,255,0.20)" }}
                    >
                      Nº {p.n}
                      {!p.publicado && <span style={{ color: "rgba(255,255,255,0.14)" }}>— em breve</span>}
                    </p>
                    <h4
                      className="text-[0.82rem] font-semibold leading-snug mb-2"
                      style={{ ...INTER, color: p.publicado ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)" }}
                    >
                      {p.titulo}
                    </h4>
                    <p
                      className="text-[11px] leading-relaxed mb-3"
                      style={{ ...INTER, color: p.publicado ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)" }}
                    >
                      {p.desc}
                    </p>
                    {p.publicado && p.to ? (
                      <Link
                        to={p.to}
                        className="text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-80"
                        style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}
                      >
                        Ler →
                      </Link>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.14em]" style={{ ...INTER, color: "rgba(255,255,255,0.16)" }}>
                        Em breve
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}>
                Registro técnico público sobre a construção do Dig Dig — metodologia, decisões e números reais.
              </p>
            </section>

            {/* ── Footer CTA ── */}
            <section className="pt-10 border-t border-white/[0.05] text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <a
                  href="/cadastro"
                  className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-7 py-3.5 transition-opacity hover:opacity-75"
                  style={{ ...INTER, background: GOLD, color: "#0a0a0a" }}
                >
                  Criar conta grátis
                </a>
                <Link
                  to="/apoiar"
                  className="inline-block text-[10px] font-medium uppercase tracking-[0.15em] px-5 py-3.5 text-white/25 hover:text-white/52 transition border border-white/[0.07]"
                  style={INTER}
                >
                  Apoiar o projeto →
                </Link>
              </div>
              <p className="text-[11px] text-white/20" style={INTER}>
                Dúvidas:{" "}
                <a href="mailto:regisalessander@gmail.com" className="hover:text-white/40 transition">
                  regisalessander@gmail.com
                </a>
              </p>
            </section>

          </main>

          {/* ─── Sidebar ─── */}
          <PapersSidebar />
        </div>
      </div>
    </div>
  );
}
