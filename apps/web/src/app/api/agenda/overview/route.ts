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

type Bucket = {
  name: string;
  count: number;
  value: number;
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function isProduction(entry: FinanceEntry) {
  return entry.type === "REVENUE" || entry.type === "RECEIVABLE";
}

function productionAmount(entry: FinanceEntry) {
  return isProduction(entry) ? Math.max(toNumber(entry.grossAmount), 0) : 0;
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

function getDescription(entry: FinanceEntry) {
  return entry.description || entry.project || entry.category || "Produção sem descrição";
}

function inferEventType(entry: FinanceEntry) {
  const text = normalizeText(
    `${entry.project ?? ""} ${entry.description ?? ""} ${entry.category ?? ""}`
  );

  if (
    text.includes("reuniao") ||
    text.includes("briefing") ||
    text.includes("alinhamento")
  ) {
    return "Reunião";
  }

  if (
    text.includes("entrega") ||
    text.includes("aprovacao") ||
    text.includes("aprovação") ||
    text.includes("final")
  ) {
    return "Entrega";
  }

  if (
    text.includes("foto") ||
    text.includes("film") ||
    text.includes("video") ||
    text.includes("vídeo") ||
    text.includes("drone") ||
    text.includes("gravacao") ||
    text.includes("gravação") ||
    text.includes("evento") ||
    text.includes("conteudo") ||
    text.includes("conteúdo")
  ) {
    return "Produção";
  }

  return "Job";
}

function inferOperationalStatus(entry: FinanceEntry) {
  const status = normalizeText(`${entry.status ?? ""} ${entry.type}`);

  if (entry.type === "REVENUE" || status.includes("pago")) {
    return "Concluído";
  }

  if (entry.type === "RECEIVABLE" || status.includes("aguardando")) {
    return "Em acompanhamento";
  }

  return "Planejado";
}

function inferPriority(entry: FinanceEntry) {
  const value = productionAmount(entry);

  if (value >= 10000) return "Alta";
  if (value >= 4000) return "Média";
  return "Normal";
}

function upsertBucket(map: Map<string, Bucket>, name: string, value: number) {
  const current =
    map.get(name) ??
    {
      name,
      count: 0,
      value: 0,
    };

  current.count += 1;
  current.value += value;

  map.set(name, current);
}

function serializeBuckets(map: Map<string, Bucket>) {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      count: item.count,
      value: roundMoney(item.value),
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
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? "2026");
    const typeFilter = url.searchParams.get("type") ?? "all";
    const statusFilter = url.searchParams.get("status") ?? "all";
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

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

    const productionEntries = entries.filter((entry) => {
      const entryYear = getYear(entry);
      const matchesYear = entryYear === null || entryYear === year;

      return matchesYear && isProduction(entry) && productionAmount(entry) > 0;
    });

    const eventsBase = productionEntries.map((entry) => {
      const value = productionAmount(entry);
      const eventType = inferEventType(entry);
      const operationalStatus = inferOperationalStatus(entry);
      const priority = inferPriority(entry);

      return {
        id: entry.id,
        eventType,
        operationalStatus,
        priority,
        type: entry.type,
        group: getGroup(entry),
        brand: getBrand(entry),
        project: getProject(entry),
        description: getDescription(entry),
        value: roundMoney(value),
        date: entry.date,
        month: getMonth(entry),
        competence: entry.competence,
        financialStatus: entry.status,
        sourceSheet: entry.sourceSheet,
        sourceRow: entry.sourceRow,
      };
    });

    const filteredEvents = eventsBase
      .filter((event) => {
        if (typeFilter === "all") return true;
        return normalizeText(event.eventType) === normalizeText(typeFilter);
      })
      .filter((event) => {
        if (statusFilter === "all") return true;
        return normalizeText(event.operationalStatus) === normalizeText(statusFilter);
      })
      .filter((event) => {
        if (!search) return true;

        const haystack = [
          event.eventType,
          event.operationalStatus,
          event.priority,
          event.group,
          event.brand,
          event.project,
          event.description,
          event.financialStatus,
          event.competence,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    const typeMap = new Map<string, Bucket>();
    const statusMap = new Map<string, Bucket>();
    const priorityMap = new Map<string, Bucket>();
    const monthlyMap = new Map<string, Bucket>();

    for (const event of eventsBase) {
      upsertBucket(typeMap, event.eventType, event.value);
      upsertBucket(statusMap, event.operationalStatus, event.value);
      upsertBucket(priorityMap, event.priority, event.value);

      if (event.month !== null) {
        upsertBucket(monthlyMap, String(event.month), event.value);
      }
    }

    const totalValue = roundMoney(
      eventsBase.reduce((sum, event) => sum + event.value, 0)
    );

    const completedEvents = eventsBase.filter(
      (event) => event.operationalStatus === "Concluído"
    );

    const activeEvents = eventsBase.filter(
      (event) => event.operationalStatus !== "Concluído"
    );

    const highPriorityEvents = eventsBase.filter(
      (event) => event.priority === "Alta"
    );

    const monthly = MONTHS.map((month) => {
      const bucket = monthlyMap.get(String(month.index));

      return {
        month: month.key,
        label: `${month.label}/${year}`,
        count: bucket?.count ?? 0,
        value: roundMoney(bucket?.value ?? 0),
      };
    });

    const nextEvents = filteredEvents
      .filter((event) => event.operationalStatus !== "Concluído")
      .slice(0, 12);

    const recentEvents = [...filteredEvents]
      .filter((event) => event.operationalStatus === "Concluído")
      .reverse()
      .slice(0, 10);

    return NextResponse.json({
      status: "ok",
      year,
      filters: {
        type: typeFilter,
        status: statusFilter,
        search,
      },
      summary: {
        totalEvents: eventsBase.length,
        filteredEvents: filteredEvents.length,
        totalValue,
        completedCount: completedEvents.length,
        activeCount: activeEvents.length,
        highPriorityCount: highPriorityEvents.length,
        productionCount: eventsBase.filter((event) => event.eventType === "Produção").length,
        deliveryCount: eventsBase.filter((event) => event.eventType === "Entrega").length,
        meetingCount: eventsBase.filter((event) => event.eventType === "Reunião").length,
        jobCount: eventsBase.filter((event) => event.eventType === "Job").length,
      },
      monthly,
      breakdown: {
        byType: serializeBuckets(typeMap),
        byStatus: serializeBuckets(statusMap),
        byPriority: serializeBuckets(priorityMap),
      },
      events: filteredEvents,
      nextEvents,
      recentEvents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar agenda operacional.",
      },
      { status: 500 }
    );
  }
}