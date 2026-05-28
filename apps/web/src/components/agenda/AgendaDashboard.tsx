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

function renderKpiValue(value: string) {
  const currencyMatch = value.match(/^R\$\s?(.+)$/);

  if (!currencyMatch) return value;

  return (
    <>
      <span className="k-kpi-prefix">R$</span>
      {currencyMatch[1]}
    </>
  );
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

function getTypeBadgeClass(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("produção")) return "k-badge-production";
  if (normalized.includes("job")) return "k-badge-job";
  if (normalized.includes("entrega")) return "k-badge-delivery";

  return "k-badge-waiting";
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("concluído")) return "success";
  if (normalized.includes("acompanhamento")) return "info";
  if (normalized.includes("planejado")) return "attention";

  return "neutral";
}

function getPriorityBadgeClass(priority: string) {
  if (priority === "Alta") return "k-badge-priority-high";
  if (priority === "Média") return "k-badge-priority-medium";
  return "k-badge-priority-normal";
}

function getPipelineStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("final") || normalized.includes("concl") || normalized.includes("receb")) {
    return "success";
  }

  if (normalized.includes("pend") || normalized.includes("pagar") || normalized.includes("planej")) {
    return "attention";
  }

  if (normalized.includes("atras") || normalized.includes("crít")) {
    return "danger";
  }

  return "info";
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
  const isPipelineStatus = title.toLowerCase().includes("status");

  return (
    <section className={isPipelineStatus ? "k-card k-pipeline-status-card" : "k-card k-recent-list"}>
      <div className="k-section-head">
        <div>
          <h2>{isPipelineStatus ? "Status do pipeline" : title}</h2>
          {isPipelineStatus ? (
            <div className="k-section-sub">Distribuição operacional dos projetos.</div>
          ) : null}
        </div>
      </div>

      <div className={isPipelineStatus ? "k-pipeline-status-list" : "mt-5 space-y-4"}>
        {items.map((item) => (
          isPipelineStatus ? (
            <div key={item.name} className="k-pipeline-status-item">
              <div className="flex items-center justify-between gap-3">
                <span
                  className="k-pipeline-status-badge"
                  data-tone={getPipelineStatusTone(item.name)}
                >
                  {item.name}
                </span>

                <strong className="k-pipeline-status-value">{item.count}</strong>
              </div>

              <p className="k-pipeline-status-helper">Produções nesta etapa.</p>
            </div>
          ) : (
            <div key={item.name}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-100">
                  {item.name}
                </span>

                <span className="k-number text-sm font-semibold text-slate-300">
                  {item.count}
                </span>
              </div>

              <div className="k-bar-track">
                <div
                  className="k-bar-fill"
                  style={{
                    width: `${clamp((item.count / maxValue) * 100, 4, 100)}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-xs font-medium text-slate-600">
                {formatCompactCurrency(item.value)}
              </p>
            </div>
          )
        ))}

        {!items.length ? (
          <div className="k-empty">
            Nenhum dado encontrado.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OperationalStatusCard({ items }: { items: Bucket[] }) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="k-card k-status-operational-card">
      <div className="k-section-head">
        <div>
          <h2>Status operacional</h2>
          <div className="k-section-sub">Distribuição dos eventos do ciclo.</div>
        </div>
      </div>

      <div className="k-status-operational-list">
        {items.map((item) => (
          <div
            key={item.name}
            className="k-status-operational-item"
            data-tone={getPipelineStatusTone(item.name)}
          >
            <div className="k-status-operational-row">
              <span className="k-status-operational-label">{item.name}</span>
              <strong className="k-status-operational-value">{item.count}</strong>
            </div>

            <div className="k-status-operational-track">
              <div
                className="k-status-operational-bar"
                style={{
                  width: `${clamp((item.count / maxValue) * 100, 6, 100)}%`,
                }}
              />
            </div>

            <p className="k-status-operational-helper">
              {formatCompactCurrency(item.value)}
            </p>
          </div>
        ))}

        {!items.length ? (
          <div className="k-empty">Nenhum status operacional encontrado.</div>
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
        tone: "k-kpi-helper-info",
      },
      {
        label: "Produções",
        value: summary ? String(summary.productionCount) : "—",
        helper: "Captações, fotos e vídeos",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Em acompanhamento",
        value: summary ? String(summary.activeCount) : "—",
        helper: "Não concluídos",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Concluídos",
        value: summary ? String(summary.completedCount) : "—",
        helper: "Eventos finalizados",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Alta prioridade",
        value: summary ? String(summary.highPriorityCount) : "—",
        helper: "Jobs de maior valor",
        tone: "k-kpi-helper-danger",
      },
      {
        label: "Valor operacional",
        value: summary ? formatCompactCurrency(summary.totalValue) : "—",
        helper: "Valor associado aos eventos",
        tone: "k-kpi-helper-positive",
      },
    ];
  }, [data]);

  const events = data?.events ?? [];
  const monthly = data?.monthly ?? [];
  const byType = data?.breakdown.byType ?? [];
  const byStatus = data?.breakdown.byStatus ?? [];

  return (
    <div className="k-page space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <p className="k-eyebrow">
            Agenda
          </p>

          <h1 className="k-title">
            Agenda operacional real.
          </h1>

          <p className="k-subtitle">
            Calendário operacional derivado das produções reais: jobs,
            gravações, entregas, aprovações e acompanhamentos da operação
            audiovisual.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={() => loadAgenda()}
            className="k-button-ghost"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <div className="k-button-secondary">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <section className="k-kpi-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className="k-kpi-strip-item">
            <span className="k-kpi-label">{card.label}</span>
            <strong className="k-kpi-value">{renderKpiValue(card.value)}</strong>
            <span className={`k-kpi-helper ${card.tone}`}>{card.helper}</span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="k-card k-entry-table k-agenda-card">
          <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
            <div>
              <h2>
                Eventos e jobs
              </h2>

              <p className="k-section-sub">
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
                className="k-input h-9 pl-10 pr-4 text-sm font-medium lg:w-96"
              />
            </form>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveType(option.value)}
                className="k-filter-chip"
                aria-pressed={activeType === option.value}
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
                className="k-filter-chip"
                aria-pressed={activeStatus === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="k-table-card overflow-x-auto">
            <div className="k-table min-w-[1120px]">
              <div data-table-head className="grid grid-cols-[1fr_1.25fr_1.9fr_1fr_1fr_1fr] px-5 py-3">
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
                  className="k-table-row k-agenda-row grid grid-cols-[1fr_1.25fr_1.9fr_1fr_1fr_1fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                >
                  <div className="k-agenda-type-cell">
                    <span className={`k-agenda-type-badge ${getTypeBadgeClass(event.eventType)}`}>
                      {event.eventType}
                    </span>

                    <span className={`k-agenda-priority-badge ${getPriorityBadgeClass(event.priority)}`}>
                      {event.priority}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar k-avatar-brand">
                      {getInitials(event.group)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-slate-100">
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
                    <span className="k-number block text-slate-300">
                      {event.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(event.date)}
                    </span>
                  </div>

                  <span className="k-number font-semibold text-emerald-200">
                    {formatCurrency(event.value)}
                  </span>

                  <span className="k-badge" data-tone={getStatusTone(event.operationalStatus)}>
                    {event.operationalStatus}
                  </span>
                </div>
              ))}

              {!events.length ? (
                <div className="k-empty">
                  Nenhum evento encontrado para os filtros atuais.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <SmallRanking title="Tipos de evento" items={byType} />
          <OperationalStatusCard items={byStatus} />
        </aside>
      </section>

      <section className="k-card k-agenda-card p-5">
        <div className="k-section-head">
          <div className="k-form-title-row">
            <div className="k-form-icon">
              <Clapperboard size={17} />
            </div>
            <div>
            <h2>
              Distribuição mensal
            </h2>

            <p className="k-section-sub">
              Volume de eventos operacionais derivados das produções por mês.
            </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {monthly.map((month) => (
            <div
              key={month.label}
              className="k-card-soft p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm font-semibold text-slate-100">
                    {month.month}
                  </strong>
                  <span className="text-xs font-medium text-slate-600">
                    {month.label}
                  </span>
                </div>

                <span className="k-number text-lg font-semibold text-cyan-200">
                  {month.count}
                </span>
              </div>

              <p className="k-number mt-3 text-sm font-semibold text-slate-300">
                {formatCompactCurrency(month.value)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

