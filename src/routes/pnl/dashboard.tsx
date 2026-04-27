import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/pnl/dashboard")({
  component: DashboardPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

interface AdminStats {
  waitlist: { pendente: number; aprovado: number; rejeitado: number; total: number };
  atos_total: number;
  analises_total: number;
  custo_total_usd: number;
  rodadas_ativas: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/pnl/admin/stats", {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (!res.ok) throw new Error("Erro ao buscar stats");
  return res.json();
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-2" style={SYNE}>
        {label}
      </p>
      <p className="text-[2rem] text-white font-bold leading-none" style={SYNE}>
        {value}
      </p>
      {sub && <p className="text-white/30 text-[11px] mt-1.5">{sub}</p>}
    </div>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1" style={SYNE}>
          Visão geral
        </p>
        <h1 className="text-white text-[1.6rem] uppercase tracking-tight" style={SYNE}>
          Dashboard
        </h1>
      </div>

      {loading ? (
        <p className="text-white/30 text-[12px] uppercase tracking-[0.16em]">Carregando…</p>
      ) : stats ? (
        <>
          <section className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Fila de espera
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Pendentes" value={fmt(stats.waitlist.pendente)} />
              <StatCard label="Aprovados" value={fmt(stats.waitlist.aprovado)} />
              <StatCard label="Rejeitados" value={fmt(stats.waitlist.rejeitado)} />
              <StatCard label="Total" value={fmt(stats.waitlist.total)} />
            </div>
          </section>

          <section className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Investigação
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Atos no banco" value={fmt(stats.atos_total)} />
              <StatCard label="Analisados" value={fmt(stats.analises_total)} />
              <StatCard label="Custo acumulado" value={fmtUsd(stats.custo_total_usd)} sub="Haiku + Sonnet" />
              <StatCard label="Rodadas ativas" value={stats.rodadas_ativas} />
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Ações rápidas
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/pnl/usuarios"
                className="border border-white/[0.08] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white/60 hover:text-white hover:border-white/20 transition-colors"
                style={{ ...SYNE, background: "#0d0f1a" }}
              >
                Ver fila de espera →
              </a>
              <a
                href="/pnl/pipeline"
                className="border border-white/[0.08] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white/60 hover:text-white hover:border-white/20 transition-colors"
                style={{ ...SYNE, background: "#0d0f1a" }}
              >
                Ver pipeline →
              </a>
            </div>
          </section>
        </>
      ) : (
        <p className="text-yellow-300/70 text-[12px]">Erro ao carregar dados.</p>
      )}
    </div>
  );
}
