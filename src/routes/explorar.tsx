import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  fetchAtos,
  fetchFinanceiroDiarias,
  fetchFinanceiroPassagens,
} from "@/lib/api";
import type {
  AtoPublico,
  PublicAtosResponse,
  FinanceiroRegistro,
  FinanceiroResponse,
} from "@/lib/api";
import { useOrgao } from "@/lib/orgao-store";

export const Route = createFileRoute("/explorar")({
  component: ExplorarPage,
});

// ── Tokens ────────────────────────────────────────────────────────────────────
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

type ViewMode = "atos" | "diarias" | "passagens";

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtBRL(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function TabBtn({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-[11px] transition-colors"
      style={{
        fontFamily: MONO,
        borderBottom: active ? `2px solid ${INK}` : "2px solid transparent",
        color: active ? INK : SUBTLE,
        background: "transparent",
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
      {count != null && (
        <span
          className="text-[10px] px-1.5 py-0.5 tabular-nums"
          style={{
            background: active ? INK : PAPER,
            color: active ? "#fff" : MUTED,
            borderRadius: 2,
          }}
        >
          {fmt(count)}
        </span>
      )}
    </button>
  );
}

function Pagination({
  page,
  pages,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-3 pt-6">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="text-[11px] px-4 py-2 disabled:opacity-30 transition-colors"
        style={{ fontFamily: MONO, border: `1px solid ${BORDER}`, color: INK, borderRadius: 2 }}
      >
        ← Anterior
      </button>
      <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: SUBTLE }}>
        {page} / {pages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= pages}
        className="text-[11px] px-4 py-2 disabled:opacity-30 transition-colors"
        style={{ fontFamily: MONO, border: `1px solid ${BORDER}`, color: INK, borderRadius: 2 }}
      >
        Próximo →
      </button>
    </div>
  );
}

// ── AtosTable ────────────────────────────────────────────────────────────────
function AtosTable({
  data,
  loading,
  tipo,
  nivel,
  page,
  setTipoFilter,
  setNivelFilter,
  goPage,
}: {
  data: PublicAtosResponse | null;
  loading: boolean;
  tipo: string;
  nivel: string;
  page: number;
  setTipoFilter: (t: string) => void;
  setNivelFilter: (n: string) => void;
  goPage: (p: number) => void;
}) {
  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-[0.22em] self-center mr-1" style={{ fontFamily: MONO, color: SUBTLE }}>
          Tipo
        </span>
        <FilterChip active={tipo === ""} onClick={() => setTipoFilter("")}>Todos</FilterChip>
        <FilterChip active={tipo === "portaria"} onClick={() => setTipoFilter("portaria")}>Portaria</FilterChip>
        <FilterChip active={tipo === "deliberacao"} onClick={() => setTipoFilter("deliberacao")}>Deliberação</FilterChip>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-[10px] uppercase tracking-[0.22em] self-center mr-1" style={{ fontFamily: MONO, color: SUBTLE }}>
          Nível
        </span>
        <FilterChip active={nivel === ""} onClick={() => setNivelFilter("")}>Todos</FilterChip>
        {(["vermelho", "laranja", "amarelo", "verde"] as const).map((n) => (
          <FilterChip key={n} active={nivel === n} onClick={() => setNivelFilter(n)} dot={NIVEL_DOT[n]}>
            {NIVEL_LABEL[n]}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
          Buscando…
        </div>
      ) : data && data.atos.length > 0 ? (
        <>
          <div className="text-[11px] mb-3 tabular-nums" style={{ fontFamily: MONO, color: SUBTLE }}>
            {fmt(data.total)} atos · página {data.page} de {data.pages}
          </div>

          {/* Desktop */}
          <div className="hidden md:block" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
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
                  borderBottom: idx < data.atos.length - 1 ? `1px solid ${BORDER}` : undefined,
                  gridTemplateColumns: "110px 100px 90px 1fr 110px",
                }}
              >
                <span className="text-[12px] tabular-nums" style={{ fontFamily: MONO, color: INK }}>{ato.numero}</span>
                <span className="text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>{TIPO_LABEL[ato.tipo] ?? ato.tipo}</span>
                <span className="text-[11px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
                  {ato.data_publicacao ? new Date(ato.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </span>
                <span className="text-[13px] leading-relaxed line-clamp-2" style={{ color: INK }}>
                  {ato.ementa ?? ato.titulo ?? "—"}
                </span>
                <NivelBadge nivel={ato.nivel_alerta} />
              </div>
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden flex flex-col gap-3">
            {data.atos.map((ato: AtoPublico) => (
              <div key={ato.id} className="p-4" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] tabular-nums" style={{ fontFamily: MONO }}>{ato.numero}</span>
                  <NivelBadge nivel={ato.nivel_alerta} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ fontFamily: MONO, color: SUBTLE }}>
                  {TIPO_LABEL[ato.tipo] ?? ato.tipo}
                  {ato.data_publicacao && <> · {new Date(ato.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR")}</>}
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
                  {ato.ementa ?? ato.titulo ?? "—"}
                </p>
              </div>
            ))}
          </div>

          <Pagination page={page} pages={data.pages} onPrev={() => goPage(page - 1)} onNext={() => goPage(page + 1)} />
        </>
      ) : (
        <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
          Nenhum ato encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  );
}

// ── DiariasTable ─────────────────────────────────────────────────────────────
function DiariasTable({
  data,
  loading,
  page,
  goPage,
}: {
  data: FinanceiroResponse | null;
  loading: boolean;
  page: number;
  goPage: (p: number) => void;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
        Carregando diárias…
      </div>
    );
  }
  if (!data || data.registros.length === 0) {
    return (
      <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
        Nenhuma diária encontrada.
      </div>
    );
  }
  return (
    <>
      <div className="text-[11px] mb-3 tabular-nums" style={{ fontFamily: MONO, color: SUBTLE }}>
        {fmt(data.total)} registros · página {data.page} de {data.pages}
      </div>

      {/* Desktop */}
      <div className="hidden md:block" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
        <div
          className="grid gap-3 px-4 py-3 text-[10px] uppercase tracking-[0.22em]"
          style={{
            fontFamily: MONO,
            color: SUBTLE,
            background: PAPER,
            borderBottom: `1px solid ${BORDER}`,
            gridTemplateColumns: "120px 1fr 120px 120px 100px",
          }}
        >
          <span>Código</span>
          <span>Beneficiário</span>
          <span>Período</span>
          <span>Cidade / Evento</span>
          <span className="text-right">Valor</span>
        </div>
        {data.registros.map((r: FinanceiroRegistro, idx: number) => (
          <div
            key={r.id}
            className="grid gap-3 px-4 py-3 items-start"
            style={{
              borderBottom: idx < data.registros.length - 1 ? `1px solid ${BORDER}` : undefined,
              gridTemplateColumns: "120px 1fr 120px 120px 100px",
            }}
          >
            <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
              {r.codigo_processo ?? "—"}
            </span>
            <span className="text-[13px]" style={{ color: INK }}>
              {r.beneficiario ?? "—"}
            </span>
            <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
              {r.periodo ?? r.periodo_ref ?? "—"}
            </span>
            <span className="text-[12px] line-clamp-1" style={{ color: MUTED }}>
              {r.cidade ?? r.evento ?? "—"}
            </span>
            <span className="text-[12px] tabular-nums text-right" style={{ fontFamily: MONO, color: INK }}>
              {fmtBRL(r.valor)}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        {data.registros.map((r: FinanceiroRegistro) => (
          <div key={r.id} className="p-4" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>{r.codigo_processo ?? "—"}</span>
              <span className="text-[13px] font-medium tabular-nums" style={{ fontFamily: MONO }}>{fmtBRL(r.valor)}</span>
            </div>
            <p className="text-[13px] leading-snug mb-1" style={{ color: INK }}>{r.beneficiario ?? "—"}</p>
            <p className="text-[11px]" style={{ fontFamily: MONO, color: SUBTLE }}>
              {r.periodo ?? r.periodo_ref ?? "—"}{r.cidade ? ` · ${r.cidade}` : ""}{r.evento ? ` · ${r.evento}` : ""}
            </p>
          </div>
        ))}
      </div>

      <Pagination page={page} pages={data.pages} onPrev={() => goPage(page - 1)} onNext={() => goPage(page + 1)} />
    </>
  );
}

// ── PassagensTable ────────────────────────────────────────────────────────────
function PassagensTable({
  data,
  loading,
  page,
  goPage,
}: {
  data: FinanceiroResponse | null;
  loading: boolean;
  page: number;
  goPage: (p: number) => void;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
        Carregando passagens…
      </div>
    );
  }
  if (!data || data.registros.length === 0) {
    return (
      <div className="py-16 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
        Nenhuma passagem encontrada.
      </div>
    );
  }
  return (
    <>
      <div className="text-[11px] mb-3 tabular-nums" style={{ fontFamily: MONO, color: SUBTLE }}>
        {fmt(data.total)} registros · página {data.page} de {data.pages}
      </div>

      {/* Desktop */}
      <div className="hidden md:block" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
        <div
          className="grid gap-3 px-4 py-3 text-[10px] uppercase tracking-[0.22em]"
          style={{
            fontFamily: MONO,
            color: SUBTLE,
            background: PAPER,
            borderBottom: `1px solid ${BORDER}`,
            gridTemplateColumns: "1fr 120px 1fr 90px 100px",
          }}
        >
          <span>Passageiro</span>
          <span>Cia</span>
          <span>Trecho</span>
          <span>Data</span>
          <span className="text-right">Valor</span>
        </div>
        {data.registros.map((r: FinanceiroRegistro, idx: number) => (
          <div
            key={r.id}
            className="grid gap-3 px-4 py-3 items-start"
            style={{
              borderBottom: idx < data.registros.length - 1 ? `1px solid ${BORDER}` : undefined,
              gridTemplateColumns: "1fr 120px 1fr 90px 100px",
            }}
          >
            <span className="text-[13px]" style={{ color: INK }}>{r.passageiro ?? r.beneficiario ?? "—"}</span>
            <span className="text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>{r.cia ?? "—"}</span>
            <span className="text-[12px] line-clamp-1" style={{ color: MUTED }}>{r.trecho ?? "—"}</span>
            <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
              {r.data ? new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
            </span>
            <span className="text-[12px] tabular-nums text-right" style={{ fontFamily: MONO, color: INK }}>
              {fmtBRL(r.valor)}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        {data.registros.map((r: FinanceiroRegistro) => (
          <div key={r.id} className="p-4" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px]" style={{ color: INK }}>{r.passageiro ?? r.beneficiario ?? "—"}</span>
              <span className="text-[13px] font-medium tabular-nums" style={{ fontFamily: MONO }}>{fmtBRL(r.valor)}</span>
            </div>
            <p className="text-[11px]" style={{ fontFamily: MONO, color: SUBTLE }}>
              {r.cia ?? "—"}{r.trecho ? ` · ${r.trecho}` : ""}
              {r.data ? ` · ${new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
            </p>
          </div>
        ))}
      </div>

      <Pagination page={page} pages={data.pages} onPrev={() => goPage(page - 1)} onNext={() => goPage(page + 1)} />
    </>
  );
}

// ── ExplorarPage ──────────────────────────────────────────────────────────────
function ExplorarPage() {
  const { stats, finStats, isLoading: statsLoading } = useOrgao("cau-pr");

  const [view, setView] = useState<ViewMode>("atos");

  // Atos state
  const [atosData, setAtosData] = useState<PublicAtosResponse | null>(null);
  const [loadingAtos, setLoadingAtos] = useState(true);
  const [errorAtos, setErrorAtos] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string>("");
  const [nivel, setNivel] = useState<string>("");
  const [pageAtos, setPageAtos] = useState(1);

  // Diárias state
  const [diariasData, setDiariasData] = useState<FinanceiroResponse | null>(null);
  const [loadingDiarias, setLoadingDiarias] = useState(false);
  const [diariasLoaded, setDiariasLoaded] = useState(false);
  const [pageDiarias, setPageDiarias] = useState(1);

  // Passagens state
  const [passagensData, setPassagensData] = useState<FinanceiroResponse | null>(null);
  const [loadingPassagens, setLoadingPassagens] = useState(false);
  const [passagensLoaded, setPassagensLoaded] = useState(false);
  const [pagePassagens, setPagePassagens] = useState(1);

  const totalDocs =
    (stats?.total_atos ?? 0) +
    (finStats?.diarias.total ?? 0) +
    (finStats?.passagens.total ?? 0);

  // ── Load atos ──
  const loadAtos = useCallback(async (t: string, n: string, p: number) => {
    setLoadingAtos(true);
    try {
      const res = await fetchAtos("cau-pr", {
        tipo: t || undefined,
        nivel: n || undefined,
        page: p,
        limit: 50,
      });
      setAtosData(res);
    } catch {
      // noop
    } finally {
      setLoadingAtos(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const a = await fetchAtos("cau-pr", { page: 1, limit: 50 });
        setAtosData(a);
      } catch {
        setErrorAtos("Não foi possível carregar os atos.");
      } finally {
        setLoadingAtos(false);
      }
    })();
  }, []);

  // ── Load diárias (lazy on first switch) ──
  const loadDiarias = useCallback(async (p: number) => {
    setLoadingDiarias(true);
    try {
      const res = await fetchFinanceiroDiarias("cau-pr", p);
      setDiariasData(res);
    } catch {
      // noop
    } finally {
      setLoadingDiarias(false);
      setDiariasLoaded(true);
    }
  }, []);

  // ── Load passagens (lazy on first switch) ──
  const loadPassagens = useCallback(async (p: number) => {
    setLoadingPassagens(true);
    try {
      const res = await fetchFinanceiroPassagens("cau-pr", p);
      setPassagensData(res);
    } catch {
      // noop
    } finally {
      setLoadingPassagens(false);
      setPassagensLoaded(true);
    }
  }, []);

  function switchView(v: ViewMode) {
    setView(v);
    if (v === "diarias" && !diariasLoaded) loadDiarias(1);
    if (v === "passagens" && !passagensLoaded) loadPassagens(1);
  }

  function setTipoFilter(t: string) { setTipo(t); setPageAtos(1); loadAtos(t, nivel, 1); }
  function setNivelFilter(n: string) { setNivel(n); setPageAtos(1); loadAtos(tipo, n, 1); }
  function goPageAtos(p: number) { setPageAtos(p); loadAtos(tipo, nivel, p); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function goPageDiarias(p: number) { setPageDiarias(p); loadDiarias(p); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function goPagePassagens(p: number) { setPagePassagens(p); loadPassagens(p); window.scrollTo({ top: 0, behavior: "smooth" }); }

  const total = stats ? stats.total_analisados : 0;
  const loading = statsLoading;

  return (
    <div
      className="min-h-screen"
      style={{ background: "#ffffff", color: INK, fontFamily: TIGHT, overflowX: "hidden" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Link to="/" className="text-[13px] tracking-tight" style={{ fontFamily: MONO, color: INK }}>
          DIG · DIG
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/modelos" className="text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: MUTED }}>Modelos</Link>
          <Link to="/apoiar" className="text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: MUTED }}>Apoiar</Link>
          <Link
            to="/entrar"
            className="text-[11px] uppercase tracking-[0.18em] px-3 py-1.5"
            style={{ fontFamily: MONO, border: `1px solid ${INK}`, color: INK, borderRadius: 2 }}
          >
            Entrar
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <header className="px-6 md:px-8 py-12 md:py-16" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <p className="text-[10px] uppercase tracking-[0.28em] mb-4" style={{ fontFamily: MONO, color: SUBTLE }}>
            Explorar · CAU/PR
          </p>
          <h1 className="text-[34px] md:text-[44px] leading-[1.05] mb-3 font-medium" style={{ letterSpacing: "-0.02em" }}>
            Corpus completo
          </h1>
          <p className="text-[14px] md:text-[15px] max-w-[640px]" style={{ color: MUTED }}>
            {stats
              ? `${fmt(totalDocs)} documentos indexados — ${fmt(stats.total_analisados)} atos analisados por IA, ${fmt((finStats?.diarias.total ?? 0) + (finStats?.passagens.total ?? 0))} registros financeiros coletados.`
              : "Carregando…"}
          </p>
        </header>

        {loading ? (
          <div className="py-24 text-center text-[12px]" style={{ fontFamily: MONO, color: SUBTLE }}>
            Carregando…
          </div>
        ) : errorAtos && !stats ? (
          <div className="py-24 text-center text-[12px]" style={{ fontFamily: MONO, color: "#b91c1c" }}>
            {errorAtos}
          </div>
        ) : stats ? (
          <>
            {/* KPI grid */}
            <section
              className="grid grid-cols-2 md:grid-cols-4"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {(["vermelho", "laranja", "amarelo", "verde"] as const).map((n, i) => {
                const active = nivel === n && view === "atos";
                return (
                  <button
                    key={n}
                    onClick={() => { switchView("atos"); setNivelFilter(active ? "" : n); }}
                    className="text-left px-6 md:px-8 py-8 md:py-10 transition-colors"
                    style={{
                      borderRight: i < 3 ? `1px solid ${BORDER}` : undefined,
                      borderTop: i >= 2 ? `1px solid ${BORDER}` : undefined,
                      background: active ? PAPER : "#ffffff",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: NIVEL_DOT[n] }} />
                      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ fontFamily: MONO, color: SUBTLE }}>
                        {NIVEL_LABEL[n]}
                      </span>
                    </div>
                    <div className="text-[40px] md:text-[48px] leading-none font-medium tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                      {fmt(stats.distribuicao[n])}
                    </div>
                    <div className="text-[11px] mt-2 tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
                      {pct(stats.distribuicao[n], total)}% dos analisados
                    </div>
                  </button>
                );
              })}
            </section>

            {/* Cobertura */}
            <section
              className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 px-6 md:px-8 py-12 md:py-16"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] mb-2" style={{ fontFamily: MONO, color: SUBTLE }}>
                  § 01 · Cobertura
                </p>
                <h2 className="text-[20px] md:text-[22px] font-medium leading-tight" style={{ letterSpacing: "-0.01em" }}>
                  Documentos coletados e processados
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["portaria", "deliberacao"] as const).map((t) => {
                  const p = pct(stats.por_tipo[t].analisados, stats.por_tipo[t].total);
                  return (
                    <div key={t} className="p-5" style={{ border: `1px solid ${BORDER}`, background: "#ffffff", borderRadius: 2 }}>
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-[0.22em]" style={{ fontFamily: MONO, color: SUBTLE }}>
                          {TIPO_LABEL[t]}
                        </span>
                        <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
                          {fmt(stats.por_tipo[t].analisados)} / {fmt(stats.por_tipo[t].total)}
                        </span>
                      </div>
                      <div className="text-[28px] font-medium tabular-nums leading-none mb-3" style={{ letterSpacing: "-0.02em" }}>
                        {p}%
                      </div>
                      <div className="h-[2px] w-full overflow-hidden" style={{ background: PAPER }}>
                        <div className="h-full transition-all duration-700" style={{ width: `${p}%`, background: INK }} />
                      </div>
                    </div>
                  );
                })}
                {finStats && (
                  <div className="p-5" style={{ border: `1px solid #c7d2fe`, background: "#eef2ff", borderRadius: 2 }}>
                    <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ fontFamily: MONO, color: "#4338ca" }}>
                      Financeiro
                    </p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.14em] mb-1" style={{ fontFamily: MONO, color: "#6366f1" }}>Diárias</p>
                        <p className="text-[24px] font-medium tabular-nums leading-none" style={{ letterSpacing: "-0.02em", color: "#1e1b4b" }}>
                          {fmt(finStats.diarias.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.14em] mb-1" style={{ fontFamily: MONO, color: "#6366f1" }}>Passagens</p>
                        <p className="text-[24px] font-medium tabular-nums leading-none" style={{ letterSpacing: "-0.02em", color: "#1e1b4b" }}>
                          {fmt(finStats.passagens.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Corpus — tabs */}
            <section className="px-6 md:px-8 py-12 md:py-16">
              <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 mb-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] mb-2" style={{ fontFamily: MONO, color: SUBTLE }}>
                    § 02 · Registros
                  </p>
                  <h2 className="text-[20px] md:text-[22px] font-medium leading-tight" style={{ letterSpacing: "-0.01em" }}>
                    Todos os documentos
                  </h2>
                  <p className="text-[13px] leading-relaxed mt-2" style={{ color: MUTED }}>
                    Atos administrativos analisados por IA e dados financeiros coletados do Implanta.
                  </p>
                </div>
              </div>

              {/* Tab bar */}
              <div
                className="flex gap-1 mb-8 overflow-x-auto"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <TabBtn active={view === "atos"} onClick={() => switchView("atos")} count={stats.total_atos}>
                  Atos
                </TabBtn>
                <TabBtn active={view === "diarias"} onClick={() => switchView("diarias")} count={finStats?.diarias.total ?? null}>
                  Diárias
                </TabBtn>
                <TabBtn active={view === "passagens"} onClick={() => switchView("passagens")} count={finStats?.passagens.total ?? null}>
                  Passagens
                </TabBtn>
              </div>

              {view === "atos" && (
                <AtosTable
                  data={atosData}
                  loading={loadingAtos}
                  tipo={tipo}
                  nivel={nivel}
                  page={pageAtos}
                  setTipoFilter={setTipoFilter}
                  setNivelFilter={setNivelFilter}
                  goPage={goPageAtos}
                />
              )}
              {view === "diarias" && (
                <DiariasTable
                  data={diariasData}
                  loading={loadingDiarias}
                  page={pageDiarias}
                  goPage={goPageDiarias}
                />
              )}
              {view === "passagens" && (
                <PassagensTable
                  data={passagensData}
                  loading={loadingPassagens}
                  page={pagePassagens}
                  goPage={goPagePassagens}
                />
              )}
            </section>
          </>
        ) : null}

        {/* Footer */}
        <footer
          className="px-6 md:px-8 py-8 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ fontFamily: MONO, color: SUBTLE }}>
            Dig · Dig — auditoria pública com IA
          </span>
          <Link to="/" className="text-[10px] uppercase tracking-[0.22em]" style={{ fontFamily: MONO, color: MUTED }}>
            ← Voltar para a home
          </Link>
        </footer>
      </div>
    </div>
  );
}
