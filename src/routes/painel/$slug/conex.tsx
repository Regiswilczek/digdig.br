import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-2d";
import { ArrowLeft, X, Filter, Sliders } from "lucide-react";

import {
  fetchGrafoRaiz,
  fetchGrafoExpandirPessoa,
  fetchGrafoExpandirTag,
  fetchAtosComunsPessoas,
  type GrafoNodePessoa,
  type GrafoNodeAto,
  type GrafoNodeTag,
  type GrafoEdgePP,
  type GrafoEdgePA,
  type GrafoEdgeAT,
  type GrafoResponse,
  type AtosComunsResponse,
} from "../../../lib/api-auth";
import {
  INK, PAPER, BORDER, MUTED, SUBTLE, ACCENT,
  COR_ALERTA, MONO, TIGHT, corPorCategoria, corPorNivel,
} from "../../../components/grafo/tokens";
import { PainelLateralPessoa } from "../../../components/grafo/PainelLateralPessoa";
import { PainelLateralAto } from "../../../components/grafo/PainelLateralAto";
import { PainelLateralTag } from "../../../components/grafo/PainelLateralTag";
import { PainelLateralAtosComuns } from "../../../components/grafo/PainelLateralAtosComuns";

// @ts-expect-error TanStack autogen pega o filename
export const Route = createFileRoute("/painel/$slug/conex")({
  component: ConexPage,
});

const NODE_CAP = 200;

// ─── State / Reducer ──────────────────────────────────────────────────────

type AnyNode =
  | (GrafoNodePessoa & { _key: string })
  | (GrafoNodeAto & { _key: string })
  | (GrafoNodeTag & { _key: string });

type AnyEdge =
  | (GrafoEdgePP & { _key: string })
  | (GrafoEdgePA & { _key: string })
  | (GrafoEdgeAT & { _key: string });

interface SelState {
  kind: "pessoa" | "ato" | "tag" | "edge_pp" | null;
  id: string | null;
  // para edge_pp:
  pessoa_a_id?: string;
  pessoa_b_id?: string;
}

interface State {
  nodes: Map<string, AnyNode>;
  edges: Map<string, AnyEdge>;
  expanded: Set<string>; // ids de pessoas/tags já expandidas
  loading: boolean;
  error: string | null;
  selected: SelState;
  filtros: {
    icp_min: number;
    suspeitos_only: boolean;
    mostrar_atos: boolean;
    mostrar_tags: boolean;
    tag_filter: string | null; // codigo da tag em modo drill-down
  };
}

const initialState: State = {
  nodes: new Map(),
  edges: new Map(),
  expanded: new Set(),
  loading: false,
  error: null,
  selected: { kind: null, id: null },
  filtros: {
    icp_min: 0,
    suspeitos_only: false,
    mostrar_atos: true,
    mostrar_tags: true,
    tag_filter: null,
  },
};

type Action =
  | { type: "loading"; on: boolean }
  | { type: "error"; msg: string | null }
  | { type: "merge"; data: GrafoResponse; expanded_id?: string }
  | { type: "replace"; data: GrafoResponse; expanded_id?: string }
  | { type: "select"; sel: SelState }
  | { type: "set_filter"; patch: Partial<State["filtros"]> }
  | { type: "reset" };

function nodeKey(n: { tipo: string; id?: string; codigo?: string }): string {
  if (n.tipo === "tag") return `tag:${n.codigo}`;
  return `${n.tipo}:${n.id}`;
}

function edgeKey(e: { source: string; target: string; kind: string }): string {
  // canonicalize co_aparicao independent de direção
  if (e.kind === "co_aparicao") {
    const [a, b] = [e.source, e.target].sort();
    return `${e.kind}:${a}:${b}`;
  }
  return `${e.kind}:${e.source}:${e.target}`;
}

