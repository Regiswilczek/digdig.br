# Página /modelos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/modelos` com apresentação editorial dos três modelos Dig Dig (Piper, Bud, Zew).

**Architecture:** Uma única route file TanStack Router (`src/routes/modelos.tsx`) com seções verticais por modelo. Nav atualizado em `index.tsx`. routeTree auto-regenerado pelo Vite ao rodar o dev server.

**Tech Stack:** React, TanStack Router, Tailwind CSS, Lucide React — tudo já instalado.

---

### Task 1: Criar src/routes/modelos.tsx

**Files:**
- Create: `src/routes/modelos.tsx`

- [ ] **Step 1: Criar o arquivo da rota**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Zap, Brain, Telescope } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/modelos")({
  head: () => ({
    meta: [
      { title: "Modelos — Dig Dig" },
      {
        name: "description",
        content:
          "Conheça os motores de inteligência do Dig Dig: Piper, Bud e Zew — especializados em auditoria de atos públicos brasileiros.",
      },
    ],
  }),
  component: ModelosPage,
});

const INTER: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace",
};
const GOLD = "#F0C81E";
const BG = "#07080f";

type Benchmark = { label: string; value: string };

type Modelo = {
  id: string;
  nome: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  descricao: string;
  poder: string;
  benchmarks: Benchmark[];
  auditoria: string[];
  posicionamento: string;
  disponivel: boolean;
};

const MODELOS: Modelo[] = [
  {
    id: "piper",
    nome: "Dig Dig Piper",
    badge: "TRIAGEM",
    badgeColor: "#4ade80",
    tagline: "O que ninguém leria manualmente.",
    descricao:
      "O Piper lê o que ninguém leria manualmente. Processa milhares de atos por hora, classifica cada um em verde, amarelo, laranja ou vermelho, extrai nomes, datas e vínculos — tudo antes que qualquer analista humano abra o primeiro PDF. É a base de toda investigação no Dig Dig.",
    poder:
      "Velocidade e escala sem precedentes para cobertura total de acervos públicos.",
    benchmarks: [
      { label: "MMLU", value: "73,5%" },
      { label: "GPQA", value: "33,3%" },
      { label: "Precisão estrutural", value: "75,9%" },
    ],
    auditoria: [
      "Classifica cada ato em 4 níveis de alerta",
      "Extrai pessoas, datas e vínculos automaticamente",
      "Garante cobertura total do acervo — nenhum ato escapa",
      "Opera em escala de milhares de documentos por sessão",
    ],
    posicionamento:
      "Disponível em todos os planos. O primeiro filtro que garante que nada passa em branco.",
    disponivel: true,
  },
  {
    id: "bud",
    nome: "Dig Dig Bud",
    badge: "ANÁLISE PROFUNDA",
    badgeColor: "#f97316",
    tagline: "A suspeita vira argumento.",
    descricao:
      "O Bud é o analista que transforma um padrão irregular em argumento. Pega os casos marcados pelo Piper, lê o regimento interno, cita o artigo violado, descreve o padrão e sugere o questionamento público correto. A ficha que o Bud gera é o que um advogado levaria semanas para construir.",
    poder:
      "Raciocínio jurídico aplicado a documentos técnicos em linguagem pública e acionável.",
    benchmarks: [
      { label: "MMLU", value: "88,7%" },
      { label: "GPQA", value: "59,4%" },
      { label: "Raciocínio estruturado", value: "93,7%" },
    ],
    auditoria: [
      "Gera fichas com citação direta do regimento interno",
      "Identifica o artigo violado e descreve o padrão",
      "Sugere o questionamento público correto",
      "Transforma suspeita em evidência estruturada e acionável",
    ],
    posicionamento:
      "Exclusivo para planos Investigador e superiores. Onde a investigação vira produto.",
    disponivel: true,
  },
  {
    id: "zew",
    nome: "Dig Dig Zew",
    badge: "EM BREVE",
    badgeColor: GOLD,
    tagline: "Uma gestão inteira sob análise.",
    descricao:
      "O Zew não analisa um ato — analisa uma gestão. Capaz de cruzar décadas de documentos, identificar padrões de comportamento que só aparecem ao longo do tempo: nepotismo acumulado, concentração progressiva de poder, perseguição sistemática disfarçada em portarias numeradas. O que o Piper e o Bud fazem ato por ato, o Zew faz sobre toda a história de uma instituição.",
    poder:
      "Investigação sistêmica e histórica — padrões que só existem em escala de anos.",
    benchmarks: [
      { label: "MMLU", value: "91,4%+" },
      { label: "GPQA", value: "74,9%" },
      { label: "Raciocínio estendido", value: "nativo" },
    ],
    auditoria: [
      "Cruzamento de documentos de períodos distintos",
      "Detecção de padrões longitudinais ao longo de anos",
      "Análise comparativa entre órgãos diferentes",
      "Investigação de gestões completas, não atos isolados",
    ],
    posicionamento:
      "Em desenvolvimento. Será o motor de investigação histórica do Dig Dig.",
    disponivel: false,
  },
];

function BadgeChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{ ...MONO, color, border: `1px solid ${color}33`, background: `${color}11` }}
      className="inline-block text-[10px] tracking-widest uppercase px-3 py-1 rounded-sm"
    >
      {label}
    </span>
  );
}

function BenchmarkBar({ label, value }: Benchmark) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/8">
      <span className="text-[12px] text-white/50" style={INTER}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ ...MONO, color: GOLD }}>{value}</span>
    </div>
  );
}

