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

function DigOrb() {
  return (
    <div className="relative w-[88px] h-[88px] flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/40 via-blue-500/30 to-cyan-400/20 blur-2xl scale-150" />
      {/* Middle ring */}
      <div className="absolute inset-0 rounded-full border border-violet-500/20" />
      {/* Sphere */}
      <div
        className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #a78bfa, #6d28d9 45%, #1e1b4b 80%, #0a0a1a)",
          boxShadow:
            "0 0 40px rgba(109,40,217,0.6), 0 0 80px rgba(109,40,217,0.25), inset 0 0 20px rgba(167,139,250,0.2)",
        }}
      >
        {/* Highlight shimmer */}
        <div
          className="absolute top-[14px] left-[16px] w-[18px] h-[10px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

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
    sub: "Rodada CAU/PR — Dig Dig Piper",
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
  const [userName, setUserName] = useState("Regis");
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
      i.sub.toLowerCase().includes(actSearch.toLowerCase())
  );

  return (
    <div className="flex flex-1 min-h-0">
      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-between px-8 py-10 bg-[#07080f]">
        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[640px]">
          <DigOrb />

          <h1
            className="mt-7 text-[32px] font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            Bem-vindo, {userName}
          </h1>
          <p className="mt-2 text-center text-[14px] text-white/45 leading-relaxed max-w-[420px]">
            Estou aqui para escavar os atos públicos com você.
            <br />
            Faça perguntas, analise portarias ou gere fichas de denúncia.
          </p>

          {/* Cards 3×2 */}
          <div className="mt-9 grid grid-cols-3 gap-3 w-full">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.title}
                onClick={() => handleCard(a.title)}
                className="group flex flex-col gap-2.5 p-4 rounded-xl text-left
                  bg-white/[0.03] border border-white/[0.07]
                  hover:bg-white/[0.07] hover:border-violet-500/30
                  transition-all duration-200"
              >
                <a.icon
                  size={16}
                  className="text-white/35 group-hover:text-violet-400 transition-colors"
                />
                <span className="text-[12.5px] font-medium text-white/80 leading-snug">
                  {a.title}
                </span>
                <span className="text-[11.5px] text-white/35 leading-snug">
                  {a.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat input */}
        <div className="w-full max-w-[640px] mt-6">
          <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
            <div className="flex gap-2.5">
              <button className="text-white/25 hover:text-white/55 transition-colors">
                <Paperclip size={15} />
              </button>
              <button className="text-white/25 hover:text-white/55 transition-colors">
                <Mic size={15} />
              </button>
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre os atos analisados…"
              className="flex-1 bg-transparent text-[13.5px] text-white placeholder-white/25 outline-none"
            />
            <button
              className={`rounded-xl p-2 transition-colors ${
                input.trim()
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-white/[0.06] text-white/25"
              }`}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right panel — Atividade Recente ─────────────────────────────────── */}
      <aside className="w-[272px] flex-shrink-0 border-l border-white/[0.06] bg-[#09090f] flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <span className="text-[13px] font-medium text-white">
            Atividade Recente
          </span>
          <button className="text-white/30 hover:text-white/60 transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.05]">
            <Search size={11} className="text-white/30" />
            <input
              value={actSearch}
              onChange={(e) => setActSearch(e.target.value)}
              placeholder="Buscar atividade…"
              className="bg-transparent text-[12px] text-white/60 placeholder-white/25 outline-none flex-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-4">
          {filtered.length === 0 && (
            <p className="text-[11px] text-white/20 text-center pt-10">
              Nenhuma atividade encontrada.
            </p>
          )}
          {filtered.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-default group"
            >
              <div className="mt-0.5 w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/10 transition-colors">
                <item.icon size={13} className="text-white/35 group-hover:text-violet-400 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/75 leading-snug truncate">
                  {item.text}
                </p>
                <p className="text-[11px] text-white/35 leading-snug mt-0.5 truncate">
                  {item.sub}
                </p>
              </div>
              <span className="text-[10px] text-white/25 flex-shrink-0 mt-0.5">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
