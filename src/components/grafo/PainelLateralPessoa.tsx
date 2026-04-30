import { Link } from "@tanstack/react-router";
import { User, ExternalLink, Network } from "lucide-react";
import type {
  GrafoNodePessoa,
  GrafoNodeAto,
  GrafoEdgePP,
} from "../../lib/api-auth";
import {
  INK, PAPER, BORDER, MUTED, SUBTLE, ACCENT, MONO, TIGHT,
  TIPO_LABEL, corPorCategoria, corPorNivel, formatDate,
} from "./tokens";

interface Props {
  pessoa: GrafoNodePessoa;
  vizinhos: GrafoNodePessoa[];
  edgesPP: GrafoEdgePP[];
  atos: GrafoNodeAto[];
  slug: string;
  onExpandirVizinho: (id: string) => void;
  onClicarAto: (ato: GrafoNodeAto) => void;
}

export function PainelLateralPessoa({
  pessoa, vizinhos, edgesPP, atos, slug, onExpandirVizinho, onClicarAto,
}: Props) {
  // Edges em que essa pessoa aparece — para listar vizinhos com peso
  const edgesDela = edgesPP.filter(
    (e) => e.source === pessoa.id || e.target === pessoa.id
  );
  const vizinhosOrdenados = vizinhos
    .map((v) => {
      const e = edgesDela.find(
        (ed) => ed.source === v.id || ed.target === v.id
      );
      return { v, e };
    })
    .filter((x) => x.e)
    .sort((a, b) => (b.e!.peso || 0) - (a.e!.peso || 0));

  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ background: corPorCategoria(pessoa.cor_categoria), borderRadius: 999 }}
          >
            <User size={11} style={{ color: "#fff" }} />
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.28em]"
            style={{ color: SUBTLE, fontFamily: MONO }}
          >
            Pessoa{pessoa.suspeito ? " · suspeita" : ""}
          </span>
        </div>
        <h2
          className="text-[20px] leading-tight font-medium"
          style={{ fontFamily: TIGHT, color: INK, letterSpacing: "-0.02em" }}
        >
          {pessoa.nome}
        </h2>
        <p className="text-[12px] mt-1" style={{ color: MUTED }}>
          {pessoa.cargo || "Cargo não informado"}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-px flex-shrink-0" style={{ background: BORDER, borderBottom: `1px solid ${BORDER}` }}>
        <Metric label="ICP" value={pessoa.icp != null ? pessoa.icp.toFixed(2) : "—"} />
        <Metric label="Aparições" value={String(pessoa.total_aparicoes)} />
        <Metric label="Primeira" value={formatDate(pessoa.primeiro_ato)} mono />
        <Metric label="Última" value={formatDate(pessoa.ultimo_ato)} mono />
      </div>

      {/* Body scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Vizinhos */}
        {vizinhosOrdenados.length > 0 && (
          <Section title="Vizinhos diretos" hint={`${vizinhosOrdenados.length} pessoas`}>
            {vizinhosOrdenados.map(({ v, e }) => (
              <button
                key={v.id}
                onClick={() => onExpandirVizinho(v.id)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#faf8f3] transition-colors text-left"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  className="mt-1 w-2 h-2 flex-shrink-0"
                  style={{ background: corPorCategoria(v.cor_categoria), borderRadius: 999 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: INK }}>
                    {v.nome}
                  </p>
                  <p className="text-[10.5px] truncate" style={{ color: MUTED }}>
                    {v.cargo || "—"}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] font-semibold" style={{ color: INK, fontFamily: MONO }}>
                    {e!.atos_em_comum} atos
                  </p>
                  {e!.gravidade_max && (
                    <p
                      className="text-[8.5px] uppercase tracking-wider"
                      style={{ color: corPorCategoria(
                        e!.gravidade_max === "critica" ? "vermelho"
                        : e!.gravidade_max === "alta" ? "laranja"
                        : e!.gravidade_max === "media" ? "amarelo" : "cinza"
                      ), fontFamily: MONO }}
                    >
                      grav. {e!.gravidade_max}
                    </p>
                  )}
                </div>
                <Network size={11} style={{ color: SUBTLE }} className="flex-shrink-0 mt-1" />
              </button>
            ))}
          </Section>
        )}

        {/* Atos onde aparece */}
        {atos.length > 0 && (
          <Section title="Atos no canvas" hint={`${atos.length} no grafo`}>
            {atos.map((ato) => (
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
                    {formatDate(ato.data_publicacao)}
                  </p>
                </div>
                <span
                  className="text-[8.5px] uppercase tracking-wider"
                  style={{ color: corPorNivel(ato.nivel_alerta), fontFamily: MONO }}
                >
                  {ato.nivel_alerta || "—"}
                </span>
              </button>
            ))}
          </Section>
        )}
      </div>

      {/* Footer link */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: `1px solid ${BORDER}`, background: PAPER }}>
        <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: SUBTLE, fontFamily: MONO }}>
          Selecionada · {pessoa.nome.split(" ")[0]}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: "#fff", padding: "12px 16px" }}>
      <p
        className="text-[9px] uppercase tracking-[0.22em]"
        style={{ color: SUBTLE, fontFamily: MONO }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-medium mt-1"
        style={{
          color: INK,
          fontFamily: mono ? MONO : TIGHT,
          letterSpacing: mono ? 0 : "-0.01em",
        }}
      >
        {value}
      </p>
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
