import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ParticleField } from "@/components/ParticleField";
import { useOrgao } from "@/lib/orgao-store";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções | Dig Dig" },
      {
        name: "description",
        content:
          "O Dig Dig escava automaticamente atos administrativos públicos com IA. Pipeline de 4 agentes, fichas de denúncia, chat conversacional, multi-órgão (CAU/PR e GOV/PR ativos).",
      },
      { property: "og:title", content: "Soluções | Dig Dig" },
      {
        property: "og:description",
        content:
          "Pipeline contínuo de auditoria pública: coleta, extração, classificação canônica, triagem e investigação aprofundada por IA.",
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

function fmt(n: number | undefined | null, fallback = "·"): string {
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
    dor: "Diários oficiais com décadas de PDFs. Lê tudo manualmente ou abandona a pauta.",
    beneficios: [
      "Fichas com fonte, número do ato e citação direta",
      "Busca conversacional em linguagem natural",
      "Exportação em CSV/PDF para a redação",
      "Cobertura simultânea de conselhos e governos estaduais",
    ],
    planoSugerido: "Investigador · R$ 179/mês",
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
    planoSugerido: "Profissional · R$ 679/mês",
  },
  {
    slug: "conselheiros",
    publico: "Conselheiros e oposição",
    titulo: "Munição para o plenário, sem virar pesquisador.",
    dor: "A gestão produz mais documentos do que dá para ler. Você reage tarde, quando reage.",
    beneficios: [
      "Digest semanal: só o que importa",
      "Histórico de votações e ad referendum",
      "Detecção de quebra de quórum",
      "Chat para preparar pronunciamentos",
    ],
    planoSugerido: "Profissional · R$ 679/mês",
  },
  {
    slug: "vereadores",
    publico: "Parlamentares e assessorias",
    titulo: "Fiscalize o executivo sem montar equipe de pesquisa.",
    dor: "Câmaras têm orçamento limitado para análise. A oposição perde por desinformação, não argumento.",
    beneficios: [
      "Cobertura completa do executivo estadual e municipal",
      "Comparativo entre gestões",
      "Material para TV e redes com fontes",
      "Até 5 assessores no plano Profissional",
    ],
    planoSugerido: "Profissional · R$ 679/mês",
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
      "Resultados públicos, sem paywall",
    ],
    planoSugerido: "Gratuito · R$ 0",
  },
  {
    slug: "api",
    publico: "Empresas e redações",
    titulo: "Dados estruturados de atos públicos via API.",
    dor: "Sua plataforma precisa de dados de atos públicos, e raspar manualmente não escala.",
    beneficios: [
      "10.000 chamadas/mês via API de dados",
      "Webhooks de novos atos e alertas",
      "5 assentos incluídos para a equipe",
      "SLA e suporte técnico dedicado",
    ],
    planoSugerido: "API & Dados · R$ 1.998/mês",
  },
];

