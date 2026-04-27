import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/pnl/financeiro")({
  component: FinanceiroPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

interface FinStats {
  diarias: { total: number; valor_total: number };
  passagens: { total: number; valor_total: number };
}

interface CustoIA {
  custo_total_usd: number;
  rodadas: number;
}

function FinanceiroPage() {
  const [finStats, setFinStats] = useState<FinStats | null>(null);
  const [custoIA, setCustoIA] = useState<CustoIA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();

      // Dados financeiros públicos (CAU/PR)
      const finRes = await fetch("/public/orgaos/cau-pr/financeiro/stats");
      if (finRes.ok) setFinStats(await finRes.json());

      // Custo IA via stats admin
      const statsRes = await fetch("/pnl/admin/stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (statsRes.ok) {
        const d = await statsRes.json();
        setCustoIA({ custo_total_usd: d.custo_total_usd, rodadas: d.rodadas_ativas });
      }

      setLoading(false);
    }
    load();
  }, []);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtN = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1" style={SYNE}>
          Dados financeiros
        </p>
        <h1 className="text-white text-[1.6rem] uppercase tracking-tight" style={SYNE}>
          Financeiro
        </h1>
      </div>

      {loading ? (
        <p className="text-white/30 text-[12px] uppercase tracking-[0.16em]">Carregando…</p>
      ) : (
        <div className="space-y-8">
          {/* Custo IA */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Custo da plataforma (IA)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-2" style={SYNE}>
                  Custo acumulado (API)
                </p>
                <p className="text-[2rem] text-white font-bold leading-none" style={SYNE}>
                  ${custoIA?.custo_total_usd.toFixed(2) ?? "—"}
                </p>
                <p className="text-white/30 text-[11px] mt-1.5">Haiku + Sonnet · todas as rodadas</p>
              </div>
              <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-2" style={SYNE}>
                  Custo médio por ato
                </p>
                <p className="text-[2rem] text-white font-bold leading-none" style={SYNE}>
                  ~$0.012
                </p>
                <p className="text-white/30 text-[11px] mt-1.5">Referência Haiku 4.5</p>
              </div>
            </div>
          </section>

          {/* Dados CAU/PR extraídos */}
          {finStats && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                CAU/PR — Dados extraídos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-2" style={SYNE}>
                    Diárias & Deslocamentos
                  </p>
                  <p className="text-[1.8rem] text-white font-bold leading-none" style={SYNE}>
                    {fmtN(finStats.diarias.total)}
                  </p>
                  <p className="text-white/50 text-[12px] mt-1.5">
                    {fmtBRL(finStats.diarias.valor_total)} extraídos
                  </p>
                </div>
                <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-2" style={SYNE}>
                    Passagens Aéreas
                  </p>
                  <p className="text-[1.8rem] text-white font-bold leading-none" style={SYNE}>
                    {fmtN(finStats.passagens.total)}
                  </p>
                  <p className="text-white/50 text-[12px] mt-1.5">
                    {fmtBRL(finStats.passagens.valor_total)} extraídos
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Billing — placeholder */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Billing (Mercado Pago)
            </p>
            <div className="border border-white/[0.07] p-5" style={{ background: "#0d0f1a" }}>
              <p className="text-white/30 text-[12px]">
                Integração de assinaturas pendente — Mercado Pago webhook configurado e validado.
                Ativação de plano no banco ainda não implementada.
              </p>
              <div className="mt-4 flex gap-4 text-[11px] text-white/40">
                <span>Plano Investigador: R$179/mês</span>
                <span>Plano Profissional: R$679/mês</span>
                <span>Patrocinador: R$990/ano</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
