import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

// Do NOT throw at module load — that crashes every route that imports this file
// (including SSR for `/painel`), turning the whole site into a 500.
// Instead, export `null` when env vars are missing and let callers handle it.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase && typeof window !== "undefined") {
  // Client-side warning only; avoids noisy SSR logs on every request.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth and painel features disabled.",
  );
}
