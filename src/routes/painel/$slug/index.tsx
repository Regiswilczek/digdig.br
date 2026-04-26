import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  fetchPainelAtos,
  fetchPainelRodada,
  fetchPendentes,
  type PainelAto,
  type PainelRodada,
  type PainelPendente,
  type PainelPendentesResponse,
} from "../../../lib/api-auth";
import { fetchStats, fetchAnalysesRecentes, fetchCrescimento, type PublicStats, type AnaliseRecente, type CrescimentoResponse, type CrescimentoPonto, type Marco } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ExternalLink, FileText, Search, Activity } from "lucide-react";
import { SplineEmbed } from "@/components/SplineEmbed";

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
  numero?: string;
  tipo?: string;
}

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
};

function FeedRow({ item, slug }: { item: FeedItem; slug: string }) {
  const nivel = item.nivel_alerta ?? "";
  const nivelColor = NIVEL_DOT[nivel] ?? "#d4d2cd";
  const nivelStyle = NIVEL_BG[nivel];
  const tipoShort =
    TIPO_SHORT[item.tipo ?? ""] ??
    (item.tipo ? item.tipo.slice(0, 6).toUpperCase() : "—");

  return (
    <Link
      to="/painel/$slug/ato/$id"
      params={{ slug, id: item.ato_id }}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        className="group px-4 py-2.5 transition-colors hover:bg-[#faf8f3]"
        style={{ borderBottom: `1px solid #f1efe8` }}
      >
        {/* Line 1: dot + tipo · número · tempo */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: nivelColor,
              boxShadow: `0 0 0 3px ${nivelColor}1a`,
            }}
          />
          <span
            style={{
              fontSize: 8.5,
              fontFamily: MONO,
              letterSpacing: "0.14em",
              color: "#a8a59c",
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
            style={{
              color: INK,
              fontFamily: MONO,
              letterSpacing: "-0.01em",
            }}
          >
            Nº {item.numero ?? item.ato_id.slice(0, 8) + "…"}
          </p>
          <span
            className="text-[9.5px] whitespace-nowrap flex-shrink-0 tabular-nums"
            style={{ color: "#a8a59c", fontFamily: MONO }}
          >
            {timeAgo(item.criado_em)}
          </span>
        </div>

        {/* Line 2: nível chip + score */}
        <div className="flex items-center gap-2 mt-1.5 pl-[18px]">
          {nivelStyle && (
            <span
              style={{
                fontSize: 9,
                fontFamily: MONO,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: nivelStyle.fg,
                background: nivelStyle.bg,
                padding: "1.5px 6px",
                borderRadius: 3,
                lineHeight: 1.4,
              }}
            >
              {nivel}
            </span>
          )}
          {item.score_risco != null && (
            <span
              style={{
                fontSize: 9.5,
                color: "#a8a59c",
                fontFamily: MONO,
                letterSpacing: "0.04em",
              }}
            >
              score · {item.score_risco}
            </span>
          )}
        </div>
      </div>
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
  initialItems: AnaliseRecente[] | null;
  isLive: boolean;
  variant?: "aside" | "inline";
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  // search removed — feed is read-only
  const loading = initialItems === null;
  const channelId = useRef(`feed-${slug}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (initialItems)
      setItems(
        initialItems.map((i) => ({
          id: i.id,
          ato_id: i.ato_id,
          nivel_alerta: i.nivel_alerta,
          score_risco: i.score_risco,
          criado_em: i.criado_em,
          numero: i.numero ?? undefined,
          tipo: i.tipo ?? undefined,
        })),
      );
  }, [initialItems]);

  useEffect(() => {
    const channel = supabase
      .channel(channelId.current)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        async (payload) => {
          const row = payload.new as FeedItem;
          const { data: ato } = await supabase
            .from("atos")
            .select("numero, tipo")
            .eq("id", row.ato_id)
            .single();
          setItems((prev) => [
            { ...row, numero: ato?.numero, tipo: ato?.tipo },
            ...prev.slice(0, 49),
          ]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug]);

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
      {/* ── Brand-style header ─────────────────────────── */}
      <div
        className="px-5 pt-6 pb-4 flex-shrink-0"
        style={{ borderBottom: `1px solid #f1efe8` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SplineEmbed
              width={36}
              height={36}
              radius={8}
              className="flex-shrink-0"
            />
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.22em] font-semibold leading-none"
                style={{
                  color: INK,
                  fontFamily: MONO,
                }}
              >
                Atividade
              </p>
              <p
                className="text-[9.5px] uppercase tracking-[0.18em] mt-1 leading-none"
                style={{ color: "#a8a59c", fontFamily: MONO }}
              >
                {isLive ? "Pipeline ao vivo" : "Em pausa"}
              </p>
            </div>
          </div>

          <span
            className="text-[10px] tabular-nums px-2 py-1 rounded"
            style={{
              color: MUTED,
              background: PAPER,
              border: `1px solid #f1efe8`,
              fontFamily: MONO,
            }}
          >
            {total}
          </span>
        </div>
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
function StackedRiskBar({ dist, total }: { dist: PublicStats["distribuicao"]; total: number }) {
  const levels = [
    { key: "verde", label: "Verde", count: dist.verde },
    { key: "amarelo", label: "Amarelo", count: dist.amarelo },
    { key: "laranja", label: "Laranja", count: dist.laranja },
    { key: "vermelho", label: "Vermelho", count: dist.vermelho },
  ] as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Barra proporcional */}
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 2,
          overflow: "hidden",
          background: PAPER,
          border: `1px solid ${BORDER}`,
        }}
      >
        {levels.map((l) => (
          <div
            key={l.key}
            style={{
              width: `${total > 0 ? (l.count / total) * 100 : 0}%`,
              background: NIVEL_DOT[l.key],
              minWidth: l.count > 0 ? 3 : 0,
            }}
          />
        ))}
      </div>
      {/* Legenda com números */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {levels.map((l) => {
          const pct = total > 0 ? (l.count / total) * 100 : 0;
          return (
            <div key={l.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: NIVEL_DOT[l.key], flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, textTransform: "capitalize", letterSpacing: "0.04em" }}>
                  {l.label}
                </span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 500, color: INK, fontFamily: TIGHT, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {l.count}
              </p>
              <p style={{ fontSize: 9.5, color: SUBTLE, fontFamily: MONO, marginTop: 2 }}>
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CoverageByType ───────────────────────────────────────────────────────────
const TIPO_NOTES: Record<string, string> = {
  deliberacao: "HTML-only · aguardando scraper dedicado",
  ata_plenaria: "Análise via Sonnet",
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
};

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
  recentAnalyses,
  crescimento,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
  recentCount24h: number;
  recentAnalyses: AnaliseRecente[] | null;
  crescimento: CrescimentoResponse | null;
}) {
  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  const dist = stats?.distribuicao;
  const totalComNivel = dist
    ? dist.verde + dist.amarelo + dist.laranja + dist.vermelho
    : 0;
  const pctAnalisados =
    stats && stats.total_atos > 0
      ? Math.round((stats.total_analisados / stats.total_atos) * 100)
      : 0;
  // Score ponderado: verde=10, amarelo=40, laranja=70, vermelho=95
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

  const totalIndexado = crescimento?.total_atual ?? stats?.total_atos ?? 0;
  const inicio = crescimento?.inicio;
  const diasColeta = inicio
    ? Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000)
    : null;
  const docsPorDia =
    diasColeta && diasColeta > 0 && totalIndexado > 0
      ? (totalIndexado / diasColeta).toFixed(1)
      : null;
  const adicionadosDigDig = Math.max(0, totalIndexado - 400);
  const custoPorDoc =
    rodada && rodada.atos_analisados_haiku > 0
      ? rodada.custo_total_usd / rodada.atos_analisados_haiku
      : null;
  const isLive = recentCount24h > 0 || rodada?.status === "em_progresso";

  const kpis = [
    {
      label: "Documentos indexados",
      value: fmt(totalIndexado),
      sub: crescimento?.marcos ? `${crescimento.marcos.length} tipos de documento` : undefined,
    },
    {
      label: "Cobertura de análise",
      value: stats ? `${pctAnalisados}%` : "—",
      sub: `${fmt(stats?.total_analisados)} de ${fmt(stats?.total_atos)} analisados`,
    },
    {
      label: "Alertas críticos",
      value: fmt(stats?.total_criticos),
      sub:
        totalComNivel > 0 && stats
          ? `${((stats.total_criticos / totalComNivel) * 100).toFixed(1)}% dos analisados`
          : "laranja + vermelho",
    },
    {
      label: "Score médio estimado",
      value: scoreEstimado != null ? String(scoreEstimado) : "—",
      sub: "ponderado por nível · escala 0–100",
    },
    {
      label: "Novos desde Dig Dig",
      value: `+${fmt(adicionadosDigDig)}`,
      sub: "adicionados após 22/04/2026",
    },
    {
      label: docsPorDia ? "Ritmo de coleta" : "Dias de coleta",
      value: docsPorDia ?? (diasColeta != null ? String(diasColeta) : "—"),
      sub: docsPorDia ? "documentos por dia" : `início em ${crescimento?.inicio?.slice(0, 7) ?? "—"}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero KPI grid — 6 cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-3 gap-px"
        style={{ background: BORDER, border: `1px solid ${BORDER}` }}
      >
        {kpis.map((k) => (
          <div key={k.label} className="bg-white p-5">
            <p
              className="text-[10px] uppercase tracking-[0.24em] mb-2"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              {k.label}
            </p>
            <p
              className="text-[28px] font-medium leading-none"
              style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.02em" }}
            >
              {k.value}
            </p>
            {k.sub && (
              <p
                className="text-[10px] mt-1.5 uppercase tracking-wider"
                style={{ color: MUTED, fontFamily: MONO }}
              >
                {k.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline ativo */}
      {rodada && pct !== null && (
        <div className="p-5 space-y-3" style={{ border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {rodada.status === "em_progresso" && (
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "#16a34a" }}
                />
              )}
              <p className="text-[13px]" style={{ color: INK }}>
                {rodada.status === "em_progresso" ? "Pipeline ao vivo" : "Rodada de análise"}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span
                className="text-[11px] uppercase tracking-wider"
                style={{ color: MUTED, fontFamily: MONO }}
              >
                {rodada.atos_analisados_haiku}/{rodada.total_atos} · {pct}%
              </span>
              {custoPorDoc != null && (
                <span className="text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>
                  ${rodada.custo_total_usd.toFixed(2)} total · ${custoPorDoc.toFixed(4)}/doc
                </span>
              )}
            </div>
          </div>
          <Progress value={pct} className="h-1" style={{ background: PAPER }} />
          <p className="text-[10.5px]" style={{ color: SUBTLE, fontFamily: MONO }}>
            Haiku: {rodada.atos_analisados_haiku} · Sonnet: {rodada.atos_analisados_sonnet}
          </p>
        </div>
      )}

      {/* 2-col BI: Distribuição de risco + Cobertura por tipo */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-px"
        style={{ background: BORDER, border: `1px solid ${BORDER}` }}
      >
        {stats && dist && (
          <div className="bg-white p-5 space-y-4">
            <Eyebrow>Distribuição de risco</Eyebrow>
            <StackedRiskBar dist={dist} total={totalComNivel} />
          </div>
        )}
        {stats && (
          <div className="bg-white p-5 space-y-4">
            <Eyebrow>Cobertura por tipo</Eyebrow>
            <CoverageByType stats={stats} />
          </div>
        )}
      </div>

      {/* Volume 24h */}
      <VolumeChart24h items={recentAnalyses ?? []} isLive={isLive} />

      {/* Crescimento cross-panel */}
      {crescimento && (
        <div className="p-5 space-y-4" style={{ border: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <Eyebrow>Crescimento do acervo</Eyebrow>
              <p
                style={{
                  fontSize: 36,
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  color: INK,
                  fontFamily: TIGHT,
                  marginTop: 6,
                }}
              >
                {fmt(totalIndexado)}
              </p>
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                {adicionadosDigDig > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#16a34a",
                        fontFamily: TIGHT,
                        lineHeight: 1,
                      }}
                    >
                      +{fmt(adicionadosDigDig)}
                    </p>
                    <p
                      style={{
                        fontSize: 9.5,
                        color: MUTED,
                        fontFamily: MONO,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginTop: 3,
                      }}
                    >
                      desde Dig Dig
                    </p>
                  </div>
                )}
                {docsPorDia && (
                  <div>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: INK,
                        fontFamily: TIGHT,
                        lineHeight: 1,
                      }}
                    >
                      {docsPorDia}
                    </p>
                    <p
                      style={{
                        fontSize: 9.5,
                        color: MUTED,
                        fontFamily: MONO,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginTop: 3,
                      }}
                    >
                      docs/dia
                    </p>
                  </div>
                )}
                {diasColeta != null && (
                  <div>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: INK,
                        fontFamily: TIGHT,
                        lineHeight: 1,
                      }}
                    >
                      {diasColeta}
                    </p>
                    <p
                      style={{
                        fontSize: 9.5,
                        color: MUTED,
                        fontFamily: MONO,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginTop: 3,
                      }}
                    >
                      dias de coleta
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ flexShrink: 0, paddingTop: 20 }}>
              <Sparkline pontos={crescimento.pontos} />
            </div>
          </div>
          <p style={{ fontSize: 10.5, color: SUBTLE, fontFamily: MONO }}>
            400 portarias pré-existentes · Dig Dig criado 22/04/2026 · +{fmt(adicionadosDigDig)}{" "}
            novos documentos adicionados desde então
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab: Atos table ─────────────────────────────────────────────────────
function TabAtos({
  slug,
  tipo,
}: {
  slug: string;
  tipo: string;
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
      tipo,
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
  }, [slug, tipo, nivel, ano, busca, page]);

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

// ── Tab: Pipeline ───────────────────────────────────────────────────────
function TabPipeline({
  slug,
  rodada,
  initialItems,
}: {
  slug: string;
  rodada: PainelRodada | null;
  initialItems: AnaliseRecente[] | null;
}) {
  const [items, setItems] = useState<
    {
      id: string;
      nivel_alerta: string | null;
      score_risco: number;
      criado_em: string;
    }[]
  >([]);

  useEffect(() => {
    if (initialItems)
      setItems(
        initialItems.map((i) => ({
          id: i.id,
          nivel_alerta: i.nivel_alerta,
          score_risco: i.score_risco ?? 0,
          criado_em: i.criado_em,
        })),
      );
  }, [initialItems]);

  useEffect(() => {
    const channel = supabase
      .channel(`pipeline-feed-${slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        (payload) => {
          const row = payload.new as {
            id: string;
            nivel_alerta: string | null;
            score_risco: number;
            criado_em: string;
          };
          setItems((prev) => [row, ...prev.slice(0, 99)]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  const isActive = !!rodada || items.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: isActive ? "#16a34a" : "#d4d2cd",
              animation: isActive ? "pulse 2s infinite" : undefined,
            }}
          />
          <span className="text-[13px] font-medium" style={{ color: INK }}>
            {rodada
              ? rodada.status === "em_progresso"
                ? "Análise em andamento"
                : "Rodada pendente"
              : items.length > 0
                ? "Análise em andamento (avulsa)"
                : "Nenhuma rodada ativa"}
          </span>
        </div>
        {rodada && (
          <div
            className="flex items-center gap-4 text-[11px] uppercase tracking-wider"
            style={{ color: MUTED, fontFamily: MONO }}
          >
            <span>{rodada.atos_analisados_haiku} analisados</span>
            <span>
              {rodada.total_atos - rodada.atos_analisados_haiku} restantes
            </span>
            <span>${rodada.custo_total_usd.toFixed(2)} gasto</span>
          </div>
        )}
      </div>

      {rodada && pct !== null && (
        <Progress value={pct} className="h-1" style={{ background: PAPER }} />
      )}

      <div style={{ border: `1px solid ${BORDER}` }}>
        {items.length === 0 ? (
          <div
            className="px-4 py-10 text-center text-[13px]"
            style={{ color: MUTED }}
          >
            {initialItems === null ? "Carregando…" : "Nenhuma rodada ativa no momento."}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: PAPER }}>
                {["Horário", "Nível", "Score", ""].map((h) => (
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
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#faf8f3] transition-colors"
                  style={{ borderBottom: `1px solid ${BORDER}` }}
                >
                  <td
                    className="px-4 py-2.5 text-[12px]"
                    style={{ color: MUTED, fontFamily: MONO }}
                  >
                    {new Date(item.criado_em).toLocaleTimeString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <NivelBadge nivel={item.nivel_alerta} />
                  </td>
                  <td
                    className="px-4 py-2.5"
                    style={{ color: MUTED, fontFamily: MONO, fontSize: 12 }}
                  >
                    {item.score_risco}
                  </td>
                  <td
                    className="px-4 py-2.5 text-[10px] uppercase tracking-wider"
                    style={{ color: SUBTLE, fontFamily: MONO }}
                  >
                    {timeAgo(item.criado_em)}
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
  if (!pontos || pontos.length < 2) return <div style={{ width: 200, height: 52 }} />;
  const W = 200, H = 52;
  const P = { t: 4, r: 2, b: 4, l: 2 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const maxV = Math.max(...pontos.map((p) => p.total), 1);
  const t0 = new Date(pontos[0].dia).getTime();
  const t1 = new Date(pontos[pontos.length - 1].dia).getTime();
  const dt = Math.max(t1 - t0, 3600000);
  const tx = (d: string) => P.l + ((new Date(d).getTime() - t0) / dt) * iW;
  const ty = (v: number) => P.t + iH - (Math.min(v, maxV) / maxV) * iH;
  const pts = pontos.map((p) => `${tx(p.dia)},${ty(p.total)}`).join(" ");
  const area = [
    `M${tx(pontos[0].dia)},${P.t + iH}`,
    ...pontos.map((p) => `L${tx(p.dia)},${ty(p.total)}`),
    `L${tx(pontos[pontos.length - 1].dia)},${P.t + iH}Z`,
  ].join(" ");
  const y400 = ty(400);
  const digX = tx(DIGDIG_START);
  const digOk = digX >= P.l && digX <= P.l + iW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="sp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK} stopOpacity={0.14} />
          <stop offset="100%" stopColor={INK} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      {maxV > 500 && (
        <line x1={P.l} y1={y400} x2={P.l + iW} y2={y400}
          stroke="#d97706" strokeWidth={0.7} strokeDasharray="3,2" opacity={0.45} />
      )}
      <path d={area} fill="url(#sp-fill)" />
      <polyline points={pts} fill="none" stroke={INK} strokeWidth={1.5} />
      {digOk && (
        <line x1={digX} y1={P.t} x2={digX} y2={P.t + iH}
          stroke="#d97706" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.5} />
      )}
    </svg>
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

function TabRelatorio({
  stats,
  rodada: _rodada,
  crescimento,
  recentAnalyses,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
  crescimento: CrescimentoResponse | null;
  recentAnalyses: AnaliseRecente[] | null;
}) {
  const pct =
    stats && stats.total_atos > 0
      ? Math.round((stats.total_analisados / stats.total_atos) * 100)
      : 0;
  const concluido = pct >= 100;

  const total = crescimento?.total_atual ?? 0;
  const nTipos = crescimento?.marcos?.length ?? 0;
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

  return (
    <div className="max-w-2xl space-y-6">
      {/* Cobertura da análise */}
      <div className="p-6 space-y-4" style={{ border: `1px solid ${BORDER}` }}>
        <Eyebrow>Cobertura da análise</Eyebrow>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-[40px] font-medium leading-none"
              style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.04em" }}
            >
              {pct}%
            </p>
            <p
              className="text-[11px] uppercase tracking-wider mt-1"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              analisados · {fmt(stats?.total_analisados)} de {fmt(stats?.total_atos)}
            </p>
          </div>
          <p className="text-[12px] text-right max-w-[180px]" style={{ color: MUTED }}>
            {concluido
              ? "Análise completa. Relatório disponível."
              : "Análise em andamento. Relatório publicado quando atingir 100%."}
          </p>
        </div>
        {!concluido && (
          <Progress value={pct} className="h-1" style={{ background: PAPER }} />
        )}
        {/* Cobertura por tipo abaixo da barra */}
        {stats && (
          <div style={{ marginTop: 12 }}>
            <CoverageByType stats={stats} />
          </div>
        )}
      </div>

      {/* Mapa de risco */}
      {stats && dist && (
        <div className="p-6 space-y-4" style={{ border: `1px solid ${BORDER}` }}>
          <div className="flex items-start justify-between gap-4">
            <Eyebrow>Mapa de risco</Eyebrow>
            <div className="flex gap-6 text-right">
              {scoreEstimado != null && (
                <div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: INK,
                      fontFamily: TIGHT,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {scoreEstimado}
                  </p>
                  <p style={{ fontSize: 9, color: MUTED, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    score total
                  </p>
                </div>
              )}
              {scoreRecente != null && (
                <div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: INK,
                      fontFamily: TIGHT,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {scoreRecente}
                  </p>
                  <p style={{ fontSize: 9, color: MUTED, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    score recente
                  </p>
                </div>
              )}
            </div>
          </div>
          <StackedRiskBar dist={dist} total={totalComNivel} />
          {totalComNivel > 0 && (
            <p style={{ fontSize: 10.5, color: SUBTLE, fontFamily: MONO }}>
              {((stats.total_criticos / totalComNivel) * 100).toFixed(1)}% dos documentos analisados têm algum nível crítico (laranja ou vermelho)
            </p>
          )}
        </div>
      )}

      {/* Acervo indexado */}
      <div className="p-6 space-y-5" style={{ border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow>Acervo indexado</Eyebrow>
            <p
              style={{
                fontSize: 40,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                color: INK,
                fontFamily: TIGHT,
                marginTop: 6,
              }}
            >
              {total > 0 ? fmt(total) : "—"}
            </p>
            <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 500, color: INK, fontFamily: TIGHT, lineHeight: 1 }}>
                  {nTipos}
                </p>
                <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  tipos
                </p>
              </div>
              {diasAtivos !== null && (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 500, color: INK, fontFamily: TIGHT, lineHeight: 1 }}>
                    {diasAtivos}
                  </p>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    dias
                  </p>
                </div>
              )}
              {adicionadosDigDig > 0 && (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 500, color: "#16a34a", fontFamily: TIGHT, lineHeight: 1 }}>
                    +{fmt(adicionadosDigDig)}
                  </p>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    pós Dig Dig
                  </p>
                </div>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, paddingTop: 20 }}>
            <Sparkline pontos={crescimento?.pontos} />
          </div>
        </div>

        <p style={{ fontSize: 11, color: MUTED, fontFamily: MONO }}>
          Coleta iniciada em {inicioFmt} · Dig Dig criado 22/04/2026
        </p>

        <div style={{ height: 1, background: BORDER }} />

        <div>
          <p
            style={{
              fontSize: 9,
              fontFamily: MONO,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: MUTED,
              marginBottom: 12,
            }}
          >
            Composição por tipo
          </p>
          <TypeBars marcos={crescimento?.marcos ?? []} total={total} />
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

// ── Tab: Dados (submenu interno) ─────────────────────────────────────────
const DADOS_TIPOS = [
  { value: "ata_plenaria",         label: "Atas Plenárias" },
  { value: "portaria",             label: "Portarias" },
  { value: "deliberacao",          label: "Deliberações" },
  { value: "portaria_normativa",   label: "Port. Normativas" },
  { value: "dispensa_eletronica",  label: "Dispensas Eletr." },
  { value: "relatorio_parecer",    label: "Rel./Parecer" },
  { value: "relatorio_tcu",        label: "Rel. TCU" },
  { value: "contratacao_direta",   label: "Cont. Direta" },
  { value: "auditoria_independente", label: "Auditorias" },
  { value: "contrato",             label: "Contratos" },
  { value: "convenio",             label: "Convênios" },
  { value: "pendentes",            label: "Pendentes" },
] as const;

function TabDados({ slug }: { slug: string }) {
  const [tipo, setTipo] = useState<string>("ata_plenaria");

  return (
    <div>
      {/* Submenu interno */}
      <div
        className="flex overflow-x-auto gap-0 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 mb-6"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        {DADOS_TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className="flex-shrink-0 px-3 sm:px-4 py-2.5 text-[10px] sm:text-[10.5px] uppercase tracking-[0.16em] transition-colors whitespace-nowrap"
            style={{
              fontFamily: MONO,
              color: tipo === t.value ? INK : MUTED,
              fontWeight: tipo === t.value ? 600 : 400,
              marginBottom: "-1px",
              background: "transparent",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: tipo === t.value ? INK : "transparent",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tipo === "pendentes" ? (
        <TabPendentes slug={slug} />
      ) : (
        <TabAtos slug={slug} tipo={tipo} />
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────
function SlugDashboard() {
  const { slug } = Route.useParams();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [rodada, setRodada] = useState<PainelRodada | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<AnaliseRecente[] | null>(null);
  const [crescimento, setCrescimento] = useState<CrescimentoResponse | null>(null);

  useEffect(() => {
    fetchStats(slug).then(setStats).catch(console.error);
    fetchPainelRodada(slug).then(setRodada).catch(console.error);
    fetchAnalysesRecentes(slug)
      .then(setRecentAnalyses)
      .catch(() => setRecentAnalyses([]));
    fetchCrescimento(slug).then(setCrescimento).catch(console.error);

    const interval = setInterval(() => {
      fetchPainelRodada(slug).then(setRodada).catch(console.error);
    }, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  const count24h = recentAnalyses
    ? recentAnalyses.filter(
        (a) => a.criado_em && Date.now() - new Date(a.criado_em).getTime() < 86_400_000
      ).length
    : 0;

  const nomeOrgao =
    slug === "cau-pr" ? "CAU/PR" : slug.toUpperCase().replace("-", "/");

  const isLive = count24h > 0 || rodada?.status === "em_progresso";
  const [feedOpen, setFeedOpen] = useState(false);

  return (
    <>
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white relative"
        style={{ color: INK }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 md:px-10 pt-5 sm:pt-8 pb-4 sm:pb-6"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <p
              className="text-[9.5px] sm:text-[10px] uppercase tracking-[0.32em] font-semibold"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              Escavação
            </p>
            <span style={{ color: SUBTLE }}>·</span>
            <h1
              className="text-[20px] sm:text-[24px] font-medium"
              style={{
                color: INK,
                fontFamily: TIGHT,
                letterSpacing: "-0.02em",
              }}
            >
              {nomeOrgao}
            </h1>
            {isLive && (
              <span
                className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] uppercase tracking-[0.18em] px-2 py-1 sm:ml-2"
                style={{
                  color: "#15803d",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  fontFamily: MONO,
                  borderRadius: 2,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "#16a34a" }}
                />
                Pipeline ao vivo
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="visao-geral" className="h-full">
            <TabsList
              className="px-4 sm:px-6 md:px-10 pt-2 pb-0 bg-transparent rounded-none h-auto gap-0 w-full justify-start overflow-x-auto"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {[
                { value: "visao-geral", label: "Visão Geral" },
                { value: "relatorio", label: "Relatório" },
                { value: "denuncias", label: "Denúncias" },
                { value: "pipeline", label: "Pipeline" },
                { value: "dados", label: "Dados" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none px-3 sm:px-4 py-2.5 sm:py-3 text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] data-[state=active]:shadow-none bg-transparent transition-colors whitespace-nowrap"
                  style={{
                    color: MUTED,
                    fontFamily: MONO,
                    borderBottom: "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <style>{`
              [data-state="active"][role="tab"] {
                color: ${INK} !important;
                border-bottom-color: ${INK} !important;
                font-weight: 600;
              }
            `}</style>

            <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 pb-24 lg:pb-8">
              <TabsContent value="visao-geral">
                <TabVisaoGeral stats={stats} rodada={rodada} recentCount24h={count24h} recentAnalyses={recentAnalyses} crescimento={crescimento} />
              </TabsContent>
              <TabsContent value="dados">
                <TabDados slug={slug} />
              </TabsContent>
              <TabsContent value="denuncias">
                <TabDenuncias slug={slug} />
              </TabsContent>
              <TabsContent value="pipeline">
                <TabPipeline slug={slug} rodada={rodada} initialItems={recentAnalyses} />
              </TabsContent>
              <TabsContent value="relatorio">
                <TabRelatorio stats={stats} rodada={rodada} crescimento={crescimento} recentAnalyses={recentAnalyses} />
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
              initialItems={recentAnalyses}
              isLive={isLive}
              variant="inline"
            />
          </SheetContent>
        </Sheet>
      </div>

      <RealtimeFeed
        slug={slug}
        initialItems={recentAnalyses}
        isLive={isLive}
      />
    </>
  );
}
