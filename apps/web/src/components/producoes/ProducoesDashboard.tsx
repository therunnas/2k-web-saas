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

function getStatusTone(item: ProductionItem) {
  if (item.type === "REVENUE") {
    return "success";
  }

  if (item.type === "RECEIVABLE") {
    return "info";
  }

  return "neutral";
}

function getPipelineTone(stage: string) {
  const normalized = stage.toLowerCase();

  if (normalized.includes("finalizado")) {
    return "success";
  }

  if (normalized.includes("pendente")) {
    return "attention";
  }

  return "info";
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
        tone: "k-kpi-helper-info",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Valor total dos projetos",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Recebidas",
        value: summary ? String(summary.finishedCount) : "—",
        helper: summary ? formatCompactCurrency(summary.receivedTotal) : "Pagas",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Pendentes",
        value: summary ? String(summary.pendingCount) : "—",
        helper: summary
          ? formatCompactCurrency(summary.receivableTotal)
          : "Aguardando pagamento",
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Grupos",
        value: summary ? String(summary.groupsCount) : "—",
        helper: "Grupos com produções",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Top grupo",
        value: summary?.topGroup?.name ?? "—",
        helper: summary?.topGroup
          ? formatCompactCurrency(summary.topGroup.value)
          : "Sem dados",
        tone: "k-kpi-helper-info",
      },
    ];
  }, [data]);

  const productions = data?.productions ?? [];
  const pipeline = data?.pipeline ?? [];
  const nextCapture = useMemo(() => {
    const pendingProductions = productions.filter((item) => {
      const status = `${item.status} ${item.pipelineStage}`.toLowerCase();

      return item.receivable > 0 || status.includes("pendente") || item.type === "RECEIVABLE";
    });

    return [...(pendingProductions.length ? pendingProductions : productions)].sort(
      (a, b) => b.value - a.value,
    )[0] ?? null;
  }, [productions]);
  const nextCaptureLinkedCount = nextCapture
    ? productions.filter((item) => item.group === nextCapture.group).length
    : 0;

  return (
    <div className="k-page space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <p className="k-eyebrow">
            Produções
          </p>

          <h1 className="k-title">
            Produções reais.
          </h1>

          <p className="k-subtitle">
            Jobs, projetos, marcas, grupos, valores e status financeiro
            calculados diretamente das entradas da planilha.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={() => loadProducoes()}
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

      <section className="ops-bento-grid grid gap-5 xl:grid-cols-[1fr_0.42fr]">
        <div className="k-card k-entry-table">
          <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
            <div>
              <h2>
                Pipeline de produções
              </h2>

              <p className="k-section-sub">
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
                  className="k-input h-9 pl-10 pr-4 text-sm font-medium lg:w-80"
                />
              </form>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className="k-filter-chip"
                    aria-pressed={activeFilter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="k-table-card overflow-x-auto">
            <div className="k-table min-w-[1080px]">
              <div data-table-head className="grid grid-cols-[1.3fr_1.25fr_1.8fr_1fr_1fr_1fr] px-5 py-3">
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
                  className="k-table-row k-production-row grid grid-cols-[1.3fr_1.25fr_1.8fr_1fr_1fr_1fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar k-avatar-brand">
                      {getInitials(item.group)}
                    </span>

                    <strong className="block truncate font-semibold text-slate-100">
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

                    <span className="k-badge mt-2" data-tone={getPipelineTone(item.pipelineStage)}>
                      {item.pipelineStage}
                    </span>
                  </div>

                  <div>
                    <span className="k-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span className="k-number font-semibold text-emerald-200">
                    {formatCurrency(item.value)}
                  </span>

                  <span className="k-badge" data-tone={getStatusTone(item)}>
                    {item.status}
                  </span>
                </div>
              ))}

              {!productions.length ? (
                <div className="k-empty">
                  Nenhuma produção encontrada para o filtro atual.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="k-card k-pipeline-status-card">
            <div className="k-section-head">
              <div>
                <h2>
                  Status do pipeline
                </h2>

                <p className="k-section-sub">
                  Distribuição operacional dos projetos.
                </p>
              </div>
            </div>

            <div className="k-pipeline-status-list">
              {pipeline.map((stage) => (
                <div
                  key={stage.name}
                  className="k-pipeline-status-item"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="k-pipeline-status-badge"
                      data-tone={getPipelineTone(stage.name)}
                    >
                      {stage.name}
                    </span>

                    <strong className="k-pipeline-status-value">
                      {stage.count}
                    </strong>
                  </div>

                  <p className="k-pipeline-status-helper">
                    Produções nesta etapa.
                  </p>
                </div>
              ))}

              {!pipeline.length ? (
                <div className="k-empty">
                  Nenhum status de produção encontrado.
                </div>
              ) : null}
            </div>
          </div>

          <div className="k-card k-next-capture-card">
            <div className="k-next-capture-header">
              <div>
                <h2>Próxima captação</h2>
                <p>Job de maior valor pendente</p>
              </div>

              <span className="k-next-capture-rec">
                <span />
                REC
              </span>
            </div>

            {nextCapture ? (
              <div className="k-next-capture-body">
                <div className="k-next-capture-identity">
                  <span className="k-next-capture-avatar">
                    {getInitials(nextCapture.group)}
                  </span>

                  <div className="min-w-0">
                    <strong className="k-next-capture-title">
                      {nextCapture.group}
                    </strong>
                    <span className="k-next-capture-meta">
                      {formatDate(nextCapture.date)} · {nextCapture.brand}
                    </span>
                  </div>
                </div>

                <strong className="k-next-capture-value">
                  {formatCurrency(nextCapture.value)}
                </strong>

                <p className="k-next-capture-helper">
                  {(nextCapture.description || nextCapture.project).trim()} · {nextCaptureLinkedCount} entradas vinculadas ao grupo.
                </p>
              </div>
            ) : (
              <div className="k-empty">
                Nenhuma captação pendente encontrada.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
