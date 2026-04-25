## Problema

O site publicado (`digdig.com.br`) está retornando **500 HTTPError** em todas as requisições. Os logs do worker confirmam isso:

```
[2026-04-25T06:19:38Z] [error] {"status":500,"unhandled":true,"message":"HTTPError"}
```

E o console do preview mostra repetidamente:

```
Expected `onLoad` listener to be a function, instead got a value of `string` type. onLoad string
```

## Causa raiz

Em `src/routes/__root.tsx` (linhas 50–55), o `<link>` de carregamento assíncrono das fontes do Google passa `onLoad` como **string**:

```tsx
{
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Syne...",
  media: "print",
  onLoad: "this.media='all'",   // ← string, não função
} as any,
```

- No **dev** (Node SSR + hidratação no browser), o React 19 só loga um warning e segue.
- Em **produção** (Cloudflare Worker SSR), o renderer do React 19 trata isso como erro fatal e responde **500** para a página inteira.

Esse é o truque clássico de "preload de fonte sem bloquear", mas em React precisa ser um pouco diferente: o atributo `onload="..."` (HTML) só funciona se for serializado como atributo HTML cru, não como prop React.

## Correção

1. **Em `src/routes/__root.tsx`**, remover o objeto de link com `onLoad: "this.media='all'"` e substituir por uma versão simples que carrega as fontes normalmente:

   ```tsx
   {
     rel: "stylesheet",
     href: "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
   },
   ```

   Como `display=swap` já está na URL, o texto renderiza imediatamente com a fonte de fallback enquanto Syne/Inter carregam — o efeito de "non-blocking" é preservado pelo navegador sem precisar do truque `media=print` + `onload`.

2. (Opcional, recomendado) **Verificar se há outros `onLoad`/`onError` como string** em rotas (head links, scripts) e converter para forma segura:

   ```bash
   rg -n 'onLoad:\s*"|onError:\s*"' src/
   ```

3. Republicar o site.

## Resultado esperado

- `digdig.com.br` volta a renderizar normalmente (sem 500).
- O warning repetido no console (`onLoad string`) desaparece.
- Possivelmente também resolve o erro de hidratação observado em `/solucoes` (a árvore React era abortada antes de completar a hidratação por causa do mesmo prop inválido no `<head>`).

## Não está no escopo desta correção

- O erro `Failed to fetch` em `/public/orgaos/cau-pr/stats` (CORS/rede do Railway) — é independente e a página renderiza mesmo sem stats.
- A página `/whitepaper-01-extracao-caupr` que você pediu antes — já existe.
