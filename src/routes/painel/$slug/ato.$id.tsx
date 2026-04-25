import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchPainelAto, type PainelAto, type HaikuIndicio, type HaikuPessoa } from "../../../lib/api-auth";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/painel/$slug/ato/$id")({
  component: AtoDetailPage,
});

const NIVEL_LABEL: Record<string, string> = {
  vermelho: "🔴 VERMELHO",
  laranja: "🟠 LARANJA",
  amarelo: "🟡 AMARELO",
  verde: "🟢 VERDE",
};

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "text-red-400",
  laranja: "text-orange-400",
  amarelo: "text-yellow-400",
  verde: "text-green-400",
};

function Section({
  title,
  children,
  locked,
}: {
  title: string;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium px-2 whitespace-nowrap">
          {title}
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>
      {locked ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-[12px] text-white/35">
            🔒 Disponível para planos Investigador e Profissional
          </p>
          <a
            href="/precos"
            className="mt-2 inline-block text-[12px] text-white/50 hover:text-white underline underline-offset-2 transition-colors"
          >
            Upgrade para Investigador →
          </a>
        </div>
      ) : (
        <div className="text-[14px] text-white/70 leading-relaxed">{children}</div>
      )}
    </div>
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Não foi possível carregar o ato.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, id]);

  const GRAVIDADE_BADGE: Record<string, string> = {
    critica: "bg-red-500/20 text-red-400 border border-red-500/30",
    alta: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    media: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    baixa: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-[13px]">Carregando...</p>
      </div>
    );
  }

  if (error || !ato) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/40 text-[13px]">{error ?? "Ato não encontrado."}</p>
      </div>
    );
  }

  const haiku = ato.resultado_haiku;
  const indicios: HaikuIndicio[] = haiku?.indicios ?? [];
  const pessoasHaiku: HaikuPessoa[] = haiku?.pessoas_extraidas ?? [];

  const sonnet = ato.resultado_sonnet;
  const sonnetAprofundada = sonnet?.analise_aprofundada as Record<string, unknown> | undefined;
  const narrativaCompleta = sonnetAprofundada?.narrativa_completa as string | undefined;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 max-w-3xl space-y-6">
      {/* Back */}
      <Link
        to="/painel/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={13} />
        Voltar
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[15px] font-semibold text-white uppercase tracking-wide">
            {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"} Nº{" "}
            {ato.numero}
          </h1>
          {ato.nivel_alerta && (
            <span
              className={`text-[13px] font-bold whitespace-nowrap ${NIVEL_COLOR[ato.nivel_alerta] ?? "text-white"}`}
            >
              {NIVEL_LABEL[ato.nivel_alerta]} — Score {ato.score_risco}
            </span>
          )}
        </div>
        <p className="text-[12px] text-white/35">
          CAU/PR ·{" "}
          {ato.data_publicacao
            ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "data não disponível"}
        </p>
        {ato.ementa && (
          <p className="text-[13px] text-white/50 mt-1 italic">{ato.ementa}</p>
        )}
      </div>

      {/* Resumo executivo — todos os planos */}
      {ato.resumo_executivo && (
        <Section title="Resumo Executivo">
          <p className="whitespace-pre-wrap">{ato.resumo_executivo}</p>
        </Section>
      )}

      {/* Indícios detectados — todos os planos (Haiku) */}
      {indicios.length > 0 && (
        <Section title="Indícios Detectados">
          <ul className="space-y-3">
            {indicios.map((indicio, i) => (
              <li key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${GRAVIDADE_BADGE[indicio.gravidade] ?? "bg-white/10 text-white/50"}`}>
                    {indicio.gravidade}
                  </span>
                  <span className="text-[11px] text-white/40 uppercase tracking-wide">{indicio.categoria}</span>
                  <span className="text-[11px] text-white/25">·</span>
                  <span className="text-[11px] text-white/40">{indicio.tipo}</span>
                </div>
                <p className="text-[13px] text-white/75">{indicio.descricao}</p>
                {indicio.artigo_violado && (
                  <p className="text-[11px] text-white/35">Artigo violado: {indicio.artigo_violado}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {indicios.length === 0 && haiku && (
        <Section title="Indícios Detectados">
          <p className="text-white/40 text-[13px]">Nenhum indício de irregularidade identificado.</p>
        </Section>
      )}

      {/* Pessoas identificadas — todos os planos (Haiku) */}
      {pessoasHaiku.length > 0 && (
        <Section title="Pessoas Mencionadas">
          <ul className="space-y-2">
            {pessoasHaiku.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-white/20 mt-0.5 text-[11px]">{i + 1}.</span>
                <div>
                  <span className="text-[13px] text-white/80 font-medium">{p.nome}</span>
                  {p.cargo && (
                    <span className="text-[12px] text-white/40 ml-2">— {p.cargo}</span>
                  )}
                  {p.tipo_aparicao && (
                    <p className="text-[11px] text-white/30">{p.tipo_aparicao}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Análise profunda */}
      <Section title="Análise Aprofundada">
        {narrativaCompleta ? (
          <p className="whitespace-pre-wrap">{narrativaCompleta}</p>
        ) : (
          <p className="text-white/40 text-[13px]">Análise detalhada ainda não disponível para este ato.</p>
        )}
      </Section>

      {/* Recomendação */}
      {ato.recomendacao_campanha && (
        <Section title="Recomendação">
          <p className="whitespace-pre-wrap">{ato.recomendacao_campanha}</p>
        </Section>
      )}

      {/* Links */}
      <Section title="Links">
        <div className="flex flex-wrap gap-3">
          {ato.url_pdf && (
            <a
              href={ato.url_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <ExternalLink size={13} />
              Documento original no CAU/PR
            </a>
          )}
          {ato.url_original && !ato.url_pdf && (
            <a
              href={ato.url_original}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <ExternalLink size={13} />
              Documento original no CAU/PR
            </a>
          )}
          <a
            href="https://www.caupr.gov.br/regimento/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <ExternalLink size={13} />
            Regimento Interno CAU/PR
          </a>
        </div>
      </Section>
    </div>
  );
}
