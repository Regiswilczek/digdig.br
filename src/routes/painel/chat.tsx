import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  AlertTriangle,
  Users,
  Download,
  Send,
  Paperclip,
  Mic,
  Zap,
  GitBranch,
  Activity,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SplineEmbed } from "@/components/SplineEmbed";
import {
  fetchAnalysesRecentes,
  fetchStats,
  type AnaliseRecente,
  type PublicStats,
} from "../../lib/api";

const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";
const MONO = "'JetBrains Mono', monospace";

// @ts-ignore
export const Route = createFileRoute("/painel/chat")({
  component: ChatPage,
});

const QUICK_ACTIONS = [
  {
    icon: Search,
    title: "Buscar irregularidades",
    desc: "Padrões suspeitos por tema, pessoa ou período",
  },
  {
    icon: FileText,
    title: "Analisar portaria",
    desc: "Risco e artigos violados neste ato",
  },
  {
    icon: AlertTriangle,
    title: "Ficha de denúncia",
    desc: "Ficha pronta para imprensa ou advocacia",
  },
  {
    icon: Zap,
    title: "Casos críticos",
    desc: "Atos vermelhos e laranjas mais graves",
  },
  {
    icon: GitBranch,
    title: "Grafo de pessoas",
    desc: "Quem aparece com maior frequência em atos suspeitos",
  },
  {
    icon: Download,
    title: "Exportar relatório",
    desc: "Relatório em PDF ou CSV para uso externo",
  },
];

