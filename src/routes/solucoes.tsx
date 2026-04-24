import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções — Dig Dig" },
      {
        name: "description",
        content:
          "Auditoria automatizada de atos administrativos com IA. Para jornalistas, advogados, conselheiros, parlamentares e cidadãos que querem fiscalizar o poder público.",
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

type Solucao = {
  slug: string;
  publico: string;
  titulo: string;
  dor: string;
  comoResolve: string;
  beneficios: string[];
  planoSugerido: string;
  cor: string;
};

const SOLUCOES: Solucao[] = [
  {
    slug: "jornalistas",
    publico: "Jornalismo investigativo",
    titulo: "Da pauta à matéria publicada em horas, não meses.",
    dor: "Você tem o faro, mas o Diário Oficial tem 20 anos de PDFs. Lê tudo manualmente ou desiste da pauta.",
    comoResolve:
      "A IA escaneia milhares de atos, identifica padrões — nomeações repetidas, contratos suspeitos, concentração de poder — e entrega fichas com citação direta do regimento violado.",
    beneficios: [
      "Fichas de denúncia com fonte e número do ato",
      "Busca conversacional: \"quem mais nomeou parente em 2025?\"",
      "Exportação em CSV/PDF para a redação",
      "Alertas por email quando aparece padrão novo",
    ],
    planoSugerido: "Investigador — R$ 197/mês",
    cor: GOLD,
  },
  {
    slug: "advogados",
    publico: "Direito e compliance",
    titulo: "Provas documentais organizadas para a petição inicial.",
    dor: "Reunir evidências de irregularidade administrativa exige semanas de leitura de atos esparsos em sites mal indexados.",
    comoResolve:
      "Cada ato é cruzado com o regimento interno, lei orgânica e jurisprudência. A ficha aponta o dispositivo violado e gera o material em formato apto para juntada processual.",
    beneficios: [
      "Citações com referência exata (artigo, inciso, parágrafo)",
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
    titulo: "Munição para o plenário, sem precisar virar pesquisador.",
    dor: "Você foi eleito para fiscalizar, mas a gestão produz mais documentos do que dá para ler. Você reage tarde — quando reage.",
    comoResolve:
      "Receba um digest semanal dos atos do seu órgão com nível de alerta classificado. Os críticos vêm com ficha pronta, citação ao regimento e sugestão de questionamento.",
    beneficios: [
      "Digest semanal por email — só o que importa",
      "Histórico completo de votações e ad referendum",
      "Detecção automática de quebra de quórum",
      "Chat para preparar pronunciamentos em minutos",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#00823c",
  },
  {
    slug: "vereadores",
    publico: "Parlamentares e assessorias",
    titulo: "Fiscalize o executivo municipal sem montar uma equipe de pesquisa.",
    dor: "Câmaras municipais têm orçamento limitado para análise de atos do executivo. A oposição perde por desinformação, não por argumento.",
    comoResolve:
      "Um único parlamentar com Dig Dig acompanha portarias, decretos, licitações e nomeações da prefeitura inteira — com alertas sobre desvios de procedimento.",
    beneficios: [
      "Cobertura completa do executivo municipal",
      "Comparativo entre gestões (esta vs anterior)",
      "Material de TV e redes sociais com fontes",
      "Acesso para até 5 assessores no plano Profissional",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#a78bfa",
  },
  {
    slug: "cidadaos",
    publico: "Cidadãos e coletivos",
    titulo: "Transparência não é privilégio de quem tem assessoria.",
    dor: "Você quer entender o que o conselho profissional, a câmara ou a prefeitura está fazendo — mas o site oficial é hostil e os atos são técnicos.",
    comoResolve:
      "Plano Cidadão grátis: leia auditorias publicadas, vote nos próximos órgãos e proponha novos. 5 perguntas por mês para o chat tirar dúvidas em linguagem simples.",
    beneficios: [
      "Acesso vitalício e gratuito ao plano Cidadão",
      "3 votos/mês em próximas auditorias",
      "Pode nominar qualquer órgão público",
      "Resultados ficam públicos — sem paywall",
    ],
    planoSugerido: "Cidadão — Grátis",
    cor: "#e8a87c",
  },
  {
    slug: "api",
    publico: "Empresas e redações",
    titulo: "Dados estruturados de atos administrativos via API REST.",
    dor: "Sua redação, plataforma de compliance ou ferramenta interna precisa de dados de atos públicos — mas raspar manualmente não escala.",
    comoResolve:
      "API REST com 10.000 chamadas/mês. Acesse atos, análises, fichas, grafos e padrões em JSON estruturado. Webhooks para novos eventos.",
    beneficios: [
      "10.000 chamadas/mês via API REST",
      "Webhooks de novos atos e alertas",
      "5 assentos incluídos para a equipe",
      "Suporte técnico dedicado",
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
        <Link to="/produto" className="hover:text-white/70 transition">Produto</Link>
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
          Registro técnico público sobre a construção do Dig Dig — metodologia, decisões e números reais.
        </p>
      </div>
    </aside>
  );
}

// ─── Solution block ───────────────────────────────────────
function SolucaoBloco({ sol }: { sol: Solucao }) {
  return (
    <div id={sol.slug} className="border-t border-white/[0.05] py-10 md:py-12">
      <div style={{ height: "2px", width: "28px", background: sol.cor, marginBottom: "14px" }} />
      <p
        className="text-[9px] uppercase tracking-[0.22em] font-medium mb-3"
        style={{ ...INTER, color: sol.cor }}
      >
        {sol.publico}
      </p>
      <h3
        className="text-[1.2rem] md:text-[1.45rem] font-bold leading-[1.18] mb-6"
        style={{ ...INTER, color: "rgba(255,255,255,0.82)" }}
      >
        {sol.titulo}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-2" style={MONO}>
            A dor
          </p>
          <p className="text-[13px] text-white/52 leading-relaxed mb-6" style={INTER}>
            {sol.dor}
          </p>
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-2" style={MONO}>
            Como o Dig Dig resolve
          </p>
          <p className="text-[13px] text-white/68 leading-relaxed" style={INTER}>
            {sol.comoResolve}
          </p>
        </div>

        <div className="border border-white/[0.06] p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/22 mb-4" style={MONO}>
            O que você ganha
          </p>
          <ul className="space-y-2.5 mb-6">
            {sol.beneficios.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 text-[12px] text-white/60 leading-relaxed"
                style={INTER}
              >
                <span
                  className="flex-shrink-0 mt-[6px] h-[5px] w-[5px] rounded-full"
                  style={{ background: sol.cor }}
                />
                {b}
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-1" style={MONO}>
                Plano sugerido
              </p>
              <p className="text-[0.88rem] font-semibold text-white/60" style={INTER}>
                {sol.planoSugerido}
              </p>
            </div>
            <Link
              to="/apoiar"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] px-4 py-2.5 transition-opacity hover:opacity-75 flex-shrink-0"
              style={{ ...INTER, background: sol.cor, color: "#0a0a0a" }}
            >
              Ver plano →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────
function SolucoesPage() {
  return (
    <div className="min-h-screen bg-[#07080f] text-white overflow-x-hidden" style={INTER}>
      <Nav />
      <StatusBar />

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div className="flex gap-12 xl:gap-16 pt-14 md:pt-20">

          {/* ─── Main ─── */}
          <main className="flex-1 min-w-0">

            {/* Hero */}
            <header className="pb-12 md:pb-16">
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/22 mb-7" style={MONO}>
                SOLUÇÕES — PARA QUEM
              </p>
              <h1
                className="text-[2.4rem] md:text-[3.6rem] font-bold text-white leading-[1.03] tracking-[-0.03em] mb-9"
                style={INTER}
              >
                Uma ferramenta.
                <br />Seis formas
                <br /><span className="text-white/28">de escavar.</span>
              </h1>
              <p className="text-[15px] md:text-[16px] text-white/70 leading-[1.80] max-w-xl" style={INTER}>
                Do jornalista ao cidadão, do advogado ao parlamentar — o Dig Dig se adapta
                ao seu fluxo. Cada perfil tem sua dor específica. Mostramos como resolvemos cada uma.
              </p>

              {/* Quick nav */}
              <div className="flex flex-wrap gap-2 mt-10">
                {SOLUCOES.map((s) => (
                  <a
                    key={s.slug}
                    href={`#${s.slug}`}
                    className="text-[10px] uppercase tracking-[0.16em] px-3 py-2 border border-white/[0.07] text-white/30 hover:text-white/58 hover:border-white/14 transition"
                    style={INTER}
                  >
                    {s.publico.split(" ")[0]}
                  </a>
                ))}
              </div>
            </header>

            {/* Solutions */}
            {SOLUCOES.map((s) => (
              <SolucaoBloco key={s.slug} sol={s} />
            ))}

            {/* Footer */}
            <section className="pt-12 border-t border-white/[0.05] text-center mt-4">
              <h2
                className="text-[1.15rem] font-bold text-white/72 mb-3"
                style={INTER}
              >
                Não achou seu perfil?
              </h2>
              <p className="text-[13px] text-white/45 leading-relaxed mb-8 max-w-md mx-auto" style={INTER}>
                O Dig Dig serve qualquer pessoa que precise transformar PDFs públicos em
                informação acionável. Comece grátis.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <a
                  href="/cadastro"
                  className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-7 py-3.5 transition-opacity hover:opacity-75"
                  style={{ ...INTER, background: GOLD, color: "#0a0a0a" }}
                >
                  Criar conta grátis
                </a>
                <Link
                  to="/produto"
                  className="inline-block text-[10px] font-medium uppercase tracking-[0.15em] px-5 py-3.5 text-white/25 hover:text-white/52 transition border border-white/[0.07]"
                  style={INTER}
                >
                  Ver como funciona →
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
