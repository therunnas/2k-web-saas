"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
  Tags,
  TrendingDown,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

type ExpenseItem = {
  id: string;
  type: string;
  kind: string;
  supplier: string;
  category: string;
  description: string;
  status: string | null;
  value: number;
  date: string | null;
  month: number | null;
  competence: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type RankingItem = {
  rank: number;
  name: string;
  total: number;
  paid: number;
  payable: number;
  count: number;
};

type DespesasOverviewResponse = {
  status: string;
  year: number;
  filters: {
    status: string;
    search: string;
  };
  summary: {
    totalEntries: number;
    filteredEntries: number;
    paidCount: number;
    payableCount: number;
    totalExpenses: number;
    paidTotal: number;
    payableTotal: number;
    categoriesCount: number;
    suppliersCount: number;
    topCategory: RankingItem | null;
    topSupplier: RankingItem | null;
  };
  categories: RankingItem[];
  suppliers: RankingItem[];
  monthly: Array<{
    month: number;
    value: number;
  }>;
  expenses: ExpenseItem[];
  message?: string;
};

const filterOptions = [
  { label: "Todas", value: "all" },
  { label: "Pagas", value: "paid" },
  { label: "A pagar", value: "payable" },
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

function getStatusTone(item: ExpenseItem) {
  if (item.type === "EXPENSE") {
    return "success";
  }

  if (item.type === "PAYABLE") {
    return "attention";
  }

  return "neutral";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DespesasDashboard() {
  const [data, setData] = useState<DespesasOverviewResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDespesas(params?: { status?: string; search?: string }) {
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
        `/api/despesas/overview?${searchParams.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json = (await response.json()) as DespesasOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar despesas.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de despesas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDespesas({
      status: activeFilter,
      search: appliedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, appliedSearch]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }
  async function handleDeleteExpense(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta despesa? Ela sairá dos cálculos do dashboard."
    );

    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/despesas/overview", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = await response.json();

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao excluir despesa.");
        return;
      }

      await loadDespesas({
        status: activeFilter,
        search: appliedSearch,
      });
    } catch {
      setErrorMessage("Erro ao conectar com a API de exclusão.");
    } finally {
      setDeletingId(null);
    }
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Saídas no ano",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: `${summary?.totalEntries ?? 0} lançamentos de saída`,
        tone: "k-kpi-helper-info",
      },
      {
        label: "Despesas pagas",
        value: summary ? formatCompactCurrency(summary.paidTotal) : "—",
        helper: `${summary?.paidCount ?? 0} itens pagos`,
        tone: "k-kpi-helper-positive",
      },
      {
        label: "A pagar",
        value: summary ? formatCompactCurrency(summary.payableTotal) : "—",
        helper: `${summary?.payableCount ?? 0} itens pendentes`,
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Categorias",
        value: summary ? String(summary.categoriesCount) : "—",
        helper: "Classificações de despesas",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Fornecedores",
        value: summary ? String(summary.suppliersCount) : "—",
        helper: "Fornecedores identificados",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Maior categoria",
        value: summary?.topCategory?.name ?? "—",
        helper: summary?.topCategory
          ? formatCompactCurrency(summary.topCategory.total)
          : "Sem dados",
        tone: "k-kpi-helper-info",
      },
    ];
  }, [data]);

  const expenses = data?.expenses ?? [];
  const categories = data?.categories ?? [];
  const suppliers = data?.suppliers ?? [];
  const maxCategoryValue = Math.max(...categories.map((item) => item.total), 1);
  const maxSupplierValue = Math.max(...suppliers.map((item) => item.total), 1);

  return (
    <div className="k-page space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <p className="k-eyebrow">
            Despesas
          </p>

          <h1 className="k-title">
            Despesas reais da operação.
          </h1>

          <p className="k-subtitle">
            Saídas, fornecedores, categorias, custos pagos e pendências
            calculados diretamente da aba SAÍDAS da planilha.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={() => loadDespesas()}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
        <div className="k-card k-entry-table k-expense-table">
          <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
            <div>
              <h2>
                Lançamentos de despesas
              </h2>

              <p className="k-section-sub">
                {data
                  ? `${data.summary.filteredEntries} despesas encontradas de ${data.summary.totalEntries}.`
                  : "Carregando despesas."}
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
                  placeholder="Buscar fornecedor, categoria..."
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
              <div data-table-head className="grid grid-cols-[1.25fr_1.6fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr] px-5 py-3">
                <span>Fornecedor</span>
                <span>Descrição</span>
                <span>Competência</span>
                <span>Categoria</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {expenses.map((item) => (
                <div
                  key={item.id}
                  className="k-table-row grid grid-cols-[1.25fr_1.6fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar k-avatar-brand">
                      {getInitials(item.supplier)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-slate-100">
                        {item.supplier}
                      </strong>

                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <ArrowDownLeft size={14} className="text-violet-300/65" />
                        {item.kind}
                      </span>
                    </div>
                  </div>

                  <span className="line-clamp-2 pr-4 text-sm font-medium text-slate-400">
                    {item.description}
                  </span>

                  <div>
                    <span className="k-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span className="truncate text-sm font-medium text-slate-400">
                    {item.category}
                  </span>

                  <span className="k-number font-semibold text-slate-200">
                    {formatCurrency(item.value)}
                  </span>

                  <span className="k-badge" data-tone={getStatusTone(item)}>
                    {item.status || item.kind}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(item.id)}
                    disabled={deletingId === item.id}
                    className="k-button-danger min-h-7 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    {deletingId === item.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              ))}

              {!expenses.length ? (
                <div className="k-empty">
                  Nenhuma despesa encontrada para o filtro atual.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="k-card k-recent-list">
            <div className="k-section-head">
              <div>
              <h2>
                Top categorias
              </h2>

              <p className="k-section-sub">
                Maiores grupos de custo.
              </p>
              </div>
            </div>

            <div className="space-y-4">
              {categories.slice(0, 6).map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {item.name}
                    </span>

                    <span className="k-number text-sm font-semibold text-slate-200">
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div className="k-bar-track">
                    <div
                      className="k-bar-fill"
                      style={{
                        width: `${clamp((item.total / maxCategoryValue) * 100, 4, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {item.count} lançamentos
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="k-card k-recent-list">
            <div className="k-section-head">
              <div>
              <h2>
                Top fornecedores
              </h2>

              <p className="k-section-sub">
                Maiores fornecedores por saída.
              </p>
              </div>
            </div>

            <div className="space-y-4">
              {suppliers.slice(0, 6).map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {item.name}
                    </span>

                    <span className="k-number text-sm font-semibold text-slate-200">
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div className="k-bar-track">
                    <div
                      className="k-bar-fill"
                      style={{
                        width: `${clamp((item.total / maxSupplierValue) * 100, 4, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {item.count} lançamentos
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