function mergeData(state: State, data: GrafoResponse, expanded_id?: string): State {
  const nodes = new Map(state.nodes);
  const edges = new Map(state.edges);

  for (const p of data.nodes_pessoas) {
    const k = nodeKey({ tipo: "pessoa", id: p.id });
    if (!nodes.has(k)) nodes.set(k, { ...p, _key: k });
  }
  for (const a of data.nodes_atos) {
    const k = nodeKey({ tipo: "ato", id: a.id });
    if (!nodes.has(k)) nodes.set(k, { ...a, _key: k });
  }
  for (const t of data.nodes_tags) {
    const k = nodeKey({ tipo: "tag", codigo: t.codigo });
    if (!nodes.has(k)) nodes.set(k, { ...t, _key: k });
  }
  for (const e of data.edges_pessoa_pessoa) {
    const k = edgeKey(e);
    if (!edges.has(k)) edges.set(k, { ...e, _key: k });
  }
  for (const e of data.edges_pessoa_ato) {
    const k = edgeKey(e);
    if (!edges.has(k)) edges.set(k, { ...e, _key: k });
  }
  for (const e of data.edges_ato_tag) {
    const k = edgeKey(e);
    if (!edges.has(k)) edges.set(k, { ...e, _key: k });
  }

  // Cap de performance — descarta nós não-expandidos com menor grau
  if (nodes.size > NODE_CAP) {
    const grau = new Map<string, number>();
    edges.forEach((e) => {
      const sk = e.kind === "atribuicao_tag"
        ? `tag:${e.target}`
        : `${(nodes.get(`pessoa:${e.source}`) ? "pessoa" : nodes.get(`ato:${e.source}`) ? "ato" : "tag")}:${e.source}`;
      const tk = e.kind === "atribuicao_tag"
        ? `ato:${e.source}`
        : `${(nodes.get(`pessoa:${e.target}`) ? "pessoa" : nodes.get(`ato:${e.target}`) ? "ato" : "tag")}:${e.target}`;
      grau.set(sk, (grau.get(sk) || 0) + 1);
      grau.set(tk, (grau.get(tk) || 0) + 1);
    });

    const removiveis: string[] = [];
    nodes.forEach((n, k) => {
      if (!state.expanded.has(k)) removiveis.push(k);
    });
    removiveis.sort((a, b) => (grau.get(a) || 0) - (grau.get(b) || 0));
    for (const k of removiveis) {
      if (nodes.size <= NODE_CAP) break;
      nodes.delete(k);
    }
    // Limpa edges órfãs
    edges.forEach((e, k) => {
      const sk = e.kind === "atribuicao_tag"
        ? `tag:${e.target}` : null;
      const tk = e.kind === "atribuicao_tag"
        ? `ato:${e.source}` : null;
      const hasS = sk ? nodes.has(sk) : true;
      const hasT = tk ? nodes.has(tk) : true;
      if (!hasS || !hasT) edges.delete(k);
    });
  }

  const expanded = new Set(state.expanded);
  if (expanded_id) expanded.add(expanded_id);

  return { ...state, nodes, edges, expanded };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, loading: action.on };
    case "error":
      return { ...state, error: action.msg, loading: false };
    case "merge":
      return mergeData(state, action.data, action.expanded_id);
    case "replace": {
      const fresh = mergeData(
        { ...state, nodes: new Map(), edges: new Map(), expanded: new Set() },
        action.data,
        action.expanded_id,
      );
      return { ...fresh, selected: { kind: null, id: null } };
    }
    case "select":
      return { ...state, selected: action.sel };
    case "set_filter":
      return { ...state, filtros: { ...state.filtros, ...action.patch } };
    case "reset":
      return { ...initialState };
  }
}

// ─── ForceGraph helpers ──────────────────────────────────────────────────

interface FGNode extends NodeObject {
  _key: string;
  tipo: "pessoa" | "ato" | "tag";
  raw: AnyNode;
}

interface FGLink extends LinkObject {
  _key: string;
  kind: "co_aparicao" | "aparicao" | "atribuicao_tag";
  raw: AnyEdge;
}

function radiusFor(n: AnyNode): number {
  if (n.tipo === "pessoa") {
    const icp = n.icp || 0;
    return Math.min(28, Math.max(4, 4 + Math.sqrt(icp) * 3));
  }
  if (n.tipo === "ato") {
    return Math.min(14, Math.max(3, 3 + Math.log2((n.pessoas_count || 1) + 1) * 2));
  }
  return Math.min(16, Math.max(4, 4 + Math.log2((n.atos_count || 1) + 1) * 2));
}

