// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Proxy target: usa localhost:8000 se o backend local estiver rodando (via BACKEND_URL=http://localhost:8000),
// caso contrário cai na VPS para que o dev local funcione sem backend local.
const BACKEND_URL = process.env.BACKEND_URL ?? "https://digdig.com.br";

export default defineConfig({
  vite: {
    server: {
      host: true,
      proxy: {
        "/painel":    { target: BACKEND_URL, changeOrigin: true },
        "/public":    { target: BACKEND_URL, changeOrigin: true },
        "/billing":   { target: BACKEND_URL, changeOrigin: true },
        "/webhooks":  { target: BACKEND_URL, changeOrigin: true },
        "/admin":     { target: BACKEND_URL, changeOrigin: true },
      },
    },
  },
});
