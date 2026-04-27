import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/pnl-login")({
  component: PnlLoginRelay,
});

// Relay page: Supabase redirects here (digdig.com.br is in the allowed list).
// We forward the hash tokens to pnl.digdig.com.br so the session is stored
// on the correct origin — localStorage is scoped per-origin.
function PnlLoginRelay() {
  useEffect(() => {
    const hash = window.location.hash;
    window.location.replace(`https://pnl.digdig.com.br/pnl/dashboard${hash}`);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center">
      <span className="text-white/30 text-[11px] uppercase tracking-[0.2em]">Redirecionando…</span>
    </div>
  );
}
