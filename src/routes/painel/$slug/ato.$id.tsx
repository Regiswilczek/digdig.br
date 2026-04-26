import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  fetchPainelAto,
  type PainelAto,
  type HaikuIndicio,
  type HaikuPessoa,
} from "../../../lib/api-auth";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/painel/$slug/ato/$id")({
  component: AtoDetailPage,
});

const BORDER = "#e8e6e1";
const INK = "#0a0a0a";
const MUTED = "#6b6b66";
const SUBTLE = "#9a978f";
const PAPER = "#faf8f3";
const MONO = "'JetBrains Mono', monospace";
const TIGHT = "'Inter Tight', 'Inter', system-ui, sans-serif";

const NIVEL_LABEL: Record<string, string> = {
  vermelho: "Vermelho",
  laranja: "Laranja",
  amarelo: "Amarelo",
  verde: "Verde",
};

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "#b91c1c",
  laranja: "#c2410c",
  amarelo: "#a16207",
  verde: "#15803d",
};

const GRAVIDADE_BG: Record<string, { bg: string; fg: string; border: string }> =
  {
    critica: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
    alta: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
    media: { bg: "#fefce8", fg: "#a16207", border: "#fde68a" },
    baixa: { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
  };

function Section({
  eyebrow,
  title,
  children,
  locked,
}: {
  eyebrow: string;
  title?: string;
  children?: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <section
      className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6 md:gap-10 py-10"
      style={{ borderTop: `1px solid ${BORDER}` }}
    >
      <div>
        <p
          className="text-[10px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: SUBTLE, fontFamily: MONO }}
        >
          {eyebrow}
        </p>
        {title && (
          <h2
            className="mt-2 text-[18px] font-medium"
            style={{ color: INK, fontFamily: TIGHT, letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
        )}
      </div>
      <div className="min-w-0">
        {locked ? (
          <div
            className="p-6 text-center"
            style={{ border: `1px solid ${BORDER}`, background: PAPER }}
          >
            <p className="text-[13px]" style={{ color: MUTED }}>
              Disponível para planos Investigador e Profissional.
            </p>
            <a
              href="/precos"
              className="mt-3 inline-block text-[12px] uppercase tracking-wider hover:opacity-60 transition-opacity"
              style={{
                color: INK,
                fontFamily: MONO,
                borderBottom: `1px solid ${INK}`,
              }}
            >
              Ver planos →
            </a>
          </div>
        ) : (
          <div
            className="text-[14.5px] leading-relaxed"
            style={{ color: INK }}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

function AtoDetailPage() {
  const { slug, id } = Route.useParams();
  const [ato, setAto] = useState<PainelAto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPainelAto(slug, id);
        if (!cancelled) setAto(data);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar o ato.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, id]);

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-white"
        style={{ color: MUTED }}
      >
        <p className="text-[13px]">Carregando…</p>
      </div>
    );
  }

  if (error || !ato) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-white"
        style={{ color: MUTED }}
      >
        <p className="text-[13px]">{error ?? "Ato não encontrado."}</p>
      </div>
    );
  }

  const haiku = ato.resultado_haiku;
  const indicios: HaikuIndicio[] = haiku?.indicios ?? [];
  const pessoasHaiku: HaikuPessoa[] = haiku?.pessoas_extraidas ?? [];

  const sonnet = ato.resultado_sonnet;
  const sonnetAprofundada = sonnet?.analise_aprofundada as
    | Record<string, unknown>
    | undefined;
  const narrativaCompleta = sonnetAprofundada?.narrativa_completa as
    | string
    | undefined;

  const tipoLabel = ato.tipo === "deliberacao" ? "Deliberação" : "Portaria";
  const dataFmt = ato.data_publicacao
    ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "data não disponível";

  return (
    <div
      className="flex-1 overflow-y-auto bg-white"
      style={{ color: INK, overflowX: "hidden" }}
    >
      <div className="max-w-[920px] px-6 md:px-10 py-8">
        {/* Back */}
        <Link
          to="/painel/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] hover:opacity-60 transition-opacity"
          style={{ color: MUTED, fontFamily: MONO }}
        >
          <ArrowLeft size={12} />
          Voltar
        </Link>

        {/* Header */}
        <header className="mt-6 pb-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] uppercase tracking-[0.32em] font-semibold mb-3"
                style={{ color: SUBTLE, fontFamily: MONO }}
              >
                {tipoLabel} · {dataFmt}
              </p>
              <h1
                className="font-medium tracking-tight"
                style={{
                  fontFamily: TIGHT,
                  fontSize: "clamp(32px, 4vw, 44px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  color: INK,
                }}
              >
                Nº {ato.numero}
              </h1>
              {ato.ementa && (
                <p
                  className="mt-4 text-[15.5px] leading-relaxed"
                  style={{ color: MUTED }}
                >
                  {ato.ementa}
                </p>
              )}
            </div>
            {ato.nivel_alerta && (
              <div
                className="px-4 py-3 text-right"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.24em]"
                  style={{ color: SUBTLE, fontFamily: MONO }}
                >
                  Nível de alerta
                </p>
                <p
                  className="mt-1 text-[18px] font-semibold uppercase"
                  style={{
                    color: NIVEL_COLOR[ato.nivel_alerta] ?? INK,
                    fontFamily: MONO,
                    letterSpacing: "0.05em",
                  }}
                >
                  {NIVEL_LABEL[ato.nivel_alerta] ?? ato.nivel_alerta}
                </p>
                <p
                  className="text-[10.5px] uppercase tracking-wider mt-1"
                  style={{ color: MUTED, fontFamily: MONO }}
                >
                  Score {ato.score_risco}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Resumo */}
        {ato.resumo_executivo && (
          <Section eyebrow="01" title="Resumo executivo">
            <p className="whitespace-pre-wrap">{ato.resumo_executivo}</p>
          </Section>
        )}

        {/* Indícios */}
        {(indicios.length > 0 || haiku) && (
          <Section eyebrow="02" title="Indícios detectados">
            {indicios.length === 0 ? (
              <p style={{ color: MUTED }}>
                Nenhum indício de irregularidade identificado.
              </p>
            ) : (
              <ul className="space-y-3">
                {indicios.map((indicio, i) => {
                  const g = GRAVIDADE_BG[indicio.gravidade] ?? {
                    bg: PAPER,
                    fg: MUTED,
                    border: BORDER,
                  };
                  return (
                    <li
                      key={i}
                      className="p-4 space-y-2"
                      style={{ border: `1px solid ${BORDER}` }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider"
                          style={{
                            background: g.bg,
                            color: g.fg,
                            border: `1px solid ${g.border}`,
                            fontFamily: MONO,
                            borderRadius: 2,
                          }}
                        >
                          {indicio.gravidade}
                        </span>
                        <span
                          className="text-[10.5px] uppercase tracking-wider"
                          style={{ color: SUBTLE, fontFamily: MONO }}
                        >
                          {indicio.categoria} · {indicio.tipo}
                        </span>
                      </div>
                      <p className="text-[14px]" style={{ color: INK }}>
                        {indicio.descricao}
                      </p>
                      {indicio.artigo_violado && (
                        <p
                          className="text-[11px] uppercase tracking-wider"
                          style={{ color: MUTED, fontFamily: MONO }}
                        >
                          Artigo violado: {indicio.artigo_violado}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}

        {/* Pessoas */}
        {pessoasHaiku.length > 0 && (
          <Section eyebrow="03" title="Pessoas mencionadas">
            <ul className="space-y-3">
              {pessoasHaiku.map((p, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span
                    className="text-[11px] mt-0.5 uppercase tracking-wider"
                    style={{ color: SUBTLE, fontFamily: MONO }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: INK }}
                    >
                      {p.nome}
                    </span>
                    {p.cargo && (
                      <span
                        className="text-[13px] ml-2"
                        style={{ color: MUTED }}
                      >
                        — {p.cargo}
                      </span>
                    )}
                    {p.tipo_aparicao && (
                      <p
                        className="text-[11px] uppercase tracking-wider mt-0.5"
                        style={{ color: SUBTLE, fontFamily: MONO }}
                      >
                        {p.tipo_aparicao}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Análise aprofundada */}
        <Section eyebrow="04" title="Análise aprofundada">
          {narrativaCompleta ? (
            <p className="whitespace-pre-wrap">{narrativaCompleta}</p>
          ) : (
            <p style={{ color: MUTED }}>
              Análise detalhada ainda não disponível para este ato.
            </p>
          )}
        </Section>

        {/* Recomendação */}
        {ato.recomendacao_campanha && (
          <Section eyebrow="05" title="Recomendação">
            <p className="whitespace-pre-wrap">{ato.recomendacao_campanha}</p>
          </Section>
        )}

        {/* Links */}
        <Section eyebrow="06" title="Fontes">
          <div className="flex flex-wrap gap-3">
            {ato.url_pdf && (
              <a
                href={ato.url_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] uppercase tracking-wider hover:bg-[#faf8f3] transition-colors"
                style={{
                  border: `1px solid ${BORDER}`,
                  color: INK,
                  fontFamily: MONO,
                  borderRadius: 2,
                }}
              >
                <ExternalLink size={12} />
                Documento original
              </a>
            )}
            {ato.url_original && !ato.url_pdf && (
              <a
                href={ato.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] uppercase tracking-wider hover:bg-[#faf8f3] transition-colors"
                style={{
                  border: `1px solid ${BORDER}`,
                  color: INK,
                  fontFamily: MONO,
                  borderRadius: 2,
                }}
              >
                <ExternalLink size={12} />
                Documento original
              </a>
            )}
            <a
              href="https://www.caupr.gov.br/regimento/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] uppercase tracking-wider hover:bg-[#faf8f3] transition-colors"
              style={{
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: MONO,
                borderRadius: 2,
              }}
            >
              <ExternalLink size={12} />
              Regimento Interno CAU/PR
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}
