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

function getDescription(entry: FinanceEntry) {
  return entry.project || entry.description || entry.category || "Lançamento financeiro";
}

function getValue(entry: FinanceEntry) {
  if (isRevenue(entry)) return revenueAmount(entry);
  if (isExpense(entry)) return expenseAmount(entry);
  return 0;
}

function getAgendaKind(entry: FinanceEntry) {
  if (entry.type === "RECEIVABLE") return "Recebimento pendente";
  if (entry.type === "PAYABLE") return "Pagamento pendente";
  if (entry.type === "REVENUE") return "Recebido";
  if (entry.type === "EXPENSE") return "Pago";
  return "Indefinido";
}

function getAgendaDirection(entry: FinanceEntry) {
  if (isRevenue(entry)) return "entrada";
  if (isExpense(entry)) return "saida";
  return "outro";
}

function compareAgendaDates(a: FinanceEntry, b: FinanceEntry) {
  const dateA = a.date instanceof Date ? a.date.getTime() : 0;
  const dateB = b.date instanceof Date ? b.date.getTime() : 0;

  if (dateA === dateB) {
    return (a.sourceRow ?? 0) - (b.sourceRow ?? 0);
  }

  return dateA - dateB;
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

    const entries = (await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
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
      const entryYear = getEntryYear(entry);
      return entryYear === null || entryYear === year;
    });

    const receivables = yearEntries.filter((entry) => entry.type === "RECEIVABLE");
    const payables = yearEntries.filter((entry) => entry.type === "PAYABLE");
    const received = yearEntries.filter((entry) => entry.type === "REVENUE");
    const paid = yearEntries.filter((entry) => entry.type === "EXPENSE");

    const receivableTotal = roundMoney(
      receivables.reduce((sum, entry) => sum + revenueAmount(entry), 0)
    );

    const payableTotal = roundMoney(
      payables.reduce((sum, entry) => sum + expenseAmount(entry), 0)
    );

    const receivedTotal = roundMoney(
      received.reduce((sum, entry) => sum + revenueAmount(entry), 0)
    );

    const paidTotal = roundMoney(
      paid.reduce((sum, entry) => sum + expenseAmount(entry), 0)
    );

    const pendingItems = [...receivables, ...payables].sort(compareAgendaDates);

    const agendaItems = pendingItems.map((entry) => ({
      id: entry.id,
      type: entry.type,
      direction: getAgendaDirection(entry),
      kind: getAgendaKind(entry),
      date: entry.date,
      month: getEntryMonth(entry),
      competence: entry.competence,
      name: getDisplayName(entry),
      description: getDescription(entry),
      category: entry.category,
      status: entry.status,
      value: getValue(entry),
      sourceSheet: entry.sourceSheet,
      sourceRow: entry.sourceRow,
    }));

    const recentDoneItems = [...received, ...paid]
      .sort(compareAgendaDates)
      .slice(-10)
      .reverse()
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        direction: getAgendaDirection(entry),
        kind: getAgendaKind(entry),
        date: entry.date,
        month: getEntryMonth(entry),
        competence: entry.competence,
        name: getDisplayName(entry),
        description: getDescription(entry),
        category: entry.category,
        status: entry.status,
        value: getValue(entry),
        sourceSheet: entry.sourceSheet,
        sourceRow: entry.sourceRow,
      }));

    return NextResponse.json({
      status: "ok",
      year,
      summary: {
        pendingItems: agendaItems.length,
        receivablesCount: receivables.length,
        payablesCount: payables.length,
        receivableTotal,
        payableTotal,
        receivedTotal,
        paidTotal,
        projectedBalance: roundMoney(receivableTotal - payableTotal),
      },
      agendaItems,
      recentDoneItems,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar agenda financeira.",
      },
      { status: 500 }
    );
  }
}