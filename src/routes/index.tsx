import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import claudeLogo from "@/assets/claude-logo.png";
import { fetchAnalysesRecentes } from "@/lib/api";
import type { PublicStats, AnaliseRecente } from "@/lib/api";
import { useOrgao } from "@/lib/orgao-store";
import { ParticleField } from "@/components/ParticleField";

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

// Mobile variant — tight scanlines for visible effect with good legibility
const SCANLINE_MOBILE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(180deg,rgba(255,255,255,.95) 0,rgba(255,255,255,.95) 1.5px,transparent 1.5px,transparent 4px)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── Terrain canvas (extracted to @/components/ParticleField) ─────────────────


// ── Shared headline word ──────────────────────────────────────────────────────

// The second "DIG" with the scanline stripe effect
function StyledDIG({ mobile = false }: { mobile?: boolean }) {
  return <span style={mobile ? SCANLINE_MOBILE : SCANLINE}>DIG</span>;
}

// ── Live card ─────────────────────────────────────────────────────────────────

const SLEEP_ZS_CSS = `
@keyframes float-z {
  0%   { transform: translateY(0) translateX(0) scale(0.85); opacity: 0; }
  12%  { opacity: 0.32; }
  80%  { opacity: 0.18; }
  100% { transform: translateY(-36px) translateX(var(--zdx)) scale(1.15); opacity: 0; }
}
`;

const Z_PARTICLES = [
  { char: "z", size: 6,  x: 46, dx: -5,  delay: 0.0 },
  { char: "Z", size: 10, x: 52, dx:  7,  delay: 0.9 },
  { char: "z", size: 7,  x: 49, dx: -9,  delay: 1.7 },
  { char: "Z", size: 12, x: 44, dx: 11,  delay: 2.5 },
  { char: "z", size: 5,  x: 55, dx: -3,  delay: 3.3 },
];

function SleepZs({ height = 38 }: { height?: number }) {
  return (
    <>
      <style>{SLEEP_ZS_CSS}</style>
      <div style={{ position: "relative", height, width: "100%", overflow: "hidden" }}>
        {Z_PARTICLES.map((p, i) => (
          <span
            key={i}
            style={
              {
                position: "absolute",
                left: `${p.x}%`,
                bottom: 0,
                fontSize: p.size,
                color: "rgba(255,255,255,0.20)",
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1,
                userSelect: "none",
                "--zdx": `${p.dx}px`,
                animation: `float-z 3.6s ${p.delay}s infinite ease-out`,
              } as React.CSSProperties
            }
          >
            {p.char}
          </span>
        ))}
      </div>
    </>
  );
}

const TIPO_LIVE: Record<string, string> = {
  portaria: "Portaria",
  portaria_normativa: "Port. Normativa",
  ata_plenaria: "Ata Plenária",
  deliberacao: "Deliberação",
};

function agentName(tipo: string | null): string {
  if (tipo === "ata_plenaria") return "Bud";
  return "Piper";
}

