import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type CatalogType =
  | "GROUP"
  | "BRAND"
  | "SUPPLIER"
  | "EXPENSE_CATEGORY"
  | "EXPENSE_SUBCATEGORY"
  | "PAYMENT_METHOD"
  | "ACCOUNT"
  | "COST_CENTER"
  | "RECURRENCE";

/**
 * Tipos financeiros (do enum `FinancialEntryType`) considerados "entradas"
 * e "saídas" pela camada manual.
 *
 * Nota: `LEAD` não entra neste filtro operacional de entradas confirmadas
 * ou a receber. O fluxo comercial pode continuar usando `commercialStatus`
 * para leads sem misturar isso com a classificação financeira usada nas queries.
 */
const entradaFinancialTypes: ("REVENUE" | "RECEIVABLE")[] = [
  "REVENUE",
  "RECEIVABLE",
];

const saidaFinancialTypes: ("EXPENSE" | "PAYABLE")[] = ["EXPENSE", "PAYABLE"];

const defaultPaymentMethods = [
  "Pix CNPJ",
  "TransferÃªncia bancÃ¡ria",
  "Boleto bancÃ¡rio",
  "DÃ©bito em conta",
  "Outro",
];

const defaultAccountNames = ["Pix CNPJ", "Conta principal 2K", "Banco PJ"];

const defaultCostCenters = [
  "AdministraÃ§Ã£o",
  "ProduÃ§Ã£o",
  "Tecnologia",
  "Financeiro",
  "Operacional",
];

const defaultRecurrences = ["PONTUAL", "MENSAL", "ANUAL", "PARCELADO"];

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeType(value: unknown): CatalogType | null {
  const raw = text(value).toUpperCase();

  if (
    raw === "GROUP" ||
    raw === "BRAND" ||
    raw === "SUPPLIER" ||
    raw === "EXPENSE_CATEGORY" ||
    raw === "EXPENSE_SUBCATEGORY" ||
    raw === "PAYMENT_METHOD" ||
    raw === "ACCOUNT" ||
    raw === "COST_CENTER" ||
    raw === "RECURRENCE"
  ) {
    return raw;
  }

  return null;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => text(value)).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function withoutHidden(values: string[], hidden: string[]) {
  const hiddenSet = new Set(hidden.map((item) => item.toLowerCase()));
  return values.filter((value) => !hiddenSet.has(value.toLowerCase()));
}

function activeNames(
  items: Array<{ type: string; active: boolean; name: string }>,
  type: CatalogType,
) {
  return items
    .filter((item) => item.type === type && item.active)
    .map((item) => item.name);
}

function hiddenNames(
  items: Array<{ type: string; active: boolean; name: string }>,
  type: CatalogType,
) {
  return items
    .filter((item) => item.type === type && !item.active)
    .map((item) => item.name);
}

const entradaFilter = {
  OR: [
    { manualKind: "ENTRADA" },
    { type: { in: entradaFinancialTypes } },
    { sourceSheet: { contains: "ENTRADAS" } },
  ],
};

