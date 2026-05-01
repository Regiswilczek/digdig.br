// reCAPTCHA v3 helper — invisible/score-based.
//
// Carrega o script Google reCAPTCHA sob demanda e expõe `runRecaptcha(action)`
// que retorna um token p/ enviar ao backend. Backend valida o token via
// `https://www.google.com/recaptcha/api/siteverify` com a SECRET key.
//
// Site key vem de VITE_RECAPTCHA_SITE_KEY (público — fica no bundle).
// Secret key fica no backend (RECAPTCHA_SECRET).

const SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "").trim();

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (!SITE_KEY) {
    return Promise.reject(new Error("VITE_RECAPTCHA_SITE_KEY não configurada"));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window indisponível"));
  }
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar reCAPTCHA"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Executa reCAPTCHA v3 e retorna o token. Lança se SITE_KEY não estiver
 * configurada — chame com try/catch e degrade graciosamente em dev.
 */
export async function runRecaptcha(action: string): Promise<string> {
  await loadScript();
  if (!window.grecaptcha) throw new Error("reCAPTCHA não inicializado");
  await new Promise<void>((resolve) => window.grecaptcha!.ready(resolve));
  return window.grecaptcha.execute(SITE_KEY, { action });
}

export const RECAPTCHA_ENABLED = !!SITE_KEY;
