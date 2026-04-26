// Vite config for VPS deployment (standard SPA build — NOT Cloudflare Workers)
// Usage: npm run build:vps
// Output: dist-vps/ (static files served by nginx)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

const BACKEND_URL = process.env.VITE_API_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  build: {
    outDir: "dist-vps",
    emptyOutDir: true,
  },
  server: {
    host: true,
    proxy: {
      "/painel":   { target: BACKEND_URL, changeOrigin: true },
      "/public":   { target: BACKEND_URL, changeOrigin: true },
      "/billing":  { target: BACKEND_URL, changeOrigin: true },
      "/webhooks": { target: BACKEND_URL, changeOrigin: true },
      "/admin":    { target: BACKEND_URL, changeOrigin: true },
    },
  },
});
