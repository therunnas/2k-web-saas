import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.workspaceId) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      confirm?: string;
    } | null;

    if (body?.confirm !== "LIMPAR") {
      return NextResponse.json(
        {
          status: "error",
          message: "Confirmação inválida para limpeza dos dados.",
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remove APENAS os lançamentos importados da planilha.
      const deletedEntries = await tx.financialEntry.deleteMany({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "SPREADSHEET",
        },
      });

      // Conta os lançamentos manuais que permanecem intactos (auditoria/feedback).
      const preservedManual = await tx.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "MANUAL",
        },
      });

      const deletedImports = await tx.import.deleteMany({
        where: {
          workspaceId: session.workspaceId,
        },
      });

      await tx.workspaceSettings.updateMany({
        where: {
          workspaceId: session.workspaceId,
        },
        data: {
          spreadsheetConfigured: false,
        },
      });

      return {
        entries: deletedEntries.count,
        imports: deletedImports.count,
        preservedManual,
      };
    });

    return NextResponse.json({
      status: "ok",
      message:
        "Dados importados da planilha removidos. Lançamentos manuais e catálogos preservados.",
      deleted: {
        entries: result.entries,
        imports: result.imports,
      },
      preservedManualRecords: result.preservedManual,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao limpar dados financeiros.",
      },
      { status: 500 },
    );
  }
}