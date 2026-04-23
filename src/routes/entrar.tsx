import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/entrar")({
  component: EntrarPage,
  head: () => ({
    meta: [
      { title: "Entrar — Dig Dig" },
      {
        name: "description",
        content:
          "Acesse sua conta Dig Dig ou crie uma nova para investigar atos administrativos com IA.",
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

// ── Same ParticleField as the home ────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────

function EntrarPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password || (!isLogin && !name)) {
      setError("Preencha todos os campos.");
      return;
    }
    setSubmitting(true);
    // Auth backend not enabled yet — show informative message.
    setTimeout(() => {
      setSubmitting(false);
      setError(
        "Autenticação ainda não está conectada. Em breve você poderá " +
          (isLogin ? "entrar" : "criar sua conta") +
          ".",
      );
    }, 600);
  }

  return (
    <div className="min-h-[100dvh] bg-[#07080f] text-white flex flex-col md:flex-row">
      {/* ── Left: form ─────────────────────────────────────────────────────── */}
      <section className="w-full md:w-[46%] lg:w-[42%] xl:w-[38%] flex flex-col px-6 sm:px-10 md:px-12 lg:px-16 py-8 md:py-10">
        {/* Top: brand link back home */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            style={{ ...SYNE, letterSpacing: "0.18em" }}
            className="text-white text-[12px] md:text-[13px] uppercase hover:text-white/70 transition-colors"
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

        {/* Form card */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[400px] mx-auto">
            <h1
              style={SYNE}
              className="text-white text-[1.75rem] md:text-[2rem] leading-tight uppercase tracking-tight mb-1.5"
            >
              {isLogin ? "Entrar" : "Criar conta"}
            </h1>
            <p className="text-white/45 text-[13px] leading-relaxed mb-7">
              {isLogin
                ? "Acesse o painel e continue investigando."
                : "Crie sua conta gratuita e comece a investigar atos públicos."}
            </p>

            {/* Toggle */}
            <div className="flex items-center border border-white/10 bg-white/[0.02] mb-6 p-0.5">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  isLogin
                    ? "bg-white text-[#07080f]"
                    : "text-white/55 hover:text-white"
                }`}
                style={SYNE}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  !isLogin
                    ? "bg-white text-[#07080f]"
                    : "text-white/55 hover:text-white"
                }`}
                style={SYNE}
              >
                Cadastro
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5"
                    style={SYNE}
                  >
                    Nome
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder="Seu nome"
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5"
                  style={SYNE}
                >
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
                  <label
                    className="block text-[10px] uppercase tracking-[0.2em] text-white/45"
                    style={SYNE}
                  >
                    Senha
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors"
                    >
                      Esqueci
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="••••••••"
                />
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
                {submitting
                  ? "Aguarde..."
                  : isLogin
                    ? "Entrar"
                    : "Criar conta"}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] text-white/45">
              {isLogin ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <button
                type="button"
                onClick={() => setMode(isLogin ? "signup" : "login")}
                className="text-white hover:text-white/80 underline-offset-4 hover:underline"
              >
                {isLogin ? "Cadastre-se" : "Entrar"}
              </button>
            </p>

            <p className="mt-8 text-center text-[10px] text-white/30 uppercase tracking-[0.16em]">
              Ao continuar você aceita nossos termos
            </p>
          </div>
        </div>
      </section>

      {/* ── Right: animated background with DIG DIG ───────────────────────── */}
      <section className="relative hidden md:block flex-1 bg-[#07080f] overflow-hidden border-l border-white/[0.06]">
        <ParticleField />

        {/* Edge fades for legibility of the centered word */}
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

        {/* Centered DIG DIG */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-10 text-center">
          <h2
            style={SYNE}
            className="text-white uppercase leading-[0.92] tracking-tight"
          >
            <span
              className="block"
              style={{ fontSize: "clamp(3.5rem, 9vw, 7rem)" }}
            >
              DIG <span style={SCANLINE}>DIG</span>
              <sup
                style={{
                  fontSize: "0.25em",
                  verticalAlign: "super",
                  fontWeight: 400,
                  letterSpacing: 0,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                ®
              </sup>
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
