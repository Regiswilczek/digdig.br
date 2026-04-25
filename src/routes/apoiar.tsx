import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";

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

// ── Tokens ────────────────────────────────────────────────────────────────────
const SYNE: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties = { fontFamily: "'Space Mono', 'Courier New', monospace" };
const INTER: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };
const GOLD = "#F0C81E";
const BG = "#07080f";

// ── Data ──────────────────────────────────────────────────────────────────────
const PLANOS = [
  {
    id: "cidadao", nome: "Acesso Livre", preco: "R$ 0", periodo: "para sempre",
    publico: "Qualquer brasileiro", cta: "Começar grátis", destaque: false,
    features: ["Leitura completa de todas as auditorias", "5 perguntas no chat por mês"],
  },
  {
    id: "investigador", nome: "Apoio Ativo", preco: "R$ 197", periodo: "/mês",
    publico: "Jornalistas, candidatos, assessores", cta: "Apoiar", destaque: true,
    features: ["200 perguntas no chat por mês", "Exportação em PDF e HTML", "Fichas de denúncia prontas", "Alertas por email de novos atos"],
  },
  {
    id: "profissional", nome: "Apoio Institucional", preco: "R$ 597", periodo: "/mês",
    publico: "Escritórios jurídicos, assessorias", cta: "Apoiar", destaque: false,
    features: ["1.000 perguntas no chat por mês", "Exportação CSV, JSON, PDF, HTML", "Relatórios técnicos completos", "2 assentos"],
  },
  {
    id: "api", nome: "Ferramentas Avançadas", preco: "R$ 1.997", periodo: "/mês",
    publico: "Veículos de imprensa, plataformas", cta: "Falar com a gente", destaque: false,
    features: ["API de dados + webhooks", "10.000 calls por mês", "5 assentos com permissões", "SLA e suporte direto"],
  },
];

const CAMPANHAS = [
  { slug: "cau-pr", nome: "CAU/PR", tipo: "Conselho de Arquitetura e Urbanismo do Paraná", votos: 142, status: "em_analise" as const },
  { slug: "prefeitura-curitiba", nome: "Prefeitura de Curitiba", tipo: "Poder Executivo Municipal — PR", votos: 47, status: "na_fila" as const },
  { slug: "crm-pr", nome: "CRM/PR", tipo: "Conselho Regional de Medicina do Paraná", votos: 23, status: "na_fila" as const },
  { slug: "camara-curitiba", nome: "Câmara de Curitiba", tipo: "Poder Legislativo Municipal — PR", votos: 18, status: "na_fila" as const },
];

const PAPERS = [
  { n: "01", titulo: "Como Automatizamos a Auditoria do CAU/PR com IA", desc: "A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.", to: "/whitepaper-01-extracao-caupr" as const },
  { n: "02", titulo: "Quando a IA Custa Mais do Que Deveria", desc: "Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de solução.", to: "/whitepaper-02-custo-e-controle" as const },
  { n: "03", titulo: "Quando as Deliberações Falam Mais Alto", desc: "757 deliberações únicas, a descoberta da WP REST API e 41% de casos críticos nos primeiros achados.", to: "/whitepaper-03-deliberacoes-e-primeiros-achados" as const },
];

// Marquee items: mix white papers + pipeline stats
const TICKER_ITEMS = [
  "WP 01 — Como Automatizamos a Auditoria do CAU/PR com IA",
  "PIPELINE ATIVO · CAU/PR 262 / 400 portarias analisadas",
  "WP 02 — Quando a IA Custa Mais do Que Deveria",
  "64 CASOS CRÍTICOS DETECTADOS · 1 laranja confirmado",
  "WP 03 — Quando as Deliberações Falam Mais Alto",
  "686 ATOS JÁ ANALISADOS · acesso gratuito para todos",
  "WP 01 — Como Automatizamos a Auditoria do CAU/PR com IA",
  "PIPELINE ATIVO · CAU/PR 262 / 400 portarias analisadas",
  "WP 02 — Quando a IA Custa Mais do Que Deveria",
  "64 CASOS CRÍTICOS DETECTADOS · 1 laranja confirmado",
  "WP 03 — Quando as Deliberações Falam Mais Alto",
  "686 ATOS JÁ ANALISADOS · acesso gratuito para todos",
];

