import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/pnl/usuarios")({
  component: UsuariosPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

interface AccessRequest {
  id: string;
  nome: string;
  email: string;
  profissao: string | null;
  motivacao: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  created_at: string | null;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "#f59e0b",
  aprovado: "#22c55e",
  rejeitado: "#ef4444",
};

function UsuariosPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pendente");
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    const res = await authedFetch(`/pnl/admin/access-requests?status=${filter}`);
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function aprovar(id: string, nome: string) {
    setProcessing(id);
    const res = await authedFetch(`/pnl/admin/access-requests/${id}/aprovar`, { method: "POST" });
    setProcessing(null);
    if (res.ok) {
      showToast(`✓ ${nome} aprovado — invite enviado`);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(`Erro: ${d.detail ?? "falha ao aprovar"}`);
    }
  }

  async function rejeitar(id: string, nome: string) {
    setProcessing(id);
    const res = await authedFetch(`/pnl/admin/access-requests/${id}/rejeitar`, { method: "POST" });
    setProcessing(null);
    if (res.ok) {
      showToast(`${nome} rejeitado`);
      load();
    } else {
      showToast("Erro ao rejeitar");
    }
  }

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 border border-white/10 px-4 py-3 text-[12px] text-white"
          style={{ background: "#0d0f1a" }}
        >
          {toast}
        </div>
      )}

      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1" style={SYNE}>
          Fila de espera
        </p>
        <h1 className="text-white text-[1.6rem] uppercase tracking-tight" style={SYNE}>
          Usuários
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-6">
        {["pendente", "aprovado", "rejeitado", ""].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={SYNE}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors border ${
              filter === s
                ? "bg-white text-[#07080f] border-white"
                : "border-white/[0.08] text-white/40 hover:text-white/70"
            }`}
          >
            {s || "Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/30 text-[12px] uppercase tracking-[0.16em]">Carregando…</p>
      ) : requests.length === 0 ? (
        <p className="text-white/20 text-[12px]">Nenhum pedido com status "{filter || "todos"}".</p>
      ) : (
        <div className="border border-white/[0.07] overflow-hidden">
          {/* Cabeçalho */}
          <div
            className="grid text-[9px] uppercase tracking-[0.16em] text-white/30 px-4 py-2.5 border-b border-white/[0.07]"
            style={{ gridTemplateColumns: "1fr 1fr 120px 80px 100px", background: "#0a0c15" }}
          >
            <span style={SYNE}>Nome / Email</span>
            <span style={SYNE}>Perfil / Motivação</span>
            <span style={SYNE}>Data</span>
            <span style={SYNE}>Status</span>
            <span style={SYNE}>Ações</span>
          </div>

          {requests.map((r) => (
            <div
              key={r.id}
              className="grid px-4 py-4 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: "1fr 1fr 120px 80px 100px", background: "#0d0f1a" }}
            >
              {/* Nome / Email */}
              <div>
                <p className="text-white text-[13px] font-medium">{r.nome}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{r.email}</p>
              </div>

              {/* Perfil / Motivação */}
              <div className="pr-4">
                <p className="text-white/60 text-[12px]">{r.profissao || "—"}</p>
                {r.motivacao && (
                  <p className="text-white/30 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                    {r.motivacao}
                  </p>
                )}
              </div>

              {/* Data */}
              <div className="text-white/40 text-[11px]">{fmtDate(r.created_at)}</div>

              {/* Status */}
              <div>
                <span
                  className="text-[9px] uppercase tracking-[0.14em] px-2 py-0.5"
                  style={{
                    color: STATUS_COLORS[r.status],
                    border: `1px solid ${STATUS_COLORS[r.status]}40`,
                    background: `${STATUS_COLORS[r.status]}10`,
                  }}
                >
                  {r.status}
                </span>
              </div>

              {/* Ações */}
              <div className="flex gap-2 items-center">
                {r.status === "pendente" && (
                  <>
                    <button
                      onClick={() => aprovar(r.id, r.nome)}
                      disabled={processing === r.id}
                      className="text-[9px] uppercase tracking-[0.12em] text-green-400/70 hover:text-green-400 transition-colors disabled:opacity-40"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => rejeitar(r.id, r.nome)}
                      disabled={processing === r.id}
                      className="text-[9px] uppercase tracking-[0.12em] text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
                {r.status === "aprovado" && (
                  <span className="text-[9px] text-white/20">✓ Invite enviado</span>
                )}
                {r.status === "rejeitado" && (
                  <span className="text-[9px] text-white/20">Rejeitado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
