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
  MoreHorizontal,
  Zap,
  GitBranch,
} from "lucide-react";

const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";

// @ts-ignore
export const Route = createFileRoute("/painel/chat")({
  component: ChatPage,
});

const QUICK_ACTIONS = [
  {
    icon: Search,
    title: "Buscar irregularidades",
    desc: "Encontro padrões suspeitos por tema, pessoa ou período",
  },
  {
    icon: FileText,
    title: "Analisar portaria",
    desc: "Explique o risco e os artigos violados neste ato",
  },
  {
    icon: AlertTriangle,
    title: "Ficha de denúncia",
    desc: "Gero a ficha completa pronta para imprensa ou advocacia",
  },
  {
    icon: Zap,
    title: "Casos críticos",
    desc: "Liste os atos vermelho e laranja mais graves",
  },
  {
    icon: GitBranch,
    title: "Grafo de pessoas",
    desc: "Quem aparece com maior frequência em atos suspeitos",
  },
  {
    icon: Download,
    title: "Exportar relatório",
    desc: "Gero relatório em PDF ou CSV para uso externo",
  },
];

interface RecentItem {
  icon: React.ElementType;
  text: string;
  sub: string;
  time: string;
}

const RECENT_MOCK: RecentItem[] = [
  {
    icon: AlertTriangle,
    text: "485 atos analisados",
    sub: "Rodada CAU/PR",
    time: "ao vivo",
  },
  {
    icon: Zap,
    text: "13 casos vermelhos",
    sub: "Detectados na rodada atual",
    time: "2 min atrás",
  },
  {
    icon: Users,
    text: "91 casos laranja",
    sub: "Indício moderado-grave",
    time: "5 min atrás",
  },
  {
    icon: FileText,
    text: "Portaria 041/2019",
    sub: "Nível vermelho confirmado",
    time: "1h atrás",
  },
];

function ChatPage() {
  const [userName, setUserName] = useState("Usuário");
  const [input, setInput] = useState("");
  const [actSearch, setActSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata?.nome as string | undefined;
      const raw = meta ?? session.user.email?.split("@")[0] ?? "Usuário";
      setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));
    });
  }, []);

  function handleCard(title: string) {
    setInput(title + ": ");
    inputRef.current?.focus();
  }

  const filtered = RECENT_MOCK.filter(
    (i) =>
      actSearch === "" ||
      i.text.toLowerCase().includes(actSearch.toLowerCase()) ||
      i.sub.toLowerCase().includes(actSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-1 min-h-0" style={{ color: INK }}>
      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 md:px-10 py-10 bg-white min-w-0">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[680px]">
          {/* Eyebrow */}
          <span
            className="text-[10px] uppercase tracking-[0.32em]"
            style={{
              color: SUBTLE,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Dig Dig · Assistente
          </span>

          <h1
            className="mt-5 text-center font-medium tracking-tight"
            style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontSize: "clamp(32px, 4vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Bem-vindo, {userName}.
          </h1>
          <p
            className="mt-3 text-center max-w-[460px]"
            style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.55 }}
          >
            Faça perguntas, analise portarias ou gere fichas de denúncia a
            partir dos atos públicos analisados.
          </p>

          {/* Cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px w-full"
            style={{ background: BORDER, border: `1px solid ${BORDER}` }}
          >
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.title}
                onClick={() => handleCard(a.title)}
                className="group flex flex-col gap-3 p-5 text-left bg-white hover:bg-[#faf8f3] transition-colors"
              >
                <a.icon
                  size={16}
                  style={{ color: SUBTLE }}
                  className="group-hover:text-[#0a0a0a] transition-colors"
                />
                <span className="text-[13px] font-medium" style={{ color: INK }}>
                  {a.title}
                </span>
                <span className="text-[12px] leading-snug" style={{ color: MUTED }}>
                  {a.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="w-full max-w-[680px] mt-8">
          <div
            className="flex items-center gap-3 bg-white px-4 py-3 transition-colors focus-within:border-[#0a0a0a]"
            style={{ border: `1px solid ${BORDER}`, borderRadius: 4 }}
          >
            <div className="flex gap-2.5">
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
              placeholder="Pergunte sobre os atos analisados…"
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: INK }}
            />
            <button
              className="px-3 py-2 transition-colors flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider"
              style={{
                background: input.trim() ? INK : PAPER,
                color: input.trim() ? "#fff" : SUBTLE,
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 2,
              }}
            >
              <Send size={13} />
              Enviar
            </button>
          </div>
          <p
            className="mt-3 text-center text-[10.5px] uppercase tracking-[0.2em]"
            style={{
              color: SUBTLE,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Sonnet 4.6 · contexto via RAG dos atos analisados
          </p>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-[280px] flex-shrink-0 bg-white flex-col"
        style={{ borderLeft: `1px solid ${BORDER}` }}
      >
        <div
          className="px-5 pt-6 pb-3 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <span
            className="text-[10px] uppercase tracking-[0.28em] font-semibold"
            style={{
              color: INK,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Atividade Recente
          </span>
          <button
            className="transition-colors hover:text-[#0a0a0a]"
            style={{ color: SUBTLE }}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-3">
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

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 && (
            <p
              className="text-[11px] text-center pt-10"
              style={{ color: SUBTLE }}
            >
              Nenhuma atividade encontrada.
            </p>
          )}
          {filtered.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-3 hover:bg-[#faf8f3] transition-colors cursor-default group"
            >
              <div
                className="mt-0.5 w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{
                  background: PAPER,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 2,
                }}
              >
                <item.icon size={13} style={{ color: MUTED }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12.5px] leading-snug truncate font-medium"
                  style={{ color: INK }}
                >
                  {item.text}
                </p>
                <p
                  className="text-[11px] leading-snug mt-0.5 truncate"
                  style={{ color: MUTED }}
                >
                  {item.sub}
                </p>
              </div>
              <span
                className="text-[10px] flex-shrink-0 mt-0.5 uppercase tracking-wider"
                style={{
                  color: SUBTLE,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
