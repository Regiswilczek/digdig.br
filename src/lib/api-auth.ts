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

export interface HaikuIndicio {
  categoria: string;
  tipo: string;
  descricao: string;
  artigo_violado: string | null;
  gravidade: "baixa" | "media" | "alta" | "critica";
}

export interface HaikuPessoa {
  nome: string;
  cargo: string;
  tipo_aparicao: string;
}

export interface ResultadoHaiku {
  indicios: HaikuIndicio[];
  pessoas_extraidas: HaikuPessoa[];
  referencias_atos: string[];
  requer_aprofundamento: boolean;
  motivo_aprofundamento: string | null;
}

export interface AtoAuditoria {
  criado_em: string | null;
  atualizado_em: string | null;
  status: string | null;
  agentes: ("piper" | "bud" | "new")[];
  tokens_piper: number;
  tokens_bud: number;
  tokens_new: number;
  custo_total_usd: number;
}

export interface AtoTagPainel {
  codigo: string;
  nome: string;
  categoria: string;
  categoria_nome: string;
  gravidade: "baixa" | "media" | "alta" | "critica";
  atribuido_por: "piper" | "bud" | "new";
  revisado_por: string | null;
  justificativa: string | null;
}

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
  resultado_piper: ResultadoHaiku | null;
  resultado_bud: Record<string, unknown> | null;
  recomendacao_campanha: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  cvss_fi: string | null;
  cvss_li: string | null;
  cvss_ri: string | null;
  cvss_av: string | null;
  cvss_ac: string | null;
  cvss_pr: string | null;
  tags: AtoTagPainel[];
  auditoria: AtoAuditoria | null;
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
  atos_analisados_piper: number;
  atos_analisados_bud: number;
  custo_total_usd: number;
  iniciado_em: string | null;
}

export interface FilaItem {
  ato_id: string;
  tipo: string;
  numero: string;
  data_publicacao: string | null;
  nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | null;
  motivo?: "sem_url" | "erro_download" | "pendente" | null;
}

export interface FilaInfo {
  total: number;
  amostra: FilaItem[];
  agente: string;
  descricao: string;
}

export interface EmProcessamentoItem {
  ato_id: string;
  tipo: string;
  numero: string;
  data_publicacao: string | null;
  nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | null;
  agente: "piper" | "bud" | "new";
}

export interface PipelineStatus {
  tenant: { id: string; slug: string; nome: string };
  em_processamento: EmProcessamentoItem[];
  filas: {
    aguarda_piper: FilaInfo;
    aguarda_bud: FilaInfo;
    aguarda_new: FilaInfo;
    sem_texto: FilaInfo;
  };
}

