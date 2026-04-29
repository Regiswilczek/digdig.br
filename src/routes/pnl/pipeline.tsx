import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import type { PipelineStatus, FilaInfo, FilaItem } from "../../lib/api-auth";

export const Route = createFileRoute("/pnl/pipeline")({
  component: PipelinePage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "#ef4444",
  laranja: "#f97316",
  amarelo: "#eab308",
  verde: "#22c55e",
};

interface Rodada {
  rodada_id: string;
  slug: string;
  orgao: string;
  status: "pendente" | "em_progresso" | "concluida" | "cancelada";
  total_atos: number | null;
  atos_scrapeados: number | null;
  atos_analisados_piper: number | null;
  atos_analisados_bud: number | null;
  custo_total_usd: number;
  criado_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  erro_mensagem: string | null;
}

const PIPELINE_SLUG = "cau-pr"; // primeiro tenant em produção

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  em_progresso: { label: "Em progresso", color: "#3b82f6" },
  pendente: { label: "Pendente", color: "#f59e0b" },
  concluida: { label: "Concluída", color: "#22c55e" },
  cancelada: { label: "Cancelada", color: "#6b7280" },
};

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-white/40 w-8 text-right">{pct}%</span>
    </div>
  );
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function PipelinePage() {
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false); // pisca quando realtime dispara
  const debounceRef = useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    const [resR, resP] = await Promise.all([
      authedFetch("/pnl/admin/rodadas"),
      authedFetch(`/pnl/admin/pipeline-status/${PIPELINE_SLUG}`),
    ]);
    if (resR.ok) setRodadas(await resR.json());
    if (resP.ok) setPipeline(await resP.json());
    setLoading(false);
  }, []);

  // Debounced refetch para os eventos do realtime (várias inserts em rajada)
  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      load();
      setPulse(true);
      window.setTimeout(() => setPulse(false), 800);
    }, 500);
  }, [load]);

  useEffect(() => {
    load();
    // Polling de fallback (caso realtime caia)
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Subscrição realtime — refetch quando uma analise é criada ou atualizada
  useEffect(() => {
    const ch = supabase
      .channel("pipeline-status")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        () => scheduleRefetch(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "analises" },
        () => scheduleRefetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rodadas_analise" },
        () => scheduleRefetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [scheduleRefetch]);

  async function cancelar(rodada_id: string) {
    setCanceling(rodada_id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/pnl/rodadas/${rodada_id}/cancelar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    setCanceling(null);
    if (res.ok) { showToast("Rodada cancelada"); load(); }
    else showToast("Erro ao cancelar");
  }

  const ativas = rodadas.filter((r) => r.status === "em_progresso" || r.status === "pendente");

  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 border border-white/10 px-4 py-3 text-[12px] text-white" style={{ background: "#0d0f1a" }}>
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1" style={SYNE}>
            Análise IA
          </p>
          <h1 className="text-white text-[1.6rem] uppercase tracking-tight" style={SYNE}>
            Pipeline
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full transition-colors"
            style={{ background: pulse ? "#22c55e" : "#3b82f680" }}
          />
          <span>{pulse ? "atualizando" : "realtime · supabase"}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-white/30 text-[12px] uppercase tracking-[0.16em]">Carregando…</p>
      ) : (
        <>
          {/* Filas — documentos esperando cada agente */}
          {pipeline && (
            <section className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3" style={SYNE}>
                Filas de análise
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <FilaCard fila={pipeline.filas.aguarda_piper} accent="#3b82f6" />
                <FilaCard fila={pipeline.filas.aguarda_bud} accent="#8b5cf6" />
                <FilaCard fila={pipeline.filas.aguarda_new} accent="#ec4899" />
                <FilaCard fila={pipeline.filas.sem_texto} accent="#6b7280" />
              </div>
            </section>
          )}

          {/* Rodadas ativas destacadas */}
          {ativas.length > 0 && (
            <section className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/60 mb-3" style={SYNE}>
                ● Ativas agora
              </p>
              <div className="space-y-3">
                {ativas.map((r) => (
                  <RodadaCard key={r.rodada_id} r={r} onCancel={cancelar} canceling={canceling} />
                ))}
              </div>
            </section>
          )}

          {/* Histórico */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 mb-3" style={SYNE}>
              Histórico (últimas 50)
            </p>
            <div className="space-y-2">
              {rodadas.filter((r) => r.status !== "em_progresso" && r.status !== "pendente").map((r) => (
                <RodadaCard key={r.rodada_id} r={r} onCancel={cancelar} canceling={canceling} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RodadaCard({
  r, onCancel, canceling,
}: {
  r: Rodada;
  onCancel: (id: string) => void;
  canceling: string | null;
}) {
  const badge = STATUS_BADGE[r.status] ?? { label: r.status, color: "#6b7280" };
  const total = r.total_atos ?? 0;
  const haiku = r.atos_analisados_piper ?? 0;
  const sonnet = r.atos_analisados_bud ?? 0;
  const isActive = r.status === "em_progresso" || r.status === "pendente";

  return (
    <div className="border border-white/[0.07] p-5" style={{ background: "#0d0f1a" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white text-[13px] font-semibold">{r.orgao}</p>
          <p className="text-white/30 text-[10px] mt-0.5">{r.rodada_id.slice(0, 8)}…</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[9px] uppercase tracking-[0.14em] px-2 py-0.5"
            style={{
              color: badge.color,
              border: `1px solid ${badge.color}40`,
              background: `${badge.color}12`,
            }}
          >
            {isActive && "● "}{badge.label}
          </span>
          {isActive && (
            <button
              onClick={() => onCancel(r.rodada_id)}
              disabled={canceling === r.rodada_id}
              className="text-[9px] uppercase tracking-[0.12em] text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="space-y-2 mb-4">
          <div>
            <div className="flex justify-between text-[10px] text-white/30 mb-1">
              <span>Haiku</span>
              <span>{haiku.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")}</span>
            </div>
            <ProgressBar value={haiku} total={total} color="#3b82f6" />
          </div>
          {sonnet > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-white/30 mb-1">
                <span>Sonnet</span>
                <span>{sonnet.toLocaleString("pt-BR")}</span>
              </div>
              <ProgressBar value={sonnet} total={total} color="#8b5cf6" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-6 text-[10px] text-white/30">
        <span>Custo: <span className="text-white/60">${r.custo_total_usd.toFixed(3)}</span></span>
        <span>Iniciado: <span className="text-white/60">{fmtDate(r.iniciado_em ?? r.criado_em)}</span></span>
        {r.concluido_em && <span>Concluído: <span className="text-white/60">{fmtDate(r.concluido_em)}</span></span>}
      </div>

      {r.erro_mensagem && (
        <p className="mt-3 text-[11px] text-red-400/70 border-l-2 border-red-400/30 pl-3">
          {r.erro_mensagem}
        </p>
      )}
    </div>
  );
}

// ── Componente: card de fila por agente ─────────────────────────────────
function FilaCard({ fila, accent }: { fila: FilaInfo; accent: string }) {
  const isEmpty = fila.total === 0;

  return (
    <div
      className="border p-4 transition-colors"
      style={{
        background: "#0d0f1a",
        borderColor: isEmpty ? "rgba(255,255,255,0.07)" : `${accent}40`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.14em]"
            style={{ color: isEmpty ? "rgba(255,255,255,0.30)" : accent, ...SYNE }}
          >
            {fila.agente}
          </p>
          <p className="text-white/40 text-[10px] mt-0.5">{fila.descricao}</p>
        </div>
        <div className="text-right">
          <p className="text-white text-[1.6rem] font-semibold leading-none" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {fila.total.toLocaleString("pt-BR")}
          </p>
          <p className="text-white/30 text-[9px] uppercase tracking-[0.12em] mt-1">
            aguardando
          </p>
        </div>
      </div>

      {fila.amostra.length > 0 ? (
        <ul className="space-y-1">
          {fila.amostra.map((item) => (
            <FilaRow key={item.ato_id} item={item} accent={accent} />
          ))}
        </ul>
      ) : (
        <p className="text-white/30 text-[11px] py-2">Nenhum documento na fila.</p>
      )}

      {fila.total > fila.amostra.length && (
        <p className="text-white/30 text-[10px] mt-3">
          + {(fila.total - fila.amostra.length).toLocaleString("pt-BR")} adicional(is)
        </p>
      )}
    </div>
  );
}

const MOTIVO_LABEL: Record<string, string> = {
  sem_url: "sem PDF",
  erro_download: "erro no download",
  pendente: "PDF pendente",
};
const MOTIVO_COLOR: Record<string, string> = {
  sem_url: "#9ca3af",
  erro_download: "#ef4444",
  pendente: "#eab308",
};

function FilaRow({ item, accent }: { item: FilaItem; accent: string }) {
  const niv = item.nivel_alerta;
  const motivo = item.motivo ?? null;
  const tipoLabel = item.tipo.replace(/_/g, " ");
  const bulletColor = niv
    ? (NIVEL_COLOR[niv] ?? accent)
    : motivo
      ? (MOTIVO_COLOR[motivo] ?? accent)
      : `${accent}60`;
  return (
    <li className="flex items-center gap-2 text-[11px] text-white/70 py-0.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: bulletColor }}
        title={niv ?? motivo ?? undefined}
      />
      <span className="text-white/40 w-20 shrink-0 truncate" title={tipoLabel}>{tipoLabel}</span>
      <span className="text-white/80 flex-1 truncate" title={item.numero}>{item.numero}</span>
      {motivo && (
        <span
          className="text-[9px] uppercase tracking-[0.1em] shrink-0"
          style={{ color: MOTIVO_COLOR[motivo] ?? "#9ca3af" }}
        >
          {MOTIVO_LABEL[motivo] ?? motivo}
        </span>
      )}
      {item.data_publicacao && (
        <span className="text-white/30 text-[10px] shrink-0">
          {new Date(item.data_publicacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </span>
      )}
    </li>
  );
}
