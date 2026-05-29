"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Plus,
  Search,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function statusTone(value: string | null) {
  if (!value) return "neutral";
  if (value === "PAGO" || value === "RECEBIDO") return "success";
  if (value === "ATRASADO") return "danger";
  if (value === "A_RECEBER" || value === "AGUARDANDO_PAGAMENTO") return "info";
  if (value === "NF_A_ENVIAR" || value === "GERAR_NF" || value === "CONFIRMAR_INFO") {
    return "attention";
  }
  return "neutral";
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
        helper: "com entrada no ano",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "total por grupos/clientes",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "entradas pagas",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "entradas pendentes",
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Projetos",
        value: summary ? String(summary.totalProjects) : "—",
        helper: "identificados",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Top cliente",
        value: summary?.topClient?.name ?? "—",
        helper: summary?.topClient
          ? formatCompactCurrency(summary.topClient.revenue)
          : "Sem dados",
        tone: "k-kpi-helper-info",
      },
    ];
  }, [data]);

  const clients = data?.clients ?? [];

  return (
    <div className="k-page clients-page-v2 space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <h1 className="k-title">
            Clientes e grupos.
          </h1>

          <p className="k-subtitle">
            Ranking real de grupos, marcas, projetos, valores recebidos e pendências consolidadas das entradas.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            aria-disabled="true"
            title="Exportação de clientes ainda não implementada."
            className="k-button-ghost"
          >
            <Download size={16} />
            Exportar
          </button>

          <button
            type="button"
            aria-disabled="true"
            title="Cadastro manual de cliente ainda não disponível."
            className="k-button-primary"
          >
            <Plus size={16} />
            Novo cliente
          </button>
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

      <section className="k-card k-entry-table k-ranking-table">
        <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
          <div>
            <h2>
              Ranking de grupos e clientes
            </h2>

            <p className="k-section-sub">
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
              className="k-input h-9 pl-10 pr-4 text-sm font-medium lg:w-96"
            />
          </form>
        </div>

        <div className="k-table-card overflow-x-auto">
          <div className="k-table min-w-[1080px]">
            <div data-table-head className="grid grid-cols-[0.45fr_1.8fr_1fr_1fr_1fr_1fr_1.3fr] px-5 py-3">
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
                className="k-table-row k-client-row grid grid-cols-[0.45fr_1.8fr_1fr_1fr_1fr_1fr_1.3fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
              >
                <span className="k-number text-slate-500">
                  {index + 1}
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <span className="k-avatar k-avatar-brand">
                    {getInitials(client.name)}
                  </span>

                  <div className="min-w-0">
                    <strong className="block truncate font-semibold text-slate-100">
                      {client.name}
                    </strong>

                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {client.brands.length
                        ? client.brands.join(", ")
                        : "Sem marcas vinculadas"}
                    </span>
                  </div>
                </div>

                <span className="k-number font-semibold text-slate-200">
                  {formatCurrency(client.revenue)}
                </span>

                <span className="k-number text-emerald-200">
                  {formatCurrency(client.received)}
                </span>

                <div>
                  <span className="k-number block text-cyan-200">
                    {formatCurrency(client.receivable)}
                  </span>

                  <div className="k-bar-track mt-2">
                    <div
                      className="k-bar-fill"
                      style={{
                        width: `${clamp(client.openPercent, 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <span className="k-number block text-slate-300">
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
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-600">{formatDate(client.lastDate)}</span>
                    {client.lastStatus ? (
                      <span className="k-badge" data-tone={statusTone(client.lastStatus)}>
                        {client.lastStatus}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {!clients.length ? (
              <div className="k-empty">
                Nenhum cliente encontrado para a busca atual.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

