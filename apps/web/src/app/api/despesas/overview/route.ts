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

type ExpenseBucket = {
  name: string;
  total: number;
  paid: number;
  payable: number;
  count: number;
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

function isExpense(entry: FinanceEntry) {
  return entry.type === "EXPENSE" || entry.type === "PAYABLE";
}

function expenseAmount(entry: FinanceEntry) {
  if (!isExpense(entry)) return 0;

  return Math.max(toNumber(entry.costAmount), 0);
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

function getSupplier(entry: FinanceEntry) {
  return (
    entry.client ||
    entry.project ||
    entry.description ||
    "Fornecedor não identificado"
  );
}

function getCategory(entry: FinanceEntry) {
  return entry.category || "Sem categoria";
}

function getDescription(entry: FinanceEntry) {
  return (
    entry.description ||
    entry.project ||
    entry.category ||
    "Despesa sem descrição"
  );
}

function getExpenseKind(entry: FinanceEntry) {
  if (entry.type === "EXPENSE") return "Paga";
  if (entry.type === "PAYABLE") return "A pagar";
  return "Indefinida";
}

function upsertBucket(
  map: Map<string, ExpenseBucket>,
  name: string,
  entry: FinanceEntry,
) {
  const value = expenseAmount(entry);

  const current = map.get(name) ?? {
    name,
    total: 0,
    paid: 0,
    payable: 0,
    count: 0,
  };

  current.total += value;
  current.count += 1;

  if (entry.type === "EXPENSE") {
    current.paid += value;
  }

  if (entry.type === "PAYABLE") {
    current.payable += value;
  }

  map.set(name, current);
}

function serializeBucket(bucket: ExpenseBucket, index: number) {
  return {
    rank: index + 1,
    name: bucket.name,
    total: roundMoney(bucket.total),
    paid: roundMoney(bucket.paid),
    payable: roundMoney(bucket.payable),
    count: bucket.count,
  };
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
    const status = url.searchParams.get("status") ?? "all";
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
          sourceRow: "asc",
        },
      ],
      take: 10000,
    })) as unknown as FinanceEntry[];

    const expenseEntries = entries.filter((entry) => {
      const entryYear = getYear(entry);
      const matchesYear = entryYear === null || entryYear === year;

      return matchesYear && isExpense(entry) && expenseAmount(entry) > 0;
    });

    const filtered = expenseEntries
      .filter((entry) => {
        if (status === "paid") return entry.type === "EXPENSE";
        if (status === "payable") return entry.type === "PAYABLE";
        return true;
      })
      .filter((entry) => {
        if (!search) return true;

        const haystack = [
          getSupplier(entry),
          getCategory(entry),
          getDescription(entry),
          entry.status,
          entry.competence,
          entry.sourceSheet,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    const totalExpenses = roundMoney(
      expenseEntries.reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const paidTotal = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "EXPENSE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const payableTotal = roundMoney(
      expenseEntries
        .filter((entry) => entry.type === "PAYABLE")
        .reduce((sum, entry) => sum + expenseAmount(entry), 0),
    );

    const categoriesMap = new Map<string, ExpenseBucket>();
    const suppliersMap = new Map<string, ExpenseBucket>();
    const monthlyMap = new Map<number, number>();

    for (const entry of expenseEntries) {
      upsertBucket(categoriesMap, getCategory(entry), entry);
      upsertBucket(suppliersMap, getSupplier(entry), entry);

      const month = getMonth(entry);

      if (month !== null) {
        monthlyMap.set(
          month,
          (monthlyMap.get(month) ?? 0) + expenseAmount(entry),
        );
      }
    }

    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => b.total - a.total)
      .map(serializeBucket);

    const suppliers = Array.from(suppliersMap.values())
      .sort((a, b) => b.total - a.total)
      .map(serializeBucket);

    const monthly = Array.from({ length: 12 }).map((_, index) => ({
      month: index,
      value: roundMoney(monthlyMap.get(index) ?? 0),
    }));

    const expenses = filtered.map((entry) => ({
      id: entry.id,
      type: entry.type,
      kind: getExpenseKind(entry),
      supplier: getSupplier(entry),
      category: getCategory(entry),
      description: getDescription(entry),
      status: entry.status,
      value: roundMoney(expenseAmount(entry)),
      date: entry.date,
      month: getMonth(entry),
      competence: entry.competence,
      sourceSheet: entry.sourceSheet,
      sourceRow: entry.sourceRow,
    }));

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        status,
        search,
      },
      summary: {
        totalEntries: expenseEntries.length,
        filteredEntries: expenses.length,
        paidCount: expenseEntries.filter((entry) => entry.type === "EXPENSE")
          .length,
        payableCount: expenseEntries.filter((entry) => entry.type === "PAYABLE")
          .length,
        totalExpenses,
        paidTotal,
        payableTotal,
        categoriesCount: categories.length,
        suppliersCount: suppliers.length,
        topCategory: categories[0] ?? null,
        topSupplier: suppliers[0] ?? null,
      },
      categories,
      suppliers,
      monthly,
      expenses,
    });
  } catch (error) {
    return apiError("despesas.overview", error, {
      fallback: "Erro desconhecido ao carregar despesas.",
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
          message: "ID da despesa não informado.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        deletedAt: null,
        OR: [{ type: "EXPENSE" }, { type: "PAYABLE" }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Despesa não encontrada ou já excluída.",
        },
        { status: 404 },
      );
    }

    await prisma.financialEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        editable: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Despesa excluída com sucesso.",
    });
  } catch (error) {
    return apiError("despesas.overview", error, {
      fallback: "Erro desconhecido ao excluir despesa.",
    });
  }
}
