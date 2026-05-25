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
  sourceSheet: string | null;
  sourceRow: number | null;
};

const MONTHS = [
  { index: 0, key: "Jan", label: "01" },
  { index: 1, key: "Fev", label: "02" },
  { index: 2, key: "Mar", label: "03" },
  { index: 3, key: "Abr", label: "04" },
  { index: 4, key: "Mai", label: "05" },
  { index: 5, key: "Jun", label: "06" },
  { index: 6, key: "Jul", label: "07" },
  { index: 7, key: "Ago", label: "08" },
  { index: 8, key: "Set", label: "09" },
  { index: 9, key: "Out", label: "10" },
  { index: 10, key: "Nov", label: "11" },
  { index: 11, key: "Dez", label: "12" },
];

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

function getYear(entry: FinanceEntry) {
  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date.getFullYear();
  }

  if (entry.competence) {
    const match = entry.competence.match(/(\d{1,2})\/(\d{4})/);
    if (match) return Number(match[2]);
  }

  return null;
}

function getMonth(entry: FinanceEntry) {
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

function groupName(entry: FinanceEntry) {
  return (
    entry.groupName ||
    entry.client ||
    entry.project ||
    entry.category ||
    "Sem grupo"
  );
}

function percent(value: number) {
  return Math.round(value * 100) / 100;
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

    const entries = (await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
        deletedAt: null,
      },
      orderBy: {
        sourceRow: "asc",
      },
      take: 10000,
    })) as unknown as FinanceEntry[];

    const yearEntries = entries.filter((entry) => {
      const entryYear = getYear(entry);
      return entryYear === null || entryYear === year;
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
    const cashResult = roundMoney(receivedTotal - totalExpenses);

    const margin =
      totalRevenue > 0 ? percent((totalProfit / totalRevenue) * 100) : 0;

    const monthly = MONTHS.map((month) => {
      const monthRevenueEntries = revenueEntries.filter(
        (entry) => getMonth(entry) === month.index,
      );

      const monthExpenseEntries = expenseEntries.filter(
        (entry) => getMonth(entry) === month.index,
      );

      const revenue = roundMoney(
        monthRevenueEntries.reduce(
          (sum, entry) => sum + revenueAmount(entry),
          0,
        ),
      );

      const expenses = roundMoney(
        monthExpenseEntries.reduce(
          (sum, entry) => sum + expenseAmount(entry),
          0,
        ),
      );

      const profit = roundMoney(revenue - expenses);
      const monthMargin = revenue > 0 ? percent((profit / revenue) * 100) : 0;

      const groupMap = new Map<string, number>();

      for (const entry of monthRevenueEntries) {
        const name = groupName(entry);
        groupMap.set(name, (groupMap.get(name) ?? 0) + revenueAmount(entry));
      }

      const topClientRaw =
        Array.from(groupMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))[0] ?? null;

      return {
        month: month.key,
        label: `${month.label}/${year}`,
        value: revenue > 0 ? revenue : null,
        revenue,
        expenses,
        profit,
        margin: monthMargin,
        topClient: topClientRaw
          ? {
              name: topClientRaw.name,
              revenue: roundMoney(topClientRaw.value),
              profit: roundMoney(topClientRaw.value),
              margin: "100%",
            }
          : null,
      };
    });

    const annualGroupMap = new Map<string, number>();

    for (const entry of revenueEntries) {
      const name = groupName(entry);
      annualGroupMap.set(
        name,
        (annualGroupMap.get(name) ?? 0) + revenueAmount(entry),
      );
    }

    const topGroups = Array.from(annualGroupMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, revenue], index) => {
        const expenseAllocation =
          totalRevenue > 0 ? totalExpenses * (revenue / totalRevenue) : 0;

        const profit = revenue - expenseAllocation;
        const groupMargin = revenue > 0 ? percent((profit / revenue) * 100) : 0;

        return {
          rank: index + 1,
          name,
          revenue: roundMoney(revenue),
          expenses: roundMoney(expenseAllocation),
          profit: roundMoney(profit),
          margin: groupMargin,
        };
      });

    const latestEntries = revenueEntries
      .filter((entry) => entry.type === "RECEIVABLE")
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        date: entry.date,
        competence: entry.competence,
        client: entry.client,
        groupName: entry.groupName,
        project: entry.project,
        description: entry.description,
        category: entry.category,
        status: entry.status,
        revenue: revenueAmount(entry),
        expenses: 0,
        profit: revenueAmount(entry),
        sourceSheet: entry.sourceSheet,
        sourceRow: entry.sourceRow,
      }));

    return NextResponse.json({
      status: "ok",
      year,
      summary: {
        entries: yearEntries.length,
        revenueEntries: revenueEntries.length,
        expenseEntries: expenseEntries.length,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        totalExpenses,
        paidExpenses,
        payableTotal,
        totalProfit,
        cashResult,
        margin,
      },
      monthly,
      topGroups,
      latestEntries,
    });
  } catch (error) {
    return apiError("finance.overview", error, {
      fallback: "Erro desconhecido ao carregar visão financeira.",
    });
  }
}
