import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções — Dig Dig" },
      {
        name: "description",
        content:
          "Auditoria automatizada de atos administrativos com IA. Soluções para jornalistas, advogados, conselheiros, vereadores e cidadãos que querem fiscalizar o poder público.",
      },
      { property: "og:title", content: "Soluções — Dig Dig" },
      {
        property: "og:description",
        content:
          "Da redação ao tribunal: como o Dig Dig escava atos administrativos para quem precisa de provas, padrões e narrativa.",
      },
    ],
  }),
  component: SolucoesPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

type Solucao = {
  slug: string;
  publico: string;
  titulo: string;
  dor: string;
  comoResolve: string;
  beneficios: string[];
  planoSugerido: string;
  cor: string;
};

const SOLUCOES: Solucao[] = [
  {
    slug: "jornalistas",
    publico: "JORNALISMO INVESTIGATIVO",
    titulo: "Da pauta à matéria publicada em horas, não meses.",
    dor: "Você tem o faro, mas o Diário Oficial tem 20 anos de PDFs. Lê tudo manualmente ou desiste da pauta.",
    comoResolve:
      "A IA escaneia milhares de atos, identifica padrões (nomeações repetidas, contratos suspeitos, concentração de poder) e entrega fichas prontas com citação direta do regimento violado.",
    beneficios: [
      "Fichas de denúncia com fonte e número do ato",
      "Busca conversacional: \"quem mais nomeou parente em 2025?\"",
      "Exportação em CSV/PDF para a redação",
      "Alertas por email quando aparece padrão novo",
    ],
    planoSugerido: "Investigador — R$ 197/mês",
    cor: "#F0C81E",
  },
  {
    slug: "advogados",
    publico: "DIREITO E COMPLIANCE",
    titulo: "Provas documentais organizadas para a petição inicial.",
    dor: "Reunir evidências de irregularidade administrativa exige semanas de leitura de atos esparsos em sites mal indexados.",
    comoResolve:
      "Cada ato é cruzado com o regimento interno, lei orgânica e jurisprudência. A ficha aponta o dispositivo violado e gera o material em formato apto para juntada processual.",
    beneficios: [
      "Citações com referência exata (artigo, inciso, parágrafo)",
      "Linha do tempo de atos correlacionados",
      "Grafo de relacionamentos entre nomeados",
      "Exportação em PDF formatado para autos",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#3b6fa0",
  },
  {
    slug: "conselheiros",
    publico: "CONSELHEIROS E OPOSIÇÃO",
    titulo: "Munição para o plenário, sem precisar virar pesquisador.",
    dor: "Você foi eleito para fiscalizar, mas a gestão produz mais documentos do que dá para ler. Você reage tarde — quando reage.",
    comoResolve:
      "Receba um digest semanal dos atos do seu órgão com nível de alerta classificado. Os críticos vêm com ficha pronta, citação ao regimento e sugestão de questionamento.",
    beneficios: [
      "Digest semanal por email — só o que importa",
      "Histórico completo de votações e ad referendum",
      "Detecção automática de quebra de quórum",
      "Chat para preparar pronunciamentos em minutos",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#00823c",
  },
  {
    slug: "vereadores",
    publico: "PARLAMENTARES E ASSESSORIAS",
    titulo: "Fiscalize o executivo municipal sem montar uma equipe de pesquisa.",
    dor: "Câmaras municipais têm orçamento limitado para análise de atos do executivo. A oposição perde por desinformação, não por argumento.",
    comoResolve:
      "Um único parlamentar com Dig Dig acompanha portarias, decretos, licitações e nomeações da prefeitura inteira — com alertas sobre desvios de procedimento.",
    beneficios: [
      "Cobertura completa do executivo municipal",
      "Comparativo entre gestões (esta vs anterior)",
      "Material de TV e redes sociais com fontes",
      "Acesso para até 5 assessores no plano Profissional",
    ],
    planoSugerido: "Profissional — R$ 597/mês",
    cor: "#a78bfa",
  },
  {
    slug: "cidadaos",
    publico: "CIDADÃOS E COLETIVOS",
    titulo: "Transparência não é privilégio de quem tem assessoria.",
    dor: "Você quer entender o que o conselho profissional, a câmara ou a prefeitura está fazendo — mas o site oficial é hostil e os atos são técnicos.",
    comoResolve:
      "Plano Cidadão grátis: leia auditorias publicadas, vote em órgãos para próxima rodada e proponha novos. 5 perguntas/mês para o chat tirar dúvidas em linguagem simples.",
    beneficios: [
      "Acesso vitalício e gratuito ao plano Cidadão",
      "3 votos/mês em campanhas de patrocínio",
      "Pode nominar qualquer órgão público",
      "Resultados ficam públicos — sem paywall",
    ],
    planoSugerido: "Cidadão — Grátis",
    cor: "#e8a87c",
  },
  {
    slug: "api",
    publico: "EMPRESAS E REDAÇÕES",
    titulo: "Dados estruturados de atos administrativos via API REST.",
    dor: "Sua redação, plataforma de compliance ou ferramenta interna precisa de dados de atos públicos — mas raspar manualmente não escala.",
    comoResolve:
      "API REST com 10.000 chamadas/mês. Acesse atos, análises, fichas, grafos e padrões em JSON estruturado. Webhooks para novos eventos.",
    beneficios: [
      "10.000 chamadas/mês via API REST",
      "Webhooks de novos atos e alertas",
      "5 seats incluídos para a equipe",
      "Suporte técnico dedicado",
    ],
    planoSugerido: "API & Dados — R$ 1.997/mês",
    cor: "#67e8f9",
  },
];

function Nav() {
  return (
    <nav className="relative z-30 flex items-center justify-between px-6 md:px-14 py-5 md:py-6">
      <Link
        to="/"
        style={{ ...SYNE, letterSpacing: "0.18em" }}
        className="text-white text-[12px] md:text-[13px] uppercase hover:opacity-80 transition"
      >
        DIG DIG
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
        <Link to="/" className="hover:text-white transition-colors">Produto</Link>
        <Link to="/solucoes" className="text-white">Soluções</Link>
        <Link to="/apoiar" className="hover:text-white transition-colors">Apoiar</Link>
      </div>
      <a
        href="/entrar"
        className="text-[12px] md:text-[13px] text-white/50 hover:text-white transition-colors"
      >
        Entrar
      </a>
    </nav>
  );
}

function SolucaoCard({ sol, index }: { sol: Solucao; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <div
      id={sol.slug}
      className={`grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center py-12 md:py-16 border-t border-white/10 ${
        reverse ? "md:[direction:rtl]" : ""
      }`}
    >
      <div className="md:col-span-5 md:[direction:ltr]">
        <div aria-hidden className="h-[3px] w-10 mb-5" style={{ background: sol.cor }} />
        <span
          style={{ ...SYNE, letterSpacing: "0.3em", color: sol.cor }}
          className="text-[10px] uppercase"
        >
          {sol.publico}
        </span>
        <h3
          style={{ ...SYNE, letterSpacing: "-0.015em" }}
          className="text-white mt-3 text-[1.6rem] md:text-[2.2rem] leading-[1.05]"
        >
          {sol.titulo}
        </h3>
        <p className="text-white/55 text-[13.5px] md:text-[14.5px] mt-5 leading-relaxed">
          <span className="text-white/40">A dor: </span>
          {sol.dor}
        </p>
        <p className="text-white/75 text-[13.5px] md:text-[14.5px] mt-4 leading-relaxed">
          <span className="text-white/40">Como o Dig Dig resolve: </span>
          {sol.comoResolve}
        </p>
      </div>

      <div className="md:col-span-7 md:[direction:ltr]">
        <div className="border border-white/10 bg-[#0d0f1a]/90 p-7 md:p-9">
          <span style={{ ...SYNE, letterSpacing: "0.25em" }} className="text-[10px] uppercase text-white/40">
            O QUE VOCÊ GANHA
          </span>
          <ul className="mt-5 space-y-3.5">
            {sol.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[13.5px] text-white/80 leading-relaxed">
                <span
                  className="mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: sol.cor }}
                />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-7 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-white/40 text-[11px] uppercase tracking-widest">Plano sugerido</span>
              <p style={SYNE} className="text-white text-[1rem] mt-1">{sol.planoSugerido}</p>
            </div>
            <Link
              to="/apoiar"
              style={{ ...SYNE, letterSpacing: "0.2em", background: sol.cor, color: "#0a1530" }}
              className="text-[11px] uppercase px-5 py-3 hover:opacity-90 transition-opacity"
            >
              Ver plano →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SolucoesPage() {
  return (
    <div className="relative min-h-screen bg-[#07080f] text-white overflow-x-hidden animate-fade-in">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 20% 8%, rgba(0,130,60,0.35), transparent 60%), radial-gradient(ellipse 60% 50% at 85% 20%, rgba(240,200,30,0.14), transparent 65%), radial-gradient(circle at 50% 95%, rgba(10,35,110,0.45), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)",
        }}
      />

      <Nav />

      <main className="relative z-10 px-6 md:px-14 pb-24">
        <header className="max-w-4xl mx-auto text-center pt-8 md:pt-16 pb-10 md:pb-14">
          <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] md:text-[11px] uppercase text-[#F0C81E]">
            SOLUÇÕES
          </span>
          <h1
            style={{ ...SYNE, letterSpacing: "-0.025em" }}
            className="text-white mt-4 text-[2.2rem] md:text-[4rem] leading-[0.92]"
          >
            Uma ferramenta.<br />
            <span className="text-white/55">Seis formas de</span> escavar.
          </h1>
          <p className="text-white/55 text-[14px] md:text-[16px] mt-7 max-w-2xl mx-auto leading-relaxed">
            Do jornalista ao cidadão, do advogado ao parlamentar — o Dig Dig se adapta
            ao seu fluxo. Veja como cada perfil usa a plataforma e qual plano combina.
          </p>
        </header>

        {/* Quick nav */}
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 mb-8">
          {SOLUCOES.map((s) => (
            <a
              key={s.slug}
              href={`#${s.slug}`}
              style={{ ...SYNE, letterSpacing: "0.18em" }}
              className="text-[10px] uppercase px-3.5 py-2 border border-white/15 text-white/65 hover:text-white hover:border-white/40 transition-colors"
            >
              {s.publico.split(" ")[0]}
            </a>
          ))}
        </div>

        <section className="max-w-6xl mx-auto">
          {SOLUCOES.map((s, i) => (
            <SolucaoCard key={s.slug} sol={s} index={i} />
          ))}
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto mt-20 md:mt-28 text-center">
          <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white text-[1.5rem] md:text-[2rem]">
            Não achou seu perfil?
          </h2>
          <p className="text-white/50 text-[14px] mt-4 leading-relaxed">
            O Dig Dig serve qualquer pessoa que precise transformar PDFs públicos em
            informação acionável. Comece grátis e veja o que dá pra escavar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to="/apoiar"
              style={{ ...SYNE, background: "#F0C81E", color: "#0a1530", letterSpacing: "0.22em" }}
              className="inline-block text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
            >
              VER PLANOS
            </Link>
            <Link
              to="/apoiar"
              style={{ ...SYNE, letterSpacing: "0.22em" }}
              className="inline-block text-white/60 hover:text-white text-[11px] uppercase px-5 py-[13px] transition-colors"
            >
              PATROCINAR AUDITORIA →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
