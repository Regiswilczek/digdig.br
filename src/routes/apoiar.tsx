import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar — Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig é uma ferramenta do povo brasileiro. Acesso gratuito para qualquer cidadão. Apoie com doação ou assine para uso profissional.",
      },
      { property: "og:title", content: "Apoiar — Dig Dig" },
    ],
  }),
  component: ApoiarPage,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
const SYNE: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties = { fontFamily: "'Space Mono', 'Courier New', monospace" };
const INTER: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };
const GOLD = "#F0C81E";
const BG = "#07080f";

// ── Data ──────────────────────────────────────────────────────────────────────
type Plano = {
  id: string;
  nome: string;
  preco: string;
  periodo: string;
  publico: string;
  destaque?: boolean;
  cta: string;
  features: string[];
};

const PLANOS: Plano[] = [
  {
    id: "cidadao",
    nome: "Acesso Livre",
    preco: "R$ 0",
    periodo: "para sempre",
    publico: "Qualquer brasileiro",
    cta: "Começar grátis",
    features: ["Leitura completa de todas as auditorias", "5 perguntas no chat por mês"],
  },
  {
    id: "investigador",
    nome: "Apoio Ativo",
    preco: "R$ 197",
    periodo: "/mês",
    publico: "Jornalistas, candidatos, assessores",
    cta: "Apoiar",
    destaque: true,
    features: [
      "200 perguntas no chat por mês",
      "Exportação em PDF e HTML",
      "Fichas de denúncia prontas",
      "Alertas por email de novos atos",
    ],
  },
  {
    id: "profissional",
    nome: "Apoio Institucional",
    preco: "R$ 597",
    periodo: "/mês",
    publico: "Escritórios jurídicos, assessorias",
    cta: "Apoiar",
    features: [
      "1.000 perguntas no chat por mês",
      "Exportação CSV, JSON, PDF, HTML",
      "Relatórios técnicos completos",
      "2 assentos",
    ],
  },
  {
    id: "api",
    nome: "Ferramentas Avançadas",
    preco: "R$ 1.997",
    periodo: "/mês",
    publico: "Veículos de imprensa, plataformas",
    cta: "Falar com a gente",
    features: [
      "API de dados + webhooks",
      "10.000 calls por mês",
      "5 assentos com permissões",
      "SLA e suporte direto",
    ],
  },
];

const CAMPANHAS = [
  { slug: "cau-pr", nome: "CAU/PR", tipo: "Conselho de Arquitetura e Urbanismo do Paraná", votos: 142, status: "em_analise" as const },
  { slug: "prefeitura-curitiba", nome: "Prefeitura de Curitiba", tipo: "Poder Executivo Municipal — PR", votos: 47, status: "na_fila" as const },
  { slug: "crm-pr", nome: "CRM/PR", tipo: "Conselho Regional de Medicina do Paraná", votos: 23, status: "na_fila" as const },
  { slug: "camara-curitiba", nome: "Câmara de Curitiba", tipo: "Poder Legislativo Municipal — PR", votos: 18, status: "na_fila" as const },
];

