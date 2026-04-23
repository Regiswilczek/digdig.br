import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import claudeLogo from "@/assets/claude-logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// ── Shared constants ──────────────────────────────────────────────────────────

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

// Scanline stripe — applied to the second "DIG"
const SCANLINE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(180deg,rgba(255,255,255,.93) 0,rgba(255,255,255,.93) 1.5px,transparent 1.5px,transparent 7px)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── Terrain canvas ────────────────────────────────────────────────────────────
// Imperative canvas — created outside React reconciler to avoid SSR/Strict Mode.

function ParticleField() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof window === "undefined") return;

    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:block";
    wrap.appendChild(cv);

    const ctx = cv.getContext("2d")!;
    let t = 0;
    let raf = 0;
    let alive = true;

    function resize() {
      cv.width  = wrap!.clientWidth  || window.innerWidth;
      cv.height = wrap!.clientHeight || window.innerHeight;
    }

    function tick() {
      if (!alive) return;

      const W = cv.width;
      const H = cv.height;
      if (W < 2 || H < 2) { raf = requestAnimationFrame(tick); return; }

      ctx.clearRect(0, 0, W, H);

      const STEP = 4;
      const PIX  = 3;

      // Brazil flag palette (deep, slightly desaturated for dark bg)
      const BLUE   = [10,  35, 110];   // #0a236e
      const GREEN  = [0,  130,  60];   // #00823c
      const YELLOW = [240, 200,  30];  // #f0c81e

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const mix = (c1: number[], c2: number[], t: number) => [
        lerp(c1[0], c2[0], t),
        lerp(c1[1], c2[1], t),
        lerp(c1[2], c2[2], t),
      ];

      for (let py = 0; py < H; py += STEP) {
        const ny = py / H;
        for (let px = 0; px < W; px += STEP) {
          const nx = px / W;

          // Flowing wave field — smooth, full-screen, no center artefact
          const w1 = Math.sin(nx * 4.2 + ny * 2.6 + t * 0.35);
          const w2 = Math.sin(nx * 1.9 - ny * 3.4 - t * 0.22);
          const w3 = Math.cos((nx + ny) * 3.1 + t * 0.18);
          const raw = (w1 * 0.42 + w2 * 0.33 + w3 * 0.25) * 0.5 + 0.5;

          // Ridge for dot density / brightness
          const ridge = Math.pow(1 - Math.abs(2 * raw - 1), 1.8);

          const THRESH = 0.30;
          if (ridge < THRESH) continue;
          const norm = (ridge - THRESH) / (1 - THRESH);

          // Diagonal flag-band coordinate (bottom-left → top-right)
          // Slow drift over time so the flag "breathes"
          const band = (nx * 0.55 + (1 - ny) * 0.45 + Math.sin(t * 0.12) * 0.04 + raw * 0.08) % 1;

          // 3 bands like a flag: green → yellow → blue, smooth transitions
          let col: number[];
          if (band < 0.40) {
            const u = band / 0.40;            // green dominant, fading to yellow
            col = mix(GREEN, YELLOW, Math.pow(u, 1.6));
          } else if (band < 0.62) {
            const u = (band - 0.40) / 0.22;   // yellow core
            col = mix(YELLOW, mix(YELLOW, BLUE, 0.5), u);
          } else {
            const u = (band - 0.62) / 0.38;   // blue
            col = mix(mix(YELLOW, BLUE, 0.5), BLUE, Math.pow(u, 0.8));
          }

          // Brightness modulation
          const intensity = 0.40 + norm * 0.65;
          const r = Math.min(255, Math.round(col[0] * intensity));
          const g = Math.min(255, Math.round(col[1] * intensity));
          const b = Math.min(255, Math.round(col[2] * intensity));

          const alpha = Math.min(0.85, 0.35 + norm * 0.50);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          ctx.fillRect(px, py, PIX, PIX);
        }
      }

      t += 0.012;
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      cv.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={wrapRef} aria-hidden="true" className="absolute inset-0" />;
}

// ── Shared headline word ──────────────────────────────────────────────────────

// The second "DIG" with the scanline stripe effect
function StyledDIG() {
  return <span style={SCANLINE}>DIG</span>;
}

// ── Desktop badge ─────────────────────────────────────────────────────────────

