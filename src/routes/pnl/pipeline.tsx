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
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro" | "info" } | null>(null);
  const [pulse, setPulse] = useState(false); // pisca quando realtime dispara
  const debounceRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(msg: string, tipo: "ok" | "erro" | "info" = "info") {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, tipo });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 6000);
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
    if (res.ok) { showToast("Rodada cancelada", "ok"); load(); }
    else showToast("Erro ao cancelar", "erro");
  }

  const ativas = rodadas.filter((r) => r.status === "em_progresso" || r.status === "pendente");

  return (
    <div className="p-8">
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-5 py-4 text-[13px] font-medium shadow-2xl flex items-start gap-3 max-w-md animate-in slide-in-from-top-4"
          style={{
            background: toast.tipo === "ok" ? "#052e16" : toast.tipo === "erro" ? "#450a0a" : "#0d0f1a",
            border: `1px solid ${toast.tipo === "ok" ? "#16a34a" : toast.tipo === "erro" ? "#dc2626" : "rgba(255,255,255,0.15)"}`,
            color: toast.tipo === "ok" ? "#86efac" : toast.tipo === "erro" ? "#fca5a5" : "#ffffff",
            borderRadius: 4,
          }}
        >
          <span className="text-[18px] leading-none mt-0.5">
            {toast.tipo === "ok" ? "✓" : toast.tipo === "erro" ? "✗" : "ℹ"}
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] opacity-70 mb-1" style={SYNE}>
              {toast.tipo === "ok" ? "Sucesso" : toast.tipo === "erro" ? "Erro" : "Aviso"}
            </p>
            <p>{toast.msg}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-[16px] leading-none opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Fechar"
          >
            ×
          </button>
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
          {/* Em processamento agora — agentes trabalhando ao vivo */}
          {pipeline && pipeline.em_processamento.length > 0 && (
            <section className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-400 mb-3 flex items-center gap-2" style={SYNE}>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Em processamento agora ({pipeline.em_processamento.length})
              </p>
              <div className="border border-emerald-400/30 p-4" style={{ background: "#0a1410" }}>
                <ul className="space-y-2">
                  {pipeline.em_processamento.map((item) => {
                    const accent = item.agente === "bud" ? "#8b5cf6" : item.agente === "new" ? "#ec4899" : "#3b82f6";
                    return (
                      <li key={item.ato_id} className="flex items-center gap-3 text-[12px]">
                        <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
                        <span className="text-[10px] uppercase tracking-wider w-12 shrink-0" style={{ color: accent, fontFamily: "JetBrains Mono, monospace" }}>
                          {item.agente}
                        </span>
                        <span className="text-white/40 w-24 shrink-0 truncate">{item.tipo.replace(/_/g, " ")}</span>
                        <span className="text-white flex-1 truncate">{item.numero}</span>
                        {item.nivel_alerta && (
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: NIVEL_COLOR[item.nivel_alerta] ?? "#9ca3af" }}>
                            {item.nivel_alerta}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* Filas — documentos esperando cada agente */}
          {pipeline && (
            <section className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3" style={SYNE}>
                Filas de análise
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <FilaCard fila={pipeline.filas.aguarda_piper} accent="#3b82f6" agente="piper" onDisparado={showToast} />
                <FilaCard fila={pipeline.filas.aguarda_bud} accent="#8b5cf6" agente="bud" onDisparado={showToast} />
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
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const badge = STATUS_BADGE[r.status] ?? { label: r.status, color: "#6b7280" };
  const total = r.total_atos ?? 0;
  const piperCount = r.atos_analisados_piper ?? 0;
  const budCount = r.atos_analisados_bud ?? 0;
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
          <button
            onClick={() => setDetalhesOpen(true)}
            className="text-[9px] uppercase tracking-[0.12em] text-blue-400/60 hover:text-blue-400 transition-colors"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Ver detalhes
          </button>
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
              <span>Piper</span>
              <span>{piperCount.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")}</span>
            </div>
            <ProgressBar value={piperCount} total={total} color="#3b82f6" />
          </div>
          {budCount > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-white/30 mb-1">
                <span>Bud</span>
                <span>{budCount.toLocaleString("pt-BR")}</span>
              </div>
              <ProgressBar value={budCount} total={total} color="#8b5cf6" />
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

      {detalhesOpen && (
        <RodadaDetalhesModal
          rodadaId={r.rodada_id}
          orgao={r.orgao}
          onClose={() => setDetalhesOpen(false)}
        />
      )}
    </div>
  );
}

// ── Componente: card de fila por agente ─────────────────────────────────
const TIPOS_DISPARAVEIS = [
  "all",
  "ata_plenaria",
  "portaria",
  "portaria_normativa",
  "deliberacao",
  "dispensa_eletronica",
  "convenio",
  "media_library",
  "relatorio_parecer",
  "auditoria_independente",
];

function FilaCard({
  fila,
  accent,
  agente,
  onDisparado,
}: {
  fila: FilaInfo;
  accent: string;
  agente?: "piper" | "bud" | null;
  onDisparado?: (msg: string, tipo?: "ok" | "erro" | "info") => void;
}) {
  const isEmpty = fila.total === 0;
  const [tipoSel, setTipoSel] = useState("all");
  const [limiteSel, setLimiteSel] = useState(5);
  const [disparando, setDisparando] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);

  // Filtra a amostra do card pela tipo selecionado (visualmente)
  const amostraFiltrada = tipoSel === "all"
    ? fila.amostra
    : fila.amostra.filter((it) => it.tipo === tipoSel);

  async function disparar() {
    if (!agente) return;
    setDisparando(true);
    setUltimoResultado(null);
    onDisparado?.(`Disparando ${limiteSel} ato(s) ${tipoSel} para ${agente}...`, "info");
    try {
      const res = await authedFetch("/pnl/admin/disparar-lote", {
        method: "POST",
        body: JSON.stringify({ agente, tipo: tipoSel, limite: limiteSel, slug: PIPELINE_SLUG }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const n = data.atos ?? 0;
        if (n === 0) {
          const msg = `Fila vazia para ${tipoSel} — nenhum ato disparado.`;
          onDisparado?.(msg, "info");
          setUltimoResultado({ msg, tipo: "erro" });
        } else {
          const msg = `${n} ato(s) ${tipoSel === "all" ? "" : tipoSel + " "}disparado(s) para ${agente.toUpperCase()}. Rodada ${data.rodada_id?.slice(0, 8)}…`;
          onDisparado?.(msg, "ok");
          setUltimoResultado({ msg: `✓ ${n} disparados para ${agente}`, tipo: "ok" });
        }
      } else {
        const detail = typeof data.detail === "string" ? data.detail : data?.detail?.mensagem || `HTTP ${res.status}`;
        onDisparado?.(`Erro ao disparar: ${detail}`, "erro");
        setUltimoResultado({ msg: `Erro: ${detail}`.slice(0, 80), tipo: "erro" });
      }
    } catch (err) {
      const msg = `Erro de rede: ${(err as Error).message}`;
      onDisparado?.(msg, "erro");
      setUltimoResultado({ msg, tipo: "erro" });
    } finally {
      setDisparando(false);
      // mantém o resultado inline visível por 8s
      setTimeout(() => setUltimoResultado(null), 8000);
    }
  }

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

      {amostraFiltrada.length > 0 ? (
        <ul className="space-y-1">
          {amostraFiltrada.map((item) => (
            <FilaRow key={item.ato_id} item={item} accent={accent} />
          ))}
        </ul>
      ) : (
        <p className="text-white/30 text-[11px] py-2">
          {tipoSel === "all" ? "Nenhum documento na fila." : `Nenhum ${tipoSel} entre os 10 mostrados (mas pode haver na fila completa).`}
        </p>
      )}

      {fila.total > fila.amostra.length && (
        <p className="text-white/30 text-[10px] mt-3">
          + {(fila.total - fila.amostra.length).toLocaleString("pt-BR")} adicional(is)
        </p>
      )}

      {agente && fila.total > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={tipoSel}
              onChange={(e) => setTipoSel(e.target.value)}
              className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/80 px-2 py-1"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
              disabled={disparando}
            >
              {TIPOS_DISPARAVEIS.map((t) => (
                <option key={t} value={t} style={{ background: "#0d0f1a" }}>{t}</option>
              ))}
            </select>
            <select
              value={limiteSel}
              onChange={(e) => setLimiteSel(parseInt(e.target.value))}
              className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/80 px-2 py-1"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
              disabled={disparando}
            >
              {[5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n} style={{ background: "#0d0f1a" }}>{n}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={disparar}
              disabled={disparando}
              className="text-[10px] uppercase tracking-[0.14em] px-3 py-1 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
              style={{
                color: accent,
                border: `1px solid ${accent}60`,
                background: `${accent}15`,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {disparando ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                  Enviando...
                </>
              ) : (
                "Disparar"
              )}
            </button>
          </div>
          {ultimoResultado && (
            <p
              className="text-[10px] uppercase tracking-[0.12em]"
              style={{
                color: ultimoResultado.tipo === "ok" ? "#86efac" : "#fca5a5",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {ultimoResultado.msg}
            </p>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[10px] uppercase tracking-[0.14em] text-white/40 hover:text-white/80"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            ▸ ver fila completa e selecionar individualmente
          </button>
        </div>
      )}

      {modalOpen && agente && (
        <FilaModal
          agente={agente}
          accent={accent}
          tipoInicial={tipoSel}
          onClose={() => setModalOpen(false)}
          onDisparado={(msg) => {
            onDisparado?.(msg);
            setModalOpen(false);
          }}
        />
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

// ── Modal de fila completa com seleção individual ────────────────────────
interface FilaListResponse {
  total: number;
  limit: number;
  offset: number;
  items: FilaItem[];
}

function FilaModal({
  agente,
  accent,
  tipoInicial,
  onClose,
  onDisparado,
}: {
  agente: "piper" | "bud";
  accent: string;
  tipoInicial: string;
  onClose: () => void;
  onDisparado: (msg: string, tipo?: "ok" | "erro" | "info") => void;
}) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [data, setData] = useState<FilaListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [disparando, setDisparando] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({
      agente,
      tipo,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    const res = await authedFetch(`/pnl/admin/fila/${PIPELINE_SLUG}?${q}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [agente, tipo, page]);

  useEffect(() => { load(); }, [load]);

  function toggle(ato_id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(ato_id)) next.delete(ato_id); else next.add(ato_id);
      return next;
    });
  }
  function selecionarTodosNaPagina() {
    if (!data) return;
    setSelecionados((prev) => {
      const next = new Set(prev);
      for (const it of data.items) next.add(it.ato_id);
      return next;
    });
  }
  function limparSelecao() { setSelecionados(new Set()); }

  async function disparar() {
    if (selecionados.size === 0) return;
    setDisparando(true);
    onDisparado(`Disparando ${selecionados.size} ato(s) selecionado(s) para ${agente}...`, "info");
    try {
      const res = await authedFetch("/pnl/admin/disparar-lote", {
        method: "POST",
        body: JSON.stringify({
          agente,
          ato_ids: Array.from(selecionados),
          slug: PIPELINE_SLUG,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const n = d.atos ?? selecionados.size;
        onDisparado(`${n} ato(s) disparado(s) para ${agente.toUpperCase()}. Rodada ${d.rodada_id?.slice(0, 8)}…`, "ok");
      } else {
        const detail = typeof d.detail === "string" ? d.detail : d?.detail?.mensagem || `HTTP ${res.status}`;
        onDisparado(`Erro ao disparar: ${detail}`, "erro");
      }
    } catch (err) {
      onDisparado(`Erro de rede: ${(err as Error).message}`, "erro");
    } finally {
      setDisparando(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col border" style={{ background: "#0d0f1a", borderColor: `${accent}60` }}>
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: accent, fontFamily: "JetBrains Mono, monospace" }}>
              Fila {agente.toUpperCase()}
            </p>
            <p className="text-white text-[14px] mt-0.5">
              {data ? `${data.total.toLocaleString("pt-BR")} ato(s)` : "Carregando..."} · {selecionados.size} selecionado(s)
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-[18px]">×</button>
        </div>

        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2 flex-wrap">
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setPage(0); setSelecionados(new Set()); }}
            className="text-[11px] bg-white/[0.04] border border-white/[0.08] text-white/80 px-2 py-1"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {TIPOS_DISPARAVEIS.map((t) => (
              <option key={t} value={t} style={{ background: "#0d0f1a" }}>{t}</option>
            ))}
          </select>
          <button
            onClick={selecionarTodosNaPagina}
            className="text-[10px] uppercase tracking-[0.12em] px-3 py-1 text-white/60 hover:text-white border border-white/[0.08]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Selecionar página
          </button>
          {selecionados.size > 0 && (
            <button
              onClick={limparSelecao}
              className="text-[10px] uppercase tracking-[0.12em] px-3 py-1 text-white/60 hover:text-white border border-white/[0.08]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Limpar ({selecionados.size})
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-white/40 text-[12px] p-5 text-center">Carregando...</p>
          )}
          {!loading && data && data.items.length === 0 && (
            <p className="text-white/40 text-[12px] p-5 text-center">Nenhum ato na fila com esse tipo.</p>
          )}
          {!loading && data && data.items.length > 0 && (
            <ul>
              {data.items.map((it) => {
                const sel = selecionados.has(it.ato_id);
                return (
                  <li
                    key={it.ato_id}
                    onClick={() => toggle(it.ato_id)}
                    className="flex items-center gap-3 px-5 py-2 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02]"
                  >
                    <input type="checkbox" checked={sel} readOnly className="cursor-pointer" />
                    <span className="text-white/40 text-[10px] uppercase w-32 shrink-0 truncate" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {it.tipo.replace(/_/g, " ")}
                    </span>
                    <span className="text-white text-[12px] flex-1 truncate" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {it.numero}
                    </span>
                    {it.nivel_alerta && (
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: NIVEL_COLOR[it.nivel_alerta] ?? "#9ca3af" }}>
                        {it.nivel_alerta}
                      </span>
                    )}
                    {it.data_publicacao && (
                      <span className="text-[10px] text-white/30 shrink-0" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {new Date(it.data_publicacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-[10px] text-white/50" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2 py-1 border border-white/[0.08] disabled:opacity-30"
              >
                ← anterior
              </button>
              <span>página {page + 1} de {totalPages}</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 border border-white/[0.08] disabled:opacity-30"
              >
                próxima →
              </button>
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={disparar}
            disabled={selecionados.size === 0 || disparando}
            className="text-[11px] uppercase tracking-[0.14em] px-4 py-2 transition-colors disabled:opacity-30"
            style={{
              color: accent,
              border: `1px solid ${accent}80`,
              background: `${accent}20`,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {disparando ? "disparando..." : `Disparar ${selecionados.size > 0 ? selecionados.size : ""} selecionado(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de detalhes de rodada (lista de atos + worker status) ───────────
interface AtoDaRodada {
  ato_id: string;
  analise_id: string | null;
  tipo: string;
  numero: string;
  data_publicacao: string | null;
  status: string | null;
  estado: "pendente" | "em_andamento" | "concluido_piper" | "concluido_bud";
  nivel_alerta: string | null;
  atualizado_em: string | null;
}

interface WorkerTask {
  id: string;
  name: string;
  args_preview: string;
  time_start: number | null;
  worker_pid: number;
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendente: { label: "pendente", color: "#9ca3af" },
  em_andamento: { label: "em andamento", color: "#16a34a" },
  concluido_piper: { label: "piper ok", color: "#3b82f6" },
  concluido_bud: { label: "bud ok", color: "#8b5cf6" },
};

function RodadaDetalhesModal({
  rodadaId,
  orgao,
  onClose,
}: {
  rodadaId: string;
  orgao: string;
  onClose: () => void;
}) {
  const [atos, setAtos] = useState<AtoDaRodada[]>([]);
  const [workers, setWorkers] = useState<{ worker: string; tasks_ativas: WorkerTask[] }[]>([]);
  const [resumo, setResumo] = useState<{ total: number; piper: number; bud: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [resA, resW] = await Promise.all([
        authedFetch(`/pnl/admin/rodadas/${rodadaId}/atos`),
        authedFetch(`/pnl/admin/worker-status`),
      ]);
      if (resA.ok) {
        const d = await resA.json();
        setAtos(d.atos || []);
        setResumo({
          total: d.total_atos || 0,
          piper: d.atos_analisados_piper || 0,
          bud: d.atos_analisados_bud || 0,
        });
      } else {
        setErro(`Atos: HTTP ${resA.status}`);
      }
      if (resW.ok) {
        const d = await resW.json();
        setWorkers(d.workers || []);
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rodadaId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // tail vivo: poll de 4s
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col border border-blue-400/30" style={{ background: "#0d0f1a" }}>
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Rodada · {orgao}
            </p>
            <p className="text-white text-[14px] mt-0.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {rodadaId.slice(0, 8)}…
              {resumo && ` — Piper ${resumo.piper}/${resumo.total} · Bud ${resumo.bud}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-[20px]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Worker status */}
          <div className="px-5 py-3 border-b border-white/[0.06]" style={{ background: "#0a1410" }}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-400 mb-2 flex items-center gap-2" style={SYNE}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Worker · tarefas ativas
            </p>
            {workers.length === 0 ? (
              <p className="text-white/40 text-[11px]">Nenhuma tarefa ativa nos workers.</p>
            ) : (
              workers.flatMap((w) =>
                w.tasks_ativas.length === 0 ? (
                  <p key={w.worker} className="text-white/40 text-[11px]">{w.worker}: ocioso</p>
                ) : (
                  w.tasks_ativas.map((t) => (
                    <div key={t.id} className="text-[11px] py-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      <span className="text-emerald-400">▸</span>{" "}
                      <span className="text-white">{t.name}</span>{" "}
                      <span className="text-white/40">{t.args_preview}</span>
                    </div>
                  ))
                )
              )
            )}
          </div>

          {/* Lista de atos */}
          <div className="px-5 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2" style={SYNE}>
              Atos da rodada ({atos.length})
            </p>
            {loading && atos.length === 0 && (
              <p className="text-white/40 text-[11px]">Carregando...</p>
            )}
            {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
            <ul className="divide-y divide-white/[0.04]">
              {atos.map((a) => {
                const est = ESTADO_LABEL[a.estado] ?? ESTADO_LABEL.pendente;
                return (
                  <li key={a.ato_id} className="flex items-center gap-3 py-2 text-[11px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: est.color,
                        boxShadow: a.estado === "em_andamento" ? `0 0 0 3px ${est.color}30` : "none",
                      }}
                    />
                    <span className="text-white/40 w-28 shrink-0 truncate">{a.tipo.replace(/_/g, " ")}</span>
                    <span className="text-white flex-1 truncate">{a.numero}</span>
                    {a.nivel_alerta && (
                      <span className="text-[10px] uppercase shrink-0" style={{ color: NIVEL_COLOR[a.nivel_alerta] ?? "#9ca3af" }}>
                        {a.nivel_alerta}
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-wider w-24 text-right shrink-0" style={{ color: est.color }}>
                      {est.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/30" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          <span>● atualiza a cada 4s</span>
          <span>{atos.length} atos · workers vivos: {workers.length}</span>
        </div>
      </div>
    </div>
  );
}
