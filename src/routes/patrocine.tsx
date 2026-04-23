import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/patrocine")({
  head: () => ({
    meta: [
      { title: "Patrocine uma Auditoria — Dig Dig" },
      {
        name: "description",
        content:
          "Nominie um órgão público. A comunidade financia. Nós executamos. O resultado é público. R$ 25 é o mínimo, R$ 3.000 financia uma auditoria completa.",
      },
      { property: "og:title", content: "Patrocine uma Auditoria — Dig Dig" },
      {
        property: "og:description",
        content:
          "Auditoria pública financiada coletivamente. R$ 3.000 cobrem uma instituição inteira. Doadores ganham 6 meses do plano Investigador.",
      },
    ],
  }),
  component: PatrocinePage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

const META = 3000;

type Campanha = {
  slug: string;
  nome: string;
  tipo: string;
  arrecadado: number;
  apoiadores: number;
  diasRestantes: number;
  status: "ativa" | "analise" | "concluida";
  destaque?: boolean;
  cor: string;
};

const CAMPANHAS: Campanha[] = [
  {
    slug: "cau-pr",
    nome: "CAU/PR",
    tipo: "Conselho de Arquitetura e Urbanismo do Paraná",
    arrecadado: 3000,
    apoiadores: 142,
    diasRestantes: 0,
    status: "concluida",
    cor: "#00823c",
  },
  {
    slug: "prefeitura-curitiba",
    nome: "Prefeitura Municipal de Curitiba",
    tipo: "Poder Executivo Municipal — PR",
    arrecadado: 100,
    apoiadores: 2,
    diasRestantes: 89,
    status: "ativa",
    destaque: true,
    cor: "#F0C81E",
  },
  {
    slug: "crm-pr",
    nome: "CRM/PR",
    tipo: "Conselho Regional de Medicina do Paraná",
    arrecadado: 0,
    apoiadores: 0,
    diasRestantes: 90,
    status: "ativa",
    cor: "#3b6fa0",
  },
  {
    slug: "camara-curitiba",
    nome: "Câmara Municipal de Curitiba",
    tipo: "Poder Legislativo Municipal — PR",
    arrecadado: 0,
    apoiadores: 0,
    diasRestantes: 90,
    status: "ativa",
    cor: "#a78bfa",
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
        <Link to="/" className="hover:text-white transition-colors">Produto</Link>
        <a href="#" className="hover:text-white transition-colors">Soluções</a>
        <Link to="/precos" className="hover:text-white transition-colors">Preços</Link>
        <Link to="/patrocine" className="text-white">Patrocine</Link>
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

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

function CampanhaCard({ campanha }: { campanha: Campanha }) {
  const pct = Math.min(100, Math.round((campanha.arrecadado / META) * 100));
  const isConcluida = campanha.status === "concluida";
  const isAnalise = campanha.status === "analise";

  let statusLabel = `${campanha.diasRestantes} dias restantes`;
  if (isConcluida) statusLabel = "Auditoria publicada";
  if (isAnalise) statusLabel = "Em análise";

  return (
    <div
      className={`relative flex flex-col p-7 border backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] ${
        campanha.destaque
          ? "bg-white/[0.04] border-white/30"
          : "bg-black/40 border-white/10 hover:border-white/20"
      }`}
      style={
        campanha.destaque
          ? { boxShadow: `0 20px 60px -20px ${campanha.cor}40` }
          : undefined
      }
    >
      {campanha.destaque && (
        <span
          style={{ ...SYNE, background: campanha.cor, color: "#0a1530", letterSpacing: "0.2em" }}
          className="absolute -top-2.5 left-7 text-[9px] uppercase px-2.5 py-1"
        >
          QUASE LÁ
        </span>
      )}

      <div aria-hidden className="h-[3px] w-10 mb-5" style={{ background: campanha.cor }} />

      <h3 style={{ ...SYNE, letterSpacing: "0.04em" }} className="text-white text-[1.35rem] mb-1">
        {campanha.nome}
      </h3>
      <p className="text-white/40 text-[12px] mb-6 leading-snug">{campanha.tipo}</p>

      {/* Termômetro */}
      <div className="mb-2 flex items-baseline justify-between">
        <span style={SYNE} className="text-white text-[1.25rem]">
          {formatBRL(campanha.arrecadado)}
        </span>
        <span className="text-white/40 text-[11px]">de {formatBRL(META)}</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 overflow-hidden mb-4">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isConcluida
              ? "#00cc46"
              : `linear-gradient(90deg, ${campanha.cor}, ${campanha.cor}dd)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/50 mb-6">
        <span>{campanha.apoiadores} apoiadores</span>
        <span>{statusLabel}</span>
      </div>

      {isConcluida ? (
        <Link
          to="/"
          style={{ ...SYNE, letterSpacing: "0.18em" }}
          className="text-center text-[11px] uppercase px-5 py-3 border border-white/20 text-white hover:bg-white/5 transition-colors"
        >
          Ver auditoria
        </Link>
      ) : (
        <div className="flex gap-2">
          <a
            href={`/patrocine/${campanha.slug}`}
            style={{
              ...SYNE,
              background: campanha.cor,
              color: "#0a1530",
              letterSpacing: "0.18em",
            }}
            className="flex-1 text-center text-[11px] uppercase px-4 py-3 hover:opacity-90 transition-opacity"
          >
            Doar
          </a>
          <button
            style={{ ...SYNE, letterSpacing: "0.18em" }}
            className="text-[11px] uppercase px-4 py-3 border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            ★ Votar
          </button>
        </div>
      )}
    </div>
  );
}

function ComoFunciona() {
  const passos = [
    {
      n: "01",
      titulo: "Nominie",
      texto:
        "Qualquer usuário cadastrado — mesmo no plano Cidadão grátis — pode propor um órgão público para ser auditado.",
    },
    {
      n: "02",
      titulo: "A comunidade financia",
      texto:
        "Doações a partir de R$ 25 via cartão ou PIX. Cada auditoria tem meta de R$ 3.000 e prazo de 90 dias.",
    },
    {
      n: "03",
      titulo: "Nós executamos",
      texto:
        "Quando a meta é atingida, a IA entrega a auditoria completa em até 7 dias úteis. Doadores recebem 48h antes.",
    },
    {
      n: "04",
      titulo: "O resultado é público",
      texto:
        "Todo o material fica disponível para qualquer pessoa, doador ou não. Transparência financiada, transparência entregue.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
          COMO FUNCIONA
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Quatro passos. Zero burocracia.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {passos.map((p) => (
          <div key={p.n} className="border border-white/10 bg-black/40 p-6">
            <span
              style={{ ...SYNE, letterSpacing: "0.05em" }}
              className="text-[#F0C81E] text-[2rem] block mb-3"
            >
              {p.n}
            </span>
            <h3 style={SYNE} className="text-white text-[1.05rem] mb-2">
              {p.titulo}
            </h3>
            <p className="text-white/55 text-[13px] leading-relaxed">{p.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Beneficios() {
  const items = [
    "6 meses do plano Investigador grátis (R$ 1.182 de valor) — independente do valor doado",
    "Badge \"Patrocinador [Nome do Órgão]\" permanente no seu perfil",
    "Acesso ao resultado 48 horas antes da publicação pública",
    "Email de progresso a cada 25% da meta atingida",
    "Reembolso ou crédito caso a meta não seja atingida em 90 dias",
  ];

  return (
    <section className="max-w-5xl mx-auto mt-20 md:mt-28">
      <div className="border border-white/15 bg-gradient-to-br from-white/[0.04] to-transparent p-8 md:p-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-[#F0C81E]">
          PARA QUEM DOA
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 mb-8 text-[1.6rem] md:text-[2.2rem]">
          Você financia transparência<br />
          <span className="text-white/55">e ainda leva benefícios.</span>
        </h2>

        <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-3 text-[13.5px] text-white/75 leading-relaxed">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#F0C81E] flex-shrink-0" />
              {it}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VotosGratuitos() {
  return (
    <section className="max-w-5xl mx-auto mt-20 md:mt-28 grid md:grid-cols-2 gap-5">
      <div className="border border-white/10 bg-black/40 p-7">
        <h3 style={SYNE} className="text-white text-[1.2rem] mb-3">
          Não pode doar? Vote.
        </h3>
        <p className="text-white/55 text-[13px] leading-relaxed">
          Todo usuário tem <strong className="text-white/85">3 votos gratuitos por mês</strong> para
          distribuir entre as nominações ativas. Votos influenciam a ordem de visibilidade —
          é o jeito de dar voz a quem não tem como contribuir financeiramente.
        </p>
      </div>
      <div className="border border-white/10 bg-black/40 p-7">
        <h3 style={SYNE} className="text-white text-[1.2rem] mb-3">
          Por que R$ 3.000?
        </h3>
        <p className="text-white/55 text-[13px] leading-relaxed">
          Cobre o custo real da IA (~R$ 60), o trabalho de configuração do scraper, revisão
          humana e <strong className="text-white/85">3 meses de manutenção</strong> dos dados
          atualizados após a entrega. Sem margem inflada.
        </p>
      </div>
    </section>
  );
}

function PatrocinePage() {
  const totalArrecadado = CAMPANHAS.reduce((s, c) => s + c.arrecadado, 0);
  const totalApoiadores = CAMPANHAS.reduce((s, c) => s + c.apoiadores, 0);

  return (
    <div className="relative min-h-screen bg-[#07080f] text-white overflow-x-hidden animate-fade-in">
      {/* Brazil flag inspired backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(0,130,60,0.45), transparent 60%), radial-gradient(ellipse 70% 50% at 90% 25%, rgba(240,200,30,0.18), transparent 65%), radial-gradient(circle at 60% 90%, rgba(10,35,110,0.5), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)",
        }}
      />

      <Nav />

      <main className="relative z-10 px-6 md:px-14 pb-24">
        {/* Hero */}
        <header className="max-w-4xl mx-auto text-center pt-8 md:pt-16 pb-14 md:pb-20">
          <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] md:text-[11px] uppercase text-[#F0C81E]">
            PATROCINE UMA AUDITORIA
          </span>
          <h1
            style={{ ...SYNE, letterSpacing: "-0.025em" }}
            className="text-white mt-4 text-[2.2rem] md:text-[4rem] leading-[0.92]"
          >
            Você nomeia.<br />
            <span className="text-white/55">A comunidade financia.</span><br />
            Nós escavamos.
          </h1>
          <p className="text-white/55 text-[14px] md:text-[16px] mt-7 max-w-2xl mx-auto leading-relaxed">
            Qualquer órgão público do Brasil pode ser auditado pelo Dig Dig. R$ 25 é o
            mínimo para apoiar. R$ 3.000 financiam uma instituição inteira.
            O resultado é público para todos.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-10 text-center">
            <div>
              <p style={SYNE} className="text-white text-[1.6rem]">{formatBRL(totalArrecadado)}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">Arrecadado</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/10" />
            <div>
              <p style={SYNE} className="text-white text-[1.6rem]">{totalApoiadores}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">Apoiadores</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/10" />
            <div>
              <p style={SYNE} className="text-white text-[1.6rem]">1</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">Concluída</p>
            </div>
          </div>
        </header>

        {/* Campanhas ativas */}
        <section className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
                CAMPANHAS ATIVAS
              </span>
              <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-2 text-[1.5rem] md:text-[2rem]">
                Escolha um órgão para apoiar.
              </h2>
            </div>
            <button
              style={{ ...SYNE, letterSpacing: "0.18em" }}
              className="text-[11px] uppercase px-5 py-3 border border-white/20 text-white hover:bg-white/5 transition-colors"
            >
              + Nominar novo órgão
            </button>
          </div>

          <div className="grid gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPANHAS.map((c) => (
              <CampanhaCard key={c.slug} campanha={c} />
            ))}
          </div>
        </section>

        <ComoFunciona />
        <Beneficios />
        <VotosGratuitos />

        {/* CTA final */}
        <section className="max-w-3xl mx-auto mt-20 md:mt-28 text-center">
          <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white text-[1.5rem] md:text-[2rem]">
            Pronto para escavar?
          </h2>
          <p className="text-white/50 text-[14px] mt-4 leading-relaxed">
            Doe a partir de R$ 25, vote em quem precisa de auditoria, ou nomine um órgão
            que ninguém está olhando.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a
              href="#campanhas"
              style={{ ...SYNE, background: "#F0C81E", color: "#0a1530", letterSpacing: "0.22em" }}
              className="inline-block text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
            >
              APOIAR UMA CAMPANHA
            </a>
            <Link
              to="/precos"
              style={{ ...SYNE, letterSpacing: "0.22em" }}
              className="inline-block text-white/60 hover:text-white text-[11px] uppercase px-5 py-[13px] transition-colors"
            >
              VER PLANOS →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