export async function fetchPainelAtos(
  slug: string,
  params: {
    tipo?: string;
    tipoAtlas?: string;
    nivel?: string;
    ano?: number;
    busca?: string;
    page?: number;
  } = {}
): Promise<PainelAtosResponse> {
  const q = new URLSearchParams();
  if (params.tipo) q.set("tipo", params.tipo);
  if (params.tipoAtlas) q.set("tipo_atlas", params.tipoAtlas);
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

export async function fetchPipelineStatus(
  slug: string
): Promise<PipelineStatus | null> {
  const r = await fetchAuthed(`/painel/orgaos/${slug}/pipeline-status`);
  if (!r.ok) return null;
  return r.json();
}

export interface PainelPendente {
  id: string;
  numero: string;
  tipo: string;
  data_publicacao: string | null;
  url_pdf: string | null;
  url_original: string | null;
  motivo: "sem_texto" | "sem_analise" | "escaneado_sem_ocr" | "deliberacao_html";
}

export interface PainelPendentesResponse {
  total: number;
  page: number;
  pages: number;
  total_sem_texto: number;
  total_sem_analise: number;
  total_portaria_escaneada: number;
  total_deliberacao_html: number;
  atos: PainelPendente[];
}

export async function fetchPendentes(
  slug: string,
  params: { tipo?: string; motivo?: string; page?: number } = {}
): Promise<PainelPendentesResponse> {
  const q = new URLSearchParams();
  if (params.tipo) q.set("tipo", params.tipo);
  if (params.motivo) q.set("motivo", params.motivo);
  if (params.page) q.set("page", String(params.page));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/pendentes?${q}`);
  if (!r.ok) throw new Error("Falha ao buscar pendentes");
  return r.json();
}

// ─── Grafo de relações (estilo Arkham) ─────────────────────────────────────

export type CorCategoria = "cinza" | "amarelo" | "laranja" | "vermelho";
export type Gravidade = "baixa" | "media" | "alta" | "critica";
export type NivelAlertaStr = "verde" | "amarelo" | "laranja" | "vermelho";

export interface GrafoNodePessoa {
  id: string;
  tipo: "pessoa";
  nome: string;
  cargo: string | null;
  icp: number | null;
  total_aparicoes: number;
  suspeito: boolean;
  primeiro_ato: string | null;
  ultimo_ato: string | null;
  cor_categoria: CorCategoria;
}

export interface GrafoNodeAto {
  id: string;
  tipo: "ato";
  numero: string;
  ato_tipo: string;
  data_publicacao: string | null;
  nivel_alerta: NivelAlertaStr | null;
  pessoas_count: number;
  tags_count: number;
}

export interface GrafoNodeTag {
  codigo: string;
  tipo: "tag";
  nome: string;
  categoria: string;
  categoria_nome: string;
  gravidade_predominante: Gravidade;
  atos_count: number;
  cor_categoria: CorCategoria;
}

export type GrafoNode = GrafoNodePessoa | GrafoNodeAto | GrafoNodeTag;

export interface GrafoEdgePP {
  source: string;
  target: string;
  kind: "co_aparicao";
  peso: number;
  atos_em_comum: number;
  tags_compartilhadas: string[];
  gravidade_max: Gravidade | null;
}

export interface GrafoEdgePA {
  source: string;
  target: string;
  kind: "aparicao";
  tipo_aparicao: string;
  cargo: string | null;
}

export interface GrafoEdgeAT {
  source: string;
  target: string;
  kind: "atribuicao_tag";
  gravidade: Gravidade;
  atribuido_por: string;
}

export type GrafoEdge = GrafoEdgePP | GrafoEdgePA | GrafoEdgeAT;

export interface GrafoResponse {
  nodes_pessoas: GrafoNodePessoa[];
  nodes_atos: GrafoNodeAto[];
  nodes_tags: GrafoNodeTag[];
  edges_pessoa_pessoa: GrafoEdgePP[];
  edges_pessoa_ato: GrafoEdgePA[];
  edges_ato_tag: GrafoEdgeAT[];
  root_id: string | null;
}

export interface AtoComumItem {
  ato_id: string;
  tipo: string;
  numero: string;
  data_publicacao: string | null;
  ementa: string | null;
  nivel_alerta: NivelAlertaStr | null;
  tipo_aparicao_a: string;
  cargo_a: string | null;
  tipo_aparicao_b: string;
  cargo_b: string | null;
  tags: { codigo: string; nome: string; gravidade: Gravidade }[];
}

export interface AtosComunsResponse {
  pessoa_a_id: string;
  pessoa_b_id: string;
  atos: AtoComumItem[];
}

export async function fetchGrafoRaiz(
  slug: string,
  params: { limit?: number; icp_min?: number; incluir_tags_top?: number } = {}
): Promise<GrafoResponse> {
  const q = new URLSearchParams();
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.icp_min !== undefined) q.set("icp_min", String(params.icp_min));
  if (params.incluir_tags_top !== undefined)
    q.set("incluir_tags_top", String(params.incluir_tags_top));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/grafo/raiz?${q}`);
  if (!r.ok) throw new Error("Falha ao buscar grafo raiz");
  return r.json();
}

export async function fetchGrafoExpandirPessoa(
  slug: string,
  pessoa_id: string,
  params: {
    limit_vizinhos?: number;
    peso_min?: number;
    incluir_atos?: boolean;
    incluir_tags?: boolean;
    limit_atos?: number;
  } = {}
): Promise<GrafoResponse> {
  const q = new URLSearchParams();
  if (params.limit_vizinhos !== undefined) q.set("limit_vizinhos", String(params.limit_vizinhos));
  if (params.peso_min !== undefined) q.set("peso_min", String(params.peso_min));
  if (params.incluir_atos !== undefined) q.set("incluir_atos", String(params.incluir_atos));
  if (params.incluir_tags !== undefined) q.set("incluir_tags", String(params.incluir_tags));
  if (params.limit_atos !== undefined) q.set("limit_atos", String(params.limit_atos));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/grafo/pessoa/${pessoa_id}?${q}`);
  if (!r.ok) throw new Error("Falha ao expandir pessoa");
  return r.json();
}

export async function fetchGrafoExpandirTag(
  slug: string,
  codigo: string,
  params: { limit_atos?: number; incluir_pessoas?: boolean } = {}
): Promise<GrafoResponse> {
  const q = new URLSearchParams();
  if (params.limit_atos !== undefined) q.set("limit_atos", String(params.limit_atos));
  if (params.incluir_pessoas !== undefined)
    q.set("incluir_pessoas", String(params.incluir_pessoas));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/grafo/tag/${codigo}?${q}`);
  if (!r.ok) throw new Error("Falha ao expandir tag");
  return r.json();
}

export async function fetchAtosComunsPessoas(
  slug: string,
  pessoa_a_id: string,
  pessoa_b_id: string
): Promise<AtosComunsResponse> {
  const r = await fetchAuthed(
    `/painel/orgaos/${slug}/grafo/atos-comuns/${pessoa_a_id}/${pessoa_b_id}`
  );
  if (!r.ok) throw new Error("Falha ao buscar atos comuns");
  return r.json();
}
