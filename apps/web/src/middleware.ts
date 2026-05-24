import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "2k_admin_session";

const protectedRoutes = [
  "/setup",
  "/dashboard",
  "/financeiro",
  "/producoes",
  "/clientes",
  "/agenda"];

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

export async function middleware(request: NextRequest) {
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
    "/producoes/:path*",
    "/clientes/:path*",
    "/agenda/:path*",
    "/discord/:path*",
    "/automacoes/:path*"],
};