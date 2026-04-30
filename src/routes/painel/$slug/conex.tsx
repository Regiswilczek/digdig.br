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

function radiusFor(n: AnyNode, isRootView: boolean = false): number {
  if (n.tipo === "pessoa") {
    const icp = n.icp || 0;
    // Estado inicial (poucos nós, nenhuma aresta): pessoas viram avatares grandes.
    const min = isRootView ? 22 : 10;
    const max = isRootView ? 38 : 32;
    return Math.min(max, Math.max(min, min + Math.sqrt(icp) * 3));
  }
  if (n.tipo === "ato") {
    return Math.min(16, Math.max(6, 6 + Math.log2((n.pessoas_count || 1) + 1) * 2));
  }
  return Math.min(22, Math.max(10, 10 + Math.log2((n.atos_count || 1) + 1) * 2.2));
}

function iniciaisDe(nome: string): string {
  const partes = nome
    .replace(/\b(de|da|do|das|dos|e|von|van|del)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  if (partes.length === 0) return nome.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function drawNode(
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedKey: string | null,
  hoveredKey: string | null,
  highlightedKeys: Set<string>,
  isRootView: boolean = false,
) {
  const r = radiusFor(node.raw, isRootView);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isSelected = node._key === selectedKey;
  const isHovered = node._key === hoveredKey;
  const isHighlighted = highlightedKeys.has(node._key);
  const dimmed = highlightedKeys.size > 0 && !isHighlighted && !isSelected && !isHovered;
  const alpha = dimmed ? 0.25 : 1;

  // Glow do hover/selection — desenhado primeiro (debaixo)
  if (isSelected || isHovered) {
    ctx.save();
    ctx.globalAlpha = isSelected ? 0.35 : 0.2;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(x, y, r + 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();

  if (node.tipo === "pessoa") {
    const p = node.raw as GrafoNodePessoa;
    const cor = corPorCategoria(p.cor_categoria);
    ctx.fillStyle = cor;
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 1.5 / globalScale;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // Iniciais brancas dentro do círculo (só se grande o bastante)
    if (r >= 14) {
      const inits = iniciaisDe(p.nome);
      ctx.fillStyle = "#fff";
      const fontSize = r * 0.78;
      ctx.font = `600 ${fontSize}px Inter Tight, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(inits, x, y + 0.5);
    }
  } else if (node.tipo === "ato") {
    const cor = corPorNivel((node.raw as GrafoNodeAto).nivel_alerta);
    ctx.fillStyle = cor;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.lineWidth = 1.5 / globalScale;
    ctx.strokeStyle = "#fff";
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
    ctx.lineWidth = 1.5 / globalScale;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }
  ctx.restore();

  // Anel de seleção (desenhado por cima da forma)
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
    ctx.lineWidth = 2.5 / globalScale;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
  } else if (isHovered) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5 / globalScale;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
  }

  // Label — sempre visível no estado inicial (poucos nós, nenhuma aresta);
  // depois só pra selecionados/hovered/importantes pra evitar poluição.
  const importante =
    (node.tipo === "pessoa" && ((node.raw as GrafoNodePessoa).icp || 0) >= 8) ||
    node.tipo === "tag";
  const showLabel =
    !dimmed &&
    (isRootView || isSelected || isHovered || importante) &&
    globalScale > 0.4;

  if (showLabel) {
    const fontSize = Math.max(10, 11 / globalScale);
    ctx.font = `${fontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let label = "";
    if (node.tipo === "pessoa") {
      const p = node.raw as GrafoNodePessoa;
      // Pessoa: 2 primeiros nomes só (mais legível e cabe na pill)
      const partes = p.nome
        .replace(/\b(de|da|do|das|dos|e|von|van|del)\b/gi, "")
        .trim()
        .split(/\s+/)
        .filter((s) => s.length >= 2);
      const nm =
        partes.length >= 2 ? `${partes[0]} ${partes[partes.length - 1]}` : p.nome;
      label = nm.length > 24 ? nm.slice(0, 22) + "…" : nm;
    } else if (node.tipo === "ato") {
      const a = node.raw as GrafoNodeAto;
      label = `${a.ato_tipo.toUpperCase()} ${a.numero}`;
    } else {
      label = (node.raw as GrafoNodeTag).nome.toUpperCase();
    }

    // Pill de fundo branco para legibilidade sobre os outros nós
    const labelY = y + r + 5;
    const padX = 5 / globalScale;
    const padY = 2.5 / globalScale;
    const textWidth = ctx.measureText(label).width;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = isSelected || isHovered ? INK : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5 / globalScale;
    const pillW = textWidth + padX * 2;
    const pillH = fontSize + padY * 2;
    const pillX = x - pillW / 2;
    const pillY = labelY - padY;
    // borda arredondada
    const radius = pillH / 2;
    ctx.beginPath();
    ctx.moveTo(pillX + radius, pillY);
    ctx.lineTo(pillX + pillW - radius, pillY);
    ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + radius, radius);
    ctx.lineTo(pillX + pillW, pillY + pillH - radius);
    ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - radius, pillY + pillH, radius);
    ctx.lineTo(pillX + radius, pillY + pillH);
    ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - radius, radius);
    ctx.lineTo(pillX, pillY + radius);
    ctx.arcTo(pillX, pillY, pillX + radius, pillY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isSelected || isHovered ? INK : MUTED;
    ctx.fillText(label, x, labelY);
  }
}

function drawLink(
  link: FGLink,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedKey: string | null,
  hoveredKey: string | null,
  highlightedEdgeKeys: Set<string>,
) {
  const a = link.source as FGNode;
  const b = link.target as FGNode;
  if (typeof a !== "object" || typeof b !== "object") return;
  const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
  const conectaFocus =
    (selectedKey != null && (a._key === selectedKey || b._key === selectedKey)) ||
    (hoveredKey != null && (a._key === hoveredKey || b._key === hoveredKey));
  const isHighlighted = highlightedEdgeKeys.has(link._key);
  const dimmed = (selectedKey || hoveredKey) && !conectaFocus && !isHighlighted;

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.15 : 1;
  ctx.beginPath();
  ctx.setLineDash([]);

  if (link.kind === "co_aparicao") {
    const e = link.raw as GrafoEdgePP;
    const w = Math.min(4.5, Math.max(0.6, Math.log2((e.atos_em_comum || 1) + 1)));
    ctx.lineWidth = (conectaFocus ? w + 0.8 : w) / globalScale;
    let cor = BORDER;
    if (e.gravidade_max === "critica") cor = COR_ALERTA.vermelho;
    else if (e.gravidade_max === "alta") cor = COR_ALERTA.laranja;
    else if (e.gravidade_max === "media") cor = COR_ALERTA.amarelo;
    else cor = "#bdbab0";
    ctx.strokeStyle = cor;
  } else if (link.kind === "aparicao") {
    const e = link.raw as GrafoEdgePA;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = (conectaFocus ? 1.6 : 1.0) / globalScale;
    const cor =
      e.tipo_aparicao === "processado" || e.tipo_aparicao === "exonerado"
        ? COR_ALERTA.laranja
        : SUBTLE;
    ctx.strokeStyle = cor;
  } else {
    // atribuicao_tag
    ctx.lineWidth = (conectaFocus ? 1.0 : 0.6) / globalScale;
    ctx.strokeStyle = conectaFocus ? INK : "#cbc6b8";
  }

  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Componente principal ────────────────────────────────────────────────

function ConexPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [state, dispatch] = useReducer(reducer, initialState);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: AnyNode;
  } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Painéis laterais
  const [atosComuns, setAtosComuns] = useState<{
    data: AtosComunsResponse | null;
    nomeA: string;
    nomeB: string;
    loading: boolean;
  } | null>(null);

  // Tags disponíveis (combobox de filtro)
  const [tagsDisponiveis, setTagsDisponiveis] = useState<{ codigo: string; nome: string }[]>([]);

  // Carrega raiz — só pessoas no canvas; tags ficam no combobox de filtro
  useEffect(() => {
    let alive = true;
    dispatch({ type: "loading", on: true });
    // Uma chamada: pega pessoas (vão pro canvas) + lista de tags (só pro combobox)
    fetchGrafoRaiz(slug, { limit: 18, icp_min: 0, incluir_tags_top: 30 })
      .then((data) => {
        if (!alive) return;
        // Salva tags pro combobox antes de remover do payload
        setTagsDisponiveis(
          data.nodes_tags.map((t) => ({ codigo: t.codigo, nome: t.nome }))
        );
        // Merge só pessoas no canvas — descarta tags pra não poluir o estado inicial
        dispatch({
          type: "merge",
          data: { ...data, nodes_tags: [] },
        });
        dispatch({ type: "loading", on: false });
      })
      .catch((err) => {
        if (!alive) return;
        dispatch({ type: "error", msg: err.message ?? "Erro ao carregar grafo" });
      });
    return () => { alive = false; };
  }, [slug]);

  // Auto-zoom-to-fit quando dados mudam
  useEffect(() => {
    if (!fgRef.current || state.nodes.size === 0) return;
    const t = setTimeout(() => {
      try {
        fgRef.current.zoomToFit(400, 80);
      } catch {
        /* fg ainda não pronto */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [state.nodes.size]);

  // Tuning das forças d3 — repulsão maior + link distance maior pra evitar overlap
  useEffect(() => {
    if (!fgRef.current) return;
    const t = setTimeout(() => {
      try {
        const charge = fgRef.current.d3Force?.("charge");
        if (charge && typeof charge.strength === "function") charge.strength(-180);
        const link = fgRef.current.d3Force?.("link");
        if (link && typeof link.distance === "function") link.distance(70);
        fgRef.current.d3ReheatSimulation?.();
      } catch {
        /* fg ainda não pronto */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [state.nodes.size]);

  // Resize observer + mousemove pra rastrear posição do tooltip
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    el.addEventListener("mousemove", onMove);

    return () => {
      ro.disconnect();
      el.removeEventListener("mousemove", onMove);
    };
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

  // Estado inicial = nenhuma aresta no canvas (apenas top pessoas).
  // Ativa renderização "avatar gigante com iniciais + nome" pra evitar
  // a sensação de "página vazia com pontos espalhados".
  const isRootView = useMemo(() => {
    // Considera root se temos pessoas mas zero arestas
    return state.edges.size === 0 && state.nodes.size > 0;
  }, [state.edges.size, state.nodes.size]);

  // Conjunto de nós/arestas conectados ao selecionado/hover (para destacar e dimar o resto)
  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    const focusKey = selectedKey ?? hoveredKey;
    if (!focusKey) return { highlightedNodes: new Set<string>(), highlightedEdges: new Set<string>() };
    const nodes = new Set<string>([focusKey]);
    const edges = new Set<string>();
    fgLinks.forEach((l) => {
      const s = (l.source as FGNode)._key ?? (l.source as unknown as string);
      const t = (l.target as FGNode)._key ?? (l.target as unknown as string);
      if (s === focusKey || t === focusKey) {
        edges.add(l._key);
        nodes.add(s);
        nodes.add(t);
      }
    });
    return { highlightedNodes: nodes, highlightedEdges: edges };
  }, [selectedKey, hoveredKey, fgLinks]);

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
        <div
          ref={containerRef}
          className="flex-1 relative"
          style={{
            // Vinheta sutil — papel com leve gradiente radial
            background: `radial-gradient(ellipse at center, ${PAPER} 0%, #f3f0e7 100%)`,
          }}
        >
          <ForceGraph2D
            ref={fgRef}
            width={size.w}
            height={size.h}
            graphData={{ nodes: fgNodes, links: fgLinks }}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={1}
            cooldownTicks={150}
            warmupTicks={40}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
            linkDirectionalParticles={0}
            nodeCanvasObject={(node: any, ctx, globalScale) =>
              drawNode(
                node as FGNode,
                ctx,
                globalScale,
                selectedKey,
                hoveredKey,
                highlightedNodes,
                isRootView,
              )
            }
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const r = radiusFor((node as FGNode).raw, isRootView);
              const x = node.x ?? 0, y = node.y ?? 0;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
              ctx.fill();
            }}
            linkCanvasObjectMode={() => "replace"}
            linkCanvasObject={(link: any, ctx, globalScale) =>
              drawLink(
                link as FGLink,
                ctx,
                globalScale,
                selectedKey,
                hoveredKey,
                highlightedEdges,
              )
            }
            onNodeClick={handleNodeClick as any}
            onLinkClick={handleLinkClick as any}
            onNodeHover={(node: any) => {
              const fgn = node as FGNode | null;
              setHoveredKey(fgn?._key ?? null);
              if (containerRef.current) {
                containerRef.current.style.cursor = node ? "pointer" : "grab";
              }
              if (fgn) {
                setTooltip({
                  x: mousePosRef.current.x,
                  y: mousePosRef.current.y,
                  node: fgn.raw,
                });
              } else {
                setTooltip(null);
              }
            }}
            onLinkHover={(link: any) => {
              if (containerRef.current && !state.selected.kind) {
                containerRef.current.style.cursor = link ? "pointer" : "grab";
              }
            }}
          />

          {/* Tooltip rico ao hover */}
          {tooltip && hoveredKey && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: Math.min(tooltip.x + 14, size.w - 240),
                top: Math.min(tooltip.y + 14, size.h - 110),
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                padding: "10px 12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontFamily: MONO,
                minWidth: 180,
                maxWidth: 280,
                zIndex: 10,
              }}
            >
              {tooltip.node.tipo === "pessoa" && (
                <>
                  <p
                    className="text-[11.5px] font-medium leading-tight"
                    style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.01em" }}
                  >
                    {(tooltip.node as GrafoNodePessoa).nome}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    {(tooltip.node as GrafoNodePessoa).cargo || "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[9.5px]" style={{ color: SUBTLE }}>
                    <span>
                      ICP{" "}
                      <strong style={{ color: INK }}>
                        {(tooltip.node as GrafoNodePessoa).icp != null
                          ? (tooltip.node as GrafoNodePessoa).icp!.toFixed(2)
                          : "—"}
                      </strong>
                    </span>
                    <span>
                      Atos{" "}
                      <strong style={{ color: INK }}>
                        {(tooltip.node as GrafoNodePessoa).total_aparicoes}
                      </strong>
                    </span>
                  </div>
                  {(tooltip.node as GrafoNodePessoa).suspeito && (
                    <p
                      className="text-[9px] mt-1.5 uppercase tracking-wider"
                      style={{ color: COR_ALERTA.vermelho }}
                    >
                      ⚠ marcado como suspeito
                    </p>
                  )}
                  <p className="text-[9px] mt-2 uppercase tracking-wider" style={{ color: ACCENT }}>
                    clique para expandir
                  </p>
                </>
              )}
              {tooltip.node.tipo === "ato" && (
                <>
                  <p
                    className="text-[11.5px] font-medium leading-tight"
                    style={{ color: INK, fontFamily: MONO }}
                  >
                    {(tooltip.node as GrafoNodeAto).ato_tipo.toUpperCase()}{" "}
                    {(tooltip.node as GrafoNodeAto).numero}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    {(tooltip.node as GrafoNodeAto).data_publicacao || "data ?"}
                  </p>
                  {(tooltip.node as GrafoNodeAto).nivel_alerta && (
                    <p
                      className="text-[9.5px] mt-1.5 uppercase tracking-wider"
                      style={{ color: corPorNivel((tooltip.node as GrafoNodeAto).nivel_alerta) }}
                    >
                      Nível {(tooltip.node as GrafoNodeAto).nivel_alerta}
                    </p>
                  )}
                </>
              )}
              {tooltip.node.tipo === "tag" && (
                <>
                  <p
                    className="text-[11.5px] font-medium leading-tight"
                    style={{ color: INK, fontFamily: TIGHT }}
                  >
                    {(tooltip.node as GrafoNodeTag).nome}
                  </p>
                  <p className="text-[9.5px] mt-0.5 uppercase tracking-wider" style={{ color: SUBTLE }}>
                    {(tooltip.node as GrafoNodeTag).codigo}
                  </p>
                  <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                    {(tooltip.node as GrafoNodeTag).atos_count} atos · gravidade{" "}
                    {(tooltip.node as GrafoNodeTag).gravidade_predominante}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Empty-state: pessoas no canvas mas ainda sem expansão (0 arestas).
              Posicionado no topo central pra não cobrir os avatares. */}
          {fgNodes.length > 0 && fgLinks.length === 0 && !state.loading && (
            <div
              className="absolute pointer-events-none flex items-center gap-3 px-4 py-2"
              style={{
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(255,255,255,0.92)",
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                fontFamily: MONO,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="text-[9.5px] uppercase tracking-[0.22em]"
                style={{ color: ACCENT }}
              >
                ▮ {fgNodes.length} concentradores
              </span>
              <span style={{ color: BORDER }}>│</span>
              <span className="text-[10.5px]" style={{ color: INK }}>
                clique numa pessoa para expandir conexões
              </span>
            </div>
          )}

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
