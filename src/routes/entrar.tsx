import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { API_URL } from "../lib/api";
import { runRecaptcha, RECAPTCHA_ENABLED } from "../lib/recaptcha";

export const Route = createFileRoute("/entrar")({
  component: EntrarPage,
  head: () => ({
    meta: [
      { title: "Entrar — Dig Dig" },
      {
        name: "description",
        content:
          "Acesse sua conta Dig Dig para investigar atos administrativos com IA.",
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

// ── Form logic ────────────────────────────────────────────────────────────────
function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    setSubmitting(true);
    try {
      // reCAPTCHA pré-check via backend (bloqueia bots que não executam JS)
      if (RECAPTCHA_ENABLED) {
        try {
          const token = await runRecaptcha("login");
          const r = await fetch(`${API_URL}/public/recaptcha-verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, action: "login" }),
          });
          if (!r.ok) {
            setError("Falha na verificação anti-bot. Tente novamente.");
            setSubmitting(false);
            return;
          }
        } catch {
          setError("Não foi possível validar o reCAPTCHA. Recarregue a página.");
          setSubmitting(false);
          return;
        }
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      navigate({ to: "/painel" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar.";
      setError(
        msg === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    if (!email) {
      setError("Digite seu email para recuperar a senha.");
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setError("Email de recuperação enviado! Verifique sua caixa de entrada.");
    }
  }

  return { email, setEmail, password, setPassword, showPassword, setShowPassword, submitting, error, onSubmit, resetPassword };
}

// ── Page ──────────────────────────────────────────────────────────────────────
function EntrarPage() {
  const f = useLoginForm();
  return (
    <>
      <MobileView f={f} />
      <DesktopView f={f} />
    </>
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────────
function MobileView({ f }: { f: ReturnType<typeof useLoginForm> }) {
  const { email, setEmail, password, setPassword, showPassword, setShowPassword, submitting, error, onSubmit, resetPassword } = f;

  return (
    <div
      className="md:hidden relative min-h-[100dvh] bg-[#07080f] text-white overflow-hidden flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[42%] overflow-hidden">
        <ParticleField />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(to top, #07080f 0%, rgba(7,8,15,0.85) 35%, rgba(7,8,15,0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{
            background:
              "linear-gradient(to bottom, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)",
          }}
        />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 pt-4">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.18em] text-white/55 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> Início
        </Link>
        <Link
          to="/"
          style={{ ...SYNE, letterSpacing: "0.18em" }}
          className="text-white text-[12px] uppercase"
        >
          DIG DIG
        </Link>
        <span className="w-[52px]" aria-hidden />
      </header>

      <div className="relative z-20 px-5 pt-10 pb-6 text-center">
        <h1
          style={SYNE}
          className="text-white uppercase leading-[0.92] tracking-tight"
        >
          <span className="block" style={{ fontSize: "clamp(3rem, 18vw, 4.5rem)" }}>
            DIG <span style={SCANLINE}>DIG</span>
            <sup style={{ fontSize: "0.25em", verticalAlign: "super", fontWeight: 400, letterSpacing: 0, color: "rgba(255,255,255,0.4)" }}>®</sup>
          </span>
        </h1>
        <p className="mt-3 text-white/55 text-[12px] leading-relaxed max-w-[280px] mx-auto">
          Indícios aparecem. Você decide o que fazer.
        </p>
      </div>

      <main className="relative z-20 flex-1 mt-2 px-5 pb-6">
        <div className="bg-[#0d0f1a]/95 border border-white/10 rounded-t-[28px] rounded-b-2xl px-6 pt-6 pb-7 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)]">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" aria-hidden />

          <div className="flex items-baseline justify-between mb-1">
            <h2 style={SYNE} className="text-white text-[1.35rem] uppercase tracking-tight">
              Entrar
            </h2>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              01 / Acesso
            </span>
          </div>
          <p className="text-white/45 text-[12px] leading-relaxed mb-5">
            Acesse o painel e continue investigando.
          </p>

          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5 px-1" style={SYNE}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 focus:bg-white/[0.06] transition-colors"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/45" style={SYNE}>
                  Senha
                </label>
                <button
                  type="button"
                  onClick={resetPassword}
                  className="text-[10px] uppercase tracking-[0.16em] text-white/45 hover:text-white transition-colors"
                >
                  Esqueci
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 pr-11 text-[15px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 focus:bg-white/[0.06] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
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
              {submitting ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-white/55">
            Não tem uma conta?{" "}
            <Link to="/solicitar-acesso" className="text-white font-medium underline-offset-4 hover:underline">
              Solicite acesso →
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[10px] text-white/30 uppercase tracking-[0.16em] px-4">
          Ao continuar você aceita nossos termos
        </p>
      </main>
    </div>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────────
function DesktopView({ f }: { f: ReturnType<typeof useLoginForm> }) {
  const { email, setEmail, password, setPassword, showPassword, setShowPassword, submitting, error, onSubmit, resetPassword } = f;

  return (
    <div className="hidden md:flex min-h-[100dvh] bg-[#07080f] text-white flex-row">
      <section className="w-[46%] lg:w-[42%] xl:w-[38%] flex flex-col px-12 lg:px-16 py-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            style={{ ...SYNE, letterSpacing: "0.18em" }}
            className="text-white text-[13px] uppercase hover:text-white/70 transition-colors"
          >
            DIG DIG
          </Link>
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors"
          >
            ← Voltar
          </Link>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[400px] mx-auto">
            <h1
              style={SYNE}
              className="text-white text-[2rem] leading-tight uppercase tracking-tight mb-1.5"
            >
              Entrar
            </h1>
            <p className="text-white/45 text-[13px] leading-relaxed mb-7">
              Acesse o painel e continue investigando.
            </p>

            <Link
              to="/solicitar-acesso"
              className="block mb-8 px-3 py-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/55">
                  Sem cadastro? Solicite acesso.
                </span>
                <span className="text-[12px] text-white/40 group-hover:text-white/70 transition-colors">
                  →
                </span>
              </div>
            </Link>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5" style={SYNE}>
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/45" style={SYNE}>
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors"
                  >
                    Esqueci
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 pr-10 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
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
                {submitting ? "Aguarde..." : "Entrar"}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] text-white/45">
              Não tem uma conta?{" "}
              <Link
                to="/solicitar-acesso"
                className="text-white hover:text-white/80 underline-offset-4 hover:underline"
              >
                Solicite acesso →
              </Link>
            </p>

            <p className="mt-8 text-center text-[10px] text-white/30 uppercase tracking-[0.16em]">
              Ao continuar você aceita nossos termos
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex-1 bg-[#07080f] overflow-hidden border-l border-white/[0.06]">
        <ParticleField />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(7,8,15,0.55) 0%, rgba(7,8,15,0) 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[20%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[25%]"
          style={{
            background:
              "linear-gradient(to top, rgba(7,8,15,0.7) 0%, rgba(7,8,15,0) 100%)",
          }}
        />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-10 text-center">
          <h2
            style={SYNE}
            className="text-white uppercase leading-[0.92] tracking-tight"
          >
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
        </div>
      </section>
    </div>
  );
}
