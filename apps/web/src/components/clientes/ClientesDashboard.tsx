"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

type ClientItem = {
  name: string;
  brandsCount: number;
  projectsCount: number;
  entriesCount: number;
  revenue: number;
  received: number;
  receivable: number;
  openPercent: number;
  lastDate: string | null;
  lastProject: string | null;
  lastStatus: string | null;
  brands: string[];
  projects: string[];
};

type ClientsOverviewResponse = {
  status: string;
  year: number;
  filters: {
    search: string;
  };
  summary: {
    totalGroups: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    totalProjects: number;
    topClient: ClientItem | null;
  };
  clients: ClientItem[];
  message?: string;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ClientesDashboard() {
  const [data, setData] = useState<ClientsOverviewResponse | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadClients(query = appliedSearch) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        year: "2026",
      });

      if (query.trim()) {
        params.set("search", query.trim());
      }

      const response = await fetch(`/api/clients/overview?${params.toString()}`, {
        cache: "no-store",
      });

      const json = (await response.json()) as ClientsOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar clientes.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients(appliedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Grupos ativos",
        value: summary ? String(summary.totalGroups) : "—",
        helper: "Grupos com entrada no ano",
        icon: Users,
        tone: "text-cyan-300",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Total por grupos/clientes",
        icon: CircleDollarSign,
        tone: "text-emerald-300",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas pagas",
        icon: TrendingUp,
        tone: "text-emerald-300",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "Entradas pendentes",
        icon: CalendarDays,
        tone: "text-cyan-300",
      },
      {
        label: "Projetos",
        value: summary ? String(summary.totalProjects) : "—",
        helper: "Projetos identificados",
        icon: Building2,
        tone: "text-violet-300",
      },
      {
        label: "Top cliente",
        value: summary?.topClient?.name ?? "—",
        helper: summary?.topClient
          ? formatCompactCurrency(summary.topClient.revenue)
          : "Sem dados",
        icon: ArrowUpRight,
        tone: "text-violet-300",
      },
    ];
  }, [data]);

  const clients = data?.clients ?? [];

  return (
    <div className="ops-page-v2 ops-page-clients space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Clientes
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Clientes e grupos.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Ranking de grupos, marcas, projetos, valores recebidos e pendências
            calculados diretamente das entradas da planilha.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadClients()}
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

      <section className="ops-summary-strip grid gap-0 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="ops-summary-card relative overflow-hidden border border-white/10 bg-[#0b101b] p-5"
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

                <div className="ops-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/[0.04]">
                  <Icon size={22} className={card.tone} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="ops-card rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Ranking de grupos e clientes
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              {data
                ? `${clients.length} grupos/clientes encontrados.`
                : "Carregando clientes."}
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
              placeholder="Buscar grupo, marca ou projeto..."
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-10 pr-4 text-sm font-medium text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 lg:w-96"
            />
          </form>
        </div>

        <div className="ops-table-wrap overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[0.45fr_1.8fr_1fr_1fr_1fr_1fr_1.3fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>#</span>
              <span>Grupo / cliente</span>
              <span>Faturamento</span>
              <span>Recebido</span>
              <span>A receber</span>
              <span>Projetos</span>
              <span>Último movimento</span>
            </div>

            {clients.map((client, index) => (
              <div
                key={client.name}
                className="grid grid-cols-[0.45fr_1.8fr_1fr_1fr_1fr_1fr_1.3fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
              >
                <span className="dashboard-number text-slate-500">
                  {index + 1}
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-200">
                    {getInitials(client.name)}
                  </span>

                  <div className="min-w-0">
                    <strong className="block truncate font-semibold text-white">
                      {client.name}
                    </strong>

                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {client.brands.length
                        ? client.brands.join(", ")
                        : "Sem marcas vinculadas"}
                    </span>
                  </div>
                </div>

                <span className="dashboard-number font-semibold text-slate-200">
                  {formatCurrency(client.revenue)}
                </span>

                <span className="dashboard-number text-emerald-200">
                  {formatCurrency(client.received)}
                </span>

                <div>
                  <span className="dashboard-number block text-cyan-200">
                    {formatCurrency(client.receivable)}
                  </span>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{
                        width: `${clamp(client.openPercent, 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <span className="dashboard-number block text-slate-300">
                    {client.projectsCount}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {client.entriesCount} entradas
                  </span>
                </div>

                <div>
                  <span className="line-clamp-1 text-sm font-medium text-slate-300">
                    {client.lastProject ?? "—"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {formatDate(client.lastDate)}
                  </span>
                </div>
              </div>
            ))}

            {!clients.length ? (
              <div className="px-5 py-8 text-sm font-medium text-slate-500">
                Nenhum cliente encontrado para a busca atual.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