// ─── Page ──────────────────────────────────────────────────────────
function SolucoesPage() {
  const { stats } = useOrgao("cau-pr");
  const [tenantsTotalAtos, setTenantsTotalAtos] = useState<number>(0);
  const [tenantsAtivos, setTenantsAtivos] = useState<number>(1);

  // Soma agregada dos tenants ativos. Base do "documentos coletados".
  // CAU/PR + GOV/PR + futuros entram automaticamente.
  useEffect(() => {
    fetch("/public/tenants")
      .then((r) => r.json())
      .then((tenants: Array<{ total_atos?: number; status?: string }>) => {
        const ativos = tenants.filter((t) => t.status === "active");
        setTenantsAtivos(ativos.length);
        setTenantsTotalAtos(ativos.reduce((acc, t) => acc + (t.total_atos ?? 0), 0));
      })
      .catch(() => {
        setTenantsTotalAtos(stats?.total_atos ?? 0);
      });
  }, [stats?.total_atos]);

  const niveis = [
    { cor: "#16a34a", label: "Verde", desc: "Conforme. Ato rotineiro sem indícios de irregularidade.", exemplo: "Defensoria PR × CONDEGE: cooperação técnica institucional", pct: "~70%" },
    { cor: "#ca8a04", label: "Amarelo", desc: "Atenção. Padrão a observar, ainda não é irregularidade clara.", exemplo: "Fundação Araucária × UNICENTRO: pesquisa científica padrão", pct: "~20%" },
    { cor: "#ea580c", label: "Laranja", desc: "Indício forte. Padrão repetido ou violação procedimental.", exemplo: "SEAP × Coral Paraná: Termo de Fomento sem chamamento", pct: "~8%" },
    { cor: "#b91c1c", label: "Vermelho", desc: "Crítico. Provável violação direta, ficha de denúncia gerada.", exemplo: "FEAP × Município: convênio com indícios críticos de impessoalidade", pct: "~2%" },
  ];

  const features = [
    { titulo: "Multi-tenant nativo", texto: "Cada órgão é um tenant isolado. Conselho profissional, executivo estadual ou prefeitura: a mesma arquitetura. Hoje 2 ativos: CAU/PR e GOV/PR." },
    { titulo: "Knowledge base por órgão", texto: "Cada tenant carrega sua base legal própria. CAU/PR tem regimento e Lei 12.378. GOV/PR tem Constituição PR, Lei 15.608 (Licitações PR), LRF, Improbidade. A IA cita o artigo certo." },
    { titulo: "Mindset investigativo customizado", texto: "Padrões investigativos são específicos do tipo de órgão. Conselho tem ata plenária e ad referendum. Executivo tem decreto de calamidade, dispensa via emergência, convênio com OSC. A IA sabe a diferença." },
    { titulo: "Grafo de relacionamentos", texto: "Visualize quem nomeou quem, em que ato, e quantas vezes. Padrões de favorecimento aparecem entre órgãos diferentes: pessoas se repetem." },
    { titulo: "Linha do tempo", texto: "Atos correlacionados em ordem cronológica. Veja o histórico de uma comissão processante ou a sequência de aditivos de um convênio." },
    { titulo: "Exportação completa", texto: "Tudo em PDF, CSV ou JSON. Material pronto para a redação, petição inicial ou plenário. API REST para empresas e redações." },
  ];

  const roadmap = [
    { n: "01", status: "Em produção", titulo: "Governo do Estado do Paraná", texto: "GOV/PR ativo desde abril/2026. Pipeline cobrindo convênios, contratos, licitações, dispensas, fornecedores, preços registrados, catálogo de itens, viagens e remuneração de servidores. Knowledge base com Constituição Estadual, Lei 15.608/2007 e legislação federal aplicável." },
    { n: "02", status: "Em desenvolvimento", titulo: "Sistemas externos integrados", texto: "Portal de Transparência v4 (repasses a municípios desde 1999), SIAFIC (sistema integrado de execução financeira), FlexPortal (despesas detalhadas), Qlik dashboards e PowerBI de emendas parlamentares. Cada um requer integração própria. A fundação está sendo construída." },
    { n: "03", status: "Em desenvolvimento", titulo: "Diário Oficial e Legislação Estadual", texto: "Captura sistemática de decretos do Governador, leis publicadas e atos administrativos do Diário Oficial Executivo. Aproximadamente 5.400 edições históricas e 50.000 leis estaduais consolidadas." },
    { n: "04", status: "Planejado", titulo: "Cruzamento com bases externas", texto: "Receita Federal (CNPJ.ws) para identificar laranjas e holdings nos fornecedores. TSE/TRE para detectar doadores de campanha que recebem contratos. Wayback Machine para preservar versões anteriores antes que governos as alterem." },
    { n: "05", status: "Planejado", titulo: "Pedidos de informação automáticos (LAI)", texto: "Quando o pipeline detecta padrão suspeito mas faltam documentos para concluir, a plataforma rascunha automaticamente um pedido de acesso à informação, com fundamentos legais preenchidos. Pronto para enviar com um clique." },
    { n: "06", status: "Planejado", titulo: "Outros estados, prefeituras, conselhos federais", texto: "A arquitetura foi construída para escalar. Cada novo órgão requer apenas três coisas: fonte de dados, base legal e mindset investigativo do tipo. Brasil tem 27 estados, mais de 5.000 municípios e dezenas de conselhos profissionais federais." },
  ];

  const totalDocs = tenantsTotalAtos || stats?.total_atos || 0;

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
              Quatro agentes de IA escavando o que o poder prefere enterrado.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55,
              maxWidth: 640,
              margin: "0 0 48px",
            }}
          >
            O Dig Dig coleta, lê e organiza atos administrativos de órgãos públicos
            brasileiros. A IA sinaliza indícios. A decisão de denunciar, publicar
            ou processar continua sendo sua. Hoje cobrimos o CAU/PR e o Governo do
            Estado do Paraná, com a mesma arquitetura escalando para qualquer ente público.
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
              { v: fmt(totalDocs), l: "documentos coletados" },
              { v: fmt(tenantsAtivos), l: tenantsAtivos === 1 ? "órgão ativo" : "órgãos ativos" },
              { v: "4", l: "agentes de IA" },
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
          title="Lemos por você. A decisão é sua."
          intro="O Dig Dig faz a leitura volumosa que humano nenhum aguenta: milhares de PDFs por órgão. Em troca, devolve indícios organizados, citações diretas e ficha pronta. O que fazer com isso (denunciar, publicar, processar, arquivar) segue sendo escolha sua."
        >
          <NumberedList
            items={[
              { n: "01", titulo: "Direito específico, não genérico", texto: "A IA não cita lei abstrata. Cada órgão entra no sistema com suas próprias leis e regimento: Lei 12.378 e regimento interno pro CAU/PR; Constituição Estadual, Lei 15.608 (Licitações PR), LRF e Improbidade pro GOV/PR. Cada indício aponta o artigo exato violado." },
              { n: "02", titulo: "Sabe onde cada órgão esconde", texto: "O truque que mascara irregularidade num conselho profissional é diferente do truque num governo estadual. Conselho usa ata plenária aprovada por unanimidade e ad referendum sem leitura. Governo usa decreto de calamidade pra dispensar licitação e termo de fomento sem chamamento. A IA é calibrada pelo perfil de cada órgão." },
              { n: "03", titulo: "Ficha pronta, não alerta solto", texto: "Cada ato crítico vira documento formatado: fato, citação direta do trecho, lei violada com artigo, sugestão de questionamento. Pronto pra reportagem, petição inicial ou pronunciamento de plenário, sem você redigir do zero." },
              { n: "04", titulo: "Memória que o Brasil não tem", texto: "Tudo que coletamos fica preservado no nosso banco. Se o órgão tirar o site do ar, mudar de gestão ou apagar atos, o histórico continua aqui. O Brasil esquece. O Dig Dig lembra." },
            ]}
          />
        </Section>

        {/* Os 4 agentes */}
        <Section
          eyebrow="Os quatro agentes"
          title="Pipeline em camadas. Cada agente faz o que faz melhor."
          intro="Em vez de um único modelo gigante, dividimos a análise em quatro etapas especializadas. Cada agente usa o modelo certo para sua tarefa: barato no que pode ser barato, caro só onde o caro entrega valor."
        >
          <NumberedList
            items={[
              { n: "ATLAS", titulo: "Organização canônica", texto: "Lê cada documento e classifica em uma das 26 categorias canônicas (convênio, contrato, ata plenária, decreto, portaria, etc). Extrai metadados estruturados: data, número, valor, pessoas, órgão. É o que faz as abas do painel terem sentido.", detalhe: "Modelo barato. Escala milhares de documentos por hora." },
              { n: "PIPER", titulo: "Triagem investigativa", texto: "Lê o texto inteiro de cada ato e classifica nível de risco: verde, amarelo, laranja ou vermelho. Aponta indícios de irregularidade, cita artigos da KB e extrai pessoas/valores. Roda em todos os atos com texto disponível.", detalhe: "Modelo Pro. Contexto longo, raciocínio jurídico." },
              { n: "BUD", titulo: "Investigação aprofundada", texto: "Para os atos críticos (laranja e vermelho), entra em ação. Cruza com o histórico completo das pessoas no corpus, audita a análise do Piper, gera ficha de denúncia formatada com citações diretas do texto e sugestão de questionamento.", detalhe: "Modelo de raciocínio profundo. Auditoria do Piper." },
              { n: "ZEW", titulo: "Síntese sistêmica", texto: "Olha o corpus inteiro de um órgão e identifica padrões que nenhum ato isolado revela: quem aparece em quantas comissões, qual fornecedor concentra contratos, quais prefeituras recebem repasses só em ano eleitoral. Hipóteses para reportagem investigativa.", detalhe: "Modelo de síntese. Corpus completo do órgão." },
            ]}
          />
        </Section>

        {/* Como funciona o pipeline */}
        <Section
          eyebrow="Como funciona"
          title="Da publicação à ficha, pronto para sua leitura."
          intro="O pipeline corre sozinho até o ponto em que você precisa ler. A leitura crítica do material é o que muda denúncia de palpite para evidência, e essa parte continua humana."
        >
          <NumberedList
            items={[
              { n: "01", titulo: "Coleta multi-fonte", texto: "Para cada órgão, configuramos coletores específicos. CAU/PR: scraper do site oficial. GOV/PR: API REST de exportação, scrapers de subsistemas, dumps mensais de remuneração. Tudo armazenado com checksum e URL de origem." },
              { n: "02", titulo: "Extração e qualidade", texto: "PDF nativo para a maioria. OCR para documentos escaneados. Cada documento ganha um indicador de qualidade (boa, parcial ou ruim) e os ruins entram em fila para reprocessamento." },
              { n: "03", titulo: "Classificação canônica (ATLAS)", texto: "Documentos vindos de fontes diferentes ganham um tipo unificado. Convênio do PTE e portaria do Diário Oficial caem em categorias canônicas que permitem comparação cruzada entre órgãos." },
              { n: "04", titulo: "Triagem (PIPER) + investigação (BUD)", texto: "Piper classifica todos. Bud aprofunda apenas os críticos. Atos verdes ficam disponíveis para consulta, não viram alerta. Atos vermelhos viram fichas. O dashboard mostra o que importa em ordem de gravidade." },
            ]}
          />
        </Section>

        {/* Níveis */}
        <Section
          eyebrow="Classificação"
          title="Quatro níveis. Você decide onde focar."
          intro="Distribuição típica num corpus do executivo estadual: predominância de atos rotineiros, minoria com indícios fortes. A IA organiza por gravidade. Você escolhe o que merece leitura crítica."
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
                  Ex: {n.exemplo}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Ficha de denúncia: exemplo GOV-PR */}
        <Section
          eyebrow="Ficha de denúncia"
          title="Cada ato crítico vira documento acionável."
          intro="Exemplo real do GOV/PR. Convênio analisado pelo Piper em maio/2026."
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
                  Termo de Fomento nº 001/2024
                </h3>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                  24/04/2024 · GOV/PR · Secretaria de Administração e Previdência (SEAP)
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ ...MONO, fontSize: 10, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                  Score de risco
                </p>
                <p style={{ ...MONO, fontSize: 22, color: TEXT, fontWeight: 500, margin: "4px 0 0" }}>75</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Objeto
                </p>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>
                  Repasse de recursos públicos à Coral Paraná de Curitiba, organização cultural,
                  para execução de plano de trabalho artístico, sem chamamento público prévio.
                </p>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Indícios detectados
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, top: 8, width: 4, height: 4, borderRadius: "50%", background: "#ea580c" }} />
                    <strong style={{ color: TEXT }}>Dispensa indevida (alta):</strong> ausência de chamamento público sem justificativa fática suficiente
                  </li>
                  <li style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, top: 8, width: 4, height: 4, borderRadius: "50%", background: "#ea580c" }} />
                    <strong style={{ color: TEXT }}>Violação de impessoalidade (alta):</strong> entidade beneficiária identificada sem critério objetivo de seleção
                  </li>
                </ul>
              </div>

              <div>
                <p style={{ ...MONO, fontSize: 11, color: TEXT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Base legal violada
                </p>
                <div style={{ borderLeft: `2px solid ${TEXT}`, paddingLeft: 14, marginBottom: 24 }}>
                  <p style={{ ...MONO, fontSize: 13, color: TEXT, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
                    "A celebração de termo de fomento ou colaboração será precedida de chamamento público,
                    salvo nas hipóteses previstas nesta Lei."
                  </p>
                  <p style={{ fontSize: 12, color: SUBTLE, marginTop: 8 }}>
                    Lei 13.019/2014 · Art. 24, c/c Art. 30 (hipóteses de dispensa)
                  </p>
                </div>
                <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                  Sugestão de questionamento
                </p>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                  Solicitar à SEAP justificativa formal para a dispensa de chamamento público, com
                  comprovação documental do enquadramento em hipótese legal específica do Art. 30
                  da Lei 13.019/2014.
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
                href="https://digdig.com.br/painel/gov-pr"
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
                <ArrowUpRight size={14} /> Ver no painel · gov-pr
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

        {/* Cobertura atual */}
        <Section
          eyebrow="Cobertura atual"
          title="Dois órgãos no ar. A escala já está provada."
          intro="Cada órgão é um tenant isolado: base legal própria, mindset investigativo próprio, dashboard próprio. Adicionar o próximo é configuração, não desenvolvimento."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <div style={{ border: `1px solid ${BORDER}`, padding: 24, borderRadius: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                <span style={{ ...MONO, fontSize: 12, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Em produção
                </span>
              </div>
              <h3 style={{ ...TIGHT, fontSize: 20, fontWeight: 600, color: TEXT, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                CAU/PR
              </h3>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 16px" }}>
                Conselho de Arquitetura e Urbanismo do Paraná. Autarquia federal de fiscalização
                profissional. Atos administrativos disponíveis desde 2017.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                <li>· Portarias, Deliberações, Atas Plenárias</li>
                <li>· Contratos, Licitações, Dispensas</li>
                <li>· Diárias e Passagens (via Implanta)</li>
                <li>· Knowledge base: Lei 12.378/2010 + Regimento</li>
              </ul>
            </div>

            <div style={{ border: `1px solid ${BORDER}`, padding: 24, borderRadius: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1d4ed8" }} />
                <span style={{ ...MONO, fontSize: 12, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Em produção
                </span>
              </div>
              <h3 style={{ ...TIGHT, fontSize: 20, fontWeight: 600, color: TEXT, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                GOV/PR
              </h3>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 16px" }}>
                Governo do Estado do Paraná · Poder Executivo. Governadoria, secretarias, autarquias,
                fundos e empresas estatais. Cobertura desde 2002 em algumas categorias.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                <li>· Convênios, Contratos, Licitações, Dispensas</li>
                <li>· Despesas, Receitas, Pagamentos por Credor</li>
                <li>· Remuneração mensal de servidores · Viagens</li>
                <li>· Knowledge base: Constituição Estadual + Lei 15.608 + LRF</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Padrões agregados */}
        <Section
          eyebrow="Resultados"
          title="A IA conecta o que está fragmentado."
          intro="Cada vez que rodamos o pipeline em uma amostra estratégica, o sistema valida sua calibragem. Atos de controle (cooperação técnica entre órgãos públicos, pesquisa científica) caem em verde. Termos de Fomento sem chamamento público caem em laranja ou vermelho. Não é mágica: é a IA cruzando cada ato com o regimento. A leitura crítica continua sendo sua."
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
              { v: fmt(totalDocs), l: "documentos coletados" },
              { v: fmt(tenantsAtivos), l: "órgãos ativos" },
              { v: "26", l: "categorias canônicas" },
              { v: "4", l: "níveis de alerta" },
              { v: "4", l: "agentes de IA" },
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
            <strong style={{ fontWeight: 600 }}>Fichas de denúncia geradas</strong>{" "}
            ficam públicas no dashboard do órgão correspondente, com citação direta do trecho violado,
            artigo regimental ou legal aplicável e sugestão de questionamento. O acesso é livre e gratuito.
          </p>
        </Section>

        {/* Chat conversacional */}
        <Section
          eyebrow="Chat conversacional"
          title="Pergunte como se fosse um pesquisador."
          intro="O chat usa a base completa do órgão: atos, análises, pessoas, valores. Acesso livre tem 5 perguntas/mês. Apoiadores e profissionais têm volumes maiores."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: `1px solid ${BORDER}`, padding: 18, borderRadius: 4 }}>
              <p style={{ ...MONO, fontSize: 11, color: SUBTLE, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Você
              </p>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.55, margin: 0 }}>
                Quais convênios da SEAP em 2024 foram celebrados sem chamamento público com OSCs culturais?
              </p>
            </div>
            <div style={{ border: `1px solid ${TEXT}`, padding: 18, borderRadius: 4, background: "#fafafa" }}>
              <p style={{ ...MONO, fontSize: 11, color: TEXT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Dig Dig
              </p>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: "0 0 12px" }}>
                Em 2024, a SEAP celebrou <strong>3 Termos de Fomento culturais</strong> sem chamamento público
                , todos com beneficiárias específicas pré-identificadas. O Piper classificou todos
                como <strong>laranja</strong>, com indício de dispensa indevida do chamamento exigido pela Lei 13.019/2014.
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 16px" }}>
                Os três beneficiários: Coral Paraná de Curitiba, Federação Paranaense de Futebol de Salão
                e uma associação de reabilitação social vinculada à área de saúde. Em todos, o plano
                de trabalho menciona &quot;atividade contínua de relevância pública&quot; sem
                comprovação fática do enquadramento legal.
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
                {["Termo Fomento 001/2024", "Termo Fomento 03/2024", "Análise Piper #874", "+5 fontes"].map((f) => (
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
          eyebrow="Por baixo do capô"
          title="Além das fichas: a estrutura que sustenta."
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
          intro="O acesso ao banco auditado é gratuito para qualquer cidadão. Os planos existem para quem usa profissionalmente: volume de chat, exportações, API e alertas."
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
          eyebrow="Onde estamos e onde vamos"
          title={
            <>
              Hoje, dois órgãos no ar.
              <br />
              <span style={{ color: SUBTLE }}>Amanhã, a fiscalização que o Brasil precisa.</span>
            </>
          }
          intro="O Dig Dig é uma plataforma em construção aberta. Cada novo órgão usa a mesma arquitetura: multi-tenant, base legal própria, mindset por tipo de órgão. O que está em produção hoje provou a escala."
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
                      color: item.status === "Em produção" ? "#16a34a" : SUBTLE,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      border: `1px solid ${item.status === "Em produção" ? "#16a34a40" : BORDER}`,
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
            Tudo isso está sendo construído com a mesma arquitetura do pipeline atual: código aberto,
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
            O conteúdo (fichas, análises, dados) fica aberto para qualquer pessoa.
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
              href="mailto:contato@digdig.com.br"
              style={{ color: MUTED, textDecoration: "underline" }}
            >
              contato@digdig.com.br
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
