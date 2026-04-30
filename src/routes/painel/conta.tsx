import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { fetchAuthed } from "@/lib/api-auth";
import {
  INK, PAPER, BORDER, HAIRLINE, MUTED, MUTED_SOFT, MONO, TIGHT, RADIUS, ACCENT,
} from "@/lib/painel-theme";
import { Trash2, Camera, ExternalLink, Star, X } from "lucide-react";

export const Route = createFileRoute("/painel/conta")({
  component: ContaPage,
});

type Plano = {
  id: string;
  nome: string;
  preco_mensal: number;
  limite_chat_mensal: number | null;
  tem_exportacao: boolean;
  tem_api: boolean;
};

type Assinatura = {
  id: string;
  status: string;
  plano_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  cancelado_em: string | null;
};

type Perfil = {
  id: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  plano: Plano;
  assinatura: Assinatura | null;
};

type Favorito = {
  ato_id: string;
  tenant_slug: string;
  tenant_nome: string;
  tipo: string;
  numero: string;
  data_publicacao: string | null;
  titulo: string | null;
  ementa: string | null;
  nota: string | null;
  favoritado_em: string;
};

type Aba = "perfil" | "assinatura" | "doacao" | "favoritos";

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ContaPage() {
  const [aba, setAba] = useState<Aba>("perfil");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarPerfil() {
    try {
      const r = await fetchAuthed("/me");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPerfil(await r.json());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar perfil");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarFavoritos() {
    try {
      const r = await fetchAuthed("/me/favoritos");
      if (r.ok) setFavoritos(await r.json());
    } catch {/* silencioso — aba ainda funciona vazia */}
  }

  useEffect(() => { carregarPerfil(); }, []);
  useEffect(() => { if (aba === "favoritos") carregarFavoritos(); }, [aba]);

  if (carregando) return <Loading />;
  if (erro || !perfil) return <ErroBox msg={erro ?? "Sem dados"} />;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <Cabecalho perfil={perfil} />

      {/* Tabs */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="px-6 lg:px-10 flex gap-0" style={{ maxWidth: 980, margin: "0 auto" }}>
          {(["perfil", "assinatura", "doacao", "favoritos"] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className="px-4 py-3 text-[12px] uppercase tracking-[0.18em] transition-colors"
              style={{
                fontFamily: MONO,
                color: aba === a ? INK : MUTED_SOFT,
                borderBottom: aba === a ? `2px solid ${INK}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {a === "doacao" ? "doação" : a}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 lg:px-10 py-8" style={{ maxWidth: 980, margin: "0 auto" }}>
        {aba === "perfil" && <AbaPerfil perfil={perfil} onUpdated={carregarPerfil} />}
        {aba === "assinatura" && <AbaAssinatura perfil={perfil} onUpdated={carregarPerfil} />}
        {aba === "doacao" && <AbaDoacao />}
        {aba === "favoritos" && <AbaFavoritos itens={favoritos} onChange={carregarFavoritos} />}
      </div>
    </div>
  );
}

function Cabecalho({ perfil }: { perfil: Perfil }) {
  const initial = (perfil.nome ?? perfil.email)[0]?.toUpperCase() ?? "•";
  return (
    <div className="px-6 lg:px-10 pt-10 pb-6" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div
        className="text-[10px] uppercase tracking-[0.22em] mb-3"
        style={{ fontFamily: MONO, color: MUTED_SOFT }}
      >
        ▮ minha conta
      </div>
      <div className="flex items-center gap-4">
        {perfil.avatar_url ? (
          <img
            src={perfil.avatar_url}
            alt={perfil.nome ?? "avatar"}
            className="w-16 h-16 object-cover"
            style={{ borderRadius: RADIUS, border: `1px solid ${HAIRLINE}` }}
          />
        ) : (
          <span
            className="flex items-center justify-center w-16 h-16 text-white text-[24px] font-semibold"
            style={{ background: INK, fontFamily: MONO, borderRadius: RADIUS }}
          >
            {initial}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h1
            className="text-[22px] font-semibold leading-tight truncate"
            style={{ color: INK, fontFamily: TIGHT }}
          >
            {perfil.nome ?? "(sem nome)"}
          </h1>
          <p
            className="text-[13px] truncate mt-0.5"
            style={{ color: MUTED, fontFamily: TIGHT }}
          >
            {perfil.email}
          </p>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] mt-2 px-2 py-1"
            style={{
              fontFamily: MONO,
              color: INK,
              background: PAPER,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
            />
            plano · {perfil.plano.nome}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Aba Perfil ──────────────────────────────────────────────────────────────

function AbaPerfil({ perfil, onUpdated }: { perfil: Perfil; onUpdated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(perfil.nome ?? "");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvarNome() {
    setSalvandoNome(true);
    setMsg(null);
    try {
      const r = await fetchAuthed("/me", {
        method: "PATCH",
        body: JSON.stringify({ nome }),
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Nome atualizado.");
      onUpdated();
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setSalvandoNome(false);
    }
  }

  async function uploadFoto(file: File) {
    setSalvandoFoto(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // fetchAuthed adiciona Content-Type: application/json — pra multipart precisa anular
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { API_URL } = await import("@/lib/api");
      const r = await fetch(`${API_URL}/me/avatar`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Foto atualizada.");
      onUpdated();
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function removerFoto() {
    if (!confirm("Remover foto de perfil?")) return;
    setSalvandoFoto(true);
    try {
      const r = await fetchAuthed("/me/avatar", { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Foto removida.");
      onUpdated();
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setSalvandoFoto(false);
    }
  }

  return (
    <div className="space-y-8">
      <Secao titulo="Foto de perfil" subtitulo="JPG, PNG ou WebP — até 2 MB.">
        <div className="flex items-center gap-4">
          {perfil.avatar_url ? (
            <img
              src={perfil.avatar_url}
              alt="avatar"
              className="w-20 h-20 object-cover"
              style={{ borderRadius: RADIUS, border: `1px solid ${HAIRLINE}` }}
            />
          ) : (
            <div
              className="w-20 h-20 flex items-center justify-center"
              style={{
                background: PAPER, border: `1px solid ${HAIRLINE}`,
                borderRadius: RADIUS, color: MUTED_SOFT,
              }}
            >
              <Camera size={20} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFoto(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={salvandoFoto}
              style={btnPrimario(salvandoFoto)}
            >
              {salvandoFoto ? "Enviando…" : "Trocar foto"}
            </button>
            {perfil.avatar_url && (
              <button
                type="button"
                onClick={removerFoto}
                disabled={salvandoFoto}
                style={btnSecundario(salvandoFoto)}
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </Secao>

      <Secao titulo="Nome de exibição" subtitulo="Como você aparece no painel e em recibos de doação.">
        <div className="flex items-end gap-3 max-w-md">
          <div className="flex-1">
            <label
              className="text-[10px] uppercase tracking-[0.18em] block mb-1"
              style={{ fontFamily: MONO, color: MUTED_SOFT }}
            >
              nome
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-[13px] outline-none"
              style={{
                background: "#fff", border: `1px solid ${HAIRLINE}`,
                borderRadius: RADIUS, color: INK, fontFamily: TIGHT,
              }}
            />
          </div>
          <button
            onClick={salvarNome}
            disabled={salvandoNome || !nome.trim() || nome === (perfil.nome ?? "")}
            style={btnPrimario(salvandoNome || !nome.trim() || nome === (perfil.nome ?? ""))}
          >
            Salvar
          </button>
        </div>
      </Secao>

      <Secao titulo="Email" subtitulo="O email é gerenciado pela sua autenticação. Pra alterar, contate o suporte.">
        <div
          className="text-[13px] px-3 py-2 max-w-md"
          style={{
            background: PAPER, border: `1px solid ${BORDER}`,
            borderRadius: RADIUS, color: INK, fontFamily: TIGHT,
          }}
        >
          {perfil.email}
        </div>
      </Secao>

      {msg && <Mensagem texto={msg} />}
    </div>
  );
}

// ── Aba Assinatura ───────────────────────────────────────────────────────────

function AbaAssinatura({ perfil, onUpdated }: { perfil: Perfil; onUpdated: () => void }) {
  const [cancelando, setCancelando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function cancelar() {
    if (!confirm(
      "Cancelar assinatura?\n\nVocê mantém acesso até o fim do período já pago."
    )) return;
    setCancelando(true);
    try {
      const r = await fetchAuthed("/me/assinatura/cancelar", { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Assinatura cancelada. Você mantém acesso até o fim do período.");
      onUpdated();
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setCancelando(false);
    }
  }

  const a = perfil.assinatura;
  const planoAtual = perfil.plano.nome;
  const isFree = planoAtual.toLowerCase() === "gratuito";

  return (
    <div className="space-y-8">
      <Secao titulo="Plano atual">
        <div
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: PAPER, border: `1px solid ${BORDER}`, borderRadius: RADIUS }}
        >
          <div className="flex-1">
            <p
              className="text-[18px] font-semibold capitalize"
              style={{ color: INK, fontFamily: TIGHT }}
            >
              {planoAtual}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED, fontFamily: TIGHT }}>
              {perfil.plano.preco_mensal > 0
                ? `${fmtBRL(perfil.plano.preco_mensal)}/mês`
                : "Grátis pra sempre"}
              {perfil.plano.limite_chat_mensal != null
                && ` · ${perfil.plano.limite_chat_mensal} chats/mês`}
              {perfil.plano.tem_api && " · API liberada"}
            </p>
          </div>
          {!isFree && a && a.status === "active" && (
            <button onClick={cancelar} disabled={cancelando} style={btnDestrutivo(cancelando)}>
              {cancelando ? "Cancelando…" : "Cancelar"}
            </button>
          )}
          {isFree && (
            <Link to="/precos" style={{ ...btnPrimario(false), textDecoration: "none" }}>
              Ver planos →
            </Link>
          )}
        </div>
      </Secao>

      {a && (
        <Secao titulo="Detalhes da assinatura">
          <div
            className="grid grid-cols-2 gap-4 px-4 py-4"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: RADIUS }}
          >
            <Campo label="status" valor={a.status} />
            <Campo label="início" valor={fmtData(a.periodo_inicio)} />
            <Campo
              label={a.cancelado_em ? "acesso até" : "próxima cobrança"}
              valor={fmtData(a.periodo_fim)}
            />
            {a.cancelado_em && (
              <Campo label="cancelado em" valor={fmtData(a.cancelado_em)} />
            )}
          </div>
        </Secao>
      )}

      {msg && <Mensagem texto={msg} />}
    </div>
  );
}

// ── Aba Doação ───────────────────────────────────────────────────────────────

function AbaDoacao() {
  return (
    <div className="space-y-8">
      <Secao
        titulo="Apoie o Dig Dig"
        subtitulo="Tudo aqui é grátis e aberto. O que mantém a infraestrutura rodando é apoio voluntário."
      >
        <div
          className="px-5 py-5"
          style={{ background: PAPER, border: `1px solid ${BORDER}`, borderRadius: RADIUS }}
        >
          <p className="text-[14px] mb-4" style={{ color: INK, fontFamily: TIGHT }}>
            A página de apoio tem PIX, cartão e os planos de assinatura.
            Você escolhe o valor e a forma.
          </p>
          <Link
            to="/apoiar"
            style={{
              ...btnPrimario(false),
              padding: "10px 16px",
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Ir pra página de apoio
            <ExternalLink size={13} />
          </Link>
        </div>
      </Secao>
    </div>
  );
}

// ── Aba Favoritos ────────────────────────────────────────────────────────────

function AbaFavoritos({ itens, onChange }: { itens: Favorito[]; onChange: () => void }) {
  async function remover(ato_id: string) {
    if (!confirm("Remover dos favoritos?")) return;
    try {
      const r = await fetchAuthed(`/me/favoritos/${ato_id}`, { method: "DELETE" });
      if (r.ok) onChange();
    } catch {/* ignore */}
  }

  if (itens.length === 0) {
    return (
      <div
        className="text-center py-16"
        style={{
          background: PAPER, border: `1px dashed ${HAIRLINE}`,
          borderRadius: RADIUS, color: MUTED, fontFamily: TIGHT,
        }}
      >
        <Star size={20} className="mx-auto mb-3" style={{ opacity: 0.4 }} />
        <p className="text-[13px]">Nenhum ato favoritado ainda.</p>
        <p className="text-[12px] mt-1" style={{ color: MUTED_SOFT }}>
          Use o botão ⭐ na página de qualquer ato pra salvar aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {itens.map((f) => (
        <div
          key={f.ato_id}
          className="px-4 py-3 flex items-start gap-3"
          style={{
            background: "#fff", border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5"
                style={{
                  background: PAPER, border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS, fontFamily: MONO, color: MUTED,
                }}
              >
                {f.tipo}
              </span>
              <span
                className="text-[11px] tabular-nums"
                style={{ fontFamily: MONO, color: MUTED_SOFT }}
              >
                {f.numero}
              </span>
              <span className="text-[11px]" style={{ color: MUTED_SOFT, fontFamily: MONO }}>
                · {f.tenant_nome}
              </span>
              {f.data_publicacao && (
                <span
                  className="text-[11px] ml-auto"
                  style={{ color: MUTED_SOFT, fontFamily: MONO }}
                >
                  {fmtData(f.data_publicacao)}
                </span>
              )}
            </div>
            <p
              className="text-[13px] line-clamp-2"
              style={{ color: INK, fontFamily: TIGHT }}
            >
              {f.titulo ?? f.ementa ?? "(sem ementa)"}
            </p>
            {f.nota && (
              <p
                className="text-[12px] mt-1.5 italic"
                style={{ color: MUTED, fontFamily: TIGHT }}
              >
                Nota: {f.nota}
              </p>
            )}
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={"/painel/$slug/ato/$id" as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              params={{ slug: f.tenant_slug, id: f.ato_id } as any}
              className="text-[11px] uppercase tracking-[0.18em] mt-2 inline-flex items-center gap-1"
              style={{ fontFamily: MONO, color: INK }}
            >
              abrir ato →
            </Link>
          </div>
          <button
            onClick={() => remover(f.ato_id)}
            title="Remover dos favoritos"
            className="flex-shrink-0 p-1.5 transition-colors hover:bg-[#faf8f3]"
            style={{ color: MUTED_SOFT, borderRadius: RADIUS }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Helpers UI ──────────────────────────────────────────────────────────────

function Secao({
  titulo, subtitulo, children,
}: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-[14px] font-semibold mb-1"
        style={{ color: INK, fontFamily: TIGHT }}
      >
        {titulo}
      </h2>
      {subtitulo && (
        <p
          className="text-[12px] mb-3"
          style={{ color: MUTED, fontFamily: TIGHT }}
        >
          {subtitulo}
        </p>
      )}
      {children}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p
        className="text-[9px] uppercase tracking-[0.18em] mb-0.5"
        style={{ fontFamily: MONO, color: MUTED_SOFT }}
      >
        {label}
      </p>
      <p className="text-[13px] capitalize" style={{ color: INK, fontFamily: TIGHT }}>
        {valor}
      </p>
    </div>
  );
}

function Mensagem({ texto }: { texto: string }) {
  const erro = texto.toLowerCase().startsWith("erro");
  return (
    <div
      className="px-3 py-2 text-[12px] inline-flex items-center gap-2"
      style={{
        background: erro ? "#fef2f2" : "#f0fdf4",
        border: `1px solid ${erro ? "#fecaca" : "#bbf7d0"}`,
        color: erro ? "#991b1b" : "#166534",
        fontFamily: TIGHT,
        borderRadius: RADIUS,
      }}
    >
      {texto}
    </div>
  );
}

function Loading() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] text-[12px]"
      style={{ fontFamily: MONO, color: MUTED_SOFT, letterSpacing: "0.18em" }}
    >
      CARREGANDO…
    </div>
  );
}

function ErroBox({ msg }: { msg: string }) {
  return (
    <div className="px-6 py-10" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div
        className="px-4 py-4 flex items-start gap-2"
        style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          color: "#991b1b", fontFamily: TIGHT, borderRadius: RADIUS,
        }}
      >
        <X size={14} className="mt-0.5 flex-shrink-0" />
        <p className="text-[13px]">{msg}</p>
      </div>
    </div>
  );
}

function btnPrimario(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? "#a8a59c" : INK,
    color: "#fff",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "8px 14px",
    border: "none",
    borderRadius: RADIUS,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 120ms",
  };
}

function btnSecundario(disabled: boolean): React.CSSProperties {
  return {
    background: "#fff",
    color: INK,
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "8px 14px",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: RADIUS,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function btnDestrutivo(disabled: boolean): React.CSSProperties {
  return {
    background: "#fff",
    color: "#991b1b",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "8px 14px",
    border: "1px solid #fecaca",
    borderRadius: RADIUS,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
