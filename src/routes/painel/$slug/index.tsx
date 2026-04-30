import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  fetchPainelAtos,
  fetchPainelRodada,
  fetchPendentes,
  fetchPipelineStatus,
  type PainelAto,
  type PainelRodada,
  type PainelPendente,
  type PainelPendentesResponse,
  type PipelineStatus,
  type FilaInfo,
  type FilaItem,
} from "../../../lib/api-auth";
import { fetchAnalysesRecentes, fetchFinanceiroDiarias, fetchFinanceiroPassagens, type PublicStats, type AnaliseRecente, type AtividadeItem, type CrescimentoResponse, type CrescimentoPonto, type Marco, type FinanceiroStats, type FinanceiroResponse } from "../../../lib/api";
import { useOrgao } from "../../../lib/orgao-store";
import { supabase } from "../../../lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ExternalLink, FileText, Search, Activity, ArrowDownToLine } from "lucide-react";

export const Route = createFileRoute("/painel/$slug/")({
  component: SlugDashboard,
});

// ── Tokens ──────────────────────────────────────────────────────────────
const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";
const MONO = "'JetBrains Mono', monospace";
const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

// ── Helpers ─────────────────────────────────────────────────────────────
const NIVEL_BG: Record<string, { bg: string; fg: string; border: string }> = {
  vermelho: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  laranja: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
  amarelo: { bg: "#fefce8", fg: "#a16207", border: "#fde68a" },
  verde: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
};

const NIVEL_DOT: Record<string, string> = {
  vermelho: "#dc2626",
  laranja: "#ea580c",
  amarelo: "#ca8a04",
  verde: "#16a34a",
};

function fmt(n: number | undefined | null, fallback = "—"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel)
    return (
      <span className="text-[12px]" style={{ color: SUBTLE }}>
        —
      </span>
    );
  const c = NIVEL_BG[nivel] ?? {
    bg: PAPER,
    fg: MUTED,
    border: BORDER,
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider"
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        borderRadius: 2,
        fontFamily: MONO,
      }}
    >
      {nivel}
    </span>
  );
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  return `há ${Math.floor(diff / 3600)}h`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
      style={{ color: SUBTLE, fontFamily: MONO }}
    >
      {children}
    </p>
  );
}

// ── Realtime feed (right panel) ─────────────────────────────────────────
interface FeedItem {
  id: string;
  ato_id: string;
  nivel_alerta: string | null;
  score_risco: number | null;
  criado_em: string;
  /** event_time = analisado_em || criado_em — momento mais recente do item, usado pra "há Xmin". */
  event_time: string;
  numero?: string;
  tipo?: string;
  status?: "entrando" | "analisado";
  analisado_em?: string | null;
  modelo?: "piper" | "bud" | "new" | null;
  em_andamento?: boolean;
}

const MODELO_BADGE: Record<string, { bg: string; fg: string }> = {
  piper: { bg: "#dbeafe", fg: "#1e40af" },
  bud:   { bg: "#ede9fe", fg: "#6b21a8" },
  new:   { bg: "#fce7f3", fg: "#9f1239" },
};

const TIPO_ORDER = ["portaria", "ata_plenaria", "portaria_normativa", "deliberacao"];
const TIPO_LABEL: Record<string, string> = {
  portaria: "Portarias",
  ata_plenaria: "Atas Plenárias",
  portaria_normativa: "Port. Normativas",
  deliberacao: "Deliberações",
};
const TIPO_SHORT: Record<string, string> = {
  portaria: "PORT.",
  ata_plenaria: "ATA",
  portaria_normativa: "P.NORM.",
  deliberacao: "DELIB.",
  dispensa_eletronica: "DISP.",
  contratacao_direta: "CONT.DIR.",
  contrato: "CONTRATO",
  convenio: "CONVÊNIO",
  licitacao: "LICIT.",
  diaria: "DIÁRIA",
};

