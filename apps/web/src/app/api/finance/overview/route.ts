import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import {
  computeGroupRanking,
  computeMonthly,
  computeSummary,
  isInYear,
  isRevenue,
  revenueAmount,
  type FinanceEntryLike,
} from "@/lib/finance";

export const runtime = "nodejs";

type FinanceEntry = FinanceEntryLike & {
  id: string;
  description: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
};

const MONTH_KEYS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

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
    const now = new Date();

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

    const yearEntries = entries.filter((entry) => isInYear(entry, year));

    // Resumo anual (competência x caixa corretamente separados).
    const summary = computeSummary(yearEntries, now);

    // Série mensal consolidada.
    const monthlyRaw = computeMonthly(yearEntries);
    const monthly = monthlyRaw.map((point) => ({
      month: MONTH_KEYS[point.index],
      label: `${String(point.index + 1).padStart(2, "0")}/${year}`,
      value: point.revenue > 0 ? point.revenue : null,
      revenue: point.revenue,
      received: point.received,
      receivable: point.receivable,
      expenses: point.expenses,
      profit: point.profit,
      cash: point.cash,
      margin: point.margin,
    }));

    // Mês atual (KPIs do topo do dashboard).
    const currentMonthIndex = now.getFullYear() === year ? now.getMonth() : null;
    const currentPoint =
      currentMonthIndex !== null ? monthlyRaw[currentMonthIndex] : null;
    const currentMonth = currentPoint
      ? {
          month: MONTH_KEYS[currentPoint.index],
          label: `${String(currentPoint.index + 1).padStart(2, "0")}/${year}`,
          revenue: currentPoint.revenue,
          received: currentPoint.received,
          receivable: currentPoint.receivable,
          expenses: currentPoint.expenses,
          profit: currentPoint.profit,
          cash: currentPoint.cash,
          margin: currentPoint.margin,
        }
      : null;

    // Ranking de grupos por faturamento — participação, NÃO margem fake.
    const topGroups = computeGroupRanking(yearEntries, 8);

    // Próximos recebimentos: pendentes ordenados pela data prevista (dueAt).
    const latestEntries = yearEntries
      .filter((entry) => entry.type === "RECEIVABLE")
      .sort((a, b) => {
        const da = a.dueAt instanceof Date ? a.dueAt.getTime() : Infinity;
        const db = b.dueAt instanceof Date ? b.dueAt.getTime() : Infinity;
        if (da !== db) return da - db;
        return (a.sourceRow ?? 0) - (b.sourceRow ?? 0);
      })
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        date: entry.date,
        dueAt: entry.dueAt ?? null,
        competence: entry.competence,
        client: entry.client ?? null,
        groupName: entry.groupName ?? null,
        project: entry.project ?? null,
        description: entry.description,
        category: entry.category ?? null,
        status: entry.status ?? null,
        overdue:
          entry.dueAt instanceof Date && entry.dueAt.getTime() < now.getTime(),
        revenue: revenueAmount(entry),
        sourceSheet: entry.sourceSheet,
        sourceRow: entry.sourceRow,
      }));

    const topGroupByRevenue = topGroups[0] ?? null;

    return NextResponse.json({
      status: "ok",
      year,
      summary: {
        entries: yearEntries.length,
        revenueEntries: yearEntries.filter(isRevenue).length,
        expenseEntries: yearEntries.filter(
          (e) => e.type === "EXPENSE" || e.type === "PAYABLE",
        ).length,
        ...summary,
      },
      currentMonth,
      topGroupByRevenue,
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
