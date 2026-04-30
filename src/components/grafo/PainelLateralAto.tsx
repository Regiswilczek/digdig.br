import { Link } from "@tanstack/react-router";
import { FileText, ExternalLink } from "lucide-react";
import type { GrafoNodeAto, GrafoNodeTag, GrafoEdgeAT } from "../../lib/api-auth";
import {
  INK, PAPER, BORDER, MUTED, SUBTLE, MONO, TIGHT,
  TIPO_LABEL, corPorNivel, corPorCategoria, formatDate,
} from "./tokens";

interface Props {
  ato: GrafoNodeAto;
  tagsDoAto: GrafoNodeTag[];
  edgesAT: GrafoEdgeAT[];
  slug: string;
  onClicarTag: (codigo: string) => void;
}

export function PainelLateralAto({ ato, tagsDoAto, edgesAT, slug, onClicarTag }: Props) {
  // Filtra tags atribuídas a este ato
  const codigosDoAto = new Set(
    edgesAT.filter((e) => e.source === ato.id).map((e) => e.target)
  );
  const tags = tagsDoAto.filter((t) => codigosDoAto.has(t.codigo));

  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ background: corPorNivel(ato.nivel_alerta), borderRadius: 2 }}
          >
            <FileText size={11} style={{ color: "#fff" }} />
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.28em]"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            Ato administrativo
          </span>
        </div>
        <h2
          className="text-[20px] leading-tight font-medium"
          style={{ fontFamily: TIGHT, color: INK, letterSpacing: "-0.02em" }}
        >
          {(TIPO_LABEL[ato.ato_tipo] ?? ato.ato_tipo)} Nº {ato.numero}
        </h2>
        <p className="text-[12px] mt-1" style={{ color: MUTED, fontFamily: MONO }}>
          {formatDate(ato.data_publicacao)}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-px flex-shrink-0" style={{ background: BORDER, borderBottom: `1px solid ${BORDER}` }}>
        <Metric label="Nível" value={ato.nivel_alerta || "—"} cor={corPorNivel(ato.nivel_alerta)} />
        <Metric label="Pessoas" value={String(ato.pessoas_count)} mono />
        <Metric label="Tags" value={String(ato.tags_count)} mono />
      </div>

      {/* Tags */}
      <div className="flex-1 overflow-y-auto">
        {tags.length > 0 && (
          <div>
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ background: PAPER, borderBottom: `1px solid ${BORDER}` }}
            >
              <p className="text-[9px] uppercase tracking-[0.22em] font-semibold" style={{ color: SUBTLE, fontFamily: MONO }}>
                Tags atribuídas
              </p>
              <p className="text-[9px] tabular-nums" style={{ color: SUBTLE, fontFamily: MONO }}>
                {tags.length}
              </p>
            </div>
            {tags.map((tag) => (
              <button
                key={tag.codigo}
                onClick={() => onClicarTag(tag.codigo)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf8f3] transition-colors text-left"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  className="w-3 h-3 flex-shrink-0"
                  style={{
                    background: corPorCategoria(tag.cor_categoria),
                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: INK }}>
                    {tag.nome}
                  </p>
                  <p className="text-[9.5px] uppercase tracking-wider" style={{ color: SUBTLE, fontFamily: MONO }}>
                    {tag.codigo}
                  </p>
                </div>
                <span
                  className="text-[8.5px] uppercase tracking-wider"
                  style={{
                    color: corPorCategoria(tag.cor_categoria),
                    fontFamily: MONO,
                  }}
                >
                  {tag.gravidade_predominante}
                </span>
              </button>
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-[11px]" style={{ color: SUBTLE }}>
              Nenhuma tag de irregularidade atribuída a este ato.
            </p>
          </div>
        )}
      </div>

      {/* Footer com link pra ficha */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: `1px solid ${BORDER}`, background: PAPER }}>
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={"/painel/$slug/ato/$id" as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params={{ slug, id: ato.id } as any}
          className="flex items-center justify-between gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            background: "#fff",
            color: INK,
            border: `1px solid ${INK}`,
            borderRadius: 2,
            fontFamily: MONO,
          }}
        >
          <span>Ver ficha completa</span>
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value, cor, mono = false }: { label: string; value: string; cor?: string; mono?: boolean }) {
  return (
    <div style={{ background: "#fff", padding: "12px 14px" }}>
      <p
        className="text-[9px] uppercase tracking-[0.2em]"
        style={{ color: SUBTLE, fontFamily: MONO }}
      >
        {label}
      </p>
      <p
        className="text-[13px] font-medium mt-1"
        style={{
          color: cor || INK,
          fontFamily: mono ? MONO : TIGHT,
          textTransform: cor ? "uppercase" : undefined,
          letterSpacing: cor ? "0.04em" : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}