function LiveCard({ analyses, fullWidth = false }: { analyses: AnaliseRecente[] | null; fullWidth?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const items = analyses ?? [];

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => i + 1);
        setFade(true);
      }, 280);
    }, 3200);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!analyses || items.length === 0) {
    if (fullWidth) {
      return (
        <div className="border border-white/8 bg-black/25 backdrop-blur-sm px-4 py-3 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-white/12" />
            <span style={SYNE} className="text-[9px] uppercase tracking-[0.28em] text-white/20">
              Idle
            </span>
          </div>
          <SleepZs height={42} />
        </div>
      );
    }
    return (
      <div className="border border-white/8 bg-black/25 backdrop-blur-sm px-3 py-2.5 w-[215px]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
          <span style={SYNE} className="text-[8px] uppercase tracking-[0.3em] text-white/20">
            Idle
          </span>
        </div>
        <SleepZs height={34} />
      </div>
    );
  }

  const current = items[idx % items.length];
  const tipo = TIPO_LIVE[current.tipo ?? ""] ?? "Ato";
  const agent = agentName(current.tipo);
  const model = current.tipo === "ata_plenaria" ? "Sonnet 4.6" : "Haiku 4.5";
  const dotCount = Math.min(items.length, 6);
  const dotIdx = idx % dotCount;

  // ── Mobile (full-width) layout ──────────────────────────────────────────────
  if (fullWidth) {
    return (
      <div className="border border-white/20 bg-black/55 backdrop-blur-sm px-4 py-3 w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00cc46] animate-pulse" />
            <span style={SYNE} className="text-[9px] uppercase tracking-[0.28em] text-white/70">
              Live
            </span>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-white/55 uppercase tracking-widest leading-none">
              {agent}
            </p>
            <p className="text-[7.5px] font-mono text-white/25 uppercase tracking-wider mt-0.5">
              {model}
            </p>
          </div>
        </div>

        <div style={{ opacity: fade ? 1 : 0, transition: "opacity 0.28s ease" }}>
          <p className="text-[9px] font-mono text-white/35 uppercase tracking-[0.16em] mb-1">
            {tipo}
          </p>
          <p className="text-[22px] font-bold text-white leading-none font-mono">
            {current.numero ?? "—"}
          </p>
        </div>

        <div className="flex gap-1 mt-3">
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[2px] rounded-full transition-colors duration-300"
              style={{ background: i === dotIdx ? "#00cc46" : "rgba(255,255,255,0.12)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Desktop (compact) layout ────────────────────────────────────────────────
  return (
    <div className="border border-white/20 bg-black/55 backdrop-blur-sm px-3 py-2.5 w-[215px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00cc46] animate-pulse" />
          <span style={SYNE} className="text-[8px] uppercase tracking-[0.3em] text-white/70">
            Live
          </span>
        </div>
        <span className="text-[7.5px] font-mono text-white/35 uppercase tracking-widest">
          {agent}
        </span>
      </div>

      <div style={{ opacity: fade ? 1 : 0, transition: "opacity 0.28s ease" }}>
        <p className="text-[8.5px] font-mono text-white/35 uppercase tracking-[0.18em] mb-0.5">
          {tipo}
        </p>
        <p className="text-[13.5px] font-bold text-white leading-tight font-mono truncate">
          {current.numero ?? "—"}
        </p>
      </div>

      <div className="flex items-center gap-1 mt-2.5">
        {Array.from({ length: dotCount }).map((_, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              height: 2,
              borderRadius: 9999,
              transition: "all 0.3s ease",
              width: i === dotIdx ? 14 : 4,
              background: i === dotIdx ? "#00cc46" : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Desktop badge ─────────────────────────────────────────────────────────────

function PoweredByClaude({ compact = false, fullWidth = false }: { compact?: boolean; fullWidth?: boolean }) {
  const padClass = compact ? "px-2.5 py-2" : "px-3 py-2.5";
  const widthClass = fullWidth ? "w-full justify-center" : "";
  const wrapClass = `flex items-center gap-2 border border-white/15 bg-black/55 backdrop-blur-sm select-none ${padClass} ${widthClass}`;
  const labelClass = compact
    ? "text-white/45 uppercase tracking-[0.22em] text-[6px]"
    : "text-white/45 uppercase tracking-[0.22em] text-[7px]";
  const dividerClass = compact ? "bg-white/15 h-3.5 w-px" : "bg-white/15 h-4 w-px";
  const imgClass = compact ? "h-4 w-auto" : "h-[18px] w-auto";
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

function Skeleton({ w, h = "1em", className = "" }: { w: string; h?: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-sm animate-pulse ${className}`}
      style={{ width: w, height: h, background: "rgba(255,255,255,0.10)", verticalAlign: "middle" }}
    />
  );
}

function SplineBrain() {
  // Mesma cena Spline usada no dashboard (/painel/chat).
  return (
    <div
      className="w-[215px] h-[215px] overflow-hidden pointer-events-auto"
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <iframe
        src="https://my.spline.design/circleparticlecopy-SrRIUJZYBEBMTeUl6OBnPOpf/"
        title="Dig Dig · 3D"
        loading="lazy"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: 0, background: "transparent" }}
      />
    </div>
  );
}

function DesktopBadge({ stats, loading, analyses, totalDocs }: { stats: PublicStats | null; loading: boolean; analyses: AnaliseRecente[] | null; totalDocs: number }) {
  return (
    <div className="flex flex-col gap-[3px] select-none flex-shrink-0 w-[215px]">
      <SplineBrain />
      <PoweredByClaude fullWidth />
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
          DOCS MAPEADOS:
        </p>
        <p className="text-[3rem] font-bold text-white leading-none tabular-nums mb-3">
          {loading ? <Skeleton w="120px" h="3rem" /> : stats ? totalDocs.toLocaleString("pt-BR") : "—"}
        </p>
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.16)" }} className="mb-[7px]" />
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-white/40 tracking-[0.12em] uppercase">
            INDÍCIOS IDENTIFICADOS
          </span>
          <span className="text-[#00cc46] font-bold text-sm leading-none">
            {loading ? <Skeleton w="24px" h="14px" /> : stats ? stats.total_criticos : "—"}
          </span>
        </div>
      </div>
      <LiveCard analyses={analyses} />
    </div>
  );
}

// ── Mobile stats — 2-column strip (mirrors desktop card) ─────────────────────

function MobileStats({ stats, loading, totalDocs }: { stats: PublicStats | null; loading: boolean; totalDocs: number }) {
  return (
    <div className="border border-white/10 bg-black/55 select-none rounded-lg overflow-hidden">
      {/* Top row: alert */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
        <span className="text-[10px] font-mono text-yellow-300 tracking-[0.18em] uppercase">
          ↑ ELEVADO
        </span>
        <span className="text-[10px] font-mono text-white/40 tracking-[0.14em] uppercase">
          NÍVEL DE ATENÇÃO
        </span>
      </div>

      {/* Main row: count */}
      <div className="flex items-end justify-between px-4 pt-3 pb-3">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-white/40 tracking-[0.18em] uppercase mb-1">
            DOCS MAPEADOS:
          </span>
          <span className="text-[2.4rem] font-bold text-white tabular-nums leading-none">
            {loading ? <Skeleton w="100px" h="2.4rem" /> : stats ? totalDocs.toLocaleString("pt-BR") : "—"}
          </span>
        </div>
      </div>

      {/* Bottom row: indícios */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px dashed rgba(255,255,255,0.16)" }}>
        <span className="text-[9px] font-mono text-white/40 tracking-[0.14em] uppercase">
          INDÍCIOS IDENTIFICADOS
        </span>
        <span className="text-[#00cc46] font-bold text-base leading-none">
          {loading ? <Skeleton w="24px" h="16px" /> : stats ? stats.total_criticos : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const links = [
    { to: "/solucoes", label: "Soluções" },
    { to: "/modelos", label: "Modelos" },
    { to: "/apoiar", label: "Apoiar" },
  ] as const;

  return (
    <nav className="relative z-30 flex items-center justify-between px-6 md:px-14 py-5 md:py-6">
      <Link to="/" style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[12px] md:text-[13px] uppercase">
        DIG DIG
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="hover:text-white transition-colors duration-200">{l.label}</Link>
        ))}
      </div>
      <a href="/entrar" className="hidden md:inline text-[13px] text-white/50 hover:text-white transition-colors duration-200">
        Entrar
      </a>

      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-white/80 active:scale-95 transition"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 bg-[#0a0a0a] border-b border-white/10 px-6 pt-5 pb-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[12px] uppercase">
                DIG DIG
              </span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 active:scale-95 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="text-white text-[22px] font-medium py-4 border-b border-white/10"
                  style={SYNE}
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="/entrar"
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex items-center justify-center h-12 rounded-md bg-white text-black text-[14px] font-semibold uppercase tracking-wider"
                style={SYNE}
              >
                Entrar
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Desktop hero ──────────────────────────────────────────────────────────────

function DesktopHero({ stats, loading, analyses, totalDocs }: { stats: PublicStats | null; loading: boolean; analyses: AnaliseRecente[] | null; totalDocs: number }) {
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
          Devolvemos o controle aos cidadãos, traduzindo milhares de documentos oficiais com IA.
          <br />Indícios aparecem. Você decide o que fazer.
        </p>

        <a
          href="/explorar"
          style={{ ...SYNE, background: "#009C3B", letterSpacing: "0.22em" }}
          className="self-start inline-block text-white text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
        >
          EXPLORAR AUDITORIA
        </a>
        <Link
          to="/apoiar"
          style={{ ...SYNE, letterSpacing: "0.16em" }}
          className="self-start text-white/45 text-[10px] uppercase hover:text-white/70 transition-colors"
        >
          Entenda nosso propósito →
        </Link>
      </div>

      <div className="mb-1">
        <DesktopBadge stats={stats} loading={loading} analyses={analyses} totalDocs={totalDocs} />
      </div>
    </main>
  );
}

// ── Mobile hero ───────────────────────────────────────────────────────────────

function MobileHero({ stats, loading, analyses, totalDocs }: { stats: PublicStats | null; loading: boolean; analyses: AnaliseRecente[] | null; totalDocs: number }) {
  return (
    <div
      className="md:hidden relative z-20 flex flex-col px-5 pb-5 gap-5"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      {/* Live tag */}
      <div className="self-start flex items-center gap-2 border border-white/15 bg-black/55 px-2.5 py-1 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00cc46] animate-pulse" />
        <span style={SYNE} className="text-[9px] uppercase tracking-[0.22em] text-white/70">
          Auditoria ao vivo
        </span>
      </div>

      {/* Headline */}
      <h1
        style={{
          ...SYNE,
          fontSize: "clamp(1.95rem, 9vw, 2.9rem)",
          lineHeight: 0.92,
          letterSpacing: "-0.02em",
        }}
        className="text-white"
      >
        <span className="block">
          DIG <StyledDIG mobile />
          <sup style={{ fontSize: "0.25em", verticalAlign: "super", fontWeight: 400, letterSpacing: 0, color: "rgba(255,255,255,0.35)" }}>
            ®
          </sup>
        </span>
        <span className="block">Escavamos</span>
        <span className="block" style={{ color: "rgba(255,255,255,0.5)" }}>
          os atos públicos.
        </span>
      </h1>

      <p className="text-white/45 text-[13.5px] leading-relaxed max-w-[300px]">
        Devolvemos o controle aos cidadãos, traduzindo documentos públicos com IA.
        <br />Indícios aparecem. Você age.
      </p>

      <MobileStats stats={stats} loading={loading} totalDocs={totalDocs} />

      <LiveCard analyses={analyses} fullWidth />

      <PoweredByClaude compact fullWidth />

      <a
        href="/explorar"
        style={{ ...SYNE, background: "#009C3B", letterSpacing: "0.20em" }}
        className="flex items-center justify-center gap-2 w-full text-white text-[11px] uppercase py-4 rounded-lg active:scale-[0.99] hover:opacity-90 transition-all"
      >
        EXPLORAR AUDITORIA
        <span aria-hidden className="text-[14px]">→</span>
      </a>
      <Link
        to="/apoiar"
        style={{ ...SYNE, letterSpacing: "0.16em" }}
        className="text-center text-white/40 text-[10px] uppercase hover:text-white/60 transition-colors"
      >
        Entenda nosso propósito →
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function HomePage() {
  const { stats, finStats, isLoading: loading } = useOrgao("cau-pr");
  const [recentAnalyses, setRecentAnalyses] = useState<AnaliseRecente[] | null>(null);
  const [tenantsTotalAtos, setTenantsTotalAtos] = useState<number>(0);

  // Soma `total_atos` de TODOS os tenants do banco (ativos ou em coleta).
  // Cobre CAU/PR + GOV/PR + futuros, sem precisar fetchar stats individuais.
  // Diárias + Passagens (via Implanta) ainda vêm só do CAU/PR — outros órgãos
  // não usam Implanta.
  const totalDocs = tenantsTotalAtos
    + (finStats?.diarias.total ?? 0)
    + (finStats?.passagens.total ?? 0);

  useEffect(() => {
    fetchAnalysesRecentes("cau-pr")
      .then(setRecentAnalyses)
      .catch(() => setRecentAnalyses([]));
    fetch("/public/tenants")
      .then((r) => r.json())
      .then((tenants: Array<{ total_atos?: number }>) => {
        const total = tenants.reduce((acc, t) => acc + (t.total_atos ?? 0), 0);
        setTenantsTotalAtos(total);
      })
      .catch(() => setTenantsTotalAtos(stats?.total_atos ?? 0));
  }, [stats?.total_atos]);

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

      <DesktopHero stats={stats} loading={loading} analyses={recentAnalyses} totalDocs={totalDocs} />
      <MobileHero stats={stats} loading={loading} analyses={recentAnalyses} totalDocs={totalDocs} />
    </div>
  );
}