function drawNode(
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedKey: string | null,
) {
  const r = radiusFor(node.raw);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isSelected = node._key === selectedKey;

  ctx.beginPath();

  if (node.tipo === "pessoa") {
    const cor = corPorCategoria((node.raw as GrafoNodePessoa).cor_categoria);
    ctx.fillStyle = cor;
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = BORDER;
    ctx.stroke();
  } else if (node.tipo === "ato") {
    const cor = corPorNivel((node.raw as GrafoNodeAto).nivel_alerta);
    ctx.fillStyle = cor;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = BORDER;
    ctx.strokeRect(x - r, y - r, r * 2, r * 2);
  } else {
    // triângulo
    const cor = corPorCategoria((node.raw as GrafoNodeTag).cor_categoria);
    ctx.fillStyle = cor;
    ctx.moveTo(x, y - r);
    ctx.lineTo(x - r, y + r * 0.85);
    ctx.lineTo(x + r, y + r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = BORDER;
    ctx.stroke();
  }

  // Anel de seleção
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
  }

  // Label
  const showLabel = (() => {
    if (node._key === selectedKey) return true;
    if (node.tipo === "pessoa") return ((node.raw as GrafoNodePessoa).icp || 0) >= 5;
    if (node.tipo === "tag") return true;
    return false;
  })();
  if (showLabel && globalScale > 0.6) {
    ctx.font = `${Math.max(9, 11 / globalScale)}px JetBrains Mono, monospace`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    let label = "";
    if (node.tipo === "pessoa") {
      const nm = (node.raw as GrafoNodePessoa).nome;
      label = nm.length > 28 ? nm.slice(0, 26) + "…" : nm;
    } else if (node.tipo === "ato") {
      const a = node.raw as GrafoNodeAto;
      label = `${a.ato_tipo.toUpperCase()} ${a.numero}`;
    } else {
      label = (node.raw as GrafoNodeTag).nome.toUpperCase();
    }
    ctx.fillText(label, x, y + r + 3);
  }
}

