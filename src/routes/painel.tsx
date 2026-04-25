import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, MessageSquare, LogOut } from "lucide-react";

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

function PainelLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [excavOpen, setExcavOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: "/entrar" });
        return;
      }
      setUserEmail(session.user.email ?? "");
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar" });
  }

  return (
    <div
      className="flex min-h-[100dvh] bg-[#07080f] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Sidebar (220px) ──────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#09090f]">
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <Link
            to="/"
            className="text-[13px] uppercase tracking-[0.2em] font-bold text-white hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            DIG DIG
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {/* Chat IA */}
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={"/painel/chat" as any}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
            activeProps={{
              className:
                "bg-gradient-to-r from-violet-600/80 to-violet-500/60 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]",
            }}
          >
            <MessageSquare size={14} />
            Chat com IA
          </Link>

          {/* Escavações accordion */}
          <Collapsible open={excavOpen} onOpenChange={setExcavOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                activeProps={{ className: "bg-white/[0.08] text-white" }}
              >
                <span className="text-green-400 text-[10px]">●</span>
                CAU/PR
              </Link>
              {[
                "Pref. de Curitiba",
                "CRM/PR",
                "Câmara de Curitiba",
              ].map((nome) => (
                <div
                  key={nome}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/30 cursor-not-allowed"
                >
                  <span className="text-white/20 text-[10px]">○</span>
                  {nome}
                  <span className="ml-auto text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    em breve
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-1">
          <a
            href="mailto:contato@digdig.com.br"
            className="flex items-center px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Feedback
          </a>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] text-white/35 truncate max-w-[130px]">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="text-white/30 hover:text-white/70 transition-colors ml-1"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
