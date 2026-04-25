import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ParticleField } from "@/components/ParticleField";
import { fetchStats, type PublicStats } from "@/lib/api";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar — Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig é uma ferramenta pública e gratuita. Quem financia são pessoas e organizações que acreditam que transparência não é privilégio.",
      },
      { property: "og:title", content: "Apoiar — Dig Dig" },
      {
        property: "og:description",
        content:
          "Apoie o Dig Dig — uma plataforma de auditoria pública gratuita, financiada por quem acredita.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: ApoiarPage,
});

const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};
const TIGHT: React.CSSProperties = {
  fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
};
const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
};

const TEXT = "#0a0a0a";
const MUTED = "#5a5a5a";
const SUBTLE = "#9a9a9a";
const BORDER = "rgba(0,0,0,0.08)";

function fmt(n: number | undefined | null, fallback = "—"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

type Plano = {
  id: string;
  nome: string;
  publico: string;
  preco: string;
  periodo: string;
  features: string[];
  cta: string;
  ctaHref: string;
  destaque?: boolean;
};

const PLANOS: Plano[] = [
  {
    id: "gratuito",
    nome: "Gratuito",
    publico: "Qualquer cidadão",
    preco: "R$ 0",
    periodo: "para sempre",
    features: [
      "Acesso a todas as fichas de denúncia",
      "Análises profundas completas",
      "Scores e indícios de irregularidade",
      "Dados de todos os órgãos auditados",
    ],
    cta: "Começar grátis",
    ctaHref: "/cadastro",
  },
  {
    id: "investigador",
    nome: "Investigador",
    publico: "Jornalistas, assessores, candidatos",
    preco: "R$ 179",
    periodo: "/mês",
    features: [
      "Chat com IA sobre os atos auditados",
      "5 documentos gerados por mês",
      "Peças jurídicas, artigos e relatórios",
      "Alertas por email de novos atos",
    ],
    cta: "Assinar",
    ctaHref: "/cadastro?plano=investigador",
  },
  {
    id: "patrocinador",
    nome: "Patrocinador",
    publico: "Quem acredita na causa",
    preco: "R$ 990",
    periodo: "/ano",
    features: [
      "Tudo do plano Investigador",
      "Cobrança anual com desconto",
      "Nome listado como Patrocinador",
      "Badge exclusivo no perfil",
    ],
    cta: "Patrocinar",
    ctaHref: "/cadastro?plano=patrocinador",
    destaque: true,
  },
  {
    id: "profissional",
    nome: "Profissional",
    publico: "Escritórios e assessorias",
    preco: "R$ 679",
    periodo: "/mês",
    features: [
      "Chat com IA em volume estendido",
      "15 documentos gerados por mês",
      "Relatórios técnicos completos",
      "Monitoramento de múltiplos órgãos",
    ],
    cta: "Assinar",
    ctaHref: "/cadastro?plano=profissional",
  },
  {
    id: "api",
    nome: "API & Dados",
    publico: "Imprensa e plataformas",
    preco: "R$ 1.998",
    periodo: "/mês",
    features: [
      "API REST completa + webhooks",
      "Geração de documentos ilimitada",
      "10.000 chamadas/mês incluídas",
      "SLA e suporte direto",
    ],
    cta: "Falar com a gente",
    ctaHref: "mailto:regisalessander@gmail.com",
  },
  {
    id: "tecnico",
    nome: "Técnico",
    publico: "Órgãos, empresas, mandatos",
    preco: "Sob consulta",
    periodo: "",
    features: [
      "Monitoramento contínuo personalizado",
      "Estrutura para qualquer base de dados",
      "Peças e relatórios ilimitados",
      "Implantação e suporte dedicado",
    ],
    cta: "Falar com a gente",
    ctaHref: "mailto:regisalessander@gmail.com",
  },
];

function ApoiarPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    fetchStats("cau-pr").then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ ...INTER, background: "#fff", color: TEXT, minHeight: "100vh" }}>
      {/* ─── Hero with terrain background ─────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{ background: "#07080f", minHeight: "min(620px, 78vh)" }}
      >
        <ParticleField />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "70%",
            background:
              "linear-gradient(to top, rgba(7,8,15,0.92) 25%, rgba(7,8,15,0) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "30%",
            background:
              "linear-gradient(to bottom, rgba(7,8,15,0.85) 0%, rgba(7,8,15,0) 100%)",
          }}
        />

        {/* Nav */}
        <nav className="relative z-20" style={{ padding: "0 32px" }}>
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ ...TIGHT, fontWeight: 700, fontSize: 17, color: "#fff" }}>
                Dig Dig
              </span>
            </Link>
            <Link
              to="/"
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
              }}
            >
              ← Voltar
            </Link>
          </div>
        </nav>

        {/* Hero copy */}
        <div
          className="relative z-20"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 32px 80px" }}
        >
          <p
            style={{
              ...MONO,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Apoiar
          </p>
          <h1
            style={{
              ...TIGHT,
              fontSize: "clamp(40px, 6.5vw, 68px)",
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#fff",
              margin: "0 0 24px",
              maxWidth: 880,
            }}
          >
            Uma ferramenta pública.<br />
            <span style={{ color: "rgba(255,255,255,0.55)" }}>
              Financiada por quem acredita.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55,
              maxWidth: 600,
              margin: "0 0 48px",
            }}
          >
            O Dig Dig lê automaticamente os atos administrativos de órgãos públicos
            brasileiros e detecta irregularidades com IA. O resultado é aberto —
            sem paywall, sem cadastro obrigatório.
          </p>

          {/* Live stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 32,
              maxWidth: 760,
              paddingTop: 32,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              { v: fmt(stats?.total_atos), l: "documentos coletados" },
              { v: fmt(stats?.total_analisados), l: "analisados" },
              { v: fmt(stats?.total_criticos), l: "casos críticos" },
              { v: "R$ 0", l: "para começar" },
            ].map((s) => (
              <div key={s.l}>
                <p
                  style={{
                    ...MONO,
                    fontSize: 22,
                    fontWeight: 500,
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {s.v}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 6,
                  }}
                >
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Why support ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 32px 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
            gap: 48,
            alignItems: "start",
            paddingBottom: 80,
            borderBottom: `1px solid ${BORDER}`,
          }}
          className="md:[grid-template-columns:280px_1fr] [grid-template-columns:1fr]"
        >
          <div>
            <p
              style={{
                ...MONO,
                fontSize: 11,
                color: SUBTLE,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Por quê
            </p>
            <h2
              style={{
                ...TIGHT,
                fontSize: 32,
                fontWeight: 600,
                color: TEXT,
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Não temos investidor.
            </h2>
          </div>
          <div style={{ maxWidth: 640 }}>
            <p
              style={{
                ...TIGHT,
                fontSize: 22,
                fontWeight: 500,
                color: TEXT,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                margin: "0 0 16px",
              }}
            >
              Transparência pública não é privilégio.
            </p>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.65, margin: 0 }}>
              Quem financia a operação são pessoas e organizações que acreditam nisso.
              Você pode contribuir de duas formas: assinando um plano pago para uso
              profissional, ou simplesmente patrocinando o projeto para que ele
              continue gratuito para qualquer cidadão.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Plans ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div>
          {PLANOS.map((p) => (
            <article
              key={p.id}
              style={{
                borderBottom: `1px solid ${BORDER}`,
                padding: "56px 0",
                display: "grid",
                gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr) auto",
                gap: 48,
                alignItems: "start",
              }}
              className="md:[grid-template-columns:280px_1fr_auto] [grid-template-columns:1fr]"
            >
              {/* Left: name + audience */}
              <div>
                <p
                  style={{
                    ...MONO,
                    fontSize: 11,
                    color: p.destaque ? TEXT : SUBTLE,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  {p.publico}
                  {p.destaque && (
                    <span style={{ marginLeft: 8, color: SUBTLE }}>· apoie</span>
                  )}
                </p>
                <h3
                  style={{
                    ...TIGHT,
                    fontSize: 36,
                    fontWeight: 600,
                    color: TEXT,
                    margin: 0,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {p.nome}
                </h3>
                <p
                  style={{
                    ...TIGHT,
                    fontSize: 20,
                    color: MUTED,
                    margin: "16px 0 0",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: TEXT }}>{p.preco}</span>
                  {p.periodo && (
                    <span style={{ color: SUBTLE, fontSize: 15, marginLeft: 4 }}>
                      {p.periodo}
                    </span>
                  )}
                </p>
              </div>

              {/* Middle: features */}
              <div style={{ maxWidth: 520 }}>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {p.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontSize: 15,
                        color: MUTED,
                        lineHeight: 1.55,
                        paddingLeft: 18,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 9,
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: TEXT,
                        }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: CTA */}
              <div style={{ paddingTop: 4 }}>
                <a
                  href={p.ctaHref}
                  style={{
                    ...INTER,
                    display: "inline-block",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "12px 22px",
                    borderRadius: 4,
                    textDecoration: "none",
                    color: p.destaque ? "#fff" : TEXT,
                    background: p.destaque ? TEXT : "transparent",
                    border: p.destaque
                      ? `1px solid ${TEXT}`
                      : `1px solid ${BORDER}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.cta} →
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* ─── Footer note ─────────────────────────────────────────────── */}
        <section style={{ padding: "96px 0 120px", textAlign: "center" }}>
          <p
            style={{
              ...TIGHT,
              fontSize: 24,
              fontWeight: 500,
              color: TEXT,
              letterSpacing: "-0.01em",
              margin: "0 0 16px",
              maxWidth: 540,
              marginInline: "auto",
              lineHeight: 1.3,
            }}
          >
            Tudo que o Dig Dig encontra fica acessível.
          </p>
          <p
            style={{
              fontSize: 15,
              color: MUTED,
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            Os planos pagos desbloqueiam chat com IA e geração de documentos.
            Conteúdo, fichas e análises permanecem livres para qualquer pessoa.
          </p>
          <p style={{ fontSize: 13, color: SUBTLE }}>
            Dúvidas:{" "}
            <a
              href="mailto:regisalessander@gmail.com"
              style={{ color: MUTED, textDecoration: "underline" }}
            >
              regisalessander@gmail.com
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
