"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Clock3,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";

type ProductionItem = {
  id: string;
  group: string;
  brand: string;
  project: string;
  description: string | null;
  type: string;
  status: string;
  rawStatus: string | null;
  pipelineStage: string;
  value: number;
  received: number;
  receivable: number;
  date: string | null;
  month: number | null;
  competence: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type ProducoesOverviewResponse = {
  status: string;
  year: number;
  filters: {
    search: string;
    status: string;
  };
  summary: {
    totalProductions: number;
    filteredProductions: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    finishedCount: number;
    pendingCount: number;
    groupsCount: number;
    brandsCount: number;
    topGroup: {
      name: string;
      value: number;
    } | null;
    topBrand: {
      name: string;
      value: number;
    } | null;
  };
  pipeline: Array<{
    name: string;
    count: number;
  }>;
  productions: ProductionItem[];
  message?: string;
};

const filterOptions = [
  { label: "Todas", value: "all" },
  { label: "Recebidas", value: "received" },
  { label: "Pendentes", value: "pending" },
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

function getStatusClass(item: ProductionItem) {
  if (item.type === "REVENUE") {
    return "bg-emerald-400/10 text-emerald-200";
  }

  if (item.type === "RECEIVABLE") {
    return "bg-cyan-400/10 text-cyan-200";
  }

  return "bg-white/10 text-slate-300";
}

function getPipelineClass(stage: string) {
  const normalized = stage.toLowerCase();

  if (normalized.includes("finalizado")) {
    return "bg-emerald-400/10 text-emerald-200";
  }

  if (normalized.includes("pendente")) {
    return "bg-cyan-400/10 text-cyan-200";
  }

  return "bg-violet-400/10 text-violet-200";
}

export function ProducoesDashboard() {
  const [data, setData] = useState<ProducoesOverviewResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProducoes(params?: { status?: string; search?: string }) {
    const status = params?.status ?? activeFilter;
    const query = params?.search ?? appliedSearch;

    setLoading(true);
    setErrorMessage(null);

    try {
      const searchParams = new URLSearchParams({
        year: "2026",
        status,
      });

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      const response = await fetch(
        `/api/producoes/overview?${searchParams.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json = (await response.json()) as ProducoesOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar produções.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de produções.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducoes({
      status: activeFilter,
      search: appliedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, appliedSearch]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Produções",
        value: summary ? String(summary.totalProductions) : "—",
        helper: "Projetos identificados na planilha",
        icon: Clapperboard,
        tone: "text-cyan-300",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Valor total dos projetos",
        icon: Wallet,
        tone: "text-emerald-300",
      },
      {
        label: "Recebidas",
        value: summary ? String(summary.finishedCount) : "—",
        helper: summary ? formatCompactCurrency(summary.receivedTotal) : "Pagas",
        icon: CheckCircle2,
        tone: "text-emerald-300",
      },
      {
        label: "Pendentes",
        value: summary ? String(summary.pendingCount) : "—",
        helper: summary
          ? formatCompactCurrency(summary.receivableTotal)
          : "Aguardando pagamento",
        icon: Clock3,
        tone: "text-cyan-300",
      },
      {
        label: "Grupos",
        value: summary ? String(summary.groupsCount) : "—",
        helper: "Grupos com produções",
        icon: Users,
        tone: "text-violet-300",
      },
      {
        label: "Top grupo",
        value: summary?.topGroup?.name ?? "—",
        helper: summary?.topGroup
          ? formatCompactCurrency(summary.topGroup.value)
          : "Sem dados",
        icon: ArrowUpRight,
        tone: "text-violet-300",
      },
    ];
  }, [data]);

  const productions = data?.productions ?? [];
  const pipeline = data?.pipeline ?? [];

  return (
    <div className="ops-page-v2 ops-page-productions space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Produções
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Produções reais.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Jobs, projetos, marcas, grupos, valores e status financeiro
            calculados diretamente das entradas da planilha.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadProducoes()}
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

      <section className="ops-bento-grid grid gap-5 xl:grid-cols-[1fr_0.42fr]">
        <div className="ops-card rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Pipeline de produções
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {data
                  ? `${data.summary.filteredProductions} produções encontradas de ${data.summary.totalProductions}.`
                  : "Carregando produções."}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar grupo, marca ou projeto..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-10 pr-4 text-sm font-medium text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 lg:w-80"
                />
              </form>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      activeFilter === option.value
                        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ops-table-wrap overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[1.3fr_1.25fr_1.8fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Grupo</span>
                <span>Marca</span>
                <span>Projeto</span>
                <span>Competência</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {productions.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.3fr_1.25fr_1.8fr_1fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-200">
                      {getInitials(item.group)}
                    </span>

                    <strong className="block truncate font-semibold text-white">
                      {item.group}
                    </strong>
                  </div>

                  <span className="truncate text-sm font-medium text-slate-300">
                    {item.brand}
                  </span>

                  <div className="min-w-0 pr-4">
                    <span className="line-clamp-2 text-sm font-medium text-slate-300">
                      {item.project}
                    </span>

                    <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getPipelineClass(item.pipelineStage)}`}>
                      {item.pipelineStage}
                    </span>
                  </div>

                  <div>
                    <span className="dashboard-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span className="dashboard-number font-semibold text-emerald-200">
                    {formatCurrency(item.value)}
                  </span>

                  <span
                    className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                      item
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}

              {!productions.length ? (
                <div className="px-5 py-8 text-sm font-medium text-slate-500">
                  Nenhuma produção encontrada para o filtro atual.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="ops-card rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Status do pipeline
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Distribuição operacional dos projetos.
            </p>
          </div>

          <div className="space-y-3">
            {pipeline.map((stage) => (
              <div
                key={stage.name}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${getPipelineClass(stage.name)}`}>
                    {stage.name}
                  </span>

                  <strong className="dashboard-number text-lg font-semibold text-white">
                    {stage.count}
                  </strong>
                </div>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  Produções nesta etapa.
                </p>
              </div>
            ))}

            {!pipeline.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-medium text-slate-500">
                Nenhum status de produção encontrado.
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