function FeedRow({ item, slug }: { item: FeedItem; slug: string }) {
  const isEntrando = item.status === "entrando";
  const nivel = item.nivel_alerta ?? "";
  const nivelColor = isEntrando ? "#6366f1" : (NIVEL_DOT[nivel] ?? "#d4d2cd");
  const nivelStyle = NIVEL_BG[nivel];
  const tipoShort =
    TIPO_SHORT[item.tipo ?? ""] ??
    (item.tipo ? item.tipo.slice(0, 6).toUpperCase() : "—");

  const inner = (
    <div
      className="group px-4 py-2.5 transition-colors hover:bg-[#faf8f3]"
      style={{ borderBottom: `1px solid #f1efe8`, opacity: isEntrando ? 0.85 : 1 }}
    >
      {/* Line 1: dot/icon + tipo · número · tempo */}
      <div className="flex items-center gap-2.5">
        {isEntrando ? (
          <ArrowDownToLine size={10} className="flex-shrink-0" style={{ color: "#6366f1" }} />
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: nivelColor, boxShadow: `0 0 0 3px ${nivelColor}1a` }}
          />
        )}
        <span
          style={{
            fontSize: 8.5,
            fontFamily: MONO,
            letterSpacing: "0.14em",
            color: isEntrando ? "#818cf8" : "#a8a59c",
            padding: "1px 0",
            flexShrink: 0,
            lineHeight: 1.6,
            textTransform: "uppercase",
          }}
        >
          {tipoShort}
        </span>
        <p
          className="flex-1 text-[12px] font-medium truncate"
          style={{ color: isEntrando ? "#4f46e5" : INK, fontFamily: MONO, letterSpacing: "-0.01em" }}
        >
          {item.numero ? `Nº ${item.numero}` : item.ato_id.slice(0, 8) + "…"}
        </p>
        <span
          className="text-[9.5px] whitespace-nowrap flex-shrink-0 tabular-nums"
          style={{ color: "#a8a59c", fontFamily: MONO }}
        >
          {timeAgo(item.event_time || item.criado_em)}
        </span>
      </div>

      {/* Line 2: status chip ou nível + score */}
      <div className="flex items-center gap-2 mt-1.5 pl-[18px]">
        {item.modelo && (
          <span
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 9,
              fontFamily: MONO,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: MODELO_BADGE[item.modelo]?.fg ?? "#666",
              background: MODELO_BADGE[item.modelo]?.bg ?? "#eee",
              padding: "1.5px 6px",
              borderRadius: 3,
              lineHeight: 1.4,
            }}
          >
            {item.em_andamento && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: MODELO_BADGE[item.modelo]?.fg ?? "#666" }}
              />
            )}
            {item.modelo}
            {item.em_andamento && " ·"}
          </span>
        )}
        {isEntrando ? (
          <span style={{ fontSize: 9, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", background: "#eef2ff", padding: "1.5px 6px", borderRadius: 3, lineHeight: 1.4 }}>
            entrando
          </span>
        ) : (
          <>
            {nivelStyle && (
              <span style={{ fontSize: 9, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.12em", color: nivelStyle.fg, background: nivelStyle.bg, padding: "1.5px 6px", borderRadius: 3, lineHeight: 1.4 }}>
                {nivel}
              </span>
            )}
            {item.score_risco != null && (
              <span style={{ fontSize: 9.5, color: "#a8a59c", fontFamily: MONO, letterSpacing: "0.04em" }}>
                score · {item.score_risco}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (isEntrando) return <div style={{ textDecoration: "none", display: "block" }}>{inner}</div>;

  return (
    <Link to="/painel/$slug/ato/$id" params={{ slug, id: item.ato_id }} style={{ textDecoration: "none", display: "block" }}>
      {inner}
    </Link>
  );
}

function RealtimeFeed({
  slug,
  initialItems,
  isLive,
  variant = "aside",
}: {
  slug: string;
  initialItems: AtividadeItem[] | null;
  isLive: boolean;
  variant?: "aside" | "inline";
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const loading = initialItems === null;
  const channelId = useRef(`feed-${slug}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (initialItems)
      setItems(
        initialItems.map((i) => ({
          id: i.ato_id,
          ato_id: i.ato_id,
          nivel_alerta: i.nivel_alerta,
          score_risco: null,
          criado_em: i.criado_em ?? new Date().toISOString(),
          event_time: i.event_time || i.analisado_em || i.criado_em || new Date().toISOString(),
          modelo: i.modelo ?? null,
          em_andamento: i.em_andamento ?? false,
          numero: i.numero ?? undefined,
          tipo: i.tipo ?? undefined,
          status: i.status,
          analisado_em: i.analisado_em,
        })),
      );
  }, [initialItems]);

  // Realtime events are handled centrally by orgao-store.
  // initialItems is already kept fresh by the store's 30s polling + Supabase channel.

  const filtered = items;

  // Group by tipo in defined order; unknown types go last
  const knownSet = new Set(TIPO_ORDER);
  const groups = [
    ...TIPO_ORDER.map((tipo) => ({
      tipo,
      label: TIPO_LABEL[tipo],
      items: filtered.filter((i) => i.tipo === tipo),
    })).filter((g) => g.items.length > 0),
    ...(filtered.some((i) => !i.tipo || !knownSet.has(i.tipo))
      ? [{ tipo: "outro", label: "Outros", items: filtered.filter((i) => !i.tipo || !knownSet.has(i.tipo)) }]
      : []),
  ];

  const total = filtered.length;

  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* ── IDE-style status bar ─────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-7 flex-shrink-0"
        style={{
          background: PAPER,
          borderBottom: `1px solid ${BORDER}`,
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.2em",
          color: SUBTLE,
          textTransform: "uppercase",
        }}
      >
        <span>stream · análises</span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1 w-1 rounded-full"
            style={{
              background: isLive ? "#16a34a" : "#d8d5cd",
              boxShadow: isLive ? "0 0 6px #16a34a" : undefined,
            }}
          />
          {isLive ? "live" : "idle"}
        </span>
      </div>

      {/* ── Brand header ─────────────────────────────────── */}
      <div
        className="px-5 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold leading-none"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              ▮ Atividade
            </p>
            <h2
              className="text-[22px] mt-2 leading-none"
              style={{
                color: INK,
                fontFamily: TIGHT,
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              Feed em tempo real
            </h2>
          </div>
          <span
            className="text-[26px] tabular-nums leading-none"
            style={{
              color: INK,
              fontFamily: TIGHT,
              fontWeight: 500,
              letterSpacing: "-0.04em",
            }}
          >
            {total}
          </span>
        </div>
        <p
          className="text-[9.5px] uppercase tracking-[0.18em]"
          style={{ color: "#a8a59c", fontFamily: MONO }}
        >
          últimas análises · ws conectado
        </p>
      </div>

      {/* ── Feed ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p
            className="text-[12px] px-4 py-10 text-center"
            style={{ color: "#a8a59c" }}
          >
            Carregando…
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <p
            className="text-[12px] px-4 py-10 text-center"
            style={{ color: "#a8a59c" }}
          >
            Nenhum registro ainda.
          </p>
        )}
        {!loading &&
          groups.map((group) => (
            <div key={group.tipo}>
              <div
                className="flex items-center gap-2 px-5 pt-5 pb-2 sticky top-0 z-10 bg-white"
              >
                <span
                  className="text-[9.5px] uppercase tracking-[0.22em] font-medium"
                  style={{ color: "#a8a59c", fontFamily: MONO }}
                >
                  {group.label}
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: "#f1efe8" }}
                />
                <span
                  className="text-[9.5px] tabular-nums"
                  style={{ color: "#a8a59c", fontFamily: MONO }}
                >
                  {group.items.length}
                </span>
              </div>
              {group.items.map((item) => (
                <FeedRow key={item.id} item={item} slug={slug} />
              ))}
            </div>
          ))}
      </div>

      {/* ── Bottom status ───────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-6 flex-shrink-0"
        style={{
          background: PAPER,
          borderTop: `1px solid ${BORDER}`,
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: "0.18em",
          color: "#a8a59c",
          textTransform: "uppercase",
        }}
      >
        <span>realtime · supabase</span>
        <span className="tabular-nums">{filtered.length} rows</span>
      </div>
    </div>
  );

  if (variant === "inline") return content;

  return (
    <aside
      className="hidden lg:flex w-[300px] flex-shrink-0 flex-col sticky top-0 h-screen overflow-hidden"
      style={{ borderLeft: `1px solid ${BORDER}` }}
    >
      {content}
    </aside>
  );
}

// ── Volume de análises por hora (últimas 24h) ───────────────────────────
const NIVEL_SEVERITY: Record<string, number> = { verde: 1, amarelo: 2, laranja: 3, vermelho: 4 };

function VolumeChart24h({
  items,
  isLive,
}: {
  items: AnaliseRecente[];
  isLive: boolean;
}) {
  const now = Date.now();

  // Bucket 0 = 24h atrás, bucket 23 = hora atual
  const buckets: Array<{ total: number; worst: string | null }> = Array.from({ length: 24 }, () => ({
    total: 0,
    worst: null,
  }));

  for (const item of items) {
    if (!item.criado_em) continue;
    const hoursAgo = Math.floor((now - new Date(item.criado_em).getTime()) / 3_600_000);
    if (hoursAgo < 0 || hoursAgo >= 24) continue;
    const idx = 23 - hoursAgo;
    buckets[idx].total++;
    if (item.nivel_alerta) {
      const sev = NIVEL_SEVERITY[item.nivel_alerta] ?? 0;
      if (sev > (NIVEL_SEVERITY[buckets[idx].worst ?? ""] ?? 0))
        buckets[idx].worst = item.nivel_alerta;
    }
  }

  const maxCount = Math.max(...buckets.map((b) => b.total), 1);
  const totalIn24h = buckets.reduce((s, b) => s + b.total, 0);
  const peakIdx = buckets.reduce((best, b, i) => (b.total > buckets[best].total ? i : best), 0);
  const peakCount = buckets[peakIdx].total;

  // Hora real de cada bucket para labels
  const labelIdxs = [0, 6, 12, 18, 23];
  const bucketHour = (idx: number) => {
    const hoursAgo = 23 - idx;
    return new Date(now - hoursAgo * 3_600_000).getHours();
  };

  const W = 560, H = 80;
  const PAD = { t: 4, r: 4, b: 20, l: 4 };
  const innerH = H - PAD.t - PAD.b;
  const barW = (W - PAD.l - PAD.r) / 24;
  const GAP = 2;

  return (
    <div className="p-5 space-y-3" style={{ border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
          )}
          <Eyebrow>Extração · Últimas 24h</Eyebrow>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="text-[22px] font-medium leading-none"
            style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.03em" }}
          >
            {totalIn24h}
          </p>
          <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: MUTED, fontFamily: MONO }}>
            análises
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {buckets.map((b, i) => {
          const barH = b.total > 0
            ? Math.max(3, (b.total / maxCount) * innerH)
            : 0;
          const x = PAD.l + i * barW + GAP / 2;
          const y = PAD.t + innerH - barH;
          const color = b.total === 0
            ? BORDER
            : (NIVEL_DOT[b.worst ?? ""] ?? INK);
          return (
            <g key={i}>
              {/* Empty track */}
              <rect
                x={x} y={PAD.t} width={barW - GAP} height={innerH}
                fill={PAPER} rx={1}
              />
              {/* Value bar */}
              {b.total > 0 && (
                <rect x={x} y={y} width={barW - GAP} height={barH} fill={color} rx={1} />
              )}
            </g>
          );
        })}
        {/* Hour labels */}
        {labelIdxs.map((idx) => (
          <text
            key={idx}
            x={PAD.l + idx * barW + barW / 2}
            y={H - 4}
            textAnchor="middle"
            fontSize={8}
            fill={MUTED}
            fontFamily="monospace"
          >
            {idx === 23 ? "agora" : `${bucketHour(idx)}h`}
          </text>
        ))}
      </svg>

      {/* Mini distribuição das recentes */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {(["verde", "amarelo", "laranja", "vermelho"] as const).map((n) => {
            const count = items.filter((a) => a.nivel_alerta === n).length;
            if (count === 0) return null;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: NIVEL_DOT[n] }} />
                <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO }}>
                  {count} {n}
                </span>
              </div>
            );
          })}
          {(() => {
            const scores = items.filter((a) => a.score_risco != null);
            if (scores.length === 0) return null;
            const avg = Math.round(scores.reduce((s, a) => s + (a.score_risco ?? 0), 0) / scores.length);
            return (
              <span style={{ fontSize: 10, color: SUBTLE, fontFamily: MONO }}>
                · score médio {avg} ({scores.length} amostras)
              </span>
            );
          })()}
        </div>
      )}

      {/* Sub-caption */}
      <p className="text-[10.5px]" style={{ color: SUBTLE, fontFamily: MONO }}>
        {totalIn24h === 0
          ? "Nenhuma análise nas últimas 24h · pipeline em pausa"
          : peakCount > 0
          ? `Pico ${peakCount}/h às ${bucketHour(peakIdx)}h · barras coloridas pelo nível mais crítico daquela hora`
          : `${totalIn24h} análises registradas`}
      </p>
    </div>
  );
}

// ── StackedRiskBar ───────────────────────────────────────────────────────────
const NIVEL_COLOR_FULL: Record<string, { fg: string; bg: string }> = {
  verde:    { fg: "#16a34a", bg: "#f0fdf4" },
  amarelo:  { fg: "#ca8a04", bg: "#fefce8" },
  laranja:  { fg: "#ea580c", bg: "#fff7ed" },
  vermelho: { fg: "#dc2626", bg: "#fef2f2" },
};

function StackedRiskBar({ dist, total }: { dist: PublicStats["distribuicao"]; total: number }) {
  const levels = [
    { key: "verde",    label: "Verde",    count: dist.verde    },
    { key: "amarelo",  label: "Amarelo",  count: dist.amarelo  },
    { key: "laranja",  label: "Laranja",  count: dist.laranja  },
    { key: "vermelho", label: "Vermelho", count: dist.vermelho },
  ] as const;

  const criticos = dist.laranja + dist.vermelho;
  const pctCritico = total > 0 ? ((criticos / total) * 100).toFixed(1) : "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 4 cartões grandes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: BORDER,
          border: `1px solid ${BORDER}`,
        }}
      >
        {levels.map((l) => {
          const pct = total > 0 ? (l.count / total) * 100 : 0;
          const { fg, bg } = NIVEL_COLOR_FULL[l.key];
          return (
            <div
              key={l.key}
              style={{
                background: "#fff",
                padding: "14px 12px 16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* barra colorida no topo */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: fg }} />
              {/* fill proporcional no fundo */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.max(pct * 0.7, 2)}%`,
                  background: bg,
                  transition: "height 0.8s ease",
                }}
              />
              {/* conteúdo */}
              <p
                style={{
                  fontSize: 8.5,
                  fontFamily: MONO,
                  textTransform: "uppercase",
                  letterSpacing: "0.20em",
                  color: fg,
                  fontWeight: 700,
                  marginBottom: 10,
                  position: "relative",
                }}
              >
                {l.label}
              </p>
              <p
                style={{
                  fontSize: 44,
                  fontWeight: 500,
                  color: INK,
                  fontFamily: TIGHT,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  position: "relative",
                }}
              >
                {l.count.toLocaleString("pt-BR")}
              </p>
              <p
                style={{
                  fontSize: 11,
                  fontFamily: MONO,
                  color: MUTED,
                  marginTop: 6,
                  letterSpacing: "0.02em",
                  position: "relative",
                }}
              >
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Barra proporcional full-width */}
      <div
        style={{
          display: "flex",
          height: 6,
          overflow: "hidden",
          background: PAPER,
          border: `1px solid ${BORDER}`,
          borderRadius: 1,
        }}
      >
        {levels.map((l) => (
          <div
            key={l.key}
            style={{
              width: `${total > 0 ? (l.count / total) * 100 : 0}%`,
              background: NIVEL_COLOR_FULL[l.key].fg,
              minWidth: l.count > 0 ? 3 : 0,
              transition: "width 0.8s ease",
            }}
          />
        ))}
      </div>

      {/* Rodapé — criticalidade */}
      {criticos > 0 && (
        <p style={{ fontSize: 10, fontFamily: MONO, color: MUTED, letterSpacing: "0.04em", lineHeight: 1.5 }}>
          <span style={{ color: "#dc2626", fontWeight: 700 }}>{pctCritico}%</span>
          {" "}dos documentos analisados têm indícios críticos
          {" "}
          <span style={{ color: NIVEL_COLOR_FULL.laranja.fg }}>({dist.laranja.toLocaleString("pt-BR")} laranja</span>
          {" + "}
          <span style={{ color: NIVEL_COLOR_FULL.vermelho.fg }}>{dist.vermelho.toLocaleString("pt-BR")} vermelho)</span>
        </p>
      )}
    </div>
  );
}

// ── CoverageByType ───────────────────────────────────────────────────────────
const TIPO_NOTES: Record<string, string> = {
  deliberacao: "HTML-only · aguardando scraper dedicado",
  ata_plenaria: "Análise via Bud",
};

const TIPO_DISPLAY: Record<string, string> = {
  portaria: "Portarias",
  deliberacao: "Deliberações",
  ata_plenaria: "Atas Plenárias",
  portaria_normativa: "Port. Normativas",
  dispensa_eletronica: "Disp. Eletrônica",
  contratacao_direta: "Cont. Diretas",
  contrato: "Contratos",
  convenio: "Convênios",
  relatorio_tcu: "Rel. TCU",
  relatorio_parecer: "Rel. e Pareceres",
  auditoria_independente: "Auditorias",
  licitacao: "Licitações",
  ata_registro_preco: "Ata Reg. Preço",
  // ── Categorias ATLAS (descobertas pela classificação automática) ──
  deliberacao_arquivo: "Deliberações (arquivo)",
  portaria_arquivo: "Portarias (arquivo)",
  ata_pauta_comissao: "Atas/Pautas Comissão",
  financeiro_balanco: "Balanços Financeiros",
  financeiro_orcamento: "Orçamentos",
  financeiro_demonstrativo: "Demonstrativos",
  auditoria_externa: "Auditorias Externas",
  relatorio_gestao: "Relatórios de Gestão",
  processo_etico: "Processos Éticos",
  recursos_humanos: "Recursos Humanos",
  juridico_parecer: "Pareceres Jurídicos",
  aditivo_contratual: "Aditivos Contratuais",
  comunicacao_institucional: "Comunicação Inst.",
  placa_certidao: "Placas/Certidões",
  outros: "Outros",
};

// Cor única e legível pra cada categoria ATLAS — pelo hash do nome.
const ATLAS_COLORS = [
  "#3366cc", "#c05000", "#6600cc", "#15803d", "#a16207",
  "#b91c1c", "#0e7490", "#9333ea", "#0891b2", "#65a30d",
  "#ea580c", "#9a3412", "#1d4ed8", "#7c3aed", "#0369a1",
];
function colorForCat(cat: string): string {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return ATLAS_COLORS[h % ATLAS_COLORS.length];
}

function CoverageByAtlas({ stats }: { stats: PublicStats }) {
  if (!stats.por_categoria_atlas) return null;
  const rows = Object.entries(stats.por_categoria_atlas)
    .map(([cat, { total, analisados }]) => ({
      cat,
      label: TIPO_DISPLAY[cat] ?? cat,
      total,
      analisados,
    }));
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => {
        const pct = r.total > 0 ? (r.analisados / r.total) * 100 : 0;
        const color = colorForCat(r.cat);
        return (
          <div key={r.cat}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, background: color, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: INK, fontFamily: MONO }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO }}>
                {fmt(r.analisados)} / {fmt(r.total)} · {pct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoverageByType({ stats }: { stats: PublicStats }) {
  const rows = Object.entries(stats.por_tipo).map(([tipo, { total, analisados }]) => ({
    tipo,
    label: TIPO_DISPLAY[tipo] ?? tipo,
    total,
    analisados,
    note: TIPO_NOTES[tipo],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => {
        const pct = r.total > 0 ? (r.analisados / r.total) * 100 : 0;
        const color = MARCO_COLORS[r.tipo] ?? INK;
        return (
          <div key={r.tipo}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, background: color, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: INK, fontFamily: MONO }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO }}>
                {fmt(r.analisados)} / {fmt(r.total)} · {pct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
            {r.note && (
              <p style={{ fontSize: 9.5, color: SUBTLE, fontFamily: MONO, marginTop: 3 }}>{r.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Visão Geral ────────────────────────────────────────────────────
function TabVisaoGeral({
  stats,
  rodada,
  recentCount24h,
  recentAnalyses: _recentAnalyses,
  crescimento,
  finStats,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
  recentCount24h: number;
  recentAnalyses: AnaliseRecente[] | null;
  crescimento: CrescimentoResponse | null;
  finStats: FinanceiroStats | null;
}) {
  const [modal, setModal] = useState<null | "cobertura" | "alertas" | "custo">(null);
  const [cardHover, setCardHover] = useState<string | null>(null);

  const dist = stats?.distribuicao;
  const totalComNivel = dist ? dist.verde + dist.amarelo + dist.laranja + dist.vermelho : 0;
  // Total de docs no corpus (todos os tipos)
  const totalDocs = (stats?.total_atos ?? 0)
    + (finStats?.diarias.total ?? 0)
    + (finStats?.passagens.total ?? 0);
  // Denominador da meta: desconta os atos sem texto extraído
  // (não podem entrar no pipeline IA — bloqueados por sem_url/erro_download/pendente)
  const totalSemTexto = stats?.total_sem_texto ?? 0;
  const totalAuditavel = Math.max(0, totalDocs - totalSemTexto);
  const pctAnalisados = totalAuditavel > 0
    ? Math.round(((stats?.total_analisados ?? 0) / totalAuditavel) * 100)
    : 0;
  const isSuccess = pctAnalisados >= 90;
  const isLive = recentCount24h > 0 || rodada?.status === "em_progresso";
  const totalVermelhos = dist?.vermelho ?? 0;
  const totalLaranja = dist?.laranja ?? 0;
  const totalCriticos = totalLaranja + totalVermelhos;
  const pctCriticosNum = totalComNivel > 0 ? (totalCriticos / totalComNivel) * 100 : 0;
  const pctCriticos = pctCriticosNum.toFixed(1);
  const custoTotal = rodada?.custo_total_usd ?? 0;
  const inicio = crescimento?.inicio;
  const diasAtivos = inicio
    ? Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000)
    : null;
  const totalIndexado = crescimento?.total_atual ?? stats?.total_atos ?? 0;
  const docsPorDia =
    diasAtivos && diasAtivos > 0 && totalIndexado > 0
      ? (totalIndexado / diasAtivos).toFixed(1)
      : null;
  const custoPorCritico =
    custoTotal > 0 && totalCriticos > 0
      ? (custoTotal / totalCriticos).toFixed(2)
      : null;

  const GREEN = "#16a34a";
  const AMBER = "#d97706";

  const FASES = ["Coleta", "Piper", "Bud", "Zew", "Relatório"];
  const faseIdx = pctAnalisados >= 90 ? 3 : pctAnalisados >= 30 ? 2 : pctAnalisados >= 5 ? 1 : 0;

  // Build phase elements without Fragment
  const phaseEls: React.ReactNode[] = [];
  FASES.forEach((label, i) => {
    const isActive = i === faseIdx;
    const isDone = i < faseIdx;
    phaseEls.push(
      <div
        key={`fase-${i}`}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
      >
        <div
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isDone ? GREEN : isActive ? INK : BORDER,
            outline: isActive ? `2px solid ${INK}` : "none",
            outlineOffset: 2,
            transition: "background 0.3s",
          }}
        />
        <span style={{
          fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase" as const,
          color: isDone ? GREEN : isActive ? INK : SUBTLE,
          fontWeight: isActive ? 600 : 400,
        }}>
          {label}
        </span>
      </div>
    );
    if (i < FASES.length - 1) {
      phaseEls.push(
        <div
          key={`conn-${i}`}
          style={{
            flex: 2, height: 1,
            background: i < faseIdx ? GREEN : BORDER,
            marginBottom: 14, transition: "background 0.3s",
          }}
        />
      );
    }
  });

  return (
    <div className="space-y-px">
      {/* ── Modal ── */}
      {modal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(10,10,10,0.52)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: "#fff", border: `1px solid ${BORDER}`,
              padding: "28px 32px 36px", maxWidth: 480, width: "100%",
              maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {modal === "cobertura" ? "Cobertura da Investigação" : modal === "alertas" ? "Alertas Descobertos" : "Custo da Investigação"}
              </p>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {modal === "cobertura" && (
              <div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
                  <span style={{ fontFamily: TIGHT, fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: isSuccess ? GREEN : INK }}>
                    {pctAnalisados}%
                  </span>
                  <div style={{ paddingBottom: 8 }}>
                    <p style={{ fontFamily: MONO, fontSize: 9, color: isSuccess ? GREEN : AMBER, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {isSuccess ? "✓ meta atingida" : `faltam ${90 - pctAnalisados}pp`}
                    </p>
                    <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {fmt(stats?.total_analisados)} de {fmt(totalAuditavel)} auditáveis
                      {totalSemTexto > 0 && (
                        <span style={{ color: SUBTLE }}> · {fmt(totalSemTexto)} sem texto</span>
                      )}
                    </p>
                  </div>
                </div>
                <div style={{ position: "relative", paddingBottom: 24, marginBottom: 20 }}>
                  <div style={{ height: 8, background: BORDER, borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${Math.min(pctAnalisados, 100)}%`, background: isSuccess ? GREEN : INK, borderRadius: 2, transition: "width 0.6s" }} />
                  </div>
                  <div style={{ position: "absolute", left: "90%", top: -3, bottom: 0, width: 2, background: isSuccess ? GREEN : AMBER, transform: "translateX(-50%)" }} />
                  <div style={{ position: "absolute", left: "90%", top: 14, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 8.5, color: isSuccess ? GREEN : AMBER, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    META 90%
                  </div>
                </div>
                <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.75 }}>
                  A auditoria é considerada completa quando 90% dos documentos indexados forem analisados.
                  Com essa cobertura, o Dig Dig Zew recebe a síntese e traça os padrões que só emergem
                  quando o corpus é tratado como sistema coerente.
                </p>
              </div>
            )}

            {modal === "alertas" && (
              <div>
                <div style={{ display: "flex", gap: 28, marginBottom: 20 }}>
                  <div>
                    <p style={{ fontFamily: TIGHT, fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "#dc2626" }}>{fmt(totalVermelhos)}</p>
                    <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Vermelho</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: TIGHT, fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "#c2410c" }}>{fmt(totalLaranja)}</p>
                    <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Laranja</p>
                  </div>
                </div>
                <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />
                {(["vermelho", "laranja", "amarelo", "verde"] as const).map((cor) => {
                  const n = cor === "vermelho" ? totalVermelhos : cor === "laranja" ? totalLaranja : dist?.[cor] ?? 0;
                  const descs: Record<string, string> = {
                    vermelho: "Irregularidade grave — fichas de denúncia geradas",
                    laranja: "Indício moderado-grave — análise aprofundada recomendada",
                    amarelo: "Padrão suspeito — merece atenção, não urgente",
                    verde: "Conforme — procedimento regular, sem flags",
                  };
                  const c = NIVEL_BG[cor] ?? { bg: PAPER, fg: MUTED, border: BORDER };
                  return (
                    <div key={cor} style={{ display: "flex", gap: 12, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 2, marginBottom: 6 }}>
                      <span style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 20, color: c.fg, lineHeight: 1.2, minWidth: 44 }}>{fmt(n)}</span>
                      <div>
                        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: c.fg, letterSpacing: "0.04em", textTransform: "uppercase" }}>{cor}</p>
                        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 1, lineHeight: 1.5 }}>{descs[cor]}</p>
                      </div>
                    </div>
                  );
                })}
                <p style={{ fontSize: 10.5, color: SUBTLE, fontFamily: MONO, marginTop: 12 }}>
                  {pctCriticos}% dos documentos analisados têm indícios críticos
                </p>
              </div>
            )}

            {modal === "custo" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: TIGHT, fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: INK }}>${custoTotal.toFixed(2)}</p>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Custo total acumulado</p>
                </div>
                <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />
                {([
                  rodada ? { label: "Docs analisados pelo Piper", value: fmt(rodada.atos_analisados_piper) } : null,
                  rodada && rodada.atos_analisados_piper > 0 ? { label: "Custo por documento", value: `$${(rodada.custo_total_usd / rodada.atos_analisados_piper).toFixed(4)}` } : null,
                  custoPorCritico ? { label: "Custo por achado crítico", value: `$${custoPorCritico}` } : null,
                  diasAtivos != null ? { label: "Dias de investigação", value: `${diasAtivos}d` } : null,
                  diasAtivos && custoTotal > 0 ? { label: "Custo por dia", value: `$${(custoTotal / diasAtivos).toFixed(2)}` } : null,
                ] as ({ label: string; value: string } | null)[]).filter(Boolean).map((row) => (
                  <div key={row!.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 12, color: MUTED }}>{row!.label}</span>
                    <span style={{ fontSize: 12, fontFamily: MONO, color: INK }}>{row!.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 1. Mission status banner ── */}
      <div
        style={{
          border: `1px solid ${isSuccess ? "#bbf7d0" : BORDER}`,
          background: isSuccess ? "#f0fdf4" : PAPER,
          padding: "20px 24px 28px",
          transition: "background 0.4s, border-color 0.4s",
        }}
      >
        {/* Phase timeline */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {phaseEls}
        </div>

        {/* Coverage row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
              Cobertura da investigação
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: TIGHT, fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: isSuccess ? GREEN : INK, transition: "color 0.4s" }}>
                {pctAnalisados}%
              </span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: isSuccess ? GREEN : AMBER, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 4 }}>
                {isSuccess ? "✓ meta atingida · coleta contínua" : "meta: 90%"}
              </span>
            </div>
          </div>
          {isLive && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN, display: "inline-block" }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase" }}>pipeline ao vivo</span>
            </div>
          )}
        </div>

        {/* Success state — pending docs message */}
        {isSuccess && (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 16px",
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.18)",
              borderRadius: 2,
            }}
          >
            <p
              style={{
                fontFamily: MONO, fontSize: 8.5, fontWeight: 600,
                color: GREEN, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6,
              }}
            >
              Aguardando finalização dos documentos pendentes
            </p>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, margin: 0 }}>
              Os últimos atos tendem a ser os mais complexos — contratos com links quebrados, atas de
              reuniões específicas, deliberações sem extração completa. A base continua crescendo para
              que o Zew trabalhe com o corpus mais completo possível. Mais documentos agora significa
              mais acurácia na síntese final.
            </p>
          </div>
        )}

        {/* Threshold bar */}
        <div style={{ position: "relative", paddingBottom: 20 }}>
          <div style={{ height: 5, background: BORDER, borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${Math.min(pctAnalisados, 100)}%`, background: isSuccess ? GREEN : INK, borderRadius: 2, transition: "width 0.6s ease, background 0.4s" }} />
          </div>
          <div style={{ position: "absolute", left: "90%", top: -3, bottom: 0, width: 2, background: isSuccess ? GREEN : AMBER, transform: "translateX(-50%)" }} />
          <div style={{ position: "absolute", left: "90%", top: 11, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 8.5, color: isSuccess ? GREEN : AMBER, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            meta 90%
          </div>
        </div>
      </div>

      {/* ── 2. Signal cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: BORDER }}>
        {/* Cobertura */}
        <div
          style={{ background: cardHover === "cobertura" ? PAPER : "#fff", padding: "28px 28px 32px", cursor: "pointer", transition: "background 0.15s", position: "relative", overflow: "hidden" }}
          onMouseEnter={() => setCardHover("cobertura")}
          onMouseLeave={() => setCardHover(null)}
          onClick={() => setModal("cobertura")}
        >
          <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
            Documentos analisados
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16 }}>
            <span style={{ fontFamily: TIGHT, fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: isSuccess ? GREEN : INK, transition: "color 0.3s" }}>
              {fmt(stats?.total_analisados)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: SUBTLE, paddingBottom: 7 }}>
              / {fmt(totalAuditavel)}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: cardHover === "cobertura" ? INK : MUTED, lineHeight: 1.65, transition: "color 0.15s" }}>
            {cardHover === "cobertura" ? "Ver cobertura detalhada →" : `${pctAnalisados}% coberto · meta 90% para fase Zew`}
          </p>
          {/* bottom progress strip */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: BORDER }}>
            <div style={{ height: "100%", width: `${Math.min(pctAnalisados, 100)}%`, background: isSuccess ? GREEN : "#c8c5bc", transition: "width 0.5s" }} />
          </div>
        </div>

        {/* Alertas */}
        <div
          style={{ background: cardHover === "alertas" ? PAPER : "#fff", padding: "28px 28px 32px", cursor: "pointer", transition: "background 0.15s", position: "relative", overflow: "hidden" }}
          onMouseEnter={() => setCardHover("alertas")}
          onMouseLeave={() => setCardHover(null)}
          onClick={() => setModal("alertas")}
        >
          <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
            Alertas descobertos
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginBottom: 16 }}>
            <span style={{ fontFamily: TIGHT, fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: totalVermelhos > 0 ? "#dc2626" : INK, transition: "color 0.3s" }}>
              {fmt(totalCriticos)}
            </span>
            <div style={{ paddingBottom: 7, display: "flex", gap: 14 }}>
              <div>
                <span style={{ fontFamily: TIGHT, fontSize: 20, fontWeight: 600, color: "#dc2626", lineHeight: 1 }}>{fmt(totalVermelhos)}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 7.5, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>verm.</span>
              </div>
              <div>
                <span style={{ fontFamily: TIGHT, fontSize: 20, fontWeight: 600, color: "#c2410c", lineHeight: 1 }}>{fmt(totalLaranja)}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 7.5, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>laran.</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: cardHover === "alertas" ? INK : MUTED, lineHeight: 1.65, transition: "color 0.15s" }}>
            {cardHover === "alertas" ? "Ver distribuição por nível →" : `${pctCriticos}% dos analisados · laranja + vermelho`}
          </p>
          {/* bottom alert strip */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: BORDER }}>
            <div style={{ height: "100%", width: `${Math.min(pctCriticosNum, 100)}%`, background: totalVermelhos > 0 ? "#dc2626" : "#c2410c" }} />
          </div>
        </div>
      </div>

      {/* ── 3. Operational strip ── */}
      <div className="grid grid-cols-3 gap-px" style={{ background: BORDER }}>

        {/* Value meter — custo */}
        {(() => {
          const custoPorAchado = custoPorCritico ? parseFloat(custoPorCritico) : 0;
          const TIERS = [
            { max: 0.30,      label: "Barato",    color: GREEN,     pos: 8  },
            { max: 1.00,      label: "Eficiente", color: "#16a34a", pos: 28 },
            { max: 3.00,      label: "Moderado",  color: AMBER,     pos: 55 },
            { max: Infinity,  label: "Caro",      color: "#dc2626", pos: 82 },
          ];
          const tier = TIERS.find((t) => custoPorAchado < t.max) ?? TIERS[TIERS.length - 1];
          // Bar cursor position: map $0–$10 to 0–96%
          const barPos = custoPorAchado <= 0
            ? 4
            : Math.min(96, (Math.log10(custoPorAchado + 0.01) + 2.3) / 3.3 * 100);
          const SEG_COLORS = [GREEN, "#84cc16", AMBER, "#dc2626"];
          return (
            <div
              style={{ background: cardHover === "custo" ? PAPER : "#fff", padding: "18px 20px", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={() => setCardHover("custo")}
              onMouseLeave={() => setCardHover(null)}
              onClick={() => setModal("custo")}
            >
              <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                Custo total
              </p>

              {/* Value label */}
              <p style={{ fontFamily: TIGHT, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: tier.color, marginBottom: 10, transition: "color 0.3s" }}>
                {tier.label}
              </p>

              {/* Segmented bar + cursor */}
              <div style={{ position: "relative", marginBottom: 5 }}>
                <div style={{ display: "flex", height: 4, gap: 2, borderRadius: 2, overflow: "visible" }}>
                  {SEG_COLORS.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: "100%", borderRadius: 1,
                        background: c,
                        opacity: barPos > i * 25 ? 1 : 0.18,
                        transition: "opacity 0.3s",
                      }}
                    />
                  ))}
                </div>
                {/* Cursor dot */}
                <div
                  style={{
                    position: "absolute",
                    left: `${barPos}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 9, height: 9, borderRadius: "50%",
                    background: tier.color,
                    border: "2px solid #fff",
                    boxShadow: `0 0 0 1.5px ${tier.color}`,
                    transition: "left 0.5s ease, background 0.3s",
                    zIndex: 1,
                  }}
                />
              </div>

              {/* Scale labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: SUBTLE, letterSpacing: "0.04em" }}>barato</span>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: SUBTLE, letterSpacing: "0.04em" }}>caro</span>
              </div>

              {/* Cost footnote */}
              <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO }}>
                {custoTotal > 0 ? `$${custoTotal.toFixed(2)}` : "—"}
                {custoPorCritico ? ` · $${custoPorCritico}/achado` : ""}
              </p>
            </div>
          );
        })()}

        {/* Tempo */}
        <div style={{ background: "#fff", padding: "18px 20px" }}>
          <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Investigação ativa</p>
          <p style={{ fontFamily: TIGHT, fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, color: INK, marginBottom: 4 }}>
            {diasAtivos != null ? `${diasAtivos}d` : "—"}
          </p>
          <p style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO }}>
            {inicio ? `desde ${new Date(inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : "—"}
          </p>
        </div>

        {/* Ritmo */}
        <div style={{ background: "#fff", padding: "18px 20px" }}>
          <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Ritmo de coleta</p>
          <p style={{ fontFamily: TIGHT, fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, color: INK, marginBottom: 4 }}>
            {docsPorDia ?? "—"}
          </p>
          <p style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO }}>docs · dia</p>
        </div>

      </div>

      {/* ── 4. Próximo marco ── */}
      <div style={{ border: `1px solid ${BORDER}`, padding: "18px 24px", background: isSuccess ? "#f0fdf4" : PAPER, transition: "background 0.4s" }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
          Próximo marco
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, marginTop: 3, color: isSuccess ? GREEN : AMBER }}>●</span>
          <div>
            <p style={{ fontFamily: TIGHT, fontSize: 14, fontWeight: 600, color: isSuccess ? GREEN : INK, letterSpacing: "-0.01em" }}>
              {isSuccess ? "Fase Zew liberada — coleta final em andamento" : `Ampliar cobertura: ${90 - pctAnalisados}pp para atingir 90%`}
            </p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.65 }}>
              {isSuccess
                ? `90% atingidos. A investigação já pode iniciar a fase Zew com os ${fmt(totalCriticos)} alertas identificados, mas a coleta continua — cada documento adicionado agora aumenta a acurácia da síntese final. Os últimos atos são os mais difíceis de extrair, e são exatamente esses que o Zew precisa ver.`
                : `Com ${pctAnalisados}% de cobertura, faltam ${90 - pctAnalisados} pontos para a fase Zew — síntese do corpus como sistema coerente.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Dados Financeiros ── */}
      <div style={{ border: `1px solid #c7d2fe`, background: "#eef2ff", padding: "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <p style={{ fontFamily: MONO, fontSize: 9, color: "#4338ca", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Dados Financeiros
          </p>
          <span style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase",
            background: "#4338ca", color: "#fff", padding: "2px 7px", borderRadius: 2,
          }}>
            NOVIDADE
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Diárias */}
          <div style={{ background: "#fff", border: `1px solid #c7d2fe`, padding: "14px 16px" }}>
            <p style={{ fontFamily: MONO, fontSize: 8.5, color: "#6366f1", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
              Diárias &amp; Deslocamentos
            </p>
            <p style={{ fontFamily: TIGHT, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: INK, marginBottom: 4 }}>
              {finStats ? fmt(finStats.diarias.total) : "—"}
            </p>
            <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
              registros extraídos · 0 analisados
            </p>
          </div>
          {/* Passagens */}
          <div style={{ background: "#fff", border: `1px solid #c7d2fe`, padding: "14px 16px" }}>
            <p style={{ fontFamily: MONO, fontSize: 8.5, color: "#6366f1", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
              Passagens Aéreas
            </p>
            <p style={{ fontFamily: TIGHT, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: INK, marginBottom: 4 }}>
              {finStats ? fmt(finStats.passagens.total) : "—"}
            </p>
            <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
              registros extraídos · 0 analisados
            </p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#6366f1", fontFamily: MONO, marginTop: 10 }}>
          Fonte: Portal de Transparência Implanta · CAU/PR · 2024–2026
        </p>
      </div>
    </div>
  );
}

// ── Tab: Atos table ─────────────────────────────────────────────────────
function TabAtos({
  slug,
  tipo,
  tipoAtlas,
}: {
  slug: string;
  tipo: string;
  tipoAtlas?: string;
}) {
  const [atos, setAtos] = useState<PainelAto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState("");
  const [ano, setAno] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchPainelAtos(slug, {
      tipo: tipo || undefined,
      tipoAtlas: tipoAtlas || undefined,
      nivel: nivel || undefined,
      ano: ano ? Number(ano) : undefined,
      busca: busca || undefined,
      page,
    })
      .then((r) => {
        setAtos(r.atos);
        setTotal(r.total);
        setPages(r.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, tipo, tipoAtlas, nivel, ano, busca, page]);

  const anos = Array.from({ length: 7 }, (_, i) => 2020 + i);

  const selectStyle = {
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    color: INK,
    background: "#fff",
    fontFamily: MONO,
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={nivel}
          onChange={(e) => {
            setNivel(e.target.value);
            setPage(1);
          }}
          className="h-8 px-3 text-[11.5px] uppercase tracking-wider focus:outline-none"
          style={selectStyle}
        >
          <option value="">Todos níveis</option>
          {["verde", "amarelo", "laranja", "vermelho"].map((n) => (
            <option key={n} value={n} className="capitalize">
              {n}
            </option>
          ))}
        </select>
        <select
          value={ano}
          onChange={(e) => {
            setAno(e.target.value);
            setPage(1);
          }}
          className="h-8 px-3 text-[11.5px] uppercase tracking-wider focus:outline-none"
          style={selectStyle}
        >
          <option value="">Todos anos</option>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div
          className="relative flex items-center gap-2 px-3 h-8 flex-1 min-w-0 sm:flex-none"
          style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}
        >
          <Search size={12} style={{ color: SUBTLE }} />
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
            placeholder="Número ou ementa…"
            className="bg-transparent text-[12px] outline-none w-full sm:w-52 min-w-0"
            style={{ color: INK }}
          />
        </div>
        <span
          className="text-[10.5px] w-full sm:w-auto sm:ml-auto uppercase tracking-wider"
          style={{ color: SUBTLE, fontFamily: MONO }}
        >
          {fmt(total)} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden" style={{ border: `1px solid ${BORDER}` }}>
        {loading && (
          <p className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>
            Carregando…
          </p>
        )}
        {!loading && atos.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>
            Nenhum resultado.
          </p>
        )}
        {!loading &&
          atos.map((ato) => {
            const txt = ato.ementa || ato.resumo_executivo || ato.titulo;
            const data = ato.data_publicacao
              ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR")
              : "—";
            return (
              <Link
                key={ato.id}
                to="/painel/$slug/ato/$id"
                params={{ slug, id: ato.id }}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  className="px-4 py-3.5 active:bg-[#faf8f3] transition-colors"
                  style={{ borderBottom: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: INK, fontFamily: MONO }}
                    >
                      {ato.numero}
                    </span>
                    <NivelBadge nivel={ato.nivel_alerta} />
                  </div>
                  {txt && (
                    <p
                      className="text-[13px] leading-snug mb-2 line-clamp-2"
                      style={{ color: INK }}
                    >
                      {txt}
                    </p>
                  )}
                  <div
                    className="flex items-center justify-between gap-2 text-[10.5px] uppercase tracking-wider"
                    style={{ color: SUBTLE, fontFamily: MONO }}
                  >
                    <span>{data}</span>
                    <span className="flex items-center gap-3">
                      {ato.nivel_alerta && (
                        <span>Score {ato.score_risco}</span>
                      )}
                      {ato.url_pdf && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(ato.url_pdf!, "_blank", "noopener,noreferrer");
                          }}
                          className="hover:text-[#0a0a0a]"
                          style={{ color: SUBTLE }}
                          aria-label="PDF original"
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                      <FileText size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto" style={{ border: `1px solid ${BORDER}` }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: PAPER }}>
              {["Número", "Ementa", "Nível", "Score", "Data", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: MUTED, fontFamily: MONO }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[13px]"
                  style={{ color: MUTED }}
                >
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && atos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[13px]"
                  style={{ color: MUTED }}
                >
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {atos.map((ato) => (
              <tr
                key={ato.id}
                className="hover:bg-[#faf8f3] transition-colors"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <td
                  className="px-4 py-3 whitespace-nowrap font-medium"
                  style={{ color: INK, fontFamily: MONO, fontSize: 12.5 }}
                >
                  <Link
                    to="/painel/$slug/ato/$id"
                    params={{ slug, id: ato.id }}
                    className="hover:underline"
                  >
                    {ato.numero}
                  </Link>
                </td>
                <td
                  className="px-4 py-3 max-w-[320px]"
                  style={{ color: MUTED }}
                >
                  <Link
                    to="/painel/$slug/ato/$id"
                    params={{ slug, id: ato.id }}
                    className="hover:text-[#0a0a0a] transition-colors"
                  >
                    {(() => {
                      const txt = ato.ementa || ato.resumo_executivo || ato.titulo;
                      return txt ? txt.slice(0, 80) + (txt.length > 80 ? "…" : "") : "—";
                    })()}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <NivelBadge nivel={ato.nivel_alerta} />
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: MUTED, fontFamily: MONO, fontSize: 12 }}
                >
                  {ato.nivel_alerta ? ato.score_risco : "—"}
                </td>
                <td
                  className="px-4 py-3 whitespace-nowrap"
                  style={{ color: MUTED, fontFamily: MONO, fontSize: 12 }}
                >
                  {ato.data_publicacao
                    ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {ato.url_pdf && (
                      <a
                        href={ato.url_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="PDF original"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-[#0a0a0a] transition-colors"
                        style={{ color: SUBTLE }}
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <Link
                      to="/painel/$slug/ato/$id"
                      params={{ slug, id: ato.id }}
                      title="Ver ficha"
                      className="hover:text-[#0a0a0a] transition-colors"
                      style={{ color: SUBTLE }}
                    >
                      <FileText size={13} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-wider disabled:opacity-30 hover:bg-[#faf8f3] transition-colors"
            style={{
              border: `1px solid ${BORDER}`,
              color: INK,
              fontFamily: MONO,
              borderRadius: 2,
            }}
          >
            ← Anterior
          </button>
          <span
            className="text-[11px] uppercase tracking-wider"
            style={{ color: MUTED, fontFamily: MONO }}
          >
            {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-wider disabled:opacity-30 hover:bg-[#faf8f3] transition-colors"
            style={{
              border: `1px solid ${BORDER}`,
              color: INK,
              fontFamily: MONO,
              borderRadius: 2,
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Denúncias ──────────────────────────────────────────────────────
function TabDenuncias({ slug }: { slug: string }) {
  const [atos, setAtos] = useState<PainelAto[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const nivel = filtro === "todos" ? undefined : filtro;
    fetchPainelAtos(slug, { nivel, page: 1 })
      .then((r) =>
        setAtos(
          r.atos.filter(
            (a) =>
              a.nivel_alerta === "vermelho" || a.nivel_alerta === "laranja",
          ),
        ),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, filtro]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {["todos", "vermelho", "laranja"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-wider capitalize transition-colors"
            style={{
              border: `1px solid ${BORDER}`,
              background: filtro === f ? INK : "transparent",
              color: filtro === f ? "#fff" : MUTED,
              fontFamily: MONO,
              borderRadius: 2,
            }}
          >
            {f === "todos" ? "Todos críticos" : f}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-[13px] py-8 text-center" style={{ color: MUTED }}>
          Carregando…
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-px" style={{ background: BORDER, border: `1px solid ${BORDER}` }}>
        {atos.map((ato) => (
          <div key={ato.id} className="bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <NivelBadge nivel={ato.nivel_alerta} />
              <span
                className="text-[11px] whitespace-nowrap uppercase tracking-wider"
                style={{ color: SUBTLE, fontFamily: MONO }}
              >
                {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"}{" "}
                {ato.numero} · Score {ato.score_risco}
              </span>
            </div>

            {ato.resumo_executivo && (
              <p
                className="text-[13.5px] leading-relaxed"
                style={{ color: INK }}
              >
                {ato.resumo_executivo.slice(0, 220)}
                {ato.resumo_executivo.length > 220 ? "…" : ""}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                to="/painel/$slug/ato/$id"
                params={{ slug, id: ato.id }}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors"
                style={{
                  background: INK,
                  color: "#fff",
                  fontFamily: MONO,
                  borderRadius: 2,
                }}
              >
                Ver ficha →
              </Link>
              {ato.url_pdf && (
                <a
                  href={ato.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-[11px] uppercase tracking-wider hover:bg-[#faf8f3] transition-colors"
                  style={{
                    border: `1px solid ${BORDER}`,
                    color: MUTED,
                    fontFamily: MONO,
                    borderRadius: 2,
                  }}
                >
                  PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente: card de fila por agente (paleta clara do painel) ───────
const NIVEL_COLOR_PAINEL: Record<string, string> = {
  vermelho: "#b91c1c",
  laranja: "#c2410c",
  amarelo: "#a16207",
  verde: "#15803d",
};

const MOTIVO_LABEL_PAINEL: Record<string, string> = {
  sem_url: "sem PDF",
  erro_download: "erro download",
  pendente: "PDF pendente",
};
const MOTIVO_COLOR_PAINEL: Record<string, string> = {
  sem_url: "#6b6b66",
  erro_download: "#b91c1c",
  pendente: "#a16207",
};

function PainelFilaCard({ fila, accent }: { fila: FilaInfo; accent: string }) {
  const isEmpty = fila.total === 0;
  return (
    <div
      style={{
        border: `1px solid ${isEmpty ? BORDER : accent + "40"}`,
        background: PAPER,
        padding: "16px",
      }}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.14em] font-semibold truncate"
            style={{ color: isEmpty ? MUTED : accent, fontFamily: MONO }}
          >
            {fila.agente}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: SUBTLE }}>{fila.descricao}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[1.6rem] font-semibold leading-none" style={{ fontFamily: MONO, color: INK }}>
            {fila.total.toLocaleString("pt-BR")}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] mt-1" style={{ color: SUBTLE, fontFamily: MONO }}>
            aguardando
          </p>
        </div>
      </div>
      {fila.amostra.length > 0 ? (
        <ul className="space-y-1">
          {fila.amostra.map((item) => (
            <PainelFilaRow key={item.ato_id} item={item} accent={accent} />
          ))}
        </ul>
      ) : (
        <p className="text-[11px] py-2" style={{ color: MUTED }}>Nenhum documento na fila.</p>
      )}
      {fila.total > fila.amostra.length && (
        <p className="text-[10px] mt-3" style={{ color: SUBTLE, fontFamily: MONO }}>
          + {(fila.total - fila.amostra.length).toLocaleString("pt-BR")} adicional(is)
        </p>
      )}
    </div>
  );
}

function PainelFilaRow({ item, accent }: { item: FilaItem; accent: string }) {
  const niv = item.nivel_alerta;
  const motivo = item.motivo ?? null;
  const tipoLabel = item.tipo.replace(/_/g, " ");
  const bulletColor = niv
    ? (NIVEL_COLOR_PAINEL[niv] ?? accent)
    : motivo
      ? (MOTIVO_COLOR_PAINEL[motivo] ?? accent)
      : accent + "60";
  return (
    <li className="flex items-center gap-2 text-[11px] py-0.5" style={{ color: INK, fontFamily: MONO }}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: bulletColor }}
        title={niv ?? motivo ?? undefined}
      />
      <span className="w-24 shrink-0 truncate" style={{ color: SUBTLE }} title={tipoLabel}>{tipoLabel}</span>
      <span className="flex-1 truncate" title={item.numero}>{item.numero}</span>
      {motivo && (
        <span
          className="shrink-0 text-[9px] uppercase tracking-[0.1em]"
          style={{ color: MOTIVO_COLOR_PAINEL[motivo] ?? SUBTLE }}
        >
          {MOTIVO_LABEL_PAINEL[motivo] ?? motivo}
        </span>
      )}
      {item.data_publicacao && (
        <span className="shrink-0 text-[10px]" style={{ color: SUBTLE }}>
          {new Date(item.data_publicacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </span>
      )}
    </li>
  );
}

// ── Tab: Pipeline ───────────────────────────────────────────────────────
function TabPipeline({
  slug,
  rodada,
  initialItems,
}: {
  slug: string;
  rodada: PainelRodada | null;
  initialItems: AtividadeItem[] | null;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filas, setFilas] = useState<PipelineStatus | null>(null);
  const [pulse, setPulse] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialItems)
      setItems(
        initialItems.map((i) => ({
          id: i.ato_id,
          ato_id: i.ato_id,
          nivel_alerta: i.nivel_alerta,
          score_risco: null,
          criado_em: i.criado_em ?? new Date().toISOString(),
          event_time: i.event_time || i.analisado_em || i.criado_em || new Date().toISOString(),
          modelo: i.modelo ?? null,
          em_andamento: i.em_andamento ?? false,
          numero: i.numero ?? undefined,
          tipo: i.tipo ?? undefined,
          status: i.status,
          analisado_em: i.analisado_em,
        })),
      );
  }, [initialItems]);

  // Carrega filas + assinatura realtime para atualização ao vivo
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      fetchPipelineStatus(slug).then((p) => {
        if (alive) setFilas(p);
      });
    };
    refresh();
    const interval = setInterval(refresh, 30_000);

    const scheduleRefetch = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        refresh();
        setPulse(true);
        window.setTimeout(() => setPulse(false), 800);
      }, 500);
    };

    const ch = supabase
      .channel(`pipeline-status-${slug}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analises" }, scheduleRefetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "analises" }, scheduleRefetch)
      .subscribe();

    return () => {
      alive = false;
      clearInterval(interval);
      supabase.removeChannel(ch);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [slug]);

  // Realtime handled by orgao-store — initialItems is kept fresh by the store.

  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_piper / rodada.total_atos) * 100)
      : null;

  const entrando = items.filter((i) => i.status === "entrando");
  const analisado = items.filter((i) => i.status !== "entrando");
  const isActive = !!rodada || items.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: isActive ? "#16a34a" : "#d4d2cd", animation: isActive ? "pulse 2s infinite" : undefined }}
          />
          <span className="text-[13px] font-medium" style={{ color: INK }}>
            {rodada
              ? rodada.status === "em_progresso" ? "Análise em andamento" : "Rodada pendente"
              : entrando.length > 0 ? `${entrando.length} docs entrando via scraper`
              : analisado.length > 0 ? "Análises recentes"
              : "Nenhuma atividade nas últimas 24h"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider" style={{ color: MUTED, fontFamily: MONO }}>
          {entrando.length > 0 && (
            <span style={{ color: "#6366f1" }}>{entrando.length} entrando</span>
          )}
          {rodada && (
            <>
              <span>{rodada.atos_analisados_piper} analisados</span>
              <span>{rodada.total_atos - rodada.atos_analisados_piper} restantes</span>
              <span>${rodada.custo_total_usd.toFixed(2)} gasto</span>
            </>
          )}
        </div>
      </div>

      {rodada && pct !== null && (
        <Progress value={pct} className="h-1" style={{ background: PAPER }} />
      )}

      {/* Em processamento agora */}
      {filas && filas.em_processamento.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "#15803d", fontFamily: MONO }}>
              Em processamento agora ({filas.em_processamento.length})
            </span>
          </div>
          <div style={{ border: `1px solid #bbf7d0`, background: "#f0fdf4", padding: 16 }}>
            <ul className="space-y-2">
              {filas.em_processamento.map((item) => {
                const accent = item.agente === "bud" ? "#8b5cf6" : item.agente === "new" ? "#ec4899" : "#3b82f6";
                return (
                  <li key={item.ato_id} className="flex items-center gap-3 text-[12px]" style={{ color: INK, fontFamily: MONO }}>
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: accent }} />
                    <span className="text-[10px] uppercase tracking-wider w-12 shrink-0" style={{ color: accent }}>
                      {item.agente}
                    </span>
                    <span className="w-28 shrink-0 truncate" style={{ color: SUBTLE }}>{item.tipo.replace(/_/g, " ")}</span>
                    <span className="flex-1 truncate">{item.numero}</span>
                    {item.nivel_alerta && (
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: NIVEL_COLOR_PAINEL[item.nivel_alerta] ?? SUBTLE }}>
                        {item.nivel_alerta}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Filas de análise em tempo real */}
      {filas && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: MUTED, fontFamily: MONO }}>
              Filas de análise
            </span>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED, fontFamily: MONO }}>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: pulse ? "#16a34a" : "#3b82f680" }}
              />
              <span>{pulse ? "atualizando" : "realtime"}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <PainelFilaCard fila={filas.filas.aguarda_piper} accent="#3b82f6" />
            <PainelFilaCard fila={filas.filas.aguarda_bud} accent="#8b5cf6" />
            <PainelFilaCard fila={filas.filas.aguarda_new} accent="#ec4899" />
            <PainelFilaCard fila={filas.filas.sem_texto} accent="#9a978f" />
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${BORDER}` }}>
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>
            {initialItems === null ? "Carregando…" : "Nenhuma atividade nas últimas 24h."}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: PAPER }}>
                {["Horário", "Tipo", "Documento", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: MUTED, fontFamily: MONO }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#faf8f3] transition-colors" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-4 py-2.5 text-[12px]" style={{ color: MUTED, fontFamily: MONO }}>
                    {new Date(item.criado_em).toLocaleTimeString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: SUBTLE, fontFamily: MONO }}>
                    {TIPO_SHORT[item.tipo ?? ""] ?? (item.tipo?.slice(0, 6).toUpperCase() ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-[12px]" style={{ color: INK, fontFamily: MONO }}>
                    {item.numero ? `Nº ${item.numero}` : item.ato_id.slice(0, 8) + "…"}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.status === "entrando" ? (
                      <span className="inline-flex items-center gap-1.5" style={{ fontSize: 10, fontFamily: MONO, color: "#6366f1", background: "#eef2ff", padding: "2px 7px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        <ArrowDownToLine size={9} />
                        entrando
                      </span>
                    ) : (
                      <NivelBadge nivel={item.nivel_alerta} />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: SUBTLE, fontFamily: MONO }}>
                    {timeAgo(item.event_time || item.criado_em)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Relatório Final ────────────────────────────────────────────────
const DIGDIG_START = "2026-04-22";

const MARCO_COLORS: Record<string, string> = {
  portaria: "#1a1a1a",
  deliberacao: "#2563eb",
  ata_plenaria: "#7c3aed",
  portaria_normativa: "#0f766e",
  dispensa_eletronica: "#16a34a",
  contratacao_direta: "#15803d",
  contrato: "#047857",
  convenio: "#b45309",
  relatorio_tcu: "#b91c1c",
  relatorio_parecer: "#6b7280",
  auditoria_independente: "#166534",
  licitacao: "#9333ea",
  ata_registro_preco: "#0369a1",
};

function fmtHora(dt: string): string {
  const h = dt.slice(11, 13);
  return h ? `${h}h` : "";
}

// ── Sparkline (sem eixos, apenas a curva) ────────────────────────────────────
function Sparkline({ pontos }: { pontos?: CrescimentoPonto[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!pontos || pontos.length < 2) return <div style={{ height: 180, background: BORDER, opacity: 0.2 }} />;

  const W = 600, H = 180;
  const P = { t: 38, r: 22, b: 42, l: 58 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;

  const maxV = Math.max(...pontos.map((p) => p.total), 1);
  const t0 = new Date(pontos[0].dia).getTime();
  const t1 = new Date(pontos[pontos.length - 1].dia).getTime();
  const dt = Math.max(t1 - t0, 86400000);

  const tx = (d: string) => P.l + ((new Date(d).getTime() - t0) / dt) * iW;
  const ty = (v: number) => P.t + iH - (Math.min(v, maxV) / maxV) * iH;

  const first = pontos[0];
  const last = pontos[pontos.length - 1];
  const hov = hovIdx !== null ? pontos[hovIdx] : null;

  // Y-axis grid: 4 steps, round to nearest 100
  const rawStep = maxV / 4;
  const yStep = rawStep >= 100 ? Math.ceil(rawStep / 100) * 100 : Math.ceil(rawStep / 10) * 10 || 1;
  const yLines = [0, 1, 2, 3, 4].map((i) => ({ v: Math.min(yStep * i, maxV), y: ty(Math.min(yStep * i, maxV)) }));
  const fmtY = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(v % 500 === 0 ? 0 : 1)}k` : String(v);

  // X-axis annual labels
  const startYear = new Date(pontos[0].dia).getFullYear();
  const endYear = new Date(pontos[pontos.length - 1].dia).getFullYear();
  const xLabels: { label: string; x: number }[] = [];
  for (let yr = startYear + 1; yr <= endYear; yr++) {
    const xp = P.l + ((new Date(`${yr}-01-01`).getTime() - t0) / dt) * iW;
    if (xp > P.l + 30 && xp < P.l + iW - 30) xLabels.push({ label: String(yr), x: xp });
  }

  // Dig Dig marker
  const digX = tx(DIGDIG_START);
  const digOk = digX >= P.l + 5 && digX <= P.l + iW - 5;

  // SVG paths
  const linePts = pontos.map((p) => `${tx(p.dia).toFixed(1)},${ty(p.total).toFixed(1)}`).join(" ");
  const areaPath = [
    `M${tx(first.dia).toFixed(1)},${(P.t + iH).toFixed(1)}`,
    ...pontos.map((p) => `L${tx(p.dia).toFixed(1)},${ty(p.total).toFixed(1)}`),
    `L${tx(last.dia).toFixed(1)},${(P.t + iH).toFixed(1)}Z`,
  ].join(" ");

  // End label: left-anchored unless point is near right edge
  const lastX = tx(last.dia);
  const endLeft = lastX > P.l + iW - 65;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const cRect = containerRef.current?.getBoundingClientRect();
    const vbX = ((e.clientX - svgRect.left) / svgRect.width) * W;
    let closest = 0, minD = Infinity;
    pontos.forEach((p, i) => { const d = Math.abs(tx(p.dia) - vbX); if (d < minD) { minD = d; closest = i; } });
    setHovIdx(closest);
    if (cRect) setMousePos({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 180, display: "block", cursor: "crosshair", userSelect: "none" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHovIdx(null); setMousePos(null); }}
      >
        <defs>
          <linearGradient id="sp-growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0.12} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Y grid */}
        {yLines.map(({ v, y }) => (
          <g key={v}>
            <line x1={P.l} y1={y} x2={P.l + iW} y2={y} stroke={BORDER} strokeWidth={0.8} />
            <text x={P.l - 8} y={y + 3.5} textAnchor="end" fontSize={9} fill={SUBTLE} fontFamily={MONO}>{fmtY(v)}</text>
          </g>
        ))}

        {/* X axis */}
        <line x1={P.l} y1={P.t + iH} x2={P.l + iW} y2={P.t + iH} stroke={BORDER} strokeWidth={0.8} />
        {xLabels.map(({ label, x }) => (
          <g key={label}>
            <line x1={x} y1={P.t + iH} x2={x} y2={P.t + iH + 4} stroke={BORDER} strokeWidth={0.8} />
            <text x={x} y={P.t + iH + 16} textAnchor="middle" fontSize={9} fill={SUBTLE} fontFamily={MONO}>{label}</text>
          </g>
        ))}

        {/* Area + line */}
        <path d={areaPath} fill="url(#sp-growth)" />
        <polyline points={linePts} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dig Dig marker */}
        {digOk && (
          <g>
            <line x1={digX} y1={P.t} x2={digX} y2={P.t + iH} stroke="#d97706" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.65} />
            <rect x={digX + 3} y={P.t + 2} width={40} height={14} fill="#fffbeb" rx={2} opacity={0.95} />
            <text x={digX + 7} y={P.t + 12} fontSize={8} fill="#d97706" fontFamily={MONO} fontWeight="bold">DIG DIG</text>
          </g>
        )}

        {/* Start annotation */}
        <circle cx={tx(first.dia)} cy={ty(first.total)} r={3.5} fill="#fff" stroke={SUBTLE} strokeWidth={1.5} />
        <text x={tx(first.dia) + 7} y={ty(first.total) - 7} fontSize={8} fill={SUBTLE} fontFamily={MONO}>
          {new Date(first.dia).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "")}
        </text>
        <text x={tx(first.dia) + 7} y={ty(first.total) + 4} fontSize={10.5} fill={SUBTLE} fontFamily={MONO} fontWeight="600">
          {fmt(first.total)}
        </text>

        {/* End annotation — black badge */}
        <circle cx={lastX} cy={ty(last.total)} r={5} fill={INK} />
        <rect
          x={endLeft ? lastX - 62 : lastX + 5}
          y={ty(last.total) - 36}
          width={58} height={34}
          fill={INK} rx={3}
        />
        <text
          x={endLeft ? lastX - 33 : lastX + 34}
          y={ty(last.total) - 24}
          textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.6)" fontFamily={MONO}
        >atual</text>
        <text
          x={endLeft ? lastX - 33 : lastX + 34}
          y={ty(last.total) - 7}
          textAnchor="middle" fontSize={17} fill="#fff" fontFamily={TIGHT} fontWeight="700"
        >{fmt(last.total)}</text>

        {/* Hover crosshair */}
        {hov && (
          <g>
            <line x1={tx(hov.dia)} y1={P.t} x2={tx(hov.dia)} y2={P.t + iH}
              stroke={INK} strokeWidth={0.8} strokeDasharray="3,2" opacity={0.3} />
            <circle cx={tx(hov.dia)} cy={ty(hov.total)} r={5}
              fill="#fff" stroke={INK} strokeWidth={2} />
          </g>
        )}
      </svg>

      {/* HTML tooltip */}
      {hov && mousePos && (
        <div style={{
          position: "absolute",
          left: mousePos.x > (containerRef.current?.offsetWidth ?? 400) * 0.65
            ? mousePos.x - 138
            : mousePos.x + 14,
          top: Math.max(mousePos.y - 80, 4),
          pointerEvents: "none",
          background: "#fff",
          border: `1px solid ${BORDER}`,
          padding: "8px 12px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.09)",
          zIndex: 20,
          minWidth: 120,
        }}>
          <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {new Date(hov.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 24, color: INK, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {fmt(hov.total)}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 3 }}>documentos indexados</p>
        </div>
      )}
    </div>
  );
}

// ── TypeBars: tabela BI horizontal ───────────────────────────────────────────
function TypeBars({ marcos, total }: { marcos: Marco[]; total: number }) {
  if (marcos.length === 0) return null;
  const sorted = [...marcos].sort((a, b) => b.total_tipo - a.total_tipo);
  const maxCount = sorted[0].total_tipo;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {sorted.map((m) => {
        const color = MARCO_COLORS[m.tipo] ?? "#6b7280";
        const pct = total > 0 ? (m.total_tipo / total) * 100 : 0;
        const barW = maxCount > 0 ? (m.total_tipo / maxCount) * 100 : 0;
        const dia = m.primeiro_dia.slice(5).replace("-", "/");
        const hora = fmtHora(m.primeiro_dt);
        return (
          <div
            key={m.tipo}
            style={{
              display: "grid",
              gridTemplateColumns: "10px 148px 56px 1fr 44px 70px",
              gap: "0 10px",
              alignItems: "center",
            }}
          >
            {/* Color swatch — small rect, não círculo */}
            <div style={{ width: 8, height: 8, background: color, borderRadius: 2, margin: "0 auto" }} />
            {/* Label */}
            <span style={{ fontSize: 11.5, color: INK, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {m.label}
            </span>
            {/* Count */}
            <span style={{ fontSize: 11.5, color: INK, fontFamily: MONO, textAlign: "right" }}>
              {fmt(m.total_tipo)}
            </span>
            {/* Bar track */}
            <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
            {/* Percentage */}
            <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, textAlign: "right" }}>
              {pct.toFixed(1)}%
            </span>
            {/* Entry date */}
            <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO }}>
              {dia} {hora}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente: Relatório Preliminar da Auditoria ───────────────────────

const CASO_VERMELHO: {
  id: string;
  score: number;
  pattern: string;
  text: string;
}[] = [
  {
    id: "Portaria 667/2026",
    score: 95,
    pattern: "Processo disciplinar de 18 meses em sigilo total — dois presidentes, mesma comissão",
    text:
      "Em agosto de 2024, o Presidente Maugham Zaze instaurou um PAD por ato unilateral. O investigado e o objeto permanecem não identificados publicamente em fevereiro de 2026 — 18 meses depois. A comissão foi composta exclusivamente por servidores subordinados, em violação ao regimento. A Portaria 667 é a terceira recondução — cada uma por portaria presidencial, sem deliberação plenária. O sistema identificou incoerências cronológicas internas: a data de assinatura conflita com datas internas do documento.",
  },
  {
    id: "Portaria 514/2024",
    score: 93,
    pattern: "Captura institucional do aparato investigativo — estrutura sem previsão regimental",
    text:
      "O Presidente Maugham Zaze criou por ato unilateral uma \"Comissão Permanente de Sindicância e Inquérito\" — estrutura sem previsão no regimento interno, composta por cinco empregados de confiança hierarquicamente subordinados. A comissão assumiu poderes investigativos sem deliberação plenária sobre sua criação, composição ou escopo.",
  },
  {
    id: "Portaria 533/2024",
    score: 88,
    pattern: "O presidente que instaura, compõe e nomeia o defensor — triplo controle processual",
    text:
      "Na comissão instaurada pela Portaria 522, o presidente prorrogou o prazo e, no mesmo ato, designou um subordinado direto como \"defensor\" do investigado. A cadeia é completa: quem instaurou o processo, escolheu os investigadores, também nomeia o defensor. A proteção se torna ficção.",
  },
  {
    id: "Portaria 586/2025",
    score: 87,
    pattern: "Descontinuação e reconstituição direcionada — substituição cirúrgica de membro",
    text:
      "Uma comissão constituída em setembro de 2024 foi descontinuada em data não declarada. Em abril de 2025, o Vice-Presidente Versetti a reinstaura — mantendo dois membros e substituindo um. Substituição pontual suficiente para alterar a dinâmica sem levantar suspeita sobre o conjunto.",
  },
  {
    id: "Portaria 673/2026",
    score: 87,
    pattern: "11 meses, substituição unilateral de membro, processo oculto — o modelo se repete",
    text:
      "O Presidente Linzmeyer instaurou comissão processante em abril de 2025. Objeto e investigado: não identificados. Em março de 2026, alterou a composição e prorrogou por portaria unilateral, sem deliberação plenária. Este é o Processo B — instaurado pelo presidente atual, não herdado. A repetição do mesmo modelo converte o padrão de individual para institucional.",
  },
];

const ATORES = [
  { nome: "Milton C. Zanelatto Gonçalves", apars: 148, papel: "Ex-presidente", obs: "Maior volume de assinaturas — gestão anterior" },
  { nome: "Walter Gustavo Linzmeyer", apars: 136, papel: "Presidente (atual)", obs: "Concentração em atos disciplinares 2024–2026", destaque: true },
  { nome: "Maugham Zaze", apars: 97, papel: "Ex-presidente", obs: "Instaurou PAD de 20 meses e comissão permanente", destaque: true },
  { nome: "André Felipe Casagrande", apars: 33, papel: "Servidor", obs: "Membro recorrente de comissões investigativas", alerta: true },
  { nome: "Cleverson João Veiga", apars: 31, papel: "Servidor", obs: "Investigador recorrente em sindicâncias", alerta: true },
  { nome: "Leandro Reguelin", apars: 31, papel: "Servidor", obs: "Operacional em PADs; designado como defensor pelo mesmo presidente que o nomeou investigador", alerta: true },
  { nome: "Jeancarlo Versetti", apars: 25, papel: "Vice-Presidente", obs: "Assina atos presidenciais sem fundamento formal de substituição documentado" },
  { nome: "Alisson Castro Geremias", apars: 25, papel: "Ger. Comunicação", obs: "Designado para funções fiscalizadoras fora de sua área" },
];

function _noop() {
  const stats = null as PublicStats | null;
  const dist = stats?.distribuicao;
  const totalComNivel = dist ? dist.verde + dist.amarelo + dist.laranja + dist.vermelho : 0;
  const pctCritico = totalComNivel > 0 ? (((dist?.laranja ?? 0) + (dist?.vermelho ?? 0)) / totalComNivel) * 100 : 0; void pctCritico;
  const ROW_BORDER = "#f0ece4";
  const SECTION_DIVIDER = { height: 1, background: BORDER, margin: "28px 0" }; void SECTION_DIVIDER;
  const PATTERN_TITLE_STYLE = { fontFamily: TIGHT, fontWeight: 600, fontSize: 14, color: INK, marginBottom: 8, lineHeight: 1.3 }; void PATTERN_TITLE_STYLE;
  const PARA_STYLE = { fontSize: 12.5, color: MUTED, lineHeight: 1.7, marginBottom: 10 }; void PARA_STYLE;

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        background: PAPER,
        padding: "28px 28px 32px",
        marginTop: 8,
      }}
    >
      {/* Header do documento */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          paddingBottom: 20,
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Relatório Preliminar · CAU/PR · Abril 2026
          </p>
          <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 20, color: INK, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6 }}>
            Pré-Auditoria Integrada
          </p>
          <p style={{ fontSize: 12, color: MUTED }}>
            Síntese de {fmt(stats?.total_analisados)} atos analisados por Haiku + Sonnet —
            antes da fase Opus 4.7
          </p>
        </div>
        <div
          style={{
            border: `1px solid ${BORDER}`,
            padding: "8px 14px",
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            Estágio da análise
          </p>
          <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 13, color: INK }}>
            Haiku + Sonnet completos
          </p>
          <p style={{ fontFamily: MONO, fontSize: 9, color: "#c2410c", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
            Opus 4.7 → pendente
          </p>
        </div>
      </div>

      {/* Números do corpus */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Distribuição de alertas</Eyebrow>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {[
            { nivel: "Verde", n: dist?.verde ?? 0, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", desc: "Conforme" },
            { nivel: "Amarelo", n: dist?.amarelo ?? 0, color: "#a16207", bg: "#fefce8", border: "#fde68a", desc: "Suspeito" },
            { nivel: "Laranja", n: dist?.laranja ?? 0, color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", desc: "Indício grave" },
            { nivel: "Vermelho", n: dist?.vermelho ?? 0, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", desc: "Irregulare" },
          ].map(({ nivel, n, color, bg, border, desc }) => (
            <div
              key={nivel}
              style={{ background: bg, border: `1px solid ${border}`, padding: "12px 14px" }}
            >
              <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 22, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {fmt(n)}
              </p>
              <p style={{ fontFamily: MONO, fontSize: 9, color, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                {nivel}
              </p>
              <p style={{ fontSize: 10.5, color: MUTED, marginTop: 4 }}>
                {totalComNivel > 0 ? ((n / totalComNivel) * 100).toFixed(1) : "0"}% · {desc}
              </p>
            </div>
          ))}
        </div>
        {totalComNivel > 0 && (
          <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE }}>
            {pctCritico.toFixed(1)}% dos documentos com algum nível crítico (laranja ou vermelho)
            · 136 atos ad referendum (7,6%) · 32 prorrogações de comissões processantes
          </p>
        )}
      </div>

      <div style={SECTION_DIVIDER} />

      {/* Os quatro padrões sistêmicos */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Os quatro padrões sistêmicos</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              n: "01",
              title: "Controle presidencial dos mecanismos disciplinares",
              body: "Presidentes instauraram sindicâncias e PADs por ato unilateral, sem deliberação plenária. Prorrogaram prazos sucessivamente por portaria presidencial. Compuseram comissões exclusivamente com servidores subordinados — em violação ao regimento que exige conselheiros titulares. Mantiveram objeto e investigado em sigilo durante meses ou anos. O padrão transcende gestões: está documentado em pelo menos três presidências consecutivas.",
            },
            {
              n: "02",
              title: "Composição direcionada de comissões investigativas",
              body: "Os mesmos servidores não-eleitos aparecem repetidamente em comissões de natureza sensível. André Casagrande (33 atos), Cleverson Veiga (31) e Leandro Reguelin (31) acumulam funções de investigação sem mandato eletivo e com dependência hierárquica direta da presidência. Reguelin cumpre funções contraditórias: investigador e defensor do investigado no mesmo processo, designado pelo mesmo presidente.",
            },
            {
              n: "03",
              title: "Presidência paralela — assinaturas sem amparo formal",
              body: "Em ao menos quatro portarias, o Vice-Presidente Jeancarlo Versetti assinou atos de natureza presidencial — abertura e prorrogação de processos disciplinares — sem que os atos registrassem o instrumento formal de substituição: afastamento, licença ou delegação documentada. Em processos disciplinares, onde a cadeia de autoridade é elemento central de validade, essa lacuna não é administrativa — é processual.",
            },
            {
              n: "04",
              title: "Opacidade como estrutura, não como acidente",
              body: "Quase todos os processos graves têm em comum: o objeto e o investigado não constam do ato publicado. Processos tramitam por meses com referências apenas a números de SEI, sem que o texto permita identificar quem é investigado por quê. A omissão não é compliance com a LGPD — é o uso da LGPD como escudo retórico para ocultar informações que a lei de transparência exige.",
            },
          ].map(({ n, title, body }) => (
            <div key={n} style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: SUBTLE,
                  letterSpacing: "0.08em",
                  flexShrink: 0,
                  paddingTop: 2,
                  width: 20,
                }}
              >
                {n}
              </div>
              <div>
                <p style={PATTERN_TITLE_STYLE}>{title}</p>
                <p style={{ ...PARA_STYLE, marginBottom: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={SECTION_DIVIDER} />

      {/* Cronologia dos processos disciplinares */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Cronologia dos processos disciplinares secretos</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* PAD A */}
          <div style={{ border: `1px solid #fecaca`, background: "#fff5f5", padding: "16px 18px" }}>
            <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12, color: "#b91c1c", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
              PAD-A — 20 meses em sigilo
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid #fecaca", paddingLeft: 14 }}>
              {[
                { data: "15/08/2024", label: "Portaria 522 — instauração (Maugham Zaze)", dot: "#fecaca" },
                { data: "10/10/2024", label: "Portaria 533 — prorrogação + nomeação de defensor", dot: "#fca5a5" },
                { data: "18/11/2025", label: "Portaria 655 — recondução", dot: "#fca5a5" },
                { data: "09/12/2025", label: "Portaria 659 — prorrogação · 16 meses", dot: "#f87171" },
                { data: "12/01/2026", label: "Portaria 664 — prorrogação · 17 meses", dot: "#f87171" },
                { data: "02/02/2026", label: "Portaria 667 — recondução (Linzmeyer) · 18m", dot: "#ef4444" },
                { data: "10/02/2026", label: "Portaria 672 — prorrogação", dot: "#ef4444" },
                { data: "16/03/2026", label: "Portaria 675 — prorrogação", dot: "#ef4444" },
                { data: "02/04/2026", label: "Portaria 678 — prorrogação · ativo", dot: "#dc2626" },
              ].map(({ data, label, dot }) => (
                <div key={data} style={{ display: "flex", gap: 10, paddingBottom: 8, position: "relative" }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      marginTop: 4,
                      marginLeft: -18,
                    }}
                  />
                  <div style={{ paddingLeft: 4 }}>
                    <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.06em" }}>{data}</p>
                    <p style={{ fontSize: 11, color: INK, lineHeight: 1.4 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* PAD B */}
          <div style={{ border: `1px solid #fed7aa`, background: "#fffbf5", padding: "16px 18px" }}>
            <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12, color: "#c2410c", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
              PAD-B — 12 meses em sigilo
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid #fed7aa", paddingLeft: 14 }}>
              {[
                { data: "07/04/2025", label: "Portaria 580 — instauração (Linzmeyer)", dot: "#fed7aa" },
                { data: "02/02/2026", label: "Portaria 667 — recondução + alteração · 10 meses", dot: "#fb923c" },
                { data: "03/03/2026", label: "Portaria 673 — substituição de membro + prorrogação", dot: "#f97316" },
                { data: "02/04/2026", label: "Portaria 678 — prorrogação · ativo", dot: "#ea580c" },
              ].map(({ data, label, dot }) => (
                <div key={data} style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      marginTop: 4,
                      marginLeft: -18,
                    }}
                  />
                  <div style={{ paddingLeft: 4 }}>
                    <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.06em" }}>{data}</p>
                    <p style={{ fontSize: 11, color: INK, lineHeight: 1.4 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "10px 12px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
              <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                <strong>Out/2024:</strong> 4 processos disciplinares simultâneos — 8 portarias
                em 3 semanas com 2 exonerações e 2 nomeações. Concentração temporal anômala.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={SECTION_DIVIDER} />

      {/* Os cinco casos mais graves */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Os cinco casos mais graves · Score de risco</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CASO_VERMELHO.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#fff",
                border: `1px solid #fecaca`,
                borderLeft: "3px solid #dc2626",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 13, color: INK, letterSpacing: "-0.01em" }}>
                  {c.id}
                </p>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    color: "#b91c1c",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "2px 8px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Vermelho · Score {c.score}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: MUTED, fontStyle: "italic", marginBottom: 6 }}>
                {c.pattern}
              </p>
              <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 0 }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={SECTION_DIVIDER} />

      {/* Rede de atores */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Rede de atores · Frequência de aparição nos atos</Eyebrow>
        <div style={{ border: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 100px 1fr",
              gap: "0 12px",
              padding: "6px 14px",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            {["Nome", "Atos", "Função", "Padrão de aparição"].map((h) => (
              <p key={h} style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {h}
              </p>
            ))}
          </div>
          {ATORES.map((a, i) => (
            <div
              key={a.nome}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 100px 1fr",
                gap: "0 12px",
                padding: "8px 14px",
                borderBottom: i < ATORES.length - 1 ? `1px solid ${ROW_BORDER}` : "none",
                background: a.alerta ? "#fffbf5" : "transparent",
              }}
            >
              <p style={{ fontSize: 12, color: a.destaque ? INK : MUTED, fontWeight: a.destaque ? 600 : 400 }}>
                {a.nome}
              </p>
              <p style={{ fontFamily: MONO, fontSize: 11, color: a.alerta ? "#c2410c" : INK, fontWeight: 600 }}>
                {a.apars}
              </p>
              <p style={{ fontSize: 11, color: MUTED }}>{a.papel}</p>
              <p style={{ fontSize: 11, color: a.alerta ? "#92400e" : MUTED, lineHeight: 1.4 }}>{a.obs}</p>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, marginTop: 8 }}>
          Casagrande, Veiga e Reguelin — servidores não-eleitos com concentração anômala em funções de controle processual
        </p>
      </div>

      <div style={SECTION_DIVIDER} />

      {/* Lacunas estruturais */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Lacunas estruturais</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              label: "14 atas plenárias consecutivas ausentes",
              desc: "Reuniões 112–125 não têm ata publicada no site oficial. Período específico da história institucional do CAU/PR. O que foi deliberado nessas reuniões? Quais portarias subsequentes dependem dessas deliberações?",
              color: "#b91c1c",
            },
            {
              label: "80%+ dos contratos e convênios com PDF inacessível",
              desc: "Links existem na página mas os PDFs retornam 404. Uma categoria inteira de atos financeiros — compromissos com fornecedores — efetivamente inacessível ao escrutínio público.",
              color: "#c2410c",
            },
            {
              label: "127 portarias pré-2018 fora do corpus",
              desc: "Portarias 1–127 correspondem ao período fundacional (2012–2018). Não foram incorporadas ao banco. Práticas estabelecidas nesse período estão fora do escopo desta investigação.",
              color: "#a16207",
            },
            {
              label: "Diárias, passagens e folhas de pagamento indisponíveis no portal",
              desc: "Portal da Transparência exibe apenas meses futuros no buscador. Dados históricos de despesas de viagem e remuneração são inacessíveis ao cidadão.",
              color: "#a16207",
            },
          ].map(({ label, desc, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 14px",
                background: "#fff",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  width: 3,
                  background: color,
                  flexShrink: 0,
                  borderRadius: 2,
                  minHeight: 40,
                }}
              />
              <div>
                <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12.5, color: INK, marginBottom: 4 }}>
                  {label}
                </p>
                <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={SECTION_DIVIDER} />

      {/* O que vem depois */}
      <div>
        <Eyebrow>O que o Opus 4.7 vai fazer a seguir</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            {
              title: "Cruzamento ata × portaria",
              desc: "Verificar sistematicamente se portarias emitidas após cada reunião têm amparo na deliberação plenária correspondente. Portaria sem deliberação = ato unilateral.",
            },
            {
              title: "Grafo de votação e presença",
              desc: "Quem vota com quem? Quem se ausenta antes de votações sensíveis? Quem acumula abstenções em temas específicos? As atas registram tudo.",
            },
            {
              title: "Linha do tempo de poder",
              desc: "Sucessão de presidentes com todas as portarias numeradas e datadas: quando cada gestão começou, quais foram seus primeiros e últimos atos, onde houve ruptura ou continuidade.",
            },
            {
              title: "Correlação temporal",
              desc: "Os PADs secretos de 2024–2026 têm correlação com exonerações, nomeações e votações plenárias do mesmo período? Detectar esse padrão exige ler o corpus como história.",
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              style={{
                border: `1px solid ${BORDER}`,
                background: "#fff",
                padding: "14px 16px",
              }}
            >
              <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12.5, color: INK, marginBottom: 6 }}>
                {title}
              </p>
              <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "#f8f7f2",
            border: `1px solid ${BORDER}`,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flexShrink: 0, width: 3, background: SUBTLE, borderRadius: 2, minHeight: 36 }} />
          <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.65, marginBottom: 0 }}>
            <strong style={{ color: INK }}>Nota metodológica:</strong> Este relatório usa linguagem de indício, padrão e suspeita.
            Não afirma crimes, não nomeia culpados, não conclui sobre dolo. A conclusão jurídica
            pertence a advogados. O julgamento moral pertence ao leitor. O Dig Dig fornece as
            evidências documentadas — o julgamento é humano.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function TabRelatorio({
  stats,
  rodada: _rodada,
  crescimento,
  recentAnalyses,
  finStats,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
  crescimento: CrescimentoResponse | null;
  recentAnalyses: AnaliseRecente[] | null;
  finStats: FinanceiroStats | null;
}) {
  const totalDocs = (stats?.total_atos ?? 0)
    + (finStats?.diarias.total ?? 0)
    + (finStats?.passagens.total ?? 0);
  const totalSemTexto = stats?.total_sem_texto ?? 0;
  const totalAuditavel = Math.max(0, totalDocs - totalSemTexto);
  const pct = totalAuditavel > 0
    ? Math.round(((stats?.total_analisados ?? 0) / totalAuditavel) * 100)
    : 0;
  const concluido = pct >= 100;

  const crescimentoMarcos = crescimento?.marcos?.length ? crescimento.marcos : null;
  const marcosFallback: Marco[] = !crescimentoMarcos && stats
    ? Object.entries(stats.por_tipo).map(([tipo, { total: t }]) => ({
        tipo,
        label: TIPO_DISPLAY[tipo] ?? tipo,
        primeiro_dia: "2022-01-01",
        primeiro_dt: "2022-01-01T00:00:00Z",
        total_acumulado: t,
        total_tipo: t,
      }))
    : [];
  const marcosDisplay = crescimentoMarcos ?? marcosFallback;
  const total = crescimento?.total_atual || stats?.total_atos || 0;
  const nTipos = crescimento?.marcos?.length ?? marcosDisplay.length;
  const inicio = crescimento?.inicio ?? null;
  const diasAtivos = inicio
    ? Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000)
    : null;
  const inicioFmt = inicio
    ? new Date(inicio).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const adicionadosDigDig = Math.max(0, total - 400);

  // Score médio das análises recentes
  const recentScores = (recentAnalyses ?? []).filter((a) => a.score_risco != null);
  const scoreRecente =
    recentScores.length > 0
      ? Math.round(
          recentScores.reduce((s, a) => s + (a.score_risco ?? 0), 0) /
            recentScores.length
        )
      : null;

  // Score ponderado total
  const dist = stats?.distribuicao;
  const totalComNivel = dist
    ? dist.verde + dist.amarelo + dist.laranja + dist.vermelho
    : 0;
  const scoreEstimado =
    totalComNivel > 0
      ? Math.round(
          ((dist?.verde ?? 0) * 10 +
            (dist?.amarelo ?? 0) * 40 +
            (dist?.laranja ?? 0) * 70 +
            (dist?.vermelho ?? 0) * 95) /
            totalComNivel
        )
      : null;

  const PARA: React.CSSProperties = { fontSize: 12.5, color: MUTED, lineHeight: 1.75, marginBottom: 12 };
  const DIV = { height: 1, background: BORDER, margin: "28px 0" };
  const ROW_BORDER = "#f0ece4";

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ border: `1px solid ${BORDER}`, background: PAPER, padding: "32px 32px 40px" }}>

        {/* ─── HEADER ─── */}
        <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 20, marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
              Relatório Preliminar · CAU/PR · Abril 2026
            </p>
            <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 22, color: INK, letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 6 }}>
              Pré-Auditoria Integrada
            </p>
            <p style={{ fontSize: 12.5, color: MUTED }}>
              Síntese de {fmt(stats?.total_analisados)} atos analisados por Piper + Bud — antes da fase Zew
            </p>
          </div>
          <div style={{ border: `1px solid ${BORDER}`, padding: "8px 14px", background: "#fff", flexShrink: 0 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Estágio</p>
            <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12, color: INK }}>Piper + Bud completos</p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: "#c2410c", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>Zew → pendente</p>
          </div>
        </div>

        {/* ─── 1: COBERTURA ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>1 — Cobertura da análise</Eyebrow>
          <p style={PARA}>
            Em abril de 2026, o Dig Dig indexou e analisou <strong>{fmt(stats?.total_analisados)}</strong> atos de{" "}
            <strong>{fmt(totalDocs)}</strong> documentos do CAU/PR (atos administrativos + dados financeiros) —{" "}
            <strong>{pct}%</strong> do acervo total identificado.{" "}
            {!concluido
              ? "A análise está em andamento; este relatório reflete o estado atual da investigação e será atualizado à medida que a cobertura avança."
              : "A análise está completa. Este relatório reflete o corpus integral."}
          </p>
          {!concluido && <Progress value={pct} className="h-1" style={{ background: PAPER, marginBottom: 14 }} />}
          {stats && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Cobertura por tipo de documento:</p>
              <CoverageByType stats={stats} />
            </div>
          )}
          {stats?.por_categoria_atlas
            && Object.keys(stats.por_categoria_atlas).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
                Categorias detectadas pelo ATLAS (organização automática):
              </p>
              <p style={{ fontSize: 10, color: SUBTLE, marginBottom: 10 }}>
                Subdivide a massa do Portal da Transparência em categorias finais —
                licitações, contratos, balanços, processos éticos etc. — independente
                do tipo do scraper.
              </p>
              <CoverageByAtlas stats={stats} />
            </div>
          )}
          <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, marginTop: 14 }}>
            {fmt(stats?.total_analisados)} analisados · {fmt(totalDocs)} total · {pct}% cobertura
          </p>
        </div>

        <div style={DIV} />

        {/* ─── 2: MAPA DE RISCO ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>2 — Distribuição de alertas e mapa de risco</Eyebrow>
          <p style={PARA}>
            Cada ato analisado recebe uma classificação em quatro níveis — de <em>verde</em> (conforme) a{" "}
            <em>vermelho</em> (irregular). A barra abaixo mostra a proporção atual do corpus. O score
            ponderado total de <strong>{scoreEstimado ?? "—"}/100</strong> indica o nível médio de
            preocupação sobre o acervo. O score das análises mais recentes é{" "}
            <strong>{scoreRecente ?? "—"}/100</strong> — revelando a intensidade dos atos publicados
            nos últimos meses.
          </p>
          {dist && (
            <>
              <div style={{ margin: "16px 0 12px" }}>
                <StackedRiskBar dist={dist} total={totalComNivel} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { nivel: "Verde", n: dist.verde, color: "#15803d", bg: "#f0fdf4", bdr: "#bbf7d0", desc: "Conforme" },
                  { nivel: "Amarelo", n: dist.amarelo, color: "#a16207", bg: "#fefce8", bdr: "#fde68a", desc: "Suspeito" },
                  { nivel: "Laranja", n: dist.laranja, color: "#c2410c", bg: "#fff7ed", bdr: "#fed7aa", desc: "Indício grave" },
                  { nivel: "Vermelho", n: dist.vermelho, color: "#b91c1c", bg: "#fef2f2", bdr: "#fecaca", desc: "Irregular" },
                ].map(({ nivel, n, color, bg, bdr, desc }) => (
                  <div key={nivel} style={{ background: bg, border: `1px solid ${bdr}`, padding: "10px 12px" }}>
                    <p style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 20, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{fmt(n)}</p>
                    <p style={{ fontFamily: MONO, fontSize: 9, color, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{nivel}</p>
                    <p style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                      {totalComNivel > 0 ? ((n / totalComNivel) * 100).toFixed(1) : "0"}% · {desc}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {totalComNivel > 0 && dist && (
            <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE }}>
              {(((dist.laranja + dist.vermelho) / totalComNivel) * 100).toFixed(1)}% com algum nível
              crítico · 136 atos ad referendum (7,6%) · 32 prorrogações de comissões processantes
            </p>
          )}
        </div>

        <div style={DIV} />

        {/* ─── 3: ACERVO ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>3 — Acervo indexado e crescimento</Eyebrow>
          <p style={PARA}>
            O corpus completo reúne <strong>{total > 0 ? fmt(total) : "—"}</strong> documentos de{" "}
            <strong>{nTipos}</strong> categorias distintas, coletados desde <strong>{inicioFmt}</strong>.
            {adicionadosDigDig > 0 && (
              <>{" "}Após o início da operação Dig Dig em 22/04/2026,{" "}
              {fmt(adicionadosDigDig)} novos documentos foram incorporados ao acervo — emitidos
              pelo CAU/PR durante o período de análise.</>
            )}
          </p>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Crescimento do acervo ao longo do tempo:</p>
            <Sparkline pontos={crescimento?.pontos} />
          </div>
          {marcosDisplay.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Composição por tipo de documento:</p>
              <TypeBars marcos={marcosDisplay} total={total} />
            </div>
          )}
          <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, marginTop: 12 }}>
            Coleta iniciada em {inicioFmt} · Dig Dig criado 22/04/2026
            {diasAtivos !== null ? ` · ${diasAtivos} dias em operação` : ""}
          </p>
        </div>

        <div style={DIV} />

        {/* ─── 4: PADRÕES SISTÊMICOS ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>4 — Os quatro padrões sistêmicos</Eyebrow>
          <p style={PARA}>
            A análise cruzada do corpus revela quatro padrões que transcendem gestões individuais e se
            repetem de forma estrutural. Nenhum deles é um desvio isolado — cada um aparece em múltiplos
            atos, múltiplas gestões, múltiplos anos.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { n: "01", title: "Controle presidencial dos mecanismos disciplinares", body: "Presidentes instauraram sindicâncias e PADs por ato unilateral, sem deliberação plenária. Prorrogaram prazos sucessivamente por portaria presidencial. Compuseram comissões exclusivamente com servidores subordinados — em violação ao regimento que exige conselheiros titulares. Mantiveram objeto e investigado em sigilo durante meses ou anos. O padrão transcende gestões: está documentado em pelo menos três presidências consecutivas." },
              { n: "02", title: "Composição direcionada de comissões investigativas", body: "Os mesmos servidores não-eleitos aparecem repetidamente em comissões de natureza sensível. André Casagrande (33 atos), Cleverson Veiga (31) e Leandro Reguelin (31) acumulam funções de investigação sem mandato eletivo e com dependência hierárquica direta da presidência. Reguelin cumpre funções contraditórias: investigador e defensor do investigado no mesmo processo, designado pelo mesmo presidente." },
              { n: "03", title: "Presidência paralela — assinaturas sem amparo formal", body: "Em ao menos quatro portarias, o Vice-Presidente Jeancarlo Versetti assinou atos de natureza presidencial — abertura e prorrogação de processos disciplinares — sem que os atos registrassem o instrumento formal de substituição: afastamento, licença ou delegação documentada. Em processos disciplinares, onde a cadeia de autoridade é elemento central de validade, essa lacuna não é administrativa — é processual." },
              { n: "04", title: "Opacidade como estrutura, não como acidente", body: "Quase todos os processos graves têm em comum: o objeto e o investigado não constam do ato publicado. Processos tramitam por meses com referências apenas a números de SEI, sem que o texto permita identificar quem é investigado por quê. A omissão não é compliance com a LGPD — é o uso da LGPD como escudo retórico para ocultar informações que a lei de transparência exige." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display: "flex", gap: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.08em", flexShrink: 0, paddingTop: 2, width: 20 }}>{n}</div>
                <div>
                  <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 14, color: INK, marginBottom: 8, lineHeight: 1.3 }}>{title}</p>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={DIV} />

        {/* ─── 5: CRONOLOGIA DOS PADs ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>5 — Cronologia dos processos disciplinares secretos</Eyebrow>
          <p style={PARA}>
            Dois processos administrativos disciplinares correm em paralelo dentro do CAU/PR — ambos em
            sigilo total sobre o investigado e o objeto. O PAD-A tramita há 20 meses; o PAD-B, 12 meses.
            Cada portaria abaixo é um ato administrativo público. Clique para consultar o documento original.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #fecaca", background: "#fff5f5", padding: "16px 18px" }}>
              <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12, color: "#b91c1c", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
                PAD-A — 20 meses em sigilo
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid #fecaca", paddingLeft: 14 }}>
                {[
                  { data: "15/08/2024", label: "instauração (Maugham Zaze)", portaria: "522/2024", dot: "#fecaca" },
                  { data: "10/10/2024", label: "prorrogação + defensor nomeado", portaria: "533/2024", dot: "#fca5a5" },
                  { data: "18/11/2025", label: "recondução", portaria: "655/2025", dot: "#fca5a5" },
                  { data: "09/12/2025", label: "prorrogação · 16 meses", portaria: "659/2025", dot: "#f87171" },
                  { data: "12/01/2026", label: "prorrogação · 17 meses", portaria: "664/2026", dot: "#f87171" },
                  { data: "02/02/2026", label: "recondução (Linzmeyer) · 18m", portaria: "667/2026", dot: "#ef4444" },
                  { data: "10/02/2026", label: "prorrogação", portaria: "672/2026", dot: "#ef4444" },
                  { data: "16/03/2026", label: "prorrogação", portaria: "675/2026", dot: "#ef4444" },
                  { data: "02/04/2026", label: "prorrogação · ativo", portaria: "678/2026", dot: "#dc2626" },
                ].map(({ data, label, portaria, dot }) => (
                  <div key={data} style={{ display: "flex", gap: 10, paddingBottom: 8, position: "relative" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4, marginLeft: -18 }} />
                    <div style={{ paddingLeft: 4 }}>
                      <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.06em" }}>{data}</p>
                      <p style={{ fontSize: 11, color: INK, lineHeight: 1.4 }}>
                        <a href="https://www.caupr.gov.br/portarias" target="_blank" rel="noreferrer"
                           style={{ color: "#b91c1c", fontWeight: 600, textDecoration: "underline" }}>
                          Port. {portaria}
                        </a>
                        {" — "}{label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: "1px solid #fed7aa", background: "#fffbf5", padding: "16px 18px" }}>
              <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12, color: "#c2410c", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
                PAD-B — 12 meses em sigilo
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid #fed7aa", paddingLeft: 14 }}>
                {[
                  { data: "07/04/2025", label: "instauração (Linzmeyer)", portaria: "580/2025", dot: "#fed7aa" },
                  { data: "02/02/2026", label: "recondução + alteração · 10 meses", portaria: "667/2026", dot: "#fb923c" },
                  { data: "03/03/2026", label: "substituição de membro + prorrogação", portaria: "673/2026", dot: "#f97316" },
                  { data: "02/04/2026", label: "prorrogação · ativo", portaria: "678/2026", dot: "#ea580c" },
                ].map(({ data, label, portaria, dot }) => (
                  <div key={data} style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4, marginLeft: -18 }} />
                    <div style={{ paddingLeft: 4 }}>
                      <p style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, letterSpacing: "0.06em" }}>{data}</p>
                      <p style={{ fontSize: 11, color: INK, lineHeight: 1.4 }}>
                        <a href="https://www.caupr.gov.br/portarias" target="_blank" rel="noreferrer"
                           style={{ color: "#c2410c", fontWeight: 600, textDecoration: "underline" }}>
                          Port. {portaria}
                        </a>
                        {" — "}{label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "10px 12px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                  <strong>Out/2024:</strong> 4 processos simultâneos — 8 portarias em 3 semanas,
                  2 exonerações e 2 nomeações. Concentração temporal anômala.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={DIV} />

        {/* ─── 6: CINCO CASOS MAIS GRAVES ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>6 — Os cinco casos mais graves · Score de risco</Eyebrow>
          <p style={PARA}>
            Os atos abaixo obtiveram os scores mais elevados na análise combinada Haiku + Sonnet.
            Cada caso está linkado ao documento público original no site do CAU/PR. O score reflete
            densidade de indícios, violações ao regimento e padrões de opacidade — não é uma conclusão
            jurídica.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CASO_VERMELHO.map((c) => (
              <div key={c.id} style={{ background: "#fff", border: "1px solid #fecaca", borderLeft: "3px solid #dc2626", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <a href="https://www.caupr.gov.br/portarias" target="_blank" rel="noreferrer"
                     style={{ display: "inline-flex", alignItems: "center", gap: 4, color: INK, textDecoration: "underline" }}>
                    <span style={{ fontFamily: TIGHT, fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}>{c.id}</span>
                    <ExternalLink size={10} style={{ color: MUTED, flexShrink: 0 }} />
                  </a>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Vermelho · Score {c.score}
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: MUTED, fontStyle: "italic", marginBottom: 6 }}>{c.pattern}</p>
                <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={DIV} />

        {/* ─── 7: REDE DE ATORES ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>7 — Rede de atores · Frequência de aparição nos atos</Eyebrow>
          <p style={PARA}>
            A análise de frequência mapeia quem assina, compõe e recebe designações nos atos analisados.
            Concentração de aparições em funções sensíveis — investigação, disciplina, supervisão — é um
            indicador de captura institucional quando não corresponde a mandato eletivo.
          </p>
          <div style={{ border: `1px solid ${BORDER}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 100px 1fr", gap: "0 12px", padding: "6px 14px", borderBottom: `1px solid ${BORDER}` }}>
              {["Nome", "Atos", "Função", "Padrão de aparição"].map((h) => (
                <p key={h} style={{ fontFamily: MONO, fontSize: 9, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</p>
              ))}
            </div>
            {ATORES.map((a, i) => (
              <div key={a.nome} style={{ display: "grid", gridTemplateColumns: "1fr 52px 100px 1fr", gap: "0 12px", padding: "8px 14px", borderBottom: i < ATORES.length - 1 ? `1px solid ${ROW_BORDER}` : "none", background: a.alerta ? "#fffbf5" : "transparent" }}>
                <p style={{ fontSize: 12, color: a.destaque ? INK : MUTED, fontWeight: a.destaque ? 600 : 400 }}>{a.nome}</p>
                <p style={{ fontFamily: MONO, fontSize: 11, color: a.alerta ? "#c2410c" : INK, fontWeight: 600 }}>{a.apars}</p>
                <p style={{ fontSize: 11, color: MUTED }}>{a.papel}</p>
                <p style={{ fontSize: 11, color: a.alerta ? "#92400e" : MUTED, lineHeight: 1.4 }}>{a.obs}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, marginTop: 8 }}>
            Casagrande, Veiga e Reguelin — servidores não-eleitos com concentração anômala em funções de controle processual
          </p>
        </div>

        <div style={DIV} />

        {/* ─── 8: LACUNAS ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>8 — Lacunas estruturais do corpus</Eyebrow>
          <p style={PARA}>
            O que sabemos é tão importante quanto o que não sabemos. Estas lacunas delimitam o escopo
            desta investigação e definem as próximas frentes de expansão do acervo.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "14 atas plenárias consecutivas ausentes", desc: "Reuniões 112–125 não têm ata publicada no site oficial. Período específico da história institucional do CAU/PR. O que foi deliberado nessas reuniões? Quais portarias subsequentes dependem dessas deliberações?", color: "#b91c1c" },
              { label: "80%+ dos contratos e convênios com PDF inacessível", desc: "Links existem na página mas os PDFs retornam 404. Uma categoria inteira de atos financeiros — compromissos com fornecedores — efetivamente inacessível ao escrutínio público.", color: "#c2410c" },
              { label: "127 portarias pré-2018 fora do corpus", desc: "Portarias 1–127 correspondem ao período fundacional (2012–2018). Não foram incorporadas ao banco. Práticas estabelecidas nesse período estão fora do escopo desta investigação.", color: "#a16207" },
              { label: "Diárias, passagens e folhas de pagamento indisponíveis no portal", desc: "Portal da Transparência exibe apenas meses futuros no buscador. Dados históricos de despesas de viagem e remuneração são inacessíveis ao cidadão.", color: "#a16207" },
            ].map(({ label, desc, color }) => (
              <div key={label} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "#fff", border: `1px solid ${BORDER}` }}>
                <div style={{ width: 3, background: color, flexShrink: 0, borderRadius: 2, minHeight: 40 }} />
                <div>
                  <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12.5, color: INK, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={DIV} />

        {/* ─── NARRATIVA FINAL ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>A história da auditoria — do início ao presente</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={PARA}>
              Em 2022, o CAU/PR publicou sua primeira portaria acessível por extração automática de texto.
              O Dig Dig chegou quatro anos depois — mas percorreu toda a história disponível: 551 portarias
              entre 2022 e 2026, 597 deliberações em HTML, 161 atas plenárias, além de contratos, convênios,
              relatórios de auditoria e pareceres. O scraper precisou rodar em IP brasileiro — o servidor do
              CAU/PR bloqueia data centers americanos com 403. O primeiro obstáculo não foi a falta de
              transparência, mas a infraestrutura da opacidade: 151 portarias sem camada de texto, links 404
              para contratos, e um portal da transparência que exibe só dados futuros.
            </p>
            <p style={PARA}>
              Com {pct}% das portarias analisadas, o que emergiu não foi uma série de desvios isolados.
              Foi um sistema. Os mesmos três servidores não-eleitos aparecem repetidamente nas mesmas funções
              de controle. Os dois processos disciplinares secretos foram instaurados por presidentes
              diferentes, em anos diferentes, com o mesmo método: portaria unilateral, comissão subordinada,
              sigilo do investigado, prorrogação por portaria presidencial. O PAD-A chegou a 20 meses.
              O PAD-B tem 12 meses. Ambos continuam ativos.
            </p>
            <p style={PARA}>
              Em outubro de 2024, o acervo registrou uma anomalia temporal: quatro processos disciplinares
              simultâneos, oito portarias em três semanas, duas exonerações e duas nomeações. Nenhum ato
              publicado nesse período identifica o investigado ou o objeto do processo. O score médio de
              risco das análises recentes é de <strong>{scoreRecente ?? "—"}/100</strong>. Os 14 atos
              classificados como vermelho têm score médio de 89. Essa dispersão não é ruído — é a assinatura
              de uma instituição onde a maioria dos atos é burocracia ordinária e os atos graves se
              concentram em um subconjunto identificável, repetido e documentado.
            </p>
            <p style={{ ...PARA, marginBottom: 0 }}>
              O que o Dig Dig documenta não é uma hipótese. São padrões empíricos extraídos de documentos
              públicos, cruzados automaticamente. A investigação não terminou: as atas plenárias ainda não
              foram cruzadas com as portarias. Há 14 reuniões sem ata publicada. E há um universo de
              contratos cujos PDFs ainda retornam 404. A investigação chegou ao ponto onde pode mostrar
              o que encontrou — e nomear o que ainda falta encontrar.
            </p>
          </div>
        </div>

        <div style={DIV} />

        {/* ─── ONDE VAMOS CHEGAR ─── */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>Onde vamos chegar — a fase Opus 4.7</Eyebrow>
          <p style={PARA}>
            Quando a cobertura atingir 95–100% e as atas plenárias estiverem cruzadas com o banco de
            portarias, o Dig Dig rodará o Opus 4.7 sobre o corpus completo. O que essa fase entrega:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { title: "Cruzamento ata × portaria", desc: "Verificar sistematicamente se portarias emitidas após cada reunião têm amparo na deliberação plenária correspondente. Portaria sem deliberação = ato unilateral." },
              { title: "Grafo de votação e presença", desc: "Quem vota com quem? Quem se ausenta antes de votações sensíveis? Quem acumula abstenções em temas específicos? As atas registram tudo." },
              { title: "Linha do tempo de poder", desc: "Sucessão de presidentes com todas as portarias numeradas e datadas: quando cada gestão começou, quais foram seus primeiros e últimos atos, onde houve ruptura ou continuidade." },
              { title: "Correlação temporal", desc: "Os PADs secretos de 2024–2026 têm correlação com exonerações, nomeações e votações plenárias do mesmo período? Detectar esse padrão exige ler o corpus como história." },
            ].map(({ title, desc }) => (
              <div key={title} style={{ border: `1px solid ${BORDER}`, background: "#fff", padding: "14px 16px" }}>
                <p style={{ fontFamily: TIGHT, fontWeight: 600, fontSize: 12.5, color: INK, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── NOTA METODOLÓGICA ─── */}
        <div style={{ padding: "12px 16px", background: "#f8f7f2", border: `1px solid ${BORDER}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: 3, background: SUBTLE, borderRadius: 2, minHeight: 36 }} />
          <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.65 }}>
            <strong style={{ color: INK }}>Nota metodológica:</strong> Este relatório usa linguagem de
            indício, padrão e suspeita. Não afirma crimes, não nomeia culpados, não conclui sobre dolo.
            A conclusão jurídica pertence a advogados. O julgamento moral pertence ao leitor. O Dig Dig
            fornece as evidências documentadas — o julgamento é humano.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Tab: Pendentes de Extração ──────────────────────────────────────────
const MOTIVO_LABEL: Record<string, { label: string; desc: string; color: string }> = {
  sem_texto: {
    label: "Sem texto",
    desc: "Aguardando OCR ou scraper dedicado",
    color: "#92400e",
  },
  sem_analise: {
    label: "Aguardando IA",
    desc: "Texto extraído — na fila para análise",
    color: "#1d4ed8",
  },
  escaneado_sem_ocr: {
    label: "PDF escaneado",
    desc: "Aguardando OCR (Tesseract)",
    color: "#92400e",
  },
  deliberacao_html: {
    label: "Conteúdo HTML",
    desc: "Aguardando scraper dedicado",
    color: "#1d4ed8",
  },
};

function TabPendentes({ slug }: { slug: string }) {
  const [data, setData] = useState<PainelPendentesResponse | null>(null);
  const [filtroMotivo, setFiltroMotivo] = useState<"" | "sem_texto" | "sem_analise">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPendentes(slug, { motivo: filtroMotivo || undefined, page })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, filtroMotivo, page]);

  // Refresh a cada 15s enquanto há itens pendentes
  useEffect(() => {
    const id = setInterval(() => {
      fetchPendentes(slug, { motivo: filtroMotivo || undefined, page })
        .then(setData)
        .catch(console.error);
    }, 15_000);
    return () => clearInterval(id);
  }, [slug, filtroMotivo, page]);

  const kpis: { label: string; value: number | string; desc: string; motivo: "" | "sem_texto" | "sem_analise" }[] = [
    {
      label: "Sem texto extraído",
      value: data?.total_sem_texto ?? "—",
      desc: "PDFs escaneados + deliberações HTML",
      motivo: "sem_texto",
    },
    {
      label: "Aguardando IA",
      value: data?.total_sem_analise ?? "—",
      desc: "Texto pronto — ainda não analisado",
      motivo: "sem_analise",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Nota de transparência */}
      <div
        className="px-5 py-4 text-[12.5px] leading-relaxed"
        style={{
          border: `1px solid ${BORDER}`,
          background: PAPER,
          color: MUTED,
        }}
      >
        Estes documentos existem no banco mas ainda não têm texto completo extraído —
        por isso não foram analisados pela IA. À medida que a extração avançar (OCR
        para portarias escaneadas, scraper para deliberações), eles saem desta lista
        automaticamente.
      </div>

      {/* KPI cards */}
      <div
        className="grid grid-cols-2 gap-px"
        style={{ background: BORDER, border: `1px solid ${BORDER}` }}
      >
        {kpis.map(({ label, value, desc, motivo: m }) => (
          <button
            key={m}
            onClick={() => {
              setFiltroMotivo(filtroMotivo === m ? "" : m);
              setPage(1);
            }}
            className="bg-white p-5 text-left transition-colors hover:bg-[#faf8f3]"
            style={{
              outline: filtroMotivo === m ? `2px solid ${INK}` : "none",
              outlineOffset: -2,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.24em] mb-2"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              {label}
            </p>
            <p
              className="text-[32px] font-medium mb-1"
              style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.02em" }}
            >
              {value}
            </p>
            <p className="text-[11.5px]" style={{ color: MUTED }}>
              {desc}
            </p>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div>
        {filtroMotivo && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px]" style={{ color: MUTED }}>
              Filtrando:{" "}
              <strong style={{ color: INK }}>
                {filtroMotivo === "sem_texto" ? "Sem texto extraído" : "Aguardando IA"}
              </strong>
            </span>
            <button
              onClick={() => {
                setFiltroMotivo("");
                setPage(1);
              }}
              className="text-[11px] uppercase tracking-wider px-2 py-0.5 transition-colors hover:bg-[#f5f3ee]"
              style={{
                border: `1px solid ${BORDER}`,
                color: MUTED,
                fontFamily: MONO,
                borderRadius: 2,
              }}
            >
              Limpar ×
            </button>
          </div>
        )}

        <div style={{ border: `1px solid ${BORDER}` }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: PAPER }}>
                {["Número", "Tipo", "Motivo", "Ano", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.2em] font-semibold"
                    style={{ color: MUTED, fontFamily: MONO }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[13px]"
                    style={{ color: MUTED }}
                  >
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && (!data || data.atos.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[13px]"
                    style={{ color: MUTED }}
                  >
                    Nenhum documento pendente.
                  </td>
                </tr>
              )}
              {data?.atos.map((ato) => {
                const m = MOTIVO_LABEL[ato.motivo];
                const ano = ato.data_publicacao
                  ? new Date(ato.data_publicacao).getFullYear()
                  : "—";
                return (
                  <tr
                    key={ato.id}
                    className="hover:bg-[#faf8f3] transition-colors"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <td
                      className="px-4 py-3 font-medium whitespace-nowrap"
                      style={{ color: INK, fontFamily: MONO, fontSize: 12.5 }}
                    >
                      {ato.numero}
                    </td>
                    <td
                      className="px-4 py-3 text-[12px] capitalize"
                      style={{ color: MUTED }}
                    >
                      {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                        style={{ color: m?.color ?? MUTED, fontFamily: MONO }}
                      >
                        {m?.label ?? ato.motivo}
                        <span
                          className="font-normal hidden sm:inline"
                          style={{ color: SUBTLE }}
                        >
                          · {m?.desc}
                        </span>
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-[12px] whitespace-nowrap"
                      style={{ color: MUTED, fontFamily: MONO }}
                    >
                      {ano}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {ato.url_pdf && (
                          <a
                            href={ato.url_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="PDF original"
                            className="hover:text-[#0a0a0a] transition-colors"
                            style={{ color: SUBTLE }}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        {!ato.url_pdf && ato.url_original && (
                          <a
                            href={ato.url_original}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Página original"
                            className="hover:text-[#0a0a0a] transition-colors"
                            style={{ color: SUBTLE }}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center gap-3 justify-end mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-wider disabled:opacity-30 hover:bg-[#faf8f3] transition-colors"
              style={{
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: MONO,
                borderRadius: 2,
              }}
            >
              ← Anterior
            </button>
            <span
              className="text-[11px] uppercase tracking-wider"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              {page} / {data.pages}
            </span>
            <button
              disabled={page === data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-wider disabled:opacity-30 hover:bg-[#faf8f3] transition-colors"
              style={{
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: MONO,
                borderRadius: 2,
              }}
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Financeiro (diárias / passagens) ────────────────────────────────
function TabFinanceiro({ slug, tipo }: { slug: string; tipo: "diarias" | "passagens" }) {
  const [data, setData] = useState<FinanceiroResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
    setData(null);
  }, [tipo]);

  useEffect(() => {
    setLoading(true);
    const fn = tipo === "diarias" ? fetchFinanceiroDiarias : fetchFinanceiroPassagens;
    fn(slug, page).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [slug, tipo, page]);

  const cols = tipo === "diarias"
    ? ["Data", "Proc.", "Tipo", "Beneficiário", "Cidade", "Valor"]
    : ["Data", "Proc.", "Cia Aérea", "Passageiro", "Trecho", "Valor"];

  const fmtBRL = (v: number | null) =>
    v == null ? "—" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontFamily: MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {data ? `${data.total.toLocaleString("pt-BR")} registros` : "carregando…"}
        </p>
        {data && data.pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ fontFamily: MONO, fontSize: 10, color: page <= 1 ? SUBTLE : INK, background: "none", border: `1px solid ${BORDER}`, padding: "3px 8px", cursor: page <= 1 ? "default" : "pointer" }}
            >
              ←
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{page}/{data.pages}</span>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontFamily: MONO, fontSize: 10, color: page >= data.pages ? SUBTLE : INK, background: "none", border: `1px solid ${BORDER}`, padding: "3px 8px", cursor: page >= data.pages ? "default" : "pointer" }}
            >
              →
            </button>
          </div>
        )}
      </div>
      <div style={{ border: `1px solid ${BORDER}`, overflowX: "auto" }}>
        {loading || !data ? (
          <div className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>
            {loading ? "Carregando…" : "Nenhum registro."}
          </div>
        ) : (
          <table className="w-full text-[12px]" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: PAPER }}>
                {cols.map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.registros.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid #f1efe8` }} className="hover:bg-[#faf8f3] transition-colors">
                  <td className="px-3 py-2" style={{ color: MUTED, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {r.data ? new Date(r.data).toLocaleDateString("pt-BR") : r.periodo_ref ?? "—"}
                  </td>
                  <td className="px-3 py-2" style={{ color: SUBTLE, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {r.codigo_processo ?? "—"}
                  </td>
                  {tipo === "diarias" ? (
                    <>
                      <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: MUTED }} title={r.tipo ?? undefined}>{r.tipo ?? "—"}</td>
                      <td className="px-3 py-2" style={{ color: INK }}>{r.beneficiario ?? "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{r.cidade ?? "—"}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 max-w-[180px] truncate" style={{ color: MUTED }} title={r.cia ?? undefined}>{r.cia ?? "—"}</td>
                      <td className="px-3 py-2" style={{ color: INK }}>{r.passageiro ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: MUTED }} title={r.trecho ?? undefined}>{r.trecho ?? "—"}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right" style={{ color: INK, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {fmtBRL(r.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Dados (submenu interno) ─────────────────────────────────────────
// ATLAS é o organizador canônico. As 17 categorias substituem os tipos
// do scraper como navegação primária. Tipos antigos (portaria, deliberacao
// etc) ainda existem em Ato.tipo, mas a UI navega por Ato.tipo_atlas.
//
// Ordem reflete volume típico no corpus do CAU/PR — mais frequentes primeiro
// — pra reduzir o atrito de chegar ao que importa.
//
// `grupo: "atlas"` → filtra por tipo_atlas
// `grupo: "especial"` → tab dedicado (Pendentes)
// `grupo: "financeiro"` → fonte de dados separada (Diárias, Passagens)
const DADOS_TIPOS = [
  // Categorias ATLAS — ordenadas por volume típico
  { value: "licitacao",                  label: "Licitações",            grupo: "atlas" },
  { value: "deliberacao_arquivo",        label: "Deliberações",          grupo: "atlas" },
  { value: "portaria_arquivo",           label: "Portarias",             grupo: "atlas" },
  { value: "ata_plenaria",               label: "Atas Plenárias",        grupo: "atlas" },
  { value: "contrato",                   label: "Contratos",             grupo: "atlas" },
  { value: "aditivo_contratual",         label: "Aditivos",              grupo: "atlas" },
  { value: "financeiro_balanco",         label: "Balanços",              grupo: "atlas" },
  { value: "financeiro_orcamento",       label: "Orçamentos",            grupo: "atlas" },
  { value: "financeiro_demonstrativo",   label: "Demonstrativos",        grupo: "atlas" },
  { value: "ata_pauta_comissao",         label: "Atas de Comissão",      grupo: "atlas" },
  { value: "recursos_humanos",           label: "Recursos Humanos",      grupo: "atlas" },
  { value: "auditoria_externa",          label: "Auditorias Externas",   grupo: "atlas" },
  { value: "relatorio_gestao",           label: "Relatórios de Gestão",  grupo: "atlas" },
  { value: "processo_etico",             label: "Processos Éticos",      grupo: "atlas" },
  { value: "juridico_parecer",           label: "Pareceres Jurídicos",   grupo: "atlas" },
  { value: "comunicacao_institucional",  label: "Comunicação",           grupo: "atlas" },
  { value: "outros",                     label: "Outros",                grupo: "atlas" },
  // Especial — atos sem texto extraído (não passaram pelo ATLAS)
  { value: "pendentes",                  label: "Pendentes",             grupo: "especial" },
  // Financeiro — fonte de dados separada
  { value: "diarias",                    label: "Diárias",               grupo: "financeiro" },
  { value: "passagens",                  label: "Passagens Aéreas",      grupo: "financeiro" },
] as const;

function TabDados({ slug }: { slug: string }) {
  const [tipo, setTipo] = useState<string>("ata_plenaria");
  const ACCENT = "#16a34a";

  const tipoAtivo = DADOS_TIPOS.find((t) => t.value === tipo);
  const idxAtivo = DADOS_TIPOS.findIndex((t) => t.value === tipo);

  return (
    <div>
      {/* Cabeçalho do submenu — eyebrow + dataset ativo */}
      <div
        className="mb-3 flex items-end justify-between gap-3 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: SUBTLE,
            }}
          >
            ▮ datasets
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: INK,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
            className="truncate"
          >
            {String(idxAtivo + 1).padStart(2, "0")} · {tipoAtivo?.label}
          </span>
        </div>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9.5,
            color: MUTED,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {DADOS_TIPOS.length} disponíveis
        </span>
      </div>

      {/* Grid principal — categorias ATLAS (organização canônica) */}
      <div className="mb-2">
        <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 6 }}>
          Documentos · organizados pelo ATLAS
        </p>
        <div
          className="grid gap-[1px] mb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            background: BORDER,
            border: `1px solid ${BORDER}`,
          }}
        >
          {DADOS_TIPOS.filter((t) => t.grupo === "atlas").map((t, i) => {
            const ativo = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className="text-left transition-colors"
                style={{
                  fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "10px 12px",
                  background: ativo ? INK : "#fff",
                  color: ativo ? "#fff" : MUTED,
                  fontWeight: ativo ? 600 : 500,
                  cursor: "pointer", border: "none",
                  borderLeft: ativo ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
                onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = PAPER; }}
                onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "#fff"; }}
              >
                <span style={{ fontSize: 9, color: ativo ? ACCENT : SUBTLE, marginRight: 6 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Especial — Pendentes (atos sem texto, fora do ATLAS) */}
        <p style={{ fontFamily: MONO, fontSize: 8.5, color: SUBTLE, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 6 }}>
          Especial
        </p>
        <div
          className="grid gap-[1px] mb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            background: BORDER,
            border: `1px solid ${BORDER}`,
          }}
        >
          {DADOS_TIPOS.filter((t) => t.grupo === "especial").map((t) => {
            const ativo = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className="text-left transition-colors"
                style={{
                  fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "10px 12px",
                  background: ativo ? INK : "#fff",
                  color: ativo ? "#fff" : MUTED,
                  fontWeight: ativo ? 600 : 500,
                  cursor: "pointer", border: "none",
                  borderLeft: ativo ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
                onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = PAPER; }}
                onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "#fff"; }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Grupo financeiro */}
        <p style={{ fontFamily: MONO, fontSize: 8.5, color: "#6366f1", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 6 }}>
          Financeiro
        </p>
        <div
          className="grid gap-[1px] mb-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            background: "#c7d2fe",
            border: `1px solid #c7d2fe`,
          }}
        >
          {DADOS_TIPOS.filter((t) => t.grupo === "financeiro").map((t) => {
            const ativo = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className="text-left transition-colors"
                style={{
                  fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "10px 12px",
                  background: ativo ? "#4338ca" : "#eef2ff",
                  color: ativo ? "#fff" : "#4338ca",
                  fontWeight: ativo ? 600 : 500,
                  cursor: "pointer", border: "none",
                  borderLeft: ativo ? `2px solid #818cf8` : "2px solid transparent",
                }}
                onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = "#e0e7ff"; }}
                onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "#f0fdf4"; }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      {tipo === "pendentes" ? (
        <TabPendentes slug={slug} />
      ) : tipo === "diarias" || tipo === "passagens" ? (
        <TabFinanceiro slug={slug} tipo={tipo} />
      ) : (() => {
        const grupo = DADOS_TIPOS.find((t) => t.value === tipo)?.grupo;
        if (grupo === "atlas") {
          return <TabAtos slug={slug} tipo="" tipoAtlas={tipo} />;
        }
        return <TabAtos slug={slug} tipo={tipo} />;
      })()}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────
function SlugDashboard() {
  const { slug } = Route.useParams();
  const { stats, rodada, atividade, crescimento, finStats } = useOrgao(slug);
  const [recentAnalyses, setRecentAnalyses] = useState<AnaliseRecente[] | null>(null);

  useEffect(() => {
    fetchAnalysesRecentes(slug).then(setRecentAnalyses).catch(() => setRecentAnalyses([]));
  }, [slug]);

  const count24h = atividade ? atividade.length : 0;

  const nomeOrgao =
    slug === "cau-pr" ? "CAU/PR" : slug.toUpperCase().replace("-", "/");

  const isLive = count24h > 0 || rodada?.status === "em_progresso";
  const [feedOpen, setFeedOpen] = useState(false);

  const ACCENT = "#16a34a";
  const TABS = [
    { value: "visao-geral", label: "Visão Geral" },
    { value: "relatorio", label: "Relatório" },
    { value: "denuncias", label: "Denúncias" },
    { value: "pipeline", label: "Pipeline" },
    { value: "dados", label: "Dados" },
  ];

  return (
    <>
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white relative"
        style={{ color: INK }}
      >
        {/* ── IDE-style status bar (top) ──────────────────────── */}
        <div
          className="hidden sm:flex items-center justify-between px-4 md:px-10 h-7 flex-shrink-0"
          style={{
            background: PAPER,
            borderBottom: `1px solid ${BORDER}`,
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: SUBTLE,
            textTransform: "uppercase",
          }}
        >
          <div className="flex items-center gap-3">
            <span>~/escavacao/{slug}</span>
            <span style={{ color: "#d8d5cd" }}>│</span>
            <span>schema · public</span>
            <span style={{ color: "#d8d5cd" }}>│</span>
            <span>tenant · {slug}</span>
          </div>
          <div className="flex items-center gap-3">
            {rodada && (
              <span className="tabular-nums">
                {rodada.atos_analisados_piper}/{rodada.total_atos}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span
                className="h-1 w-1 rounded-full"
                style={{
                  background: isLive ? ACCENT : "#d8d5cd",
                  boxShadow: isLive ? `0 0 6px ${ACCENT}` : undefined,
                }}
              />
              {isLive ? "live" : "idle"}
            </span>
          </div>
        </div>

        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 pb-4 sm:pb-6 relative"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p
                className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-2 flex items-center gap-2"
                style={{ color: SUBTLE, fontFamily: MONO }}
              >
                <span>▮ escavação</span>
                <span style={{ color: "#d8d5cd" }}>›</span>
                <span>auditoria contínua</span>
              </p>
              <h1
                className="text-[24px] sm:text-[34px] font-medium leading-[1.05]"
                style={{
                  color: INK,
                  fontFamily: TIGHT,
                  letterSpacing: "-0.035em",
                }}
              >
                {nomeOrgao}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={"/painel/$slug/conex" as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                params={{ slug } as any}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold px-2.5 py-1.5 hover:bg-[#f0fdf4] transition-colors"
                style={{
                  color: INK,
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  fontFamily: MONO,
                  borderRadius: 2,
                  textDecoration: "none",
                }}
                title="Visualizar rede de relações entre pessoas, atos e tags"
              >
                <span style={{ color: ACCENT }}>◇</span>
                conexões
              </Link>
              {isLive && (
                <span
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold px-2.5 py-1.5"
                  style={{
                    color: ACCENT,
                    background: "#f0fdf4",
                    border: `1px solid ${ACCENT}40`,
                    fontFamily: MONO,
                    borderRadius: 2,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{
                      background: ACCENT,
                      boxShadow: `0 0 8px ${ACCENT}`,
                    }}
                  />
                  pipeline · live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="visao-geral" className="h-full">
            <TabsList
              className="px-4 sm:px-6 md:px-10 pt-0 pb-0 bg-transparent rounded-none h-auto gap-0 w-full justify-start overflow-x-auto flex-nowrap"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {TABS.map((tab, i) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none px-3 sm:px-4 py-3 text-[10.5px] sm:text-[11px] uppercase tracking-[0.2em] data-[state=active]:shadow-none bg-transparent transition-colors whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    color: MUTED,
                    fontFamily: MONO,
                    borderBottom: "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  <span style={{ opacity: 0.5, fontSize: 9 }}>
                    {String(i).padStart(2, "0")}
                  </span>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <style>{`
              [data-state="active"][role="tab"] {
                color: ${INK} !important;
                border-bottom-color: ${ACCENT} !important;
                font-weight: 600;
                background: ${PAPER} !important;
              }
            `}</style>

            <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 pb-24 lg:pb-8">
              <TabsContent value="visao-geral">
                <TabVisaoGeral stats={stats} rodada={rodada} recentCount24h={count24h} recentAnalyses={recentAnalyses} crescimento={crescimento} finStats={finStats} />
              </TabsContent>
              <TabsContent value="dados">
                <TabDados slug={slug} />
              </TabsContent>
              <TabsContent value="denuncias">
                <TabDenuncias slug={slug} />
              </TabsContent>
              <TabsContent value="pipeline">
                <TabPipeline slug={slug} rodada={rodada} initialItems={atividade} />
              </TabsContent>
              <TabsContent value="relatorio">
                <TabRelatorio stats={stats} rodada={rodada} crescimento={crescimento} recentAnalyses={recentAnalyses} finStats={finStats} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Mobile floating activity button */}
        <Sheet open={feedOpen} onOpenChange={setFeedOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Atividade ao vivo"
              className="lg:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3 py-2.5 shadow-lg transition-transform active:scale-95"
              style={{
                background: INK,
                color: "#fff",
                borderRadius: 999,
                fontFamily: MONO,
              }}
            >
              <Activity size={14} />
              <span className="text-[10.5px] uppercase tracking-wider font-semibold">
                Atividade
              </span>
              {isLive && (
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "#4ade80" }}
                />
              )}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="p-0 h-[85vh] rounded-t-2xl overflow-hidden"
          >
            <RealtimeFeed
              slug={slug}
              initialItems={atividade}
              isLive={isLive}
              variant="inline"
            />
          </SheetContent>
        </Sheet>
      </div>

      <RealtimeFeed
        slug={slug}
        initialItems={atividade}
        isLive={isLive}
      />
    </>
  );
}
