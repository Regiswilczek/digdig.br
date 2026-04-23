import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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
      // Vortex eye — off-screen to the right so no visible center
      const VX   = W * 0.78;
      const VY   = H * 0.55;
      const VSC  = Math.max(W, H) * 0.55;

      for (let py = 0; py < H; py += STEP) {
        const ny = py / H;

        for (let px = 0; px < W; px += STEP) {
          const nx  = px / W;
          const dx  = px - VX;
          const dy  = py - VY;
          const dist = Math.sqrt(dx * dx + dy * dy) / VSC;
          const vStr = Math.max(0, 1 - dist * 1.8);

          // Flowing wave field — covers the entire canvas seamlessly
          const w1 = Math.sin(nx * 7.5 + ny * 3.2 + t * 0.40);
          const w2 = Math.sin(nx * 2.4 - ny * 5.5 - t * 0.27);
          const w3 = Math.cos(nx * 4.6 + ny * 2.1 + t * 0.22);
          const raw = (w1 * 0.44 + w2 * 0.31 + w3 * 0.25) * 0.5 + 0.5;
          const flowRidge = Math.pow(1 - Math.abs(2 * raw - 1), 2.2);

          const ang = Math.atan2(dy, dx);
          const vRaw = Math.sin(dist * 28 + ang * 0.6 - t * 1.05) * 0.5 + 0.5;
          const vortexRidge = Math.pow(1 - Math.abs(2 * vRaw - 1), 2.4);

          const brightness =
            flowRidge * (1 - vStr * 0.75) + vortexRidge * vStr * 0.75;

          const THRESH = 0.44;
          if (brightness < THRESH) continue;
          const norm = (brightness - THRESH) / (1 - THRESH);

          // Brazil flag palette: deep blue → green → yellow
          // Color zone driven by spatial position so bands feel like a flag
          // unfurling across the page.
          const zone = (nx * 0.55 + (1 - ny) * 0.45 + Math.sin(t * 0.15) * 0.05);

          let r = 0, g = 0, b = 0;
          if (zone < 0.38) {
            // Deep navy blue (#002776 family)
            const bl = zone / 0.38;
            r = Math.round(0 + bl * 10);
            g = Math.round(20 + bl * 50);
            b = Math.round(110 + bl * 60);
          } else if (zone < 0.72) {
            // Green (#009C3B family)
            const bl = (zone - 0.38) / 0.34;
            r = Math.round(10 + bl * 20);
            g = Math.round(70 + bl * 110);
            b = Math.round(170 - bl * 110);
          } else {
            // Yellow (#FFDF00 family)
            const bl = Math.min(1, (zone - 0.72) / 0.28);
            r = Math.round(30 + bl * 225);
            g = Math.round(180 + bl * 43);
            b = Math.round(60 - bl * 60);
          }

          // Brightness modulation by ridge intensity
          const intensity = 0.45 + norm * 0.55;
          r = Math.round(r * intensity);
          g = Math.round(g * intensity);
          b = Math.round(b * intensity);

          const alpha = Math.min(0.9, 0.4 + norm * 0.5);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          ctx.fillRect(px, py, PIX, PIX);
        }
      }

      t += 0.013;
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

function DesktopBadge() {
  return (
    <div className="flex flex-col gap-[3px] select-none flex-shrink-0">
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
