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
  sourceType: string | null;
  createdAt: Date | null;
};

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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


function moneyToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  if (value && typeof (value as { toString?: () => string }).toString === "function") {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getMonthlyEntryIndex(entry: any): number | null {
  if (entry.date) {
    const date = new Date(entry.date);
    if (!Number.isNaN(date.getTime())) return date.getMonth();
  }

  const competence = String(entry.competence ?? "");
  const match = competence.match(/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const month = Number(match[1]) - 1;
  return month >= 0 && month <= 11 ? month : null;
}

function getMonthlyClientName(entry: any): string {
  return (
    entry.groupName ||
    entry.client ||
    entry.brandName ||
    entry.project ||
    entry.description ||
    "Sem cliente"
  );
}

function isMonthlyRevenueEntry(entry: any): boolean {
  const type = String(entry.type ?? "").toUpperCase();
  const status = String(entry.status ?? entry.financialStatus ?? "").toUpperCase();

  if (type === "EXPENSE" || type === "PAYABLE" || type === "CANCELED") return false;
  if (status.includes("CANCEL")) return false;

  return type === "REVENUE" || type === "RECEIVABLE";
}

function getMonthlyRevenueAmount(entry: any): number {
  return moneyToNumber(entry.grossAmount ?? entry.expectedAmount ?? entry.paidAmount ?? 0);
}

function buildMonthlyTopClients(entries: any[], monthlyRaw: Array<{ index: number; revenue: number }>) {
  const buckets = Array.from({ length: 12 }, () => new Map<string, { revenue: number; projects: Set<string> }>());

  for (const entry of entries) {
    if (!isMonthlyRevenueEntry(entry)) continue;

    const month = getMonthlyEntryIndex(entry);
    if (month === null) continue;

    const revenue = getMonthlyRevenueAmount(entry);
    if (revenue <= 0) continue;

    const name = getMonthlyClientName(entry);
    const projectKey = String(entry.project || entry.description || entry.sourceRow || name);

    const current = buckets[month].get(name) ?? { revenue: 0, projects: new Set<string>() };
    current.revenue += revenue;
    current.projects.add(projectKey);
    buckets[month].set(name, current);
  }

  return buckets.map((bucket, index) => {
    const top = [...bucket.entries()].sort((a, b) => b[1].revenue - a[1].revenue)[0];
    if (!top) return null;

    const [name, data] = top;
    const monthRevenue = monthlyRaw[index]?.revenue ?? 0;
    const participationPercent = monthRevenue > 0 ? Number(((data.revenue / monthRevenue) * 100).toFixed(2)) : 0;

    return {
      name,
      revenue: Number(data.revenue.toFixed(2)),
      profit: 0,
      margin: `${participationPercent.toFixed(2)}%`,
      participationPercent,
      projectsCount: data.projects.size,
    };
  });
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
    const monthlyTopClients = buildMonthlyTopClients(yearEntries, monthlyRaw);
    const monthly = monthlyRaw.map((point) => ({
      month: MONTH_KEYS[point.index],
      topClient: monthlyTopClients[point.index] ?? null,
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

    // Próximas produções: abertas (a receber) OU com data futura — não só RECEIVABLE.
    const upcomingProductions = yearEntries
      .filter((entry) => {
        if (!isRevenue(entry) || revenueAmount(entry) <= 0) return false;
        if (entry.type === "RECEIVABLE") return true;

        const dv =
          entry.dueAt instanceof Date
            ? entry.dueAt
            : entry.date instanceof Date
              ? entry.date
              : null;

        return dv ? dv.getTime() > now.getTime() : false;
      })
      .sort((a, b) => {
        const da =
          a.dueAt instanceof Date
            ? a.dueAt.getTime()
            : a.date instanceof Date
              ? a.date.getTime()
              : Infinity;
        const db =
          b.dueAt instanceof Date
            ? b.dueAt.getTime()
            : b.date instanceof Date
              ? b.date.getTime()
              : Infinity;
        if (da !== db) return da - db;
        return (a.sourceRow ?? 0) - (b.sourceRow ?? 0);
      })
      .slice(0, 8)
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
        sourceType: entry.sourceType ?? null,
        createdAt: entry.createdAt ?? null,
        isNew:
          entry.createdAt instanceof Date &&
          now.getTime() - entry.createdAt.getTime() <= NEW_WINDOW_MS,
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
      upcomingProductions,
    });
  } catch (error) {
    return apiError("finance.overview", error, {
      fallback: "Erro desconhecido ao carregar visão financeira.",
    });
  }
}
