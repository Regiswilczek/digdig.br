import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Pesquisas & White Papers — Dig Dig" },
      {
        name: "description",
        content:
          "Todos os white papers do Dig Dig: metodologia, achados, custos e resultados reais da auditoria automatizada de atos administrativos públicos com IA.",
      },
      { property: "og:title", content: "Pesquisas & White Papers — Dig Dig" },
      {
        property: "og:description",
        content:
          "A documentação pública do que o Dig Dig encontrou, como encontrou e o que custou.",
      },
      { property: "og:type", content: "website" },
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
  component: BlogPage,
});

// ─── Papers registry ─────────────────────────────────────────────────────────
// Add new entries here (newest first) whenever a new white paper is published.
const PAPERS = [
  {
    numero: "04",
    slug: "/whitepaper-04-o-que-a-maquina-encontrou",
    titulo: "O Que a Máquina Encontrou",
    subtitulo: "Resultados reais de 1.096 atos do CAU/PR analisados por IA",
    resumo:
      "21 fichas de denúncia, 5 casos com score acima de 85, e o padrão central que emergiu: controle presidencial dos mecanismos disciplinares como instrumento político. A distribuição completa, os nomes mais recorrentes e o caso em que o sistema reconheceu o próprio erro.",
    data: "Abril 2026",
    tags: ["Resultados", "Análise Aprofundada", "Padrões"],
  },
  {
    numero: "03",
    slug: "/whitepaper-03-deliberacoes-e-primeiros-achados",
    titulo: "Quando as Deliberações Falam Mais Alto",
    subtitulo: "545 PDFs extraídos e primeiros achados com 41% de casos críticos",
    resumo:
      "Como o Dig Dig descobriu e abriu as deliberações do CAU/PR via WP REST API. 545 documentos extraídos, pipeline adaptado, e os primeiros achados — incluindo 41% de classificações que exigem atenção.",
    data: "Abril 2026",
    tags: ["Deliberações", "Extração", "Primeiros Achados"],
  },
  {
    numero: "02",
    slug: "/whitepaper-02-custo-e-controle",
    titulo: "Custo e Controle",
    subtitulo: "Como auditamos $23 desperdiçados e construímos 4 camadas de proteção",
    resumo:
      "O diagnóstico honesto de rodadas paralelas, bugs de debug e $23 consumidos sem resultado rastreado. A arquitetura de controle de custo que saiu disso: idempotência, guard 409, threshold automático e índice único parcial no banco.",
    data: "Março 2026",
    tags: ["Custos", "Arquitetura", "Lições"],
  },
  {
    numero: "01",
    slug: "/whitepaper-01-extracao-caupr",
    titulo: "Como Automatizamos a Auditoria do CAU/PR com IA",
    subtitulo: "O processo, a arquitetura e os obstáculos reais",
    resumo:
      "A jornada de zero até 400 portarias com texto extraído: scraper local (o servidor bloqueia IPs americanos), pdfplumber vs. OCR, pipeline Dig Dig Piper + Dig Dig Bug, prompt caching com 68k tokens de regimento e os custos reais de cada etapa.",
    data: "Março 2026",
    tags: ["Extração", "Pipeline", "Arquitetura"],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const INTER_TIGHT: React.CSSProperties = {
  fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const GOLD = "#F0C81E";
const BG = "#0a0a0a";
const SURFACE = "#111";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "rgba(255,255,255,0.88)";
const MUTED = "rgba(255,255,255,0.45)";

function BlogPage() {
  return (
    <div style={{ ...INTER, background: BG, minHeight: "100vh", color: TEXT }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{ ...INTER_TIGHT, fontWeight: 700, fontSize: 18, color: GOLD }}>
              Dig Dig
            </span>
          </Link>
          <Link
            to="/"
            style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
          >
            ← Voltar
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "64px 24px 40px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(240,200,30,0.12)",
            border: `1px solid rgba(240,200,30,0.25)`,
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: GOLD,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Pesquisas & White Papers
        </div>
        <h1
          style={{
            ...INTER_TIGHT,
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            margin: "0 0 16px",
            lineHeight: 1.15,
            color: "#fff",
          }}
        >
          O que encontramos,<br />como encontramos.
        </h1>
        <p style={{ fontSize: 16, color: MUTED, margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          Documentação pública de cada etapa da auditoria do CAU/PR — metodologia, custos reais,
          achados e lições. Atualizado a cada rodada significativa.
        </p>
      </header>

      {/* Papers list */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 96px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {PAPERS.map((p) => (
            <Link
              key={p.numero}
              to={p.slug as "/"}
              style={{ textDecoration: "none", display: "block" }}
            >
              <article
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "28px 32px",
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto",
                  gap: "0 24px",
                  alignItems: "start",
                  transition: "border-color 0.15s, background 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,200,30,0.3)";
                  (e.currentTarget as HTMLElement).style.background = "#161616";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                  (e.currentTarget as HTMLElement).style.background = SURFACE;
                }}
              >
                {/* Number */}
                <div
                  style={{
                    ...INTER_TIGHT,
                    fontSize: 13,
                    fontWeight: 700,
                    color: GOLD,
                    paddingTop: 3,
                    letterSpacing: "0.04em",
                  }}
                >
                  Nº {p.numero}
                </div>

                {/* Content */}
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: MUTED,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      {p.data}
                    </span>
                  </div>
                  <h2
                    style={{
                      ...INTER_TIGHT,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                      margin: "0 0 4px",
                      lineHeight: 1.25,
                    }}
                  >
                    {p.titulo}
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(240,200,30,0.7)",
                      margin: "0 0 12px",
                      fontWeight: 500,
                    }}
                  >
                    {p.subtitulo}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: MUTED,
                      margin: "0 0 16px",
                      lineHeight: 1.6,
                      maxWidth: 640,
                    }}
                  >
                    {p.resumo}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid rgba(255,255,255,0.1)`,
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: 500,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ paddingTop: 4, color: MUTED }}>
                  <ArrowUpRight size={18} />
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.2)",
            marginTop: 48,
            textAlign: "center",
          }}
        >
          Todos os dados são derivados diretamente dos atos oficiais publicados pelo CAU/PR.
          <br />
          Análises geradas automaticamente — conclusões jurídicas cabem a advogados.
        </p>
      </main>
    </div>
  );
}
