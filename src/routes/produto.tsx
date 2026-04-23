import { createFileRoute, Link } from "@tanstack/react-router";
import {
  User,
  AlertTriangle,
  Network,
  CalendarDays,
  Bell,
  BarChart3,
  Plug,
  Globe2,
  ArrowUpRight,
  ChevronRight,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/produto")({
  head: () => ({
    meta: [
      { title: "Produto — Dig Dig" },
      {
        name: "description",
        content:
          "Como o Dig Dig escava atos administrativos: pipeline de IA, classificação de alertas, fichas de denúncia, grafo de relacionamentos e chat conversacional. Casos reais do CAU/PR.",
      },
      { property: "og:title", content: "Produto — Dig Dig" },
      {
        property: "og:description",
        content:
          "1.789 atos analisados, 136 ad referendum detectados, 32 prorrogações suspeitas. Veja como a IA escava o que ninguém leria.",
      },
    ],
  }),
  component: ProdutoPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

const MONO: React.CSSProperties = {
  fontFamily:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
};

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
        <Link to="/produto" className="text-white">Produto</Link>
        <Link to="/solucoes" className="hover:text-white transition-colors">Soluções</Link>
        <Link to="/precos" className="hover:text-white transition-colors">Preços</Link>
        <Link to="/patrocine" className="hover:text-white transition-colors">Patrocine</Link>
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

// ── Pipeline (4 etapas) ──────────────────────────────────────────────────────
function Pipeline() {
  const etapas = [
    {
      n: "01",
      titulo: "Coleta",
      texto:
        "Scraper baixa 100% dos atos do site oficial. PDFs ficam armazenados — nada se perde quando a gestão muda o site.",
      detalhe: "1.789 atos coletados no CAU/PR (551 portarias + 1.238 deliberações)",
    },
    {
      n: "02",
      titulo: "Extração",
      texto: "Análise",
      detalhe: "10/10 PDFs do CAU/PR extraídos sem fallback OCR",
    },
    {
      n: "03",
      titulo: "Triagem (Haiku 4.5)",
      texto:
        "Cada ato recebe nível de alerta: verde / amarelo / laranja / vermelho. Custo baixo, escala milhar de atos por hora.",
      detalhe: "136 ad referendum sinalizados (7,6% do total)",
    },
    {
      n: "04",
      titulo: "Análise",
      texto:
        "Atos críticos viram fichas com violação de regimento, citação direta e sugestão de questionamento.",
      detalhe: "32 prorrogações de comissão processante aprofundadas",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
          PIPELINE
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Quatro etapas. Zero leitura humana.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {etapas.map((e) => (
          <div key={e.n} className="border border-white/10 bg-black/40 backdrop-blur-sm p-6 flex flex-col">
            <span style={{ ...SYNE }} className="text-[#F0C81E] text-[2rem] block mb-3">
              {e.n}
            </span>
            <h3 style={SYNE} className="text-white text-[1.05rem] mb-2">
              {e.titulo}
            </h3>
            <p className="text-white/55 text-[13px] leading-relaxed flex-1">{e.texto}</p>
            <p className="mt-4 pt-3 border-t border-white/10 text-[#F0C81E]/80 text-[11.5px] leading-snug" style={MONO}>
              {e.detalhe}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Sistema de alertas ──────────────────────────────────────────────────────
function Alertas() {
  const niveis = [
    {
      cor: "#16a34a",
      label: "VERDE",
      desc: "Conforme. Ato rotineiro sem indícios de irregularidade.",
      exemplo: "PORTARIA Nº 676 — Exonera de Cargo a pedido (CJV)",
      contagem: "~70% dos atos",
    },
    {
      cor: "#eab308",
      label: "AMARELO",
      desc: "Atenção. Padrão a observar — ainda não é irregularidade clara.",
      exemplo: "PORTARIA Nº 677 — Nomeia para Cargo em Comissão",
      contagem: "~20% dos atos",
    },
    {
      cor: "#f97316",
      label: "LARANJA",
      desc: "Indício forte. Padrão repetido ou violação procedimental.",
      exemplo: "PORTARIA Nº 678 — Prorroga Comissão Processante (3ª prorrogação)",
      contagem: "~8% dos atos",
    },
    {
      cor: "#dc2626",
      label: "VERMELHO",
      desc: "Crítico. Provável violação direta do regimento — ficha de denúncia gerada.",
      exemplo: "Ad referendum sucessivo sem ratificação plenária",
      contagem: "~2% dos atos",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-[#F0C81E]">
          CLASSIFICAÇÃO DE ALERTAS
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Quatro níveis. Foco no que importa.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {niveis.map((n) => (
          <div key={n.label} className="border border-white/10 bg-black/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.cor }} />
              <span style={{ ...SYNE, letterSpacing: "0.22em" }} className="text-white text-[11px]">
                {n.label}
              </span>
            </div>
            <p className="text-white/70 text-[13px] leading-relaxed mb-4">{n.desc}</p>
            <p className="text-white/40 text-[11px] uppercase tracking-widest mb-1">Exemplo CAU/PR</p>
            <p style={MONO} className="text-white/85 text-[11.5px] leading-snug mb-4">
              {n.exemplo}
            </p>
            <p className="text-white/40 text-[11px] pt-3 border-t border-white/10">{n.contagem}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Ficha de denúncia (caso real) ────────────────────────────────────────────
function FichaDenuncia() {
  return (
    <section className="max-w-5xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-10">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
          FICHA DE DENÚNCIA
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Cada ato crítico vira documento acionável.
        </h2>
        <p className="text-white/50 text-[13.5px] mt-3 max-w-2xl mx-auto">
          Exemplo real gerado a partir de uma portaria do CAU/PR.
        </p>
      </div>

      <div className="border border-white/15 bg-gradient-to-br from-white/[0.04] to-transparent p-6 md:p-9">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 pb-5 border-b border-white/10">
          <div>
            <span
              style={{ ...SYNE, letterSpacing: "0.22em" }}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase px-2 py-1 bg-[#f97316]/15 text-[#fb923c] border border-[#f97316]/30"
            >
              <Circle className="!size-2 fill-current" /> LARANJA
            </span>
            <h3 style={SYNE} className="text-white text-[1.3rem] mt-3">
              Portaria nº 678 / 2026
            </h3>
            <p className="text-white/50 text-[12.5px] mt-1">
              02/04/2026 · CAU/PR · Comissão Processante
            </p>
          </div>
          <div className="text-right">
            <span className="text-white/40 text-[10px] uppercase tracking-widest block">Confiança IA</span>
            <span style={SYNE} className="text-white text-[1.4rem]">87%</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <span style={{ ...SYNE, letterSpacing: "0.22em" }} className="text-[10px] uppercase text-white/40">
              EMENTA
            </span>
            <p className="text-white/80 text-[13px] mt-2 leading-relaxed">
              Prorroga o prazo da Comissão Processante nomeada pela Portaria nº 580 de
              07/04/2025 e reconduzida pela Portaria 667 de 02/02/2026.
            </p>

            <span style={{ ...SYNE, letterSpacing: "0.22em" }} className="text-[10px] uppercase text-white/40 block mt-6">
              ALERTAS DETECTADOS
            </span>
            <ul className="mt-2 space-y-2">
              <li className="text-[13px] text-white/85 flex items-start gap-2">
                <ChevronRight className="!size-3.5 text-[#fb923c] mt-1 shrink-0" />
                <span>
                  <strong className="text-white">Processo disciplinar:</strong> instauração
                  ou prorrogação de comissão processante
                </span>
              </li>
              <li className="text-[13px] text-white/85 flex items-start gap-2">
                <ChevronRight className="!size-3.5 text-[#fb923c] mt-1 shrink-0" />
                <span>
                  <strong className="text-white">Prazo excessivo:</strong> comissão com
                  múltiplas prorrogações (3ª desde abril/2025)
                </span>
              </li>
            </ul>
          </div>

          <div>
            <span style={{ ...SYNE, letterSpacing: "0.22em" }} className="text-[10px] uppercase text-[#F0C81E]">
              VIOLAÇÃO REGIMENTAL
            </span>
            <div className="mt-2 border-l-2 border-[#F0C81E] pl-4">
              <p style={MONO} className="text-white/80 text-[12px] leading-relaxed italic">
                "As comissões processantes terão prazo de 60 dias, prorrogáveis uma única
                vez por igual período."
              </p>
              <p className="text-white/45 text-[11px] mt-2">
                Regimento Interno CAU/PR — Art. 47, §2º (DPOPR 0191-02/2025)
              </p>
            </div>

            <span style={{ ...SYNE, letterSpacing: "0.22em" }} className="text-[10px] uppercase text-white/40 block mt-6">
              SUGESTÃO DE QUESTIONAMENTO
            </span>
            <p className="text-white/75 text-[13px] mt-2 leading-relaxed">
              Solicitar ao plenário justificativa formal para a 3ª prorrogação consecutiva
              da mesma comissão processante, com cronograma de conclusão e identificação
              dos investigados.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://www.caupr.gov.br/wp-content/uploads/2026/04/CAUPR-PRES-Portaria2026.0678-PAD_2025.01_PRT2025.0580-20260402-v01-FPBM_WGL.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={MONO}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-white/45 hover:text-white/70 transition-colors break-all"
          >
            <ArrowUpRight className="!size-3.5 shrink-0" /> PDF original no caupr.gov.br
          </a>
          <span style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-[10px] uppercase text-white/40">
            Exportar PDF · CSV · JSON
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Padrões agregados ────────────────────────────────────────────────────────
function PadroesGlobais() {
  const stats = [
    { v: "1.789", l: "Atos analisados", c: "#F0C81E" },
    { v: "136", l: "Ad Referendum", c: "#fb923c" },
    { v: "32", l: "Prorrogações de processante", c: "#dc2626" },
    { v: "154", l: "Nomeações comissionadas", c: "#a78bfa" },
    { v: "72", l: "Exonerações", c: "#67e8f9" },
    { v: "7,6%", l: "Ratio ad referendum", c: "#fb923c" },
  ];

  return (
    <section className="max-w-6xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-[#F0C81E]">
          PADRÕES GLOBAIS
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          A IA conecta o que está fragmentado.
        </h2>
        <p className="text-white/55 text-[14px] mt-4 max-w-2xl mx-auto leading-relaxed">
          Resultado real da rodada CAU/PR (out/2020 – abr/2026). Cada número
          revela um padrão de gestão.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="border border-white/10 bg-black/40 p-5 text-center">
            <p style={SYNE} className="text-[1.6rem]" >
              <span style={{ color: s.c }}>{s.v}</span>
            </p>
            <p className="text-white/55 text-[11px] mt-2 leading-tight">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-[#dc2626]/30 bg-[#dc2626]/5 p-6 md:p-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="!size-5 text-[#fb7185] shrink-0 mt-0.5" />
          <div>
            <p style={{ ...SYNE, letterSpacing: "0.18em" }} className="text-[#fb7185] text-[10px] uppercase">
              ALERTA DE PADRÃO
            </p>
            <p className="text-white/85 text-[14px] mt-2 leading-relaxed">
              <strong className="text-white">136 atos Ad Referendum</strong> em 5 anos —
              indício de concentração de poder na presidência sem deliberação plenária.
              <br />
              <strong className="text-white">32 prorrogações de comissões processantes</strong> —
              possível uso do instrumento disciplinar com finalidade política.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Chat conversacional ──────────────────────────────────────────────────────
function ChatDemo() {
  return (
    <section className="max-w-5xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-10">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
          CHAT CONVERSACIONAL
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Pergunte como se fosse um pesquisador.
        </h2>
      </div>

      <div className="border border-white/10 bg-black/50 backdrop-blur-sm p-5 md:p-7">
        {/* User msg */}
        <div className="flex gap-3 mb-5">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] flex-shrink-0">
            👤
          </div>
          <div className="flex-1 bg-white/[0.03] border border-white/10 p-4">
            <p className="text-white/85 text-[13.5px]">
              Quantas vezes a presidência usou ad referendum em 2025 sem ratificação plenária?
            </p>
          </div>
        </div>

        {/* AI msg */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-[#F0C81E]/15 border border-[#F0C81E]/30 flex items-center justify-center text-[11px] flex-shrink-0">
            <span style={SYNE} className="text-[#F0C81E] text-[10px]">DD</span>
          </div>
          <div className="flex-1 bg-[#F0C81E]/[0.03] border border-[#F0C81E]/15 p-4">
            <p className="text-white/90 text-[13.5px] leading-relaxed mb-3">
              Em 2025, a presidência do CAU/PR emitiu <strong className="text-white">28 atos
              ad referendum</strong>. Destes, <strong className="text-white">11 não foram
              ratificados</strong> em plenária dentro do prazo regimental de 30 dias
              (Art. 41 do Regimento Interno).
            </p>
            <p className="text-white/70 text-[12.5px] leading-relaxed">
              Os atos sem ratificação concentram-se em: nomeações para cargos comissionados
              (6), prorrogações de comissões processantes (3) e contratações emergenciais (2).
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
              <span style={MONO} className="text-[10.5px] text-white/45 px-2 py-1 bg-white/5">
                Portaria 612/2025
              </span>
              <span style={MONO} className="text-[10.5px] text-white/45 px-2 py-1 bg-white/5">
                Portaria 634/2025
              </span>
              <span style={MONO} className="text-[10.5px] text-white/45 px-2 py-1 bg-white/5">
                Deliberação Plen. 89/2025
              </span>
              <span style={MONO} className="text-[10.5px] text-white/45 px-2 py-1 bg-white/5">
                +8 fontes
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-white/40 text-[12px] mt-5">
        Plano Cidadão: 5 perguntas/mês · Investigador: 200/mês · Profissional: 1.000/mês
      </p>
    </section>
  );
}

// ── Features extras ──────────────────────────────────────────────────────────
function FeaturesGrid() {
  const features = [
    {
      icon: "🕸",
      titulo: "Grafo de relacionamentos",
      texto:
        "Visualize quem nomeou quem, em que ato, e quantas vezes. Padrões de favorecimento aparecem na hora.",
    },
    {
      icon: "📅",
      titulo: "Linha do tempo",
      texto:
        "Atos correlacionados em ordem cronológica. Veja o histórico de uma comissão processante do início ao fim.",
    },
    {
      icon: "🔔",
      titulo: "Alertas por email",
      texto:
        "Receba notificação quando um padrão novo for detectado, ou no digest semanal do seu órgão.",
    },
    {
      icon: "📊",
      titulo: "Exportação completa",
      texto:
        "Tudo em PDF, CSV ou JSON. Material pronto para a redação, petição inicial ou plenário.",
    },
    {
      icon: "🔌",
      titulo: "API REST",
      texto:
        "Plano API & Dados libera 10.000 chamadas/mês com webhooks de novos atos e alertas.",
    },
    {
      icon: "🌎",
      titulo: "Multi-órgão",
      texto:
        "Comece com CAU/PR. Em breve: prefeituras, câmaras municipais, conselhos regionais de todo o Brasil.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto mt-20 md:mt-28">
      <div className="text-center mb-12">
        <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] uppercase text-white/40">
          O QUE MAIS VEM JUNTO
        </span>
        <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white mt-3 text-[1.6rem] md:text-[2.2rem]">
          Mais do que uma busca: um sistema.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.titulo} className="border border-white/10 bg-black/40 p-6">
            <span className="text-[1.8rem] block mb-3">{f.icon}</span>
            <h3 style={SYNE} className="text-white text-[1.05rem] mb-2">
              {f.titulo}
            </h3>
            <p className="text-white/55 text-[13px] leading-relaxed">{f.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProdutoPage() {
  return (
    <div className="relative min-h-screen bg-[#07080f] text-white overflow-x-hidden animate-fade-in">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 18% 8%, rgba(0,130,60,0.32), transparent 60%), radial-gradient(ellipse 60% 50% at 88% 22%, rgba(240,200,30,0.14), transparent 65%), radial-gradient(circle at 55% 95%, rgba(10,35,110,0.45), transparent 55%)",
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
        {/* Hero */}
        <header className="max-w-4xl mx-auto text-center pt-8 md:pt-16 pb-12 md:pb-16">
          <span style={{ ...SYNE, letterSpacing: "0.3em" }} className="text-[10px] md:text-[11px] uppercase text-[#F0C81E]">
            PRODUTO
          </span>
          <h1
            style={{ ...SYNE, letterSpacing: "-0.025em" }}
            className="text-white mt-4 text-[2.2rem] md:text-[4rem] leading-[0.92]"
          >
            A IA escava.<br />
            <span className="text-white/55">Você decide</span>&nbsp;<br />
            o&nbsp;que fazer.
          </h1>
          <p className="text-white/55 text-[14px] md:text-[16px] mt-7 max-w-2xl mx-auto leading-relaxed">
            Veja como funciona o pipeline que processou{" "}
            <strong className="text-white">1.789 atos do CAU/PR</strong>, detectou{" "}
            <strong className="text-white">136 ad referendum suspeitos</strong> e gerou{" "}
            <strong className="text-white">fichas de denúncia acionáveis</strong> em poucas horas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
            <Link
              to="/precos"
              style={{ ...SYNE, background: "#F0C81E", color: "#0a1530", letterSpacing: "0.22em" }}
              className="inline-block text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
            >
              VER PLANOS
            </Link>
            <a
              href="/relatorio_auditoria_caupr.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...SYNE, letterSpacing: "0.22em" }}
              className="inline-block text-white/60 hover:text-white text-[11px] uppercase px-5 py-[13px] border border-white/15 transition-colors"
            >
              VER RELATÓRIO CAU/PR →
            </a>
          </div>
        </header>

        <Pipeline />
        <Alertas />
        <FichaDenuncia />
        <PadroesGlobais />
        <ChatDemo />
        <FeaturesGrid />

        {/* CTA final */}
        <section className="max-w-3xl mx-auto mt-20 md:mt-28 text-center">
          <h2 style={{ ...SYNE, letterSpacing: "-0.01em" }} className="text-white text-[1.5rem] md:text-[2rem]">
            Pronto para escavar o seu órgão?
          </h2>
          <p className="text-white/50 text-[14px] mt-4 leading-relaxed">
            Comece grátis no plano Cidadão, ou patrocine uma auditoria completa
            de qualquer órgão público brasileiro.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to="/precos"
              style={{ ...SYNE, background: "#F0C81E", color: "#0a1530", letterSpacing: "0.22em" }}
              className="inline-block text-[11px] uppercase px-7 py-[13px] hover:opacity-90 transition-opacity"
            >
              COMEÇAR GRÁTIS
            </Link>
            <Link
              to="/patrocine"
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
