export const API_URL = "https://dig-dig-production.up.railway.app";

export async function fetchStats(slug = "cau-pr") {
  const r = await fetch(`${API_URL}/public/orgaos/${slug}/stats`);
  if (!r.ok) throw new Error("Falha ao buscar estatísticas");
  return r.json() as Promise<PublicStats>;
}

export async function fetchAtos(
  slug = "cau-pr",
  params: { tipo?: string; nivel?: string; page?: number; limit?: number } = {}
) {
  const q = new URLSearchParams();
  if (params.tipo) q.set("tipo", params.tipo);
  if (params.nivel) q.set("nivel", params.nivel);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const r = await fetch(`${API_URL}/public/orgaos/${slug}/atos?${q}`);
  if (!r.ok) throw new Error("Falha ao buscar atos");
  return r.json() as Promise<PublicAtosResponse>;
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface PublicStats {
  tenant: { slug: string; nome: string };
  total_atos: number;
  total_analisados: number;
  total_criticos: number;
  distribuicao: { verde: number; amarelo: number; laranja: number; vermelho: number };
  por_tipo: {
    portaria: { total: number; analisados: number };
    deliberacao: { total: number; analisados: number };
  };
}

export interface AtoPublico {
  id: string;
  numero: string;
  tipo: string;
  titulo: string | null;
  ementa: string | null;
  data_publicacao: string | null;
  nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | null;
  score_risco: number;
}

export interface PublicAtosResponse {
  total: number;
  page: number;
  pages: number;
  limit: number;
  atos: AtoPublico[];
}
