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

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function niceTarget(value: number, multiplier = 1.15) {
  if (value <= 0) return 0;

  return Math.ceil((value * multiplier) / 1000) * 1000;
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

function normalProgress(current: number, target: number) {
  if (target <= 0) return 0;

  return roundPercent(Math.min((current / target) * 100, 999));
}

function inverseProgress(current: number, target: number) {
  if (target <= 0) return 0;
  if (current <= 0) return 100;

  return roundPercent(Math.min((target / current) * 100, 999));
}

function goalStatus(
  progress: number,
  lowerIsBetter = false,
  current = 0,
  target = 0,
) {
  if (lowerIsBetter) {
    if (current <= target) return "Dentro da meta";
    if (current <= target * 1.15) return "Atenção";
    return "Acima do limite";
  }

  if (progress >= 100) return "Meta batida";
  if (progress >= 75) return "Em avanço";
  if (progress >= 50) return "Atenção";
  return "Abaixo do ritmo";
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
      totalRevenue > 0 ? roundPercent((totalProfit / totalRevenue) * 100) : 0;

    const annualRevenueTarget = niceTarget(totalRevenue, 1.15);
    const annualReceivedTarget = niceTarget(receivedTotal, 1.12);
    const annualProfitTarget = niceTarget(totalProfit, 1.15);
    const marginTarget = 55;
    const expensesCeiling = roundMoney(totalRevenue * 0.45);
    const receivableCeiling = roundMoney(totalRevenue * 0.2);

    const goals = [
      {
        id: "annual-revenue",
        label: "Faturamento anual",
        description: "Meta sugerida com crescimento sobre o faturamento atual.",
        current: totalRevenue,
        target: annualRevenueTarget,
        unit: "currency",
        lowerIsBetter: false,
        progress: normalProgress(totalRevenue, annualRevenueTarget),
        status: goalStatus(normalProgress(totalRevenue, annualRevenueTarget)),
      },
      {
        id: "received-cash",
        label: "Recebimento em caixa",
        description: "Meta de dinheiro efetivamente recebido.",
        current: receivedTotal,
        target: annualReceivedTarget,
        unit: "currency",
        lowerIsBetter: false,
        progress: normalProgress(receivedTotal, annualReceivedTarget),
        status: goalStatus(normalProgress(receivedTotal, annualReceivedTarget)),
      },
      {
        id: "annual-profit",
        label: "Lucro anual",
        description: "Meta de resultado por competência.",
        current: totalProfit,
        target: annualProfitTarget,
        unit: "currency",
        lowerIsBetter: false,
        progress: normalProgress(totalProfit, annualProfitTarget),
        status: goalStatus(normalProgress(totalProfit, annualProfitTarget)),
      },
      {
        id: "margin",
        label: "Margem estimada",
        description: "Meta percentual de lucro sobre faturamento.",
        current: margin,
        target: marginTarget,
        unit: "percent",
        lowerIsBetter: false,
        progress: normalProgress(margin, marginTarget),
        status: goalStatus(normalProgress(margin, marginTarget)),
      },
      {
        id: "expenses-control",
        label: "Teto de despesas",
        description: "Controle de saídas em relação ao faturamento.",
        current: totalExpenses,
        target: expensesCeiling,
        unit: "currency",
        lowerIsBetter: true,
        progress: inverseProgress(totalExpenses, expensesCeiling),
        status: goalStatus(
          inverseProgress(totalExpenses, expensesCeiling),
          true,
          totalExpenses,
          expensesCeiling,
        ),
      },
      {
        id: "receivable-control",
        label: "Controle de a receber",
        description: "Limite recomendado de valores pendentes.",
        current: receivableTotal,
        target: receivableCeiling,
        unit: "currency",
        lowerIsBetter: true,
        progress: inverseProgress(receivableTotal, receivableCeiling),
        status: goalStatus(
          inverseProgress(receivableTotal, receivableCeiling),
          true,
          receivableTotal,
          receivableCeiling,
        ),
      },
    ];

    const monthlyRevenueTarget =
      annualRevenueTarget > 0 ? annualRevenueTarget / 12 : 0;
    const monthlyReceivedTarget =
      annualReceivedTarget > 0 ? annualReceivedTarget / 12 : 0;
    const monthlyExpenseCeiling =
      expensesCeiling > 0 ? expensesCeiling / 12 : 0;

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

      const expenses = roundMoney(
        monthExpenseEntries.reduce(
          (sum, entry) => sum + expenseAmount(entry),
          0,
        ),
      );

      const profit = roundMoney(revenue - expenses);

      const revenueProgress = normalProgress(revenue, monthlyRevenueTarget);
      const receivedProgress = normalProgress(received, monthlyReceivedTarget);
      const expenseProgress = inverseProgress(expenses, monthlyExpenseCeiling);

      return {
        month: month.key,
        label: `${month.label}/${year}`,
        revenue,
        received,
        expenses,
        profit,
        revenueTarget: roundMoney(monthlyRevenueTarget),
        receivedTarget: roundMoney(monthlyReceivedTarget),
        expenseCeiling: roundMoney(monthlyExpenseCeiling),
        revenueProgress,
        receivedProgress,
        expenseProgress,
        status:
          revenueProgress >= 100
            ? "Meta de faturamento batida"
            : revenueProgress >= 70
              ? "Bom ritmo"
              : revenue > 0
                ? "Abaixo do ritmo"
                : "Aguardando dados",
      };
    });

    const overallScore =
      goals.length > 0
        ? roundPercent(
            goals.reduce((sum, goal) => sum + Math.min(goal.progress, 100), 0) /
              goals.length,
          )
        : 0;

    return NextResponse.json({
      status: "ok",
      year,
      summary: {
        entries: yearEntries.length,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        totalExpenses,
        paidExpenses,
        payableTotal,
        totalProfit,
        cashResult,
        margin,
        overallScore,
      },
      goals,
      monthly,
    });
  } catch (error) {
    return apiError("metas.overview", error, {
      fallback: "Erro desconhecido ao carregar metas.",
    });
  }
}
