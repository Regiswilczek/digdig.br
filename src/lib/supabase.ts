import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// TODO: remover fallback hardcoded antes do merge — ver /apagar para limpar as rotas dev
const _DEV_URL = "https://xvzpqmjkntlrfbdoswcy.supabase.co";
const _DEV_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2enBxbWprbnRscmZiZG9zd2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTU2MDAwMH0.K9mXpR2vNqLsYdTuWjHfPbOeAcGiMzVkUxEwItSh3n8";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || _DEV_URL) as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || _DEV_KEY) as
  | string
  | undefined;

// A lazy stub used when env vars are missing. We intentionally do NOT throw at
// module load — that would crash every route that imports this file (including
// SSR for `/painel`, `/entrar`, etc.) and turn the whole site into a 500.
// Instead, errors only fire when something actually tries to use Supabase.
function createMissingEnvStub(): SupabaseClient {
  const handler: ProxyHandler<object> = {
    get() {
      throw new Error(
        "Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou ative Lovable Cloud).",
      );
    },
  };
  return new Proxy({}, handler) as unknown as SupabaseClient;
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMissingEnvStub();

if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== "undefined") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth and painel features disabled.",
  );
}
