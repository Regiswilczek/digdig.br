

## Diagnóstico — o que está pesando

Após revisar todas as rotas, identifiquei **3 causas reais** de lentidão e da tela branca depois de algum tempo. Não é falta de code-splitting (TanStack já faz isso por rota automaticamente).

### 1. `ParticleField` na home — consumo absurdo de CPU/GPU (causa nº 1 da tela branca)

`src/routes/index.tsx` desenha um canvas em `requestAnimationFrame` infinito:
- Loop `for` percorrendo cada 4 pixels da tela inteira → em 1475×887 = **~81.000 iterações por frame**
- Cada iteração faz `Math.sin × 3`, `Math.pow`, mix de cores e `ctx.fillRect`
- Roda **60× por segundo, para sempre**, mesmo quando a aba está em segundo plano (em alguns navegadores)
- Mesmo após navegar para `/produto`, se o usuário voltar via cache do roteador, o canvas reinicia

Sintoma: depois de minutos a aba fica sem responder, GPU satura, ventoinha liga e o navegador pode matar a renderização → tela branca.

### 2. `backdrop-blur-sm` espalhado em dezenas de cards

Toda página (`produto`, `precos`, `patrocine`, `solucoes`) usa `backdrop-blur-sm` em cards + gradientes radiais de fundo. Cada card vira uma camada composta na GPU. Em `/produto` há ~20 cards com blur empilhados sobre gradientes — re-blur a cada scroll.

### 3. Google Fonts bloqueante + `&display=swap` sem `preload`

`__root.tsx` carrega Syne + JetBrains Mono via `<link rel="stylesheet">` síncrono. Como adicionei `preconnect` no turno anterior, melhorou, mas o stylesheet ainda bloqueia o paint inicial.

---

## Plano de correção

### A. Tornar o `ParticleField` barato e pausável (impacto maior)

1. **Cap em 30 fps** (não 60) — corta consumo pela metade sem perda visual perceptível em padrão lento.
2. **Aumentar `STEP` de 4 → 6** em telas grandes — reduz iterações por frame em ~55%.
3. **Pausar quando aba não está visível**: ouvir `document.visibilitychange` e cancelar o RAF quando `hidden`.
4. **Pausar quando o canvas sai do viewport**: `IntersectionObserver` — se o usuário scrollar para fora, não anima.
5. **Respeitar `prefers-reduced-motion`**: desenhar 1 frame estático e parar.
6. **Usar `OffscreenCanvas` quando suportado** (opcional, baixa prioridade).

### B. Reduzir `backdrop-blur` em `/produto`, `/precos`, `/patrocine`, `/solucoes`

Trocar `backdrop-blur-sm` por **fundo sólido** (`bg-[#0d0f1a]/90` ou similar). Visualmente quase idêntico em fundo escuro, mas elimina a camada composta. Manter blur apenas em **1-2 elementos hero** se desejado.

### C. Otimizar carregamento de fontes

- Adicionar `&text=` subset? Não — fontes são usadas em todo lugar.
- Mudar `<link rel="stylesheet">` para `media="print" onload="this.media='all'"` (carrega async, não bloqueia paint).
- Manter os `preconnect` que já estão lá.

### D. Limpeza geral

- Remover gradientes radiais sobrepostos em `/precos` e `/patrocine` (são 2-3 camadas absolutas com `radial-gradient` cobrindo a tela inteira — re-pintadas em scroll).
- Garantir que listas grandes usem `key` estável (já estão ok).

---

## Arquivos a editar

- `src/routes/index.tsx` — refatorar `ParticleField` (itens A1-A5)
- `src/routes/produto.tsx` — remover `backdrop-blur-sm` dos ~20 cards
- `src/routes/precos.tsx` — remover `backdrop-blur-sm` + simplificar fundo radial
- `src/routes/patrocine.tsx` — mesmo tratamento
- `src/routes/solucoes.tsx` — mesmo tratamento
- `src/routes/__root.tsx` — carregamento async das fontes

## Resultado esperado

- CPU em idle na home cai de ~40-60% para <10%
- Sem mais tela branca após tempo ocioso
- First paint das páginas internas ~150-300ms mais rápido
- Scroll suave em todas as páginas