function PoweredByClaude({ compact = false }: { compact?: boolean }) {
  const wrapClass = compact
    ? "flex items-center gap-2 border border-white/15 bg-black/55 backdrop-blur-sm select-none px-2.5 py-1.5"
    : "flex items-center gap-2 border border-white/15 bg-black/55 backdrop-blur-sm select-none px-3 py-2";
  const labelClass = compact
    ? "text-white/45 uppercase tracking-[0.22em] text-[7px]"
    : "text-white/45 uppercase tracking-[0.22em] text-[8px]";
  const dividerClass = compact ? "bg-white/15 h-2.5 w-px" : "bg-white/15 h-3 w-px";
  const imgClass = compact ? "h-2.5 w-auto" : "h-3 w-auto";
  return (
    <div className={wrapClass}>
      <span style={SYNE} className={labelClass}>Cérebro</span>
      <span className={dividerClass} />
      <img
        src={claudeLogo}
        alt="Claude"
        className={imgClass}
        style={{ filter: "brightness(0) invert(1)" }}
      />
    </div>
  );
}

function DesktopBadge() {
  return (
    <div className="flex flex-col gap-[3px] select-none flex-shrink-0">
      <PoweredByClaude />
      <div className="border border-white/20 bg-black/55 backdrop-blur-sm px-3 py-[7px]">
        <p style={SYNE} className="text-[10px] tracking-[0.16em] uppercase leading-[1.55] text-white/80 flex items-center gap-1.5">
          <span className="text-yellow-300">↑</span> NÍVEL DE ATENÇÃO
        </p>
        <p style={SYNE} className="text-[10px] tracking-[0.16em] uppercase leading-[1.55] text-white/80 flex items-center gap-1.5">
          <span className="text-yellow-300">↑</span> ELEVADO
        </p>
      </div>
      <div className="border border-white/20 bg-black/55 backdrop-blur-sm px-4 pt-3 pb-3 w-[215px]">
        <p className="text-[9px] font-mono text-white/40 tracking-[0.22em] uppercase mb-[2px]">
          ATOS MAPEADOS:
        </p>
        <p className="text-[3rem] font-bold text-white leading-none tabular-nums mb-3">
          1.789
        </p>
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.16)" }} className="mb-[7px]" />
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-white/40 tracking-[0.12em] uppercase">
            INDÍCIOS IDENTIFICADOS
          </span>
          <span className="text-[#00cc46] font-bold text-sm leading-none">✓</span>
        </div>
      </div>
    </div>
  );
}

// ── Mobile badge — compact horizontal strip ───────────────────────────────────

function MobileBadge() {
  return (
    <div className="flex flex-col gap-1.5 select-none">
      <PoweredByClaude compact />
    <div className="flex border border-white/20 bg-black/60 backdrop-blur-sm select-none">
      {/* Alert level */}
      <div className="flex flex-col justify-center px-3 py-2.5 border-r border-white/10 flex-shrink-0">
        <span className="text-[8px] font-mono text-yellow-300 tracking-[0.18em] uppercase leading-[1.6]">
          ↑↑ ELEVADO
        </span>
        <span className="text-[8px] font-mono text-white/35 tracking-[0.14em] uppercase leading-[1.6]">
          ALERTA
        </span>
      </div>

      {/* Count */}
      <div className="flex flex-col justify-center px-3 py-2.5 flex-1 min-w-0">
        <span className="text-[8px] font-mono text-white/35 tracking-[0.18em] uppercase leading-[1.4]">
          ATOS MAPEADOS:
        </span>
        <span className="text-[1.65rem] font-bold text-white tabular-nums leading-none">
          1.789
        </span>
      </div>

      {/* Confirm */}
      <div className="flex flex-col justify-center items-center px-3 py-2.5 border-l border-white/10 flex-shrink-0 gap-0.5">
        <span className="text-[7px] font-mono text-white/35 tracking-[0.12em] uppercase text-center leading-[1.4]">
          INDÍCIOS
        </span>
        <span className="text-[#00cc46] font-bold text-xl leading-none">✓</span>
      </div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="relative z-30 flex items-center justify-between px-6 md:px-14 py-5 md:py-6">
      <span style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[12px] md:text-[13px] uppercase">
        DIG DIG
      </span>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
        {["Produto", "Soluções", "Preços", "Patrocine"].map((l) => (
          <a key={l} href="#" className="hover:text-white transition-colors duration-200">{l}</a>
        ))}
      </div>
      <a href="/entrar" className="text-[12px] md:text-[13px] text-white/50 hover:text-white transition-colors duration-200">
        Entrar
      </a>
    </nav>
  );
}

