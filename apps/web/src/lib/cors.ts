/**
 * Política de CORS centralizada para as rotas /api.
 *
 * Edge-safe: usa apenas `process.env` e manipulação de string (sem APIs Node),
 * pois é consumida pelo `proxy.ts` que roda no edge runtime.
 *
 * Regras:
 * - Nunca usa "*". Em produção só libera origens explicitamente confiáveis.
 * - Como a autenticação é por cookie, devolve `Access-Control-Allow-Credentials: true`
 *   e ecoa a origem validada (jamais "*", que é incompatível com credenciais).
 * - Requisições same-origin (sem header `Origin`, ex.: navegação/SSR) são liberadas.
 *
 * Configuração via env:
 * - APP_ORIGIN        Origem canônica do app em produção (ex.: https://2kstudios.com)
 * - ALLOWED_ORIGINS   Lista extra separada por vírgula (ex.: https://a.com,https://b.com)
 */

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

// Origem padrão do deploy Vercel — sempre confiável.
const DEFAULT_PROD_ORIGINS = ["https://2k-web-saas.vercel.app"];

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** Conjunto de origens permitidas, derivado do ambiente. */
export function getAllowedOrigins(): string[] {
  const fromEnv = [
    ...parseList(process.env.APP_ORIGIN),
    ...parseList(process.env.ALLOWED_ORIGINS),
  ];

  const base = isProduction()
    ? [...DEFAULT_PROD_ORIGINS, ...fromEnv]
    : [...DEV_ORIGINS, ...fromEnv];

  // Dedup mantendo apenas origens absolutas http(s).
  return Array.from(new Set(base)).filter((origin) =>
    /^https?:\/\//.test(origin),
  );
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin / sem Origin: liberado.
  return getAllowedOrigins().includes(origin.replace(/\/+$/, ""));
}

const ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOW_HEADERS = "Content-Type, Authorization, X-Requested-With";
const MAX_AGE = "600";

/**
 * Cabeçalhos CORS para uma origem já validada como permitida.
 * Retorna objeto vazio para same-origin (sem Origin) — nada a expor.
 */
export function corsHeadersFor(origin: string | null): Record<string, string> {
  if (!origin) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": MAX_AGE,
    Vary: "Origin",
  };
}
