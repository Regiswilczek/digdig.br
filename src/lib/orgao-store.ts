/**
 * Central store for per-orgão data.
 *
 * Module-level singleton: data is fetched once per slug, shared across all
 * components (home, explorar, painel dashboard, sidebar, chat) via the
 * useOrgao() hook backed by useSyncExternalStore.
 *
 * One Supabase channel per slug handles realtime. One 30s interval per slug
 * handles polling. Both are lazily created on first subscriber and never torn
 * down (channels/intervals survive route changes so switching tabs costs nothing).
 *
 * Adding a new data source: add the fetch call inside fetchAll() and add the
 * field to OrgaoSnapshot. Every consumer updates automatically.
 */

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import {
  fetchStats,
  fetchAtividade,
  fetchCrescimento,
  fetchFinanceiroStats,
  type PublicStats,
  type AtividadeItem,
  type CrescimentoResponse,
  type FinanceiroStats,
} from "./api";
import { fetchPainelRodada, type PainelRodada } from "./api-auth";

// ── Snapshot type ────────────────────────────────────────────────────────────

export interface OrgaoSnapshot {
  stats: PublicStats | null;
  atividade: AtividadeItem[] | null;
  crescimento: CrescimentoResponse | null;
  finStats: FinanceiroStats | null;
  rodada: PainelRodada | null;
  /** Items first seen in this browser session (grows only, never shrinks). */
  novidades: AtividadeItem[];
  isLoading: boolean;
}

const DEFAULT: OrgaoSnapshot = {
  stats: null,
  atividade: null,
  crescimento: null,
  finStats: null,
  rodada: null,
  novidades: [],
  isLoading: false,
};

// ── Module-level state ───────────────────────────────────────────────────────

const snapshots = new Map<string, OrgaoSnapshot>();
const listenerMap = new Map<string, Set<() => void>>();
const intervals = new Map<string, ReturnType<typeof setInterval>>();
const channels = new Map<string, ReturnType<typeof supabase.channel>>();
const seenIds = new Map<string, Set<string>>();

// ── Internal helpers ─────────────────────────────────────────────────────────

function get(slug: string): OrgaoSnapshot {
  return snapshots.get(slug) ?? DEFAULT;
}

function notify(slug: string) {
  listenerMap.get(slug)?.forEach((fn) => fn());
}

function patch(slug: string, changes: Partial<OrgaoSnapshot>) {
  snapshots.set(slug, { ...get(slug), ...changes });
  notify(slug);
}

function prependToAtividade(
  slug: string,
  item: AtividadeItem,
  opts: { dedupe?: boolean } = {},
) {
  const prev = get(slug);
  const lista = prev.atividade ?? [];
  if (opts.dedupe) {
    // Remove qualquer entrada anterior do mesmo ato (pra mover pro topo no UPDATE)
    const semDuplicata = lista.filter((i) => i.ato_id !== item.ato_id);
    patch(slug, { atividade: [item, ...semDuplicata].slice(0, 80) });
    return;
  }
  const already = lista.some((i) => i.ato_id === item.ato_id);
  if (already) return;
  patch(slug, {
    atividade: [item, ...lista].slice(0, 80),
  });
}

function addNovidade(slug: string, item: AtividadeItem) {
  const seen = seenIds.get(slug) ?? new Set<string>();
  if (seen.has(item.ato_id)) return;
  seen.add(item.ato_id);
  seenIds.set(slug, seen);
  const prev = get(slug);
  patch(slug, { novidades: [item, ...prev.novidades].slice(0, 300) });
}

function trackNovidades(slug: string, items: AtividadeItem[]) {
  const seen = seenIds.get(slug) ?? new Set<string>();
  const news: AtividadeItem[] = [];
  for (const item of items) {
    if (!seen.has(item.ato_id)) {
      news.push(item);
      seen.add(item.ato_id);
    }
  }
  seenIds.set(slug, seen);
  if (news.length === 0) return;
  const prev = get(slug);
  patch(slug, { novidades: [...news, ...prev.novidades].slice(0, 300) });
}

// ── Fetch actions ────────────────────────────────────────────────────────────

async function fetchAll(slug: string) {
  patch(slug, { isLoading: true });
  const [statsR, atividadeR, crescimentoR, finStatsR] = await Promise.allSettled([
    fetchStats(slug),
    fetchAtividade(slug),
    fetchCrescimento(slug),
    fetchFinanceiroStats(slug),
  ]);
  const changes: Partial<OrgaoSnapshot> = { isLoading: false };
  if (statsR.status === "fulfilled") changes.stats = statsR.value;
  if (atividadeR.status === "fulfilled") {
    changes.atividade = atividadeR.value;
    trackNovidades(slug, atividadeR.value);
  }
  if (crescimentoR.status === "fulfilled") changes.crescimento = crescimentoR.value;
  if (finStatsR.status === "fulfilled") changes.finStats = finStatsR.value;
  patch(slug, changes);
}

async function refreshRodada(slug: string) {
  try {
    const rodada = await fetchPainelRodada(slug);
    patch(slug, { rodada });
  } catch {
    // rodada is optional — authenticated endpoint, may 401 on public views
  }
}

