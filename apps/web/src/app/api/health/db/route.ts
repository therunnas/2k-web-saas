import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health-check público mínimo para monitoramento externo.
 *
 * Não expõe contagens, versões ou nomes de provedores — apenas um booleano
 * indicando se o banco está acessível pela aplicação.
 */
export async function GET() {
  try {
    // Query barata apenas para validar conectividade.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      connected: true,
    });
  } catch (error) {
    // Loga detalhes apenas no servidor.
    console.error("[api] health.db:", error);

    return NextResponse.json(
      {
        status: "error",
        connected: false,
      },
      { status: 503 },
    );
  }
}
