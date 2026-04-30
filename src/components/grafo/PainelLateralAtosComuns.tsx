import { Link } from "@tanstack/react-router";
import { Network } from "lucide-react";
import type { AtosComunsResponse } from "../../lib/api-auth";
import {
  INK, PAPER, BORDER, MUTED, SUBTLE, MONO, TIGHT,
  TIPO_LABEL, TIPO_APARICAO_LABEL, corPorNivel, corPorCategoria, formatDate,
} from "./tokens";

interface Props {
  data: AtosComunsResponse;
  nomeA: string;
  nomeB: string;
  slug: string;
  loading?: boolean;
}

export function PainelLateralAtosComuns({ data, nomeA, nomeB, slug, loading }: Props) {
  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Network size={13} style={{ color: SUBTLE }} />
          <span
            className="text-[9px] uppercase tracking-[0.28em]"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            Atos em comum
          </span>
        </div>
        <h2
          className="text-[18px] leading-tight font-medium"
          style={{ fontFamily: TIGHT, color: INK, letterSpacing: "-0.02em" }}
        >
          {nomeA}
        </h2>
        <p className="text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: MUTED, fontFamily: MONO }}>
          ↔ {nomeB}
        </p>
        <p className="text-[10px] mt-2" style={{ color: SUBTLE }}>
          {data.atos.length} ato{data.atos.length !== 1 ? "s" : ""} onde ambas as pessoas aparecem
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-5 py-8 text-center">
            <p className="text-[11px]" style={{ color: SUBTLE, fontFamily: MONO }}>
              carregando…
            </p>
          </div>
        )}
        {!loading && data.atos.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-[11px]" style={{ color: SUBTLE }}>
              Nenhum ato em comum encontrado.
            </p>
          </div>
        )}
        {!loading && data.atos.map((a) => (
          <Link
            key={a.ato_id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={"/painel/$slug/ato/$id" as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            params={{ slug, id: a.ato_id } as any}
            style={{ textDecoration: "none", display: "block" }}
          >
            <div
              className="px-4 py-3 hover:bg-[#faf8f3] transition-colors"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {/* Cabeçalho do ato */}
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 w-2 h-2 flex-shrink-0"
                  style={{ background: corPorNivel(a.nivel_alerta) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium" style={{ color: INK, fontFamily: MONO }}>
                    {(TIPO_LABEL[a.tipo] ?? a.tipo).toUpperCase()} {a.numero}
                  </p>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {formatDate(a.data_publicacao)}
                  </p>
                </div>
                {a.nivel_alerta && (
                  <span
                    className="text-[8.5px] uppercase tracking-wider flex-shrink-0"
                    style={{ color: corPorNivel(a.nivel_alerta), fontFamily: MONO }}
                  >
                    {a.nivel_alerta}
                  </span>
                )}
              </div>

              {/* Tipos de aparição de cada um */}
              <div className="mt-2 ml-4 space-y-1">
                <p className="text-[10px]" style={{ color: MUTED }}>
                  <span className="font-semibold" style={{ color: INK }}>{nomeA.split(" ").slice(0, 2).join(" ")}</span>:{" "}
                  {TIPO_APARICAO_LABEL[a.tipo_aparicao_a] ?? a.tipo_aparicao_a}
                  {a.cargo_a && <span style={{ color: SUBTLE }}> — {a.cargo_a}</span>}
                </p>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  <span className="font-semibold" style={{ color: INK }}>{nomeB.split(" ").slice(0, 2).join(" ")}</span>:{" "}
                  {TIPO_APARICAO_LABEL[a.tipo_aparicao_b] ?? a.tipo_aparicao_b}
                  {a.cargo_b && <span style={{ color: SUBTLE }}> — {a.cargo_b}</span>}
                </p>
              </div>

              {/* Tags do ato */}
              {a.tags.length > 0 && (
                <div className="mt-2 ml-4 flex flex-wrap gap-1">
                  {a.tags.map((t) => (
                    <span
                      key={t.codigo}
                      className="text-[8.5px] uppercase tracking-wider px-1.5 py-0.5"
                      style={{
                        color: corPorCategoria(
                          t.gravidade === "critica" ? "vermelho"
                          : t.gravidade === "alta" ? "laranja"
                          : t.gravidade === "media" ? "amarelo" : "cinza"
                        ),
                        border: `1px solid ${corPorCategoria(
                          t.gravidade === "critica" ? "vermelho"
                          : t.gravidade === "alta" ? "laranja"
                          : t.gravidade === "media" ? "amarelo" : "cinza"
                        )}`,
                        borderRadius: 2,
                        fontFamily: MONO,
                      }}
                    >
                      {t.codigo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
