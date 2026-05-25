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

type GroupBucket = {
  name: string;
  brands: Set<string>;
  projects: Set<string>;
  entries: number;
  revenue: number;
  received: number;
  receivable: number;
  lastDate: Date | null;
  lastProject: string | null;
  lastStatus: string | null;
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

function getGroupName(entry: FinanceEntry) {
  return entry.groupName || entry.client || "Sem grupo";
}

function getBrandName(entry: FinanceEntry) {
  return entry.client || entry.groupName || "Sem marca";
}

function getProjectName(entry: FinanceEntry) {
  return entry.project || entry.description || "Sem projeto";
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

    const revenueEntries = entries.filter((entry) => {
      const entryYear = getYear(entry);
      const matchesYear = entryYear === null || entryYear === year;

      return matchesYear && isRevenue(entry) && revenueAmount(entry) > 0;
    });

    const groupsMap = new Map<string, GroupBucket>();

    for (const entry of revenueEntries) {
      const name = getGroupName(entry);
      const brand = getBrandName(entry);
      const project = getProjectName(entry);
      const value = revenueAmount(entry);

      const current =
        groupsMap.get(name) ??
        {
          name,
          brands: new Set<string>(),
          projects: new Set<string>(),
          entries: 0,
          revenue: 0,
          received: 0,
          receivable: 0,
          lastDate: null,
          lastProject: null,
          lastStatus: null,
        };

      current.entries += 1;
      current.revenue += value;
      current.brands.add(brand);
      current.projects.add(project);

      if (entry.type === "REVENUE") {
        current.received += value;
      }

      if (entry.type === "RECEIVABLE") {
        current.receivable += value;
      }

      if (
        entry.date &&
        (!current.lastDate || entry.date.getTime() > current.lastDate.getTime())
      ) {
        current.lastDate = entry.date;
        current.lastProject = project;
        current.lastStatus = entry.status || entry.type;
      }

      groupsMap.set(name, current);
    }

    const groups = Array.from(groupsMap.values())
      .map((group) => {
        const revenue = roundMoney(group.revenue);
        const received = roundMoney(group.received);
        const receivable = roundMoney(group.receivable);

        return {
          name: group.name,
          revenue,
          received,
          receivable,
          entries: group.entries,
          brandsCount: group.brands.size,
          projectsCount: group.projects.size,
          receivedPercent:
            revenue > 0 ? roundMoney((received / revenue) * 100) : 0,
          openPercent:
            revenue > 0 ? roundMoney((receivable / revenue) * 100) : 0,
          lastDate: group.lastDate,
          lastProject: group.lastProject,
          lastStatus: group.lastStatus,
          brands: Array.from(group.brands).slice(0, 8),
          projects: Array.from(group.projects).slice(0, 8),
        };
      })
      .filter((group) => {
        if (!search) return true;

        const haystack = [
          group.name,
          ...group.brands,
          ...group.projects,
          group.lastProject,
          group.lastStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = roundMoney(
      groups.reduce((sum, group) => sum + group.revenue, 0)
    );

    const receivedTotal = roundMoney(
      groups.reduce((sum, group) => sum + group.received, 0)
    );

    const receivableTotal = roundMoney(
      groups.reduce((sum, group) => sum + group.receivable, 0)
    );

    const totalBrands = groups.reduce((sum, group) => sum + group.brandsCount, 0);
    const totalProjects = groups.reduce(
      (sum, group) => sum + group.projectsCount,
      0
    );

    const topGroup = groups[0] ?? null;

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        search,
      },
      summary: {
        totalGroups: groups.length,
        totalBrands,
        totalProjects,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        topGroup,
      },
      groups,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar grupos.",
      },
      { status: 500 }
    );
  }
}