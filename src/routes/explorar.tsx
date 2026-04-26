import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { fetchStats, fetchAtos } from "@/lib/api";
import type { PublicStats, AtoPublico, PublicAtosResponse } from "@/lib/api";

export const Route = createFileRoute("/explorar")({
  component: ExplorarPage,
});

// ── Tokens (alinhados ao painel) ──────────────────────────────────────────
const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";
const MONO = "'JetBrains Mono', monospace";
const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

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

const NIVEL_LABEL: Record<string, string> = {
  verde: "verde",
  amarelo: "amarelo",
  laranja: "laranja",
  vermelho: "vermelho",
};

const TIPO_LABEL: Record<string, string> = {
  portaria: "Portaria",
  deliberacao: "Deliberação",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel)
    return (
      <span className="text-[12px]" style={{ color: SUBTLE }}>
        —
      </span>
    );
  const c = NIVEL_BG[nivel] ?? { bg: PAPER, fg: MUTED, border: BORDER };
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
      {NIVEL_LABEL[nivel] ?? nivel}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors"
      style={{
        fontFamily: MONO,
        border: `1px solid ${active ? INK : BORDER}`,
        background: active ? INK : "#ffffff",
        color: active ? "#ffffff" : MUTED,
        borderRadius: 2,
      }}
    >
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </button>
  );
}

function ExplorarPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [data, setData] = useState<PublicAtosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAtos, setLoadingAtos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<string>("");
  const [nivel, setNivel] = useState<string>("");
  const [page, setPage] = useState(1);

  const loadAtos = useCallback(async (t: string, n: string, p: number) => {
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
      /* noop */
    } finally {
      setLoadingAtos(false);
    }
  }, []);

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
      className="min-h-screen"
      style={{
        background: "#ffffff",
        color: INK,
        fontFamily: TIGHT,
        overflowX: "hidden",
      }}
    >
      {/* ── Nav ── */}
      <nav
        className="flex items-center justify-between px-6 md:px-8 py-4"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <Link
          to="/"
          className="text-[13px] tracking-tight"
          style={{ fontFamily: MONO, color: INK }}
        >
          DIG · DIG
        </Link>
        <div className="flex items-center gap-5">
          <Link
            to="/modelos"
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ fontFamily: MONO, color: MUTED }}
          >
            Modelos
          </Link>
          <Link
            to="/apoiar"
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ fontFamily: MONO, color: MUTED }}
          >
            Apoiar
          </Link>
          <Link
            to="/entrar"
            className="text-[11px] uppercase tracking-[0.18em] px-3 py-1.5"
            style={{
              fontFamily: MONO,
              border: `1px solid ${INK}`,
              color: INK,
              borderRadius: 2,
            }}
          >
            Entrar
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Header ── */}
        <header
          className="px-6 md:px-8 py-12 md:py-16"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.28em] mb-4"
            style={{ fontFamily: MONO, color: SUBTLE }}
          >
            Explorar · CAU/PR
          </p>
          <h1
            className="text-[34px] md:text-[44px] leading-[1.05] mb-3 font-medium"
            style={{ letterSpacing: "-0.02em" }}
          >
            Auditoria de atos administrativos
          </h1>
          <p
            className="text-[14px] md:text-[15px] max-w-[640px]"
            style={{ color: MUTED }}
          >
            {stats
              ? `${fmt(stats.total_analisados)} atos analisados pela inteligência do Dig Dig — portarias e deliberações de ${stats.tenant.nome}.`
              : "Carregando…"}
          </p>
        </header>

        {loading ? (
          <div
            className="py-24 text-center text-[12px]"
            style={{ fontFamily: MONO, color: SUBTLE }}
          >
            Carregando…
          </div>
        ) : error ? (
          <div
            className="py-24 text-center text-[12px]"
            style={{ fontFamily: MONO, color: "#b91c1c" }}
          >
            {error}
          </div>
        ) : stats ? (
          <>
            {/* ── KPI grid ── */}
            <section
              className="grid grid-cols-2 md:grid-cols-4"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {(["vermelho", "laranja", "amarelo", "verde"] as const).map(
                (n, i) => {
                  const active = nivel === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setNivelFilter(active ? "" : n)}
                      className="text-left px-6 md:px-8 py-8 md:py-10 transition-colors"
                      style={{
                        borderRight:
                          i < 3 ? `1px solid ${BORDER}` : undefined,
                        borderTop:
                          i >= 2 ? `1px solid ${BORDER}` : undefined,
                        background: active ? PAPER : "#ffffff",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: NIVEL_DOT[n] }}
                        />
                        <span
                          className="text-[10px] uppercase tracking-[0.22em]"
                          style={{ fontFamily: MONO, color: SUBTLE }}
                        >
                          {NIVEL_LABEL[n]}
                        </span>
                      </div>
                      <div
                        className="text-[40px] md:text-[48px] leading-none font-medium tabular-nums"
                        style={{ letterSpacing: "-0.03em" }}
                      >
                        {fmt(stats.distribuicao[n])}
                      </div>
                      <div
                        className="text-[11px] mt-2 tabular-nums"
                        style={{ fontFamily: MONO, color: MUTED }}
                      >
                        {pct(stats.distribuicao[n], total)}% dos analisados
                      </div>
                    </button>
                  );
                }
              )}
            </section>

            {/* ── Cobertura por tipo ── */}
            <section
              className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 px-6 md:px-8 py-12 md:py-16"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.28em] mb-2"
                  style={{ fontFamily: MONO, color: SUBTLE }}
                >
                  § 01 · Cobertura
                </p>
                <h2
                  className="text-[20px] md:text-[22px] font-medium leading-tight"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Documentos coletados e processados
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(["portaria", "deliberacao"] as const).map((t) => {
                  const p = pct(
                    stats.por_tipo[t].analisados,
                    stats.por_tipo[t].total
                  );
                  return (
                    <div
                      key={t}
                      className="p-5"
                      style={{
                        border: `1px solid ${BORDER}`,
                        background: "#ffffff",
                        borderRadius: 2,
                      }}
                    >
                      <div className="flex items-baseline justify-between mb-3">
                        <span
                          className="text-[10px] uppercase tracking-[0.22em]"
                          style={{ fontFamily: MONO, color: SUBTLE }}
                        >
                          {TIPO_LABEL[t]}
                        </span>
                        <span
                          className="text-[11px] tabular-nums"
                          style={{ fontFamily: MONO, color: MUTED }}
                        >
                          {fmt(stats.por_tipo[t].analisados)} /{" "}
                          {fmt(stats.por_tipo[t].total)}
                        </span>
                      </div>
                      <div
                        className="text-[28px] font-medium tabular-nums leading-none mb-3"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {p}%
                      </div>
                      <div
                        className="h-[2px] w-full overflow-hidden"
                        style={{ background: PAPER }}
                      >
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${p}%`, background: INK }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Filtros + Tabela ── */}
            <section
              className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 px-6 md:px-8 py-12 md:py-16"
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.28em] mb-2"
                  style={{ fontFamily: MONO, color: SUBTLE }}
                >
                  § 02 · Atos
                </p>
                <h2
                  className="text-[20px] md:text-[22px] font-medium leading-tight mb-4"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Lista filtrável
                </h2>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: MUTED }}
                >
                  Filtre por tipo de documento ou nível de alerta. Resultados
                  ordenados pelos casos mais críticos primeiro.
                </p>
              </div>

              <div>
                {/* Filtros */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <span
                    className="text-[10px] uppercase tracking-[0.22em] self-center mr-1"
                    style={{ fontFamily: MONO, color: SUBTLE }}
                  >
                    Tipo
                  </span>
                  <FilterChip
                    active={tipo === ""}
                    onClick={() => setTipoFilter("")}
                  >
                    Todos
                  </FilterChip>
                  <FilterChip
                    active={tipo === "portaria"}
                    onClick={() => setTipoFilter("portaria")}
                  >
                    Portaria
                  </FilterChip>
                  <FilterChip
                    active={tipo === "deliberacao"}
                    onClick={() => setTipoFilter("deliberacao")}
                  >
                    Deliberação
                  </FilterChip>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span
                    className="text-[10px] uppercase tracking-[0.22em] self-center mr-1"
                    style={{ fontFamily: MONO, color: SUBTLE }}
                  >
                    Nível
                  </span>
                  <FilterChip
                    active={nivel === ""}
                    onClick={() => setNivelFilter("")}
                  >
                    Todos
                  </FilterChip>
                  {(["vermelho", "laranja", "amarelo", "verde"] as const).map(
                    (n) => (
                      <FilterChip
                        key={n}
                        active={nivel === n}
                        onClick={() => setNivelFilter(n)}
                        dot={NIVEL_DOT[n]}
                      >
                        {NIVEL_LABEL[n]}
                      </FilterChip>
                    )
                  )}
                </div>

                {/* Resultado */}
                {loadingAtos ? (
                  <div
                    className="py-16 text-center text-[12px]"
                    style={{ fontFamily: MONO, color: SUBTLE }}
                  >
                    Buscando…
                  </div>
                ) : data && data.atos.length > 0 ? (
                  <>
                    <div
                      className="text-[11px] mb-3 tabular-nums"
                      style={{ fontFamily: MONO, color: SUBTLE }}
                    >
                      {fmt(data.total)} atos · página {data.page} de{" "}
                      {data.pages}
                    </div>

                    {/* Tabela desktop */}
                    <div
                      className="hidden md:block"
                      style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}
                    >
                      <div
                        className="grid gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.22em]"
                        style={{
                          fontFamily: MONO,
                          color: SUBTLE,
                          background: PAPER,
                          borderBottom: `1px solid ${BORDER}`,
                          gridTemplateColumns: "110px 100px 90px 1fr 110px",
                        }}
                      >
                        <span>Número</span>
                        <span>Tipo</span>
                        <span>Data</span>
                        <span>Ementa</span>
                        <span>Nível</span>
                      </div>
                      {data.atos.map((ato: AtoPublico, idx: number) => (
                        <div
                          key={ato.id}
                          className="grid gap-4 px-4 py-3 items-start"
                          style={{
                            borderBottom:
                              idx < data.atos.length - 1
                                ? `1px solid ${BORDER}`
                                : undefined,
                            gridTemplateColumns: "110px 100px 90px 1fr 110px",
                          }}
                        >
                          <span
                            className="text-[12px] tabular-nums"
                            style={{ fontFamily: MONO, color: INK }}
                          >
                            {ato.numero}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: MUTED, fontFamily: MONO }}
                          >
                            {TIPO_LABEL[ato.tipo] ?? ato.tipo}
                          </span>
                          <span
                            className="text-[11px] tabular-nums"
                            style={{ color: MUTED, fontFamily: MONO }}
                          >
                            {ato.data_publicacao
                              ? new Date(
                                  ato.data_publicacao + "T00:00:00"
                                ).toLocaleDateString("pt-BR")
                              : "—"}
                          </span>
                          <span
                            className="text-[13px] leading-relaxed line-clamp-2"
                            style={{ color: INK }}
                          >
                            {ato.ementa ?? ato.titulo ?? "—"}
                          </span>
                          <NivelBadge nivel={ato.nivel_alerta} />
                        </div>
                      ))}
                    </div>

                    {/* Cards mobile */}
                    <div className="md:hidden flex flex-col gap-3">
                      {data.atos.map((ato: AtoPublico) => (
                        <div
                          key={ato.id}
                          className="p-4"
                          style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: 2,
                            background: "#ffffff",
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="text-[12px] tabular-nums"
                              style={{ fontFamily: MONO }}
                            >
                              {ato.numero}
                            </span>
                            <NivelBadge nivel={ato.nivel_alerta} />
                          </div>
                          <div
                            className="text-[10px] uppercase tracking-[0.18em] mb-2"
                            style={{ fontFamily: MONO, color: SUBTLE }}
                          >
                            {TIPO_LABEL[ato.tipo] ?? ato.tipo}
                            {ato.data_publicacao && (
                              <>
                                {" · "}
                                {new Date(
                                  ato.data_publicacao + "T00:00:00"
                                ).toLocaleDateString("pt-BR")}
                              </>
                            )}
                          </div>
                          <p
                            className="text-[13px] leading-relaxed"
                            style={{ color: INK }}
                          >
                            {ato.ementa ?? ato.titulo ?? "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Paginação */}
                    {data.pages > 1 && (
                      <div className="flex items-center gap-3 pt-6">
                        <button
                          onClick={() => goPage(page - 1)}
                          disabled={page <= 1}
                          className="text-[11px] px-4 py-2 disabled:opacity-30 transition-colors"
                          style={{
                            fontFamily: MONO,
                            border: `1px solid ${BORDER}`,
                            color: INK,
                            borderRadius: 2,
                          }}
                        >
                          ← Anterior
                        </button>
                        <span
                          className="text-[11px] tabular-nums"
                          style={{ fontFamily: MONO, color: SUBTLE }}
                        >
                          {page} / {data.pages}
                        </span>
                        <button
                          onClick={() => goPage(page + 1)}
                          disabled={page >= data.pages}
                          className="text-[11px] px-4 py-2 disabled:opacity-30 transition-colors"
                          style={{
                            fontFamily: MONO,
                            border: `1px solid ${BORDER}`,
                            color: INK,
                            borderRadius: 2,
                          }}
                        >
                          Próximo →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="py-16 text-center text-[12px]"
                    style={{ fontFamily: MONO, color: SUBTLE }}
                  >
                    Nenhum ato encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* Footer */}
        <footer
          className="px-6 md:px-8 py-8 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <span
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ fontFamily: MONO, color: SUBTLE }}
          >
            Dig · Dig — auditoria pública com IA
          </span>
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ fontFamily: MONO, color: MUTED }}
          >
            ← Voltar para a home
          </Link>
        </footer>
      </div>
    </div>
  );
}
