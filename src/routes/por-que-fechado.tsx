import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/por-que-fechado")({
  head: () => ({
    meta: [
      { title: "Por que beta fechado | Dig Dig" },
      {
        name: "description",
        content:
          "Por que o Dig Dig é beta fechado. Os dados expõem indícios reais e exigem leitura responsável.",
      },
      { name: "theme-color", content: "#07080f" },
    ],
  }),
  component: PorQueFechadoPage,
});

const SYNE: React.CSSProperties = {
  fontFamily: "'Syne', system-ui, sans-serif",
  fontWeight: 800,
};

function PorQueFechadoPage() {
  return (
    <div
      className="min-h-[100dvh] bg-[#07080f] text-white flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header simples */}
      <header className="px-6 md:px-10 pt-6 flex items-center justify-between">
        <Link
          to="/"
          style={{ ...SYNE, letterSpacing: "0.18em" }}
          className="text-white text-[13px] uppercase hover:text-white/70 transition-colors"
        >
          DIG DIG
        </Link>
        <Link
          to="/solicitar-acesso"
          className="text-[11px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors"
        >
          ← Voltar
        </Link>
      </header>

      {/* Conteúdo central */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-10 py-10">
        <div className="w-full max-w-[560px]">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-3"
            style={SYNE}
          >
            Acesso · beta fechado
          </p>

          <h1
            style={SYNE}
            className="text-white text-[1.8rem] md:text-[2.4rem] uppercase tracking-tight leading-tight mb-6"
          >
            Por que beta fechado?
          </h1>

          <div className="space-y-4 text-white/70 text-[14px] leading-relaxed">
            <p>
              O Dig Dig lê automaticamente atos administrativos de órgãos
              públicos brasileiros e sinaliza indícios de irregularidade. O
              resultado é um conjunto de dados sensíveis: processos éticos
              sigilosos, padrões de favorecimento, nomes específicos
              cruzados em décadas de gestão.
            </p>

            <p>
              Esse material tem peso real. Em mãos descuidadas, pode virar
              denúncia infundada, exposição indevida de pessoas ou ferramenta
              de perseguição política. Em mãos preparadas, vira reportagem,
              petição, pronunciamento de plenário, ação de controle interno.
            </p>

            <p>
              A diferença não é a inteligência da IA — é o critério de quem lê.
              Por isso revisamos cada pedido manualmente: olhamos perfil,
              motivação, instagram quando informado, e decidimos caso a caso.
              Liberamos em lotes, conforme conseguimos acompanhar.
            </p>

            <p className="text-white/55">
              Não é gatekeeping permanente. É beta. À medida que a plataforma
              amadurece e validamos os fluxos de uso responsável, o acesso
              tende a abrir mais.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap gap-3 items-center">
            <Link
              to="/solicitar-acesso"
              style={SYNE}
              className="bg-white text-[#07080f] px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
            >
              Solicitar acesso →
            </Link>
            <Link
              to="/entrar"
              className="text-[11px] uppercase tracking-[0.16em] text-white/45 hover:text-white transition-colors"
            >
              Já tenho acesso · Entrar
            </Link>
          </div>

          <p className="mt-10 text-[10px] uppercase tracking-[0.16em] text-white/25">
            Dados não compartilhados com terceiros.
          </p>
        </div>
      </main>
    </div>
  );
}
