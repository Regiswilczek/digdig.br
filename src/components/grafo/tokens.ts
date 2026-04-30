// Design tokens compartilhados pelo grafo de relações.
// Mesma paleta usada em chat.tsx, ato.$id.tsx e index.tsx.

export const INK = "#0a0a0a";
export const PAPER = "#faf8f3";
export const BORDER = "#e8e6e1";
export const MUTED = "#6b6b66";
export const SUBTLE = "#9a978f";
export const ACCENT = "#16a34a";

// Cores de alerta — usadas tanto para nivel_alerta de atos quanto para
// gravidade de tags e ICP de pessoas (ver mapeamentos em api-auth.ts).
export const COR_ALERTA = {
  cinza: "#9a978f",
  amarelo: "#ca8a04",
  laranja: "#ea580c",
  vermelho: "#dc2626",
  verde: "#16a34a", // só atos
} as const;

export const MONO = "'JetBrains Mono', monospace";
export const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

export const TIPO_LABEL: Record<string, string> = {
  portaria: "Portaria",
  ata_plenaria: "Ata Plenária",
  portaria_normativa: "Port. Normativa",
  deliberacao: "Deliberação",
  media_library: "Transparência",
  pdf: "PDF",
  docx: "Documento",
};

export const TIPO_APARICAO_LABEL: Record<string, string> = {
  nomeado: "Nomeado",
  exonerado: "Exonerado",
  assina: "Assina",
  membro_comissao: "Membro de comissão",
  processado: "Processado",
  mencionado: "Mencionado",
  preside: "Preside",
  vota: "Vota",
  contratado: "Contratado",
  citado: "Citado",
};

export function corPorGravidade(g: string | null | undefined): string {
  if (g === "critica") return COR_ALERTA.vermelho;
  if (g === "alta") return COR_ALERTA.laranja;
  if (g === "media") return COR_ALERTA.amarelo;
  return COR_ALERTA.cinza;
}

export function corPorNivel(nivel: string | null | undefined): string {
  if (nivel === "vermelho") return COR_ALERTA.vermelho;
  if (nivel === "laranja") return COR_ALERTA.laranja;
  if (nivel === "amarelo") return COR_ALERTA.amarelo;
  if (nivel === "verde") return COR_ALERTA.verde;
  return INK;
}

export function corPorCategoria(cat: string | null | undefined): string {
  if (cat === "vermelho") return COR_ALERTA.vermelho;
  if (cat === "laranja") return COR_ALERTA.laranja;
  if (cat === "amarelo") return COR_ALERTA.amarelo;
  return COR_ALERTA.cinza;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}
