// In dev: VITE_API_URL="" uses Vite proxy. In prod: set to Railway URL in Lovable env vars.
export const API_URL =
  import.meta.env.VITE_API_URL ?? "https://dig-dig-production.up.railway.app";

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

export interface AnaliseRecente {
  id: string;
  ato_id: string;
  nivel_alerta: string | null;
  score_risco: number | null;
  criado_em: string;
  numero: string | null;
  tipo: string | null;
}

export async function fetchAnalysesRecentes(slug: string): Promise<AnaliseRecente[]> {
  const r = await fetch(`${API_URL}/public/orgaos/${slug}/analises-recentes`);
  if (!r.ok) throw new Error("Falha ao buscar análises recentes");
  const data = await r.json();
  return data.analises as AnaliseRecente[];
}

export interface CrescimentoPonto { dia: string; total: number }
export interface Marco {
  tipo: string;
  label: string;
  primeiro_dia: string;
  total_acumulado: number;
  total_tipo: number;
}
export interface CrescimentoResponse {
  pontos: CrescimentoPonto[];
  inicio: string | null;
  total_atual: number;
  marcos: Marco[];
}

export async function fetchCrescimento(slug: string): Promise<CrescimentoResponse> {
  const r = await fetch(`${API_URL}/public/orgaos/${slug}/crescimento`);
  if (!r.ok) throw new Error("Falha ao buscar crescimento");
  return r.json();
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
