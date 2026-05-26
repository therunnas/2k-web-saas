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
  createdAt: Date;
};

type Bucket = {
  name: string;
  total: number;
  count: number;
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

function getGroupName(entry: FinanceEntry) {
  return entry.groupName || entry.client || entry.project || "Sem grupo";
}

function getBrandName(entry: FinanceEntry) {
  return entry.client || entry.groupName || "Sem marca";
}

function getProjectName(entry: FinanceEntry) {
  return entry.project || entry.description || "Sem projeto";
}

function getSupplierName(entry: FinanceEntry) {
  return (
    entry.client ||
    entry.project ||
    entry.description ||
    "Fornecedor não identificado"
  );
}

function getCategoryName(entry: FinanceEntry) {
  return entry.category || "Sem categoria";
}

function upsertBucket(map: Map<string, Bucket>, name: string, value: number) {
  const current = map.get(name) ?? {
    name,
    total: 0,
    count: 0,
  };

  current.total += value;
  current.count += 1;

  map.set(name, current);
}

function serializeBuckets(map: Map<string, Bucket>, limit = 8) {
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      total: roundMoney(item.total),
      count: item.count,
    }));
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
      orderBy: [
        {
          date: "asc",
        },
        {
          sourceRow: "asc",
        },
      ],
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
    // Resultado de caixa = recebido - saídas pagas (não misturar com competência).
    const cashResult = roundMoney(receivedTotal - paidExpenses);

    const margin =
      totalRevenue > 0 ? roundMoney((totalProfit / totalRevenue) * 100) : 0;

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

      const received = roundMoney(
        monthRevenueEntries
          .filter((entry) => entry.type === "REVENUE")
          .reduce((sum, entry) => sum + revenueAmount(entry), 0),
      );

      const receivable = roundMoney(
        monthRevenueEntries
          .filter((entry) => entry.type === "RECEIVABLE")
          .reduce((sum, entry) => sum + revenueAmount(entry), 0),
      );

      const expenses = roundMoney(
        monthExpenseEntries.reduce(
          (sum, entry) => sum + expenseAmount(entry),
          0,
        ),
      );

      const paid = roundMoney(
        monthExpenseEntries
          .filter((entry) => entry.type === "EXPENSE")
          .reduce((sum, entry) => sum + expenseAmount(entry), 0),
      );

      const profit = roundMoney(revenue - expenses);
      // Caixa do mês = recebido - pago (não competência).
      const cash = roundMoney(received - paid);

      return {
        month: month.key,
        label: `${month.label}/${year}`,
        revenue,
        received,
        receivable,
        expenses,
        profit,
        cash,
        margin: revenue > 0 ? roundMoney((profit / revenue) * 100) : 0,
        entries: monthRevenueEntries.length + monthExpenseEntries.length,
      };
    });

    const groupsMap = new Map<string, Bucket>();
    const brandsMap = new Map<string, Bucket>();
    const projectsMap = new Map<string, Bucket>();
    const categoriesMap = new Map<string, Bucket>();
    const suppliersMap = new Map<string, Bucket>();

    for (const entry of revenueEntries) {
      const value = revenueAmount(entry);

      upsertBucket(groupsMap, getGroupName(entry), value);
      upsertBucket(brandsMap, getBrandName(entry), value);
      upsertBucket(projectsMap, getProjectName(entry), value);
    }

    for (const entry of expenseEntries) {
      const value = expenseAmount(entry);

      upsertBucket(categoriesMap, getCategoryName(entry), value);
      upsertBucket(suppliersMap, getSupplierName(entry), value);
    }

    const topGroups = serializeBuckets(groupsMap, 8);
    const topBrands = serializeBuckets(brandsMap, 8);
    const topProjects = serializeBuckets(projectsMap, 8);
    const topExpenseCategories = serializeBuckets(categoriesMap, 8);
    const topSuppliers = serializeBuckets(suppliersMap, 8);

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
        groupsCount: groupsMap.size,
        brandsCount: brandsMap.size,
        projectsCount: projectsMap.size,
        categoriesCount: categoriesMap.size,
        suppliersCount: suppliersMap.size,
      },
      monthly,
      rankings: {
        topGroups,
        topBrands,
        topProjects,
        topExpenseCategories,
        topSuppliers,
      },
    });
  } catch (error) {
    return apiError("relatorios.overview", error, {
      fallback: "Erro desconhecido ao carregar relatórios.",
    });
  }
}
