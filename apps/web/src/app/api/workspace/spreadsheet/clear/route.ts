import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => cleanText(value)).filter(Boolean))
  );
}

async function upsertCatalogItem(params: {
  workspaceId: string;
  type: string;
  name: string;
  parentName?: string | null;
}) {
  const name = cleanText(params.name);

  if (!name) return;

  await prisma.manualCatalogItem.upsert({
    where: {
      workspaceId_type_name: {
        workspaceId: params.workspaceId,
        type: params.type,
        name,
      },
    },
    update: {
      parentName: params.parentName ?? undefined,
      active: true,
    },
    create: {
      workspaceId: params.workspaceId,
      type: params.type,
      name,
      parentName: params.parentName ?? null,
      active: true,
    },
  });
}

async function preserveCatalogFromSpreadsheet(workspaceId: string) {
  const importedEntries = await prisma.financialEntry.findMany({
    where: {
      workspaceId,
      sourceType: "SPREADSHEET",
      deletedAt: null,
    },
    select: {
      type: true,
      client: true,
      groupName: true,
      supplierName: true,
      category: true,
      subCategory: true,
      sourceSheet: true,
    },
    take: 50000,
  });

  const entradaEntries = importedEntries.filter((entry) => {
    const sheet = cleanText(entry.sourceSheet).toUpperCase();
    return (
      entry.type === "REVENUE" ||
      entry.type === "RECEIVABLE" ||
      sheet.includes("ENTRADAS")
    );
  });

  const saidaEntries = importedEntries.filter((entry) => {
    const sheet = cleanText(entry.sourceSheet).toUpperCase();
    return (
      entry.type === "EXPENSE" ||
      entry.type === "PAYABLE" ||
      sheet.includes("SAIDAS") ||
      sheet.includes("SAÍDAS")
    );
  });

  const groupNames = unique(entradaEntries.map((entry) => entry.groupName));
  const brandNames = unique(entradaEntries.map((entry) => entry.client));

  const supplierNames = unique([
    ...saidaEntries.map((entry) => entry.supplierName),
    ...saidaEntries.map((entry) => entry.client),
  ]);

  const expenseCategories = unique(saidaEntries.map((entry) => entry.category));
  const expenseSubCategories = unique(
    saidaEntries.map((entry) => entry.subCategory)
  );

  for (const name of groupNames) {
    await upsertCatalogItem({
      workspaceId,
      type: "GROUP",
      name,
    });
  }

  for (const name of brandNames) {
    await upsertCatalogItem({
      workspaceId,
      type: "BRAND",
      name,
    });
  }

  for (const name of supplierNames) {
    await upsertCatalogItem({
      workspaceId,
      type: "SUPPLIER",
      name,
    });
  }

  for (const name of expenseCategories) {
    await upsertCatalogItem({
      workspaceId,
      type: "EXPENSE_CATEGORY",
      name,
    });
  }

  for (const name of expenseSubCategories) {
    await upsertCatalogItem({
      workspaceId,
      type: "EXPENSE_SUBCATEGORY",
      name,
    });
  }

  return {
    groups: groupNames.length,
    brands: brandNames.length,
    suppliers: supplierNames.length,
    expenseCategories: expenseCategories.length,
    expenseSubCategories: expenseSubCategories.length,
  };
}

export async function DELETE() {
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

    const preservedCatalog = await preserveCatalogFromSpreadsheet(
      session.workspaceId
    );

    const beforeCount = await prisma.financialEntry.count({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "SPREADSHEET",
      },
    });

    const result = await prisma.financialEntry.deleteMany({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "SPREADSHEET",
      },
    });

    const manualCount = await prisma.financialEntry.count({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        deletedAt: null,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Dados importados da planilha foram limpos com segurança.",
      deleted: result.count,
      beforeCount,
      preservedManualRecords: manualCount,
      preservedCatalog,
      rules: {
        deleted: "Somente sourceType SPREADSHEET foi removido.",
        preserved: "Registros MANUAL e bases de configuração foram preservados.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao limpar dados importados.",
      },
      { status: 500 }
    );
  }
}