const PAPERS = [
  { n: "01", titulo: "Como Automatizamos a Auditoria do CAU/PR com IA", desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.", to: "/whitepaper-01-extracao-caupr" as const, publicado: true },
  { n: "02", titulo: "Quando a IA Custa Mais do Que Deveria", desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.", to: "/whitepaper-02-custo-e-controle" as const, publicado: true },
  { n: "03", titulo: "Quando as Deliberações Falam Mais Alto", desc: "757 deliberações únicas, a descoberta da WP REST API e 41% de casos críticos nos primeiros achados.", to: "/whitepaper-03-deliberacoes-e-primeiros-achados" as const, publicado: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.32em] mb-0" style={{ ...MONO, color: "rgba(255,255,255,0.22)" }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div className="w-full border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b" style={{ ...INTER, borderColor: "rgba(255,255,255,0.06)" }}>
      <Link to="/" className="text-white text-[12px] uppercase tracking-[0.2em] font-bold hover:opacity-55 transition" style={SYNE}>
        DIG DIG
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/30">
        <Link to="/solucoes" className="hover:text-white/70 transition">Soluções</Link>
        <Link to="/apoiar" className="text-white/65 font-medium">Apoiar</Link>
      </div>
      <a href="/entrar" className="text-[12px] text-white/30 hover:text-white/65 transition" style={INTER}>
        Entrar
      </a>
    </nav>
  );
}

// ── Status bar ────────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div className="border-b py-3.5 px-6 md:px-12 overflow-x-auto" style={{ background: "rgba(255,255,255,0.018)", borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-5 text-[11px] whitespace-nowrap" style={MONO}>
        <span className="flex items-center gap-2">
          <span className="h-[6px] w-[6px] rounded-full flex-shrink-0 animate-pulse" style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
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

// ── Papers sidebar ────────────────────────────────────────────────────────────
function PapersSidebar() {
  return (
    <aside className="hidden lg:block flex-shrink-0" style={{ width: "260px" }}>
      <div className="sticky" style={{ top: "32px" }}>
        <SectionLabel>White Papers</SectionLabel>
        <Divider />
        <div className="flex flex-col gap-0 mt-4">
          {PAPERS.map((p) => (
            <div key={p.n} className="border-b py-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-[9px] uppercase tracking-[0.16em] mb-2" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                Nº {p.n}
              </p>
              <h4 className="text-[0.82rem] font-semibold leading-snug mb-2" style={{ ...INTER, color: "rgba(255,255,255,0.65)" }}>
                {p.titulo}
              </h4>
              <p className="text-[11px] leading-relaxed mb-3" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>
                {p.desc}
              </p>
              {p.publicado && p.to && (
                <Link to={p.to} className="text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-80" style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}>
                  Ler →
                </Link>
              )}
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}>
          Registro técnico público — metodologia, decisões e números reais.
        </p>
      </div>
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ApoiarPage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BG, ...INTER }}>
      <Nav />
      <StatusBar />

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
        <div className="flex gap-14 xl:gap-20 pt-16 md:pt-24">

          {/* ── Main ── */}
          <main className="flex-1 min-w-0">

            {/* ── MANIFESTO ─────────────────────────────────────── */}
            <header className="pb-0">
              <p className="text-[9px] uppercase tracking-[0.36em] mb-10" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                NASCE O DIG DIG — ABRIL 2026
              </p>

              <h1
                className="font-bold text-white leading-[1.01] mb-12"
                style={{ ...SYNE, fontSize: "clamp(2.6rem, 5.5vw, 4.8rem)", letterSpacing: "-0.03em" }}
              >
                Centenas de documentos
                <br />oficiais são publicados
                <br />todo ano.{" "}
                <span style={{ color: "rgba(255,255,255,0.22)" }}>Ninguém lê.</span>
                <br />
                <span style={{ color: GOLD }}>Nós lemos.</span>
              </h1>

              <div className="space-y-5 max-w-xl" style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.05rem)", color: "rgba(255,255,255,0.58)", lineHeight: 1.85 }}>
                <p>
                  São portarias, deliberações e resoluções — dados públicos, pagos com dinheiro seu.
                  Estão enterrados em PDFs numerados, sem contexto, sem índice.
                  A burocracia conta com isso.
                </p>
                <p>
                  Usamos IA para escavar esse arquivo. Mapeamos irregularidades legais e morais.
                  Sinalizamos padrões. Não afirmamos crimes — mostramos o que encontramos,
                  e você decide o que fazer com isso.
                </p>
                <p style={{ color: "rgba(255,255,255,0.80)", fontStyle: "italic" }}>
                  É como se todo o Brasil se juntasse para auditar o próprio governo.
                  Uma escavadeira coletiva.
                </p>
              </div>
            </header>

            {/* ── STATS STRIP ───────────────────────────────────── */}
            <div className="mt-16 mb-20">
              <Divider />
              <div className="grid grid-cols-2 md:grid-cols-4">
                {[
                  { valor: "1.789", label: "atos coletados", cor: "white" },
                  { valor: "262", label: "já analisados", cor: "white" },
                  { valor: "1", label: "laranja detectado", cor: GOLD },
                  { valor: "R$ 0", label: "para começar", cor: "#4ade80" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="py-8 px-0 flex flex-col justify-between"
                    style={{
                      borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      paddingLeft: i === 0 ? 0 : "clamp(1rem, 3vw, 2.5rem)",
                    }}
                  >
                    <span
                      className="font-bold leading-none tabular-nums block mb-2"
                      style={{ ...SYNE, fontSize: "clamp(2rem, 4vw, 3.2rem)", color: s.cor }}
                    >
                      {s.valor}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em]" style={{ ...MONO, color: "rgba(255,255,255,0.30)" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <Divider />
            </div>

            {/* ── PRÓXIMAS AUDITORIAS ───────────────────────────── */}
            <section className="mb-24" id="auditorias">
              <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <SectionLabel>Próximas auditorias</SectionLabel>
                  <h2 className="text-[1.9rem] font-bold text-white mt-2 leading-tight" style={{ ...SYNE, letterSpacing: "-0.02em" }}>
                    A comunidade vota.<br />A equipe decide.
                  </h2>
                </div>
                <button
                  className="text-[10px] uppercase tracking-[0.16em] px-5 py-3 border transition flex-shrink-0 hover:border-white/20 hover:text-white/60"
                  style={{ ...MONO, borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.28)" }}
                >
                  + Nominar órgão
                </button>
              </div>

              <p className="text-[14px] leading-relaxed mb-8 max-w-lg" style={{ color: "rgba(255,255,255,0.45)" }}>
                Os órgãos mais votados ficam no topo da fila. A equipe seleciona os próximos
                conforme a capacidade técnica e o tamanho do acervo — cada casa de poder
                é diferente, e não vamos assumir uma que não conseguimos escavar bem ainda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
                {CAMPANHAS.map((c) => {
                  const statusConfig = {
                    concluida: { label: "Auditoria publicada", color: "#4ade80" },
                    em_analise: { label: "Em análise", color: GOLD },
                    na_fila: { label: "Na fila", color: "rgba(255,255,255,0.22)" },
                  }[c.status];
                  return (
                    <div key={c.slug} className="p-6 flex flex-col gap-5" style={{ background: BG }}>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.14em] mb-2" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                          {c.tipo}
                        </p>
                        <h3 className="text-[1.05rem] font-bold" style={{ ...SYNE, color: "rgba(255,255,255,0.80)", letterSpacing: "-0.01em" }}>
                          {c.nome}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[11px]" style={{ ...INTER, color: statusConfig.color }}>
                          <span className="h-[5px] w-[5px] rounded-full flex-shrink-0" style={{ background: statusConfig.color }} />
                          {statusConfig.label}
                        </span>
                        <span className="text-[11px]" style={{ ...MONO, color: "rgba(255,255,255,0.25)" }}>
                          {c.votos} votos
                        </span>
                      </div>
                      {c.status === "na_fila" && (
                        <button
                          className="text-[10px] font-medium uppercase tracking-[0.14em] px-4 py-3 border text-center transition hover:border-white/20 hover:text-white/55 w-full"
                          style={{ ...MONO, borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.32)" }}
                        >
                          ★ Votar
                        </button>
                      )}
                      {c.status === "em_analise" && (
                        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ ...MONO, color: GOLD }}>
                          Em andamento →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── COMO FUNCIONA ─────────────────────────────────── */}
            <section className="mb-24">
              <SectionLabel>Como funciona</SectionLabel>
              <Divider />
              <div className="mt-0">
                {[
                  { n: "01", titulo: "Votar", texto: "A comunidade nomina órgãos e distribui votos. Cada usuário tem 3 votos gratuitos por mês." },
                  { n: "02", titulo: "Decidir", texto: "A equipe seleciona os próximos conforme capacidade real. Sem prometer o que não pode entregar ainda." },
                  { n: "03", titulo: "Escavar", texto: "A IA analisa todos os documentos disponíveis. Trabalho humano revisa e aprofunda os casos críticos." },
                  { n: "04", titulo: "Publicar", texto: "O resultado fica público para qualquer pessoa. Gratuito. Sem exceção. Sem paywall." },
                ].map((p) => (
                  <div
                    key={p.n}
                    className="flex items-start gap-6 md:gap-10 py-8 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="flex-shrink-0 leading-none select-none"
                      style={{ ...SYNE, fontSize: "clamp(2.8rem, 5vw, 4.2rem)", color: GOLD, opacity: 0.9, letterSpacing: "-0.03em" }}
                    >
                      {p.n}
                    </span>
                    <div className="pt-1 md:pt-2">
                      <h3 className="text-[1.15rem] font-bold text-white mb-2" style={{ ...SYNE, letterSpacing: "-0.01em" }}>
                        {p.titulo}
                      </h3>
                      <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {p.texto}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CONTRIBUIR ────────────────────────────────────── */}
            <section className="mb-24" id="contribuir">
              <div
                className="relative px-8 md:px-12 py-12 md:py-14 overflow-hidden"
                style={{ background: "rgba(240,200,30,0.04)", border: `1px solid ${GOLD}22` }}
              >
                {/* decorative large number */}
                <div
                  aria-hidden
                  className="absolute right-6 top-4 select-none pointer-events-none"
                  style={{ ...SYNE, fontSize: "clamp(6rem, 14vw, 11rem)", color: `${GOLD}08`, lineHeight: 1, letterSpacing: "-0.05em" }}
                >
                  R$
                </div>

                <SectionLabel>Contribuir</SectionLabel>
                <h2
                  className="font-bold text-white mt-3 mb-5 leading-tight"
                  style={{ ...SYNE, fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", letterSpacing: "-0.025em" }}
                >
                  Cada contribuição<br />financia a escavação.
                </h2>
                <p className="text-[15px] leading-relaxed mb-10 max-w-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Não temos investidor. As contribuições cobrem os custos operacionais — IA,
                  infraestrutura e trabalho humano de investigação. Todo excedente é reinvestido
                  em tecnologia para ampliar a capacidade da ferramenta.{" "}
                  <strong style={{ color: "rgba(255,255,255,0.80)" }}>O Dig Dig pertence às pessoas que o financiam.</strong>
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {["R$ 25", "R$ 50", "R$ 100", "Valor livre"].map((v, i) => (
                    <button
                      key={v}
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] px-5 py-3 border transition"
                      style={{
                        ...MONO,
                        borderColor: i === 0 ? GOLD : "rgba(255,255,255,0.12)",
                        color: i === 0 ? GOLD : "rgba(255,255,255,0.45)",
                        background: i === 0 ? `${GOLD}10` : "transparent",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-9">
                  {[{ label: "Uma vez", ativo: false }, { label: "Todo mês", ativo: true }].map(({ label, ativo }) => (
                    <button
                      key={label}
                      className="text-[11px] font-medium uppercase tracking-[0.14em] px-5 py-2.5 border transition"
                      style={{
                        ...MONO,
                        borderColor: ativo ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                        color: ativo ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <a
                  href="/contribuir"
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-4 transition-all hover:opacity-85 active:scale-[0.99]"
                  style={{ ...SYNE, background: GOLD, color: "#07080f" }}
                >
                  Contribuir via PIX ou cartão
                </a>

                <p className="text-[11px] mt-5" style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}>
                  Mínimo R$ 25 · Quem contribui pela primeira vez ganha 1 mês de Apoio Ativo
                </p>
              </div>
            </section>

            {/* ── APOIO INSTITUCIONAL ───────────────────────────── */}
            <section className="mb-24">
              <div className="py-10 border-t border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <SectionLabel>Apoio institucional</SectionLabel>
                <h2 className="text-[1.5rem] font-bold text-white mt-3 mb-4" style={{ ...SYNE, letterSpacing: "-0.015em" }}>
                  Empresas e organizações.
                </h2>
                <p className="text-[14px] leading-relaxed max-w-lg mb-6" style={{ color: "rgba(255,255,255,0.42)" }}>
                  Empresas e organizações que acreditam na transparência pública podem se tornar
                  Apoiadores Oficiais do Dig Dig. O modelo é negociado diretamente — sem tabela de preços,
                  sem pacote fechado.
                </p>
                <a
                  href="mailto:apoie@digdig.com.br"
                  className="text-[13px] font-semibold transition hover:text-white/70"
                  style={{ ...INTER, color: "rgba(255,255,255,0.50)" }}
                >
                  apoie@digdig.com.br →
                </a>
              </div>
            </section>

            {/* ── NÍVEIS DE APOIO ───────────────────────────────── */}
            <section className="mb-24" id="planos">
              <SectionLabel>Ferramentas avançadas para profissionais</SectionLabel>
              <h2 className="text-[1.9rem] font-bold text-white mt-2 mb-3" style={{ ...SYNE, letterSpacing: "-0.02em" }}>
                Níveis de Apoio
              </h2>
              <p className="text-[14px] leading-relaxed max-w-lg mb-10" style={{ color: "rgba(255,255,255,0.35)" }}>
                O acesso ao banco auditado é gratuito para qualquer cidadão brasileiro. Os níveis
                são para quem usa a plataforma profissionalmente — jornalistas, escritórios, veículos,
                assessorias. Exportação, alertas, volume de chat, API.
              </p>

              <div className="flex flex-col">
                {PLANOS.map((plano) => (
                  <div
                    key={plano.id}
                    className="relative py-8 border-b"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      paddingLeft: plano.destaque ? "20px" : "0",
                    }}
                  >
                    {plano.destaque && (
                      <div className="absolute left-0 inset-y-4" style={{ width: "2px", background: GOLD }} />
                    )}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                      <div className="flex-shrink-0" style={{ minWidth: "200px" }}>
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="text-[1.15rem] font-bold" style={{ ...SYNE, color: plano.destaque ? "white" : "rgba(255,255,255,0.72)", letterSpacing: "-0.01em" }}>
                            {plano.nome}
                          </span>
                          {plano.destaque && (
                            <span
                              className="text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-1"
                              style={{ ...MONO, color: GOLD, background: `${GOLD}18` }}
                            >
                              mais popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[1.9rem] font-bold leading-none" style={{ ...SYNE, color: plano.destaque ? GOLD : "white" }}>
                            {plano.preco}
                          </span>
                          <span className="text-[12px] ml-1" style={{ ...MONO, color: "rgba(255,255,255,0.25)" }}>
                            {plano.periodo}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px]" style={{ ...INTER, color: "rgba(255,255,255,0.22)" }}>
                          {plano.publico}
                        </p>
                      </div>

                      <ul className="flex-1 grid sm:grid-cols-2 gap-x-5 gap-y-2">
                        {plano.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[13px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.40)" }}>
                            <span className="flex-shrink-0 mt-0.5" style={{ color: plano.destaque ? `${GOLD}60` : "rgba(255,255,255,0.15)" }}>—</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="flex-shrink-0">
                        <a
                          href="/cadastro"
                          className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-3.5 transition-all hover:opacity-80"
                          style={
                            plano.destaque
                              ? { ...SYNE, background: GOLD, color: "#07080f" }
                              : { ...MONO, border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.32)" }
                          }
                        >
                          {plano.cta}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[11px]" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                Cartão ou PIX · Sem fidelidade · Notas fiscais emitidas automaticamente.
              </p>
            </section>

            {/* ── RADICAL TRANSPARÊNCIA ─────────────────────────── */}
            <section className="mb-24">
              <SectionLabel>Para onde vai o dinheiro</SectionLabel>
              <h2 className="font-bold text-white mt-2 mb-10" style={{ ...SYNE, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "-0.02em" }}>
                Radical transparência.
              </h2>

              <div className="flex flex-col gap-0">
                {[
                  { item: "Infraestrutura de IA", pct: 55, desc: "API Anthropic — o custo de analisar cada ato público" },
                  { item: "Servidores & Hospedagem", pct: 25, desc: "Railway, Supabase, Redis — o que mantém o sistema vivo" },
                  { item: "Desenvolvimento", pct: 20, desc: "Manutenção, novas instituições, melhorias contínuas" },
                ].map(({ item, pct, desc }, i) => (
                  <div
                    key={item}
                    className="py-7 border-b flex flex-col md:flex-row md:items-center gap-4 md:gap-8"
                    style={{ borderColor: i === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex-shrink-0" style={{ width: "clamp(60px, 8vw, 90px)" }}>
                      <span
                        className="font-bold leading-none block"
                        style={{ ...SYNE, fontSize: "clamp(2rem, 4vw, 3rem)", color: GOLD }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold" style={{ ...INTER, color: "rgba(255,255,255,0.72)" }}>
                          {item}
                        </span>
                      </div>
                      <div className="h-[3px] w-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}88)` }}
                        />
                      </div>
                      <p className="text-[12px]" style={{ ...INTER, color: "rgba(255,255,255,0.30)" }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[13px] leading-relaxed mt-8 max-w-lg" style={{ ...INTER, color: "rgba(255,255,255,0.30)" }}>
                O acesso básico sempre será gratuito. Contribuições de Apoio Ativo e Apoio Institucional
                financiam os servidores e permitem que o projeto continue expandindo para novas instituições.
              </p>
            </section>

            {/* ── WHITE PAPERS mobile ───────────────────────────── */}
            <section className="lg:hidden mb-20">
              <SectionLabel>White Papers</SectionLabel>
              <Divider />
              <div className="flex flex-col mt-4">
                {PAPERS.map((p) => (
                  <div key={p.n} className="border-b py-6" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] uppercase tracking-[0.16em] mb-2" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                      Nº {p.n}
                    </p>
                    <h4 className="text-[0.88rem] font-semibold leading-snug mb-2" style={{ ...INTER, color: "rgba(255,255,255,0.65)" }}>
                      {p.titulo}
                    </h4>
                    <p className="text-[12px] leading-relaxed mb-3" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>
                      {p.desc}
                    </p>
                    {p.publicado && p.to && (
                      <Link to={p.to} className="text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-80" style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}>
                        Ler →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── FOOTER CTA ────────────────────────────────────── */}
            <section className="pt-12 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] mb-8" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>
                Pronto para começar a escavar?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <a
                  href="/cadastro"
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-4 transition-all hover:opacity-85"
                  style={{ ...SYNE, background: GOLD, color: "#07080f" }}
                >
                  Criar conta grátis
                </a>
                <Link
                  to="/"
                  className="inline-block text-[10px] font-medium uppercase tracking-[0.15em] px-6 py-4 border transition hover:border-white/14 hover:text-white/45"
                  style={{ ...MONO, border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}
                >
                  ← Início
                </Link>
              </div>
              <p className="text-[11px]" style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}>
                Dúvidas:{" "}
                <a href="mailto:regisalessander@gmail.com" className="hover:text-white/40 transition">
                  regisalessander@gmail.com
                </a>
              </p>
            </section>

          </main>

          {/* ── Sidebar ── */}
          <PapersSidebar />
        </div>
      </div>
    </div>
  );
}
