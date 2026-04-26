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

const BORDER = "#e8e6e1";
const MUTED = "#6b6b66";
const INK = "#0a0a0a";

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
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 pt-6 pb-5">
        <Link
          to="/"
          onClick={onNavigate}
          className="text-[11px] uppercase tracking-[0.28em] font-semibold hover:opacity-60 transition-opacity"
          style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
        >
          DIG · DIG
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={"/painel/chat" as any}
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors"
          style={{ color: MUTED }}
          activeProps={{
            style: { color: INK, background: "#f5f3ee", fontWeight: 500 },
          }}
        >
          <MessageSquare size={14} />
          Chat com IA
        </Link>

        <Collapsible open={excavOpen} onOpenChange={setExcavOpen}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-[#f5f3ee]"
            style={{ color: MUTED }}
          >
            <span>Escavações</span>
            <ChevronDown
              size={13}
              className={`transition-transform ${excavOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={"/painel/$slug" as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              params={{ slug: "cau-pr" } as any}
              onClick={onNavigate}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] transition-colors"
              style={{ color: MUTED }}
              activeProps={{
                style: { color: INK, background: "#f5f3ee", fontWeight: 500 },
              }}
            >
              <span style={{ color: "#16a34a" }} className="text-[10px]">
                ●
              </span>
              CAU/PR
            </Link>
            {["Pref. de Curitiba", "CRM/PR", "Câmara de Curitiba"].map(
              (nome) => (
                <div
                  key={nome}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px]"
                  style={{ color: "#b8b6b1" }}
                >
                  <span className="text-[10px]">○</span>
                  {nome}
                  <span
                    className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                    style={{
                      background: "#f5f3ee",
                      color: MUTED,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    em breve
                  </span>
                </div>
              ),
            )}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <div
        className="px-3 py-3 space-y-1"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <a
          href="mailto:contato@digdig.com.br"
          className="flex items-center px-3 py-2 rounded-md text-[12px] transition-colors hover:text-[#0a0a0a]"
          style={{ color: MUTED }}
        >
          Feedback
        </a>
        <div className="flex items-center justify-between px-3 py-2">
          <span
            className="text-[11px] truncate max-w-[150px]"
            style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {userEmail}
          </span>
          <button
            onClick={onSignOut}
            title="Sair"
            className="transition-colors hover:text-[#0a0a0a]"
            style={{ color: MUTED }}
          >
            <LogOut size={13} />
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
        className="hidden md:flex w-[240px] flex-shrink-0 flex-col bg-white"
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
