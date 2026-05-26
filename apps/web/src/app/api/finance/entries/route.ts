import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type FinanceEntry = {
  id: string;
  type: string;
  date: Date | null;
  competence: string | null;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  grossAmount: unknown;
  costAmount: unknown;
  profitAmount: unknown;
  marginPercent: unknown;
  sourceSheet: string | null;
  sourceRow: number | null;
  createdAt: Date;
};

type EditableFinancialEntryType =
  | "REVENUE"
  | "RECEIVABLE"
  | "EXPENSE"
  | "PAYABLE";

const validTypes = ["REVENUE", "RECEIVABLE", "EXPENSE", "PAYABLE"] as const;

function isValidFinancialEntryType(
  value: string,
): value is EditableFinancialEntryType {
  return (validTypes as readonly string[]).includes(value);
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNullableText(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parseDate(value: unknown) {
  const text = cleanText(value);

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function isRevenue(entry: FinanceEntry) {
  return entry.type === "REVENUE" || entry.type === "RECEIVABLE";
}

function isExpense(entry: FinanceEntry) {
  return entry.type === "EXPENSE" || entry.type === "PAYABLE";
}

function revenueAmount(entry: FinanceEntry) {
  return isRevenue(entry) ? Math.max(toNumber(entry.grossAmount), 0) : 0;
}

function expenseAmount(entry: FinanceEntry) {
  return isExpense(entry) ? Math.max(toNumber(entry.costAmount), 0) : 0;
}

function getEntryYear(entry: FinanceEntry) {
  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date.getFullYear();
  }

  if (entry.competence) {
    const match = entry.competence.match(/(\d{1,2})\/(\d{4})/);
    if (match) return Number(match[2]);
  }

  return null;
}

function getEntryMonth(entry: FinanceEntry) {
  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date.getMonth();
  }

  if (entry.competence) {
    const match = entry.competence.match(/(\d{1,2})\/(\d{4})/);

    if (match) {
      const month = Number(match[1]) - 1;
      return month >= 0 && month <= 11 ? month : null;
    }
  }

  return null;
}

function getDisplayName(entry: FinanceEntry) {
  return (
    entry.groupName ||
    entry.client ||
    entry.project ||
    entry.description ||
    entry.category ||
    "Sem identificação"
  );
}

function getEntryValue(entry: FinanceEntry) {
  if (isRevenue(entry)) return revenueAmount(entry);
  if (isExpense(entry)) return expenseAmount(entry);
  return 0;
}

function getEntryKind(entry: FinanceEntry) {
  if (entry.type === "REVENUE") return "Recebido";
  if (entry.type === "RECEIVABLE") return "A receber";
  if (entry.type === "EXPENSE") return "Despesa paga";
  if (entry.type === "PAYABLE") return "A pagar";
  return "Indefinido";
}

function getEntryDirection(entry: FinanceEntry) {
  if (isRevenue(entry)) return "entrada";
  if (isExpense(entry)) return "saida";
  return "outro";
}

function financialStatusFromType(type: string) {
  if (type === "REVENUE") return "PAGO";
  if (type === "RECEIVABLE") return "A_RECEBER";
  if (type === "EXPENSE") return "PAGO";
  if (type === "PAYABLE") return "A_PAGAR";
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? "2026");
    const type = url.searchParams.get("type") ?? "all";
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

    const entries = (await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
        deletedAt: null,
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 10000,
    })) as unknown as FinanceEntry[];

    const yearEntries = entries.filter((entry) => {
      const entryYear = getEntryYear(entry);
      return entryYear === null || entryYear === year;
    });

    const filteredByType = yearEntries.filter((entry) => {
      if (type === "all") return true;
      if (type === "entradas") return isRevenue(entry);
      if (type === "saidas") return isExpense(entry);
      if (type === "recebido") return entry.type === "REVENUE";
      if (type === "a-receber") return entry.type === "RECEIVABLE";
      if (type === "despesas")
        return entry.type === "EXPENSE" || entry.type === "PAYABLE";
      return true;
    });

    const filtered = filteredByType.filter((entry) => {
      if (!search) return true;

      const haystack = [
        entry.client,
        entry.groupName,
        entry.project,
        entry.description,
        entry.category,
        entry.status,
        entry.competence,
        entry.sourceSheet,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

    const revenueEntries = yearEntries.filter(isRevenue);
    const expenseEntries = yearEntries.filter(isExpense);

    const totalRevenue = roundMoney(
      revenueEntries.reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const receivedTotal = roundMoney(
      revenueEntries
        .filter((entry) => entry.type === "REVENUE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const receivableTotal = roundMoney(
      revenueEntries
        .filter((entry) => entry.type === "RECEIVABLE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const totalExpenses = roundMoney(
      expenseEntries.reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const paidExpenses = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "EXPENSE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const payableTotal = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "PAYABLE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const totalProfit = roundMoney(totalRevenue - totalExpenses);
    // Resultado de caixa = recebido - saídas pagas (não misturar com competência).
    const cashResult = roundMoney(receivedTotal - paidExpenses);

    const tableEntries = filtered.map((entry) => {
      const value = getEntryValue(entry);
      const month = getEntryMonth(entry);

      return {
        id: entry.id,
        type: entry.type,
        kind: getEntryKind(entry),
        direction: getEntryDirection(entry),
        date: entry.date,
        month,
        competence: entry.competence,
        name: getDisplayName(entry),
        client: entry.client,
        groupName: entry.groupName,
        project: entry.project,
        description: entry.description,
        category: entry.category,
        status: entry.status,
        value,
        revenue: revenueAmount(entry),
        expense: expenseAmount(entry),
        sourceSheet: entry.sourceSheet,
        sourceRow: entry.sourceRow,
      };
    });

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        type: type as Parameters<typeof prisma.financialEntry.update>[0]["data"]["type"],
        search,
      },
      summary: {
        entries: yearEntries.length,
        filteredEntries: tableEntries.length,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        totalExpenses,
        paidExpenses,
        payableTotal,
        totalProfit,
        cashResult,
      },
      entries: tableEntries,
    });
  } catch (error) {
    return apiError("finance.entries", error, {
      fallback: "Erro desconhecido ao carregar lançamentos financeiros.",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const id = cleanText(body.id);
    const type = cleanText(body.type).toUpperCase();
    const value = Math.max(toNumber(body.value), 0);

    if (!id) {
      return NextResponse.json(
        {
          status: "error",
          message: "ID do lançamento não informado.",
        },
        { status: 400 },
      );
    }

    if (!validTypes.includes(type as (typeof validTypes)[number])) {
      return NextResponse.json(
        {
          status: "error",
          message: "Tipo de lançamento inválido.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Lançamento não encontrado ou já excluído.",
        },
        { status: 404 },
      );
    }

    const isEntrada = type === "REVENUE" || type === "RECEIVABLE";
    const isSaida = type === "EXPENSE" || type === "PAYABLE";

    const grossAmount = isEntrada ? value : 0;
    const costAmount = isSaida ? value : 0;
    const profitAmount = grossAmount - costAmount;

    const data: Parameters<typeof prisma.financialEntry.update>[0]["data"] = {
      type: type as Parameters<typeof prisma.financialEntry.update>[0]["data"]["type"],
      date: parseDate(body.date),
      competence: toNullableText(body.competence),
      client: toNullableText(body.client),
      groupName: toNullableText(body.groupName),
      project: toNullableText(body.project),
      description: toNullableText(body.description),
      category: toNullableText(body.category),
      status: toNullableText(body.status) ?? financialStatusFromType(type),
      grossAmount,
      costAmount,
      profitAmount,
      financialStatus: financialStatusFromType(type),
      manualKind: isEntrada ? "ENTRADA" : "SAIDA",
      supplierName: isSaida ? toNullableText(body.client) : null,
      editable: true,
      updatedAt: new Date(),
    };

    const updated = await prisma.financialEntry.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json({
      status: "ok",
      message: "Lançamento atualizado com sucesso.",
      entry: updated,
    });
  } catch (error) {
    return apiError("finance.entries", error, {
      fallback: "Erro desconhecido ao editar lançamento.",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json(
        {
          status: "error",
          message: "ID do lançamento não informado.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Lançamento não encontrado ou já excluído.",
        },
        { status: 404 },
      );
    }

    await prisma.financialEntry.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        editable: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Lançamento excluído com sucesso.",
    });
  } catch (error) {
    return apiError("finance.entries", error, {
      fallback: "Erro desconhecido ao excluir lançamento.",
    });
  }
}
