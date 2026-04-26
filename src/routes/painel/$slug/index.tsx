import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  fetchPainelAtos,
  fetchPainelRodada,
  type PainelAto,
  type PainelRodada,
} from "../../../lib/api-auth";
import { fetchStats, type PublicStats } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Search } from "lucide-react";

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
  criado_em: string;
}

function RealtimeFeed({ slug }: { slug: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const channel = supabase
      .channel(`feed-${slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        (payload) => {
          const row = payload.new as FeedItem;
          setItems((prev) => [row, ...prev.slice(0, 49)]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const filtered = busca
    ? items.filter((i) => i.ato_id.includes(busca))
    : items;

  return (
    <aside
      className="hidden lg:flex w-[300px] flex-shrink-0 flex-col bg-white"
      style={{ borderLeft: `1px solid ${BORDER}` }}
    >
      <div
        className="px-5 pt-6 pb-4"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <Eyebrow>Atividade Recente</Eyebrow>
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}
        >
          <Search size={11} style={{ color: SUBTLE }} />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="border-0 bg-transparent h-6 p-0 text-[12px] focus-visible:ring-0"
            style={{ color: INK }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 && (
          <p
            className="text-[12px] px-2 py-6 text-center"
            style={{ color: SUBTLE }}
          >
            {items.length === 0
              ? "Aguardando inserções…"
              : "Sem resultados."}
          </p>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#faf8f3] transition-colors"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{
                background:
                  NIVEL_DOT[item.nivel_alerta ?? ""] ?? "#d4d2cd",
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-[12px] truncate font-medium"
                style={{ color: INK, fontFamily: MONO }}
              >
                {item.ato_id.slice(0, 8)}…
              </p>
              <p
                className="text-[11px] capitalize"
                style={{ color: MUTED }}
              >
                {item.nivel_alerta ?? "sem análise"}
              </p>
            </div>
            <span
              className="text-[10px] whitespace-nowrap uppercase tracking-wider"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              {timeAgo(item.criado_em)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Tab: Visão Geral ────────────────────────────────────────────────────
function TabVisaoGeral({
  stats,
  rodada,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
}) {
  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  const cards = [
    { label: "Documentos", value: fmt(stats?.total_atos) },
    { label: "Analisados", value: fmt(stats?.total_analisados) },
    { label: "Críticos", value: fmt(stats?.total_criticos) },
    { label: "Custo de acesso", value: "R$ 0" },
  ];

  return (
    <div className="space-y-10">
      {/* KPI grid */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-px"
        style={{ background: BORDER, border: `1px solid ${BORDER}` }}
      >
        {cards.map(({ label, value }) => (
          <div key={label} className="bg-white p-5">
            <p
              className="text-[10px] uppercase tracking-[0.24em] mb-2"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              {label}
            </p>
            <p
              className="text-[32px] font-medium"
              style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.02em" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline progress */}
      {rodada && pct !== null ? (
        <div
          className="p-5 space-y-3"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rodada.status === "em_progresso" && (
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "#16a34a" }}
                />
              )}
              <p className="text-[13px]" style={{ color: INK }}>
                {rodada.status === "em_progresso"
                  ? "Análise ao vivo"
                  : "Documentos em análise"}
              </p>
            </div>
            <span
              className="text-[11px] uppercase tracking-wider"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              {rodada.atos_analisados_haiku} / {rodada.total_atos} · {pct}%
            </span>
          </div>
          <Progress
            value={pct}
            className="h-1"
            style={{ background: PAPER }}
          />
        </div>
      ) : (
        <div
          className="p-5"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <p className="text-[13px]" style={{ color: MUTED }}>
            Nenhuma rodada de análise ativa no momento.
          </p>
        </div>
      )}

      {/* Distribuição */}
      {stats && (
        <div>
          <Eyebrow>Distribuição por nível</Eyebrow>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: BORDER, border: `1px solid ${BORDER}` }}>
            {(
              [
                ["verde", stats.distribuicao.verde],
                ["amarelo", stats.distribuicao.amarelo],
                ["laranja", stats.distribuicao.laranja],
                ["vermelho", stats.distribuicao.vermelho],
              ] as [string, number][]
            ).map(([nivel, count]) => (
              <div key={nivel} className="bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: NIVEL_DOT[nivel] }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] capitalize"
                    style={{ color: MUTED, fontFamily: MONO }}
                  >
                    {nivel}
                  </span>
                </div>
                <p
                  className="text-[24px] font-medium"
                  style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.02em" }}
                >
                  {count}
                </p>
              </div>
            ))}
          </div>
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
  tipo: "portaria" | "deliberacao";
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
          className="relative flex items-center gap-2 px-3 h-8"
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
            className="bg-transparent text-[12px] outline-none w-52"
            style={{ color: INK }}
          />
        </div>
        <span
          className="text-[10.5px] ml-auto uppercase tracking-wider"
          style={{ color: SUBTLE, fontFamily: MONO }}
        >
          {fmt(total)} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${BORDER}` }}>
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
                    {ato.ementa
                      ? ato.ementa.slice(0, 80) +
                        (ato.ementa.length > 80 ? "…" : "")
                      : "—"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <NivelBadge nivel={ato.nivel_alerta} />
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: MUTED, fontFamily: MONO, fontSize: 12 }}
                >
                  {ato.score_risco}
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
}: {
  slug: string;
  rodada: PainelRodada | null;
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: rodada ? "#16a34a" : "#d4d2cd",
              animation: rodada ? "pulse 2s infinite" : undefined,
            }}
          />
          <span className="text-[13px] font-medium" style={{ color: INK }}>
            {rodada
              ? rodada.status === "em_progresso"
                ? "Análise em andamento"
                : "Rodada pendente"
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
            {rodada
              ? "Aguardando próximas análises…"
              : "Nenhuma rodada ativa no momento."}
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
function TabRelatorio({
  stats,
  rodada: _rodada,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
}) {
  const pct =
    stats && stats.total_atos > 0
      ? Math.round((stats.total_analisados / stats.total_atos) * 100)
      : 0;
  const concluido = pct >= 100;

  return (
    <div className="max-w-2xl space-y-6">
      <div
        className="p-8 space-y-5"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <Eyebrow>Relatório oficial</Eyebrow>
        <h2
          className="text-[28px] font-medium"
          style={{
            color: INK,
            fontFamily: TIGHT,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          CAU/PR · 2020–2026
        </h2>
        <p className="text-[13.5px]" style={{ color: MUTED }}>
          {concluido
            ? "Publicado — disponível para todos os planos."
            : "Disponível quando 100% dos documentos forem analisados."}
        </p>
        {!concluido && (
          <>
            <Progress
              value={pct}
              className="h-1"
              style={{ background: PAPER }}
            />
            <p
              className="text-[11px] uppercase tracking-wider"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              {fmt(stats?.total_analisados)} / {fmt(stats?.total_atos)} ·{" "}
              {pct}%
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────
function SlugDashboard() {
  const { slug } = Route.useParams();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [rodada, setRodada] = useState<PainelRodada | null>(null);

  useEffect(() => {
    fetchStats(slug).then(setStats).catch(console.error);
    fetchPainelRodada(slug).then(setRodada).catch(console.error);

    const interval = setInterval(() => {
      fetchPainelRodada(slug).then(setRodada).catch(console.error);
    }, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  const nomeOrgao =
    slug === "cau-pr" ? "CAU/PR" : slug.toUpperCase().replace("-", "/");

  return (
    <>
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white"
        style={{ color: INK }}
      >
        {/* Header */}
        <div
          className="px-6 md:px-10 pt-8 pb-6"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <p
              className="text-[10px] uppercase tracking-[0.32em] font-semibold"
              style={{ color: SUBTLE, fontFamily: MONO }}
            >
              Escavação
            </p>
            <span style={{ color: SUBTLE }}>·</span>
            <h1
              className="text-[24px] font-medium"
              style={{
                color: INK,
                fontFamily: TIGHT,
                letterSpacing: "-0.02em",
              }}
            >
              {nomeOrgao}
            </h1>
            {rodada?.status === "em_progresso" && (
              <span
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-1 ml-2"
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
              className="px-6 md:px-10 pt-2 pb-0 bg-transparent rounded-none h-auto gap-0 w-full justify-start overflow-x-auto"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {[
                { value: "visao-geral", label: "Visão Geral" },
                { value: "portarias", label: "Portarias" },
                { value: "deliberacoes", label: "Deliberações" },
                { value: "denuncias", label: "Denúncias" },
                { value: "pipeline", label: "Pipeline" },
                { value: "relatorio", label: "Relatório" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none px-4 py-3 text-[11px] uppercase tracking-[0.18em] data-[state=active]:shadow-none bg-transparent transition-colors whitespace-nowrap"
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

            <div className="px-6 md:px-10 py-8">
              <TabsContent value="visao-geral">
                <TabVisaoGeral stats={stats} rodada={rodada} />
              </TabsContent>
              <TabsContent value="portarias">
                <TabAtos slug={slug} tipo="portaria" />
              </TabsContent>
              <TabsContent value="deliberacoes">
                <TabAtos slug={slug} tipo="deliberacao" />
              </TabsContent>
              <TabsContent value="denuncias">
                <TabDenuncias slug={slug} />
              </TabsContent>
              <TabsContent value="pipeline">
                <TabPipeline slug={slug} rodada={rodada} />
              </TabsContent>
              <TabsContent value="relatorio">
                <TabRelatorio stats={stats} rodada={rodada} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <RealtimeFeed slug={slug} />
    </>
  );
}
