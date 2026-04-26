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
import {
  ChevronDown,
  MessageSquare,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Settings,
  HelpCircle,
} from "lucide-react";

const BORDER = "#ebe8e0";
const BORDER_SOFT = "#f1efe8";
const MUTED = "#7a7872";
const MUTED_SOFT = "#a8a59c";
const INK = "#0a0a0a";
const SURFACE = "#faf8f3";
const SURFACE_HOVER = "#f5f2ea";
const ACCENT = "#16a34a";

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
  const orgaos = [
    { nome: "CAU/PR", slug: "cau-pr", ativo: true, dot: ACCENT },
    { nome: "Pref. de Curitiba", slug: null, ativo: false },
    { nome: "CRM/PR", slug: null, ativo: false },
    { nome: "Câmara de Curitiba", slug: null, ativo: false },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <Link
          to="/"
          onClick={onNavigate}
          className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded-[7px] text-white text-[10px] font-bold tracking-wider"
            style={{
              background: INK,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            DD
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
          >
            DIG · DIG
          </span>
        </Link>
        <span
          className="text-[8.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
          style={{
            color: MUTED,
            background: SURFACE,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          beta
        </span>
      </div>

      {/* ── Quick search (visual) ─────────────────────────── */}
      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-2 px-2.5 h-8 rounded-md transition-colors hover:bg-[#f5f2ea] cursor-pointer"
          style={{ background: SURFACE, border: `1px solid ${BORDER_SOFT}` }}
        >
          <Search size={12} style={{ color: MUTED_SOFT }} />
          <span className="text-[12px] flex-1" style={{ color: MUTED_SOFT }}>
            Buscar…
          </span>
          <kbd
            className="text-[9px] px-1 py-px rounded border"
            style={{
              color: MUTED,
              background: "white",
              borderColor: BORDER,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div
          className="text-[9.5px] uppercase tracking-[0.22em] px-3 pt-2 pb-1.5 font-medium"
          style={{ color: MUTED_SOFT, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Workspace
        </div>

        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={"/painel/chat" as any}
          onClick={onNavigate}
          className="group flex items-center gap-2.5 px-3 h-9 rounded-md text-[13px] transition-all"
          style={{ color: MUTED }}
          activeProps={{
            style: {
              color: INK,
              background: SURFACE,
              fontWeight: 500,
            },
          }}
        >
          <MessageSquare size={14} className="opacity-80" />
          <span className="flex-1">Chat com IA</span>
          <Sparkles size={11} style={{ color: MUTED_SOFT }} />
        </Link>

        <div
          className="text-[9.5px] uppercase tracking-[0.22em] px-3 pt-4 pb-1.5 font-medium"
          style={{ color: MUTED_SOFT, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Escavações
        </div>

        <Collapsible open={excavOpen} onOpenChange={setExcavOpen}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full px-3 h-8 rounded-md text-[12px] transition-colors hover:bg-[#f5f2ea]"
            style={{ color: MUTED }}
          >
            <span className="flex items-center gap-2">
              <span
                className="text-[10px] tabular-nums"
                style={{
                  color: MUTED_SOFT,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                01 / 04
              </span>
              <span>Órgãos auditados</span>
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${excavOpen ? "rotate-180" : ""}`}
              style={{ color: MUTED_SOFT }}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5">
            {orgaos.map((o) =>
              o.ativo && o.slug ? (
                <Link
                  key={o.nome}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={"/painel/$slug" as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ slug: o.slug } as any}
                  onClick={onNavigate}
                  className="group flex items-center gap-2.5 pl-3 pr-2 h-8 rounded-md text-[12.5px] transition-all relative"
                  style={{ color: MUTED }}
                  activeProps={{
                    style: {
                      color: INK,
                      background: SURFACE,
                      fontWeight: 500,
                    },
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: o.dot,
                      boxShadow: `0 0 0 3px ${o.dot}1a`,
                    }}
                  />
                  <span className="flex-1 truncate">{o.nome}</span>
                </Link>
              ) : (
                <div
                  key={o.nome}
                  className="flex items-center gap-2.5 pl-3 pr-2 h-8 rounded-md text-[12.5px]"
                  style={{ color: "#bdbab2" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full border"
                    style={{ borderColor: "#d8d4ca" }}
                  />
                  <span className="flex-1 truncate">{o.nome}</span>
                  <span
                    className="text-[8.5px] px-1.5 py-0.5 rounded uppercase tracking-[0.14em]"
                    style={{
                      background: SURFACE,
                      color: MUTED_SOFT,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    breve
                  </span>
                </div>
              ),
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Stats compact card */}
        <div
          className="mx-1 mt-5 mb-3 p-3 rounded-lg"
          style={{
            background: `linear-gradient(180deg, ${SURFACE} 0%, white 100%)`,
            border: `1px solid ${BORDER_SOFT}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[9.5px] uppercase tracking-[0.22em] font-medium"
              style={{
                color: MUTED,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Pipeline ao vivo
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: ACCENT }}
              />
              <span
                className="text-[9px] uppercase tracking-wider"
                style={{
                  color: ACCENT,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                live
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span
              className="text-[20px] font-semibold tabular-nums tracking-tight"
              style={{ color: INK }}
            >
              262
            </span>
            <span
              className="text-[10.5px]"
              style={{
                color: MUTED,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              / 400
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: BORDER_SOFT }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: "65.5%", background: INK }}
            />
          </div>
          <p
            className="text-[10.5px] mt-2 leading-snug"
            style={{ color: MUTED }}
          >
            Portarias CAU/PR · 65,5% concluído
          </p>
        </div>
      </nav>

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        className="px-3 pt-2 pb-3 space-y-0.5"
        style={{ borderTop: `1px solid ${BORDER_SOFT}` }}
      >
        <a
          href="mailto:contato@digdig.com.br"
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] transition-colors hover:bg-[#f5f2ea]"
          style={{ color: MUTED }}
        >
          <HelpCircle size={13} className="opacity-70" />
          <span>Ajuda &amp; feedback</span>
        </a>
        <Link
          to="/precos"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] transition-colors hover:bg-[#f5f2ea]"
          style={{ color: MUTED }}
        >
          <Settings size={13} className="opacity-70" />
          <span>Plano &amp; conta</span>
        </Link>

        <div
          className="mt-2 mx-1 p-2 rounded-lg flex items-center gap-2.5"
          style={{ background: SURFACE, border: `1px solid ${BORDER_SOFT}` }}
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-semibold flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${INK} 0%, #3a3a35 100%)`,
              fontFamily: "'Inter Tight', sans-serif",
            }}
          >
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium truncate leading-tight"
              style={{ color: INK }}
            >
              {userEmail || "—"}
            </p>
            <p
              className="text-[9.5px] uppercase tracking-[0.16em] mt-0.5"
              style={{
                color: MUTED,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Plano cidadão
            </p>
          </div>
          <button
            onClick={onSignOut}
            title="Sair"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-white"
            style={{ color: MUTED }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
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

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar" });
  }

  return (
    <div
      className="flex flex-col md:flex-row min-h-[100dvh] bg-white"
      style={{
        color: INK,
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Mobile top bar ───────────────────────────────────── */}
      <header
        className="md:hidden flex items-center justify-between px-4 h-14 bg-white sticky top-0 z-40"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Abrir menu"
              className="p-2 -ml-2 transition-colors hover:text-[#0a0a0a]"
              style={{ color: INK }}
            >
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px] max-w-[80vw]">
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
          className="text-[11px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
        >
          DIG · DIG
        </Link>
        <span className="w-8" />
      </header>

      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside
        className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-white"
        style={{ borderRight: `1px solid ${BORDER}` }}
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
