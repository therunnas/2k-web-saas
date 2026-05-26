import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy conservadora e compatível com Next.js + Tailwind.
 *
 * Limitações conhecidas (documentadas em SECURITY.md):
 * - `script-src`/`style-src` usam 'unsafe-inline' porque o Next injeta scripts
 *   e estilos inline sem nonce nesta configuração. Endurecer para CSP baseada em
 *   nonce exige integração no proxy e fica como próximo passo.
 * - 'unsafe-eval' e `ws:` só são liberados em desenvolvimento (HMR do webpack).
 */
function buildCsp(): string {
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  const connectSrc = isProd
    ? "'self'"
    : "'self' ws: http://localhost:* http://127.0.0.1:*";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: buildCsp() },
  // HSTS só faz sentido sob HTTPS de produção; em http local é ignorado.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Não expor a tecnologia via header X-Powered-By.
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
