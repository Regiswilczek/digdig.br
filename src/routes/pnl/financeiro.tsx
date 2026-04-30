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

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

interface FinStats {
  diarias: { total: number; valor_total: number; analisados: number };
  passagens: { total: number; valor_total: number; analisados: number };
}

interface AgenteInfo {
  custo_usd: number;
  documentos: number;
  custo_medio_usd: number;
  modelo: string;
  papel: string;
}

interface PorTipo {
  tipo: string;
  documentos: number;
  custo_total_usd: number;
  custo_medio_usd: number;
  custo_piper_usd: number;
  custo_bud_usd: number;
  custo_new_usd: number;
}

interface SerieDia {
  dia: string;
  analises: number;
  custo_total_usd: number;
  custo_piper_usd: number;
  custo_bud_usd: number;
  custo_new_usd: number;
}

interface UltimaRodada {
  id: string;
  criado_em: string | null;
  status: string;
  custo_total_usd: number;
  documentos: number;
  custo_piper_usd: number;
  custo_bud_usd: number;
  custo_new_usd: number;
}

interface Breakdown {
  total: { custo_usd: number; custo_por_agente_usd: number };
  por_agente: { piper: AgenteInfo; bud: AgenteInfo; new: AgenteInfo };
  distribuicao: { piper_pct: number; bud_pct: number; new_pct: number };
  por_tipo_documento: PorTipo[];
  serie_diaria: SerieDia[];
  ultima_rodada: UltimaRodada | null;
}

const TIPO_LABEL: Record<string, string> = {
  portaria: "Portaria",
  portaria_normativa: "Portaria Normativa",
  deliberacao: "Deliberação",
  ata_plenaria: "Ata Plenária",
};

const PIPER_COLOR = "#3b82f6";
const BUD_COLOR = "#a855f7";
const NEW_COLOR = "#ec4899";

const fmtUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
const fmtUSDshort = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function FinanceiroPage() {
  const [finStats, setFinStats] = useState<FinStats | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { Authorization: `Bearer ${session?.access_token}` };

        const [finRes, brkRes] = await Promise.all([
          fetch("/public/orgaos/cau-pr/financeiro/stats"),
          fetch("/pnl/admin/financeiro/breakdown", { headers }),
        ]);

        if (finRes.ok) setFinStats(await finRes.json());
        if (brkRes.ok) {
          setBreakdown(await brkRes.json());
        } else {
          setErro(`breakdown HTTP ${brkRes.status}`);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "erro ao carregar");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <div className="space-y-10">
          {erro && (
            <div className="border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-red-300 text-[12px]">Falha parcial: {erro}</p>
            </div>
          )}

          {/* ── 1. Total acumulado ────────────────────────────────────── */}
          {breakdown && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                Custo da plataforma (IA · todas as rodadas)
              </p>
              <div className="border border-white/[0.08] p-6" style={{ background: "#0d0f1a" }}>
                <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] mb-2" style={SYNE}>
                  Acumulado
                </p>
                <p className="text-[3.2rem] text-white font-bold leading-none" style={SYNE}>
                  {fmtUSDshort(breakdown.total.custo_usd)}
                </p>
                <p className="text-white/40 text-[12px] mt-3" style={MONO}>
                  Soma por agente: {fmtUSDshort(breakdown.total.custo_por_agente_usd)}
                  {Math.abs(breakdown.total.custo_usd - breakdown.total.custo_por_agente_usd) > 0.01 && (
                    <span className="ml-2 text-amber-400/70">
                      · diferença esperada (registros antigos sem breakdown completo)
                    </span>
                  )}
                </p>
              </div>
            </section>
          )}

          {/* ── 2. Distribuição por agente ───────────────────────────── */}
          {breakdown && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                Custo por agente
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AgenteCard
                  nome="Piper"
                  cor={PIPER_COLOR}
                  pct={breakdown.distribuicao.piper_pct}
                  data={breakdown.por_agente.piper}
                />
                <AgenteCard
                  nome="Bud"
                  cor={BUD_COLOR}
                  pct={breakdown.distribuicao.bud_pct}
                  data={breakdown.por_agente.bud}
                />
                <AgenteCard
                  nome="New"
                  cor={NEW_COLOR}
                  pct={breakdown.distribuicao.new_pct}
                  data={breakdown.por_agente.new}
                />
              </div>
              <div className="mt-3 flex h-2 w-full overflow-hidden">
                <div style={{ width: `${breakdown.distribuicao.piper_pct}%`, background: PIPER_COLOR }} />
                <div style={{ width: `${breakdown.distribuicao.bud_pct}%`, background: BUD_COLOR }} />
                <div style={{ width: `${breakdown.distribuicao.new_pct}%`, background: NEW_COLOR }} />
              </div>
              <p className="text-white/30 text-[10px] mt-2" style={MONO}>
                Custo por documento varia conforme tamanho do PDF e cache hit;
                média acima é simples (custo / docs do agente).
              </p>
            </section>
          )}

          {/* ── 3. Por tipo de documento ─────────────────────────────── */}
          {breakdown && breakdown.por_tipo_documento.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                Custo por tipo de documento
              </p>
              <div className="border border-white/[0.08] overflow-x-auto" style={{ background: "#0d0f1a" }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <Th>Tipo</Th>
                      <Th align="right">Docs</Th>
                      <Th align="right">Custo total</Th>
                      <Th align="right">Custo médio</Th>
                      <Th align="right" color={PIPER_COLOR}>Piper</Th>
                      <Th align="right" color={BUD_COLOR}>Bud</Th>
                      <Th align="right" color={NEW_COLOR}>New</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.por_tipo_documento.map((t) => (
                      <tr key={t.tipo} className="border-b border-white/[0.04]">
                        <Td>{TIPO_LABEL[t.tipo] ?? t.tipo}</Td>
                        <Td align="right">{fmtN(t.documentos)}</Td>
                        <Td align="right">{fmtUSDshort(t.custo_total_usd)}</Td>
                        <Td align="right">{fmtUSD(t.custo_medio_usd)}</Td>
                        <Td align="right" color={PIPER_COLOR}>{fmtUSDshort(t.custo_piper_usd)}</Td>
                        <Td align="right" color={BUD_COLOR}>{fmtUSDshort(t.custo_bud_usd)}</Td>
                        <Td align="right" color={NEW_COLOR}>{fmtUSDshort(t.custo_new_usd)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── 4. Última rodada ─────────────────────────────────────── */}
          {breakdown?.ultima_rodada && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                Última rodada
              </p>
              <div className="border border-white/[0.08] p-5 grid grid-cols-2 md:grid-cols-5 gap-4" style={{ background: "#0d0f1a" }}>
                <KPI
                  label="Status"
                  value={breakdown.ultima_rodada.status}
                  hint={breakdown.ultima_rodada.criado_em
                    ? new Date(breakdown.ultima_rodada.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                />
                <KPI label="Documentos" value={fmtN(breakdown.ultima_rodada.documentos)} />
                <KPI label="Piper" value={fmtUSDshort(breakdown.ultima_rodada.custo_piper_usd)} color={PIPER_COLOR} />
                <KPI label="Bud" value={fmtUSDshort(breakdown.ultima_rodada.custo_bud_usd)} color={BUD_COLOR} />
                <KPI label="New" value={fmtUSDshort(breakdown.ultima_rodada.custo_new_usd)} color={NEW_COLOR} />
              </div>
            </section>
          )}

          {/* ── 5. Série diária — últimos 30 dias ────────────────────── */}
          {breakdown && breakdown.serie_diaria.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
                Custo por dia · últimos 30 dias
              </p>
              <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
                <SerieDiaria pontos={breakdown.serie_diaria} />
              </div>
            </section>
          )}

          {/* ── 6. Dados extraídos do CAU/PR ─────────────────────────── */}
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

          {/* ── 7. Billing placeholder ───────────────────────────────── */}
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

function AgenteCard({ nome, cor, pct, data }: { nome: string; cor: string; pct: number; data: AgenteInfo }) {
  return (
    <div className="border border-white/[0.08] p-5" style={{ background: "#0d0f1a" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2" style={{ background: cor }} />
        <p className="text-[12px] uppercase tracking-[0.18em] text-white" style={SYNE}>{nome}</p>
        <span className="text-[10px] text-white/40 ml-auto" style={MONO}>{fmtPct(pct)}</span>
      </div>
      <p className="text-[1.6rem] text-white font-bold leading-none" style={SYNE}>
        {fmtUSDshort(data.custo_usd)}
      </p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-2" style={MONO}>
        {data.modelo}
      </p>
      <p className="text-[11px] text-white/60 mt-1">{data.papel}</p>
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between text-[11px]">
        <span className="text-white/50">{fmtN(data.documentos)} docs</span>
        <span className="text-white/70" style={MONO}>~{fmtUSD(data.custo_medio_usd)}/doc</span>
      </div>
    </div>
  );
}

function KPI({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-1" style={SYNE}>{label}</p>
      <p className="text-[1.1rem] font-bold leading-none capitalize" style={{ ...SYNE, color: color ?? "#fff" }}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-white/40 mt-1" style={MONO}>{hint}</p>}
    </div>
  );
}

function SerieDiaria({ pontos }: { pontos: SerieDia[] }) {
  const max = Math.max(...pontos.map((p) => p.custo_total_usd), 0.0001);

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {pontos.map((p) => {
          const totalH = (p.custo_total_usd / max) * 100;
          const piperH = p.custo_total_usd ? (p.custo_piper_usd / p.custo_total_usd) * totalH : 0;
          const budH = p.custo_total_usd ? (p.custo_bud_usd / p.custo_total_usd) * totalH : 0;
          const newH = p.custo_total_usd ? (p.custo_new_usd / p.custo_total_usd) * totalH : 0;
          return (
            <div
              key={p.dia}
              className="flex-1 flex flex-col justify-end relative group"
              title={`${p.dia} · ${fmtUSDshort(p.custo_total_usd)} (${p.analises} análises)`}
            >
              <div style={{ height: `${newH}%`, background: NEW_COLOR }} />
              <div style={{ height: `${budH}%`, background: BUD_COLOR }} />
              <div style={{ height: `${piperH}%`, background: PIPER_COLOR }} />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-white/0 group-hover:text-white/80 whitespace-nowrap pointer-events-none" style={MONO}>
                {fmtUSDshort(p.custo_total_usd)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-white/30" style={MONO}>
        <span>{pontos[0]?.dia ?? ""}</span>
        <span>{pontos[pontos.length - 1]?.dia ?? ""}</span>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-white/50" style={MONO}>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: PIPER_COLOR }} />Piper</span>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: BUD_COLOR }} />Bud</span>
        <span><span className="inline-block w-2 h-2 mr-1" style={{ background: NEW_COLOR }} />New</span>
      </div>
    </div>
  );
}

function Th({ children, align, color }: { children: React.ReactNode; align?: "right"; color?: string }) {
  return (
    <th
      className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-medium"
      style={{
        textAlign: align ?? "left",
        color: color ?? "#ffffff60",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align, color }: { children: React.ReactNode; align?: "right"; color?: string }) {
  return (
    <td
      className="px-3 py-2.5"
      style={{
        textAlign: align ?? "left",
        color: color ?? "#ffffff",
        fontFamily: align === "right" ? "'JetBrains Mono', monospace" : undefined,
      }}
    >
      {children}
    </td>
  );
}