function ModeloSection({ modelo, index }: { modelo: Modelo; index: number }) {
  const isZew = !modelo.disponivel;
  const isEven = index % 2 === 0;

  return (
    <section
      style={{
        background: isZew ? `linear-gradient(180deg, #0d0e18 0%, ${BG} 100%)` : BG,
        borderTop: isZew ? `1px solid ${GOLD}22` : "1px solid rgba(255,255,255,0.06)",
      }}
      className="w-full py-24 px-6 md:px-14"
    >
      <div className="max-w-5xl mx-auto">
        <div className={`grid md:grid-cols-2 gap-16 items-start ${!isEven ? "md:[&>*:first-child]:order-2" : ""}`}>
          {/* Coluna esquerda — identidade */}
          <div className="flex flex-col gap-6">
            <BadgeChip label={modelo.badge} color={modelo.badgeColor} />

            <div>
              <h2
                className="text-[2.2rem] md:text-[2.8rem] font-bold leading-tight text-white mb-3"
                style={INTER}
              >
                {modelo.nome}
              </h2>
              <p
                className="text-[1.1rem] font-medium"
                style={{ ...INTER, color: modelo.badgeColor }}
              >
                {modelo.tagline}
              </p>
            </div>

            <p className="text-[15px] text-white/65 leading-relaxed" style={INTER}>
              {modelo.descricao}
            </p>

            <p className="text-[13px] text-white/40 leading-relaxed border-l-2 pl-4" style={{ ...INTER, borderColor: modelo.badgeColor + "66" }}>
              {modelo.poder}
            </p>

            <p className="text-[12px] text-white/35 mt-2" style={INTER}>
              {modelo.posicionamento}
            </p>

            {isZew && <NotifyForm />}
          </div>

          {/* Coluna direita — benchmarks + auditoria */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4" style={MONO}>
                Benchmarks
              </p>
              <div>
                {modelo.benchmarks.map((b) => (
                  <BenchmarkBar key={b.label} {...b} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4" style={MONO}>
                No contexto de auditoria
              </p>
              <ul className="flex flex-col gap-3">
                {modelo.auditoria.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span style={{ color: modelo.badgeColor }} className="mt-[3px] shrink-0 text-[14px]">→</span>
                    <span className="text-[13px] text-white/60 leading-relaxed" style={INTER}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-[13px] mt-2" style={{ ...INTER, color: GOLD }}>
        ✓ Avisaremos quando o Zew chegar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        className="flex-1 bg-white/5 border border-white/15 rounded-sm px-4 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
        style={INTER}
      />
      <button
        type="submit"
        className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wider rounded-sm transition-colors"
        style={{ ...MONO, background: GOLD, color: "#07080f" }}
      >
        Avisar
      </button>
    </form>
  );
}

function ModelosPage() {
  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {/* Hero */}
      <section className="w-full pt-32 pb-24 px-6 md:px-14 border-b border-white/6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6" style={MONO}>
            Tecnologia
          </p>
          <h1
            className="text-[3rem] md:text-[5rem] font-bold leading-none text-white mb-6"
            style={INTER}
          >
            Os Modelos<br />
            <span style={{ color: GOLD }}>Dig Dig</span>
          </h1>
          <p className="max-w-xl text-[16px] text-white/55 leading-relaxed" style={INTER}>
            Não são assistentes genéricos. São motores construídos para uma tarefa específica —
            auditar atos administrativos públicos com precisão jurídica, escala industrial e
            linguagem que qualquer cidadão entende.
          </p>
        </div>
      </section>

      {/* Seções dos modelos */}
      {MODELOS.map((modelo, i) => (
        <ModeloSection key={modelo.id} modelo={modelo} index={i} />
      ))}

      {/* Footer da página */}
      <section className="w-full py-16 px-6 md:px-14 border-t border-white/6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <p className="text-[13px] text-white/35" style={INTER}>
            Cada modelo é especializado. Juntos, cobrem todo o ciclo de investigação.
          </p>
          <a
            href="/explorar"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
            style={INTER}
          >
            Ver atos auditados <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/modelos.tsx
git commit -m "feat: add /modelos page with Piper, Bud, Zew sections"
```

---

### Task 2: Adicionar link no nav

**Files:**
- Modify: `src/routes/index.tsx` — array `links` por volta da linha 335

- [ ] **Step 1: Adicionar "Modelos" ao array de links**

Localizar:
```ts
const links = [
  { to: "/solucoes", label: "Soluções" },
  { to: "/apoiar", label: "Apoiar" },
] as const;
```

Substituir por:
```ts
const links = [
  { to: "/solucoes", label: "Soluções" },
  { to: "/modelos", label: "Modelos" },
  { to: "/apoiar", label: "Apoiar" },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: add Modelos link to main nav"
```

---

### Task 3: Verificar routeTree

**Files:**
- Verify: `src/routeTree.gen.ts` — auto-gerado pelo Vite/TanStack Router

- [ ] **Step 1: Rodar o dev server para regenerar**

```bash
cd "c:\Users\Regis\Desktop\CAU PR"
bun run dev
```

O TanStack Router detecta o novo arquivo e regenera `routeTree.gen.ts` automaticamente. Verificar que `/modelos` aparece no arquivo gerado.

- [ ] **Step 2: Commit do routeTree atualizado**

```bash
git add src/routeTree.gen.ts
git commit -m "chore: regenerate routeTree with /modelos route"
```
