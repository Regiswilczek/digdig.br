import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchPainelAto, type PainelAto } from "../../../lib/api-auth";
import { supabase } from "../../../lib/supabase";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/painel/$slug/ato/$id" as any)({
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
  const { slug, id } = Route.useParams() as { slug: string; id: string };
  const [ato, setAto] = useState<PainelAto | null>(null);
  const [plano, setPlano] = useState<string>("cidadão");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user?.user_metadata?.plano) {
        setPlano(session.user.user_metadata.plano);
      }
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

  const investigador = ["investigador", "profissional", "api & dados"].includes(
    plano.toLowerCase().trim(),
  );

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

  const sonnet = ato.resultado_sonnet;
  const irregularidades = (sonnet?.irregularidades as string[] | undefined) ?? [];
  const pessoas = (sonnet?.pessoas as string[] | undefined) ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 max-w-3xl space-y-6">
      {/* Back */}
      <Link
        to={"/painel/$slug" as any}
        params={{ slug } as any}
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
      </div>

      {/* Resumo executivo — todos os planos */}
      {ato.resumo_executivo && (
        <Section title="Resumo Executivo">
          <p className="whitespace-pre-wrap">{ato.resumo_executivo}</p>
        </Section>
      )}

      {/* Análise profunda — Investigador+ */}
      <Section title="Análise Profunda [Investigador+]" locked={!investigador}>
        {investigador && !sonnet && (
          <p className="text-white/40">Análise Sonnet ainda não disponível para este ato.</p>
        )}
        {investigador && sonnet && (
          <p className="whitespace-pre-wrap">
            {(sonnet.analise_profunda as string) ?? "—"}
          </p>
        )}
      </Section>

      {/* Irregularidades */}
      {irregularidades.length > 0 && (
        <Section title="Irregularidades">
          <ul className="space-y-1.5">
            {irregularidades.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pessoas identificadas — Investigador+ */}
      <Section title="Pessoas Identificadas [Investigador+]" locked={!investigador}>
        {investigador && pessoas.length === 0 && (
          <p className="text-white/40">Nenhuma pessoa identificada neste ato.</p>
        )}
        {investigador && pessoas.length > 0 && (
          <ul className="space-y-1">
            {pessoas.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recomendação */}
      {ato.recomendacao_campanha && investigador && (
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
