// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Proxy para dev local. Sem BACKEND_URL, cai na VPS de produção.
// Para dev com backend local: BACKEND_URL=http://localhost:8000 npm run dev:lovable
// Em produção: nginx do container frontend proxia diretamente para api:8000.
const BACKEND_URL = process.env.BACKEND_URL ?? "https://digdig.com.br";

export default defineConfig({
  vite: {
    server: {
      host: true,
      proxy: {
        "/painel":   { target: BACKEND_URL, changeOrigin: true },
        "/public":   { target: BACKEND_URL, changeOrigin: true },
        "/billing":  { target: BACKEND_URL, changeOrigin: true },
        "/webhooks": { target: BACKEND_URL, changeOrigin: true },
        "/admin":    { target: BACKEND_URL, changeOrigin: true },
        "/chat":     { target: BACKEND_URL, changeOrigin: true },
        "/health":   { target: BACKEND_URL, changeOrigin: true },
      },
    },
  },
});
