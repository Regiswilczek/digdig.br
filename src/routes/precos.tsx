import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — Dig Dig" },
      {
        name: "description",
        content:
          "Planos para cidadãos, jornalistas, advogados e veículos de imprensa. Audite atos públicos com IA a partir de R$ 0.",
      },
      { property: "og:title", content: "Preços — Dig Dig" },
      {
        property: "og:description",
        content:
          "Cidadão, Investigador, Profissional e API & Dados. Escolha o plano que se encaixa na sua missão.",
      },
    ],
  }),
  component: PrecosPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

type Plano = {
  nome: string;
  preco: string;
  periodo?: string;
  publico: string;
  destaque?: boolean;
  cta: string;
  features: string[];
  cor: string; // accent color from BR flag palette
};

const PLANOS: Plano[] = [
  {
    nome: "Cidadão",
    preco: "R$ 0",
    periodo: "para sempre",
    publico: "Qualquer brasileiro",
    cta: "Começar grátis",
    cor: "#3b6fa0",
    features: [
      "Acesso de leitura a todas as auditorias",
      "5 perguntas no chat por mês",
      "1 assento",
      "Sem exportação",
    ],
  },
  {
    nome: "Investigador",
    preco: "R$ 197",
    periodo: "por mês",
    publico: "Jornalistas, candidatos, militantes",
    cta: "Assinar Investigador",
    destaque: true,
    cor: "#F0C81E",
    features: [
      "200 perguntas no chat por mês",
      "Exportação em PDF e HTML",
      "Fichas de denúncia prontas",
      "Alertas por email de novos atos",
      "1 assento",
    ],
  },
  {
    nome: "Profissional",
    preco: "R$ 597",
    periodo: "por mês",
    publico: "Escritórios jurídicos, assessorias",
    cta: "Assinar Profissional",
    cor: "#00823c",
    features: [
      "1.000 perguntas no chat por mês",
      "Exportação CSV, JSON, PDF, HTML",
      "Relatórios técnicos completos",
      "Alertas customizáveis",
      "2 assentos",
    ],
  },
  {
    nome: "API & Dados",
    preco: "R$ 1.997",
    periodo: "por mês",
    publico: "Veículos de imprensa, plataformas",
    cta: "Falar com vendas",
    cor: "#a78bfa",
    features: [
      "API REST completa + webhooks",
      "10.000 calls por mês",
      "5 assentos com permissões",
      "SLA e suporte prioritário",
      "Tudo do plano Profissional",
    ],
  },
];

function Nav() {
  return (
    <nav className="relative z-30 flex items-center justify-between px-6 md:px-14 py-5 md:py-6">
      <Link
        to="/"
        style={{ ...SYNE, letterSpacing: "0.18em" }}
        className="text-white text-[12px] md:text-[13px] uppercase hover:opacity-80 transition"
      >
        DIG DIG
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
        <Link to="/produto" className="hover:text-white transition-colors">Produto</Link>
        <Link to="/solucoes" className="hover:text-white transition-colors">Soluções</Link>
        <Link to="/precos" className="text-white">Preços</Link>
        <Link to="/patrocine" className="hover:text-white transition-colors">Patrocine</Link>
      </div>
      <a
        href="/entrar"
        className="text-[12px] md:text-[13px] text-white/50 hover:text-white transition-colors"
      >
        Entrar
      </a>
    </nav>
  );
}

