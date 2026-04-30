import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search,
  FileText,
  AlertTriangle,
  Download,
  Send,
  Zap,
  GitBranch,
  Activity,
  Plus,
  Trash2,
  ArrowDownToLine,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SplineEmbed } from "@/components/SplineEmbed";
import { type AtividadeItem, type PublicStats } from "../../lib/api";
import { useOrgao } from "../../lib/orgao-store";
import { fetchAuthed } from "../../lib/api-auth";

const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";
const MONO = "'JetBrains Mono', monospace";
const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

// @ts-ignore
export const Route = createFileRoute("/painel/chat")({
  component: ChatPage,
});

const QUICK_ACTIONS = [
  { icon: Search,        title: "Buscar irregularidades",  desc: "Padrões suspeitos por tema, pessoa ou período" },
  { icon: FileText,      title: "Analisar portaria",        desc: "Risco e artigos violados neste ato" },
  { icon: AlertTriangle, title: "Ficha de denúncia",        desc: "Ficha pronta para imprensa ou advocacia" },
  { icon: Zap,           title: "Casos críticos",           desc: "Atos vermelhos e laranjas mais graves" },
  { icon: GitBranch,     title: "Grafo de pessoas",         desc: "Quem aparece com maior frequência em atos suspeitos" },
  { icon: Download,      title: "Exportar relatório",       desc: "Relatório em PDF ou CSV para uso externo" },
];

const NIVEL_DOT: Record<string, string> = {
  vermelho: "#dc2626", laranja: "#ea580c", amarelo: "#ca8a04", verde: "#16a34a",
  entrando: "#6366f1",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function atividadeIcon(item: AtividadeItem) {
  if (item.status === "entrando") return ArrowDownToLine;
  if (item.nivel_alerta === "vermelho" || item.nivel_alerta === "laranja") return AlertTriangle;
  return FileText;
}

function atividadeDot(item: AtividadeItem): string {
  if (item.status === "entrando") return "#6366f1";
  return NIVEL_DOT[item.nivel_alerta ?? ""] ?? "#d4d2cd";
}

function atividadeBg(item: AtividadeItem): string {
  if (item.status === "entrando") return "#eef2ff";
  return PAPER;
}

function atividadeLabel(item: AtividadeItem): string {
  if (item.status === "entrando") return "Entrando no sistema";
  if (item.nivel_alerta) return `Nível ${item.nivel_alerta}`;
  return TIPO_LABEL[item.tipo ?? ""] ?? "Ato";
}

const TIPO_LABEL: Record<string, string> = {
  portaria: "Portaria", ata_plenaria: "Ata Plenária",
  portaria_normativa: "Port. Normativa", deliberacao: "Deliberação",
  media_library: "Transparência", pdf: "PDF", docx: "Documento",
};

const SLUG = "cau-pr";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  conteudo: string;
  id?: string;
}

interface Sessao {
  id: string;
  titulo: string | null;
  total_mensagens: number;
  ultima_msg_em: string | null;
}

// ─── Activity Panel ──────────────────────────────────────────────────────────

