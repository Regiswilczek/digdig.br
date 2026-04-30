import { Link } from "@tanstack/react-router";
import { Tag, ExternalLink } from "lucide-react";
import type { GrafoNodeTag, GrafoNodeAto, GrafoNodePessoa } from "../../lib/api-auth";
import {
  INK, PAPER, BORDER, MUTED, SUBTLE, MONO, TIGHT,
  TIPO_LABEL, corPorCategoria, corPorNivel, formatDate,
} from "./tokens";

interface Props {
  tag: GrafoNodeTag;
  atosDaTag: GrafoNodeAto[];
  pessoasDaTag: GrafoNodePessoa[];
  slug: string;
  onClicarPessoa: (id: string) => void;
  onClicarAto: (ato: GrafoNodeAto) => void;
}

export function PainelLateralTag({
  tag, atosDaTag, pessoasDaTag, slug, onClicarPessoa, onClicarAto,
}: Props) {
  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{
              background: corPorCategoria(tag.cor_categoria),
              clipPath: "polygon(50% 10%, 5% 95%, 95% 95%)",
            }}
          />
          <span
            className="text-[9px] uppercase tracking-[0.28em]"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            Tag de irregularidade
          </span>
        </div>
        <h2
          className="text-[20px] leading-tight font-medium"
          style={{ fontFamily: TIGHT, color: INK, letterSpacing: "-0.02em" }}
        >
          {tag.nome}
        </h2>
        <p className="text-[10.5px] mt-1 uppercase tracking-wider" style={{ color: MUTED, fontFamily: MONO }}>
          {tag.codigo} · {tag.categoria_nome}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px flex-shrink-0" style={{ background: BORDER, borderBottom: `1px solid ${BORDER}` }}>
        <Metric label="Atos com tag" value={String(tag.atos_count)} mono />
        <Metric
          label="Gravidade"
          value={tag.gravidade_predominante}
          cor={corPorCategoria(tag.cor_categoria)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Atos */}
        {atosDaTag.length > 0 && (
          <Section title="Atos no canvas" hint={`${atosDaTag.length}`}>
            {atosDaTag.map((ato) => (
              <button
                key={ato.id}
                onClick={() => onClicarAto(ato)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#faf8f3] transition-colors text-left"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  className="mt-1 w-2 h-2 flex-shrink-0"
                  style={{ background: corPorNivel(ato.nivel_alerta) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium" style={{ color: INK, fontFamily: MONO }}>
                    {(TIPO_LABEL[ato.ato_tipo] ?? ato.ato_tipo).toUpperCase()} {ato.numero}
                  </p>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {formatDate(ato.data_publicacao)} · {ato.pessoas_count} pessoas
                  </p>
                </div>
              </button>
            ))}
          </Section>
        )}

        {/* Pessoas envolvidas */}
        {pessoasDaTag.length > 0 && (
          <Section title="Pessoas envolvidas" hint={`${pessoasDaTag.length}`}>
            {pessoasDaTag.slice(0, 30).map((p) => (
              <button
                key={p.id}
                onClick={() => onClicarPessoa(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf8f3] transition-colors text-left"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  className="w-2 h-2 flex-shrink-0"
                  style={{ background: corPorCategoria(p.cor_categoria), borderRadius: 999 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: INK }}>
                    {p.nome}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>
                    {p.cargo || "—"}
                  </p>
                </div>
                {p.icp != null && (
                  <span className="text-[9px]" style={{ color: SUBTLE, fontFamily: MONO }}>
                    ICP {p.icp.toFixed(1)}
                  </span>
                )}
              </button>
            ))}
            {pessoasDaTag.length > 30 && (
              <p className="px-4 py-3 text-[10px] text-center" style={{ color: SUBTLE, fontFamily: MONO }}>
                +{pessoasDaTag.length - 30} pessoas (refine os filtros)
              </p>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: PAPER, borderBottom: `1px solid ${BORDER}` }}
      >
        <p className="text-[9px] uppercase tracking-[0.22em] font-semibold" style={{ color: SUBTLE, fontFamily: MONO }}>
          {title}
        </p>
        {hint && (
          <p className="text-[9px] tabular-nums" style={{ color: SUBTLE, fontFamily: MONO }}>
            {hint}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Metric({ label, value, cor, mono = false }: { label: string; value: string; cor?: string; mono?: boolean }) {
  return (
    <div style={{ background: "#fff", padding: "12px 16px" }}>
      <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: SUBTLE, fontFamily: MONO }}>
        {label}
      </p>
      <p
        className="text-[14px] font-medium mt-1"
        style={{
          color: cor || INK,
          fontFamily: mono ? MONO : TIGHT,
          textTransform: cor ? "uppercase" : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}
