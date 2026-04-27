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

// ── Check row ─────────────────────────────────────────────────────────────────
function CheckRow({
  status,
  label,
  detail,
}: {
  status: "ok" | "fix" | "pending" | "fp";
  label: string;
  detail?: string;
}) {
  const colors: Record<string, { dot: string; text: string; bg: string }> = {
    ok: { dot: "#16a34a", text: "#15803d", bg: "#f0fdf4" },
    fix: { dot: "#ca8a04", text: "#92400e", bg: "#fffbeb" },
    pending: { dot: "#6366f1", text: "#4338ca", bg: "#eef2ff" },
    fp: { dot: SUBTLE, text: SUBTLE, bg: "#fafafa" },
  };
  const labels: Record<string, string> = {
    ok: "OK",
    fix: "Corrigindo",
    pending: "Pendente",
    fp: "Falso positivo",
  };
  const c = colors[status];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr",
        gap: 16,
        alignItems: "start",
        padding: "14px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <span
        style={{
          ...MONO,
          fontSize: 10,
          fontWeight: 500,
          color: c.text,
          background: c.bg,
          padding: "3px 8px",
          borderRadius: 2,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
        {labels[status]}
      </span>
      <div>
        <p style={{ fontSize: 14, color: TEXT, margin: "0 0 3px", fontWeight: 500 }}>{label}</p>
        {detail && <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5 }}>{detail}</p>}
      </div>
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
            Começamos com um órgão.{" "}
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

        {/* § 03 — Infraestrutura */}
        <Section
          eyebrow="§ 03 · Infraestrutura"
          title="Auditoria de segurança externa."
          intro={
            <>
              Em 27 de abril de 2026, o digdig.com.br passou por uma auditoria de segurança externa.
              Analisamos o relatório linha a linha — separamos o que é real, o que é falso positivo e o que
              já estávamos sabendo antes de qualquer auditor chegar.
            </>
          }
        >
          <div>
            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: 4 }}>
              O que o relatório acertou
            </p>
            <CheckRow
              status="fix"
              label="Versão do Nginx exposta (nginx/1.29.8)"
              detail="server_tokens off; sendo adicionado. Facilitar identificação de versão específica é risco real."
            />
            <CheckRow
              status="fix"
              label="Headers de segurança ausentes"
              detail="X-Frame-Options, X-Content-Type-Options, HSTS, CSP, X-XSS-Protection e Referrer-Policy sendo configurados no Nginx."
            />
            <CheckRow
              status="fix"
              label="Rate limiting não configurado"
              detail="Rotas públicas (/public/orgaos/...) sem proteção contra scraping abusivo ou DDoS L7. Zona limit_req sendo criada."
            />
            <CheckRow
              status="fix"
              label="FastAPI revelando stack nos erros"
              detail="Mensagens de validação do Pydantic expõem que o backend é FastAPI. Exception handler customizado sendo adicionado."
            />

            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: 32 }}>
              O que o relatório errou (falsos positivos)
            </p>
            <CheckRow
              status="fp"
              label='"Sem proteção CORS"'
              detail="CORSMiddleware está implementado no FastAPI (main.py). O auditor testou sem enviar header Origin válido — o middleware simplesmente não injeta headers quando não há Origin. A proteção existe."
            />
            <CheckRow
              status="fp"
              label='"Chaves públicas do Supabase expostas"'
              detail="A anon_key do Supabase é projetada para ficar no frontend. A segurança é garantida pelo Row Level Security (RLS) no banco — não pelo sigilo da chave anônima."
            />
            <CheckRow
              status="fp"
              label='"robots.txt e sitemap.xml mal configurados"'
              detail="Comportamento padrão de SPA com React Router em modo catch-all. Não é vulnerabilidade — é ausência de otimização de SEO."
            />

            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: 32 }}>
              O que o relatório não viu (achamos internamente)
            </p>
            <CheckRow
              status="fix"
              label="Rota administrativa sem bloqueio de IP"
              detail="O router /pnl contém endpoints que disparam rodadas de IA (custo real em dólares). Protegido apenas por X-Admin-Secret. Nginx sendo configurado para bloquear acesso externo ao path /admin/."
            />
            <CheckRow
              status="fix"
              label="Redis sem senha no Docker"
              detail="Container do Redis rodando sem requirepass. Rede interna do Docker mitiga, mas qualquer SSRF na API abriria a fila do Celery. Senha sendo adicionada."
            />
            <CheckRow
              status="fix"
              label="Volume de hot-reload montado em produção"
              detail="docker-compose.yml monta ./backend:/app — configuração de desenvolvimento que impede imutabilidade do container. Volume sendo removido do compose de produção."
            />

            <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, marginTop: 32 }}>
              O que já estava OK
            </p>
            <CheckRow status="ok" label="HTTPS com TLS 1.3 e certificado válido (Let's Encrypt)" />
            <CheckRow status="ok" label="SQL Injection — parâmetros validados pelo FastAPI/Pydantic" />
            <CheckRow status="ok" label="Arquivos sensíveis não expostos (.git, .env, config.php)" />
            <CheckRow status="ok" label="Validação de entrada com limite máximo no paginador (limit ≤ 100)" />
            <CheckRow status="ok" label="Autenticação nos endpoints do painel via Bearer Token (Supabase)" />
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
