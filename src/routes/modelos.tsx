import { createFileRoute, Link } from "@tanstack/react-router";
import { ParticleField } from "@/components/ParticleField";

export const Route = createFileRoute("/modelos")({
  head: () => ({
    meta: [
      { title: "Modelos — Dig Dig" },
      {
        name: "description",
        content:
          "Os três motores de IA do Dig Dig: Piper (triagem), Bud (análise profunda) e Zew (investigação histórica).",
      },
      { property: "og:title", content: "Modelos — Dig Dig" },
      {
        property: "og:description",
        content:
          "Piper, Bud e Zew — os modelos do Dig Dig especializados em auditoria de atos públicos.",
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
  component: ModelosPage,
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

type Benchmark = { label: string; valor: string };
type Modelo = {
  id: string;
  nome: string;
  classe: string;
  geracao: string;
  tagline: string;
  descricao: string;
  janelaContexto: string;
  saidaMaxima: string;
  latencia: string;
  capacidades: string[];
  benchmarks: Benchmark[];
  idealPara: string[];
  disponivel: boolean;
};

const MODELOS: Modelo[] = [
  {
    id: "piper",
    nome: "Piper",
    classe: "Modelo rápido",
    geracao: "Geração 4.5",
    tagline: "Velocidade em escala, com precisão suficiente para triagem.",
    descricao:
      "Modelo compacto otimizado para throughput. Foi desenhado para processar volumes massivos de texto técnico — leis, portarias, regimentos — classificando, extraindo entidades e estruturando dados em JSON estável. Roda barato, responde em sub-segundo e mantém consistência ao longo de milhares de chamadas paralelas.",
    janelaContexto: "200K tokens",
    saidaMaxima: "8K tokens",
    latencia: "Baixa — sub-segundo por requisição",
    capacidades: [
      "Saída JSON estruturada e validada",
      "Extração de entidades nomeadas",
      "Classificação multi-rótulo",
      "Tool use e function calling",
      "Prompt caching (até 90% de desconto)",
      "Multilíngue, com forte desempenho em PT-BR",
    ],
    benchmarks: [
      { label: "MMLU (conhecimento geral)", valor: "73,5%" },
      { label: "GPQA Diamond (ciências)", valor: "33,3%" },
      { label: "HumanEval (saída estruturada)", valor: "75,9%" },
    ],
    idealPara: [
      "Triagem de grandes acervos documentais",
      "Pipelines de classificação em lote",
      "Extração de campos a partir de texto livre",
    ],
    disponivel: true,
  },
  {
    id: "bud",
    nome: "Bud",
    classe: "Modelo de raciocínio",
    geracao: "Geração 4.6",
    tagline: "Raciocínio jurídico de ponta com contexto longo.",
    descricao:
      "Modelo de alta capacidade para tarefas que exigem compreensão profunda: ler um regimento de 70 mil tokens, cruzar com um ato administrativo, identificar o artigo violado e construir um argumento coerente, com citações diretas. Equilibra qualidade de raciocínio, fidelidade ao texto fonte e custo controlado via cache.",
    janelaContexto: "200K tokens",
    saidaMaxima: "64K tokens",
    latencia: "Média — alguns segundos por análise",
    capacidades: [
      "Raciocínio jurídico passo a passo",
      "Citação literal com referência ao trecho fonte",
      "Síntese de documentos longos",
      "Geração de peças estruturadas (fichas, relatórios)",
      "Tool use, function calling e respostas em streaming",
      "Prompt caching ephemeral de 5 minutos",
    ],
    benchmarks: [
      { label: "MMLU (conhecimento geral)", valor: "88,7%" },
      { label: "GPQA Diamond (ciências)", valor: "59,4%" },
      { label: "HumanEval (raciocínio estruturado)", valor: "93,7%" },
    ],
    idealPara: [
      "Aprofundamento de casos suspeitos",
      "Geração de fichas com fundamentação legal",
      "Chat conversacional sobre o acervo (RAG)",
    ],
    disponivel: true,
  },
  {
    id: "zew",
    nome: "Zew",
    classe: "Modelo de raciocínio estendido",
    geracao: "Geração 4.7",
    tagline: "Raciocínio prolongado para investigação sistêmica.",
    descricao:
      "O modelo mais capaz da família. Suporta raciocínio estendido — pode pensar por minutos antes de responder, mantendo cadeias longas de inferência sobre acervos de décadas. Construído para perguntas que nenhum modelo rápido resolve: identificar padrões longitudinais, correlacionar gestões distintas e produzir narrativas investigativas com profundidade analítica.",
    janelaContexto: "200K tokens (com extended thinking)",
    saidaMaxima: "32K tokens",
    latencia: "Alta — projetado para profundidade, não velocidade",
    capacidades: [
      "Extended thinking (raciocínio prolongado visível)",
      "Análise longitudinal multi-período",
      "Correlação cruzada entre órgãos",
      "Construção de narrativas investigativas",
      "Tool use avançado e agentic workflows",
      "Auto-verificação e checagem de consistência",
    ],
    benchmarks: [
      { label: "MMLU (conhecimento geral)", valor: "91,4%+" },
      { label: "GPQA Diamond (ciências)", valor: "74,9%" },
      { label: "Raciocínio estendido", valor: "Sim" },
    ],
    idealPara: [
      "Auditoria de uma gestão inteira",
      "Cruzamento histórico entre décadas",
      "Investigações comparativas entre órgãos",
    ],
    disponivel: false,
  },
];

function ModelosPage() {
  return (
    <div style={{ ...INTER, background: "#fff", color: TEXT, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ─── Hero with terrain background ─────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: "#07080f",
          minHeight: "min(560px, 70vh)",
        }}
      >
        <ParticleField />

        {/* Bottom fade for legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "70%",
            background:
              "linear-gradient(to top, rgba(7,8,15,0.92) 25%, rgba(7,8,15,0) 100%)",
          }}
        />
        {/* Top fade for nav */}
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
        <nav className="relative z-20 px-6 md:px-8">
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
          className="relative z-20 px-6 md:px-8 pt-20 md:pt-[120px] pb-16 md:pb-20"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
          }}
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
            Modelos
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
              maxWidth: 820,
            }}
          >
            Três modelos.<br />
            <span style={{ color: "rgba(255,255,255,0.55)" }}>
              Um único pipeline de auditoria pública.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55,
              maxWidth: 600,
              margin: 0,
            }}
          >
            Cada modelo do Dig Dig é construído para um momento específico da
            investigação — da triagem em escala à análise profunda de uma gestão inteira.
          </p>
        </div>
      </header>

      {/* ─── Models list ───────────────────────────────────────────────── */}
      <main
        style={{ maxWidth: 1100, margin: "0 auto" }}
        className="px-6 md:px-8"
      >
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {MODELOS.map((m) => (
            <article
              key={m.id}
              style={{
                borderBottom: `1px solid ${BORDER}`,
                alignItems: "start",
              }}
              className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 py-12 md:py-[72px]"
            >
              {/* Left: name + role */}
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
                  {m.papel}
                  {!m.disponivel && (
                    <span style={{ marginLeft: 8, color: SUBTLE }}>· em breve</span>
                  )}
                </p>
                <h2
                  style={{
                    ...TIGHT,
                    fontWeight: 600,
                    color: m.disponivel ? TEXT : SUBTLE,
                    margin: 0,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                  className="text-[36px] md:text-[44px]"
                >
                  {m.nome}
                </h2>
              </div>

              {/* Right: content */}
              <div style={{ maxWidth: 640, minWidth: 0 }}>
                <p
                  style={{
                    ...TIGHT,
                    fontWeight: 500,
                    color: TEXT,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    margin: "0 0 16px",
                  }}
                  className="text-[19px] md:text-[22px]"
                >
                  {m.tagline}
                </p>
                <p
                  style={{
                    color: MUTED,
                    lineHeight: 1.65,
                    margin: "0 0 28px",
                  }}
                  className="text-[15px] md:text-[16px]"
                >
                  {m.descricao}
                </p>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3"
                >
                  {m.capacidades.map((c) => (
                    <li
                      key={c}
                      style={{
                        fontSize: 14,
                        color: MUTED,
                        lineHeight: 1.5,
                        paddingLeft: 16,
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
                          background: m.disponivel ? TEXT : SUBTLE,
                        }}
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* ─── Footer note ─────────────────────────────────────────────── */}
        <section
          style={{
            padding: "80px 0 120px",
            textAlign: "center",
          }}
        >
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
            Os três rodam sobre a mesma base de dados pública.
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
            Tudo que o Dig Dig encontra — fichas, análises, padrões — fica acessível.
            Sem paywall no conteúdo.
          </p>
          <div
            style={{
              display: "inline-flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              to="/explorar"
              style={{
                ...INTER,
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: TEXT,
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Explorar resultados
            </Link>
            <Link
              to="/blog"
              style={{
                ...INTER,
                fontSize: 14,
                fontWeight: 500,
                color: TEXT,
                border: `1px solid ${BORDER}`,
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Ler white papers
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