function drawLink(
  link: FGLink,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedKey: string | null,
) {
  const a = link.source as FGNode;
  const b = link.target as FGNode;
  if (typeof a !== "object" || typeof b !== "object") return;
  const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
  const conectaSel =
    selectedKey != null && (a._key === selectedKey || b._key === selectedKey);

  ctx.beginPath();
  ctx.setLineDash([]);

  if (link.kind === "co_aparicao") {
    const e = link.raw as GrafoEdgePP;
    const w = Math.min(4, Math.max(0.5, Math.log2((e.atos_em_comum || 1) + 1)));
    ctx.lineWidth = w / globalScale;
    let cor = BORDER;
    if (e.gravidade_max === "critica") cor = COR_ALERTA.vermelho;
    else if (e.gravidade_max === "alta") cor = COR_ALERTA.laranja;
    else if (e.gravidade_max === "media") cor = COR_ALERTA.amarelo;
    ctx.strokeStyle = conectaSel ? cor : cor + (e.gravidade_max ? "B0" : "70");
  } else if (link.kind === "aparicao") {
    const e = link.raw as GrafoEdgePA;
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1 / globalScale;
    const cor = (e.tipo_aparicao === "processado" || e.tipo_aparicao === "exonerado")
      ? COR_ALERTA.laranja : SUBTLE;
    ctx.strokeStyle = conectaSel ? cor : cor + "80";
  } else {
    // atribuicao_tag
    ctx.lineWidth = 0.5 / globalScale;
    ctx.strokeStyle = conectaSel ? INK : BORDER + "60";
  }

  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── Componente principal ────────────────────────────────────────────────

function ConexPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [state, dispatch] = useReducer(reducer, initialState);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Painéis laterais
  const [atosComuns, setAtosComuns] = useState<{
    data: AtosComunsResponse | null;
    nomeA: string;
    nomeB: string;
    loading: boolean;
  } | null>(null);

  // Tags disponíveis (combobox de filtro)
  const [tagsDisponiveis, setTagsDisponiveis] = useState<{ codigo: string; nome: string }[]>([]);

  // Carrega raiz
  useEffect(() => {
    let alive = true;
    dispatch({ type: "loading", on: true });
    fetchGrafoRaiz(slug, { limit: 15, icp_min: 0, incluir_tags_top: 12 })
      .then((data) => {
        if (!alive) return;
        dispatch({ type: "merge", data });
        dispatch({ type: "loading", on: false });
        setTagsDisponiveis(
          data.nodes_tags.map((t) => ({ codigo: t.codigo, nome: t.nome }))
        );
      })
      .catch((err) => {
        if (!alive) return;
        dispatch({ type: "error", msg: err.message ?? "Erro ao carregar grafo" });
      });
    return () => { alive = false; };
  }, [slug]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Filtra nós/edges client-side
  const fgNodes: FGNode[] = useMemo(() => {
    const out: FGNode[] = [];
    state.nodes.forEach((n) => {
      // Filtros client-side
      if (n.tipo === "pessoa") {
        const p = n as GrafoNodePessoa & { _key: string };
        if (state.filtros.suspeitos_only && !p.suspeito) return;
        if ((p.icp || 0) < state.filtros.icp_min && !p.suspeito) return;
      }
      if (n.tipo === "ato" && !state.filtros.mostrar_atos) return;
      if (n.tipo === "tag" && !state.filtros.mostrar_tags) return;
      out.push({
        id: n._key,
        _key: n._key,
        tipo: n.tipo,
        raw: n,
      });
    });
    return out;
  }, [state.nodes, state.filtros]);

  const fgLinks: FGLink[] = useMemo(() => {
    const ids = new Set(fgNodes.map((n) => n._key));
    const out: FGLink[] = [];
    state.edges.forEach((e) => {
      let sKey: string;
      let tKey: string;
      if (e.kind === "co_aparicao") {
        sKey = `pessoa:${e.source}`; tKey = `pessoa:${e.target}`;
      } else if (e.kind === "aparicao") {
        sKey = `pessoa:${e.source}`; tKey = `ato:${e.target}`;
      } else {
        sKey = `ato:${e.source}`; tKey = `tag:${e.target}`;
      }
      if (!ids.has(sKey) || !ids.has(tKey)) return;
      out.push({
        source: sKey,
        target: tKey,
        _key: e._key,
        kind: e.kind,
        raw: e,
      });
    });
    return out;
  }, [state.edges, fgNodes]);

  // Selected key (formato `tipo:id`)
  const selectedKey = useMemo(() => {
    const s = state.selected;
    if (!s.kind || !s.id) return null;
    if (s.kind === "tag") return `tag:${s.id}`;
    if (s.kind === "edge_pp") return null;
    return `${s.kind}:${s.id}`;
  }, [state.selected]);

  // Handlers
  const handleNodeClick = useCallback(async (node: FGNode) => {
    if (node.tipo === "pessoa") {
      const p = node.raw as GrafoNodePessoa;
      dispatch({ type: "select", sel: { kind: "pessoa", id: p.id } });
      // Expande se ainda não foi expandida
      if (!state.expanded.has(node._key)) {
        try {
          dispatch({ type: "loading", on: true });
          const data = await fetchGrafoExpandirPessoa(slug, p.id, {
            limit_vizinhos: 12,
            peso_min: 2,
            incluir_atos: state.filtros.mostrar_atos,
            incluir_tags: state.filtros.mostrar_tags,
            limit_atos: 5,
          });
          dispatch({ type: "merge", data, expanded_id: node._key });
          dispatch({ type: "loading", on: false });
        } catch (err: any) {
          dispatch({ type: "error", msg: err.message });
        }
      }
    } else if (node.tipo === "ato") {
      const a = node.raw as GrafoNodeAto;
      dispatch({ type: "select", sel: { kind: "ato", id: a.id } });
    } else {
      const t = node.raw as GrafoNodeTag;
      dispatch({ type: "select", sel: { kind: "tag", id: t.codigo } });
      if (!state.expanded.has(node._key)) {
        try {
          dispatch({ type: "loading", on: true });
          const data = await fetchGrafoExpandirTag(slug, t.codigo, {
            limit_atos: 12,
            incluir_pessoas: true,
          });
          dispatch({ type: "merge", data, expanded_id: node._key });
          dispatch({ type: "loading", on: false });
        } catch (err: any) {
          dispatch({ type: "error", msg: err.message });
        }
      }
    }
  }, [slug, state.expanded, state.filtros]);

  const handleLinkClick = useCallback(async (link: FGLink) => {
    if (link.kind === "co_aparicao") {
      const e = link.raw as GrafoEdgePP;
      const a = state.nodes.get(`pessoa:${e.source}`) as GrafoNodePessoa & { _key: string } | undefined;
      const b = state.nodes.get(`pessoa:${e.target}`) as GrafoNodePessoa & { _key: string } | undefined;
      if (!a || !b) return;
      dispatch({ type: "select", sel: { kind: "edge_pp", id: link._key, pessoa_a_id: e.source, pessoa_b_id: e.target } });
      setAtosComuns({ data: { pessoa_a_id: e.source, pessoa_b_id: e.target, atos: [] }, nomeA: a.nome, nomeB: b.nome, loading: true });
      try {
        const data = await fetchAtosComunsPessoas(slug, e.source, e.target);
        setAtosComuns({ data, nomeA: a.nome, nomeB: b.nome, loading: false });
      } catch (err: any) {
        dispatch({ type: "error", msg: err.message });
      }
    } else if (link.kind === "aparicao") {
      const e = link.raw as GrafoEdgePA;
      dispatch({ type: "select", sel: { kind: "ato", id: e.target } });
    } else {
      const e = link.raw as GrafoEdgeAT;
      dispatch({ type: "select", sel: { kind: "tag", id: e.target } });
    }
  }, [slug, state.nodes]);

  const handleFiltrarPorTag = useCallback(async (codigo: string) => {
    dispatch({ type: "loading", on: true });
    dispatch({ type: "set_filter", patch: { tag_filter: codigo } });
    try {
      const data = await fetchGrafoExpandirTag(slug, codigo, {
        limit_atos: 20,
        incluir_pessoas: true,
      });
      dispatch({ type: "replace", data, expanded_id: `tag:${codigo}` });
      dispatch({ type: "loading", on: false });
    } catch (err: any) {
      dispatch({ type: "error", msg: err.message });
    }
  }, [slug]);

  const handleLimparFiltroTag = useCallback(async () => {
    dispatch({ type: "loading", on: true });
    dispatch({ type: "set_filter", patch: { tag_filter: null } });
    try {
      const data = await fetchGrafoRaiz(slug, { limit: 15, icp_min: 0, incluir_tags_top: 12 });
      dispatch({ type: "replace", data });
      dispatch({ type: "loading", on: false });
    } catch (err: any) {
      dispatch({ type: "error", msg: err.message });
    }
  }, [slug]);

  // Painel lateral selecionado
  const painelLateral = useMemo(() => {
    const sel = state.selected;
    if (!sel.kind) return null;

    if (sel.kind === "edge_pp" && atosComuns) {
      return (
        <PainelLateralAtosComuns
          data={atosComuns.data ?? { pessoa_a_id: "", pessoa_b_id: "", atos: [] }}
          nomeA={atosComuns.nomeA}
          nomeB={atosComuns.nomeB}
          slug={slug}
          loading={atosComuns.loading}
        />
      );
    }

    if (sel.kind === "pessoa") {
      const p = state.nodes.get(`pessoa:${sel.id}`) as GrafoNodePessoa & { _key: string } | undefined;
      if (!p) return null;
      // Vizinhos: pessoas conectadas por co_aparicao
      const edgesDela: GrafoEdgePP[] = [];
      const vizinhosIds = new Set<string>();
      state.edges.forEach((e) => {
        if (e.kind === "co_aparicao" && (e.source === sel.id || e.target === sel.id)) {
          edgesDela.push(e as GrafoEdgePP);
          vizinhosIds.add(e.source === sel.id ? e.target : e.source);
        }
      });
      const vizinhos: GrafoNodePessoa[] = [];
      vizinhosIds.forEach((vid) => {
        const v = state.nodes.get(`pessoa:${vid}`);
        if (v && v.tipo === "pessoa") vizinhos.push(v as GrafoNodePessoa);
      });
      const atos: GrafoNodeAto[] = [];
      state.edges.forEach((e) => {
        if (e.kind === "aparicao" && e.source === sel.id) {
          const ato = state.nodes.get(`ato:${e.target}`);
          if (ato && ato.tipo === "ato") atos.push(ato as GrafoNodeAto);
        }
      });
      return (
        <PainelLateralPessoa
          pessoa={p}
          vizinhos={vizinhos}
          edgesPP={edgesDela}
          atos={atos}
          slug={slug}
          onExpandirVizinho={(id) => {
            handleNodeClick({ _key: `pessoa:${id}`, id: `pessoa:${id}`, tipo: "pessoa", raw: state.nodes.get(`pessoa:${id}`)! } as FGNode);
          }}
          onClicarAto={(ato) => dispatch({ type: "select", sel: { kind: "ato", id: ato.id } })}
        />
      );
    }

    if (sel.kind === "ato") {
      const a = state.nodes.get(`ato:${sel.id}`) as GrafoNodeAto & { _key: string } | undefined;
      if (!a) return null;
      const edgesAT: GrafoEdgeAT[] = [];
      state.edges.forEach((e) => {
        if (e.kind === "atribuicao_tag" && e.source === sel.id) edgesAT.push(e as GrafoEdgeAT);
      });
      const tagsDoAto: GrafoNodeTag[] = [];
      edgesAT.forEach((e) => {
        const t = state.nodes.get(`tag:${e.target}`);
        if (t && t.tipo === "tag") tagsDoAto.push(t as GrafoNodeTag);
      });
      return (
        <PainelLateralAto
          ato={a}
          tagsDoAto={tagsDoAto}
          edgesAT={edgesAT}
          slug={slug}
          onClicarTag={(codigo) => dispatch({ type: "select", sel: { kind: "tag", id: codigo } })}
        />
      );
    }

    if (sel.kind === "tag") {
      const t = state.nodes.get(`tag:${sel.id}`) as GrafoNodeTag & { _key: string } | undefined;
      if (!t) return null;
      const atosDaTag: GrafoNodeAto[] = [];
      const pessoasIds = new Set<string>();
      state.edges.forEach((e) => {
        if (e.kind === "atribuicao_tag" && e.target === sel.id) {
          const ato = state.nodes.get(`ato:${e.source}`);
          if (ato && ato.tipo === "ato") atosDaTag.push(ato as GrafoNodeAto);
        }
      });
      // Pessoas que aparecem em algum desses atos
      atosDaTag.forEach((ato) => {
        state.edges.forEach((e) => {
          if (e.kind === "aparicao" && e.target === ato.id) pessoasIds.add(e.source);
        });
      });
      const pessoasDaTag: GrafoNodePessoa[] = [];
      pessoasIds.forEach((pid) => {
        const p = state.nodes.get(`pessoa:${pid}`);
        if (p && p.tipo === "pessoa") pessoasDaTag.push(p as GrafoNodePessoa);
      });
      return (
        <PainelLateralTag
          tag={t}
          atosDaTag={atosDaTag}
          pessoasDaTag={pessoasDaTag}
          slug={slug}
          onClicarPessoa={(id) => {
            handleNodeClick({ _key: `pessoa:${id}`, id: `pessoa:${id}`, tipo: "pessoa", raw: state.nodes.get(`pessoa:${id}`)! } as FGNode);
          }}
          onClicarAto={(ato) => dispatch({ type: "select", sel: { kind: "ato", id: ato.id } })}
        />
      );
    }

    return null;
  }, [state.selected, state.nodes, state.edges, atosComuns, slug, handleNodeClick]);

  return (
    <div className="flex flex-col h-screen w-full" style={{ background: "#fff" }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 h-12"
        style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3">
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={"/painel/$slug" as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            params={{ slug } as any}
            className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.22em] hover:text-[#0a0a0a] transition-colors"
            style={{ color: MUTED, fontFamily: MONO, textDecoration: "none" }}
          >
            <ArrowLeft size={11} /> Painel
          </Link>
          <span style={{ color: BORDER }}>│</span>
          <h1
            className="text-[14px] font-medium"
            style={{ fontFamily: TIGHT, letterSpacing: "-0.01em" }}
          >
            Conexões / Rede de relações
          </h1>
          <span
            className="text-[9px] uppercase tracking-[0.22em] tabular-nums hidden md:inline"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            {state.nodes.size} nós · {state.edges.size} arestas
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.loading && (
            <span className="text-[9px] uppercase tracking-wider" style={{ color: ACCENT, fontFamily: MONO }}>
              ⟳ carregando
            </span>
          )}
        </div>
      </header>

      {/* Toolbar de filtros */}
      <div
        className="flex-shrink-0 flex flex-wrap items-center gap-3 px-4 md:px-8 py-2"
        style={{ background: PAPER, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <Sliders size={11} style={{ color: SUBTLE }} />
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: SUBTLE, fontFamily: MONO }}>
            Filtros
          </span>
        </div>

        {/* ICP min */}
        <label className="flex items-center gap-2 text-[10px]" style={{ color: MUTED, fontFamily: MONO }}>
          ICP ≥
          <input
            type="range"
            min={0}
            max={50}
            value={state.filtros.icp_min}
            onChange={(e) => dispatch({ type: "set_filter", patch: { icp_min: Number(e.target.value) } })}
            className="w-24"
          />
          <span className="tabular-nums" style={{ color: INK }}>{state.filtros.icp_min}</span>
        </label>

        {/* Suspeitos */}
        <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: MUTED, fontFamily: MONO }}>
          <input
            type="checkbox"
            checked={state.filtros.suspeitos_only}
            onChange={(e) => dispatch({ type: "set_filter", patch: { suspeitos_only: e.target.checked } })}
          />
          Só suspeitos
        </label>

        {/* Mostrar atos */}
        <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: MUTED, fontFamily: MONO }}>
          <input
            type="checkbox"
            checked={state.filtros.mostrar_atos}
            onChange={(e) => dispatch({ type: "set_filter", patch: { mostrar_atos: e.target.checked } })}
          />
          Mostrar atos
        </label>

        {/* Mostrar tags */}
        <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: MUTED, fontFamily: MONO }}>
          <input
            type="checkbox"
            checked={state.filtros.mostrar_tags}
            onChange={(e) => dispatch({ type: "set_filter", patch: { mostrar_tags: e.target.checked } })}
          />
          Mostrar tags
        </label>

        {/* Filtro por tag */}
        <div className="flex items-center gap-1.5">
          <select
            value={state.filtros.tag_filter ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") handleLimparFiltroTag();
              else handleFiltrarPorTag(v);
            }}
            className="text-[10px] px-2 py-1"
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              fontFamily: MONO,
              color: INK,
            }}
          >
            <option value="">— todas as tags —</option>
            {tagsDisponiveis.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.nome}
              </option>
            ))}
          </select>
          {state.filtros.tag_filter && (
            <button
              onClick={handleLimparFiltroTag}
              className="text-[9px] uppercase tracking-wider px-1.5 py-1 hover:bg-white"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              limpar
            </button>
          )}
        </div>

        {/* Cap warning */}
        {state.nodes.size >= NODE_CAP && (
          <span className="text-[9px] uppercase tracking-wider ml-auto" style={{ color: COR_ALERTA.laranja, fontFamily: MONO }}>
            ⚠ {state.nodes.size}/{NODE_CAP} nós · refine filtros
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative" style={{ background: PAPER }}>
          <ForceGraph2D
            ref={fgRef}
            width={size.w}
            height={size.h}
            graphData={{ nodes: fgNodes, links: fgLinks }}
            backgroundColor={PAPER}
            nodeRelSize={1}
            cooldownTicks={120}
            nodeCanvasObject={(node: any, ctx, globalScale) =>
              drawNode(node as FGNode, ctx, globalScale, selectedKey)
            }
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const r = radiusFor((node as FGNode).raw);
              const x = node.x ?? 0, y = node.y ?? 0;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
              ctx.fill();
            }}
            linkCanvasObjectMode={() => "replace"}
            linkCanvasObject={(link: any, ctx, globalScale) =>
              drawLink(link as FGLink, ctx, globalScale, selectedKey)
            }
            onNodeClick={handleNodeClick as any}
            onLinkClick={handleLinkClick as any}
            d3VelocityDecay={0.3}
          />

          {state.error && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-2 text-[11px]"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                borderRadius: 2,
                fontFamily: MONO,
              }}
            >
              {state.error}
              <button
                onClick={() => dispatch({ type: "error", msg: null })}
                className="ml-3"
                style={{ color: "#991b1b" }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Legenda */}
          <div
            className="absolute bottom-3 left-3 p-3 text-[10px] space-y-1"
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              fontFamily: MONO,
              color: MUTED,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COR_ALERTA.cinza }} />
              <span>Pessoa (cor por ICP)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3" style={{ background: COR_ALERTA.amarelo }} />
              <span>Ato (cor por nível)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3"
                style={{
                  background: COR_ALERTA.laranja,
                  clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                }}
              />
              <span>Tag (cor por gravidade)</span>
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        {painelLateral && (
          <aside
            className="hidden md:flex flex-col flex-shrink-0 w-[420px]"
            style={{ borderLeft: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-end p-2" style={{ background: PAPER, borderBottom: `1px solid ${BORDER}` }}>
              <button
                onClick={() => {
                  dispatch({ type: "select", sel: { kind: null, id: null } });
                  setAtosComuns(null);
                }}
                className="p-1 hover:bg-white"
                aria-label="Fechar painel"
                style={{ color: MUTED, borderRadius: 2 }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {painelLateral}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
