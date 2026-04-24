import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar — Dig Dig" },
      {
        name: "description",
        content:
          "Planos de assinatura e patrocínio de auditorias. Como sustentar o Dig Dig e o que você recebe em troca.",
      },
      { property: "og:title", content: "Apoiar — Dig Dig" },
      {
        property: "og:description",
        content:
          "Assine para acessar o banco completo. Patrocine para financiar a auditoria de um órgão específico. A partir de R$ 0.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: ApoiarPage,
});

// ─── Constants ────────────────────────────────────────────
const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const GOLD = "#F0C81E";
const META = 3000;

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
  arrecadado: number;
  apoiadores: number;
  diasRestantes: number;
  status: "ativa" | "concluida";
};

// ─── Data ─────────────────────────────────────────────────
const PLANOS: Plano[] = [
  {
    id: "cidadao",
    nome: "Cidadão",
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
    nome: "Investigador",
    preco: "R$ 197",
    periodo: "/mês",
    publico: "Jornalistas, candidatos, assessores",
    cta: "Assinar",
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
    nome: "Profissional",
    preco: "R$ 597",
    periodo: "/mês",
    publico: "Escritórios jurídicos, assessorias",
    cta: "Assinar",
    features: [
      "1.000 perguntas no chat por mês",
      "Exportação CSV, JSON, PDF, HTML",
      "Relatórios técnicos completos",
      "2 assentos",
    ],
  },
  {
    id: "api",
    nome: "API & Dados",
    preco: "R$ 1.997",
    periodo: "/mês",
    publico: "Veículos de imprensa, plataformas",
    cta: "Falar com a gente",
    features: [
      "API REST + webhooks",
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
    arrecadado: 3000,
    apoiadores: 142,
    diasRestantes: 0,
    status: "concluida",
  },
  {
    slug: "prefeitura-curitiba",
    nome: "Prefeitura de Curitiba",
    tipo: "Poder Executivo Municipal — PR",
    arrecadado: 100,
    apoiadores: 2,
    diasRestantes: 89,
    status: "ativa",
  },
  {
    slug: "crm-pr",
    nome: "CRM/PR",
    tipo: "Conselho Regional de Medicina do Paraná",
    arrecadado: 0,
    apoiadores: 0,
    diasRestantes: 90,
    status: "ativa",
  },
  {
    slug: "camara-curitiba",
    nome: "Câmara de Curitiba",
    tipo: "Poder Legislativo Municipal — PR",
    arrecadado: 0,
    apoiadores: 0,
    diasRestantes: 90,
    status: "ativa",
  },
];

// ─── Helpers ──────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

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
        <Link to="/" className="hover:text-white/70 transition">
          Início
        </Link>
        <Link to="/apoiar" className="text-white/70 font-medium">
          Apoiar
        </Link>
      </div>
      <a
        href="/entrar"
        className="text-[12px] text-white/30 hover:text-white/70 transition"
      >
        Entrar
      </a>
    </nav>
  );
}