function ActivityPanel({
  isLive, count24h, stats, atividade, actSearch, setActSearch,
  sessoes, sessaoAtual, onSelectSessao, onNovaSessao, onDeletarSessao,
}: {
  isLive: boolean; count24h: number; stats: PublicStats | null;
  atividade: AtividadeItem[] | null; actSearch: string;
  setActSearch: (v: string) => void;
  sessoes: Sessao[]; sessaoAtual: string | null;
  onSelectSessao: (id: string) => void;
  onNovaSessao: () => void;
  onDeletarSessao: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.28em] font-semibold" style={{ color: SUBTLE, fontFamily: MONO }}>
            Conversas
          </span>
          <button
            onClick={onNovaSessao}
            className="flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 hover:bg-[#f0fdf4] transition-colors"
            style={{ color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 2, fontFamily: MONO }}
          >
            <Plus size={9} /> Nova
          </button>
        </div>

        {/* Sessões recentes */}
        {sessoes.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {sessoes.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer transition-colors ${sessaoAtual === s.id ? "bg-[#f0fdf4]" : "hover:bg-[#faf8f3]"}`}
                style={{ borderRadius: 2, border: sessaoAtual === s.id ? "1px solid #bbf7d0" : "1px solid transparent" }}
                onClick={() => onSelectSessao(s.id)}
              >
                <span className="text-[11px] truncate flex-1" style={{ color: INK }}>
                  {s.titulo || "Nova conversa"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeletarSessao(s.id); }}
                  className="opacity-30 hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Trash2 size={10} style={{ color: MUTED }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Activity search */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
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

      {/* Stats */}
      {stats && !actSearch && (
        <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {count24h > 0 && (
            <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}>
                <Zap size={11} style={{ color: "#15803d" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium" style={{ color: INK }}>{count24h} atos analisados</p>
                <p className="text-[10.5px] mt-0.5" style={{ color: MUTED }}>Rodada {SLUG.toUpperCase().replace("-", "/")}</p>
              </div>
            </div>
          )}
          {stats.distribuicao.vermelho > 0 && (
            <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2 }}>
                <AlertTriangle size={11} style={{ color: "#b91c1c" }} />
              </div>
              <div>
                <p className="text-[12px] font-medium" style={{ color: INK }}>{stats.distribuicao.vermelho} casos vermelhos</p>
                <p className="text-[10.5px] mt-0.5" style={{ color: MUTED }}>Indício grave de ilegalidade</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: SUBTLE, fontFamily: MONO }}>
            Atividade Recente
          </p>
          {isLive && (
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#16a34a", fontFamily: MONO }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
              ao vivo
            </span>
          )}
        </div>
        {atividade === null && (
          <p className="text-[11px] text-center pt-4" style={{ color: SUBTLE }}>Carregando…</p>
        )}
        {(atividade ?? [])
          .filter((item) =>
            actSearch === "" ||
            (item.numero ?? "").toLowerCase().includes(actSearch.toLowerCase()) ||
            (item.tipo ?? "").toLowerCase().includes(actSearch.toLowerCase()) ||
            (item.nivel_alerta ?? "").toLowerCase().includes(actSearch.toLowerCase())
          )
          .map((item, idx) => {
            const Icon   = atividadeIcon(item);
            const dot    = atividadeDot(item);
            const bg     = atividadeBg(item);
            const border = item.status === "entrando" ? "1px solid #c7d2fe" : `1px solid ${BORDER}`;
            const tipoStr = TIPO_LABEL[item.tipo ?? ""] ?? "Ato";
            const label   = atividadeLabel(item);
            const ref     = (item.numero ?? "").length > 35
              ? (item.numero ?? "").slice(0, 33) + "…"
              : (item.numero ?? "—");
            const ts = item.status === "entrando"
              ? (item.criado_em ? timeAgo(item.criado_em) : "—")
              : (item.analisado_em ? timeAgo(item.analisado_em) : item.criado_em ? timeAgo(item.criado_em) : "—");

            const inner = (
              <div
                className="flex items-start gap-3 px-4 py-3 hover:brightness-95 transition-all"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <div className="mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0"
                  style={{ background: bg, border, borderRadius: 2 }}>
                  <Icon size={11} style={{ color: dot }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium leading-snug truncate" style={{ color: INK, fontFamily: MONO }}>
                    {tipoStr !== "Ato" ? `${tipoStr} ` : ""}{ref}
                  </p>
                  <p className="text-[10px] mt-0.5 capitalize" style={{ color: item.status === "entrando" ? "#6366f1" : MUTED }}>
                    {label}
                  </p>
                </div>
                <span className="text-[9.5px] flex-shrink-0 mt-0.5 uppercase tracking-wider whitespace-nowrap" style={{ color: SUBTLE, fontFamily: MONO }}>
                  {ts}
                </span>
              </div>
            );

            if (item.status === "analisado") {
              return (
                <Link
                  key={`${item.ato_id}-${idx}`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={"/painel/$slug/ato/$id" as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ slug: SLUG, id: item.ato_id } as any}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  {inner}
                </Link>
              );
            }
            // "entrando" — sem link ainda (sem ficha de análise)
            return <div key={`${item.ato_id}-${idx}`}>{inner}</div>;
          })
        }
      </div>
    </div>
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────

const mdComponents: import("react-markdown").Components = {
  // Parágrafos
  p: ({ children }) => (
    <p style={{ margin: "0 0 0.75em", lineHeight: 1.65, fontSize: 14, color: INK }}>
      {children}
    </p>
  ),
  // Títulos
  h1: ({ children }) => (
    <h1 style={{ fontFamily: TIGHT, fontSize: 18, fontWeight: 600, letterSpacing: "-0.025em", color: INK, margin: "1.1em 0 0.4em", lineHeight: 1.2 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontFamily: TIGHT, fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: INK, margin: "1em 0 0.35em", lineHeight: 1.25, borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.25em" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: TIGHT, fontSize: 13.5, fontWeight: 600, color: INK, margin: "0.9em 0 0.3em", lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </h3>
  ),
  // Listas
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 0.75em", paddingLeft: "1.35em", listStyle: "none" }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 0.75em", paddingLeft: "1.35em" }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: "0.2em 0", fontSize: 14, lineHeight: 1.6, color: INK, position: "relative" }}>
      <span style={{ position: "absolute", left: "-1.1em", color: "#16a34a", fontFamily: MONO, fontSize: 11, top: "0.35em" }}>▸</span>
      {children}
    </li>
  ),
  // Bold / Italic
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: INK }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic", color: MUTED }}>{children}</em>
  ),
  // Código inline
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code style={{
        fontFamily: MONO, fontSize: 12, background: "#f0ede5",
        border: `1px solid ${BORDER}`, borderRadius: 2,
        padding: "0.1em 0.4em", color: "#0a5c36",
      }}>
        {children}
      </code>
    );
  },
  // Blocos de código
  pre: ({ children }) => (
    <pre style={{
      background: "#0a0a0a", color: "#d4d2cd",
      borderRadius: 3, padding: "0.85em 1em",
      overflowX: "auto", fontSize: 12.5,
      fontFamily: MONO, margin: "0.75em 0",
      lineHeight: 1.55,
    }}>
      {children}
    </pre>
  ),
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: `3px solid #16a34a`, paddingLeft: "0.85em",
      margin: "0.75em 0", color: MUTED, fontStyle: "italic",
    }}>
      {children}
    </blockquote>
  ),
  // Linha horizontal
  hr: () => (
    <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "1em 0" }} />
  ),
  // Links — internos viram <Link> do TanStack Router (navegação SPA);
  // externos abrem em nova aba.
  a: ({ href, children }) => {
    if (href && href.startsWith("/")) {
      return (
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={href as any}
          style={{
            color: "#0a5c36",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            fontWeight: 500,
          }}
        >
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: "#0a5c36", textDecoration: "underline", textUnderlineOffset: 2 }}>
        {children}
      </a>
    );
  },
  // Tabelas
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "0.75em 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: PAPER }}>
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th style={{ padding: "0.4em 0.75em", borderBottom: `2px solid ${BORDER}`, textAlign: "left", fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: SUBTLE, fontWeight: 600 }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: "0.4em 0.75em", borderBottom: `1px solid ${BORDER}`, color: INK, lineHeight: 1.5 }}>
      {children}
    </td>
  ),
};

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg, isLast, isStreaming }: { msg: Message; isLast: boolean; isStreaming: boolean }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[82%] px-4 py-3"
          style={{
            background: INK, color: "#fff",
            borderRadius: 3, fontFamily: TIGHT,
            fontSize: 14, lineHeight: 1.6,
            wordBreak: "break-word",
          }}
        >
          {msg.conteudo}
        </div>
      </div>
    );
  }

  // Assistant bubble — renderiza markdown
  return (
    <div className="flex justify-start mb-5">
      <div
        className="max-w-[88%] px-5 py-4"
        style={{
          background: PAPER,
          border: `1px solid ${BORDER}`,
          borderRadius: 3,
          wordBreak: "break-word",
        }}
      >
        {!msg.conteudo && isLast && isStreaming ? (
          <span className="flex gap-1 items-center" style={{ color: SUBTLE }}>
            <span className="animate-pulse" style={{ fontFamily: MONO }}>▮</span>
          </span>
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {msg.conteudo}
            </ReactMarkdown>
            {isLast && isStreaming && (
              <span
                className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
                style={{ background: "#16a34a" }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ChatPage() {
  const [userName, setUserName] = useState("Usuário");
  const [input, setInput] = useState("");
  const [actSearch, setActSearch] = useState("");
  const { atividade: analyses, stats } = useOrgao(SLUG);
  const [activityOpen, setActivityOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [planoError, setPlanoError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata?.nome as string | undefined;
      const raw = meta ?? session.user.email?.split("@")[0] ?? "Usuário";
      setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));
    });
    carregarSessoes();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function carregarSessoes() {
    try {
      const r = await fetchAuthed("/chat/sessoes");
      if (r.ok) {
        const data = await r.json();
        setSessoes(data.sessoes ?? []);
      }
    } catch {
      // not fatal
    }
  }

  async function carregarSessao(id: string) {
    try {
      const r = await fetchAuthed(`/chat/sessoes/${id}`);
      if (!r.ok) return;
      const data = await r.json();
      setSessaoId(id);
      setMessages(
        (data.mensagens ?? []).map((m: { role: string; conteudo: string; id: string }) => ({
          role: m.role as "user" | "assistant",
          conteudo: m.conteudo,
          id: m.id,
        }))
      );
    } catch {
      // noop
    }
  }

  function novaSessao() {
    setSessaoId(null);
    setMessages([]);
    setPlanoError(false);
    inputRef.current?.focus();
  }

  async function deletarSessao(id: string) {
    try {
      await fetchAuthed(`/chat/sessoes/${id}`, { method: "DELETE" });
      if (sessaoId === id) novaSessao();
      setSessoes((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // noop
    }
  }

  const handleSend = useCallback(async () => {
    const pergunta = input.trim();
    if (!pergunta || isStreaming) return;

    setInput("");
    setPlanoError(false);
    setMessages((prev) => [...prev, { role: "user", conteudo: pergunta }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", conteudo: "" }]);

    try {
      let sid = sessaoId;
      if (!sid) {
        const cr = await fetchAuthed("/chat/sessoes", { method: "POST" });
        if (cr.status === 403) {
          setPlanoError(true);
          setIsStreaming(false);
          setMessages((prev) => prev.slice(0, -2));
          return;
        }
        if (!cr.ok) throw new Error("Erro ao criar sessão");
        const cd = await cr.json();
        sid = cd.id as string;
        setSessaoId(sid);
      }

      const resp = await fetchAuthed(`/chat/sessoes/${sid}/stream`, {
        method: "POST",
        body: JSON.stringify({ pergunta }),
      });

      if (resp.status === 403) {
        setPlanoError(true);
        setIsStreaming(false);
        setMessages((prev) => prev.slice(0, -2));
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Erro na resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { texto?: string; fim?: boolean; erro?: string };
            if (data.erro) throw new Error(data.erro);
            if (data.texto) {
              assistantText += data.texto;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", conteudo: assistantText };
                return updated;
              });
            }
            if (data.fim) break;
          } catch {
            // parse error — ignore malformed chunk
          }
        }
      }

      // Refresh session list
      carregarSessoes();
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          conteudo: "Ocorreu um erro ao processar sua pergunta. Tente novamente.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessaoId]);

  function handleCard(title: string) {
    setInput(title + ": ");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const count24h = analyses ? analyses.length : 0;
  const isLive = count24h > 0;

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 min-h-0 w-full" style={{ color: INK }}>
      {/* ── Main column ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white min-w-0 relative">
        {/* Status bar */}
        <div
          className="hidden sm:flex items-center justify-between px-4 md:px-10 h-7 flex-shrink-0"
          style={{ background: PAPER, borderBottom: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: SUBTLE, textTransform: "uppercase" }}
        >
          <div className="flex items-center gap-3">
            <span>~/chat</span>
            <span style={{ color: "#d8d5cd" }}>│</span>
            <span>model · piper-lite</span>
            <span style={{ color: "#d8d5cd" }}>│</span>
            <span>rag · {SLUG}</span>
          </div>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full" style={{ background: isLive ? "#16a34a" : "#d8d5cd", boxShadow: isLive ? "0 0 6px #16a34a" : undefined }} />
            {isLive ? "live" : "ready"}
          </span>
        </div>

        {/* Plan error banner */}
        {planoError && (
          <div className="flex-shrink-0 px-4 md:px-10 py-3" style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
            <p className="text-[13px]" style={{ color: "#92400e" }}>
              Chat disponível apenas para planos <strong>Investigador</strong> ou superior.{" "}
              <a href="/precos" className="underline font-medium">Ver planos</a>
            </p>
          </div>
        )}

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 pt-6 pb-4">
          {!hasMessages ? (
            /* ── Welcome state ── */
            <div className="flex flex-col items-center w-full max-w-[760px] mx-auto min-h-full justify-center">
              <div className="w-full flex justify-center mb-4">
                <SplineEmbed width="100%" height={240} radius={2} className="max-w-[480px]" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.32em] flex items-center gap-2" style={{ color: SUBTLE, fontFamily: MONO }}>
                <span style={{ color: "#16a34a" }}>▮</span> dig·dig / assistente
              </span>
              <h1
                className="mt-4 text-center"
                style={{ fontFamily: TIGHT, fontSize: "clamp(28px, 5.4vw, 46px)", lineHeight: 1.02, letterSpacing: "-0.035em", fontWeight: 500 }}
              >
                Bem-vindo, {userName}.
              </h1>
              <p className="mt-3 text-center max-w-[480px] px-2" style={{ color: MUTED, fontSize: 14, lineHeight: 1.55 }}>
                Faça perguntas, analise portarias ou gere fichas de denúncia a partir dos atos públicos analisados.
              </p>

              {/* Quick actions */}
              <div className="mt-10 w-full">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-[9.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: SUBTLE, fontFamily: MONO }}>▮ comandos rápidos</span>
                  <span className="flex-1 h-px" style={{ background: "#e8e6e1" }} />
                  <span className="text-[9px] uppercase tracking-[0.18em] tabular-nums" style={{ color: SUBTLE, fontFamily: MONO }}>{QUICK_ACTIONS.length} ops</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: BORDER, border: `1px solid ${BORDER}` }}>
                  {QUICK_ACTIONS.map((a, i) => (
                    <button
                      key={a.title}
                      onClick={() => handleCard(a.title)}
                      className="group flex flex-col gap-2 p-4 text-left bg-white hover:bg-[#faf8f3] transition-colors active:bg-[#f0ede5] min-h-[120px] relative"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] tabular-nums" style={{ color: "#a8a59c", fontFamily: MONO, letterSpacing: "0.06em" }}>
                          [{String(i).padStart(2, "0")}]
                        </span>
                        <a.icon size={14} style={{ color: SUBTLE }} className="group-hover:text-[#16a34a] transition-colors" />
                      </div>
                      <span className="text-[13px] font-medium leading-tight mt-1" style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.01em" }}>{a.title}</span>
                      <span className="text-[11.5px] leading-snug" style={{ color: MUTED }}>{a.desc}</span>
                      <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#16a34a", fontFamily: MONO, fontWeight: 600 }}>
                        run →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Conversation state ── */
            <div className="w-full max-w-[760px] mx-auto pt-2 pb-2">
              {messages.map((msg, idx) => (
                <Bubble
                  key={idx}
                  msg={msg}
                  isLast={idx === messages.length - 1}
                  isStreaming={isStreaming}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input ── */}
        <div className="flex-shrink-0 bg-white px-4 sm:px-6 md:px-10 py-3 sm:py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="w-full max-w-[720px] mx-auto">
            <div
              className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-3 transition-colors focus-within:border-[#16a34a] focus-within:shadow-[0_0_0_3px_#16a34a1a]"
              style={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}
            >
              <span className="text-[13px] font-bold flex-shrink-0" style={{ color: "#16a34a", fontFamily: MONO }}>›</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="pergunte sobre os atos…"
                className="flex-1 bg-transparent text-[14px] outline-none min-w-0"
                style={{ color: INK, fontFamily: MONO }}
                disabled={isStreaming}
              />
              {hasMessages && (
                <button
                  onClick={novaSessao}
                  className="transition-colors hover:text-[#0a0a0a] p-1 flex-shrink-0"
                  style={{ color: SUBTLE }}
                  title="Nova conversa"
                >
                  <Plus size={13} />
                </button>
              )}
              <button
                aria-label="Enviar"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="px-3 py-1.5 transition-all flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] flex-shrink-0"
                style={{
                  background: input.trim() && !isStreaming ? INK : PAPER,
                  color: input.trim() && !isStreaming ? "#fff" : SUBTLE,
                  fontFamily: MONO, borderRadius: 2,
                  border: `1px solid ${input.trim() && !isStreaming ? INK : BORDER}`,
                  cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
                }}
              >
                <Send size={11} />
                <span className="hidden sm:inline">{isStreaming ? "…" : "enviar"}</span>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] px-1" style={{ color: SUBTLE, fontFamily: MONO }}>
              <span>piper-lite · ctx via rag</span>
              <span className="hidden sm:inline">↵ enviar</span>
            </div>
          </div>
        </div>

        {/* Mobile floating button */}
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Atividade ao vivo"
              className="lg:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3 py-2.5 shadow-lg transition-transform active:scale-95"
              style={{ background: INK, color: "#fff", borderRadius: 999, fontFamily: MONO }}
            >
              <Activity size={14} />
              <span className="text-[10.5px] uppercase tracking-wider font-semibold">Atividade</span>
              {isLive && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 h-[85vh] rounded-t-2xl overflow-hidden">
            <ActivityPanel
              isLive={isLive} count24h={count24h} stats={stats} atividade={analyses}
              actSearch={actSearch} setActSearch={setActSearch}
              sessoes={sessoes} sessaoAtual={sessaoId}
              onSelectSessao={carregarSessao} onNovaSessao={novaSessao}
              onDeletarSessao={deletarSessao}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Right panel (desktop) ────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-[280px] flex-shrink-0 flex-col sticky top-0 h-screen overflow-hidden"
        style={{ borderLeft: `1px solid ${BORDER}` }}
      >
        <ActivityPanel
          isLive={isLive} count24h={count24h} stats={stats} atividade={analyses}
          actSearch={actSearch} setActSearch={setActSearch}
          sessoes={sessoes} sessaoAtual={sessaoId}
          onSelectSessao={carregarSessao} onNovaSessao={novaSessao}
          onDeletarSessao={deletarSessao}
        />
      </aside>
    </div>
  );
}
