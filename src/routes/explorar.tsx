import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { fetchStats, fetchAtos } from "@/lib/api";
import type { PublicStats, AtoPublico, PublicAtosResponse } from "@/lib/api";

export const Route = createFileRoute("/explorar")({
  component: ExplorarPage,
});

// ── constants ─────────────────────────────────────────────────────────────────

const SYNE: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties = { fontFamily: "'Space Mono', 'Courier New', monospace" };

const NIVEL_LABEL: Record<string, string> = {
  verde: "VERDE",
  amarelo: "AMARELO",
  laranja: "LARANJA",
  vermelho: "VERMELHO",
};

const NIVEL_COLOR: Record<string, string> = {
  verde: "#22c55e",
  amarelo: "#eab308",
  laranja: "#f97316",
  vermelho: "#ef4444",
};

const TIPO_LABEL: Record<string, string> = {
  portaria: "PORTARIA",
  deliberacao: "DELIBERAÇÃO",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40" style={MONO}>
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-white/60" style={MONO}>
          {fmt(value)} <span className="text-white/25">({p}%)</span>
        </span>
      </div>
      <div className="h-[3px] w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: color }}
        />
      </div>
    </div>
  );
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-white/20 text-[10px]" style={MONO}>—</span>;
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-[3px] rounded-sm"
      style={{
        ...MONO,
        color: NIVEL_COLOR[nivel] ?? "#fff",
        background: `${NIVEL_COLOR[nivel] ?? "#fff"}18`,
        border: `1px solid ${NIVEL_COLOR[nivel] ?? "#fff"}30`,
      }}
    >
      {NIVEL_LABEL[nivel] ?? nivel}
    </span>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[9px] uppercase tracking-[0.14em] px-3 py-1.5 border transition-all duration-150"
      style={{
        ...MONO,
        borderColor: active ? (color ?? "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.08)",
        color: active ? (color ?? "rgba(255,255,255,0.9)") : "rgba(255,255,255,0.35)",
        background: active ? `${color ?? "rgba(255,255,255,0.12)"}15` : "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

function ExplorarPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [data, setData] = useState<PublicAtosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAtos, setLoadingAtos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<string>("");
  const [nivel, setNivel] = useState<string>("");
  const [page, setPage] = useState(1);

  const loadAtos = useCallback(
    async (t: string, n: string, p: number) => {
      setLoadingAtos(true);
      try {
        const res = await fetchAtos("cau-pr", {
          tipo: t || undefined,
          nivel: n || undefined,
          page: p,
          limit: 50,
        });
        setData(res);
      } catch {
        /* silently ignore — stats already loaded */
      } finally {
        setLoadingAtos(false);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([
          fetchStats("cau-pr"),
          fetchAtos("cau-pr", { page: 1, limit: 50 }),
        ]);
        setStats(s);
        setData(a);
      } catch {
        setError("Não foi possível carregar os dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setTipoFilter(t: string) {
    setTipo(t);
    setPage(1);
    loadAtos(t, nivel, 1);
  }

  function setNivelFilter(n: string) {
    setNivel(n);
    setPage(1);
    loadAtos(tipo, n, 1);
  }

  function goPage(p: number) {
    setPage(p);
    loadAtos(tipo, nivel, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const total = stats ? stats.total_analisados : 0;

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Nav ── */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", maxWidth: "1100px", margin: "0 auto" }}
      >
        <Link to="/" style={SYNE} className="text-white text-sm tracking-[-0.01em]">
          DIG DIG
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/apoiar" className="text-[11px] text-white/40 hover:text-white/70 transition-colors" style={MONO}>
            APOIAR
          </Link>
          <Link
            to="/entrar"
            className="text-[11px] border border-white/15 px-3 py-1.5 text-white/60 hover:text-white hover:border-white/30 transition-all"
            style={MONO}
          >
            ENTRAR
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        {/* ── Header ── */}
        <div className="pt-10 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] uppercase tracking-[0.28em] text-white/25 mb-3" style={MONO}>
            CAU/PR · Conselho de Arquitetura e Urbanismo do Paraná
          </p>
          <h1
            className="text-[1.9rem] font-bold leading-tight mb-1"
            style={{ ...SYNE, letterSpacing: "-0.02em" }}
          >
            Auditoria de Atos Administrativos
          </h1>
          <p className="text-[13px] text-white/40">
            {stats
              ? `${fmt(stats.total_analisados)} atos analisados pelo Dig Dig — portarias e deliberações de ${stats.tenant.nome}`
              : "Carregando..."}
          </p>
        </div>

        {/* ── Stats ── */}
        {loading ? (
          <div className="py-12 text-white/25 text-[12px] text-center" style={MONO}>
            CARREGANDO...
          </div>
        ) : error ? (
          <div className="py-12 text-red-400 text-[12px] text-center" style={MONO}>
            {error}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["vermelho", "laranja", "amarelo", "verde"] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setNivelFilter(nivel === n ? "" : n)}
                  className="border p-4 text-left transition-all duration-150 hover:border-white/20"
                  style={{
                    borderColor: nivel === n ? NIVEL_COLOR[n] : "rgba(255,255,255,0.07)",
                    background: nivel === n ? `${NIVEL_COLOR[n]}10` : "transparent",
                  }}
                >
                  <div
                    className="text-[2rem] font-bold tabular-nums leading-none mb-1"
                    style={{ ...SYNE, color: NIVEL_COLOR[n] }}
                  >
                    {fmt(stats.distribuicao[n])}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-white/35" style={MONO}>
                    {NIVEL_LABEL[n]}
                  </div>
                  <div className="text-[9px] text-white/20 mt-0.5" style={MONO}>
                    {pct(stats.distribuicao[n], total)}% dos analisados
                  </div>
                </button>
              ))}
            </div>

            {/* Barras por tipo */}
            <div className="py-6 border-b grid md:grid-cols-2 gap-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["portaria", "deliberacao"] as const).map((t) => (
                <div key={t} className="flex flex-col gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-1" style={MONO}>
                    {TIPO_LABEL[t]} — {fmt(stats.por_tipo[t].analisados)}/{fmt(stats.por_tipo[t].total)}
                  </p>
                  <div className="h-[3px] w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct(stats.por_tipo[t].analisados, stats.por_tipo[t].total)}%`,
                        background: "rgba(255,255,255,0.35)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filtros ── */}
            <div className="py-5 flex flex-wrap gap-2 items-center border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 mr-1" style={MONO}>TIPO:</span>
              <FilterBtn active={tipo === ""} onClick={() => setTipoFilter("")}>Todos</FilterBtn>
              <FilterBtn active={tipo === "portaria"} onClick={() => setTipoFilter("portaria")}>Portaria</FilterBtn>
              <FilterBtn active={tipo === "deliberacao"} onClick={() => setTipoFilter("deliberacao")}>Deliberação</FilterBtn>

              <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 ml-4 mr-1" style={MONO}>NÍVEL:</span>
              <FilterBtn active={nivel === ""} onClick={() => setNivelFilter("")}>Todos</FilterBtn>
              {(["vermelho", "laranja", "amarelo", "verde"] as const).map((n) => (
                <FilterBtn
                  key={n}
                  active={nivel === n}
                  onClick={() => setNivelFilter(n)}
                  color={NIVEL_COLOR[n]}
                >
                  {NIVEL_LABEL[n]}
                </FilterBtn>
              ))}
            </div>

            {/* ── Tabela ── */}
            <div className="pb-16">
              {loadingAtos ? (
                <div className="py-12 text-white/25 text-[11px] text-center" style={MONO}>
                  BUSCANDO...
                </div>
              ) : data && data.atos.length > 0 ? (
                <>
                  <div className="text-[9px] text-white/25 py-3" style={MONO}>
                    {fmt(data.total)} atos · página {data.page} de {data.pages}
                  </div>

                  <div className="flex flex-col">
                    {/* header */}
                    <div
                      className="grid gap-3 py-2 border-b text-[8px] uppercase tracking-[0.18em] text-white/25"
                      style={{
                        ...MONO,
                        borderColor: "rgba(255,255,255,0.06)",
                        gridTemplateColumns: "100px 80px 80px 1fr 90px",
                      }}
                    >
                      <span>Número</span>
                      <span>Tipo</span>
                      <span>Data</span>
                      <span>Ementa</span>
                      <span>Nível</span>
                    </div>

                    {data.atos.map((ato: AtoPublico) => (
                      <div
                        key={ato.id}
                        className="grid gap-3 py-3 border-b items-start"
                        style={{
                          borderColor: "rgba(255,255,255,0.04)",
                          gridTemplateColumns: "100px 80px 80px 1fr 90px",
                        }}
                      >
                        <span className="text-[11px] text-white/70 font-medium tabular-nums" style={MONO}>
                          {ato.numero}
                        </span>
                        <span className="text-[9px] text-white/35 uppercase tracking-[0.1em]" style={MONO}>
                          {TIPO_LABEL[ato.tipo] ?? ato.tipo}
                        </span>
                        <span className="text-[10px] text-white/35 tabular-nums" style={MONO}>
                          {ato.data_publicacao
                            ? new Date(ato.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        <span className="text-[11px] text-white/55 leading-relaxed line-clamp-2">
                          {ato.ementa ?? ato.titulo ?? "—"}
                        </span>
                        <NivelBadge nivel={ato.nivel_alerta} />
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {data.pages > 1 && (
                    <div className="flex items-center gap-2 pt-6">
                      <button
                        onClick={() => goPage(page - 1)}
                        disabled={page <= 1}
                        className="text-[9px] uppercase tracking-[0.14em] px-3 py-1.5 border border-white/10 text-white/30 disabled:opacity-30 hover:border-white/25 transition-all"
                        style={MONO}
                      >
                        ← anterior
                      </button>
                      <span className="text-[9px] text-white/25 px-2" style={MONO}>
                        {page} / {data.pages}
                      </span>
                      <button
                        onClick={() => goPage(page + 1)}
                        disabled={page >= data.pages}
                        className="text-[9px] uppercase tracking-[0.14em] px-3 py-1.5 border border-white/10 text-white/30 disabled:opacity-30 hover:border-white/25 transition-all"
                        style={MONO}
                      >
                        próximo →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-white/25 text-[11px] text-center" style={MONO}>
                  Nenhum ato encontrado com os filtros selecionados.
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
