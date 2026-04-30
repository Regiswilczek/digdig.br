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

type ModoCanvas = "raiz" | "foco_pessoa" | "foco_tag";

interface State {
  nodes: Map<string, AnyNode>;
  edges: Map<string, AnyEdge>;
  modo: ModoCanvas;
  focoKey: string | null; // chave do nó central no modo foco_*
  navStack: { modo: ModoCanvas; focoKey: string | null; label: string }[]; // breadcrumbs
  loading: boolean;
  error: string | null;
  selected: SelState;
  filtros: {
    icp_min: number;
    suspeitos_only: boolean;
    mostrar_atos: boolean;
    mostrar_tags: boolean;
  };
}

const initialState: State = {
  nodes: new Map(),
  edges: new Map(),
  modo: "raiz",
  focoKey: null,
  navStack: [],
  loading: false,
  error: null,
  selected: { kind: null, id: null },
  filtros: {
    icp_min: 0,
    suspeitos_only: false,
    mostrar_atos: true,
    mostrar_tags: true,
  },
};

type Action =
  | { type: "loading"; on: boolean }
  | { type: "error"; msg: string | null }
  | {
      type: "set_canvas";
      data: GrafoResponse;
      modo: ModoCanvas;
      focoKey: string | null;
      pushStack?: { label: string };
    }
  | { type: "voltar"; targetIndex?: number }
  | { type: "select"; sel: SelState }
  | { type: "set_filter"; patch: Partial<State["filtros"]> };

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

function buildCanvas(data: GrafoResponse): {
  nodes: Map<string, AnyNode>;
  edges: Map<string, AnyEdge>;
} {
  const nodes = new Map<string, AnyNode>();
  const edges = new Map<string, AnyEdge>();
  for (const p of data.nodes_pessoas) {
    const k = nodeKey({ tipo: "pessoa", id: p.id });
    nodes.set(k, { ...p, _key: k });
  }
  for (const a of data.nodes_atos) {
    const k = nodeKey({ tipo: "ato", id: a.id });
    nodes.set(k, { ...a, _key: k });
  }
  for (const t of data.nodes_tags) {
    const k = nodeKey({ tipo: "tag", codigo: t.codigo });
    nodes.set(k, { ...t, _key: k });
  }
  for (const e of data.edges_pessoa_pessoa) {
    const k = edgeKey(e);
    edges.set(k, { ...e, _key: k });
  }
  for (const e of data.edges_pessoa_ato) {
    const k = edgeKey(e);
    edges.set(k, { ...e, _key: k });
  }
  for (const e of data.edges_ato_tag) {
    const k = edgeKey(e);
    edges.set(k, { ...e, _key: k });
  }
  return { nodes, edges };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, loading: action.on };
    case "error":
      return { ...state, error: action.msg, loading: false };
    case "set_canvas": {
      // Substitui completamente o canvas — sem merge, sem nós órfãos.
      const { nodes, edges } = buildCanvas(action.data);
      const stack = action.pushStack
        ? [
            ...state.navStack,
            { modo: action.modo, focoKey: action.focoKey, label: action.pushStack.label },
          ]
        : state.navStack;
      return {
        ...state,
        nodes,
        edges,
        modo: action.modo,
        focoKey: action.focoKey,
        navStack: stack,
        selected:
          action.focoKey && action.modo === "foco_pessoa"
            ? { kind: "pessoa", id: action.focoKey.replace(/^pessoa:/, "") }
            : action.focoKey && action.modo === "foco_tag"
            ? { kind: "tag", id: action.focoKey.replace(/^tag:/, "") }
            : { kind: null, id: null },
        loading: false,
      };
    }
    case "voltar": {
      // targetIndex = -1 (raiz) ou índice no navStack
      const idx = action.targetIndex ?? state.navStack.length - 2;
      const newStack = idx < 0 ? [] : state.navStack.slice(0, idx + 1);
      return {
        ...state,
        navStack: newStack,
        selected: { kind: null, id: null },
      };
    }
    case "select":
      return { ...state, selected: action.sel };
    case "set_filter":
      return { ...state, filtros: { ...state.filtros, ...action.patch } };
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

// ─── Tamanhos dos mini-cards (em pixels do canvas) ───────────────────────
// Cards são desenhados em coordenadas do mundo; seu tamanho aparente na tela
// depende do zoom (globalScale). Cards são fixos no mundo pra layout previsível.