// ─── Plano row ────────────────────────────────────────────
function PlanoRow({ plano }: { plano: Plano }) {
  return (
    <div
      className="relative border-b border-white/[0.05] py-8"
      style={{ paddingLeft: plano.destaque ? "20px" : "0" }}
    >
      {plano.destaque && (
        <div
          className="absolute left-0 top-4 bottom-4"
          style={{ width: "2px", background: GOLD }}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-10">
        {/* Name + price */}
        <div className="flex-shrink-0" style={{ minWidth: "210px" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-[1.2rem] font-semibold text-white/80 leading-tight"
              style={INTER}
            >
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
            <span
              className="text-[1.75rem] font-bold text-white leading-none"
              style={INTER}
            >
              {plano.preco}
            </span>
            <span className="text-[12px] text-white/25 ml-1" style={INTER}>
              {plano.periodo}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/22" style={INTER}>
            {plano.publico}
          </p>
        </div>

        {/* Features */}
        <ul className="flex-1 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {plano.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-[13px] text-white/42 leading-relaxed"
              style={INTER}
            >
              <span className="flex-shrink-0 text-white/15">—</span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex-shrink-0">
          <a
            href="/cadastro"
            className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-6 py-3 transition-opacity hover:opacity-75"
            style={
              plano.destaque
                ? { ...INTER, background: GOLD, color: "#0a0a0a" }
                : {
                    ...INTER,
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.38)",
                  }
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
  const pct = Math.min(100, Math.round((campanha.arrecadado / META) * 100));
  const isConcluida = campanha.status === "concluida";

  return (
    <div className="border border-white/[0.06] p-6 flex flex-col gap-5">
      <div>
        <p
          className="text-[9px] uppercase tracking-[0.14em] text-white/22 mb-2"
          style={INTER}
        >
          {campanha.tipo}
        </p>
        <h3 className="text-[1rem] font-semibold text-white/75" style={INTER}>
          {campanha.nome}
        </h3>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[1.05rem] font-bold text-white/85" style={INTER}>
            {formatBRL(campanha.arrecadado)}
          </span>
          <span className="text-[10px] text-white/22" style={INTER}>
            / {formatBRL(META)}
          </span>
        </div>
        <div
          className="w-full overflow-hidden"
          style={{ height: "2px", background: "rgba(255,255,255,0.06)" }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: isConcluida ? "#4ade80" : GOLD,
            }}
          />
        </div>
        <div
          className="flex justify-between mt-2 text-[10px] text-white/22"
          style={INTER}
        >
          <span>{campanha.apoiadores} apoiadores</span>
          <span>
            {isConcluida ? "Concluída ✓" : `${campanha.diasRestantes} dias`}
          </span>
        </div>
      </div>

      {isConcluida ? (
        <Link
          to="/"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 hover:text-white/60 transition"
          style={INTER}
        >
          Ver auditoria →
        </Link>
      ) : (
        <div className="flex gap-2">
          <a
            href={`/patrocine/${campanha.slug}`}
            className="flex-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] py-2.5 transition-opacity hover:opacity-80"
            style={{ ...INTER, background: GOLD, color: "#0a0a0a" }}
          >
            Apoiar
          </a>
          <button
            className="text-[10px] font-medium px-4 py-2.5 border border-white/[0.07] text-white/28 hover:text-white/55 hover:border-white/15 transition"
            style={INTER}
          >
            ★ Votar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────
function ApoiarPage() {
  const totalArrecadado = CAMPANHAS.reduce((s, c) => s + c.arrecadado, 0);

  return (
    <div
      className="min-h-screen bg-[#07080f] text-white overflow-x-hidden"
      style={INTER}
    >
      <Nav />

      <main className="px-6 md:px-12 pb-28">
        {/* ─── Header ─── */}
        <header className="max-w-2xl mx-auto pt-14 md:pt-20 pb-14 md:pb-18">
          <p
            className="text-[9px] uppercase tracking-[0.32em] text-white/22 mb-5"
            style={INTER}
          >
            Apoiar o Dig Dig
          </p>
          <h1
            className="text-[2.6rem] md:text-[3.8rem] font-bold text-white leading-[1.04] tracking-[-0.025em] mb-7"
            style={INTER}
          >
            Um projeto real.{" "}
            <span className="text-white/35">Duas formas de ajudar.</span>
          </h1>
          <div
            className="space-y-4 text-[15px] md:text-[16px] text-white/50 leading-[1.78]"
            style={INTER}
          >
            <p>
              O Dig Dig escava atos administrativos de órgãos públicos
              brasileiros — portarias, deliberações, resoluções — analisados por
              IA em busca de irregularidades legais e morais. O código é aberto.
              A metodologia é pública. Os resultados também.
            </p>
            <p>
              Há duas formas de sustentar o projeto. A primeira é{" "}
              <strong className="text-white/72 font-medium">assinatura</strong>:
              você acessa o banco completo de atos analisados, conversa com a IA
              e exporta o que precisar. A segunda é{" "}
              <strong className="text-white/72 font-medium">
                patrocínio coletivo
              </strong>
              : qualquer pessoa nomeia um órgão, a comunidade financia R$ 3.000,
              e a IA entrega a auditoria em até 7 dias — pública para todos.
            </p>
            <p>
              Sem contrato. Cancele quando quiser. Se a meta de patrocínio não
              for atingida em 90 dias, devolvemos.
            </p>
          </div>
        </header>

        {/* ─── Planos ─── */}
        <section className="max-w-4xl mx-auto mb-20 md:mb-28" id="planos">
          <div className="mb-8 pb-5 border-b border-white/[0.05] flex items-end justify-between flex-wrap gap-3">
            <div>
              <p
                className="text-[9px] uppercase tracking-[0.3em] text-white/22 mb-2"
                style={INTER}
              >
                Assinatura mensal
              </p>
              <h2 className="text-[1.4rem] font-bold text-white/72" style={INTER}>
                Planos
              </h2>
            </div>
            <p className="text-[11px] text-white/25" style={INTER}>
              Cartão ou PIX · Sem fidelidade
            </p>
          </div>

          <div>
            {PLANOS.map((p) => (
              <PlanoRow key={p.id} plano={p} />
            ))}
          </div>

          <p
            className="mt-5 text-[11px] text-white/22 leading-relaxed"
            style={INTER}
          >
            Todos os planos incluem leitura completa das auditorias publicadas.
            Notas fiscais emitidas automaticamente.
          </p>
        </section>

        {/* ─── Divider ─── */}
        <div className="max-w-4xl mx-auto border-t border-white/[0.05] mb-20 md:mb-28" />

        {/* ─── Patrocínio intro ─── */}
        <section
          className="max-w-4xl mx-auto mb-10 md:mb-14"
          id="patrocinio"
        >
          <p
            className="text-[9px] uppercase tracking-[0.3em] text-white/22 mb-2"
            style={INTER}
          >
            Patrocínio coletivo
          </p>
          <h2
            className="text-[1.4rem] font-bold text-white/72 mb-4"
            style={INTER}
          >
            Nomear um órgão
          </h2>
          <p
            className="text-[14px] md:text-[15px] text-white/42 leading-[1.75] max-w-2xl mb-3"
            style={INTER}
          >
            Qualquer usuário cadastrado pode propor um órgão para auditoria. A
            comunidade financia a partir de R$ 25. Quando a meta de R$ 3.000 é
            atingida, a IA executa a auditoria e o resultado fica público para
            todos — doadores ou não.
          </p>
          <p className="text-[12px] text-white/25" style={INTER}>
            {formatBRL(totalArrecadado)} arrecadados no total ·{" "}
            <span className="text-white/45">CAU/PR: auditoria concluída e publicada.</span>
          </p>
        </section>

        {/* ─── Campaign grid ─── */}
        <section className="max-w-5xl mx-auto mb-20 md:mb-28">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <p
              className="text-[9px] text-white/22 uppercase tracking-[0.2em]"
              style={INTER}
            >
              Campanhas ativas
            </p>
            <button
              className="text-[10px] uppercase tracking-[0.14em] px-4 py-2 border border-white/[0.07] text-white/30 hover:text-white/55 hover:border-white/14 transition"
              style={INTER}
            >
              + Nominar órgão
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAMPANHAS.map((c) => (
              <CampanhaCard key={c.slug} campanha={c} />
            ))}
          </div>
        </section>

        {/* ─── Como funciona ─── */}
        <section className="max-w-4xl mx-auto mb-20 md:mb-28">
          <p
            className="text-[9px] uppercase tracking-[0.3em] text-white/22 mb-8"
            style={INTER}
          >
            Como funciona o patrocínio
          </p>
          <ol className="grid md:grid-cols-4 gap-px bg-white/[0.04]">
            {[
              {
                n: "01",
                titulo: "Nominar",
                texto:
                  "Qualquer usuário cadastrado — mesmo no plano gratuito — pode propor um órgão.",
              },
              {
                n: "02",
                titulo: "Financiar",
                texto:
                  "Doações a partir de R$ 25 via cartão ou PIX. Meta: R$ 3.000. Prazo: 90 dias.",
              },
              {
                n: "03",
                titulo: "Executar",
                texto:
                  "Meta atingida → auditoria em até 7 dias. Doadores recebem acesso 48h antes da publicação.",
              },
              {
                n: "04",
                titulo: "Publicar",
                texto:
                  "O resultado fica público para qualquer pessoa, doador ou não. Sem paywall.",
              },
            ].map((p) => (
              <li
                key={p.n}
                className="bg-[#07080f] p-6 flex flex-col gap-3"
              >
                <span
                  className="text-[1.45rem] font-bold leading-none"
                  style={{ ...INTER, color: GOLD }}
                >
                  {p.n}
                </span>
                <h3
                  className="text-[0.9rem] font-semibold text-white/65"
                  style={INTER}
                >
                  {p.titulo}
                </h3>
                <p
                  className="text-[12px] text-white/35 leading-relaxed"
                  style={INTER}
                >
                  {p.texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Benefícios para quem patrocina ─── */}
        <section className="max-w-4xl mx-auto mb-20 md:mb-28">
          <div className="border border-white/[0.06] p-8 md:p-10">
            <p
              className="text-[9px] uppercase tracking-[0.3em] mb-2"
              style={{ ...INTER, color: GOLD }}
            >
              Para quem patrocina
            </p>
            <h2
              className="text-[1.25rem] font-semibold text-white/68 mb-7"
              style={INTER}
            >
              O que você recebe além da transparência pública
            </h2>
            <ul className="grid md:grid-cols-2 gap-x-10 gap-y-3">
              {[
                "6 meses do plano Investigador grátis — independente do valor doado",
                'Badge "Patrocinador" permanente no seu perfil',
                "Acesso ao resultado 48h antes da publicação pública",
                "Emails de progresso a cada 25% da meta atingida",
                "Reembolso ou crédito se a meta não for atingida em 90 dias",
              ].map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-3 text-[13px] text-white/45 leading-relaxed"
                  style={INTER}
                >
                  <span
                    className="flex-shrink-0 mt-[6px]"
                    style={{ color: `${GOLD}60` }}
                  >
                    —
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Votos + Por que R$3k ─── */}
        <section className="max-w-4xl mx-auto mb-20 md:mb-28 grid md:grid-cols-2 gap-3">
          <div className="border border-white/[0.06] p-7">
            <h3
              className="text-[0.95rem] font-semibold text-white/65 mb-3"
              style={INTER}
            >
              Não pode doar? Vote.
            </h3>
            <p
              className="text-[13px] text-white/38 leading-relaxed"
              style={INTER}
            >
              Todo usuário tem{" "}
              <span className="text-white/60">3 votos gratuitos por mês</span>{" "}
              para distribuir entre as campanhas ativas. Votos influenciam a
              visibilidade — é a forma de dar voz a quem não pode contribuir
              financeiramente.
            </p>
          </div>
          <div className="border border-white/[0.06] p-7">
            <h3
              className="text-[0.95rem] font-semibold text-white/65 mb-3"
              style={INTER}
            >
              Por que R$ 3.000?
            </h3>
            <p
              className="text-[13px] text-white/38 leading-relaxed"
              style={INTER}
            >
              Cobre o custo real da IA (~R$ 60), configuração do scraper,
              revisão humana e{" "}
              <span className="text-white/60">
                3 meses de manutenção dos dados
              </span>{" "}
              após a entrega. Sem margem inflada.
            </p>
          </div>
        </section>

        {/* ─── Footer CTA ─── */}
        <section className="max-w-2xl mx-auto text-center pt-10 border-t border-white/[0.05]">
          <p
            className="text-[13px] text-white/30 leading-relaxed mb-7"
            style={INTER}
          >
            Dúvidas ou quer conversar sobre uma parceria?
            <br />
            <a
              href="mailto:regisalessander@gmail.com"
              className="text-white/45 hover:text-white/65 transition underline underline-offset-2 decoration-white/15"
            >
              regisalessander@gmail.com
            </a>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/cadastro"
              className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-7 py-3.5 transition-opacity hover:opacity-75"
              style={{ ...INTER, background: GOLD, color: "#0a0a0a" }}
            >
              Criar conta grátis
            </a>
            <Link
              to="/"
              className="inline-block text-[10px] font-medium uppercase tracking-[0.15em] px-5 py-3.5 text-white/28 hover:text-white/55 transition border border-white/[0.07]"
              style={INTER}
            >
              ← Início
            </Link>
          </div>
          <p className="mt-8 text-[10px] text-white/18" style={INTER}>
            White Papers:{" "}
            <Link
              to="/whitepaper-01-extracao-caupr"
              className="hover:text-white/40 transition underline underline-offset-2 decoration-white/10"
            >
              Nº 01
            </Link>
            {" · "}
            <Link
              to="/whitepaper-02-custo-e-controle"
              className="hover:text-white/40 transition underline underline-offset-2 decoration-white/10"
            >
              Nº 02
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
