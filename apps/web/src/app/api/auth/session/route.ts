import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      session: null,
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      name: true,
      email: true,
      username: true,
      avatarDataUrl: true,
      role: true,
    },
  });

  return NextResponse.json({
    authenticated: true,
    session: {
      ...session,
      name: user?.name ?? session.name,
      email: user?.email ?? session.email,
      username: user?.username ?? null,
      avatarDataUrl: user?.avatarDataUrl ?? null,
      role: user?.role ?? session.role,
    },
  });
}