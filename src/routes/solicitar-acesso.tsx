import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api";

export const Route = createFileRoute("/solicitar-acesso")({
  component: SolicitarAcessoPage,
  head: () => ({
    meta: [
      { title: "Solicitar Acesso — Dig Dig" },
      {
        name: "description",
        content:
          "Entre na lista de espera do Dig Dig e receba acesso à plataforma de auditoria de atos públicos com IA.",
      },
      { name: "theme-color", content: "#07080f" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
    ],
  }),
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

const SCANLINE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(180deg,rgba(255,255,255,.93) 0,rgba(255,255,255,.93) 1.5px,transparent 1.5px,transparent 7px)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const PERFIS = [
  "Jornalista",
  "Advogado/a",
  "Pesquisador/a",
  "Vereador / Assessor Parlamentar",
  "Cidadão interessado",
  "Outro",
];

// ── ParticleField ─────────────────────────────────────────────────────────────
function ParticleField() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof window === "undefined") return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:block";
    wrap.appendChild(cv);

    const ctx = cv.getContext("2d")!;
    let t = 0;
    let raf = 0;
    let alive = true;
    let visible = true;
    let tabVisible = !document.hidden;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;

    function resize() {
      cv.width = wrap!.clientWidth || window.innerWidth;
      cv.height = wrap!.clientHeight || window.innerHeight;
    }

    function drawFrame() {
      const W = cv.width;
      const H = cv.height;
      if (W < 2 || H < 2) return;
      ctx.clearRect(0, 0, W, H);

      const STEP = 6;
      const PIX = 3;
      const BLUE = [10, 35, 110];
      const GREEN = [0, 130, 60];
      const YELLOW = [240, 200, 30];

      const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
      const mix = (c1: number[], c2: number[], k: number) => [
        lerp(c1[0], c2[0], k),
        lerp(c1[1], c2[1], k),
        lerp(c1[2], c2[2], k),
      ];

      for (let py = 0; py < H; py += STEP) {
        const ny = py / H;
        for (let px = 0; px < W; px += STEP) {
          const nx = px / W;
          const w1 = Math.sin(nx * 4.2 + ny * 2.6 + t * 0.35);
          const w2 = Math.sin(nx * 1.9 - ny * 3.4 - t * 0.22);
          const w3 = Math.cos((nx + ny) * 3.1 + t * 0.18);
          const raw = (w1 * 0.42 + w2 * 0.33 + w3 * 0.25) * 0.5 + 0.5;
          const ridge = Math.pow(1 - Math.abs(2 * raw - 1), 1.8);
          const THRESH = 0.3;
          if (ridge < THRESH) continue;
          const norm = (ridge - THRESH) / (1 - THRESH);
          const band =
            (nx * 0.55 + (1 - ny) * 0.45 + Math.sin(t * 0.12) * 0.04 + raw * 0.08) % 1;
          let col: number[];
          if (band < 0.4) {
            col = mix(GREEN, YELLOW, Math.pow(band / 0.4, 1.6));
          } else if (band < 0.62) {
            col = mix(YELLOW, mix(YELLOW, BLUE, 0.5), (band - 0.4) / 0.22);
          } else {
            col = mix(mix(YELLOW, BLUE, 0.5), BLUE, Math.pow((band - 0.62) / 0.38, 0.8));
          }
          const intensity = 0.4 + norm * 0.65;
          const r = Math.min(255, Math.round(col[0] * intensity));
          const g = Math.min(255, Math.round(col[1] * intensity));
          const b = Math.min(255, Math.round(col[2] * intensity));
          const alpha = Math.min(0.85, 0.35 + norm * 0.5);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          ctx.fillRect(px, py, PIX, PIX);
        }
      }
    }

    function tick(now: number) {
      if (!alive) return;
      if (!visible || !tabVisible) return;
      if (now - lastFrame >= FRAME_MS) {
        lastFrame = now;
        drawFrame();
        t += 0.024;
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!alive || reducedMotion) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function onVisibility() {
      tabVisible = !document.hidden;
      if (tabVisible) start();
      else cancelAnimationFrame(raf);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else cancelAnimationFrame(raf);
      },
      { threshold: 0.01 },
    );
    io.observe(wrap);

    if (reducedMotion) drawFrame();
    else start();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      cv.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden="true" className="absolute inset-0" />;
}

// ── Form hook ─────────────────────────────────────────────────────────────────
function useWaitlistForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [profissao, setProfissao] = useState("");
  const [motivacao, setMotivacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nome.trim() || !email.trim()) {
      setError("Nome e email são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, profissao: profissao || null, motivacao: motivacao || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Erro ao enviar pedido.");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return { nome, setNome, email, setEmail, profissao, setProfissao, motivacao, setMotivacao, submitting, error, success, onSubmit };
}

// ── Page ──────────────────────────────────────────────────────────────────────
function SolicitarAcessoPage() {
  const f = useWaitlistForm();
  return (
    <>
      <MobileView f={f} />
      <DesktopView f={f} />
    </>
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────────
function MobileView({ f }: { f: ReturnType<typeof useWaitlistForm> }) {
  const { nome, setNome, email, setEmail, profissao, setProfissao, motivacao, setMotivacao, submitting, error, success, onSubmit } = f;

  return (
    <div
      className="md:hidden relative min-h-[100dvh] bg-[#07080f] text-white overflow-hidden flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[40%] overflow-hidden">
        <ParticleField />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "linear-gradient(to top, #07080f 0%, rgba(7,8,15,0.85) 35%, rgba(7,8,15,0) 100%)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ background: "linear-gradient(to bottom, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)" }}
        />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 pt-4">
        <Link to="/" className="text-[11px] uppercase tracking-[0.18em] text-white/55 hover:text-white transition-colors flex items-center gap-1.5">
          <span aria-hidden>←</span> Início
        </Link>
        <Link to="/" style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[12px] uppercase">
          DIG DIG
        </Link>
        <span className="w-[52px]" aria-hidden />
      </header>

      <div className="relative z-20 px-5 pt-8 pb-4 text-center">
        <h1 style={SYNE} className="text-white uppercase leading-[0.92] tracking-tight">
          <span className="block" style={{ fontSize: "clamp(2.5rem, 14vw, 3.5rem)" }}>
            DIG <span style={SCANLINE}>DIG</span>
          </span>
        </h1>
        <p className="mt-2 text-white/50 text-[11px] leading-relaxed max-w-[260px] mx-auto uppercase tracking-[0.12em]">
          Acesso antecipado
        </p>
      </div>

      <main className="relative z-20 flex-1 mt-1 px-5 pb-6">
        <div className="bg-[#0d0f1a]/95 border border-white/10 rounded-t-[28px] rounded-b-2xl px-6 pt-6 pb-7 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)]">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" aria-hidden />

          {success ? (
            <SuccessCard email={email} />
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <h2 style={SYNE} className="text-white text-[1.2rem] uppercase tracking-tight">
                  Solicitar acesso
                </h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Lista de espera
                </span>
              </div>
              <p className="text-white/45 text-[12px] leading-relaxed mb-5">
                Preencha o formulário e entraremos em contato quando uma vaga for liberada.
              </p>

              <form onSubmit={onSubmit} className="space-y-3.5">
                <MobileField label="Nome completo" type="text" autoComplete="name" value={nome} onChange={setNome} placeholder="Seu nome" />
                <MobileField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" inputMode="email" />

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5 px-1" style={SYNE}>
                    Perfil
                  </label>
                  <select
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-[14px] text-white focus:outline-none focus:border-white/40 transition-colors appearance-none"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <option value="" style={{ background: "#0d0f1a" }}>Selecione seu perfil...</option>
                    {PERFIS.map((p) => (
                      <option key={p} value={p} style={{ background: "#0d0f1a" }}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5 px-1" style={SYNE}>
                    Por que quer acesso? <span className="text-white/25">(opcional)</span>
                  </label>
                  <textarea
                    value={motivacao}
                    onChange={(e) => setMotivacao(e.target.value)}
                    maxLength={280}
                    rows={3}
                    placeholder="Contexto, uso pretendido..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors resize-none"
                  />
                  <p className="text-right text-[10px] text-white/25 mt-1 pr-1">{motivacao.length}/280</p>
                </div>

                {error && (
                  <p className="text-[12px] text-yellow-300/90 leading-relaxed border-l-2 border-yellow-300/60 pl-3 py-1">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={SYNE}
                  className="w-full bg-white text-[#07080f] py-4 text-[12px] uppercase tracking-[0.2em] rounded-xl hover:bg-white/90 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Solicitar acesso"}
                </button>
              </form>

              <p className="mt-5 text-center text-[12.5px] text-white/55">
                Já tem acesso?{" "}
                <Link to="/entrar" className="text-white font-medium underline-offset-4 hover:underline">
                  Entrar →
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MobileField({
  label, type, autoComplete, value, onChange, placeholder, inputMode,
}: {
  label: string; type: string; autoComplete: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  inputMode?: "email" | "text" | "numeric" | "tel" | "url" | "search";
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5 px-1" style={SYNE}>
        {label}
      </label>
      <input
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 focus:bg-white/[0.06] transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}

function SuccessCard({ email }: { email: string }) {
  return (
    <div className="py-4 text-center">
      <div className="text-[32px] mb-4">⏳</div>
      <h3 style={SYNE} className="text-white text-[1.1rem] uppercase tracking-tight mb-3">
        Pedido registrado.
      </h3>
      <p className="text-white/60 text-[13px] leading-relaxed mb-2">
        Você receberá um email em{" "}
        <span className="text-white/90 font-medium">{email}</span>{" "}
        quando seu acesso for liberado.
      </p>
      <p className="text-white/35 text-[11px] mb-6">
        Fique de olho na caixa de entrada (e no spam).
      </p>
      <Link
        to="/"
        className="text-[11px] uppercase tracking-[0.18em] text-white/50 hover:text-white transition-colors"
      >
        ← Voltar para o início
      </Link>
    </div>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────────
function DesktopView({ f }: { f: ReturnType<typeof useWaitlistForm> }) {
  const { nome, setNome, email, setEmail, profissao, setProfissao, motivacao, setMotivacao, submitting, error, success, onSubmit } = f;

  return (
    <div className="hidden md:flex min-h-[100dvh] bg-[#07080f] text-white flex-row">
      <section className="w-[46%] lg:w-[42%] xl:w-[38%] flex flex-col px-12 lg:px-16 py-10 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0">
          <Link to="/" style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[13px] uppercase hover:text-white/70 transition-colors">
            DIG DIG
          </Link>
          <Link to="/" className="text-[11px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors">
            ← Voltar
          </Link>
        </div>

        <div className="flex-1 flex items-center py-10">
          <div className="w-full max-w-[400px] mx-auto">
            {success ? (
              <SuccessCard email={email} />
            ) : (
              <>
                <h1 style={SYNE} className="text-white text-[2rem] leading-tight uppercase tracking-tight mb-1.5">
                  Solicitar acesso
                </h1>
                <p className="text-white/45 text-[13px] leading-relaxed mb-6">
                  Preencha o formulário e entraremos em contato quando uma vaga for liberada.
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <DesktopField label="Nome completo" type="text" autoComplete="name" value={nome} onChange={setNome} placeholder="Seu nome completo" />
                  <DesktopField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5" style={SYNE}>
                      Perfil
                    </label>
                    <select
                      value={profissao}
                      onChange={(e) => setProfissao(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white focus:outline-none focus:border-white/40 transition-colors appearance-none"
                      style={{ background: "rgba(7,8,15,0.98)" }}
                    >
                      <option value="" style={{ background: "#07080f" }}>Selecione seu perfil...</option>
                      {PERFIS.map((p) => (
                        <option key={p} value={p} style={{ background: "#07080f" }}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5" style={SYNE}>
                      Por que quer acesso? <span className="text-white/25">(opcional)</span>
                    </label>
                    <textarea
                      value={motivacao}
                      onChange={(e) => setMotivacao(e.target.value)}
                      maxLength={280}
                      rows={3}
                      placeholder="Contexto, uso pretendido..."
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors resize-none"
                    />
                    <p className="text-right text-[10px] text-white/25 mt-1">{motivacao.length}/280</p>
                  </div>

                  {error && (
                    <p className="text-[12px] text-yellow-300/90 leading-relaxed border-l-2 border-yellow-300/60 pl-3 py-1">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={SYNE}
                    className="w-full bg-white text-[#07080f] py-3 text-[12px] uppercase tracking-[0.2em] hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Solicitar acesso"}
                  </button>
                </form>

                <p className="mt-5 text-center text-[12px] text-white/45">
                  Já tem acesso?{" "}
                  <Link to="/entrar" className="text-white hover:text-white/80 underline-offset-4 hover:underline">
                    Entrar →
                  </Link>
                </p>

                <p className="mt-8 text-center text-[10px] text-white/30 uppercase tracking-[0.16em]">
                  Seus dados não serão compartilhados com terceiros
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="relative flex-1 bg-[#07080f] overflow-hidden border-l border-white/[0.06]">
        <ParticleField />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(7,8,15,0.55) 0%, rgba(7,8,15,0) 60%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[20%]" style={{ background: "linear-gradient(to bottom, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)" }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[25%]" style={{ background: "linear-gradient(to top, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)" }} />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-10 text-center">
          <h2 style={SYNE} className="text-white uppercase leading-[0.92] tracking-tight">
            <span className="block" style={{ fontSize: "clamp(3.5rem, 9vw, 7rem)" }}>
              DIG <span style={SCANLINE}>DIG</span>
              <sup style={{ fontSize: "0.25em", verticalAlign: "super", fontWeight: 400, letterSpacing: 0, color: "rgba(255,255,255,0.35)" }}>®</sup>
            </span>
          </h2>
          <p className="mt-6 text-white/55 max-w-[360px] text-[13px] leading-relaxed">
            Analisamos milhares de documentos oficiais com IA.
            <br />
            Indícios aparecem. Você decide o que fazer.
          </p>
          <p className="mt-8 text-white/30 text-[11px] uppercase tracking-[0.2em]">
            Acesso antecipado · beta fechado
          </p>
        </div>
      </section>
    </div>
  );
}

function DesktopField({
  label, type, autoComplete, value, onChange, placeholder,
}: {
  label: string; type: string; autoComplete: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5" style={SYNE}>
        {label}
      </label>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}
