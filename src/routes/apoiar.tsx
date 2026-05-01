import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { ParticleField } from "@/components/ParticleField";
import { fetchStats, type PublicStats } from "@/lib/api";
import { API_URL } from "@/lib/api";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar | Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig é uma ferramenta pública e gratuita. Quem financia são pessoas e organizações que acreditam que transparência não é privilégio.",
      },
      { property: "og:title", content: "Apoiar | Dig Dig" },
      {
        property: "og:description",
        content:
          "Apoie o Dig Dig: uma plataforma de auditoria pública gratuita, financiada por quem acredita.",
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

initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY as string, { locale: "pt-BR" });

// ── Design tokens ─────────────────────────────────────────────────────────────
const INTER: React.CSSProperties = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" };
const TIGHT: React.CSSProperties = { fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif" };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" };

const TEXT   = "#0a0a0a";
const MUTED  = "#5a5a5a";
const SUBTLE = "#9a9a9a";
const BORDER = "rgba(0,0,0,0.08)";
const PAPER  = "#faf8f3";

function fmt(n: number | undefined | null, fallback = "·"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

// ── Plan data ─────────────────────────────────────────────────────────────────
type Plano = {
  id: string;
  nome: string;
  publico: string;
  preco: string;
  periodo: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  destaque?: boolean;
  bloqueado?: boolean;
  abreModal?: boolean;
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
    ctaHref: "/entrar",
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
    bloqueado: true,
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
    cta: "Patrocinar agora",
    destaque: true,
    abreModal: true,
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
    bloqueado: true,
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
    bloqueado: true,
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
    bloqueado: true,
  },
];

const DOACAO_CHIPS = [20, 50, 100, 200];

// ── Checkout Modal ─────────────────────────────────────────────────────────────
interface ModalState {
  tipo: "patrocinador" | "doacao";
  valor: number;
}

interface PixData {
  qr_code: string;
  qr_code_base64: string;
}

function CheckoutModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const [view, setView] = useState<"form" | "pix" | "success">("form");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  const titulo   = state.tipo === "patrocinador" ? "Patrocinar Dig Dig" : "Fazer uma doação";
  const sublabel = state.tipo === "patrocinador" ? "Plano Patrocinador · acesso anual · pode parcelar" : "Contribuição livre · Dig Dig";

  const handleSubmit = async ({ formData }: { formData: unknown; selectedPaymentMethod: string }) => {
    const res = await fetch(`${API_URL}/billing/criar-pagamento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: state.tipo, valor: state.valor, form_data: formData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(err.detail ?? "Erro ao processar pagamento");
    }
    const json = await res.json() as {
      status: string;
      pix_qr_code?: string;
      pix_qr_code_base64?: string;
    };
    if (json.pix_qr_code) {
      setPixData({ qr_code: json.pix_qr_code, qr_code_base64: json.pix_qr_code_base64 ?? "" });
      setView("pix");
    } else {
      setView("success");
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 8, maxWidth: 500, width: "100%",
          padding: "36px 32px", position: "relative",
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: "absolute", top: 14, right: 16,
            border: "none", background: "none", cursor: "pointer",
            fontSize: 22, color: SUBTLE, lineHeight: 1, padding: "4px 6px",
          }}
        >
          ×
        </button>

        {/* ── Form view ── */}
        {view === "form" && (
          <>
            <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
              {sublabel}
            </p>
            <h2 style={{ ...TIGHT, fontWeight: 600, fontSize: 22, color: TEXT, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              {titulo}
            </h2>
            <p style={{ ...TIGHT, fontSize: 32, fontWeight: 700, color: TEXT, margin: "0 0 28px", letterSpacing: "-0.04em", lineHeight: 1 }}>
              R$ {state.valor.toLocaleString("pt-BR")}
            </p>
            <Payment
              initialization={{ amount: state.valor, payer: { firstName: "" } }}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  bankTransfer: "all",
                },
                visual: {
                  style: {
                    theme: "flat",
                    customVariables: {
                      baseColor: "#0a0a0a",
                      baseColorFirstVariant: "#5a5a5a",
                      baseColorSecondVariant: "#9a9a9a",
                      errorColor: "#dc2626",
                      successColor: "#16a34a",
                      fontSizeMedium: "14px",
                      borderRadiusMedium: "4px",
                      borderRadiusLarge: "4px",
                      formBackgroundColor: "#ffffff",
                    },
                  },
                },
              }}
              onSubmit={handleSubmit}
              onError={(err) => console.error("MP error", err)}
            />
          </>
        )}

        {/* ── PIX view ── */}
        {view === "pix" && pixData && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0fdf4", border: "1px solid #bbf7d0", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>✓</span>
            </div>
            <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
              PIX gerado · aguardando pagamento
            </p>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20, lineHeight: 1.5 }}>
              Escaneie o QR code ou copie o código abaixo no seu app de banco.
            </p>
            <img
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code PIX"
              style={{
                width: 196, height: 196, margin: "0 auto 20px", display: "block",
                border: `1px solid ${BORDER}`, borderRadius: 4, background: PAPER,
              }}
            />
            <div style={{
              display: "flex", gap: 8, alignItems: "center",
              background: PAPER, border: `1px solid ${BORDER}`,
              padding: "10px 12px", borderRadius: 4, marginBottom: 16,
            }}>
              <code style={{ ...MONO, fontSize: 10, color: TEXT, flex: 1, wordBreak: "break-all", lineHeight: 1.5, textAlign: "left" }}>
                {pixData.qr_code.slice(0, 72)}…
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixData.qr_code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                style={{
                  ...INTER, fontSize: 12, fontWeight: 500, padding: "6px 14px",
                  background: copied ? "#16a34a" : TEXT, color: "#fff",
                  border: "none", borderRadius: 3, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "background 0.2s",
                }}
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: SUBTLE, lineHeight: 1.6 }}>
              O acesso será ativado automaticamente após a confirmação do pagamento.
            </p>
          </div>
        )}

        {/* ── Success view ── */}
        {view === "success" && (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 24, color: "#16a34a" }}>✓</span>
            </div>
            <h2 style={{ ...TIGHT, fontWeight: 600, fontSize: 22, color: TEXT, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Pagamento aprovado!
            </h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65, maxWidth: 360, margin: "0 auto 28px" }}>
              {state.tipo === "patrocinador"
                ? "Bem-vindo ao Dig Dig. Seu acesso ao plano Patrocinador será ativado em instantes."
                : "Obrigado pelo apoio. Você está ajudando a manter a transparência pública no Brasil."}
            </p>
            <button
              onClick={onClose}
              style={{
                ...INTER, fontSize: 14, fontWeight: 500, padding: "12px 28px",
                background: TEXT, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ApoiarPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [doacaoValor, setDoacaoValor] = useState<number>(50);
  const [doacaoCustom, setDoacaoCustom] = useState<string>("");

  useEffect(() => {
    fetchStats("cau-pr").then(setStats).catch(() => {});
  }, []);

  const openModal = (tipo: ModalState["tipo"], valor: number) =>
    setModal({ tipo, valor });

  const valorDoacao = doacaoCustom
    ? Math.max(1, parseInt(doacaoCustom.replace(/\D/g, ""), 10) || 1)
    : doacaoValor;

  return (
    <div style={{ ...INTER, background: "#fff", color: TEXT, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{ background: "#07080f", minHeight: "min(620px, 78vh)" }}
      >
        <ParticleField />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "70%", background: "linear-gradient(to top, rgba(7,8,15,0.92) 25%, rgba(7,8,15,0) 100%)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: "30%", background: "linear-gradient(to bottom, rgba(7,8,15,0.85) 0%, rgba(7,8,15,0) 100%)" }} />

        <nav className="relative z-20 px-6 md:px-8">
          <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ ...TIGHT, fontWeight: 700, fontSize: 17, color: "#fff" }}>Dig Dig</span>
            </Link>
            <Link to="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>← Voltar</Link>
          </div>
        </nav>

        <div className="relative z-20 px-6 md:px-8 pt-16 md:pt-[100px] pb-16 md:pb-20" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ ...MONO, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
            Apoiar
          </p>
          <h1 style={{ ...TIGHT, fontSize: "clamp(40px, 6.5vw, 68px)", fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.025em", color: "#fff", margin: "0 0 24px", maxWidth: 880 }}>
            Uma ferramenta pública.<br />
            <span style={{ color: "rgba(255,255,255,0.55)" }}>Financiada por quem acredita.</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, maxWidth: 600, margin: "0 0 48px" }}>
            O Dig Dig lê automaticamente os atos administrativos de órgãos públicos
            brasileiros e detecta irregularidades com IA. O resultado é aberto:
            sem paywall, sem cadastro obrigatório.
          </p>

          {/* Live stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, maxWidth: 760, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { v: fmt(stats?.total_atos), l: "documentos coletados" },
              { v: fmt(stats?.total_analisados), l: "analisados" },
              { v: fmt(stats?.total_criticos), l: "casos críticos" },
              { v: "R$ 0", l: "para começar" },
            ].map((s) => (
              <div key={s.l}>
                <p style={{ ...MONO, fontSize: 22, fontWeight: 500, color: "#fff", margin: 0, lineHeight: 1.1 }}>{s.v}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 6 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Por quê ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-8 pt-20 md:pt-24" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ alignItems: "start", paddingBottom: 72, borderBottom: `1px solid ${BORDER}` }} className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12">
          <div>
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>Por quê</p>
            <h2 style={{ ...TIGHT, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }} className="text-[26px] md:text-[32px]">
              Não temos investidor.
            </h2>
          </div>
          <div style={{ maxWidth: 640, minWidth: 0 }}>
            <p style={{ ...TIGHT, fontWeight: 500, color: TEXT, lineHeight: 1.3, letterSpacing: "-0.01em", margin: "0 0 16px" }} className="text-[19px] md:text-[22px]">
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

      {/* ─── Plans ─────────────────────────────────────────────────────────── */}
      <main className="px-6 md:px-8" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div>
          {PLANOS.map((p) => (
            <article
              key={p.id}
              style={{
                borderBottom: `1px solid ${BORDER}`,
                alignItems: "start",
                opacity: p.bloqueado ? 0.6 : 1,
              }}
              className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)_auto] gap-6 md:gap-12 py-10 md:py-14"
            >
              {/* Left: name + audience */}
              <div>
                <p style={{ ...MONO, fontSize: 11, color: p.destaque ? TEXT : SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>
                  {p.publico}
                  {p.destaque && <span style={{ marginLeft: 8, color: SUBTLE }}>· apoie</span>}
                  {p.bloqueado && (
                    <span style={{
                      marginLeft: 8, fontSize: 9, fontWeight: 600, padding: "2px 6px",
                      background: "#f4f4f4", color: SUBTLE, borderRadius: 2,
                      letterSpacing: "0.12em", verticalAlign: "middle",
                    }}>
                      EM BREVE
                    </span>
                  )}
                </p>
                <h3 style={{ ...TIGHT, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }} className="text-[30px] md:text-[36px]">
                  {p.nome}
                </h3>
                <p style={{ ...TIGHT, fontSize: 20, color: MUTED, margin: "16px 0 0", fontWeight: 500 }}>
                  <span style={{ color: TEXT }}>{p.preco}</span>
                  {p.periodo && <span style={{ color: SUBTLE, fontSize: 15, marginLeft: 4 }}>{p.periodo}</span>}
                </p>
              </div>

              {/* Middle: features */}
              <div style={{ maxWidth: 520 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, paddingLeft: 18, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, top: 9, width: 4, height: 4, borderRadius: "50%", background: TEXT }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: CTA */}
              <div style={{ paddingTop: 4 }}>
                {p.bloqueado ? (
                  <button
                    disabled
                    style={{
                      ...INTER, display: "block", fontSize: 14, fontWeight: 500,
                      padding: "12px 22px", borderRadius: 4, whiteSpace: "nowrap",
                      color: SUBTLE, background: "transparent", border: `1px solid ${BORDER}`,
                      cursor: "not-allowed",
                    }}
                  >
                    {p.cta}
                  </button>
                ) : p.abreModal ? (
                  <button
                    onClick={() => openModal("patrocinador", 990)}
                    style={{
                      ...INTER, display: "block", fontSize: 14, fontWeight: 500,
                      padding: "12px 22px", borderRadius: 4, cursor: "pointer",
                      color: "#fff", background: TEXT, border: `1px solid ${TEXT}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.cta} →
                  </button>
                ) : (
                  <a
                    href={p.ctaHref}
                    style={{
                      ...INTER, display: "inline-block", fontSize: 14, fontWeight: 500,
                      padding: "12px 22px", borderRadius: 4, textDecoration: "none",
                      color: TEXT, background: "transparent", border: `1px solid ${BORDER}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.cta} →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* ─── Doação livre ─────────────────────────────────────────────── */}
        <section style={{ padding: "64px 0", borderBottom: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)_auto] gap-6 md:gap-12" style={{ alignItems: "start" }}>
            {/* Left */}
            <div>
              <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>
                Qualquer pessoa
              </p>
              <h3 style={{ ...TIGHT, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }} className="text-[30px] md:text-[36px]">
                Doe
              </h3>
              <p style={{ ...TIGHT, fontSize: 20, color: MUTED, margin: "16px 0 0", fontWeight: 500 }}>
                <span style={{ color: TEXT }}>Qualquer valor</span>
                <span style={{ color: SUBTLE, fontSize: 15, marginLeft: 4 }}>· PIX ou cartão</span>
              </p>
            </div>

            {/* Middle: amount selector */}
            <div style={{ maxWidth: 520 }}>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
                Sem plano, sem benefícios extras. Só você apoiando um projeto de
                transparência pública que não tem investidor e não vai atrás de lucro.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {DOACAO_CHIPS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setDoacaoValor(v); setDoacaoCustom(""); }}
                    style={{
                      ...MONO, fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 3,
                      cursor: "pointer", border: `1px solid ${doacaoValor === v && !doacaoCustom ? TEXT : BORDER}`,
                      background: doacaoValor === v && !doacaoCustom ? TEXT : "#fff",
                      color: doacaoValor === v && !doacaoCustom ? "#fff" : MUTED,
                      transition: "all 0.15s",
                    }}
                  >
                    R$ {v}
                  </button>
                ))}
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${doacaoCustom ? TEXT : BORDER}`, borderRadius: 3, overflow: "hidden" }}>
                  <span style={{ ...MONO, fontSize: 13, color: MUTED, padding: "8px 10px 8px 14px" }}>R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="outro"
                    value={doacaoCustom}
                    onChange={(e) => setDoacaoCustom(e.target.value.replace(/\D/g, ""))}
                    style={{
                      ...MONO, fontSize: 13, width: 70, padding: "8px 12px 8px 0", border: "none",
                      outline: "none", background: "transparent", color: TEXT,
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 12, color: SUBTLE }}>
                Mínimo R$ 1. Parcelamento disponível no cartão.
              </p>
            </div>

            {/* Right: CTA */}
            <div style={{ paddingTop: 4 }}>
              <button
                onClick={() => openModal("doacao", valorDoacao)}
                style={{
                  ...INTER, display: "block", fontSize: 14, fontWeight: 500,
                  padding: "12px 22px", borderRadius: 4, cursor: "pointer",
                  color: TEXT, background: "transparent", border: `1px solid ${TEXT}`,
                  whiteSpace: "nowrap",
                }}
              >
                Fazer doação →
              </button>
            </div>
          </div>
        </section>

        {/* ─── Footer note ─────────────────────────────────────────────── */}
        <section style={{ padding: "96px 0 120px", textAlign: "center" }}>
          <p style={{ ...TIGHT, fontSize: 24, fontWeight: 500, color: TEXT, letterSpacing: "-0.01em", margin: "0 0 16px", maxWidth: 540, marginInline: "auto", lineHeight: 1.3 }}>
            Tudo que o Dig Dig encontra fica acessível.
          </p>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>
            Os planos pagos desbloqueiam chat com IA e geração de documentos.
            Conteúdo, fichas e análises permanecem livres para qualquer pessoa.
          </p>
          <p style={{ fontSize: 13, color: SUBTLE }}>
            Dúvidas:{" "}
            <a href="mailto:contato@digdig.com.br" style={{ color: MUTED, textDecoration: "underline" }}>
              contato@digdig.com.br
            </a>
          </p>
        </section>
      </main>

      {/* ─── Checkout Modal ──────────────────────────────────────────────── */}
      {modal && <CheckoutModal state={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
