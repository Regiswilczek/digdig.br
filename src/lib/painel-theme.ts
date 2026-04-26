/**
 * Painel Design System — "Terminal Brutalist · Paper Tech"
 *
 * Linguagem visual unificada do painel: paper bege, monospace pesado,
 * cantos retos, linhas finas, denso, com acento verde elétrico.
 * Inspiração: Bloomberg Terminal × Linear × Vercel Observability,
 * mas em paleta paper (não dark).
 */

// ── Cores ────────────────────────────────────────────────────────────────
export const INK = "#0a0a0a";
export const PAPER = "#faf8f3";
export const PAPER_DEEP = "#f4f1e8"; // hover/active
export const BORDER = "#e8e6e1";
export const BORDER_SOFT = "#f1efe8";
export const HAIRLINE = "#d8d5cd"; // mais visível que BORDER, para divisores fortes
export const MUTED = "#6b6b66";
export const SUBTLE = "#9a978f";
export const MUTED_SOFT = "#a8a59c";

// Acento "hightech" — verde elétrico Dig Dig
export const ACCENT = "#16a34a";
export const ACCENT_GLOW = "#22ff88"; // só para halos/glows

// Níveis de risco
export const NIVEL_DOT: Record<string, string> = {
  vermelho: "#dc2626",
  laranja: "#ea580c",
  amarelo: "#ca8a04",
  verde: "#16a34a",
};

export const NIVEL_BG: Record<string, { bg: string; fg: string; border: string }> = {
  vermelho: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  laranja: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
  amarelo: { bg: "#fefce8", fg: "#a16207", border: "#fde68a" },
  verde: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
};

// ── Tipografia ───────────────────────────────────────────────────────────
export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

// ── Métricas ─────────────────────────────────────────────────────────────
export const RADIUS = 2; // cantos quase retos em todo lugar
export const SIDEBAR_W = 260;
export const FEED_W = 300;

// ── Helpers ──────────────────────────────────────────────────────────────
export function fmt(n: number | undefined | null, fallback = "—"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

/** marcador hex no estilo [00] usado em listas */
export function tag(n: number): string {
  return `[${String(n).padStart(2, "0")}]`;
}

/** cantos decorativos estilo brutalist — para wrap de cards/headers */
export const cornerStyle = {
  position: "relative" as const,
};

/**
 * Estilos compartilhados como constantes — evita repetição inline e
 * garante consistência visual entre componentes.
 */
export const ui = {
  // Card padrão: borda fina, cantos retos, fundo branco
  card: {
    border: `1px solid ${BORDER}`,
    background: "#fff",
    borderRadius: RADIUS,
  },
  // Eyebrow / label técnico
  eyebrow: {
    fontSize: 10,
    color: SUBTLE,
    fontFamily: MONO,
    textTransform: "uppercase" as const,
    letterSpacing: "0.28em",
    fontWeight: 600,
  },
  // Chip / tag mono
  chip: {
    fontSize: 9.5,
    fontFamily: MONO,
    textTransform: "uppercase" as const,
    letterSpacing: "0.18em",
    padding: "2px 6px",
    background: PAPER,
    color: MUTED,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
  },
  // Texto numérico grande
  bigNum: {
    fontFamily: TIGHT,
    fontWeight: 500,
    letterSpacing: "-0.03em",
    color: INK,
    lineHeight: 1,
  },
};

/**
 * Classe utilitária — aplica grid sutil de fundo (linhas finas a cada 24px).
 * Use como style={{ backgroundImage: gridBG }} para dar sensação de "blueprint".
 */
export const gridBG = `
  linear-gradient(to right, ${BORDER_SOFT} 1px, transparent 1px),
  linear-gradient(to bottom, ${BORDER_SOFT} 1px, transparent 1px)
`;
export const gridBGSize = "24px 24px";
