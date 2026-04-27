import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, MessageSquare, LogOut, Menu } from "lucide-react";
import {
  INK,
  PAPER,
  PAPER_DEEP,
  BORDER,
  BORDER_SOFT,
  HAIRLINE,
  MUTED,
  MUTED_SOFT,
  SUBTLE,
  ACCENT,
  MONO,
  TIGHT,
  SIDEBAR_W,
  RADIUS,
  tag,
} from "../lib/painel-theme";
import { useOrgao } from "../lib/orgao-store";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — route is registered once dev server regenerates routeTree.gen.ts
export const Route = createFileRoute("/painel")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/entrar" });
    return { session };
  },
  component: PainelLayout,
});

/**
 * Cantos decorativos (4 cantos) — assinatura "Terminal Brutalist".
 * Aplica 4 traços de 6×6px nos cantos do container pai.
 */
function CornerMarks({ color = HAIRLINE, size = 6 }: { color?: string; size?: number }) {
  const s = `${size}px`;
  const common = {
    position: "absolute" as const,
    width: s,
    height: s,
    pointerEvents: "none" as const,
  };
  return (
    <>
      <span style={{ ...common, top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ ...common, top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
      <span style={{ ...common, bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ ...common, bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
    </>
  );
}

function SidebarContent({
  userEmail,
  excavOpen,
  setExcavOpen,
  onSignOut,
  onNavigate,
}: {
  userEmail: string;
  excavOpen: boolean;
  setExcavOpen: (v: boolean) => void;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const initial = (userEmail?.[0] ?? "•").toUpperCase();
  const { stats: pipelineStats, finStats: pipelineFinStats } = useOrgao("cau-pr");
  const orgaos = [
    { nome: "CAU/PR", slug: "cau-pr", ativo: true, n: 1 },
    { nome: "Pref. de Curitiba", slug: null, ativo: false, n: 2 },
    { nome: "CRM/PR", slug: null, ativo: false, n: 3 },
    { nome: "Câmara de Curitiba", slug: null, ativo: false, n: 4 },
  ];

  // Build version string com timestamp atual estável (build-time-ish)
  const version = "v0.4.0";

  return (
    <div className="flex flex-col h-full" style={{ background: "#fff", color: INK }}>
      {/* ─── Top status bar — estilo IDE ──────────────────── */}
      <div
        className="flex items-center justify-between px-3 h-7 flex-shrink-0"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: PAPER,
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.18em",
          color: MUTED_SOFT,
          textTransform: "uppercase",
        }}
      >
        <span>~/painel</span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
          />
          online
        </span>
      </div>

      {/* ─── Brand ────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 group"
        >
          <span
            className="flex items-center justify-center w-8 h-8 text-white text-[10.5px] font-bold tracking-[0.05em] flex-shrink-0 relative"
            style={{
              background: INK,
              fontFamily: MONO,
              borderRadius: RADIUS,
            }}
          >
            DD
            <span
              className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
              style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
            />
          </span>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[12px] font-semibold leading-none tracking-[0.22em]"
              style={{ color: INK, fontFamily: MONO }}
            >
              DIG·DIG
            </span>
            <span
              className="text-[8.5px] uppercase leading-none tracking-[0.18em]"
              style={{ color: MUTED_SOFT, fontFamily: MONO }}
            >
              {version} / beta
            </span>
          </div>
        </Link>
      </div>

      {/* divisor com label */}
      <div className="px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[8.5px] tracking-[0.22em] uppercase"
            style={{ color: MUTED_SOFT, fontFamily: MONO }}
          >
            ▮ workspace
          </span>
          <span className="flex-1 h-px" style={{ background: HAIRLINE }} />
        </div>
      </div>

      {/* ─── Nav ──────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <NavItem
          to={"/painel/chat"}
          onNavigate={onNavigate}
          n={tag(0)}
          icon={<MessageSquare size={13} className="opacity-80" />}
          label="Chat IA"
          accent
        />

        <div className="px-2 mt-5 mb-2 flex items-center gap-2">
          <span
            className="text-[8.5px] tracking-[0.22em] uppercase"
            style={{ color: MUTED_SOFT, fontFamily: MONO }}
          >
            ▮ escavações
          </span>
          <span className="flex-1 h-px" style={{ background: HAIRLINE }} />
          <span
            className="text-[8.5px] tracking-[0.18em] uppercase tabular-nums"
            style={{ color: MUTED_SOFT, fontFamily: MONO }}
          >
            01/04
          </span>
        </div>

        <Collapsible open={excavOpen} onOpenChange={setExcavOpen}>
          <CollapsibleTrigger
            className="group flex items-center justify-between w-full px-3 h-7 text-[10.5px] uppercase tracking-[0.16em] transition-colors hover:bg-[#faf8f3]"
            style={{ color: MUTED, fontFamily: MONO, borderRadius: RADIUS }}
          >
            <span>órgãos auditados</span>
            <ChevronDown
              size={11}
              className={`transition-transform ${excavOpen ? "rotate-180" : ""}`}
              style={{ color: MUTED_SOFT }}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-px">
            {orgaos.map((o) =>
              o.ativo && o.slug ? (
                <Link
                  key={o.nome}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={"/painel/$slug" as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ slug: o.slug } as any}
                  onClick={onNavigate}
                  className="group flex items-center gap-2.5 pl-3 pr-2 h-8 text-[12px] transition-all relative"
                  style={{
                    color: MUTED,
                    fontFamily: TIGHT,
                    borderRadius: RADIUS,
                  }}
                  activeProps={{
                    style: {
                      color: INK,
                      background: PAPER,
                      fontWeight: 500,
                      fontFamily: TIGHT,
                      borderRadius: RADIUS,
                      boxShadow: `inset 2px 0 0 ${ACCENT}`,
                    },
                  }}
                >
                  <span
                    className="text-[9px] tabular-nums"
                    style={{ color: MUTED_SOFT, fontFamily: MONO, letterSpacing: "0.06em" }}
                  >
                    {tag(o.n)}
                  </span>
                  <span className="flex-1 truncate">{o.nome}</span>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
                  />
                </Link>
              ) : (
                <div
                  key={o.nome}
                  className="flex items-center gap-2.5 pl-3 pr-2 h-8 text-[12px]"
                  style={{ color: "#bdbab2", fontFamily: TIGHT }}
                >
                  <span
                    className="text-[9px] tabular-nums"
                    style={{ color: "#cfcbc1", fontFamily: MONO, letterSpacing: "0.06em" }}
                  >
                    {tag(o.n)}
                  </span>
                  <span className="flex-1 truncate">{o.nome}</span>
                  <span
                    className="text-[8.5px] uppercase tracking-[0.14em]"
                    style={{ color: MUTED_SOFT, fontFamily: MONO }}
                  >
                    queue
                  </span>
                </div>
              ),
            )}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* ─── Pipeline live card ───────────────────────────── */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div
          className="relative p-3"
          style={{
            background: PAPER,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
          }}
        >
          <CornerMarks color={INK} size={5} />
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[8.5px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              pipeline
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-1 w-1 rounded-full animate-pulse"
                style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
              />
              <span
                className="text-[8.5px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: ACCENT, fontFamily: MONO }}
              >
                live
              </span>
            </span>
          </div>
          {(() => {
            const analisados = pipelineStats?.total_analisados ?? null;
            const total = pipelineStats
              ? (pipelineStats.total_atos
                  + (pipelineFinStats?.diarias.total ?? 0)
                  + (pipelineFinStats?.passagens.total ?? 0))
              : null;
            const pct = analisados != null && total ? Math.round((analisados / total) * 1000) / 10 : null;
            return (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[22px] tabular-nums"
                    style={{
                      color: INK,
                      fontFamily: TIGHT,
                      fontWeight: 500,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {analisados ?? "—"}
                  </span>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: MUTED, fontFamily: MONO }}
                  >
                    / {total ?? "—"}
                  </span>
                  <span
                    className="ml-auto text-[9.5px] tabular-nums"
                    style={{ color: ACCENT, fontFamily: MONO, fontWeight: 600 }}
                  >
                    {pct != null ? `${pct}%` : "—"}
                  </span>
                </div>
                <div
                  className="mt-2 h-[3px] overflow-hidden relative"
                  style={{ background: BORDER, borderRadius: 1 }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: pct != null ? `${pct}%` : "0%",
                      background: `linear-gradient(90deg, ${INK} 0%, ${ACCENT} 100%)`,
                    }}
                  />
                </div>
                <p
                  className="text-[9px] mt-2 leading-snug uppercase tracking-[0.14em]"
                  style={{ color: MUTED_SOFT, fontFamily: MONO }}
                >
                  cau/pr · {total != null ? `${total} docs` : "carregando…"}
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* ─── User footer — terminal style ─────────────────── */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex items-center justify-center w-7 h-7 text-white text-[11px] font-semibold flex-shrink-0"
            style={{
              background: INK,
              fontFamily: MONO,
              borderRadius: RADIUS,
            }}
          >
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium truncate leading-tight"
              style={{ color: INK, fontFamily: TIGHT }}
            >
              {userEmail || "—"}
            </p>
            <Link
              to="/precos"
              onClick={onNavigate}
              className="text-[8.5px] uppercase tracking-[0.18em] mt-0.5 inline-block hover:text-[#0a0a0a] transition-colors"
              style={{ color: MUTED_SOFT, fontFamily: MONO }}
            >
              plano · cidadão →
            </Link>
          </div>
          <button
            onClick={onSignOut}
            title="Encerrar sessão"
            className="flex items-center justify-center w-7 h-7 transition-colors hover:bg-[#faf8f3]"
            style={{ color: MUTED, borderRadius: RADIUS }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* ─── Bottom status bar ────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 h-6 flex-shrink-0"
        style={{
          borderTop: `1px solid ${BORDER}`,
          background: PAPER_DEEP,
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: "0.18em",
          color: MUTED_SOFT,
          textTransform: "uppercase",
        }}
      >
        <span>haiku 4.5 · sonnet 4.6</span>
        <span>{new Date().getFullYear()}</span>
      </div>
    </div>
  );
}

function NavItem({
  to,
  onNavigate,
  n,
  icon,
  label,
  accent = false,
}: {
  to: string;
  onNavigate?: () => void;
  n: string;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      onClick={onNavigate}
      className="group flex items-center gap-2.5 px-3 h-9 text-[13px] transition-all"
      style={{ color: MUTED, fontFamily: TIGHT, borderRadius: RADIUS }}
      activeProps={{
        style: {
          color: INK,
          background: PAPER,
          fontWeight: 500,
          fontFamily: TIGHT,
          borderRadius: RADIUS,
          boxShadow: `inset 2px 0 0 ${ACCENT}`,
        },
      }}
    >
      <span
        className="text-[9px] tabular-nums"
        style={{ color: MUTED_SOFT, fontFamily: MONO, letterSpacing: "0.06em" }}
      >
        {n}
      </span>
      {icon}
      <span className="flex-1">{label}</span>
      {accent && (
        <span
          className="text-[8.5px] uppercase tracking-[0.18em] px-1.5 py-0.5"
          style={{
            color: ACCENT,
            background: "#f0fdf4",
            border: `1px solid ${ACCENT}33`,
            fontFamily: MONO,
            borderRadius: 1,
            fontWeight: 600,
          }}
        >
          AI
        </span>
      )}
    </Link>
  );
}

function PainelLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [excavOpen, setExcavOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: "/entrar" });
        return;
      }
      setUserEmail(session.user.email ?? "");
    });
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar" });
  }

  return (
    <div
      className="flex flex-col md:flex-row min-h-[100dvh]"
      style={{
        color: INK,
        fontFamily: TIGHT,
        background: "#fff",
      }}
    >
      {/* ── Mobile top bar ───────────────────────────────────── */}
      <header
        className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "#fff",
        }}
      >
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Abrir menu"
              className="p-2 -ml-2 transition-colors hover:text-[#0a0a0a]"
              style={{ color: INK }}
            >
              <Menu size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] max-w-[85vw]">
            <SidebarContent
              userEmail={userEmail}
              excavOpen={excavOpen}
              setExcavOpen={setExcavOpen}
              onSignOut={handleSignOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          className="flex items-center gap-2"
        >
          <span
            className="flex items-center justify-center w-6 h-6 text-white text-[9px] font-bold"
            style={{ background: INK, fontFamily: MONO, borderRadius: RADIUS }}
          >
            DD
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: INK, fontFamily: MONO }}
          >
            DIG·DIG
          </span>
        </Link>
        <span className="flex items-center gap-1">
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
          />
          <span
            className="text-[8.5px] uppercase tracking-[0.18em]"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            live
          </span>
        </span>
      </header>

      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-shrink-0 flex-col"
        style={{
          width: SIDEBAR_W,
          background: "#fff",
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        <SidebarContent
          userEmail={userEmail}
          excavOpen={excavOpen}
          setExcavOpen={setExcavOpen}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex min-w-0 bg-white">
        <Outlet />
      </div>
    </div>
  );
}
