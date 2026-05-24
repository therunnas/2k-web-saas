import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
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

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? "2026");
    const type = url.searchParams.get("type") ?? "all";
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

    const entries = (await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
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
      if (type === "despesas") return entry.type === "EXPENSE" || entry.type === "PAYABLE";
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
      revenueEntries.reduce((sum, entry) => sum + revenueAmount(entry), 0)
    );

    const receivedTotal = roundMoney(
      revenueEntries
        .filter((entry) => entry.type === "REVENUE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0)
    );

    const receivableTotal = roundMoney(
      revenueEntries
        .filter((entry) => entry.type === "RECEIVABLE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0)
    );

    const totalExpenses = roundMoney(
      expenseEntries.reduce((sum, entry) => sum + expenseAmount(entry), 0)
    );

    const paidExpenses = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "EXPENSE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0)
    );

    const payableTotal = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "PAYABLE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0)
    );

    const totalProfit = roundMoney(totalRevenue - totalExpenses);
    const cashResult = roundMoney(receivedTotal - totalExpenses);

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
        type,
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
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar lançamentos financeiros.",
      },
      { status: 500 }
    );
  }
}