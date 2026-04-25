import { supabase } from "./supabase";
import { API_URL } from "./api";

export async function fetchAuthed(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada. Faça login novamente.");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

// ─── Painel API types ─────────────────────────────────────────────────────────

export interface PainelAto {
  id: string;
  numero: string;
  tipo: string;
  titulo: string | null;
  ementa: string | null;
  data_publicacao: string | null;
  url_pdf: string | null;
  url_original: string | null;
  nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | null;
  score_risco: number;
  resumo_executivo: string | null;
  resultado_sonnet: Record<string, unknown> | null;
  recomendacao_campanha: string | null;
}

export interface PainelAtosResponse {
  total: number;
  page: number;
  pages: number;
  limit: number;
  atos: PainelAto[];
}

export interface PainelRodada {
  id: string;
  status: "pendente" | "em_progresso" | "concluida" | "cancelada";
  total_atos: number;
  atos_analisados_haiku: number;
  atos_analisados_sonnet: number;
  custo_total_usd: number;
  iniciado_em: string | null;
}

export async function fetchPainelAtos(
  slug: string,
  params: {
    tipo?: string;
    nivel?: string;
    ano?: number;
    busca?: string;
    page?: number;
  } = {}
): Promise<PainelAtosResponse> {
  const q = new URLSearchParams();
  if (params.tipo) q.set("tipo", params.tipo);
  if (params.nivel) q.set("nivel", params.nivel);
  if (params.ano) q.set("ano", String(params.ano));
  if (params.busca) q.set("busca", params.busca);
  if (params.page) q.set("page", String(params.page));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/atos?${q}`);
  if (!r.ok) throw new Error("Falha ao buscar atos");
  return r.json();
}

export async function fetchPainelAto(
  slug: string,
  id: string
): Promise<PainelAto> {
  const r = await fetchAuthed(`/painel/orgaos/${slug}/atos/${id}`);
  if (!r.ok) throw new Error("Falha ao buscar ato");
  return r.json();
}

export async function fetchPainelRodada(
  slug: string
): Promise<PainelRodada | null> {
  const r = await fetchAuthed(`/painel/orgaos/${slug}/rodadas`);
  if (!r.ok) return null;
  const data = await r.json();
  return data.rodada_ativa ?? null;
}
