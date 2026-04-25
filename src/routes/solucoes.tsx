import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { ParticleField } from "@/components/ParticleField";
import { fetchStats, type PublicStats } from "@/lib/api";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções — Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig escava automaticamente atos administrativos públicos com IA — pipeline completo, fichas de denúncia, chat conversacional e roadmap para auditar todo o Brasil.",
      },
      { property: "og:title", content: "Soluções — Dig Dig" },
      {
        property: "og:description",
        content:
          "Pipeline contínuo de auditoria pública: coleta, extração, triagem com IA e fichas de denúncia acionáveis.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: SolucoesPage,
});

const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};
const TIGHT: React.CSSProperties = {
  fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
};
const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
};

const TEXT = "#0a0a0a";
const MUTED = "#5a5a5a";
const SUBTLE = "#9a9a9a";
const BORDER = "rgba(0,0,0,0.08)";

function fmt(n: number | undefined | null, fallback = "—"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

// ─── Section primitive ─────────────────────────────────────────────
function Section({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{ borderBottom: `1px solid ${BORDER}` }}
      className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-8 md:gap-12 py-16 md:py-[88px]"
    >
      <div>
        <p
          style={{
            ...MONO,
            fontSize: 11,
            color: SUBTLE,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            ...TIGHT,
            fontWeight: 600,
            color: TEXT,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
          className="text-[26px] md:text-[32px]"
        >
          {title}
        </h2>
        {intro && (
          <p
            style={{ color: MUTED, lineHeight: 1.6, margin: "16px 0 0" }}
            className="text-[14px] md:text-[15px]"
          >
            {intro}
          </p>
        )}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  );
}

// ─── Numbered list ─────────────────────────────────────────────────
function NumberedList({
  items,
}: {
  items: { n: string; titulo: string; texto: string; detalhe?: string }[];
}) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }} className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
      {items.map((e) => (
        <li key={e.n}>
          <p
            style={{
              ...MONO,
              fontSize: 12,
              color: SUBTLE,
              letterSpacing: "0.12em",
              marginBottom: 8,
            }}
          >
            {e.n}
          </p>
          <h3
            style={{
              ...TIGHT,
              fontSize: 17,
              fontWeight: 600,
              color: TEXT,
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
            }}
          >
            {e.titulo}
          </h3>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{e.texto}</p>
          {e.detalhe && (
            <p
              style={{
                ...MONO,
                fontSize: 11,
                color: SUBTLE,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              {e.detalhe}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

// ─── Personas ──────────────────────────────────────────────────────
type Solucao = {
  slug: string;
  publico: string;
  titulo: string;
  dor: string;
  beneficios: string[];
  planoSugerido: string;
};

const SOLUCOES: Solucao[] = [
  {
    slug: "jornalistas",
    publico: "Jornalismo investigativo",
    titulo: "Da pauta à matéria em horas, não meses.",
    dor: "O Diário Oficial tem 20 anos de PDFs. Lê tudo manualmente ou abandona a pauta.",
    beneficios: [
      "Fichas com fonte e número do ato",
      "Busca conversacional em linguagem natural",
      "Exportação em CSV/PDF para a redação",
      "Alertas por email ao detectar novo padrão",
    ],
    planoSugerido: "Investigador — R$ 179/mês",
  },
  {
    slug: "advogados",
    publico: "Direito e compliance",
    titulo: "Provas documentais organizadas para a petição inicial.",
    dor: "Reunir evidências exige semanas de leitura de atos esparsos em sites mal indexados.",
    beneficios: [
      "Citações com artigo, inciso e parágrafo exatos",
      "Linha do tempo de atos correlacionados",
      "Grafo de relacionamentos entre nomeados",
      "Exportação em PDF formatado para autos",
    ],
    planoSugerido: "Profissional — R$ 679/mês",
  },
  {
    slug: "conselheiros",
    publico: "Conselheiros e oposição",
    titulo: "Munição para o plenário, sem virar pesquisador.",
    dor: "A gestão produz mais documentos do que dá para ler. Você reage tarde — quando reage.",
    beneficios: [
      "Digest semanal — só o que importa",
      "Histórico de votações e ad referendum",
      "Detecção de quebra de quórum",
      "Chat para preparar pronunciamentos",
    ],
    planoSugerido: "Profissional — R$ 679/mês",
  },
  {
    slug: "vereadores",
    publico: "Parlamentares e assessorias",
    titulo: "Fiscalize o executivo sem montar equipe de pesquisa.",
    dor: "Câmaras têm orçamento limitado para análise. A oposição perde por desinformação, não argumento.",
    beneficios: [
      "Cobertura completa do executivo municipal",
      "Comparativo entre gestões",
      "Material para TV e redes com fontes",
      "Até 5 assessores no plano Profissional",
    ],
    planoSugerido: "Profissional — R$ 679/mês",
  },
  {
    slug: "cidadaos",
    publico: "Cidadãos e coletivos",
    titulo: "Transparência não é privilégio de quem tem assessoria.",
    dor: "O site oficial é hostil e os atos são técnicos. Você quer entender, mas não tem como.",
    beneficios: [
      "Acesso vitalício e gratuito",
      "3 votos/mês nas próximas auditorias",
      "Pode nominar qualquer órgão público",
      "Resultados públicos — sem paywall",
    ],
    planoSugerido: "Gratuito — R$ 0",
  },
  {
    slug: "api",
    publico: "Empresas e redações",
    titulo: "Dados estruturados de atos públicos via API.",
    dor: "Sua plataforma precisa de dados de atos públicos — raspar manualmente não escala.",
    beneficios: [
      "10.000 chamadas/mês via API de dados",
      "Webhooks de novos atos e alertas",
      "5 assentos incluídos para a equipe",
      "SLA e suporte técnico dedicado",
    ],
    planoSugerido: "API & Dados — R$ 1.998/mês",
  },
];

// ─── Page ──────────────────────────────────────────────────────────
function SolucoesPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    fetchStats("cau-pr").then(setStats).catch(() => {});
  }, []);

  const niveis = [
    { cor: "#16a34a", label: "Verde", desc: "Conforme. Ato rotineiro sem indícios de irregularidade.", exemplo: "PORTARIA Nº 676 — Exonera de Cargo a pedido (CJV)", pct: "~70%" },
    { cor: "#ca8a04", label: "Amarelo", desc: "Atenção. Padrão a observar — ainda não é irregularidade clara.", exemplo: "PORTARIA Nº 677 — Nomeia para Cargo em Comissão", pct: "~20%" },
    { cor: "#ea580c", label: "Laranja", desc: "Indício forte. Padrão repetido ou violação procedimental.", exemplo: "PORTARIA Nº 678 — Prorroga Comissão Processante (3ª vez)", pct: "~8%" },
    { cor: "#b91c1c", label: "Vermelho", desc: "Crítico. Provável violação direta do regimento — ficha de denúncia gerada.", exemplo: "Ad referendum sucessivo sem ratificação plenária", pct: "~2%" },
  ];

  const features = [
    { titulo: "Grafo de relacionamentos", texto: "Visualize quem nomeou quem, em que ato, e quantas vezes. Padrões de favorecimento aparecem na hora." },
    { titulo: "Linha do tempo", texto: "Atos correlacionados em ordem cronológica. Veja o histórico de uma comissão processante do início ao fim." },
    { titulo: "Alertas por email", texto: "Receba notificação quando um padrão novo for detectado, ou no digest semanal do seu órgão." },
    { titulo: "Exportação completa", texto: "Tudo em PDF, CSV ou JSON. Material pronto para a redação, petição inicial ou plenário." },
    { titulo: "API de dados", texto: "Plano API & Dados libera 10.000 chamadas/mês com webhooks de novos atos e alertas." },
    { titulo: "Multi-órgão", texto: "Comece com CAU/PR. Em breve: prefeituras, câmaras, conselhos profissionais de todo o Brasil." },
  ];

  const roadmap = [
    { n: "01", status: "Em desenvolvimento", titulo: "Gastos com diárias e passagens", texto: "Cruzamento automático de gastos declarados em portais de transparência com os atos que os autorizam. Quando o valor não bate ou a viagem não tem justificativa no ato, o sistema sinaliza." },
    { n: "02", status: "Em desenvolvimento", titulo: "Cartões corporativos", texto: "Análise de extratos de cartões corporativos de gestores públicos. A IA identifica gastos fora do escopo do cargo, padrões de uso em finais de semana e compras em estabelecimentos incompatíveis com a função." },
    { n: "03", status: "Planejado", titulo: "Pedidos de informação automáticos (LAI)", texto: "Quando o pipeline detecta padrão suspeito mas faltam documentos para concluir, a plataforma rascunha automaticamente um pedido de acesso à informação endereçado ao órgão — com fundamentos legais preenchidos. Pronto para enviar com um clique." },
    { n: "04", status: "Planejado", titulo: "Todos os órgãos públicos do Brasil", texto: "O CAU/PR é o primeiro. A arquitetura foi projetada para escalar: cada novo órgão leva dias para integrar. Prefeituras, câmaras, conselhos profissionais, autarquias — o Brasil tem mais de 5.000 municípios. Planejamos cobrir todos." },
  ];

  return (
    <div style={{ ...INTER, background: "#fff", color: TEXT, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ─── Hero ────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{ background: "#07080f", minHeight: "min(620px, 78vh)" }}
      >
        <ParticleField />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: "70%", background: "linear-gradient(to top, rgba(7,8,15,0.92) 25%, rgba(7,8,15,0) 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: "30%", background: "linear-gradient(to bottom, rgba(7,8,15,0.85) 0%, rgba(7,8,15,0) 100%)" }}
        />

        <nav className="relative z-20 px-6 md:px-8">
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ ...TIGHT, fontWeight: 700, fontSize: 17, color: "#fff" }}>Dig Dig</span>
            </Link>
            <Link
              to="/"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
            >
              ← Voltar
            </Link>
          </div>
        </nav>

        <div
          className="relative z-20 px-6 md:px-8 pt-16 md:pt-[100px] pb-16 md:pb-20"
          style={{ maxWidth: 1100, margin: "0 auto" }}
        >
          <p
            style={{
              ...MONO,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Soluções
          </p>
          <h1
            style={{
              ...TIGHT,
              fontSize: "clamp(38px, 6.5vw, 68px)",
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#fff",
              margin: "0 0 24px",
              maxWidth: 880,
            }}
          >
            A tecnologia a serviço da transparência.{" "}
            <span style={{ color: "rgba(255,255,255,0.55)" }}>
              Iluminando os arquivos do poder público.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55,
              maxWidth: 620,
              margin: "0 0 48px",
            }}
          >
            O Dig Dig coleta, lê e analisa automaticamente atos administrativos de órgãos
            públicos brasileiros. A IA classifica o nível de risco, cruza com o regimento
            interno e gera fichas de denúncia para os casos críticos.
          </p>

          {/* Live stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 32,
              maxWidth: 760,
              paddingTop: 32,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              { v: fmt(stats?.total_atos), l: "documentos coletados" },
              { v: fmt(stats?.total_analisados), l: "analisados" },
              { v: fmt(stats?.total_criticos), l: "casos críticos" },
              { v: "R$ 0", l: "para começar" },
            ].map((s) => (
              <div key={s.l}>
                <p style={{ ...MONO, fontSize: 22, fontWeight: 500, color: "#fff", margin: 0, lineHeight: 1.1 }}>
                  {s.v}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 6,
                  }}
                >
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Body ────────────────────────────────────────────────── */}
      <main className="px-6 md:px-8" style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* O que nos diferencia */}
        <Section
          eyebrow="O que nos diferencia"
          title="Não é uma busca. É uma análise."
        >
          <NumberedList
            items={[
              { n: "01", titulo: "Cruzamento regimental", texto: "Qualquer sistema encontra documentos. O Dig Dig cruza cada ato com o regimento interno do órgão e aponta a violação exata — artigo, inciso, parágrafo." },
              { n: "02", titulo: "Documentos acionáveis", texto: "Os alertas não ficam no dashboard. Viram fichas formatadas — prontas para jornalistas, advogadas e plenário — com sugestão de questionamento já redigida." },
              { n: "03", titulo: "Pipeline contínuo", texto: "Roda sem intervenção humana. Cada novo ato publicado pelo órgão entra na fila automaticamente. Você não precisa lembrar de checar." },
              { n: "04", titulo: "Memória permanente", texto: "Tudo que coletamos fica armazenado no banco. Mesmo que o órgão tire o site do ar ou mude de gestão, o histórico continua disponível." },
            ]}
          />
        </Section>

        {/* Como funciona */}
        <Section eyebrow="Como funciona" title="Quatro etapas. Zero leitura humana.">
          <NumberedList
            items={[
              { n: "01", titulo: "Coleta", texto: "O sistema baixa 100% dos atos do site oficial. PDFs ficam armazenados — nada se perde quando a gestão muda o site.", detalhe: `${fmt(stats?.total_atos)} documentos coletados no CAU/PR` },
              { n: "02", titulo: "Extração de texto", texto: "Processamos o texto nativo dos PDFs. Para documentos escaneados, a leitura óptica garante cobertura total.", detalhe: `${fmt(stats?.por_tipo.portaria.total)} documentos com texto extraído` },
              { n: "03", titulo: "Triagem — Dig Dig Piper", texto: "Cada ato recebe nível de alerta: verde, amarelo, laranja ou vermelho. Baixo custo, escala milhar de atos por hora.", detalhe: `${fmt(stats?.total_analisados)} triados — ${fmt(stats?.total_criticos)} críticos` },
              { n: "04", titulo: "Análise — Dig Dig Bud", texto: "Atos críticos viram fichas com violação de regimento, citação direta e sugestão de questionamento público.", detalhe: `${fmt(stats?.distribuicao.vermelho)} vermelhos com fichas geradas` },
            ]}
          />
        </Section>

        {/* Níveis */}
        <Section
          eyebrow="Classificação"
          title="Quatro níveis. Foco no que importa."
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            {niveis.map((n) => (
              <li key={n.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.cor }} />
                  <span
                    style={{
                      ...MONO,
                      fontSize: 12,
                      color: n.cor,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    {n.label}
                  </span>
                  <span style={{ ...MONO, fontSize: 11, color: SUBTLE, marginLeft: "auto" }}>{n.pct}</span>
                </div>
                <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.5, margin: "0 0 8px", fontWeight: 500 }}>
                  {n.desc}
                </p>
                <p style={{ ...MONO, fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  {n.exemplo}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Ficha de denúncia */}
        <Section
          eyebrow="Ficha de denúncia"
          title="Cada ato crítico vira documento acionável."
        >
          <div
            style={{
              border: `1px solid ${BORDER}`,
              padding: 28,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: 20,
                borderBottom: `1px solid ${BORDER}`,
                marginBottom: 24,
              }}
            >
              <div>
                <span
                  style={{
                    ...MONO,
                    fontSize: 11,
                    color: "#ea580c",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                >
                  ● Laranja
                </span>
                <h3 style={{ ...TIGHT, fontSize: 20, fontWeight: 600, color: TEXT, margin: "8px 0 4px", letterSpacing: "-0.01em" }}>
                  Portaria nº 678 / 2026
                </h3>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                  02/04/2026 · CAU/PR · Comissão Processante
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                  Confiança IA
                </p>
                <p style={{ ...MONO, fontSize: 22, color: TEXT, fontWeight: 500, margin: "4px 0 0" }}>87%</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Ementa
                </p>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>
                  Prorroga o prazo da Comissão Processante nomeada pela Portaria nº 580 de 07/04/2025 e
                  reconduzida pela Portaria 667 de 02/02/2026.
                </p>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Alertas detectados
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, top: 8, width: 4, height: 4, borderRadius: "50%", background: "#ea580c" }} />
                    <strong style={{ color: TEXT }}>Processo disciplinar:</strong> instauração ou prorrogação de comissão processante
                  </li>
                  <li style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, top: 8, width: 4, height: 4, borderRadius: "50%", background: "#ea580c" }} />
                    <strong style={{ color: TEXT }}>Prazo excessivo:</strong> comissão com múltiplas prorrogações (3ª desde abril/2025)
                  </li>
                </ul>
              </div>

              <div>
                <p style={{ ...MONO, fontSize: 11, color: TEXT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Violação regimental
                </p>
                <div style={{ borderLeft: `2px solid ${TEXT}`, paddingLeft: 14, marginBottom: 24 }}>
                  <p style={{ ...MONO, fontSize: 13, color: TEXT, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
                    "As comissões processantes terão prazo de 60 dias, prorrogáveis uma única vez por
                    igual período."
                  </p>
                  <p style={{ fontSize: 12, color: SUBTLE, marginTop: 8 }}>
                    Regimento Interno CAU/PR — Art. 47, §2º (DPOPR 0191-02/2025)
                  </p>
                </div>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Sugestão de questionamento
                </p>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                  Solicitar ao plenário justificativa formal para a 3ª prorrogação consecutiva, com
                  cronograma de conclusão e identificação dos investigados.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: `1px solid ${BORDER}`,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <a
                href="https://www.caupr.gov.br/wp-content/uploads/2026/04/CAUPR-PRES-Portaria2026.0678-PAD_2025.01_PRT2025.0580-20260402-v01-FPBM_WGL.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...MONO,
                  fontSize: 12,
                  color: MUTED,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ArrowUpRight size={14} /> PDF original no caupr.gov.br
              </a>
              <span
                style={{
                  ...MONO,
                  fontSize: 11,
                  color: SUBTLE,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Exportar PDF · CSV · JSON
              </span>
            </div>
          </div>
        </Section>

        {/* Padrões */}
        <Section
          eyebrow="Padrões detectados"
          title="A IA conecta o que está fragmentado."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 24,
              paddingBottom: 24,
              borderBottom: `1px solid ${BORDER}`,
              marginBottom: 24,
            }}
          >
            {[
              { v: fmt(stats?.total_atos), l: "coletados" },
              { v: fmt(stats?.total_analisados), l: "analisados" },
              { v: fmt(stats?.total_criticos), l: "críticos" },
              { v: fmt(stats?.distribuicao.laranja), l: "laranja" },
              { v: fmt(stats?.distribuicao.vermelho), l: "vermelho" },
            ].map((s) => (
              <div key={s.l}>
                <p style={{ ...MONO, fontSize: 22, fontWeight: 500, color: TEXT, margin: 0, lineHeight: 1.1 }}>
                  {s.v}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: SUBTLE,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 6,
                  }}
                >
                  {s.l}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.6, margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>{fmt(stats?.total_criticos)} casos críticos</strong>{" "}
            detectados — indício de irregularidades legais e morais em atos do CAU/PR.{" "}
            <strong style={{ fontWeight: 600 }}>{fmt(stats?.distribuicao.vermelho)} vermelhos</strong>{" "}
            com possível violação direta do regimento — fichas de denúncia em geração.
          </p>
        </Section>

        {/* Chat */}
        <Section
          eyebrow="Chat conversacional"
          title="Pergunte como se fosse um pesquisador."
          intro="Acesso Livre: 5 perguntas/mês · Apoio Ativo: 200/mês · Apoio Institucional: 1.000/mês."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: `1px solid ${BORDER}`, padding: 18, borderRadius: 4 }}>
              <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Você
              </p>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.55, margin: 0 }}>
                Quantas vezes a presidência usou ad referendum em 2025 sem ratificação plenária?
              </p>
            </div>
            <div style={{ border: `1px solid ${TEXT}`, padding: 18, borderRadius: 4, background: "#fafafa" }}>
              <p style={{ ...MONO, fontSize: 11, color: TEXT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Dig Dig
              </p>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: "0 0 12px" }}>
                Em 2025, a presidência do CAU/PR emitiu <strong>28 atos ad referendum</strong>. Destes,{" "}
                <strong>11 não foram ratificados</strong> em plenária dentro do prazo regimental de 30
                dias (Art. 41 do Regimento Interno).
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 16px" }}>
                Os atos sem ratificação concentram-se em: nomeações para cargos comissionados (6),
                prorrogações de comissões processantes (3) e contratações emergenciais (2).
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  paddingTop: 12,
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                {["Portaria 612/2025", "Portaria 634/2025", "Deliberação Plen. 89/2025", "+8 fontes"].map((f) => (
                  <span
                    key={f}
                    style={{
                      ...MONO,
                      fontSize: 11,
                      color: MUTED,
                      padding: "3px 8px",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* O que mais vem junto */}
        <Section
          eyebrow="O que mais vem junto"
          title="Mais do que uma busca: um sistema."
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {features.map((f, i) => (
              <li
                key={f.titulo}
                style={{
                  borderTop: i === 0 ? `1px solid ${BORDER}` : "none",
                  borderBottom: `1px solid ${BORDER}`,
                  padding: "20px 0",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                  gap: 24,
                  alignItems: "start",
                }}
                className="grid-cols-1 sm:grid-cols-[1fr_2fr]"
              >
                <h3 style={{ ...TIGHT, fontSize: 16, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: "-0.01em" }}>
                  {f.titulo}
                </h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{f.texto}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Para quem é */}
        <Section
          eyebrow="Para quem é"
          title="Seis perfis. Uma ferramenta."
          intro="O acesso ao banco auditado é gratuito para qualquer cidadão. Os planos existem para quem usa profissionalmente — volume de chat, exportações, API e alertas."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SOLUCOES.map((s) => (
              <div
                key={s.slug}
                id={s.slug}
                style={{
                  border: `1px solid ${BORDER}`,
                  padding: 22,
                  borderRadius: 4,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    ...MONO,
                    fontSize: 11,
                    color: SUBTLE,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    margin: "0 0 8px",
                  }}
                >
                  {s.publico}
                </p>
                <h3
                  style={{
                    ...TIGHT,
                    fontSize: 18,
                    fontWeight: 600,
                    color: TEXT,
                    margin: "0 0 8px",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}
                >
                  {s.titulo}
                </h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 16px" }}>
                  {s.dor}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {s.beneficios.map((b) => (
                    <li
                      key={b}
                      style={{
                        fontSize: 13,
                        color: MUTED,
                        lineHeight: 1.5,
                        paddingLeft: 14,
                        position: "relative",
                      }}
                    >
                      <span style={{ position: "absolute", left: 0, top: 8, width: 3, height: 3, borderRadius: "50%", background: TEXT }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    paddingTop: 14,
                    borderTop: `1px solid ${BORDER}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: SUBTLE }}>{s.planoSugerido}</span>
                  <Link
                    to="/apoiar"
                    style={{
                      ...INTER,
                      fontSize: 12,
                      fontWeight: 500,
                      color: TEXT,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Ver plano →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Roadmap */}
        <Section
          eyebrow="O que vem depois"
          title={
            <>
              O Brasil tem mais de 5.000 municípios.
              <br />
              <span style={{ color: SUBTLE }}>E uma lei de acesso à informação.</span>
            </>
          }
          intro="O Dig Dig é uma plataforma em construção aberta. O CAU/PR é o início — o que vem depois está planejado e em desenvolvimento agora."
        >
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }} className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
            {roadmap.map((item) => (
              <li key={item.n}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ ...MONO, fontSize: 12, color: SUBTLE, letterSpacing: "0.12em" }}>
                    {item.n}
                  </span>
                  <span
                    style={{
                      ...MONO,
                      fontSize: 10,
                      color: SUBTLE,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                <h3
                  style={{
                    ...TIGHT,
                    fontSize: 17,
                    fontWeight: 600,
                    color: TEXT,
                    margin: "0 0 6px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.titulo}
                </h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{item.texto}</p>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 13, color: SUBTLE, lineHeight: 1.6, margin: "32px 0 0", maxWidth: 560 }}>
            Tudo isso está sendo construído com a mesma arquitetura do pipeline atual — código aberto,
            custos rastreados, decisões documentadas publicamente.
          </p>
        </Section>

        {/* Footer CTA */}
        <section style={{ padding: "96px 0 120px", textAlign: "center" }}>
          <p
            style={{
              ...TIGHT,
              fontSize: 24,
              fontWeight: 500,
              color: TEXT,
              letterSpacing: "-0.01em",
              margin: "0 0 16px",
              maxWidth: 540,
              marginInline: "auto",
              lineHeight: 1.3,
            }}
          >
            Comece grátis. Apoie se acreditar.
          </p>
          <p
            style={{
              fontSize: 15,
              color: MUTED,
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            O conteúdo — fichas, análises, dados — fica aberto para qualquer pessoa.
            Os planos pagos sustentam o pipeline.
          </p>
          <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="/cadastro"
              style={{
                ...INTER,
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: TEXT,
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Criar conta grátis
            </a>
            <Link
              to="/apoiar"
              style={{
                ...INTER,
                fontSize: 14,
                fontWeight: 500,
                color: TEXT,
                border: `1px solid ${BORDER}`,
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Apoiar o projeto →
            </Link>
          </div>
          <p style={{ fontSize: 13, color: SUBTLE, marginTop: 32 }}>
            Dúvidas:{" "}
            <a
              href="mailto:regisalessander@gmail.com"
              style={{ color: MUTED, textDecoration: "underline" }}
            >
              regisalessander@gmail.com
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
