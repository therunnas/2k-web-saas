import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [users, workspaces, imports] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.import.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "postgresql",
      provider: "neon",
      connected: true,
      counts: {
        users,
        workspaces,
        imports,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "postgresql",
        provider: "neon",
        connected: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao conectar ao banco.",
      },
      { status: 500 }
    );
  }
}