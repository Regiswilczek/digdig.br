import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/pnl")({
  component: PnlLayout,
});

const ADMIN_EMAIL = "regisalessander@gmail.com";

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

// ── Layout principal ──────────────────────────────────────────────────────────
function PnlLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [magicSent, setMagicSent] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s && s.user.email === ADMIN_EMAIL) {
        // redireciona para dashboard ao logar
        navigate({ to: "/pnl/dashboard" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    try {
      const res = await fetch("/pnl/admin/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail ?? "Erro ao enviar link");
      }
      setMagicSent(true);
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : "Erro ao enviar link");
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  // Carregando sessão
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#07080f] flex items-center justify-center">
        <span className="text-white/30 text-[11px] uppercase tracking-[0.2em]">Verificando acesso…</span>
      </div>
    );
  }

  // Não logado → magic link form
  if (!session) {
    return (
      <div className="min-h-screen bg-[#07080f] flex items-center justify-center px-4">
        <div className="w-full max-w-[360px]">
          <p style={{ ...SYNE, letterSpacing: "0.2em" }} className="text-white/30 text-[10px] uppercase mb-8 text-center">
            Dig Dig · Admin
          </p>

          {magicSent ? (
            <div className="text-center">
              <p style={SYNE} className="text-white text-[1.2rem] uppercase mb-3">Link enviado.</p>
              <p className="text-white/50 text-[13px] leading-relaxed">
                Verifique <span className="text-white">{email}</span> e clique no link de acesso.
              </p>
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2" style={SYNE}>
                  Email admin
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/35 transition-colors"
                />
              </div>
              {err && <p className="text-yellow-300/80 text-[12px] border-l-2 border-yellow-300/50 pl-3">{err}</p>}
              <button
                type="submit"
                disabled={sending}
                style={SYNE}
                className="w-full bg-white text-[#07080f] py-3 text-[11px] uppercase tracking-[0.2em] hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar link de acesso"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Logado mas não é admin
  if (session.user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-[#07080f] flex items-center justify-center px-4 text-center">
        <div>
          <p style={SYNE} className="text-white text-[1.1rem] uppercase mb-3">Acesso negado.</p>
          <p className="text-white/50 text-[13px] mb-6">Este painel é restrito ao administrador.</p>
          <button onClick={signOut} className="text-white/40 text-[11px] uppercase tracking-[0.16em] hover:text-white">
            Sair →
          </button>
        </div>
      </div>
    );
  }

  // Admin logado → painel completo
  return (
    <div className="min-h-screen bg-[#07080f] flex">
      <AdminSidebar onSignOut={signOut} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function AdminSidebar({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation();

  const navItems = [
    { to: "/pnl/dashboard", label: "Dashboard" },
    { to: "/pnl/usuarios", label: "Usuários" },
    { to: "/pnl/pipeline", label: "Pipeline" },
    { to: "/pnl/financeiro", label: "Financeiro" },
  ];

  return (
    <aside
      className="w-[200px] flex-shrink-0 border-r border-white/[0.07] flex flex-col"
      style={{ background: "#0a0c15" }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.07]">
        <Link to="/pnl/dashboard">
          <p style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-white text-[11px] uppercase">
            Dig Dig
          </p>
          <p className="text-white/30 text-[9px] uppercase tracking-[0.16em] mt-0.5">Admin</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
              style={SYNE}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.07]">
        <button
          onClick={onSignOut}
          className="text-[10px] uppercase tracking-[0.14em] text-white/25 hover:text-white/60 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
