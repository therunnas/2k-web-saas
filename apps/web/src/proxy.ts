import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
  ],
};