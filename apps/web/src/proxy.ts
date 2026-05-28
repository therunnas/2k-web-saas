import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { corsHeadersFor, isOriginAllowed } from "@/lib/cors";

const SESSION_COOKIE_NAME = "2k_admin_session";

/**
 * Rotas privadas reais do painel.
 *
 * Mantenha esta lista sincronizada com o `config.matcher` no final do arquivo —
 * o matcher define o que dispara o proxy no edge, e este array define o
 * que ele efetivamente protege.
 *
 * APIs em `/api/*` não estão aqui porque cada rota faz sua própria checagem
 * via `getSession()`/`requireAdminSession()` (necessário porque o proxy
 * de edge não tem acesso ao Prisma).
 */
const protectedRoutes = [
  "/setup",
  "/dashboard",
  "/financeiro",
  "/entradas",
  "/saidas",
  "/clientes",
  "/grupos",
  "/vencimentos",
  "/despesas",
  "/producoes",
  "/agenda",
  "/relatorios",
  "/metas",
  "/configuracoes",
  "/conta",
];

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

async function isValidAdminSession(token: string | undefined) {
  if (!token) {
    return false;
  }

  try {
    const verified = await jwtVerify(token, getSecretKey());
    const payload = verified.payload;

    if (!payload.userId || !payload.email || !payload.workspaceId) {
      return false;
    }

    if (payload.role !== "ADMIN") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Same-origin = a Origin bate com o Host da própria requisição. */
function isSameOrigin(request: NextRequest, origin: string) {
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * CORS para /api/*. A autorização de sessão continua sendo feita por cada
 * rota via `getSession()` — aqui tratamos apenas origem cruzada e preflight.
 *
 * Requisições same-origin (sem `Origin` ou com `Origin` == Host) sempre passam,
 * para nunca quebrar login/dashboard/fetch interno em qualquer domínio.
 * A allowlist só restringe origem realmente cruzada.
 */
function handleApiCors(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || isSameOrigin(request, origin)) {
    return NextResponse.next();
  }

  const allowed = isOriginAllowed(origin);

  // Preflight: responde sem tocar na rota.
  if (request.method === "OPTIONS") {
    return allowed
      ? new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) })
      : new NextResponse(null, { status: 403 });
  }

  // Origem cruzada não autorizada: bloqueia (fail closed).
  if (!allowed) {
    return NextResponse.json(
      { status: "forbidden", message: "Origem não autorizada." },
      { status: 403 },
    );
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeadersFor(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return handleApiCors(request);
  }

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await isValidAdminSession(token);

  if (authenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/setup/:path*",
    "/dashboard/:path*",
    "/financeiro/:path*",
    "/entradas/:path*",
    "/saidas/:path*",
    "/clientes/:path*",
    "/grupos/:path*",
    "/vencimentos/:path*",
    "/despesas/:path*",
    "/producoes/:path*",
    "/agenda/:path*",
    "/relatorios/:path*",
    "/metas/:path*",
    "/configuracoes/:path*",
    "/conta/:path*",
  ],
};