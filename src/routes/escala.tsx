import { createFileRoute, Link } from "@tanstack/react-router";
import { ParticleField } from "@/components/ParticleField";
import { useOrgao } from "@/lib/orgao-store";

export const Route = createFileRoute("/escala")({
  head: () => ({
    meta: [
      { title: "Escala & Transparência — Dig Dig" },
      {
        name: "description",
        content:
          "O Brasil tem 5.570 municípios, 45 conselhos profissionais federais e centenas de milhões de atos administrativos nunca analisados. O Dig Dig começou com o CAU/PR — e não vai parar por aí.",
      },
      { property: "og:title", content: "Escala & Transparência — Dig Dig" },
      {
        property: "og:description",
        content:
          "Corpus atual, estimativa nacional e infraestrutura: tudo que sabemos sobre o que temos e até onde podemos chegar.",
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
  component: EscalaPage,
});

// ── Tokens (idênticos ao sistema das outras páginas) ─────────────────────────
const INTER: React.CSSProperties = { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" };
const TIGHT: React.CSSProperties = { fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif" };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" };

const TEXT = "#0a0a0a";
const MUTED = "#5a5a5a";
const SUBTLE = "#9a9a9a";
const BORDER = "rgba(0,0,0,0.08)";

function fmt(n: number | undefined | null, fallback = "—"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

// ── Section primitive ─────────────────────────────────────────────────────────
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
        <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>
          {eyebrow}
        </p>
        <h2
          style={{ ...TIGHT, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          className="text-[26px] md:text-[32px]"
        >
          {title}
        </h2>
        {intro && (
          <p style={{ color: MUTED, lineHeight: 1.6, margin: "16px 0 0" }} className="text-[14px] md:text-[15px]">
            {intro}
          </p>
        )}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  value,
  label,
  sub,
  accent,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: "20px 0", borderBottom: `1px solid ${BORDER}` }}>
      <p
        style={{ ...MONO, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, color: accent ?? TEXT, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {value}
      </p>
      <p style={{ fontSize: 14, color: TEXT, margin: "0 0 4px", fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ ...MONO, fontSize: 11, color: SUBTLE, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function EscalaPage() {
  const { stats, finStats } = useOrgao("cau-pr");

  const totalDocs =
    (stats?.total_atos ?? 0) +
    (finStats?.diarias.total ?? 0) +
    (finStats?.passagens.total ?? 0);

  return (
    <div style={{ ...INTER, background: "#fff", color: TEXT, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Hero ── */}
      <header className="relative overflow-hidden" style={{ background: "#07080f", minHeight: "min(580px, 75vh)" }}>
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
          <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ ...TIGHT, fontWeight: 700, fontSize: 17, color: "#fff" }}>Dig Dig</span>
            </Link>
            <Link to="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              ← Voltar
            </Link>
          </div>
        </nav>

        <div className="relative z-20 px-6 md:px-8 pt-16 md:pt-[100px] pb-16 md:pb-20" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ ...MONO, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
            Escala & Transparência
          </p>
          <h1
            style={{
              ...TIGHT,
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#fff",
              margin: "0 0 24px",
              maxWidth: 860,
            }}
          >
            Começamos com um órgão.
            <br />
            <span style={{ color: "rgba(255,255,255,0.45)" }}>
              O Brasil tem trinta mil.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, maxWidth: 600, margin: "0 0 48px" }}>
            Corpus atual, estimativa nacional e infraestrutura: o que já temos, o que existe para auditar,
            e o que construímos para aguentar a escala.
          </p>

          {/* Live strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 32,
              maxWidth: 700,
              paddingTop: 32,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              { v: fmt(totalDocs || stats?.total_atos), l: "documentos coletados" },
              { v: fmt(stats?.total_analisados), l: "analisados por IA" },
              { v: fmt(stats?.total_criticos), l: "casos críticos" },
              { v: fmt((finStats?.diarias.total ?? 0) + (finStats?.passagens.total ?? 0)), l: "registros financeiros" },
            ].map((s) => (
              <div key={s.l}>
                <p style={{ ...MONO, fontSize: 22, fontWeight: 500, color: "#fff", margin: 0, lineHeight: 1.1 }}>{s.v}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 6 }}>
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="px-6 md:px-8" style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* § 01 — Corpus atual */}
        <Section
          eyebrow="§ 01 · Corpus atual"
          title="O que o Dig Dig já tem."
          intro="Dados reais, ao vivo. Números atualizados conforme o pipeline roda."
        >
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            <StatCard
              value={fmt(stats?.total_atos)}
              label="Atos administrativos coletados — CAU/PR"
              sub="Portarias + deliberações plenárias, desde a primeira data publicada no portal"
            />
            <StatCard
              value={fmt(stats?.total_analisados)}
              label="Atos com análise de IA concluída"
              sub={`${stats ? Math.round((stats.total_analisados / stats.total_atos) * 100) : 0}% do corpus — crescendo a cada rodada`}
            />
            <StatCard
              value={fmt(stats?.total_criticos)}
              label="Casos críticos identificados"
              sub={`${fmt(stats?.distribuicao.vermelho)} vermelhos · ${fmt(stats?.distribuicao.laranja)} laranjas`}
              accent="#b91c1c"
            />
            <StatCard
              value={fmt(finStats?.diarias.total)}
              label="Diárias coletadas via Implanta"
              sub="Sistema interno do CAU/PR — API não documentada publicamente, extraída mês a mês"
            />
            <StatCard
              value={fmt(finStats?.passagens.total)}
              label="Passagens aéreas coletadas"
              sub="Registros financeiros com beneficiário, CIA, trecho e valor"
            />
            <StatCard
              value="U$0,40"
              label="Custo médio por documento analisado"
              sub="Após calibração de prompt e caching — documentado no WP08"
            />
          </div>
        </Section>

        {/* § 02 — Escala nacional */}
        <Section
          eyebrow="§ 02 · Escala nacional"
          title={<>O Brasil público<br /><span style={{ color: SUBTLE }}>em números reais.</span></>}
          intro="O CAU/PR é um órgão médio. Multiplique o que encontramos aqui por tudo que existe no país."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0" style={{ borderTop: `1px solid ${BORDER}` }}>
            {[
              { v: "5.570", l: "municípios brasileiros", sub: "Cada um com Diário Oficial, câmara e prefeitura publicando atos diariamente" },
              { v: "27", l: "unidades federativas", sub: "26 estados + Distrito Federal, com assembleias legislativas, tribunais e autarquias" },
              { v: "45", l: "conselhos profissionais federais", sub: "OAB, CRM, CFO, CFC, CREA, CAU, CRO, CFN e mais quarenta — cada um com regionais em todos os estados" },
              { v: "~1.170", l: "conselhos regionais estimados", sub: "Em média 26 por conselho federal — cada um com portal próprio, atos, portarias e dados financeiros" },
              { v: "~30.000", l: "órgãos públicos estimados", sub: "Incluindo autarquias, fundações, empresas públicas e secretarias de todos os níveis" },
              { v: "180k/ano", l: "atos no Diário Oficial da União", sub: "Apenas o federal. Estados e municípios multiplicam isso dezenas de vezes" },
              { v: "340M+", l: "registros no Portal da Transparência", sub: "Pagamentos, contratos, diárias — dados estruturados federais. A maioria dos estados e municípios não tem equivalente" },
              { v: "~500M", l: "atos administrativos estimados não estruturados", sub: "PDFs em portais, Diários Oficiais históricos e sistemas legados que nenhuma ferramenta leu ainda" },
            ].map((s) => (
              <div key={s.l} style={{ padding: "20px 0", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ ...MONO, fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 500, color: TEXT, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {s.v}
                </p>
                <p style={{ fontSize: 14, color: TEXT, margin: "0 0 4px", fontWeight: 500 }}>{s.l}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 40,
              padding: 24,
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              background: "#fafafa",
            }}
          >
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
              O que isso significa
            </p>
            <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.65, margin: "0 0 12px" }}>
              Se o CAU/PR sozinho rendeu{" "}
              <strong>{fmt(stats?.total_criticos)} casos críticos</strong> em{" "}
              <strong>{fmt(totalDocs || stats?.total_atos)} documentos</strong>, a mesma proporção aplicada
              aos ~30.000 órgãos públicos do Brasil representa dezenas de milhões de irregularidades
              nunca analisadas.
            </p>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
              A IA não cansa. Não esquece. Não precisa de liminares para ler um PDF.
              O gargalo é de coleta e processamento — e é exatamente o que o pipeline do Dig Dig resolve.
            </p>
          </div>
        </Section>

        {/* § 03 — Volume de dados */}
        <Section
          eyebrow="§ 03 · Volume de dados"
          title={<>411 milhões de registros<br /><span style={{ color: SUBTLE }}>gerados por ano.</span></>}
          intro="O Dig Dig não audita apenas documentos jurídicos. Qualquer dado presente nos portais de transparência — diárias, contratos, licitações, notas fiscais, folhas de pagamento — entra no escopo."
        >
          <div>
            {/* Máquina pública */}
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: 4 }}>
              A máquina que gera os dados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {[
                { v: "7,2M", l: "servidores públicos", sub: "1,2M federais · 2,5M estaduais · 3,5M municipais" },
                { v: "5.600", l: "órgãos públicos", sub: "Prefeituras, governos estaduais, ministérios e autarquias" },
                { v: "24M", l: "beneficiários de programas sociais", sub: "Bolsa Família, BPC e demais transferências mensais" },
              ].map((s) => (
                <div key={s.l} style={{ padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ ...MONO, fontSize: 28, fontWeight: 500, color: TEXT, margin: "0 0 5px", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.v}</p>
                  <p style={{ fontSize: 13, color: TEXT, margin: "0 0 3px", fontWeight: 500 }}>{s.l}</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.5 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Volume por categoria */}
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>
              Volume estimado por categoria · por ano
            </p>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
              {[
                { cat: "Beneficiários de programas sociais", v: "~288M", pct: 70, note: "Pagamentos mensais — dados altamente estruturados" },
                { cat: "Folha de pagamento de servidores", v: "~86M", pct: 21, note: "Um registro de remuneração por servidor por mês" },
                { cat: "Notas fiscais e empenhos", v: "~14M", pct: 3, note: "10 registros/dia por órgão em dias úteis" },
                { cat: "Diárias e deslocamentos", v: "~4,3M", pct: 1, note: "30% dos servidores viajam ~2x/ano com múltiplos registros" },
                { cat: "Passagens e hospedagem", v: "~13M", pct: 3, note: "Vinculadas aos deslocamentos de servidores" },
                { cat: "Contratos e licitações", v: "~860k", pct: 0.2, note: "100/prefeitura · 500/estado · 2.000/federal por ano" },
                { cat: "Atos administrativos (PDFs)", v: "~4,6M", pct: 1, note: "Portarias, decretos, deliberações — aqui a IA gera mais valor" },
              ].map((row, i) => (
                <div
                  key={row.cat}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < 6 ? `1px solid ${BORDER}` : undefined,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, color: TEXT, margin: "0 0 2px", fontWeight: 500 }}>{row.cat}</p>
                    <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{row.note}</p>
                  </div>
                  <p style={{ ...MONO, fontSize: 14, fontWeight: 500, color: TEXT, margin: 0, textAlign: "right", letterSpacing: "-0.01em" }}>
                    {row.v}
                  </p>
                </div>
              ))}
            </div>

            {/* Totais */}
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>
              Resumo do desafio
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0" style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
              {[
                { v: "~1,1M", l: "registros por dia", sub: "Volume diário consolidado de todos os órgãos do Brasil" },
                { v: "~411M", l: "registros por ano", sub: "Fluxo anual completo de transparência pública" },
                { v: "~8,2B", l: "registros históricos", sub: "Acumulado dos últimos 20 anos — nunca auditado por IA" },
              ].map((s, i) => (
                <div
                  key={s.l}
                  style={{
                    padding: "20px 20px",
                    borderRight: i < 2 ? `1px solid ${BORDER}` : undefined,
                  }}
                >
                  <p style={{ ...MONO, fontSize: 26, fontWeight: 500, color: TEXT, margin: "0 0 5px", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.v}</p>
                  <p style={{ fontSize: 13, color: TEXT, margin: "0 0 3px", fontWeight: 500 }}>{s.l}</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Duas esteiras */}
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>
              Como processar isso
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div style={{ padding: 20, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Esteira 1 · Dados estruturados
                </p>
                <p style={{ fontSize: 15, color: TEXT, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.3 }}>
                  Machine Learning estatístico
                </p>
                <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px", lineHeight: 1.55 }}>
                  Folhas de pagamento, programas sociais e diárias simples. Sem LLMs — algoritmos de detecção de anomalias identificam outliers: servidor municipal com R$150k num mês, 40 diárias em 30 dias.
                </p>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE }}>~91% do volume · custo baixo</p>
              </div>
              <div style={{ padding: 20, border: `1px solid ${TEXT}`, borderRadius: 4 }}>
                <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Esteira 2 · Dados não estruturados
                </p>
                <p style={{ fontSize: 15, color: TEXT, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.3 }}>
                  Piper · Bud · Zew
                </p>
                <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px", lineHeight: 1.55 }}>
                  Contratos, licitações, atos administrativos e justificativas de viagem. A IA lê o PDF do contrato, cruza com o edital, lê a portaria de nomeação. ~5–10M documentos/ano — alto valor por análise.
                </p>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE }}>~9% do volume · onde a IA brilha</p>
              </div>
            </div>

            {/* Comparação */}
            <div style={{ padding: 20, background: "#fafafa", border: `1px solid ${BORDER}`, borderRadius: 4 }}>
              <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Para efeito de comparação
              </p>
              <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.65, margin: 0 }}>
                O projeto <em>Querido Diário</em> possui hoje cerca de <strong>850.000 documentos</strong> em sua base.
                O Dig Dig, em visão completa, processaria{" "}
                <strong style={{ fontSize: 17 }}>480× mais dados</strong>{" "}
                — englobando toda a teia de gastos e regras da máquina pública brasileira.
              </p>
            </div>
          </div>
        </Section>

        {/* § 04 — O que vem depois */}
        <Section
          eyebrow="§ 04 · Roadmap"
          title={<>O que vem depois<br /><span style={{ color: SUBTLE }}>do CAU/PR.</span></>}
        >
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }} className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
            {[
              {
                n: "01",
                status: "Em desenvolvimento",
                titulo: "Análise financeira por IA",
                texto: "2.985 diárias e 44 passagens já estão no banco. Próxima etapa: cruzar cada registro com o ato que o autoriza e com o regimento que define o que é legítimo.",
              },
              {
                n: "02",
                status: "Em desenvolvimento",
                titulo: "Outros conselhos profissionais",
                texto: "A mesma arquitetura do CAU/PR se aplica ao CRM, CFO, CREA e qualquer conselho com portal WordPress e Diário Oficial. Cada novo órgão leva dias para integrar.",
              },
              {
                n: "03",
                status: "Planejado",
                titulo: "Câmaras municipais",
                texto: "5.570 câmaras. A maioria sem qualquer ferramenta de fiscalização acessível ao cidadão. Começar pelas maiores cidades e abrir para votação da comunidade.",
              },
              {
                n: "04",
                status: "Planejado",
                titulo: "Pedidos LAI automáticos",
                texto: "Quando o pipeline detecta padrão suspeito mas faltam documentos, a plataforma rascunha automaticamente um pedido de acesso à informação — com fundamentos legais preenchidos.",
              },
            ].map((item) => (
              <li key={item.n}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ ...MONO, fontSize: 12, color: SUBTLE, letterSpacing: "0.12em" }}>{item.n}</span>
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
                <h3 style={{ ...TIGHT, fontSize: 17, fontWeight: 600, color: TEXT, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                  {item.titulo}
                </h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{item.texto}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* CTA final */}
        <section style={{ padding: "96px 0 120px", textAlign: "center" }}>
          <p
            style={{
              ...TIGHT,
              fontSize: 24,
              fontWeight: 500,
              color: TEXT,
              letterSpacing: "-0.01em",
              margin: "0 0 16px",
              maxWidth: 520,
              marginInline: "auto",
              lineHeight: 1.3,
            }}
          >
            O corpus está aberto. A infraestrutura está pronta.
          </p>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, maxWidth: 460, margin: "0 auto 32px" }}>
            Explore os dados já coletados, leia os white papers ou apoie o projeto para chegar
            mais longe mais rápido.
          </p>
          <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              to="/explorar"
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
              Explorar o corpus
            </Link>
            <Link
              to="/blog"
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
              Ler white papers →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
