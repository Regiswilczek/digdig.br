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

const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace",
};

const GOLD = "#F0C81E";

// ─── Types ────────────────────────────────────────────────
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

type Campanha = {
  slug: string;
  nome: string;
  tipo: string;
  votos: number;
  status: "concluida" | "em_analise" | "na_fila";
};

// ─── Data ─────────────────────────────────────────────────
const PLANOS: Plano[] = [
  {
    id: "cidadao",
    nome: "Acesso Livre",
    preco: "R$ 0",
    periodo: "para sempre",
    publico: "Qualquer brasileiro",
    cta: "Começar grátis",
    features: [
      "Leitura completa de todas as auditorias",
      "5 perguntas no chat por mês",
    ],
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

const CAMPANHAS: Campanha[] = [
  {
    slug: "cau-pr",
    nome: "CAU/PR",
    tipo: "Conselho de Arquitetura e Urbanismo do Paraná",
    votos: 142,
    status: "em_analise",
  },
  {
    slug: "prefeitura-curitiba",
    nome: "Prefeitura de Curitiba",
    tipo: "Poder Executivo Municipal — PR",
    votos: 47,
    status: "na_fila",
  },
  {
    slug: "crm-pr",
    nome: "CRM/PR",
    tipo: "Conselho Regional de Medicina do Paraná",
    votos: 23,
    status: "na_fila",
  },
  {
    slug: "camara-curitiba",
    nome: "Câmara de Curitiba",
    tipo: "Poder Legislativo Municipal — PR",
    votos: 18,
    status: "na_fila",
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
      titulo: "Quando as Deliberações Falam Mais Alto",
      desc: "757 deliberações únicas, a descoberta da WP REST API e 41% de casos críticos nos primeiros achados.",
      to: "/whitepaper-03-deliberacoes-e-primeiros-achados" as const,
      publicado: true,
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

// ─── Plan row ─────────────────────────────────────────────
function PlanoRow({ plano }: { plano: Plano }) {
  return (
    <div
      className="relative border-b border-white/[0.05] py-7"
      style={{ paddingLeft: plano.destaque ? "20px" : "0" }}
    >
      {plano.destaque && (
        <div className="absolute left-0 top-4 bottom-4" style={{ width: "2px", background: GOLD }} />
      )}
      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <div className="flex-shrink-0" style={{ minWidth: "190px" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[1.15rem] font-semibold text-white/80" style={INTER}>
              {plano.nome}
            </span>
            {plano.destaque && (
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-1"
                style={{ ...INTER, color: GOLD, background: `${GOLD}18` }}
              >
                mais popular
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[1.7rem] font-bold text-white leading-none" style={INTER}>
              {plano.preco}
            </span>
            <span className="text-[12px] text-white/25 ml-1" style={INTER}>{plano.periodo}</span>
          </div>
          <p className="mt-1 text-[11px] text-white/22" style={INTER}>{plano.publico}</p>
        </div>
        <ul className="flex-1 grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
          {plano.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-white/40 leading-relaxed" style={INTER}>
              <span className="flex-shrink-0 text-white/15">—</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="flex-shrink-0">
          <a
            href="/cadastro"
            className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-5 py-3 transition-opacity hover:opacity-75"
            style={
              plano.destaque
                ? { ...INTER, background: GOLD, color: "#0a0a0a" }
                : { ...INTER, border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.35)" }
            }
          >
            {plano.cta}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────
function CampanhaCard({ campanha }: { campanha: Campanha }) {
  const statusConfig = {
    concluida: { label: "Auditoria publicada", color: "#4ade80" },
    em_analise: { label: "Em análise", color: GOLD },
    na_fila: { label: "Na fila", color: "rgba(255,255,255,0.25)" },
  }[campanha.status];

  return (
    <div className="border border-white/[0.06] p-5 flex flex-col gap-4">
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/20 mb-2" style={INTER}>
          {campanha.tipo}
        </p>
        <h3 className="text-[0.95rem] font-semibold text-white/72" style={INTER}>
          {campanha.nome}
        </h3>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ ...INTER, color: statusConfig.color }}>
          <span
            className="h-[5px] w-[5px] rounded-full flex-shrink-0"
            style={{ background: statusConfig.color }}
          />
          {statusConfig.label}
        </span>
        <span className="text-[11px] text-white/28" style={MONO}>
          {campanha.votos} votos
        </span>
      </div>

      {campanha.status === "concluida" ? (
        <Link
          to="/"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white/75 transition"
          style={INTER}
        >
          Ver auditoria →
        </Link>
      ) : campanha.status === "em_analise" ? (
        <span
          className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40"
          style={INTER}
        >
          Em andamento
        </span>
      ) : (
        <button
          className="text-[10px] font-medium uppercase tracking-[0.12em] px-4 py-2.5 border border-white/[0.10] text-white/42 hover:text-white/65 hover:border-white/20 transition w-full"
          style={INTER}
        >
          ★ Votar
        </button>
      )}
    </div>
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

            {/* Manifesto */}
            <header className="pb-14 md:pb-18">
              <p className="text-[9px] uppercase tracking-[0.32em] text-white/22 mb-7" style={MONO}>
                NASCE O DIG DIG — ABRIL 2026
              </p>
              <h1
                className="text-[2.4rem] md:text-[3.6rem] font-bold text-white leading-[1.03] tracking-[-0.03em] mb-9"
                style={INTER}
              >
                Centenas de documentos
                <br />oficiais são publicados
                <br />todo ano. Ninguém lê.
                <br /><span className="text-white/28">Nós lemos.</span>
              </h1>
              <div className="space-y-4 text-[15px] md:text-[16px] text-white/70 leading-[1.80] max-w-xl" style={INTER}>
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
                <p>
                  É como se todo o Brasil se juntasse para auditar o próprio governo.
                  Uma escavadeira coletiva.
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-12 pt-10 border-t border-white/[0.06]">
                {[
                  { valor: "1.789", label: "atos coletados" },
                  { valor: "262", label: "já analisados" },
                  { valor: "1", label: "laranja detectado" },
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

            {/* Próximas auditorias */}
            <section className="mb-16 md:mb-20" id="auditorias">
              <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-1.5" style={MONO}>
                    Próximas auditorias
                  </p>
                  <h2 className="text-[1.15rem] font-bold text-white/85" style={INTER}>
                    A comunidade vota. A equipe decide.
                  </h2>
                </div>
                <button
                  className="text-[10px] uppercase tracking-[0.14em] px-4 py-2.5 border border-white/[0.07] text-white/28 hover:text-white/55 hover:border-white/14 transition flex-shrink-0"
                  style={INTER}
                >
                  + Nominar órgão
                </button>
              </div>

              <p className="text-[13px] text-white/58 leading-relaxed mb-6 max-w-lg" style={INTER}>
                Os órgãos mais votados ficam no topo da fila. A equipe seleciona os próximos
                conforme a capacidade técnica e o tamanho do acervo — cada casa de poder
                é diferente, e não vamos assumir uma que não conseguimos escavar bem ainda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAMPANHAS.map((c) => (
                  <CampanhaCard key={c.slug} campanha={c} />
                ))}
              </div>
            </section>

            {/* Como funciona */}
            <section className="mb-16 md:mb-20">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-6" style={MONO}>
                Como funciona
              </p>
              <ol className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
                {[
                  {
                    n: "01",
                    titulo: "Votar",
                    texto: "A comunidade nomina órgãos e distribui votos. Cada usuário tem 3 votos gratuitos por mês.",
                  },
                  {
                    n: "02",
                    titulo: "Decidir",
                    texto: "A equipe seleciona os próximos conforme capacidade real. Sem prometer o que não pode entregar ainda.",
                  },
                  {
                    n: "03",
                    titulo: "Escavar",
                    texto: "A IA analisa todos os documentos disponíveis. Trabalho humano revisa e aprofunda os casos críticos.",
                  },
                  {
                    n: "04",
                    titulo: "Publicar",
                    texto: "O resultado fica público para qualquer pessoa. Gratuito. Sem exceção. Sem paywall.",
                  },
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

            {/* Divider */}
            <div className="border-t border-white/[0.05] mb-16 md:mb-20" />

            {/* Contribuição */}
            <section className="mb-16 md:mb-20" id="contribuir">
              <div className="border border-white/[0.06] p-8 md:p-10">
                <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-3" style={MONO}>
                  Contribuir
                </p>
                <h2 className="text-[1.3rem] font-bold text-white/75 mb-4 leading-snug" style={INTER}>
                  Cada contribuição financia<br />a escavação.
                </h2>
                <p className="text-[14px] text-white/65 leading-[1.75] mb-7 max-w-lg" style={INTER}>
                  Não temos investidor. As contribuições cobrem os custos operacionais — IA,
                  infraestrutura e trabalho humano de investigação. Todo excedente é reinvestido
                  em tecnologia para ampliar a capacidade da ferramenta.
                  O Dig Dig pertence às pessoas que o financiam.
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {["R$ 25", "R$ 50", "R$ 100", "Valor livre"].map((v) => (
                    <button
                      key={v}
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] px-5 py-2.5 border border-white/[0.10] text-white/45 hover:border-white/28 hover:text-white/70 transition"
                      style={INTER}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-7">
                  {["Uma vez", "Todo mês"].map((f) => (
                    <button
                      key={f}
                      className="text-[11px] font-medium uppercase tracking-[0.12em] px-4 py-2 border border-white/[0.08] text-white/35 hover:border-white/22 hover:text-white/60 transition"
                      style={INTER}
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

                <p className="text-[11px] text-white/50 mt-4" style={INTER}>
                  Mínimo R$ 25. Quem contribui pela primeira vez ganha 1 mês do nível Apoio Ativo.
                </p>
              </div>
            </section>

            {/* Apoio institucional */}
            <section className="mb-16 md:mb-20">
              <div className="border-t border-b border-white/[0.05] py-8">
                <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-3" style={MONO}>
                  Apoio institucional
                </p>
                <p className="text-[14px] text-white/42 leading-[1.75] max-w-lg mb-4" style={INTER}>
                  Empresas e organizações que acreditam na transparência pública podem se tornar
                  Apoiadores Oficiais do Dig Dig. O modelo é negociado diretamente — sem tabela de preços,
                  sem pacote fechado.
                </p>
                <a
                  href="mailto:apoie@digdig.com.br"
                  className="text-[13px] font-medium text-white/45 hover:text-white/68 transition"
                  style={INTER}
                >
                  apoie@digdig.com.br →
                </a>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-white/[0.05] mb-16 md:mb-20" />

            {/* Planos */}
            <section className="mb-16 md:mb-20" id="planos">
              <div className="mb-6 pb-5 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-1.5" style={MONO}>
                  Ferramentas Avançadas para Profissionais
                </p>
                <h2 className="text-[1.15rem] font-bold text-white/65 mb-2" style={INTER}>
                  Níveis de Apoio
                </h2>
                <p className="text-[13px] text-white/35 leading-relaxed max-w-lg" style={INTER}>
                  O acesso ao banco auditado é gratuito para qualquer cidadão brasileiro. Os planos
                  são para quem usa a plataforma profissionalmente — jornalistas, escritórios, veículos,
                  assessorias. Exportação, alertas, volume de chat, API.
                </p>
              </div>

              {PLANOS.map((p) => (
                <PlanoRow key={p.id} plano={p} />
              ))}

              <p className="mt-5 text-[11px] text-white/20 leading-relaxed" style={INTER}>
                Cartão ou PIX · Sem fidelidade · Notas fiscais emitidas automaticamente.
              </p>

              {/* Transparência financeira */}
              <div className="mt-16 pt-10 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] uppercase tracking-[0.28em] text-white/25 mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
                  Para onde vai o dinheiro
                </p>
                <h2 className="text-[1.3rem] font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em" }}>
                  Radical transparência.
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { item: "Infraestrutura de IA", pct: "55%", desc: "API Anthropic — o custo de analisar cada ato" },
                    { item: "Servidores & Hospedagem", pct: "25%", desc: "Railway, Supabase, Redis — o que mantém o sistema vivo" },
                    { item: "Desenvolvimento", pct: "20%", desc: "Manutenção, novas instituições, melhorias contínuas" },
                  ].map(({ item, pct, desc }) => (
                    <div key={item} className="border p-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="text-[1.8rem] font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{pct}</div>
                      <div className="text-[11px] text-white/70 font-medium mb-1">{item}</div>
                      <div className="text-[11px] text-white/35">{desc}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-white/30 mt-5 leading-relaxed">
                  O acesso básico sempre será gratuito. Contribuições de Apoio Ativo e Apoio Institucional financiam os servidores e permitem que o projeto continue expandindo para novas instituições.
                </p>
              </div>
            </section>

            {/* White Papers — mobile only */}
            <section className="lg:hidden mb-14">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/22 mb-4" style={MONO}>
                White Papers
              </p>
              <div className="flex flex-col gap-3 mb-4">
                {([
                  { n: "01", titulo: "Como Automatizamos a Auditoria do CAU/PR com IA", desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.", to: "/whitepaper-01-extracao-caupr" as const, publicado: true },
                  { n: "02", titulo: "Quando a IA Custa Mais do Que Deveria", desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.", to: "/whitepaper-02-custo-e-controle" as const, publicado: true },
                  { n: "03", titulo: "Quando as Deliberações Falam Mais Alto", desc: "757 deliberações únicas, a descoberta da WP REST API e 41% de casos críticos nos primeiros achados.", to: "/whitepaper-03-deliberacoes-e-primeiros-achados" as const, publicado: true },
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

            {/* Footer */}
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
                  to="/"
                  className="inline-block text-[10px] font-medium uppercase tracking-[0.15em] px-5 py-3.5 text-white/25 hover:text-white/52 transition border border-white/[0.07]"
                  style={INTER}
                >
                  ← Início
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