function PlanCard({ plano }: { plano: Plano }) {
  const isDestaque = plano.destaque;
  return (
    <div
      className={`relative flex flex-col p-7 md:p-8 border bg-[#0d0f1a]/90 transition-all duration-300 hover:translate-y-[-2px] ${
        isDestaque
          ? "bg-white/[0.04] border-white/30"
          : "bg-black/40 border-white/10 hover:border-white/20"
      }`}
      style={
        isDestaque
          ? { boxShadow: `0 0 0 1px ${plano.cor}33, 0 20px 60px -20px ${plano.cor}40` }
          : undefined
      }
    >
      {isDestaque && (
        <span
          style={{ ...SYNE, background: plano.cor, color: "#0a1530", letterSpacing: "0.2em" }}
          className="absolute -top-2.5 left-7 text-[9px] uppercase px-2.5 py-1"
        >
          MAIS POPULAR
        </span>
      )}

      <div
        aria-hidden
        className="h-[3px] w-10 mb-5"
        style={{ background: plano.cor }}
      />

      <h3
        style={{ ...SYNE, letterSpacing: "0.04em" }}
        className="text-white text-[1.5rem] mb-1"
      >
        {plano.nome}
      </h3>
      <p className="text-white/40 text-[12px] mb-6">{plano.publico}</p>

      <div className="flex items-baseline gap-2 mb-6">
        <span style={SYNE} className="text-white text-[2.4rem] leading-none">
          {plano.preco}
        </span>
        {plano.periodo && (
          <span className="text-white/40 text-[12px]">/ {plano.periodo}</span>
        )}
      </div>

      <ul className="flex flex-col gap-2.5 mb-8 flex-1">
        {plano.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-snug">
            <span
              className="mt-[6px] h-1 w-1 rounded-full flex-shrink-0"
              style={{ background: plano.cor }}
            />
            {f}
          </li>
        ))}
      </ul>

      <a
        href="/cadastro"
        style={{
          ...SYNE,
          background: isDestaque ? plano.cor : "transparent",
          color: isDestaque ? "#0a1530" : "#fff",
          border: isDestaque ? "none" : "1px solid rgba(255,255,255,0.2)",
          letterSpacing: "0.18em",
        }}
        className="text-center text-[11px] uppercase px-5 py-3 hover:opacity-90 transition-opacity"
      >
        {plano.cta}
      </a>
    </div>
  );
}

function PrecosPage() {
  return (
    <div className="relative min-h-screen bg-[#07080f] text-white overflow-x-hidden animate-fade-in">
      {/* Subtle single-layer backdrop (fixed, no scroll repaint) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 10%, rgba(10,35,110,0.28), transparent 70%)",
        }}
      />

      <Nav />

      <main className="relative z-10 px-6 md:px-14 pb-24">
        {/* Header */}
        <header className="max-w-3xl mx-auto text-center pt-8 md:pt-16 pb-12 md:pb-20">
          <span
            style={{ ...SYNE, letterSpacing: "0.3em" }}
            className="text-[10px] md:text-[11px] uppercase text-white/40"
          >
            PLANOS & PREÇOS
          </span>
          <h1
            style={{ ...SYNE, letterSpacing: "-0.02em" }}
            className="text-white mt-4 text-[2rem] md:text-[3.6rem] leading-[0.95]"
          >
            Transparência<br />
            <span className="text-white/55">tem um preço justo.</span>
          </h1>
          <p className="text-white/50 text-[14px] md:text-[15px] mt-6 max-w-xl mx-auto leading-relaxed">
            Comece grátis e leia tudo. Atualize quando precisar de exportação,
            alertas, mais consultas no chat ou acesso via API.
          </p>
        </header>

        {/* Plans grid */}
        <section className="grid gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {PLANOS.map((p) => (
            <PlanCard key={p.nome} plano={p} />
          ))}
        </section>

        {/* FAQ-ish closing */}
        <section className="max-w-3xl mx-auto mt-20 md:mt-28 text-center">
          <h2
            style={{ ...SYNE, letterSpacing: "-0.01em" }}
            className="text-white text-[1.4rem] md:text-[1.9rem]"
          >
            Tudo que você precisa, sem surpresa.
          </h2>
          <p className="text-white/50 text-[14px] mt-4 leading-relaxed">
            Sem fidelidade. Cancele quando quiser. Pagamento mensal via cartão
            ou PIX. Notas fiscais emitidas automaticamente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a
              href="/cadastro"
              style={{ ...SYNE, background: "#009C3B", letterSpacing: "0.22em" }}
              className="inline-block text-white text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
            >
              COMEÇAR GRÁTIS
            </a>
            <Link
              to="/"
              style={{ ...SYNE, letterSpacing: "0.22em" }}
              className="inline-block text-white/60 hover:text-white text-[11px] uppercase px-5 py-[13px] transition-colors"
            >
              ← VOLTAR
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
