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
    numero: "10",
    slug: "/whitepaper-10-antes-da-proxima-onda",
    titulo: "Antes da Próxima Onda",
    subtitulo: "Um mês polindo a espinha dorsal — CVSS-A, meta-tags, conexões, ATLAS",
    resumo:
      "O sprint que ninguém vê: scoring de irregularidades inspirado em CVSS (cyber segurança) com seis dimensões reproduzíveis, meta-tags que nomeiam padrões em vez de eventos, painel de conexões virando ferramenta de pesquisa, painel da conta com favoritos, e o quarto agente — ATLAS — rodando agora pra organizar 3.392 documentos antes do Piper.",
    data: "Abril 2026",
    tags: ["CVSS-A", "ATLAS", "Meta-Tags", "Conexões", "Quatro Agentes"],
  },
  {
    numero: "09",
    slug: "/whitepaper-09-dados-o-que-fazer",
    titulo: "Dados: O Que Fazer Com Eles",
    subtitulo: "Tags, Dune Analytics, linhas investigativas e a pergunta que mudou",
    resumo:
      "A pausa estratégica nas rodadas de análise, a conversa com Dan Niero sobre indexação como o Dune Analytics, a taxonomia de 60 tags em 9 categorias, a evolução dos critérios de IA (Mindset de Auditoria, base legal expandida, princípio de linguagem) e a arquitetura dos três agentes — Piper, Bud e Zew — documentada antes do próximo sprint.",
    data: "Abril 2026",
    tags: ["Tags", "Indexação", "Pipeline", "Três Agentes"],
  },
  {
    numero: "08",
    slug: "/whitepaper-08-tres-dias",
    titulo: "Três Dias Sem Dormir",
    subtitulo: "Como o corpus foi de 2.300 para 7.718 documentos — e por que a Dig Dig vai abrir por convite",
    resumo:
      "Praticamente 72 horas consecutivas no projeto: a frustração com os dados que o portal não entregou, a descoberta do Implanta, 2.985 diárias e 44 passagens no banco, 1.674 análises com resultados conclusivos, U$0,40 por documento calibrado, os testes do Zew em amostras — e a decisão de abrir por convite.",
    data: "Abril 2026",
    tags: ["Corpus", "Dados Financeiros", "Implanta", "Por Convite"],
  },
  {
    numero: "07",
    slug: "/whitepaper-07-pre-auditoria-integrada",
    titulo: "Pré-Auditoria Integrada do CAU/PR",
    subtitulo: "1.789 atos, dois PADs secretos ativos e quatro padrões sistêmicos documentados",
    resumo:
      "A síntese antes do Zew: controle presidencial dos mecanismos disciplinares documentado em três gestões consecutivas, dois processos disciplinares com 20 e 12 meses em sigilo total, 14 atas plenárias consecutivas ausentes do site oficial, e a rede de três servidores não-eleitos que opera o aparato investigativo. O que o Piper e o Bud encontraram — estruturado para o Zew concluir.",
    data: "Abril 2026",
    tags: ["Síntese", "Padrões Sistêmicos", "Cronologia", "Lacunas"],
  },
  {
    numero: "06",
    slug: "/whitepaper-06-do-gabinete-ao-terminal",
    titulo: "Do Gabinete ao Terminal",
    subtitulo: "Mapeamos o Portal da Transparência do CAU/PR e encontramos o que ele esconde",
    resumo:
      "96 páginas vasculhadas via WP REST API, 28 seções analisadas, 238 dispensas eletrônicas acessíveis — e diárias, passagens e salários simplesmente offline. O que o portal promete, o que entrega, e por que isso importa. Com as capturas de tela da investigação manual que originou o Dig Dig.",
    data: "Abril 2026",
    tags: ["Portal da Transparência", "Garimpo", "Dados Ausentes", "Fase 3"],
  },
  {
    numero: "05",
    slug: "/whitepaper-05-quando-a-maquina-entra-na-sala",
    titulo: "Quando a Máquina Entra na Sala",
    subtitulo: "179 atas plenárias, OCR sem Tesseract e o que o quórum revela que a portaria esconde",
    resumo:
      "Como o corpus cresceu de 1.096 para mais de 1.340 documentos: portarias históricas escaneadas desbloqueadas com PyMuPDF + Claude vision, atas plenárias analisadas diretamente pelo Sonnet, 18 reuniões sem ata publicada descobertas — e o pipeline que passou a ser observável em tempo real.",
    data: "Abril 2026",
    tags: ["Atas Plenárias", "OCR", "Pipeline ao Vivo"],
  },
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

