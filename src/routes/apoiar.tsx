import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar — Dig Dig" },
      { name: "description", content: "O Dig Dig é uma ferramenta do povo brasileiro. Acesso gratuito para qualquer cidadão. Apoie com doação ou assine para uso profissional." },
      { property: "og:title", content: "Apoiar — Dig Dig" },
    ],
  }),
  component: ApoiarPage,
});

// ─── Tokens ───────────────────────────────────────────────
const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace",
};

const GOLD = "#F0C81E";

// ─── Data ─────────────────────────────────────────────────
const PLANOS = [
  {
    id: "cidadao", nome: "Acesso Livre", preco: "R$ 0", periodo: "para sempre",
    publico: "Qualquer brasileiro", cta: "Começar grátis", destaque: false,
    features: ["Leitura completa de todas as auditorias", "5 perguntas no chat por mês", "3 votos/mês nas próximas auditorias"],
  },
  {
    id: "investigador", nome: "Apoio Ativo", preco: "R$ 197", periodo: "/mês",
    publico: "Jornalistas, candidatos, assessores", cta: "Apoiar", destaque: true,
    features: ["200 perguntas no chat por mês", "Exportação em PDF e HTML", "Fichas de denúncia prontas", "Alertas por email de novos atos"],
  },
  {
    id: "profissional", nome: "Apoio Institucional", preco: "R$ 597", periodo: "/mês",
    publico: "Escritórios jurídicos, assessorias", cta: "Apoiar", destaque: false,
    features: ["1.000 perguntas no chat por mês", "Exportação CSV, JSON, PDF, HTML", "Relatórios técnicos completos", "2 assentos incluídos"],
  },
  {
    id: "api", nome: "Ferramentas Avançadas", preco: "R$ 1.997", periodo: "/mês",
    publico: "Veículos de imprensa, plataformas", cta: "Falar com a gente", destaque: false,
    features: ["API de dados + webhooks", "10.000 chamadas por mês", "5 assentos com permissões", "SLA e suporte direto"],
  },
];

const CAMPANHAS = [
  { slug: "cau-pr", nome: "CAU/PR", tipo: "Conselho de Arquitetura e Urbanismo do Paraná", votos: 142, status: "em_analise" as const },
  { slug: "prefeitura-curitiba", nome: "Prefeitura de Curitiba", tipo: "Poder Executivo Municipal — PR", votos: 47, status: "na_fila" as const },
  { slug: "crm-pr", nome: "CRM/PR", tipo: "Conselho Regional de Medicina do Paraná", votos: 23, status: "na_fila" as const },
  { slug: "camara-curitiba", nome: "Câmara de Curitiba", tipo: "Poder Legislativo Municipal — PR", votos: 18, status: "na_fila" as const },
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
        <Link to="/solucoes" className="hover:text-white/70 transition">Soluções</Link>
        <Link to="/apoiar" className="text-white/65 font-medium">Apoiar</Link>
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
          <span style={{ color: "rgba(255,255,255,0.70)" }}>228</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> / 543 documentos analisados</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span>
          <span style={{ color: GOLD }}>61</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> alertas críticos detectados</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span>
          <span style={{ color: "#f97316" }}>56</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> laranja</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
        <span>
          <span style={{ color: "#dc2626" }}>5</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}> vermelho</span>
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
      desc: "Quando o pipeline chegou nas deliberações e encontrou os primeiros casos críticos.",
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
        <p className="mt-5 text-[11px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}>
          Registro técnico público sobre a construção do Dig Dig.
        </p>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────