const saidaFilter = {
  OR: [
    { manualKind: "SAIDA" },
    { type: { in: saidaFinancialTypes } },
    { sourceSheet: { contains: "SAIDAS" } },
    { sourceSheet: { contains: "SAÃDAS" } },
  ],
};

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "SessÃ£o invÃ¡lida." },
        { status: 401 },
      );
    }

    const [entradaEntries, saidaEntries, catalogItems] = await Promise.all([
      prisma.financialEntry.findMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          ...entradaFilter,
        },
        select: {
          groupName: true,
          client: true,
        },
        take: 20000,
      }),

      prisma.financialEntry.findMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          ...saidaFilter,
        },
        select: {
          supplierName: true,
          client: true,
          category: true,
          subCategory: true,
          nature: true,
          paymentMethod: true,
          accountName: true,
          costCenter: true,
          recurrence: true,
        },
        take: 20000,
      }),

      prisma.manualCatalogItem.findMany({
        where: {
          workspaceId: session.workspaceId,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const groups = withoutHidden(
      uniqueSorted([
        ...entradaEntries.map((entry) => entry.groupName),
        ...activeNames(catalogItems, "GROUP"),
      ]),
      hiddenNames(catalogItems, "GROUP"),
    );

    const brands = withoutHidden(
      uniqueSorted([
        ...entradaEntries.map((entry) => entry.client),
        ...activeNames(catalogItems, "BRAND"),
      ]),
      hiddenNames(catalogItems, "BRAND"),
    );

    const suppliers = withoutHidden(
      uniqueSorted([
        ...saidaEntries.map((entry) => entry.supplierName),
        ...saidaEntries.map((entry) => entry.client),
        ...activeNames(catalogItems, "SUPPLIER"),
      ]),
      hiddenNames(catalogItems, "SUPPLIER"),
    );

    const expenseCategories = withoutHidden(
      uniqueSorted([
        ...saidaEntries.map((entry) => entry.category),
        ...activeNames(catalogItems, "EXPENSE_CATEGORY"),
      ]),
      hiddenNames(catalogItems, "EXPENSE_CATEGORY"),
    );

    const expenseSubCategories = withoutHidden(
      uniqueSorted([
        ...saidaEntries.map((entry) => entry.subCategory),
        ...activeNames(catalogItems, "EXPENSE_SUBCATEGORY"),
      ]),
      hiddenNames(catalogItems, "EXPENSE_SUBCATEGORY"),
    );

    const paymentMethods = withoutHidden(
      uniqueSorted([
        ...defaultPaymentMethods,
        ...saidaEntries.map((entry) => entry.paymentMethod),
        ...activeNames(catalogItems, "PAYMENT_METHOD"),
      ]),
      hiddenNames(catalogItems, "PAYMENT_METHOD"),
    );

    const accountNames = withoutHidden(
      uniqueSorted([
        ...defaultAccountNames,
        ...saidaEntries.map((entry) => entry.accountName),
        ...activeNames(catalogItems, "ACCOUNT"),
      ]),
      hiddenNames(catalogItems, "ACCOUNT"),
    );

    const costCenters = withoutHidden(
      uniqueSorted([
        ...defaultCostCenters,
        ...saidaEntries.map((entry) => entry.costCenter),
        ...activeNames(catalogItems, "COST_CENTER"),
      ]),
      hiddenNames(catalogItems, "COST_CENTER"),
    );

    const recurrences = withoutHidden(
      uniqueSorted([
        ...defaultRecurrences,
        ...saidaEntries.map((entry) => entry.recurrence),
        ...activeNames(catalogItems, "RECURRENCE"),
      ]),
      hiddenNames(catalogItems, "RECURRENCE"),
    );

    const expenseNatures = uniqueSorted([
      ...saidaEntries.map((entry) => entry.nature),
    ]);

    return NextResponse.json({
      status: "ok",
      groups,
      brands,
      suppliers,
      expenseCategories,
      expenseSubCategories,
      expenseNatures,
      paymentMethods,
      accountNames,
      costCenters,
      recurrences,
      catalogItems: catalogItems.filter((item) => item.active),
      hiddenItems: catalogItems.filter((item) => !item.active),
      rules: {
        groups: "Somente entradas: quem emite/recebe NF.",
        brands: "Somente entradas: quem pediu o job.",
        suppliers:
          "Somente saÃ­das: fornecedores, ferramentas, equipe e custos.",
        expenseCategories: "Somente saÃ­das: categoria principal da despesa.",
        expenseSubCategories: "Somente saÃ­das: detalhe operacional da despesa.",
        paymentMethods: "Financeiro: forma usada para pagamento.",
        accountNames: "Financeiro: conta, banco ou Pix CNPJ usado.",
        costCenters: "Financeiro: centro de custo do lanÃ§amento.",
        recurrences: "Financeiro: recorrÃªncia do lanÃ§amento.",
      },
    });
  } catch (error) {
    return apiError("manual.catalog", error, {
      fallback: "Erro desconhecido ao carregar catÃ¡logo.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "SessÃ£o invÃ¡lida." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const type = normalizeType(body.type);
    const name = text(body.name);
    const parentName = text(body.parentName);

    if (!type) {
      return NextResponse.json(
        { status: "error", message: "Tipo invÃ¡lido." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Informe um nome." },
        { status: 400 },
      );
    }

    const existing = await prisma.manualCatalogItem.findFirst({
      where: {
        workspaceId: session.workspaceId,
        type,
        name,
      },
    });

    const item = existing
      ? await prisma.manualCatalogItem.update({
          where: { id: existing.id },
          data: {
            parentName: parentName || existing.parentName,
            active: true,
          },
        })
      : await prisma.manualCatalogItem.create({
          data: {
            workspaceId: session.workspaceId,
            type,
            name,
            parentName: parentName || null,
            active: true,
          },
        });

    return NextResponse.json({
      status: "ok",
      message: "Item salvo com sucesso.",
      item,
    });
  } catch (error) {
    return apiError("manual.catalog", error, {
      fallback: "Erro desconhecido ao salvar item do catÃ¡logo.",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "SessÃ£o invÃ¡lida." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const type = normalizeType(body.type);
    const oldName = text(body.oldName);
    const name = text(body.name);
    const parentName = text(body.parentName);

    if (!type) {
      return NextResponse.json(
        { status: "error", message: "Tipo invÃ¡lido." },
        { status: 400 },
      );
    }

    if (!oldName || !name) {
      return NextResponse.json(
        { status: "error", message: "Informe o nome atual e o novo nome." },
        { status: 400 },
      );
    }

    const existing = await prisma.manualCatalogItem.findFirst({
      where: {
        workspaceId: session.workspaceId,
        type,
        name: oldName,
      },
    });

    if (existing) {
      await prisma.manualCatalogItem.update({
        where: { id: existing.id },
        data: {
          name,
          parentName: parentName || existing.parentName,
          active: true,
        },
      });
    } else {
      await prisma.manualCatalogItem.create({
        data: {
          workspaceId: session.workspaceId,
          type,
          name,
          parentName: parentName || null,
          active: true,
        },
      });
    }

    if (type === "GROUP") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          groupName: oldName,
          deletedAt: null,
          ...entradaFilter,
        },
        data: { groupName: name },
      });

      await prisma.manualCatalogItem.updateMany({
        where: {
          workspaceId: session.workspaceId,
          parentName: oldName,
        },
        data: { parentName: name },
      });
    }

    if (type === "BRAND") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          client: oldName,
          deletedAt: null,
          ...entradaFilter,
        },
        data: { client: name },
      });
    }

    if (type === "SUPPLIER") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          supplierName: oldName,
          ...saidaFilter,
        },
        data: {
          supplierName: name,
          client: name,
          groupName: name,
        },
      });
    }

    if (type === "EXPENSE_CATEGORY") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          category: oldName,
          ...saidaFilter,
        },
        data: { category: name },
      });
    }

    if (type === "EXPENSE_SUBCATEGORY") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          subCategory: oldName,
          ...saidaFilter,
        },
        data: { subCategory: name },
      });
    }

    if (type === "PAYMENT_METHOD") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          paymentMethod: oldName,
          ...saidaFilter,
        },
        data: { paymentMethod: name },
      });
    }

    if (type === "ACCOUNT") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          accountName: oldName,
          ...saidaFilter,
        },
        data: { accountName: name },
      });
    }

    if (type === "COST_CENTER") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          costCenter: oldName,
          ...saidaFilter,
        },
        data: { costCenter: name },
      });
    }

    if (type === "RECURRENCE") {
      await prisma.financialEntry.updateMany({
        where: {
          workspaceId: session.workspaceId,
          deletedAt: null,
          recurrence: oldName,
          ...saidaFilter,
        },
        data: { recurrence: name },
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Item atualizado com sucesso.",
    });
  } catch (error) {
    return apiError("manual.catalog", error, {
      fallback: "Erro desconhecido ao editar item do catÃ¡logo.",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "SessÃ£o invÃ¡lida." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const type = normalizeType(body.type);
    const name = text(body.name);

    if (!type) {
      return NextResponse.json(
        { status: "error", message: "Tipo invÃ¡lido." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Informe o nome do item." },
        { status: 400 },
      );
    }

    const existing = await prisma.manualCatalogItem.findFirst({
      where: {
        workspaceId: session.workspaceId,
        type,
        name,
      },
    });

    if (existing) {
      await prisma.manualCatalogItem.update({
        where: { id: existing.id },
        data: { active: false },
      });
    } else {
      await prisma.manualCatalogItem.create({
        data: {
          workspaceId: session.workspaceId,
          type,
          name,
          parentName: null,
          active: false,
        },
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Item removido da lista de seleÃ§Ã£o.",
    });
  } catch (error) {
    return apiError("manual.catalog", error, {
      fallback: "Erro desconhecido ao remover item do catÃ¡logo.",
    });
  }
}
