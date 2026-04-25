import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  fetchPainelAtos,
  fetchPainelRodada,
  type PainelAto,
  type PainelRodada,
} from "../../lib/api-auth";
import { fetchStats, type PublicStats } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Search } from "lucide-react";

export const Route = createFileRoute("/painel/$slug")({
  component: SlugDashboard,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "bg-red-500/20 text-red-400 border-red-500/30",
  laranja: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  amarelo: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verde: "bg-green-500/20 text-green-400 border-green-500/30",
};

const NIVEL_DOT: Record<string, string> = {
  vermelho: "🔴",
  laranja: "🟠",
  amarelo: "🟡",
  verde: "🟢",
};

function fmt(n: number | undefined | null, fallback = "…"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-white/30 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border font-medium capitalize ${NIVEL_COLOR[nivel] ?? "bg-white/10 text-white/60"}`}
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

// ── Right panel Realtime feed ─────────────────────────────────────────────────

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
        }
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
    <aside className="w-[280px] flex-shrink-0 border-l border-white/[0.06] flex flex-col bg-[#09090f]">
      <div className="px-4 pt-5 pb-3 border-b border-white/[0.06]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium mb-3">
          Atividade Recente
        </p>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atividade..."
            className="pl-7 h-7 text-[12px] bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-[12px] text-white/30 px-2 py-4 text-center">
            {items.length === 0
              ? "Aguardando inserções..."
              : "Sem resultados."}
          </p>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-[14px] mt-0.5">
              {NIVEL_DOT[item.nivel_alerta ?? ""] ?? "⚪"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/70 font-medium truncate">
                {item.ato_id}
              </p>
              <p className="text-[10px] text-white/30 capitalize">
                {item.nivel_alerta ?? "sem análise"}
              </p>
            </div>
            <span className="text-[10px] text-white/25 whitespace-nowrap">
              {timeAgo(item.criado_em)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Documentos coletados", value: fmt(stats?.total_atos) },
          { label: "Analisados", value: fmt(stats?.total_analisados) },
          { label: "Casos críticos", value: fmt(stats?.total_criticos) },
          { label: "Custo de acesso", value: "R$ 0" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
          >
            <p className="text-[11px] text-white/40 uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {rodada && pct !== null ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-white/60">
              {rodada.status === "em_progresso" ? "🟢 AO VIVO — " : ""}
              Documentos em análise
            </p>
            <span className="text-[12px] text-white/40">
              {rodada.atos_analisados_haiku} / {rodada.total_atos} — {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-2 bg-white/10" />
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-[13px] text-white/40">
            Nenhuma rodada de análise ativa no momento.
          </p>
        </div>
      )}

      {stats && (
        <div className="flex gap-6 flex-wrap">
          {(
            [
              ["verde", stats.distribuicao.verde],
              ["amarelo", stats.distribuicao.amarelo],
              ["laranja", stats.distribuicao.laranja],
              ["vermelho", stats.distribuicao.vermelho],
            ] as [string, number][]
          ).map(([nivel, count]) => (
            <div key={nivel} className="flex items-center gap-2">
              <span className="text-[15px]">{NIVEL_DOT[nivel]}</span>
              <span className="text-[13px] text-white/70 capitalize">{nivel}</span>
              <span className="text-[13px] font-semibold text-white">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Atos table ───────────────────────────────────────────────────────────

function TabAtos({ slug, tipo }: { slug: string; tipo: "portaria" | "deliberacao" }) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={nivel}
          onChange={(e) => { setNivel(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-white/70 focus:outline-none focus:border-white/30"
        >
          <option value="">Todos os níveis</option>
          {["verde", "amarelo", "laranja", "vermelho"].map((n) => (
            <option key={n} value={n} className="bg-[#09090f] capitalize">
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={ano}
          onChange={(e) => { setAno(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-white/70 focus:outline-none focus:border-white/30"
        >
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a} className="bg-[#09090f]">{a}</option>
          ))}
        </select>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            placeholder="Número ou ementa..."
            className="pl-7 h-8 w-52 text-[12px] bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
          />
        </div>
        <span className="text-[11px] text-white/30 ml-auto">
          {fmt(total)} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["Número", "Ementa", "Nível", "Score", "Data", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-[13px]">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && atos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-[13px]">
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {atos.map((ato) => (
              <tr
                key={ato.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-4 py-2.5 text-white/80 font-medium whitespace-nowrap">
                  <Link
                    to={"/painel/$slug/ato/$id" as any}
                    params={{ slug, id: ato.id } as any}
                    className="hover:text-white transition-colors"
                  >
                    {ato.numero}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-white/55 max-w-[280px]">
                  <Link
                    to={"/painel/$slug/ato/$id" as any}
                    params={{ slug, id: ato.id } as any}
                    className="hover:text-white/80 transition-colors"
                  >
                    {ato.ementa
                      ? ato.ementa.slice(0, 80) + (ato.ementa.length > 80 ? "…" : "")
                      : "—"}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <NivelBadge nivel={ato.nivel_alerta} />
                </td>
                <td className="px-4 py-2.5 text-white/50">{ato.score_risco}</td>
                <td className="px-4 py-2.5 text-white/40 whitespace-nowrap">
                  {ato.data_publicacao
                    ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {ato.url_pdf && (
                      <a
                        href={ato.url_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="PDF original"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/30 hover:text-white/70 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <Link
                      to={"/painel/$slug/ato/$id" as any}
                      params={{ slug, id: ato.id } as any}
                      title="Ver ficha"
                      className="text-white/30 hover:text-white/70 transition-colors"
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
        <div className="flex items-center gap-2 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg text-[12px] bg-white/[0.04] border border-white/10 text-white/50 disabled:opacity-30 hover:text-white transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-[12px] text-white/40">{page} / {pages}</span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg text-[12px] bg-white/[0.04] border border-white/10 text-white/50 disabled:opacity-30 hover:text-white transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Denúncias ────────────────────────────────────────────────────────────

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
            (a) => a.nivel_alerta === "vermelho" || a.nivel_alerta === "laranja"
          )
        )
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, filtro]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["todos", "vermelho", "laranja"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition-colors border ${
              filtro === f
                ? "bg-white/10 border-white/20 text-white"
                : "bg-transparent border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            {f === "todos" ? "Todos críticos" : f}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-[13px] text-white/30 py-8 text-center">Carregando...</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {atos.map((ato) => (
          <div
            key={ato.id}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>{NIVEL_DOT[ato.nivel_alerta ?? ""] ?? "⚪"}</span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    ato.nivel_alerta === "vermelho" ? "text-red-400" : "text-orange-400"
                  }`}
                >
                  {(ato.nivel_alerta ?? "").toUpperCase()} · Score {ato.score_risco}
                </span>
              </div>
              <span className="text-[12px] text-white/50 whitespace-nowrap">
                {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"} {ato.numero}
              </span>
            </div>

            {ato.resumo_executivo && (
              <p className="text-[13px] text-white/65 leading-relaxed">
                {ato.resumo_executivo.slice(0, 200)}
                {ato.resumo_executivo.length > 200 ? "…" : ""}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                to={"/painel/$slug/ato/$id" as any}
                params={{ slug, id: ato.id } as any}
                className="px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Ver ficha completa
              </Link>
              {ato.url_pdf && (
                <a
                  href={ato.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-[12px] bg-transparent border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  PDF original →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Pipeline ─────────────────────────────────────────────────────────────

function TabPipeline({ slug, rodada }: { slug: string; rodada: PainelRodada | null }) {
  const [items, setItems] = useState<
    { id: string; nivel_alerta: string | null; score_risco: number; criado_em: string }[]
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
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${rodada ? "bg-green-400 animate-pulse" : "bg-white/20"}`}
          />
          <span className="text-[13px] text-white/70 font-medium">
            {rodada ? "AO VIVO — " : ""}
            {rodada?.status === "em_progresso"
              ? "Análise em andamento"
              : "Nenhuma rodada ativa"}
          </span>
        </div>
        {rodada && (
          <div className="flex items-center gap-4 text-[12px] text-white/40">
            <span>{rodada.atos_analisados_haiku} analisados</span>
            <span>{rodada.total_atos - rodada.atos_analisados_haiku} restantes</span>
            <span>~${rodada.custo_total_usd.toFixed(2)} gasto</span>
          </div>
        )}
      </div>

      {rodada && pct !== null && (
        <Progress value={pct} className="h-1.5 bg-white/10" />
      )}

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-white/30">
            {rodada ? "Aguardando próximas análises..." : "Nenhuma rodada ativa no momento."}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {["Horário", "Nível", "Score", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium"
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
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2 text-white/40 font-mono text-[12px]">
                    {new Date(item.criado_em).toLocaleTimeString("pt-BR")}
                  </td>
                  <td className="px-4 py-2">
                    <NivelBadge nivel={item.nivel_alerta} />
                  </td>
                  <td className="px-4 py-2 text-white/50">{item.score_risco}</td>
                  <td className="px-4 py-2 text-[10px] text-white/25">
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

// ── Tab: Relatório Final ──────────────────────────────────────────────────────

function TabRelatorio({ stats, rodada }: { stats: PublicStats | null; rodada: PainelRodada | null }) {
  const pct =
    stats && stats.total_atos > 0
      ? Math.round((stats.total_analisados / stats.total_atos) * 100)
      : 0;
  const concluido = pct >= 100;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Relatório Final — CAU/PR 2020–2026
            </h2>
            <p className="text-[12px] text-white/40">
              {concluido
                ? "Publicado — disponível para todos os planos"
                : "Disponível quando 100% dos documentos forem analisados"}
            </p>
          </div>
        </div>
        {!concluido && (
          <>
            <Progress value={pct} className="h-2 bg-white/10" />
            <p className="text-[12px] text-white/40">
              {fmt(stats?.total_analisados)} / {fmt(stats?.total_atos)} documentos analisados ({pct}% concluído)
            </p>
            <p className="text-[13px] text-white/50">
              Todos os planos terão acesso quando publicado.
            </p>
          </>
        )}
        {concluido && (
          <p className="text-[13px] text-white/70">
            O relatório completo está disponível.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-white">{nomeOrgao}</h1>
            {rodada?.status === "em_progresso" && (
              <span className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Pipeline ao vivo
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="visao-geral" className="h-full">
            <TabsList className="px-6 pt-3 pb-0 bg-transparent border-b border-white/[0.06] rounded-none h-auto gap-0 w-full justify-start">
              {[
                { value: "visao-geral", label: "Visão Geral" },
                { value: "portarias", label: "Portarias" },
                { value: "deliberacoes", label: "Deliberações" },
                { value: "denuncias", label: "Denúncias" },
                { value: "pipeline", label: "Pipeline" },
                { value: "relatorio", label: "Relatório Final" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none px-4 py-3 text-[12px] uppercase tracking-[0.12em] text-white/40 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white bg-transparent hover:text-white/70 transition-colors"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="px-6 py-5">
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