// ── Desktop hero ──────────────────────────────────────────────────────────────

function DesktopHero() {
  return (
    <main className="hidden md:flex relative z-20 flex-row items-end justify-between gap-8 px-14 pb-10">
      <div className="flex flex-col gap-[18px]">
        <h1
          style={{
            ...SYNE,
            fontSize: "clamp(2.8rem, 7vw, 7.4rem)",
            lineHeight: 0.88,
            letterSpacing: "-0.025em",
            whiteSpace: "nowrap",
          }}
          className="text-white"
        >
          <span className="block">
            DIG <StyledDIG />
            <sup style={{ fontSize: "0.25em", verticalAlign: "super", fontWeight: 400, letterSpacing: 0, color: "rgba(255,255,255,0.35)" }}>
              ®
            </sup>
          </span>
          <span className="block">Escavamos</span>
          <span className="block" style={{ color: "rgba(255,255,255,0.52)" }}>
            os atos públicos.
          </span>
        </h1>

        <p className="text-white/38 leading-relaxed" style={{ fontSize: "clamp(0.78rem, 1.1vw, 0.90rem)", maxWidth: 340 }}>
          Analisamos milhares de documentos oficiais com IA.
          <br />Indícios aparecem. Você decide o que fazer.
        </p>

        <a
          href="/explorar"
          style={{ ...SYNE, background: "#009C3B", letterSpacing: "0.22em" }}
          className="self-start inline-block text-white text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
        >
          EXPLORAR AUDITORIA
        </a>
      </div>

      <div className="mb-1">
        <DesktopBadge />
      </div>
    </main>
  );
}

// ── Mobile hero ───────────────────────────────────────────────────────────────

function MobileHero() {
  return (
    <div className="md:hidden relative z-20 flex flex-col px-6 pb-6 gap-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      {/* Headline */}
      <h1
        style={{
          ...SYNE,
          fontSize: "clamp(1.7rem, 7.8vw, 2.6rem)",
          lineHeight: 0.90,
          letterSpacing: "-0.02em",
        }}
        className="text-white"
      >
        <span className="block">
          DIG <StyledDIG />
          <sup style={{ fontSize: "0.25em", verticalAlign: "super", fontWeight: 400, letterSpacing: 0, color: "rgba(255,255,255,0.35)" }}>
            ®
          </sup>
        </span>
        <span className="block">Escavamos</span>
        <span className="block" style={{ color: "rgba(255,255,255,0.52)" }}>
          os atos públicos.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-white/38 text-[13px] leading-relaxed max-w-[280px]">
        Analisamos documentos públicos com IA.
        <br />Indícios aparecem. Você age.
      </p>

      {/* CTA */}
      <a
        href="/explorar"
        style={{ ...SYNE, background: "#009C3B", letterSpacing: "0.20em" }}
        className="self-start inline-block text-white text-[10px] uppercase px-6 py-[11px] hover:opacity-90 transition-opacity"
      >
        EXPLORAR AUDITORIA
      </a>

      {/* Badge — horizontal compact */}
      <MobileBadge />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function HomePage() {
  return (
    <div
      className="relative bg-[#07080f] overflow-hidden flex flex-col"
      style={{ height: "100dvh", overflowX: "hidden" }}
    >
      {/* Animated terrain — full screen */}
      <ParticleField />

      {/* Nav at top */}
      <Nav />

      {/* Spacer pushes content to bottom */}
      <div className="flex-1" />

      {/* Bottom gradient for text readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden md:block"
        style={{ height: "55%", background: "linear-gradient(to top, rgba(7,8,15,0.92) 30%, rgba(7,8,15,0) 100%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 block md:hidden"
        style={{ height: "60%", background: "linear-gradient(to top, rgba(7,8,15,0.92) 35%, rgba(7,8,15,0) 100%)" }}
      />

      {/* Top gradient for nav readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: "30%", background: "linear-gradient(to bottom, rgba(7,8,15,0.85) 0%, rgba(7,8,15,0) 100%)" }}
      />

      <DesktopHero />
      <MobileHero />
    </div>
  );
}
