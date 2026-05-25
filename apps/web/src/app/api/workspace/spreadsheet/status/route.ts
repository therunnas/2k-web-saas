import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 }
      );
    }

    const [
      latestImport,
      importsCount,
      spreadsheetEntriesCount,
      spreadsheetEntradasCount,
      spreadsheetSaidasCount,
      manualEntriesCount,
      manualEntradasCount,
      manualSaidasCount,
    ] = await Promise.all([
      prisma.import.findFirst({
        where: {
          workspaceId: session.workspaceId,
        },
        orderBy: {
          importedAt: "desc",
        },
      }),

      prisma.import.count({
        where: {
          workspaceId: session.workspaceId,
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "SPREADSHEET",
          deletedAt: null,
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "SPREADSHEET",
          deletedAt: null,
          OR: [
            {
              manualKind: "ENTRADA",
            },
            {
              sourceSheet: {
                contains: "ENTRADAS",
              },
            },
            {
              category: "Entrada",
            },
          ],
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "SPREADSHEET",
          deletedAt: null,
          OR: [
            {
              manualKind: "SAIDA",
            },
            {
              sourceSheet: {
                contains: "SAIDAS",
              },
            },
            {
              sourceSheet: {
                contains: "SAÍDAS",
              },
            },
            {
              category: "Saída",
            },
          ],
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "MANUAL",
          deletedAt: null,
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "MANUAL",
          manualKind: "ENTRADA",
          deletedAt: null,
        },
      }),

      prisma.financialEntry.count({
        where: {
          workspaceId: session.workspaceId,
          sourceType: "MANUAL",
          manualKind: "SAIDA",
          deletedAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      status: "ok",
      latestImport: latestImport
        ? {
            id: latestImport.id,
            originalName: latestImport.originalName,
            importedAt: latestImport.importedAt,
            entriesCount: latestImport.entriesCount,
            outputsCount: latestImport.outputsCount,
            groupsCount: latestImport.groupsCount,
            brandsCount: latestImport.brandsCount,
          }
        : null,
      totals: {
        importsCount,
        spreadsheetEntriesCount,
        spreadsheetEntradasCount,
        spreadsheetSaidasCount,
        manualEntriesCount,
        manualEntradasCount,
        manualSaidasCount,
      },
      rules: {
        spreadsheet: "Dados importados podem ser limpos e reprocessados.",
        manual: "Dados manuais são preservados.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao consultar status da planilha.",
      },
      { status: 500 }
    );
  }
}