function ApoiarPage() {
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
                APOIAR — DIG DIG
              </p>
              <h1
                className="text-[2.4rem] md:text-[3.6rem] font-bold text-white leading-[1.03] tracking-[-0.03em] mb-9"
                style={INTER}
              >
                Uma ferramenta do povo
                <br />brasileiro. Gratuita.
                <br /><span className="text-white/28">Financiada por quem acredita.</span>
              </h1>
              <div className="space-y-4 text-[15px] md:text-[16px] text-white/70 leading-[1.80] max-w-xl" style={INTER}>
                <p>
                  O Dig Dig lê automaticamente os atos administrativos de órgãos públicos brasileiros
                  e detecta irregularidades legais e morais com IA. O resultado é público — sem paywall,
                  sem cadastro obrigatório.
                </p>
                <p>
                  Não temos investidor. Quem financia a operação são pessoas e organizações que acreditam
                  que transparência pública não é privilégio.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-12 pt-10 border-t border-white/[0.06]">
                {[
                  { valor: "1.789", label: "documentos coletados" },
                  { valor: "686", label: "analisados" },
                  { valor: "61", label: "casos críticos" },
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

            {/* ── O que é isso ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                O que é isso
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Uma escavadeira coletiva.
              </h2>
              <div className="space-y-4 text-[14px] text-white/62 leading-[1.82] max-w-2xl" style={INTER}>
                <p>
                  São portarias, deliberações e resoluções — dados públicos, pagos com dinheiro seu.
                  Estão enterrados em PDFs numerados, sem contexto, sem índice.{" "}
                  <strong className="text-white/80">A burocracia conta com isso.</strong>
                </p>
                <p>
                  Usamos IA para escavar esse arquivo. Mapeamos irregularidades legais e morais.
                  Sinalizamos padrões. Não afirmamos crimes — mostramos o que encontramos,
                  e você decide o que fazer com isso.
                </p>
              </div>
              <blockquote
                className="mt-8 pl-5 text-[14px] text-white/72 leading-relaxed italic max-w-lg"
                style={{ ...INTER, borderLeft: `2px solid ${GOLD}` }}
              >
                "É como se todo o Brasil se juntasse para auditar o próprio governo."
              </blockquote>
            </section>

            {/* ── Próximas auditorias ── */}
            <section className="mb-16 md:mb-20" id="auditorias">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Próximas auditorias
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-4" style={INTER}>
                A comunidade vota. A equipe decide.
              </h2>
              <p className="text-[13px] text-white/48 leading-relaxed mb-6 max-w-lg" style={INTER}>
                Os órgãos mais votados ficam no topo da fila. A equipe seleciona conforme capacidade
                técnica real — cada instituição é diferente, e não prometemos o que não conseguimos entregar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {CAMPANHAS.map((c) => {
                  const st = {
                    concluida: { label: "Auditoria publicada", color: "#4ade80" },
                    em_analise: { label: "Em análise", color: GOLD },
                    na_fila: { label: "Na fila", color: "rgba(255,255,255,0.22)" },
                  }[c.status];
                  return (
                    <div key={c.slug} className="border border-white/[0.06] p-5 flex flex-col gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.14em] mb-1.5" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                          {c.tipo}
                        </p>
                        <h3 className="text-[0.88rem] font-semibold text-white/78" style={INTER}>
                          {c.nome}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-2 text-[11px]" style={{ ...INTER, color: st.color }}>
                          <span className="h-[5px] w-[5px] rounded-full flex-shrink-0" style={{ background: st.color }} />
                          {st.label}
                        </span>
                        <span className="text-[11px]" style={{ ...MONO, color: "rgba(255,255,255,0.22)" }}>
                          {c.votos} votos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                className="text-[10px] uppercase tracking-[0.14em] px-4 py-2.5 border border-white/[0.07] text-white/28 hover:text-white/55 hover:border-white/14 transition"
                style={INTER}
              >
                + Nominar órgão
              </button>
            </section>

            {/* ── Como funciona ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Como funciona
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Quatro etapas. Resultado público.
              </h2>
              <ol className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
                {[
                  { n: "01", titulo: "Votar", texto: "A comunidade nomina órgãos e distribui votos. Cada usuário tem 3 votos gratuitos por mês." },
                  { n: "02", titulo: "Decidir", texto: "A equipe seleciona os próximos conforme capacidade real. Sem prometer o que não pode entregar ainda." },
                  { n: "03", titulo: "Escavar", texto: "A IA analisa todos os documentos disponíveis. Trabalho humano revisa e aprofunda os casos críticos." },
                  { n: "04", titulo: "Publicar", texto: "O resultado fica público para qualquer pessoa. Gratuito. Sem exceção. Sem paywall." },
                ].map((p) => (
                  <li key={p.n} className="bg-[#07080f] p-6 flex flex-col gap-3">
                    <span className="text-[1.3rem] font-bold leading-none" style={{ ...MONO, color: GOLD }}>
                      {p.n}
                    </span>
                    <h3 className="text-[0.88rem] font-semibold text-white/78" style={INTER}>
                      {p.titulo}
                    </h3>
                    <p className="text-[12px] text-white/55 leading-relaxed" style={INTER}>
                      {p.texto}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Contribuir ── */}
            <section className="mb-16 md:mb-20" id="contribuir">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Contribuir
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-4" style={INTER}>
                Cada contribuição financia a escavação.
              </h2>
              <div className="space-y-4 text-[14px] text-white/58 leading-[1.82] max-w-2xl mb-8" style={INTER}>
                <p>
                  Não temos investidor. As contribuições cobrem os custos operacionais — IA, infraestrutura
                  e trabalho humano de investigação. Todo excedente é reinvestido em tecnologia para ampliar
                  a capacidade da ferramenta.
                </p>
                <p className="font-semibold text-white/75">
                  O Dig Dig pertence às pessoas que o financiam.
                </p>
              </div>

              <div className="border border-white/[0.06] p-6 md:p-8 max-w-lg">
                <div className="flex flex-wrap gap-2 mb-4">
                  {["R$ 25", "R$ 50", "R$ 100", "Valor livre"].map((v, i) => (
                    <button
                      key={v}
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] px-4 py-2.5 border transition-all"
                      style={{
                        ...MONO,
                        borderColor: i === 1 ? GOLD : "rgba(255,255,255,0.10)",
                        color: i === 1 ? GOLD : "rgba(255,255,255,0.40)",
                        background: i === 1 ? `${GOLD}10` : "transparent",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-6">
                  {["Uma vez", "Todo mês"].map((f, i) => (
                    <button
                      key={f}
                      className="text-[11px] font-medium uppercase tracking-[0.14em] px-4 py-2 border transition-all"
                      style={{
                        ...MONO,
                        borderColor: i === 1 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)",
                        color: i === 1 ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.28)",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <a
                  href="/contribuir"
                  className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-7 py-3.5 transition-opacity hover:opacity-75"
                  style={{ ...INTER, background: GOLD, color: "#0a0a0a" }}
                >
                  Contribuir via PIX ou cartão
                </a>
                <p className="mt-3 text-[11px] text-white/25" style={INTER}>
                  Mínimo R$ 25 · Primeira contribuição ganha 1 mês de Apoio Ativo
                </p>
              </div>
            </section>

            {/* ── Apoio institucional ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Apoio institucional
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-4" style={INTER}>
                Empresas e organizações.
              </h2>
              <p className="text-[14px] text-white/52 leading-relaxed mb-5 max-w-xl" style={INTER}>
                Empresas e organizações que acreditam na transparência pública podem se tornar
                Apoiadores Oficiais do Dig Dig. O modelo é negociado diretamente — sem tabela de preços,
                sem pacote fechado.
              </p>
              <a
                href="mailto:apoie@digdig.com.br"
                className="text-[13px] font-semibold transition-colors hover:text-white/70"
                style={{ ...INTER, color: "rgba(255,255,255,0.48)" }}
              >
                apoie@digdig.com.br →
              </a>
            </section>

            {/* ── Níveis de apoio ── */}
            <section className="mb-16 md:mb-20" id="planos">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Ferramentas avançadas para profissionais
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-4" style={INTER}>
                Níveis de apoio.
              </h2>
              <p className="text-[13px] text-white/48 leading-relaxed mb-8 max-w-lg" style={INTER}>
                O acesso ao banco auditado é gratuito para qualquer cidadão. Os níveis são para quem usa
                a plataforma profissionalmente — jornalistas, escritórios, veículos, assessorias.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANOS.map((plano) => (
                  <div
                    key={plano.id}
                    className="border p-5 flex flex-col"
                    style={{ borderColor: plano.destaque ? `${GOLD}44` : "rgba(255,255,255,0.06)" }}
                  >
                    {plano.destaque && (
                      <span
                        className="inline-block text-[8px] font-semibold uppercase tracking-[0.22em] px-2 py-1 mb-3 self-start"
                        style={{ color: GOLD, background: `${GOLD}15` }}
                      >
                        mais popular
                      </span>
                    )}
                    <p className="text-[9px] uppercase tracking-[0.18em] mb-2" style={{ ...INTER, color: "rgba(255,255,255,0.22)" }}>
                      {plano.publico}
                    </p>
                    <h3 className="text-[0.88rem] font-semibold text-white/75 mb-1" style={INTER}>
                      {plano.nome}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-[1.4rem] font-bold leading-none" style={{ ...MONO, color: plano.destaque ? GOLD : "rgba(255,255,255,0.85)" }}>
                        {plano.preco}
                      </span>
                      <span className="text-[11px] text-white/28" style={MONO}>{plano.periodo}</span>
                    </div>
                    <ul className="space-y-1.5 mb-5 flex-1">
                      {plano.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[11px] text-white/48 leading-relaxed" style={INTER}>
                          <span className="flex-shrink-0 mt-[5px] h-[4px] w-[4px] rounded-full" style={{ background: plano.destaque ? GOLD : "rgba(255,255,255,0.22)" }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-3.5 border-t border-white/[0.05] mt-auto">
                      <a
                        href="/cadastro"
                        className="inline-block text-[10px] font-semibold uppercase tracking-[0.14em] px-4 py-2.5 transition-opacity hover:opacity-75"
                        style={plano.destaque
                          ? { ...INTER, background: GOLD, color: "#0a0a0a" }
                          : { ...INTER, border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.30)" }}
                      >
                        {plano.cta}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px] text-white/22" style={MONO}>
                Cartão ou PIX · Sem fidelidade · Notas fiscais emitidas automaticamente.
              </p>
            </section>

            {/* ── Para onde vai o dinheiro ── */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-2" style={MONO}>
                Para onde vai o dinheiro
              </p>
              <h2 className="text-[1.15rem] font-bold text-white/85 mb-6" style={INTER}>
                Radical transparência.
              </h2>
              <div className="flex flex-wrap gap-x-8 gap-y-4 pt-6 border-t border-white/[0.05] mb-8">
                {[
                  { v: "$4,45", l: "gasto na rodada atual" },
                  { v: "228", l: "documentos analisados" },
                  { v: "~$0,02", l: "custo por documento" },
                  { v: "R$ 0", l: "para acessar os dados" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-[1.3rem] font-bold text-white leading-none mb-1" style={MONO}>{s.v}</p>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.12em]" style={INTER}>{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.05]">
                {[
                  { item: "Infraestrutura de IA", pct: 55, desc: "API Anthropic — o custo de analisar cada documento público" },
                  { item: "Servidores & Hospedagem", pct: 25, desc: "Railway, Supabase, Redis — o que mantém o sistema vivo" },
                  { item: "Desenvolvimento", pct: 20, desc: "Manutenção, novas instituições, melhorias contínuas" },
                ].map(({ item, pct, desc }) => (
                  <div key={item} className="border-b border-white/[0.05] py-5 flex flex-col sm:flex-row gap-2 sm:gap-8 sm:items-center">
                    <div className="flex-1">
                      <p className="text-[0.88rem] font-semibold text-white/72 mb-1" style={INTER}>{item}</p>
                      <p className="text-[12px] text-white/40" style={INTER}>{desc}</p>
                    </div>
                    <div className="flex-shrink-0 sm:w-40">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="h-[2px] flex-1 mr-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}66)` }} />
                        </div>
                        <span className="text-[12px] font-bold flex-shrink-0" style={{ ...MONO, color: GOLD }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── White Papers mobile ── */}
            <section className="lg:hidden mb-14">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-4" style={MONO}>
                White Papers
              </p>
              <div className="flex flex-col gap-3 mb-4">
                {([
                  { n: "01", titulo: "Como Automatizamos a Auditoria do CAU/PR com IA", desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.", to: "/whitepaper-01-extracao-caupr" as const, publicado: true },
                  { n: "02", titulo: "Quando a IA Custa Mais do Que Deveria", desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.", to: "/whitepaper-02-custo-e-controle" as const, publicado: true },
                  { n: "03", titulo: "Os Primeiros Vermelhos", desc: "Quando o pipeline chegou nas deliberações e encontrou os primeiros casos críticos.", to: null, publicado: false },
                ] as const).map((p) => (
                  <div key={p.n} className="border border-white/[0.06] p-5" style={!p.publicado ? { borderColor: "rgba(255,255,255,0.03)" } : undefined}>
                    <p className="text-[9px] uppercase tracking-[0.16em] mb-2.5 flex items-center gap-2" style={{ ...MONO, color: "rgba(255,255,255,0.20)" }}>
                      Nº {p.n}
                      {!p.publicado && <span style={{ color: "rgba(255,255,255,0.14)" }}>— em breve</span>}
                    </p>
                    <h4 className="text-[0.82rem] font-semibold leading-snug mb-2" style={{ ...INTER, color: p.publicado ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)" }}>
                      {p.titulo}
                    </h4>
                    <p className="text-[11px] leading-relaxed mb-3" style={{ ...INTER, color: p.publicado ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)" }}>
                      {p.desc}
                    </p>
                    {p.publicado && p.to ? (
                      <Link to={p.to} className="text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-80" style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}>
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
                  to="/solucoes"
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
