"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Flag,
  RefreshCw,
  Search,
  Target,
  Video,
} from "lucide-react";

type AgendaEvent = {
  id: string;
  eventType: string;
  operationalStatus: string;
  priority: string;
  type: string;
  group: string;
  brand: string;
  project: string;
  description: string;
  value: number;
  date: string | null;
  month: number | null;
  competence: string | null;
  financialStatus: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type Bucket = {
  rank: number;
  name: string;
  count: number;
  value: number;
};

type MonthlyAgenda = {
  month: string;
  label: string;
  count: number;
  value: number;
};

type AgendaOverviewResponse = {
  status: string;
  year: number;
  filters: {
    type: string;
    status: string;
    search: string;
  };
  summary: {
    totalEvents: number;
    filteredEvents: number;
    totalValue: number;
    completedCount: number;
    activeCount: number;
    highPriorityCount: number;
    productionCount: number;
    deliveryCount: number;
    meetingCount: number;
    jobCount: number;
  };
  monthly: MonthlyAgenda[];
  breakdown: {
    byType: Bucket[];
    byStatus: Bucket[];
    byPriority: Bucket[];
  };
  events: AgendaEvent[];
  nextEvents: AgendaEvent[];
  recentEvents: AgendaEvent[];
  message?: string;
};

const typeOptions = [
  { label: "Todos", value: "all" },
  { label: "Produção", value: "Produção" },
  { label: "Entrega", value: "Entrega" },
  { label: "Reunião", value: "Reunião" },
  { label: "Job", value: "Job" },
];

const statusOptions = [
  { label: "Todos", value: "all" },
  { label: "Concluído", value: "Concluído" },
  { label: "Em acompanhamento", value: "Em acompanhamento" },
  { label: "Planejado", value: "Planejado" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getTypeClass(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("produção")) return "bg-cyan-400/10 text-cyan-200";
  if (normalized.includes("entrega")) return "bg-violet-400/10 text-violet-200";
  if (normalized.includes("reunião")) return "bg-emerald-400/10 text-emerald-200";

  return "bg-white/10 text-slate-300";
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("concluído")) return "bg-emerald-400/10 text-emerald-200";
  if (normalized.includes("acompanhamento")) return "bg-cyan-400/10 text-cyan-200";
  if (normalized.includes("planejado")) return "bg-violet-400/10 text-violet-200";

  return "bg-white/10 text-slate-300";
}

function getPriorityClass(priority: string) {
  if (priority === "Alta") return "bg-rose-400/10 text-rose-200";
  if (priority === "Média") return "bg-cyan-400/10 text-cyan-200";
  return "bg-white/10 text-slate-300";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function SmallRanking({
  title,
  items,
}: {
  title: string;
  items: Bucket[];
}) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
      <h2 className="text-xl font-semibold tracking-[-0.035em]">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-white">
                {item.name}
              </span>

              <span className="dashboard-number text-sm font-semibold text-slate-300">
                {item.count}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{
                  width: `${clamp((item.count / maxValue) * 100, 4, 100)}%`,
                }}
              />
            </div>

            <p className="mt-1 text-xs font-medium text-slate-600">
              {formatCompactCurrency(item.value)}
            </p>
          </div>
        ))}

        {!items.length ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-medium text-slate-500">
            Nenhum dado encontrado.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AgendaDashboard() {
  const [data, setData] = useState<AgendaOverviewResponse | null>(null);
  const [activeType, setActiveType] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAgenda(params?: {
    type?: string;
    status?: string;
    search?: string;
  }) {
    const type = params?.type ?? activeType;
    const status = params?.status ?? activeStatus;
    const query = params?.search ?? appliedSearch;

    setLoading(true);
    setErrorMessage(null);

    try {
      const searchParams = new URLSearchParams({
        year: "2026",
        type,
        status,
      });

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      const response = await fetch(
        `/api/agenda/overview?${searchParams.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json = (await response.json()) as AgendaOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar agenda operacional.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda({
      type: activeType,
      status: activeStatus,
      search: appliedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, activeStatus, appliedSearch]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Eventos operacionais",
        value: summary ? String(summary.totalEvents) : "—",
        helper: "Jobs derivados das produções",
        icon: CalendarDays,
        tone: "text-cyan-300",
      },
      {
        label: "Produções",
        value: summary ? String(summary.productionCount) : "—",
        helper: "Captações, fotos e vídeos",
        icon: Video,
        tone: "text-cyan-300",
      },
      {
        label: "Em acompanhamento",
        value: summary ? String(summary.activeCount) : "—",
        helper: "Não concluídos",
        icon: Clock3,
        tone: "text-violet-300",
      },
      {
        label: "Concluídos",
        value: summary ? String(summary.completedCount) : "—",
        helper: "Eventos finalizados",
        icon: CheckCircle2,
        tone: "text-emerald-300",
      },
      {
        label: "Alta prioridade",
        value: summary ? String(summary.highPriorityCount) : "—",
        helper: "Jobs de maior valor",
        icon: Flag,
        tone: "text-rose-300",
      },
      {
        label: "Valor operacional",
        value: summary ? formatCompactCurrency(summary.totalValue) : "—",
        helper: "Valor associado aos eventos",
        icon: Target,
        tone: "text-emerald-300",
      },
    ];
  }, [data]);

  const events = data?.events ?? [];
  const monthly = data?.monthly ?? [];
  const byType = data?.breakdown.byType ?? [];
  const byStatus = data?.breakdown.byStatus ?? [];

  return (
    <div className="ops-page-v2 ops-page-agenda space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Agenda
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Agenda operacional real.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Calendário operacional derivado das produções reais: jobs,
            gravações, entregas, aprovações e acompanhamentos da operação
            audiovisual.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadAgenda()}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="dashboard-label text-[11px] text-slate-500">
                    {card.label}
                  </p>

                  <strong className="dashboard-number mt-3 block truncate text-[25px] font-semibold text-white">
                    {card.value}
                  </strong>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {card.helper}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                  <Icon size={22} className={card.tone} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Eventos e jobs
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {data
                  ? `${data.summary.filteredEvents} eventos encontrados de ${data.summary.totalEvents}.`
                  : "Carregando agenda."}
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar grupo, marca, projeto..."
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-10 pr-4 text-sm font-medium text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 lg:w-96"
              />
            </form>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveType(option.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  activeType === option.value
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}

            <span className="mx-1 h-8 w-px bg-white/10" />

            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveStatus(option.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  activeStatus === option.value
                    ? "border-violet-300/30 bg-violet-300/10 text-violet-100"
                    : "border-white/10 bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[1fr_1.25fr_1.9fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Tipo</span>
                <span>Grupo / marca</span>
                <span>Projeto</span>
                <span>Data</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {events.map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[1fr_1.25fr_1.9fr_1fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${getTypeClass(
                        event.eventType
                      )}`}
                    >
                      {event.eventType}
                    </span>

                    <span
                      className={`mt-2 inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${getPriorityClass(
                        event.priority
                      )}`}
                    >
                      {event.priority}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-200">
                      {getInitials(event.group)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-white">
                        {event.group}
                      </strong>

                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {event.brand}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 pr-4">
                    <span className="line-clamp-2 text-sm font-medium text-slate-300">
                      {event.project}
                    </span>

                    <span className="mt-1 block truncate text-xs text-slate-600">
                      {event.description}
                    </span>
                  </div>

                  <div>
                    <span className="dashboard-number block text-slate-300">
                      {event.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(event.date)}
                    </span>
                  </div>

                  <span className="dashboard-number font-semibold text-emerald-200">
                    {formatCurrency(event.value)}
                  </span>

                  <span
                    className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                      event.operationalStatus
                    )}`}
                  >
                    {event.operationalStatus}
                  </span>
                </div>
              ))}

              {!events.length ? (
                <div className="px-5 py-8 text-sm font-medium text-slate-500">
                  Nenhum evento encontrado para os filtros atuais.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="ops-page-v2 ops-page-agenda space-y-6">
          <SmallRanking title="Tipos de evento" items={byType} />
          <SmallRanking title="Status operacional" items={byStatus} />
        </aside>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Clapperboard size={21} className="text-cyan-300" />
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Distribuição mensal
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Volume de eventos operacionais derivados das produções por mês.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {monthly.map((month) => (
            <div
              key={month.label}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm font-semibold text-white">
                    {month.month}
                  </strong>
                  <span className="text-xs font-medium text-slate-600">
                    {month.label}
                  </span>
                </div>

                <span className="dashboard-number text-lg font-semibold text-cyan-200">
                  {month.count}
                </span>
              </div>

              <p className="dashboard-number mt-3 text-sm font-semibold text-slate-300">
                {formatCompactCurrency(month.value)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

