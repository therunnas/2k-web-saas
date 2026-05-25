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

type ClientGroup = {
  name: string;
  brands: Set<string>;
  projects: Set<string>;
  revenue: number;
  received: number;
  receivable: number;
  entries: number;
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

function isRevenue(entry: FinanceEntry) {
  return entry.type === "REVENUE" || entry.type === "RECEIVABLE";
}

function revenueAmount(entry: FinanceEntry) {
  return isRevenue(entry) ? Math.max(toNumber(entry.grossAmount), 0) : 0;
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

function brandName(entry: FinanceEntry) {
  return entry.client || entry.groupName || "Sem marca";
}

function projectName(entry: FinanceEntry) {
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
          createdAt: "desc",
        },
      ],
      take: 10000,
    })) as unknown as FinanceEntry[];

    const revenueEntries = entries.filter((entry) => {
      const entryYear = getYear(entry);
      const matchesYear = entryYear === null || entryYear === year;

      return matchesYear && isRevenue(entry) && revenueAmount(entry) > 0;
    });

    const groups = new Map<string, ClientGroup>();

    for (const entry of revenueEntries) {
      const name = groupName(entry);
      const current =
        groups.get(name) ??
        {
          name,
          brands: new Set<string>(),
          projects: new Set<string>(),
          revenue: 0,
          received: 0,
          receivable: 0,
          entries: 0,
          lastDate: null,
          lastProject: null,
          lastStatus: null,
        };

      const value = revenueAmount(entry);

      current.revenue += value;
      current.entries += 1;
      current.brands.add(brandName(entry));
      current.projects.add(projectName(entry));

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
        current.lastProject = projectName(entry);
        current.lastStatus = entry.status || entry.type;
      }

      groups.set(name, current);
    }

    const clients = Array.from(groups.values())
      .map((group) => ({
        name: group.name,
        brandsCount: group.brands.size,
        projectsCount: group.projects.size,
        entriesCount: group.entries,
        revenue: roundMoney(group.revenue),
        received: roundMoney(group.received),
        receivable: roundMoney(group.receivable),
        openPercent:
          group.revenue > 0
            ? roundMoney((group.receivable / group.revenue) * 100)
            : 0,
        lastDate: group.lastDate,
        lastProject: group.lastProject,
        lastStatus: group.lastStatus,
        brands: Array.from(group.brands).slice(0, 6),
        projects: Array.from(group.projects).slice(0, 6),
      }))
      .filter((client) => {
        if (!search) return true;

        const haystack = [
          client.name,
          ...client.brands,
          ...client.projects,
          client.lastProject,
          client.lastStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = roundMoney(
      clients.reduce((sum, client) => sum + client.revenue, 0)
    );

    const receivedTotal = roundMoney(
      clients.reduce((sum, client) => sum + client.received, 0)
    );

    const receivableTotal = roundMoney(
      clients.reduce((sum, client) => sum + client.receivable, 0)
    );

    const totalProjects = clients.reduce(
      (sum, client) => sum + client.projectsCount,
      0
    );

    const topClient = clients[0] ?? null;

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        search,
      },
      summary: {
        totalGroups: clients.length,
        totalRevenue,
        receivedTotal,
        receivableTotal,
        totalProjects,
        topClient,
      },
      clients,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar clientes.",
      },
      { status: 500 }
    );
  }
}