// ── Realtime channel ─────────────────────────────────────────────────────────

function ensureChannel(slug: string) {
  if (channels.has(slug)) return;

  const ch = supabase
    .channel(`orgao-store-${slug}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "analises" },
      async (payload) => {
        const row = payload.new as {
          id: string;
          ato_id: string;
          nivel_alerta: string | null;
          score_risco: number;
          criado_em: string;
        };
        const { data: ato } = await supabase
          .from("atos")
          .select("numero, tipo")
          .eq("id", row.ato_id)
          .single();
        const now = new Date().toISOString();
        const item: AtividadeItem = {
          ato_id: row.ato_id,
          numero: ato?.numero ?? null,
          tipo: ato?.tipo ?? null,
          event_time: row.criado_em || now,
          criado_em: row.criado_em,
          analisado_em: row.criado_em,
          nivel_alerta: row.nivel_alerta,
          status: "analisado",
          origem: "ato",
        };
        prependToAtividade(slug, item);
        addNovidade(slug, item);
        fetchStats(slug)
          .then((s) => patch(slug, { stats: s }))
          .catch(() => {});
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "analises" },
      async (payload) => {
        // UPDATE em analise = Bud/New aprofundando OU virando "em_andamento".
        // Move o item pro topo do feed com timestamp atualizado.
        const row = payload.new as {
          id: string;
          ato_id: string;
          nivel_alerta: string | null;
          atualizado_em: string;
          status: string | null;
          resultado_bud: unknown | null;
          resultado_new: unknown | null;
        };
        const { data: ato } = await supabase
          .from("atos")
          .select("numero, tipo")
          .eq("id", row.ato_id)
          .single();
        const now = new Date().toISOString();
        const item: AtividadeItem = {
          ato_id: row.ato_id,
          numero: ato?.numero ?? null,
          tipo: ato?.tipo ?? null,
          event_time: row.atualizado_em || now,
          criado_em: row.atualizado_em || now,
          analisado_em: row.atualizado_em || now,
          nivel_alerta: row.nivel_alerta,
          status: "analisado",
          origem: "ato",
        };
        // Remove duplicata anterior (se houver) e prepend versão atualizada
        prependToAtividade(slug, item, { dedupe: true });
        if (row.resultado_bud || row.resultado_new) {
          addNovidade(slug, item);
        }
        fetchStats(slug)
          .then((s) => patch(slug, { stats: s }))
          .catch(() => {});
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "atos" },
      (payload) => {
        const row = payload.new as {
          id: string;
          numero: string;
          tipo: string;
          criado_em: string;
        };
        const item: AtividadeItem = {
          ato_id: row.id,
          numero: row.numero,
          tipo: row.tipo,
          event_time: row.criado_em,
          criado_em: row.criado_em,
          analisado_em: null,
          nivel_alerta: null,
          status: "entrando",
          origem: "ato",
        };
        prependToAtividade(slug, item);
        addNovidade(slug, item);
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "diarias" },
      (payload) => {
        const row = payload.new as {
          id: string;
          codigo_processo: string | null;
          nome_passageiro: string | null;
          criado_em: string;
        };
        const item: AtividadeItem = {
          ato_id: row.id,
          numero: row.codigo_processo,
          tipo: "diaria",
          event_time: row.criado_em,
          criado_em: row.criado_em,
          analisado_em: null,
          nivel_alerta: null,
          status: "entrando",
          origem: "financeiro",
          descricao: row.nome_passageiro,
        };
        prependToAtividade(slug, item);
      },
    )
    .subscribe();

  channels.set(slug, ch);
}

// ── Polling ──────────────────────────────────────────────────────────────────

function ensurePolling(slug: string) {
  if (intervals.has(slug)) return;
  const id = setInterval(async () => {
    await refreshRodada(slug);
    try {
      const atividade = await fetchAtividade(slug);
      trackNovidades(slug, atividade);
      patch(slug, { atividade });
    } catch {
      // silently ignore — store keeps last known value
    }
  }, 30_000);
  intervals.set(slug, id);
}

// ── Subscription (called by useSyncExternalStore) ────────────────────────────

export function subscribeOrgao(slug: string, listener: () => void): () => void {
  if (!listenerMap.has(slug)) listenerMap.set(slug, new Set());
  listenerMap.get(slug)!.add(listener);

  if (!snapshots.has(slug)) {
    // First subscriber — bootstrap
    fetchAll(slug);
    refreshRodada(slug);
    ensureChannel(slug);
    ensurePolling(slug);
  }

  return () => {
    listenerMap.get(slug)?.delete(listener);
    // We intentionally keep channels/intervals alive so switching routes
    // doesn't cause a re-fetch on re-mount.
  };
}

// ── Public hook ──────────────────────────────────────────────────────────────

export function useOrgao(slug: string): OrgaoSnapshot & {
  refresh: () => void;
  refreshRodada: () => void;
} {
  const snap = useSyncExternalStore(
    (cb) => subscribeOrgao(slug, cb),
    () => get(slug),
    () => DEFAULT,
  );

  return {
    ...snap,
    refresh: () => {
      fetchAll(slug);
      refreshRodada(slug);
    },
    refreshRodada: () => refreshRodada(slug),
  };
}