const BG = "#ffffff";
const TEXT = "#0a0a0a";
const MUTED = "#6b6b6b";
const SUBTLE = "#a0a0a0";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_STRONG = "rgba(0,0,0,0.16)";

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
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{ ...INTER_TIGHT, fontWeight: 700, fontSize: 17, color: TEXT, letterSpacing: "-0.01em" }}>
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
          maxWidth: 880,
          margin: "0 auto",
          padding: "120px 32px 80px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: SUBTLE,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Pesquisas & White Papers
        </div>
        <h1
          style={{
            ...INTER_TIGHT,
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 700,
            margin: "0 0 24px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: TEXT,
          }}
        >
          O que encontramos,<br />como encontramos.
        </h1>
        <p style={{ fontSize: 17, color: MUTED, margin: 0, maxWidth: 580, lineHeight: 1.55 }}>
          Documentação pública de cada etapa da auditoria do CAU/PR — metodologia, custos reais,
          achados e lições. Atualizado a cada rodada significativa.
        </p>
      </header>

      {/* Papers list */}
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "0 32px 120px" }}>
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {PAPERS.map((p) => (
            <Link
              key={p.numero}
              to={p.slug as "/"}
              style={{ textDecoration: "none", display: "block" }}
            >
              <article
                style={{
                  borderBottom: `1px solid ${BORDER}`,
                  padding: "40px 0",
                  display: "grid",
                  gridTemplateColumns: "80px 1fr auto",
                  gap: "0 32px",
                  alignItems: "start",
                  transition: "opacity 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const arrow = (e.currentTarget as HTMLElement).querySelector("[data-arrow]") as HTMLElement | null;
                  if (arrow) arrow.style.transform = "translate(2px, -2px)";
                  const title = (e.currentTarget as HTMLElement).querySelector("[data-title]") as HTMLElement | null;
                  if (title) title.style.color = MUTED;
                }}
                onMouseLeave={(e) => {
                  const arrow = (e.currentTarget as HTMLElement).querySelector("[data-arrow]") as HTMLElement | null;
                  if (arrow) arrow.style.transform = "translate(0,0)";
                  const title = (e.currentTarget as HTMLElement).querySelector("[data-title]") as HTMLElement | null;
                  if (title) title.style.color = TEXT;
                }}
              >
                {/* Number */}
                <div
                  style={{
                    ...INTER_TIGHT,
                    fontSize: 13,
                    fontWeight: 500,
                    color: SUBTLE,
                    paddingTop: 6,
                    letterSpacing: "0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Nº {p.numero}
                </div>

                {/* Content */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: SUBTLE,
                        letterSpacing: "0.04em",
                        fontWeight: 500,
                      }}
                    >
                      {p.data}
                    </span>
                  </div>
                  <h2
                    data-title
                    style={{
                      ...INTER_TIGHT,
                      fontSize: 24,
                      fontWeight: 700,
                      color: TEXT,
                      margin: "0 0 8px",
                      lineHeight: 1.2,
                      letterSpacing: "-0.015em",
                      transition: "color 0.15s",
                    }}
                  >
                    {p.titulo}
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: TEXT,
                      margin: "0 0 16px",
                      fontWeight: 400,
                      lineHeight: 1.4,
                    }}
                  >
                    {p.subtitulo}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: MUTED,
                      margin: "0 0 20px",
                      lineHeight: 1.6,
                      maxWidth: 620,
                    }}
                  >
                    {p.resumo}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 12,
                          color: SUBTLE,
                          fontWeight: 500,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div
                  data-arrow
                  style={{
                    paddingTop: 6,
                    color: SUBTLE,
                    transition: "transform 0.2s ease",
                  }}
                >
                  <ArrowUpRight size={20} strokeWidth={1.5} />
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            fontSize: 13,
            color: SUBTLE,
            marginTop: 64,
            textAlign: "center",
            lineHeight: 1.6,
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