function cardDimensions(n: AnyNode): { w: number; h: number } {
  if (n.tipo === "pessoa") return { w: 130, h: 36 };
  if (n.tipo === "ato") return { w: 100, h: 30 };
  return { w: 124, h: 30 }; // tag
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

function nomeCurto(nome: string): string {
  const partes = nome
    .replace(/\b(de|da|do|das|dos|e|von|van|del)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  const nm = partes.length >= 2
    ? `${partes[0]} ${partes[partes.length - 1]}`
    : nome;
  return nm.length > 18 ? nm.slice(0, 16) + "…" : nm;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
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
  void isRootView; // mantido pra futura customização
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isSelected = node._key === selectedKey;
  const isHovered = node._key === hoveredKey;
  const isHighlighted = highlightedKeys.has(node._key);
  const dimmed = highlightedKeys.size > 0 && !isHighlighted && !isSelected && !isHovered;
  const alpha = dimmed ? 0.3 : 1;

  // Fallback: muito zoom-out → desenha como ponto colorido (legibilidade > info)
  if (globalScale < 0.35) {
    ctx.save();
    ctx.globalAlpha = alpha;
    let cor: string = COR_ALERTA.cinza;
    if (node.tipo === "pessoa") cor = corPorCategoria((node.raw as GrafoNodePessoa).cor_categoria);
    else if (node.tipo === "ato") cor = corPorNivel((node.raw as GrafoNodeAto).nivel_alerta);
    else cor = corPorCategoria((node.raw as GrafoNodeTag).cor_categoria);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    return;
  }

  const { w, h } = cardDimensions(node.raw);
  const cornerR = 4;

  // Glow no hover/seleção (atrás do card)
  if (isSelected || isHovered) {
    ctx.save();
    ctx.globalAlpha = isSelected ? 0.18 : 0.1;
    ctx.fillStyle = ACCENT;
    drawRoundedRect(ctx, x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, cornerR + 4);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  if (node.tipo === "pessoa") {
    drawCardPessoa(node.raw as GrafoNodePessoa, x, y, w, h, cornerR, ctx, globalScale, isSelected, isHovered);
  } else if (node.tipo === "ato") {
    drawCardAto(node.raw as GrafoNodeAto, x, y, w, h, cornerR, ctx, globalScale, isSelected, isHovered);
  } else {
    drawCardTag(node.raw as GrafoNodeTag, x, y, w, h, cornerR, ctx, globalScale, isSelected, isHovered);
  }

  ctx.restore();
}

function drawCardPessoa(
  p: GrafoNodePessoa,
  x: number, y: number, w: number, h: number, r: number,
  ctx: CanvasRenderingContext2D,
  scale: number,
  isSelected: boolean,
  isHovered: boolean,
) {
  const cor = corPorCategoria(p.cor_categoria);
  const left = x - w / 2;
  const top = y - h / 2;

  // Card body
  drawRoundedRect(ctx, left, top, w, h, r);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = (isSelected ? 2.5 : isHovered ? 2 : 1) / scale;
  ctx.strokeStyle = isSelected || isHovered ? INK : BORDER;
  ctx.stroke();

  // Avatar circle (esquerda)
  const avSize = 22;
  const avX = left + 6 + avSize / 2;
  const avY = y;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(avX, avY, avSize / 2, 0, 2 * Math.PI);
  ctx.fill();

  // Iniciais
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 10.5px Inter Tight, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(iniciaisDe(p.nome), avX, avY + 0.5);

  // Nome (truncado)
  const textX = avX + avSize / 2 + 6;
  ctx.fillStyle = INK;
  ctx.font = "600 10px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(nomeCurto(p.nome), textX, y - 6);

  // Cargo + ICP (linha de baixo)
  ctx.fillStyle = MUTED;
  ctx.font = "9px JetBrains Mono, monospace";
  const cargoText = p.cargo ? p.cargo.slice(0, 14) : "—";
  const icpText = p.icp != null ? `ICP ${p.icp.toFixed(1)}` : "ICP —";
  ctx.fillText(cargoText, textX, y + 7);

  // ICP no canto direito (badge)
  const badgeX = left + w - 4;
  ctx.fillStyle = cor;
  ctx.font = "700 9.5px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  ctx.fillText(icpText, badgeX, y + 7);

  // Indicador "suspeito"
  if (p.suspeito) {
    ctx.fillStyle = COR_ALERTA.vermelho;
    ctx.beginPath();
    ctx.arc(left + w - 5, top + 5, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawCardAto(
  a: GrafoNodeAto,
  x: number, y: number, w: number, h: number, r: number,
  ctx: CanvasRenderingContext2D,
  scale: number,
  isSelected: boolean,
  isHovered: boolean,
) {
  const cor = corPorNivel(a.nivel_alerta);
  const left = x - w / 2;
  const top = y - h / 2;

  // Card body
  drawRoundedRect(ctx, left, top, w, h, r);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = (isSelected ? 2.5 : isHovered ? 2 : 1) / scale;
  ctx.strokeStyle = isSelected || isHovered ? INK : BORDER;
  ctx.stroke();

  // Faixa esquerda colorida (indica nível de alerta)
  ctx.fillStyle = cor;
  drawRoundedRect(ctx, left, top, 4, h, r);
  ctx.fill();

  // Tipo + número
  ctx.fillStyle = INK;
  ctx.font = "700 9.5px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const tipo = (a.ato_tipo || "").slice(0, 3).toUpperCase();
  ctx.fillText(`${tipo} ${a.numero}`, left + 9, y - 5);

  // Data + tags count
  ctx.fillStyle = MUTED;
  ctx.font = "8.5px JetBrains Mono, monospace";
  const dataStr = a.data_publicacao
    ? a.data_publicacao.split("-").reverse().slice(0, 3).join("/").slice(0, 10)
    : "—";
  ctx.fillText(dataStr, left + 9, y + 7);

  if (a.tags_count > 0) {
    ctx.fillStyle = cor;
    ctx.font = "700 8.5px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${a.tags_count} tag${a.tags_count !== 1 ? "s" : ""}`, left + w - 5, y + 7);
  }
}

function drawCardTag(
  t: GrafoNodeTag,
  x: number, y: number, w: number, h: number, r: number,
  ctx: CanvasRenderingContext2D,
  scale: number,
  isSelected: boolean,
  isHovered: boolean,
) {
  const cor = corPorCategoria(t.cor_categoria);
  const left = x - w / 2;
  const top = y - h / 2;

  // Card body com fundo levemente tingido pela cor da gravidade
  drawRoundedRect(ctx, left, top, w, h, r);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = (isSelected ? 2.5 : isHovered ? 2 : 1) / scale;
  ctx.strokeStyle = isSelected || isHovered ? INK : cor;
  ctx.stroke();

  // Triângulo de gravidade na esquerda
  const triSize = 10;
  const triX = left + 8;
  const triY = y;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(triX, triY - triSize / 2);
  ctx.lineTo(triX - triSize / 2, triY + triSize / 2);
  ctx.lineTo(triX + triSize / 2, triY + triSize / 2);
  ctx.closePath();
  ctx.fill();

  // Nome
  ctx.fillStyle = INK;
  ctx.font = "700 9.5px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nm = t.nome.length > 18 ? t.nome.slice(0, 16) + "…" : t.nome;
  ctx.fillText(nm.toUpperCase(), triX + 10, y - 5);

  // Atos count + gravidade
  ctx.fillStyle = MUTED;
  ctx.font = "8.5px JetBrains Mono, monospace";
  ctx.fillText(`${t.atos_count} atos`, triX + 10, y + 7);

  ctx.fillStyle = cor;
  ctx.font = "700 8.5px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  ctx.fillText(t.gravidade_predominante.slice(0, 4), left + w - 5, y + 7);
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

  // Carrega raiz: top concentradores (sem tags soltas no canvas)
  const carregarRaiz = useCallback(async () => {
    dispatch({ type: "loading", on: true });
    try {
      const data = await fetchGrafoRaiz(slug, {
        limit: 18,
        icp_min: 0,
        incluir_tags_top: 30,
      });
      setTagsDisponiveis(data.nodes_tags.map((t) => ({ codigo: t.codigo, nome: t.nome })));
      dispatch({
        type: "set_canvas",
        data: { ...data, nodes_tags: [] }, // pessoas só
        modo: "raiz",
        focoKey: null,
      });
    } catch (err: any) {
      dispatch({ type: "error", msg: err.message ?? "Erro ao carregar grafo" });
    }
  }, [slug]);

  useEffect(() => {
    carregarRaiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Auto-zoom-to-fit ao trocar de modo/foco. Dispara várias vezes em
  // intervalos curtos pra apanhar o canvas após o paint inicial — uma única
  // chamada pode ser cedo demais e o canvas ficar desenquadrado.
  useEffect(() => {
    if (!fgRef.current || state.nodes.size === 0) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    [80, 250, 500, 900].forEach((delay) => {
      timeouts.push(
        setTimeout(() => {
          try {
            fgRef.current?.zoomToFit?.(300, 110);
          } catch {
            /* fg ainda não pronto */
          }
        }, delay),
      );
    });
    return () => timeouts.forEach(clearTimeout);
  }, [state.modo, state.focoKey, size.w, size.h]);

  // Tuning das forças d3 — drasticamente reduzidas porque os nós ficam
  // fixos via fx/fy, só queremos as forças trabalhando em casos novos.
  useEffect(() => {
    if (!fgRef.current) return;
    const t = setTimeout(() => {
      try {
        const charge = fgRef.current.d3Force?.("charge");
        if (charge && typeof charge.strength === "function") charge.strength(-30);
        const link = fgRef.current.d3Force?.("link");
        if (link && typeof link.distance === "function") link.distance(80);
      } catch {
        /* fg ainda não pronto */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [state.modo, state.focoKey]);

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

  // Filtra nós/edges client-side. No modo foco, posiciona radialmente:
  // - nó central (focoKey) fixo em (0, 0)
  // - pessoas vizinhas em órbita interna (raio 200)
  // - atos em órbita média (raio 360)
  // - tags em órbita externa (raio 480)
  // No modo raiz, deixa o force layout posicionar livremente.
  const fgNodesRef = useRef<Map<string, FGNode>>(new Map());
  const fgNodes: FGNode[] = useMemo(() => {
    const out: FGNode[] = [];
    const cache = fgNodesRef.current;
    const newCache = new Map<string, FGNode>();

    // Coleta arrays separados por tipo para o layout radial
    const pessoas: AnyNode[] = [];
    const atos: AnyNode[] = [];
    const tags: AnyNode[] = [];

    state.nodes.forEach((n) => {
      if (n.tipo === "pessoa") {
        const p = n as GrafoNodePessoa & { _key: string };
        if (state.filtros.suspeitos_only && !p.suspeito) return;
        if ((p.icp || 0) < state.filtros.icp_min && !p.suspeito) return;
      }
      if (n.tipo === "ato" && !state.filtros.mostrar_atos) return;
      if (n.tipo === "tag" && !state.filtros.mostrar_tags) return;
      if (n.tipo === "pessoa") pessoas.push(n);
      else if (n.tipo === "ato") atos.push(n);
      else tags.push(n);
    });

    const isFoco = state.modo === "foco_pessoa" || state.modo === "foco_tag";

    const make = (n: AnyNode, x?: number, y?: number, fixed = false): FGNode => {
      const existing = cache.get(n._key);
      const node: FGNode = existing ?? {
        id: n._key,
        _key: n._key,
        tipo: n.tipo,
        raw: n,
        x,
        y,
      };
      // Atualiza dados (sempre) mas preserva posição da simulação se já tinha
      node.raw = n;
      if (fixed) {
        node.fx = x;
        node.fy = y;
      } else if (existing && existing.x !== undefined) {
        // mantém posição atual
      } else if (x !== undefined) {
        node.x = x;
        node.y = y;
      }
      newCache.set(n._key, node);
      return node;
    };

    if (isFoco) {
      // Central — fixo no (0, 0)
      const central = pessoas.find((p) => p._key === state.focoKey)
        ?? tags.find((t) => t._key === state.focoKey);
      if (central) {
        out.push(make(central, 0, 0, true));
      }

      // Vizinhos em órbita radial — limita raio pra caber bem no viewport.
      const vizinhos = pessoas.filter((p) => p._key !== state.focoKey);
      const rViz = Math.max(180, Math.min(280, vizinhos.length * 22));
      vizinhos.forEach((p, i) => {
        const angle = (i / Math.max(1, vizinhos.length)) * 2 * Math.PI - Math.PI / 2;
        out.push(make(p, Math.cos(angle) * rViz, Math.sin(angle) * rViz, true));
      });

      // Atos em órbita externa
      const rAtos = rViz + 170;
      atos.forEach((a, i) => {
        const angle = ((i + 0.5) / Math.max(1, atos.length)) * 2 * Math.PI - Math.PI / 2;
        out.push(make(a, Math.cos(angle) * rAtos, Math.sin(angle) * rAtos, true));
      });

      // Tags ainda mais externas
      const rTags = rAtos + 150;
      tags
        .filter((t) => t._key !== state.focoKey)
        .forEach((t, i) => {
          const angle = ((i + 0.25) / Math.max(1, tags.length)) * 2 * Math.PI - Math.PI / 2;
          out.push(make(t, Math.cos(angle) * rTags, Math.sin(angle) * rTags, true));
        });
    } else {
      // Modo raiz: GRID em vez de círculo. Aproveita melhor o viewport
      // (que é mais largo que alto) e evita cards cortados nas bordas.
      const n = pessoas.length;
      // Adaptativo: 1 linha pra ≤6, 2 linhas pra ≤12, 3 linhas pra ≤24, 4 linhas+
      const cols =
        n <= 6 ? Math.min(n, 6)
        : n <= 12 ? 6
        : n <= 24 ? 6
        : Math.ceil(Math.sqrt(n * 1.8));
      const rows = Math.max(1, Math.ceil(n / cols));
      const dx = 165;
      const dy = 64;
      const startX = -((cols - 1) * dx) / 2;
      const startY = -((rows - 1) * dy) / 2;
      pessoas.forEach((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Última linha incompleta: centraliza horizontalmente os restantes
        const lastRow = rows - 1;
        const itemsLastRow = n - lastRow * cols;
        const rowOffset = row === lastRow && itemsLastRow < cols
          ? ((cols - itemsLastRow) * dx) / 2
          : 0;
        out.push(make(p, startX + col * dx + rowOffset, startY + row * dy, true));
      });
      // Sem atos/tags no canvas raiz, mas se vierem fica fallback radial externo
      atos.forEach((a, i) => {
        const angle = (i / Math.max(1, atos.length)) * 2 * Math.PI;
        out.push(make(a, Math.cos(angle) * 500, Math.sin(angle) * 500, true));
      });
      tags.forEach((t, i) => {
        const angle = (i / Math.max(1, tags.length)) * 2 * Math.PI;
        out.push(make(t, Math.cos(angle) * 600, Math.sin(angle) * 600, true));
      });
    }

    fgNodesRef.current = newCache;
    return out;
  }, [state.nodes, state.filtros, state.modo, state.focoKey]);

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

  // Estado raiz = canvas dos top concentradores (sem foco em ninguém).
  // Ativa renderização "avatar gigante com iniciais + nome" pra que os
  // top N fiquem identificáveis à primeira vista.
  const isRootView = state.modo === "raiz";

  // Memoiza objeto graphData — caso contrário, criar um literal `{ nodes, links }`
  // a cada render fazia a ForceGraph reiniciar a simulação a cada hover/state change,
  // causando o bug de "expansão infinita" ao mover o mouse.
  const graphData = useMemo(
    () => ({ nodes: fgNodes, links: fgLinks }),
    [fgNodes, fgLinks],
  );

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
  // Clicar numa pessoa: substitui o canvas pelo ego-graph dela.
  const focarPessoa = useCallback(
    async (pessoa_id: string, label: string) => {
      setTooltip(null);
      setHoveredKey(null);
      setAtosComuns(null);
      dispatch({ type: "loading", on: true });
      try {
        const data = await fetchGrafoExpandirPessoa(slug, pessoa_id, {
          limit_vizinhos: 12,
          peso_min: 2,
          incluir_atos: state.filtros.mostrar_atos,
          incluir_tags: state.filtros.mostrar_tags,
          limit_atos: 5,
        });
        dispatch({
          type: "set_canvas",
          data,
          modo: "foco_pessoa",
          focoKey: `pessoa:${pessoa_id}`,
          pushStack: { label },
        });
      } catch (err: any) {
        dispatch({ type: "error", msg: err.message });
      }
    },
    [slug, state.filtros],
  );

  const focarTag = useCallback(
    async (codigo: string, label: string) => {
      setTooltip(null);
      setHoveredKey(null);
      setAtosComuns(null);
      dispatch({ type: "loading", on: true });
      try {
        const data = await fetchGrafoExpandirTag(slug, codigo, {
          limit_atos: 20,
          incluir_pessoas: true,
        });
        dispatch({
          type: "set_canvas",
          data,
          modo: "foco_tag",
          focoKey: `tag:${codigo}`,
          pushStack: { label },
        });
      } catch (err: any) {
        dispatch({ type: "error", msg: err.message });
      }
    },
    [slug],
  );

  const handleNodeClick = useCallback(
    async (node: FGNode) => {
      if (node.tipo === "pessoa") {
        const p = node.raw as GrafoNodePessoa;
        await focarPessoa(p.id, p.nome);
      } else if (node.tipo === "ato") {
        const a = node.raw as GrafoNodeAto;
        // Apenas seleciona — abre painel lateral pra ver tags + link pra ficha
        dispatch({ type: "select", sel: { kind: "ato", id: a.id } });
      } else {
        const t = node.raw as GrafoNodeTag;
        await focarTag(t.codigo, t.nome);
      }
    },
    [focarPessoa, focarTag],
  );

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

  const handleFiltrarPorTag = useCallback(
    async (codigo: string) => {
      const tag = tagsDisponiveis.find((t) => t.codigo === codigo);
      await focarTag(codigo, tag?.nome ?? codigo);
    },
    [focarTag, tagsDisponiveis],
  );

  const voltarRaiz = useCallback(async () => {
    setTooltip(null);
    setHoveredKey(null);
    setAtosComuns(null);
    await carregarRaiz();
  }, [carregarRaiz]);

  // Voltar a um item específico do breadcrumb (refetch do foco daquele nível)
  const voltarPara = useCallback(
    async (index: number) => {
      setTooltip(null);
      setHoveredKey(null);
      setAtosComuns(null);
      const target = state.navStack[index];
      if (!target) return voltarRaiz();
      // Trim stack até o índice e re-foca naquele item
      // Para simplificar: removemos do stack e re-empurramos via focar*
      dispatch({ type: "voltar", targetIndex: index - 1 });
      if (target.modo === "foco_pessoa" && target.focoKey) {
        await focarPessoa(target.focoKey.replace(/^pessoa:/, ""), target.label);
      } else if (target.modo === "foco_tag" && target.focoKey) {
        await focarTag(target.focoKey.replace(/^tag:/, ""), target.label);
      }
    },
    [state.navStack, voltarRaiz, focarPessoa, focarTag],
  );

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
            const v = state.nodes.get(`pessoa:${id}`) as GrafoNodePessoa | undefined;
            if (v) focarPessoa(id, v.nome);
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
            const v = state.nodes.get(`pessoa:${id}`) as GrafoNodePessoa | undefined;
            if (v) focarPessoa(id, v.nome);
          }}
          onClicarAto={(ato) => dispatch({ type: "select", sel: { kind: "ato", id: ato.id } })}
        />
      );
    }

    return null;
  }, [state.selected, state.nodes, state.edges, atosComuns, slug, focarPessoa]);

  return (
    <div className="flex flex-col h-screen w-full" style={{ background: "#fff" }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 h-12"
        style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3 flex-wrap">
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
          <button
            onClick={voltarRaiz}
            disabled={state.modo === "raiz"}
            className="text-[14px] font-medium hover:text-[#16a34a] transition-colors"
            style={{
              fontFamily: TIGHT,
              letterSpacing: "-0.01em",
              color: state.modo === "raiz" ? INK : MUTED,
              cursor: state.modo === "raiz" ? "default" : "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            title="Voltar à visão de top concentradores"
          >
            Conexões
          </button>
          {state.navStack.length > 0 && (
            <>
              {state.navStack.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span style={{ color: SUBTLE, fontFamily: MONO }}>›</span>
                  <button
                    onClick={() => voltarPara(i)}
                    className="text-[12.5px] hover:text-[#0a0a0a] transition-colors"
                    style={{
                      fontFamily: TIGHT,
                      color: i === state.navStack.length - 1 ? INK : MUTED,
                      cursor: i === state.navStack.length - 1 ? "default" : "pointer",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      letterSpacing: "-0.01em",
                    }}
                    disabled={i === state.navStack.length - 1}
                  >
                    {item.label.length > 32 ? item.label.slice(0, 30) + "…" : item.label}
                  </button>
                </div>
              ))}
            </>
          )}
          <span
            className="text-[9px] uppercase tracking-[0.22em] tabular-nums hidden md:inline ml-2"
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

        {/* Filtro por tag (drill-down) */}
        <div className="flex items-center gap-1.5">
          <select
            value={state.modo === "foco_tag" && state.focoKey ? state.focoKey.replace(/^tag:/, "") : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") voltarRaiz();
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
            <option value="">— escolher tag para drill-down —</option>
            {tagsDisponiveis.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.nome}
              </option>
            ))}
          </select>
          {state.modo !== "raiz" && (
            <button
              onClick={voltarRaiz}
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
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={1}
            cooldownTicks={0}
            warmupTicks={0}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            enableNodeDrag={false}
            d3AlphaDecay={0.5}
            d3VelocityDecay={0.9}
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
              const { w, h } = cardDimensions((node as FGNode).raw);
              const x = node.x ?? 0, y = node.y ?? 0;
              ctx.fillStyle = color;
              ctx.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
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