const NIVEL_DOT: Record<string, string> = {
  vermelho: "#dc2626",
  laranja: "#ea580c",
  amarelo: "#ca8a04",
  verde: "#16a34a",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function nivelIcon(nivel: string | null) {
  if (nivel === "vermelho" || nivel === "laranja") return AlertTriangle;
  return FileText;
}

const TIPO_LABEL: Record<string, string> = {
  portaria: "Portaria",
  ata_plenaria: "Ata Plenária",
  portaria_normativa: "Port. Normativa",
  deliberacao: "Deliberação",
};

const SLUG = "cau-pr";

function ActivityPanel({
  isLive,
  count24h,
  stats,
  analyses,
  actSearch,
  setActSearch,
  filteredAnalyses,
}: {
  isLive: boolean;
  count24h: number;
  stats: PublicStats | null;
  analyses: AnaliseRecente[] | null;
  actSearch: string;
  setActSearch: (v: string) => void;
  filteredAnalyses: AnaliseRecente[];
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            Atividade Recente
          </span>
          {isLive && (
            <span
              className="flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5"
              style={{
                color: "#15803d",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 2,
                fontFamily: MONO,
              }}
            >
              <span
                className="h-1 w-1 rounded-full animate-pulse"
                style={{ background: "#16a34a" }}
              />
              Ao vivo
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}
        >
          <Search size={11} style={{ color: SUBTLE }} />
          <input
            value={actSearch}
            onChange={(e) => setActSearch(e.target.value)}
            placeholder="Buscar atividade…"
            className="bg-transparent text-[12px] outline-none flex-1"
            style={{ color: INK }}
          />
        </div>
      </div>

      {/* Stats summary */}
      {stats && !actSearch && (
        <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {count24h > 0 && (
            <div
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div
                className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}
              >
                <Zap size={11} style={{ color: "#15803d" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium leading-snug" style={{ color: INK }}>
                  {count24h} atos analisados
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: MUTED }}>
                  Rodada {SLUG.toUpperCase().replace("-", "/")}
                </p>
              </div>
              <span
                className="text-[9px] flex-shrink-0 mt-0.5 uppercase tracking-wider px-1.5 py-0.5"
                style={{ color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, fontFamily: MONO }}
              >
                Ao vivo
              </span>
            </div>
          )}
          {stats.distribuicao.vermelho > 0 && (
            <div
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div
                className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2 }}
              >
                <AlertTriangle size={11} style={{ color: "#b91c1c" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium leading-snug" style={{ color: INK }}>
                  {stats.distribuicao.vermelho} casos vermelhos
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: MUTED }}>
                  Indício grave de ilegalidade
                </p>
              </div>
            </div>
          )}
          {stats.distribuicao.laranja > 0 && (
            <div className="flex items-start gap-3 px-4 py-3">
              <div
                className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 2 }}
              >
                <Users size={11} style={{ color: "#c2410c" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium leading-snug" style={{ color: INK }}>
                  {stats.distribuicao.laranja} casos laranja
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: MUTED }}>
                  Indício moderado-grave
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {analyses === null && (
          <p className="text-[11px] text-center pt-8" style={{ color: SUBTLE }}>
            Carregando…
          </p>
        )}
        {analyses !== null && filteredAnalyses.length === 0 && (
          <p className="text-[11px] text-center pt-8" style={{ color: SUBTLE }}>
            Nenhuma atividade encontrada.
          </p>
        )}
        {filteredAnalyses.map((item) => {
          const Icon = nivelIcon(item.nivel_alerta);
          const dot = NIVEL_DOT[item.nivel_alerta ?? ""] ?? "#d4d2cd";
          const tipoStr = TIPO_LABEL[item.tipo ?? ""] ?? "Ato";
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[#faf8f3] transition-colors cursor-default"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div
                className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 2 }}
              >
                <Icon size={11} style={{ color: dot }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium leading-snug truncate" style={{ color: INK, fontFamily: MONO }}>
                  {tipoStr} {item.numero ?? "—"}
                </p>
                <p className="text-[10.5px] mt-0.5 capitalize" style={{ color: MUTED }}>
                  {item.nivel_alerta ? `Nível ${item.nivel_alerta}` : tipoStr}
                </p>
              </div>
              <span
                className="text-[9.5px] flex-shrink-0 mt-0.5 uppercase tracking-wider whitespace-nowrap"
                style={{ color: SUBTLE, fontFamily: MONO }}
              >
                {item.criado_em ? timeAgo(item.criado_em) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatPage() {
  const [userName, setUserName] = useState("Usuário");
  const [input, setInput] = useState("");
  const [actSearch, setActSearch] = useState("");
  const [analyses, setAnalyses] = useState<AnaliseRecente[] | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata?.nome as string | undefined;
      const raw = meta ?? session.user.email?.split("@")[0] ?? "Usuário";
      setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));
    });
    fetchAnalysesRecentes(SLUG).then(setAnalyses).catch(() => setAnalyses([]));
    fetchStats(SLUG).then(setStats).catch(console.error);
  }, []);

  function handleCard(title: string) {
    setInput(title + ": ");
    inputRef.current?.focus();
  }

  const count24h = analyses
    ? analyses.filter(
        (a) => a.criado_em && Date.now() - new Date(a.criado_em).getTime() < 86_400_000
      ).length
    : 0;

  const isLive = count24h > 0;

  const filteredAnalyses = analyses
    ? analyses.filter(
        (a) =>
          actSearch === "" ||
          (a.numero ?? "").toLowerCase().includes(actSearch.toLowerCase()) ||
          (a.tipo ?? "").toLowerCase().includes(actSearch.toLowerCase()) ||
          (a.nivel_alerta ?? "").toLowerCase().includes(actSearch.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-1 min-h-0 w-full" style={{ color: INK }}>
      {/* ── Main column ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white min-w-0 relative">
        {/* Mobile live status strip */}
        {isLive && (
          <div
            className="lg:hidden flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0"
            style={{
              background: "#f0fdf4",
              borderBottom: "1px solid #bbf7d0",
              fontFamily: MONO,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "#16a34a" }}
              />
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "#15803d" }}
              >
                Ao vivo · {count24h} atos / 24h
              </span>
            </div>
            <button
              onClick={() => setActivityOpen(true)}
              className="text-[10px] uppercase tracking-wider font-semibold underline"
              style={{ color: "#15803d" }}
            >
              Ver feed
            </button>
          </div>
        )}

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 pt-4 pb-4">
          <div className="flex flex-col items-center w-full max-w-[760px] mx-auto min-h-full justify-center">
            {/* Spline hero */}
            <div className="w-full flex justify-center mb-2">
              <SplineEmbed
                width="100%"
                height={260}
                radius={12}
                className="max-w-[520px]"
              />
            </div>

            {/* Eyebrow */}
            <span
              className="text-[10px] uppercase tracking-[0.32em]"
              style={{
                color: SUBTLE,
                fontFamily: MONO,
              }}
            >
              Dig Dig · Assistente
            </span>

            <h1
              className="mt-3 text-center font-medium tracking-tight"
              style={{
                fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
                fontSize: "clamp(26px, 5.4vw, 42px)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Bem-vindo, {userName}.
            </h1>
            <p
              className="mt-3 text-center max-w-[480px] px-2"
              style={{ color: MUTED, fontSize: 14, lineHeight: 1.55 }}
            >
              Faça perguntas, analise portarias ou gere fichas de denúncia a
              partir dos atos públicos analisados.
            </p>

            {/* Quick actions — 2 cols mobile, denser */}
            <div
              className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-px w-full"
              style={{ background: BORDER, border: `1px solid ${BORDER}` }}
            >
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.title}
                  onClick={() => handleCard(a.title)}
                  className="group flex flex-col gap-2 p-3 sm:p-5 text-left bg-white hover:bg-[#faf8f3] transition-colors active:bg-[#f0ede5] min-h-[110px]"
                >
                  <a.icon
                    size={18}
                    style={{ color: SUBTLE }}
                    className="group-hover:text-[#0a0a0a] transition-colors"
                  />
                  <span className="text-[12.5px] sm:text-[13px] font-medium leading-tight" style={{ color: INK }}>
                    {a.title}
                  </span>
                  <span className="text-[11px] sm:text-[12px] leading-snug" style={{ color: MUTED }}>
                    {a.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input — sticky bottom on mobile, normal on desktop */}
        <div
          className="flex-shrink-0 bg-white px-4 sm:px-6 md:px-10 py-3 sm:py-4"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <div className="w-full max-w-[680px] mx-auto">
            <div
              className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-2.5 sm:py-3 transition-colors focus-within:border-[#0a0a0a]"
              style={{ border: `1px solid ${BORDER}`, borderRadius: 4 }}
            >
              <div className="hidden sm:flex gap-2.5">
                <button
                  className="transition-colors hover:text-[#0a0a0a]"
                  style={{ color: SUBTLE }}
                >
                  <Paperclip size={15} />
                </button>
                <button
                  className="transition-colors hover:text-[#0a0a0a]"
                  style={{ color: SUBTLE }}
                >
                  <Mic size={15} />
                </button>
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre os atos…"
                className="flex-1 bg-transparent text-[14px] outline-none min-w-0"
                style={{ color: INK }}
              />
              <button
                aria-label="Enviar"
                className="px-2.5 sm:px-3 py-2 transition-colors flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium uppercase tracking-wider flex-shrink-0"
                style={{
                  background: input.trim() ? INK : PAPER,
                  color: input.trim() ? "#fff" : SUBTLE,
                  fontFamily: MONO,
                  borderRadius: 2,
                }}
              >
                <Send size={13} />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>
            <p
              className="mt-2 sm:mt-3 text-center text-[9.5px] sm:text-[10.5px] uppercase tracking-[0.2em]"
              style={{
                color: SUBTLE,
                fontFamily: MONO,
              }}
            >
              Sonnet 4.6 · contexto via RAG
            </p>
          </div>
        </div>

        {/* Mobile floating activity button */}
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
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
            <ActivityPanel
              isLive={isLive}
              count24h={count24h}
              stats={stats}
              analyses={analyses}
              actSearch={actSearch}
              setActSearch={setActSearch}
              filteredAnalyses={filteredAnalyses}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Right panel (desktop only) ───────────────────────── */}
      <aside
        className="hidden lg:flex w-[280px] flex-shrink-0 flex-col sticky top-0 h-screen overflow-hidden"
        style={{ borderLeft: `1px solid ${BORDER}` }}
      >
        <ActivityPanel
          isLive={isLive}
          count24h={count24h}
          stats={stats}
          analyses={analyses}
          actSearch={actSearch}
          setActSearch={setActSearch}
          filteredAnalyses={filteredAnalyses}
        />
      </aside>
    </div>
  );
}