// ── Page ──────────────────────────────────────────────────────────────────────
function ApoiarPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="min-h-screen text-white" style={{ background: BG, ...INTER }}>

      {/* ── Keyframes ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dig-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dig-bg-pulse {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        .dig-marquee-track {
          animation: dig-marquee 55s linear infinite;
          display: flex;
          width: max-content;
        }
        .dig-marquee-track:hover { animation-play-state: paused; }
        .dig-video-placeholder {
          background: linear-gradient(135deg, #0d0e1a 0%, #180e0e 40%, #0a0e16 100%);
          background-size: 300% 300%;
          animation: dig-bg-pulse 14s ease infinite;
        }
      `}} />

      {/* ══ NAV ════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        style={{ background: `${BG}ee`, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Link to="/" className="text-white text-[12px] uppercase tracking-[0.22em]" style={SYNE}>
          DIG DIG
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[12px]" style={{ ...INTER, color: "rgba(255,255,255,0.35)" }}>
          <Link to="/solucoes" className="hover:text-white/70 transition-colors">Soluções</Link>
          <Link to="/apoiar" className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>Apoiar</Link>
        </div>
        <a
          href="/entrar"
          className="text-[11px] px-4 py-2 border transition-all hover:border-white/20 hover:text-white/60"
          style={{ ...MONO, borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.30)" }}
        >
          ENTRAR
        </a>
      </nav>

      {/* ══ MARQUEE — papers como notícias ═══════════════════════════════ */}
      <div
        className="fixed left-0 right-0 z-40 overflow-hidden"
        style={{ top: "57px", background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Label */}
        <div className="dig-marquee-track">
          {TICKER_ITEMS.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-4 flex-shrink-0"
              style={{ ...MONO, fontSize: "9px", letterSpacing: "0.18em", padding: "9px 0", color: "rgba(255,255,255,0.28)" }}
            >
              <span style={{ color: GOLD, opacity: 0.7, marginLeft: "3rem" }}>◆</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══ HERO — 3 colunas ═════════════════════════════════════════════ */}
      {/* Nav = ~57px, Ticker = ~35px → offset = 92px */}
      <section
        className="grid grid-cols-1 md:grid-cols-[2fr_3fr_2fr]"
        style={{
          minHeight: "calc(100svh - 92px)",
          marginTop: "92px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >

        {/* ── COLUNA ESQUERDA: Vídeo em loop ─────────────────────────── */}
        <div
          className="relative overflow-hidden dig-video-placeholder"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.05)",
            minHeight: "220px",
          }}
          onMouseEnter={() => videoRef.current?.pause()}
          onMouseLeave={() => videoRef.current?.play()}
        >
          {/* Vídeo real — substitua src quando tiver o arquivo */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.65 }}
            /* src="/videos/pipeline.mp4" */
          />

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
            }}
          />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-8">
            <div>
              <span
                className="inline-flex items-center gap-2"
                style={{ ...MONO, fontSize: "8px", letterSpacing: "0.28em", color: "rgba(255,255,255,0.25)" }}
              >
                <span className="h-[4px] w-[4px] rounded-full bg-[#4ade80] animate-pulse" style={{ boxShadow: "0 0 5px #4ade80" }} />
                PIPELINE ATIVO
              </span>
            </div>
            <div>
              <p style={{ ...MONO, fontSize: "8px", color: "rgba(255,255,255,0.13)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "4px" }}>
                Pausar com mouse
              </p>
              <div className="w-6 h-[1px]" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>
          </div>

          {/* Gold corner accent */}
          <div
            className="absolute top-0 left-0"
            style={{ width: "2px", height: "40px", background: GOLD, opacity: 0.6 }}
          />
          <div
            className="absolute top-0 left-0"
            style={{ height: "2px", width: "40px", background: GOLD, opacity: 0.6 }}
          />
        </div>

        {/* ── COLUNA CENTRAL: Headline + CTA ─────────────────────────── */}
        <div
          className="flex flex-col justify-center px-8 md:px-12 xl:px-16 py-16"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p
            className="mb-8"
            style={{ ...MONO, fontSize: "8px", letterSpacing: "0.4em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}
          >
            Nasce o Dig Dig — Abril 2026
          </p>

          <h1
            className="leading-[0.94] mb-6"
            style={{
              ...SYNE,
              fontSize: "clamp(2.2rem, 4.2vw, 5rem)",
              letterSpacing: "-0.04em",
              color: "rgba(255,255,255,0.93)",
            }}
          >
            Centenas de<br />
            documentos<br />
            publicados todo ano.<br />
            <span style={{ color: "rgba(255,255,255,0.16)" }}>Ninguém lê.</span>{" "}
            <span style={{ color: GOLD }}>Nós lemos.</span>
          </h1>

          <p
            className="mb-10"
            style={{
              ...INTER,
              fontSize: "clamp(13px, 1.3vw, 15px)",
              color: "rgba(255,255,255,0.36)",
              lineHeight: 1.85,
              maxWidth: "38ch",
            }}
          >
            Usamos IA para auditar atos administrativos de órgãos públicos.
            Cada irregularidade encontrada é documentada e publicada —{" "}
            <span style={{ color: "rgba(255,255,255,0.60)" }}>gratuita</span>{" "}
            — para qualquer cidadão.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="#contribuir"
              className="inline-block transition-all hover:opacity-85"
              style={{ ...SYNE, background: GOLD, color: BG, fontSize: "11px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", padding: "14px 32px" }}
            >
              Apoiar o Projeto
            </a>
            <Link
              to="/explorar"
              className="inline-block transition-colors hover:text-white/50"
              style={{ ...MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", padding: "14px 0" }}
            >
              Explorar dados →
            </Link>
          </div>
        </div>

        {/* ── COLUNA DIREITA: Contador de atos ───────────────────────── */}
        <div className="flex flex-col justify-center px-8 md:px-10 py-14 gap-10">
          {[
            { val: "1.789", label: "Atos coletados", color: "rgba(255,255,255,0.88)" },
            { val: "686", label: "Já analisados", color: "rgba(255,255,255,0.88)" },
            { val: "64", label: "Casos críticos", color: GOLD },
            { val: "R$ 0", label: "Para começar", color: "#4ade80" },
          ].map((s) => (
            <div key={s.label}>
              <span
                className="block leading-none tabular-nums mb-2"
                style={{
                  ...SYNE,
                  fontSize: "clamp(2rem, 3.2vw, 3.5rem)",
                  color: s.color,
                  letterSpacing: "-0.03em",
                }}
              >
                {s.val}
              </span>
              <span
                style={{
                  ...MONO,
                  fontSize: "8px",
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.20)",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ MANIFESTO BODY ══════════════════════════════════════════════════ */}
      <section className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-24 md:py-36">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-20 items-start">
          <div>
            <p className="text-[9px] uppercase tracking-[0.36em] mb-4" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
              O que é isso
            </p>
            <div className="w-8 h-[2px]" style={{ background: GOLD }} />
          </div>
          <div className="space-y-6" style={{ fontSize: "clamp(1rem, 1.5vw, 1.2rem)", color: "rgba(255,255,255,0.55)", lineHeight: 1.9 }}>
            <p>
              São portarias, deliberações e resoluções — dados públicos, pagos com dinheiro seu.
              Estão enterrados em PDFs numerados, sem contexto, sem índice.{" "}
              <strong style={{ color: "rgba(255,255,255,0.80)", fontWeight: 600 }}>A burocracia conta com isso.</strong>
            </p>
            <p>
              Usamos IA para escavar esse arquivo. Mapeamos irregularidades legais e morais.
              Sinalizamos padrões. Não afirmamos crimes — mostramos o que encontramos,
              e você decide o que fazer com isso.
            </p>
            <p style={{ color: "rgba(255,255,255,0.80)", fontStyle: "italic", borderLeft: `3px solid ${GOLD}`, paddingLeft: "1.25rem" }}>
              "É como se todo o Brasil se juntasse para auditar o próprio governo. Uma escavadeira coletiva."
            </p>
          </div>
        </div>
      </section>

      {/* ══ PRÓXIMAS AUDITORIAS ═════════════════════════════════════════════ */}
      <section id="auditorias" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-20 md:py-28">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.36em] mb-5" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                Próximas auditorias
              </p>
              <h2
                className="font-bold leading-[0.98]"
                style={{ ...SYNE, fontSize: "clamp(2.2rem, 5vw, 4.5rem)", letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)" }}
              >
                A comunidade vota.<br />A equipe decide.
              </h2>
            </div>
            <button
              className="text-[10px] uppercase tracking-[0.18em] px-5 py-3 border transition-all hover:border-white/18 hover:text-white/55 flex-shrink-0"
              style={{ ...MONO, borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.28)" }}
            >
              + Nominar órgão
            </button>
          </div>

          <p className="text-[15px] leading-relaxed mb-12 max-w-2xl" style={{ color: "rgba(255,255,255,0.40)" }}>
            Os órgãos mais votados ficam no topo da fila. A equipe seleciona os próximos
            conforme a capacidade técnica e o tamanho do acervo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px]" style={{ background: "rgba(255,255,255,0.05)" }}>
            {CAMPANHAS.map((c) => {
              const st = {
                concluida: { label: "Auditoria publicada", color: "#4ade80" },
                em_analise: { label: "Em análise", color: GOLD },
                na_fila: { label: "Na fila", color: "rgba(255,255,255,0.20)" },
              }[c.status];
              return (
                <div key={c.slug} className="p-8 md:p-10 flex flex-col gap-6" style={{ background: BG }}>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] mb-3" style={{ ...MONO, color: "rgba(255,255,255,0.16)" }}>
                      {c.tipo}
                    </p>
                    <h3 className="font-bold" style={{ ...SYNE, fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)", color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em" }}>
                      {c.nome}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="flex items-center gap-2 text-[12px]" style={{ ...INTER, color: st.color }}>
                      <span className="h-[5px] w-[5px] rounded-full flex-shrink-0" style={{ background: st.color }} />
                      {st.label}
                    </span>
                    <span className="text-[12px] tabular-nums" style={{ ...MONO, color: "rgba(255,255,255,0.22)" }}>
                      {c.votos} votos
                    </span>
                  </div>
                  {c.status === "na_fila" && (
                    <button
                      className="text-[10px] uppercase tracking-[0.16em] py-3.5 border text-center transition-all hover:border-white/18 hover:text-white/55 mt-1"
                      style={{ ...MONO, borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)" }}
                    >
                      ★ Votar nesta auditoria
                    </button>
                  )}
                  {c.status === "em_analise" && (
                    <span className="text-[10px] uppercase tracking-[0.16em]" style={{ ...MONO, color: GOLD }}>
                      Em andamento —
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ COMO FUNCIONA ═══════════════════════════════════════════════════ */}
      <section style={{ background: "#0b0c13", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-20 md:py-32">
          <p className="text-[9px] uppercase tracking-[0.36em] mb-16" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
            Como funciona
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
            {[
              { n: "01", titulo: "Votar", texto: "A comunidade nomina órgãos e distribui votos. Cada usuário tem 3 votos gratuitos por mês." },
              { n: "02", titulo: "Decidir", texto: "A equipe seleciona os próximos conforme capacidade real. Sem prometer o que não pode entregar ainda." },
              { n: "03", titulo: "Escavar", texto: "A IA analisa todos os documentos disponíveis. Trabalho humano revisa e aprofunda os casos críticos." },
              { n: "04", titulo: "Publicar", texto: "O resultado fica público para qualquer pessoa. Gratuito. Sem exceção. Sem paywall." },
            ].map((p) => (
              <div key={p.n} className="px-8 py-10 flex flex-col gap-8" style={{ background: "#0b0c13" }}>
                <span className="font-bold leading-none" style={{ ...SYNE, fontSize: "clamp(3rem, 5vw, 5rem)", color: GOLD, opacity: 0.85, letterSpacing: "-0.04em" }}>
                  {p.n}
                </span>
                <div>
                  <h3 className="font-bold mb-3" style={{ ...SYNE, fontSize: "1.2rem", color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
                    {p.titulo}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.38)" }}>
                    {p.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTRIBUIR ══════════════════════════════════════════════════════ */}
      <section id="contribuir" className="relative overflow-hidden" style={{ background: "#06070b" }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ opacity: 0.04 }}>
          <span className="absolute right-[-0.1em] top-[-0.2em] font-bold leading-none" style={{ ...SYNE, fontSize: "clamp(18rem, 35vw, 32rem)", color: GOLD, letterSpacing: "-0.05em" }}>
            R$
          </span>
        </div>
        <div className="relative max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-24 md:py-36">
          <p className="text-[9px] uppercase tracking-[0.36em] mb-6" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
            Contribuir
          </p>
          <h2 className="font-bold leading-[0.96] mb-8" style={{ ...SYNE, fontSize: "clamp(2.6rem, 7vw, 6.5rem)", letterSpacing: "-0.04em", color: "rgba(255,255,255,0.92)", maxWidth: "14ch" }}>
            Cada contribuição financia a escavação.
          </h2>

          <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 md:gap-20 items-start mt-14">
            <div>
              <p className="text-[15px] leading-relaxed mb-8" style={{ ...INTER, color: "rgba(255,255,255,0.48)" }}>
                Não temos investidor. As contribuições cobrem os custos operacionais — IA, infraestrutura
                e trabalho humano de investigação. Todo excedente é reinvestido em tecnologia para ampliar
                a capacidade da ferramenta.
              </p>
              <p className="text-[15px] leading-relaxed font-semibold" style={{ ...INTER, color: "rgba(255,255,255,0.78)" }}>
                O Dig Dig pertence às pessoas que o financiam.
              </p>
            </div>
            <div>
              <div className="flex flex-wrap gap-2 mb-5">
                {["R$ 25", "R$ 50", "R$ 100", "Valor livre"].map((v, i) => (
                  <button
                    key={v}
                    className="text-[12px] font-semibold uppercase tracking-[0.14em] px-5 py-3 border transition-all"
                    style={{ ...MONO, borderColor: i === 1 ? GOLD : "rgba(255,255,255,0.10)", color: i === 1 ? GOLD : "rgba(255,255,255,0.40)", background: i === 1 ? `${GOLD}10` : "transparent" }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-8">
                {["Uma vez", "Todo mês"].map((f, i) => (
                  <button
                    key={f}
                    className="text-[11px] font-medium uppercase tracking-[0.14em] px-5 py-2.5 border transition-all"
                    style={{ ...MONO, borderColor: i === 1 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)", color: i === 1 ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.28)" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <a
                href="/contribuir"
                className="inline-flex items-center gap-3 transition-all hover:opacity-85"
                style={{ ...SYNE, background: GOLD, color: BG, fontSize: "12px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", padding: "16px 32px" }}
              >
                Contribuir via PIX ou cartão
              </a>
              <p className="mt-4 text-[11px]" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>
                Mínimo R$ 25 · Primeira contribuição ganha 1 mês de Apoio Ativo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ APOIO INSTITUCIONAL ═════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-16 md:py-20">
          <div className="grid md:grid-cols-[1fr_2fr] gap-10 md:gap-20 items-center">
            <div>
              <p className="text-[9px] uppercase tracking-[0.36em] mb-4" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                Apoio institucional
              </p>
              <h2 className="font-bold leading-tight" style={{ ...SYNE, fontSize: "clamp(1.6rem, 3vw, 2.6rem)", color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em" }}>
                Empresas e<br />organizações.
              </h2>
            </div>
            <div>
              <p className="text-[15px] leading-relaxed mb-6" style={{ ...INTER, color: "rgba(255,255,255,0.40)" }}>
                Empresas e organizações que acreditam na transparência pública podem se tornar
                Apoiadores Oficiais do Dig Dig. O modelo é negociado diretamente — sem tabela de preços,
                sem pacote fechado.
              </p>
              <a href="mailto:apoie@digdig.com.br" className="text-[14px] font-semibold transition-colors hover:text-white/70" style={{ ...INTER, color: "rgba(255,255,255,0.50)" }}>
                apoie@digdig.com.br →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NÍVEIS DE APOIO ═════════════════════════════════════════════════ */}
      <section id="planos" style={{ background: "#0b0c13" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-20 md:py-32">
          <p className="text-[9px] uppercase tracking-[0.36em] mb-6" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
            Ferramentas avançadas para profissionais
          </p>
          <h2 className="font-bold mb-4" style={{ ...SYNE, fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.03em", color: "rgba(255,255,255,0.90)" }}>
            Níveis de Apoio
          </h2>
          <p className="text-[15px] leading-relaxed mb-16 max-w-2xl" style={{ ...INTER, color: "rgba(255,255,255,0.33)" }}>
            O acesso ao banco auditado é gratuito para qualquer cidadão. Os níveis são para quem usa
            a plataforma profissionalmente — jornalistas, escritórios, veículos, assessorias.
          </p>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {PLANOS.map((plano) => (
              <div
                key={plano.id}
                className="relative py-10 md:py-12"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: plano.destaque ? `3px solid ${GOLD}` : "3px solid transparent", paddingLeft: plano.destaque ? "clamp(1rem, 2vw, 2rem)" : "0" }}
              >
                {plano.destaque && (
                  <span className="absolute top-10 right-0 text-[8px] font-bold uppercase tracking-[0.22em] px-2.5 py-1" style={{ ...MONO, color: GOLD, background: `${GOLD}15` }}>
                    mais popular
                  </span>
                )}
                <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
                  <div className="flex-shrink-0" style={{ minWidth: "220px" }}>
                    <p className="font-bold mb-1" style={{ ...SYNE, fontSize: "1.1rem", color: plano.destaque ? "white" : "rgba(255,255,255,0.68)", letterSpacing: "-0.01em" }}>
                      {plano.nome}
                    </p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="font-bold leading-none" style={{ ...SYNE, fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: plano.destaque ? GOLD : "rgba(255,255,255,0.88)", letterSpacing: "-0.025em" }}>
                        {plano.preco}
                      </span>
                      <span className="text-[11px]" style={{ ...MONO, color: "rgba(255,255,255,0.22)" }}>
                        {plano.periodo}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px]" style={{ ...INTER, color: "rgba(255,255,255,0.20)" }}>
                      {plano.publico}
                    </p>
                  </div>
                  <ul className="flex-1 grid sm:grid-cols-2 gap-x-8 gap-y-2.5 lg:pt-1">
                    {plano.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ ...INTER, color: "rgba(255,255,255,0.38)" }}>
                        <span className="flex-shrink-0 text-[10px] mt-0.5" style={{ color: plano.destaque ? `${GOLD}70` : "rgba(255,255,255,0.15)" }}>▸</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex-shrink-0 lg:pt-1">
                    <a
                      href="/cadastro"
                      className="inline-block transition-all hover:opacity-80"
                      style={plano.destaque
                        ? { ...SYNE, background: GOLD, color: BG, fontSize: "10px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", padding: "14px 24px" }
                        : { ...MONO, border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.30)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", padding: "14px 24px" }}
                    >
                      {plano.cta}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[11px]" style={{ ...MONO, color: "rgba(255,255,255,0.15)" }}>
            Cartão ou PIX · Sem fidelidade · Notas fiscais emitidas automaticamente.
          </p>
        </div>
      </section>

      {/* ══ RADICAL TRANSPARÊNCIA ═══════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-20 md:py-32">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-20 items-start">
            <div>
              <p className="text-[9px] uppercase tracking-[0.36em] mb-6" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
                Para onde vai o dinheiro
              </p>
              <h2 className="font-bold leading-[0.96]" style={{ ...SYNE, fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "rgba(255,255,255,0.90)", letterSpacing: "-0.03em" }}>
                Radical transparência.
              </h2>
              <p className="text-[14px] leading-relaxed mt-6" style={{ ...INTER, color: "rgba(255,255,255,0.32)" }}>
                O acesso básico sempre será gratuito. Contribuições financiam os servidores
                e permitem que o projeto expanda para novas instituições.
              </p>
            </div>
            <div className="flex flex-col gap-10">
              {[
                { item: "Infraestrutura de IA", pct: 55, desc: "API Anthropic — o custo de analisar cada ato público" },
                { item: "Servidores & Hospedagem", pct: 25, desc: "Railway, Supabase, Redis — o que mantém o sistema vivo" },
                { item: "Desenvolvimento", pct: 20, desc: "Manutenção, novas instituições, melhorias contínuas" },
              ].map(({ item, pct, desc }) => (
                <div key={item}>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-[13px] font-semibold" style={{ ...INTER, color: "rgba(255,255,255,0.65)" }}>{item}</span>
                    <span className="font-bold" style={{ ...SYNE, fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: GOLD, letterSpacing: "-0.02em" }}>{pct}%</span>
                  </div>
                  <div className="h-[2px] w-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}55)` }} />
                  </div>
                  <p className="text-[12px]" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHITE PAPERS ════════════════════════════════════════════════════ */}
      <section style={{ background: "#0b0c13", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-20 md:py-28">
          <p className="text-[9px] uppercase tracking-[0.36em] mb-12" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
            White Papers
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px]" style={{ background: "rgba(255,255,255,0.05)" }}>
            {PAPERS.map((p) => (
              <div key={p.n} className="p-8 md:p-10 flex flex-col gap-6" style={{ background: "#0b0c13" }}>
                <span className="text-[9px] uppercase tracking-[0.18em]" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>Nº {p.n}</span>
                <h3 className="text-[1rem] font-semibold leading-snug flex-1" style={{ ...INTER, color: "rgba(255,255,255,0.68)" }}>{p.titulo}</h3>
                <p className="text-[12px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.28)" }}>{p.desc}</p>
                <Link to={p.to} className="text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors hover:text-white/55 mt-auto" style={{ ...INTER, color: "rgba(255,255,255,0.30)" }}>
                  Ler →
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[12px] leading-relaxed" style={{ ...INTER, color: "rgba(255,255,255,0.18)" }}>
            Registro técnico público sobre a construção do Dig Dig — metodologia, decisões e números reais.
          </p>
        </div>
      </section>

      {/* ══ FOOTER CTA ══════════════════════════════════════════════════════ */}
      <section>
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 xl:px-20 py-24 text-center">
          <p className="text-[9px] uppercase tracking-[0.36em] mb-6" style={{ ...MONO, color: "rgba(255,255,255,0.18)" }}>
            Comece agora
          </p>
          <h2 className="font-bold mb-10" style={{ ...SYNE, fontSize: "clamp(1.8rem, 4vw, 3.5rem)", color: "rgba(255,255,255,0.88)", letterSpacing: "-0.025em" }}>
            Pronto para escavar?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <a
              href="/cadastro"
              className="inline-block transition-all hover:opacity-85"
              style={{ ...SYNE, background: GOLD, color: BG, fontSize: "11px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", padding: "16px 40px" }}
            >
              Criar conta grátis
            </a>
            <Link
              to="/"
              className="inline-block transition-all hover:border-white/14 hover:text-white/40"
              style={{ ...MONO, border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.22)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", padding: "16px 28px" }}
            >
              ← Voltar ao início
            </Link>
          </div>
          <p className="text-[11px]" style={{ ...INTER, color: "rgba(255,255,255,0.16)" }}>
            Dúvidas:{" "}
            <a href="mailto:regisalessander@gmail.com" className="hover:text-white/35 transition-colors">
              regisalessander@gmail.com
            </a>
          </p>
        </div>
      </section>

    </div>
  );
}
