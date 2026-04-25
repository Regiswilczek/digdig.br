// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Em dev local: aponta para FastAPI rodando em localhost:8000
// Em produção (Lovable): VITE_API_URL é definido e as chamadas vão direto para Railway
const BACKEND_URL = "http://localhost:8000";

export default defineConfig({
  vite: {
    server: {
      proxy: {
        "/painel": { target: BACKEND_URL, changeOrigin: true },
        "/public": { target: BACKEND_URL, changeOrigin: true },
      },
    },
  },
});
