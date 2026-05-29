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
  sourceType: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  dueAt: Date | null;
};

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getEntryDateValue(entry: FinanceEntry) {
  if (entry.dueAt instanceof Date && !Number.isNaN(entry.dueAt.getTime())) {
    return entry.dueAt;
  }

  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date;
  }

  return null;
}

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

function revenueAmount(entry: FinanceEntry) {
  return isRevenue(entry) ? Math.max(toNumber(entry.grossAmount), 0) : 0;
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

function getGroup(entry: FinanceEntry) {
  return entry.groupName || entry.client || "Sem grupo";
}

function getBrand(entry: FinanceEntry) {
  return entry.client || entry.groupName || "Sem marca";
}

function getProject(entry: FinanceEntry) {
  return entry.project || entry.description || "Sem projeto";
}

function getProductionStatus(entry: FinanceEntry) {
  if (entry.type === "REVENUE") return "Recebido";
  if (entry.type === "RECEIVABLE") return "Aguardando pagamento";
  return entry.status || "Indefinido";
}

function getPipelineStage(entry: FinanceEntry) {
  const status = `${entry.status ?? ""} ${entry.type}`.toLowerCase();

  if (entry.type === "REVENUE" || status.includes("pago")) {
    return "Finalizado / recebido";
  }

  if (entry.type === "RECEIVABLE" || status.includes("aguardando")) {
    return "Financeiro pendente";
  }

  if (status.includes("nf")) {
    return "Nota fiscal";
  }

  return "Em acompanhamento";
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
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    const statusFilter = url.searchParams.get("status") ?? "all";
    const now = new Date();

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

    const productionsBase = entries.filter((entry) => {
      const entryYear = getYear(entry);
      const matchesYear = entryYear === null || entryYear === year;

      return matchesYear && isRevenue(entry) && revenueAmount(entry) > 0;
    });

    const productions = productionsBase
      .map((entry) => {
        const value = revenueAmount(entry);
        const group = getGroup(entry);
        const brand = getBrand(entry);
        const project = getProject(entry);
        const productionStatus = getProductionStatus(entry);
        const pipelineStage = getPipelineStage(entry);
        const dateValue = getEntryDateValue(entry);

        const reviewReasons: string[] = [];
        if (!entry.date && !entry.competence) reviewReasons.push("Sem data");
        if (!entry.project) reviewReasons.push("Sem projeto");
        if (!entry.groupName && !entry.client) reviewReasons.push("Sem grupo");

        const isNew =
          entry.createdAt instanceof Date &&
          now.getTime() - entry.createdAt.getTime() <= NEW_WINDOW_MS;

        const isUpcoming =
          entry.type === "RECEIVABLE" ||
          (dateValue ? dateValue.getTime() > now.getTime() : false);

        return {
          id: entry.id,
          group,
          brand,
          project,
          description: entry.description,
          type: entry.type,
          status: productionStatus,
          rawStatus: entry.status,
          pipelineStage,
          value: roundMoney(value),
          received: entry.type === "REVENUE" ? roundMoney(value) : 0,
          receivable: entry.type === "RECEIVABLE" ? roundMoney(value) : 0,
          date: entry.date,
          dueAt: entry.dueAt,
          month: getMonth(entry),
          competence: entry.competence,
          sourceSheet: entry.sourceSheet,
          sourceRow: entry.sourceRow,
          sourceType: entry.sourceType,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          isNew,
          isUpcoming,
          reviewReasons,
          needsReview: reviewReasons.length > 0,
        };
      })
      .filter((item) => {
        if (statusFilter === "received") return item.type === "REVENUE";
        if (statusFilter === "pending") return item.type === "RECEIVABLE";
        return true;
      })
      .filter((item) => {
        if (!search) return true;

        const haystack = [
          item.group,
          item.brand,
          item.project,
          item.description,
          item.status,
          item.pipelineStage,
          item.competence,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    function dateSortValue(item: (typeof productions)[number]) {
      const dv =
        item.dueAt instanceof Date
          ? item.dueAt
          : item.date instanceof Date
            ? item.date
            : null;

      return dv ? dv.getTime() : Infinity;
    }

    function createdSortValue(item: (typeof productions)[number]) {
      return item.createdAt instanceof Date ? item.createdAt.getTime() : 0;
    }

    const upcomingProductions = productions
      .filter((item) => item.isUpcoming)
      .sort((a, b) => {
        const da = dateSortValue(a);
        const db = dateSortValue(b);
        if (da !== db) return da - db;
        return (a.sourceRow ?? 0) - (b.sourceRow ?? 0);
      });

    const recentProductions = [...productions].sort(
      (a, b) => createdSortValue(b) - createdSortValue(a),
    );

    const reviewNeededProductions = productions.filter(
      (item) => item.needsReview,
    );

    const stats = {
      newCount: productions.filter((item) => item.isNew).length,
      manualCount: productions.filter((item) => item.sourceType === "MANUAL")
        .length,
      spreadsheetCount: productions.filter(
        (item) => item.sourceType === "SPREADSHEET",
      ).length,
      upcomingCount: upcomingProductions.length,
      reviewCount: reviewNeededProductions.length,
    };

    const totalRevenue = roundMoney(
      productionsBase.reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const receivedTotal = roundMoney(
      productionsBase
        .filter((entry) => entry.type === "REVENUE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const receivableTotal = roundMoney(
      productionsBase
        .filter((entry) => entry.type === "RECEIVABLE")
        .reduce((sum, entry) => sum + revenueAmount(entry), 0),
    );

    const finishedCount = productionsBase.filter(
      (entry) => entry.type === "REVENUE",
    ).length;

    const pendingCount = productionsBase.filter(
      (entry) => entry.type === "RECEIVABLE",
    ).length;

    const groupsMap = new Map<string, number>();
    const brandsMap = new Map<string, number>();
    const stageMap = new Map<string, number>();

    for (const entry of productionsBase) {
      const group = getGroup(entry);
      const brand = getBrand(entry);
      const stage = getPipelineStage(entry);
      const value = revenueAmount(entry);

      groupsMap.set(group, (groupsMap.get(group) ?? 0) + value);
      brandsMap.set(brand, (brandsMap.get(brand) ?? 0) + value);
      stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);
    }

    const topGroup =
      Array.from(groupsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value: roundMoney(value),
        }))[0] ?? null;

    const topBrand =
      Array.from(brandsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value: roundMoney(value),
        }))[0] ?? null;

    const pipeline = Array.from(stageMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        search,
        status: statusFilter,
      },
      summary: {
        totalProductions: productionsBase.length,
        filteredProductions: productions.length,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        finishedCount,
        pendingCount,
        groupsCount: groupsMap.size,
        brandsCount: brandsMap.size,
        topGroup,
        topBrand,
      },
      pipeline,
      stats,
      productions,
      upcomingProductions,
      recentProductions,
      reviewNeededProductions,
    });
  } catch (error) {
    return apiError("producoes.overview", error, {
      fallback: "Erro desconhecido ao carregar produções.",
    });
  }
}
