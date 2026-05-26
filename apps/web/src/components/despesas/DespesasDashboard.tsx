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

function getStatusClass(item: ExpenseItem) {
  if (item.type === "EXPENSE") {
    return "bg-rose-400/10 text-rose-200";
  }

  if (item.type === "PAYABLE") {
    return "bg-violet-400/10 text-violet-200";
  }

  return "bg-white/10 text-slate-300";
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
        icon: TrendingDown,
        tone: "text-rose-300",
      },
      {
        label: "Despesas pagas",
        value: summary ? formatCompactCurrency(summary.paidTotal) : "—",
        helper: `${summary?.paidCount ?? 0} itens pagos`,
        icon: CreditCard,
        tone: "text-rose-300",
      },
      {
        label: "A pagar",
        value: summary ? formatCompactCurrency(summary.payableTotal) : "—",
        helper: `${summary?.payableCount ?? 0} itens pendentes`,
        icon: Wallet,
        tone: "text-violet-300",
      },
      {
        label: "Categorias",
        value: summary ? String(summary.categoriesCount) : "—",
        helper: "Classificações de despesas",
        icon: Tags,
        tone: "text-cyan-300",
      },
      {
        label: "Fornecedores",
        value: summary ? String(summary.suppliersCount) : "—",
        helper: "Fornecedores identificados",
        icon: Users,
        tone: "text-cyan-300",
      },
      {
        label: "Maior categoria",
        value: summary?.topCategory?.name ?? "—",
        helper: summary?.topCategory
          ? formatCompactCurrency(summary.topCategory.total)
          : "Sem dados",
        icon: FileText,
        tone: "text-violet-300",
      },
    ];
  }, [data]);

  const expenses = data?.expenses ?? [];
  const categories = data?.categories ?? [];
  const suppliers = data?.suppliers ?? [];
  const maxCategoryValue = Math.max(...categories.map((item) => item.total), 1);
  const maxSupplierValue = Math.max(...suppliers.map((item) => item.total), 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Despesas
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Despesas reais da operação.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Saídas, fornecedores, categorias, custos pagos e pendências
            calculados diretamente da aba SAÍDAS da planilha.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadDespesas()}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Lançamentos de despesas
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
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

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[1.25fr_1.6fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                  className="grid grid-cols-[1.25fr_1.6fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-400/10 text-xs font-semibold text-rose-200">
                      {getInitials(item.supplier)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-white">
                        {item.supplier}
                      </strong>

                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <ArrowDownLeft size={14} className="text-rose-300" />
                        {item.kind}
                      </span>
                    </div>
                  </div>

                  <span className="line-clamp-2 pr-4 text-sm font-medium text-slate-400">
                    {item.description}
                  </span>

                  <div>
                    <span className="dashboard-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span className="truncate text-sm font-medium text-slate-400">
                    {item.category}
                  </span>

                  <span className="dashboard-number font-semibold text-rose-200">
                    {formatCurrency(item.value)}
                  </span>

                  <span
                    className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                      item
                    )}`}
                  >
                    {item.status || item.kind}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(item.id)}
                    disabled={deletingId === item.id}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    {deletingId === item.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              ))}

              {!expenses.length ? (
                <div className="px-5 py-8 text-sm font-medium text-slate-500">
                  Nenhuma despesa encontrada para o filtro atual.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Top categorias
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Maiores grupos de custo.
              </p>
            </div>

            <div className="space-y-4">
              {categories.slice(0, 6).map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">
                      {item.name}
                    </span>

                    <span className="dashboard-number text-sm font-semibold text-rose-200">
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-rose-300"
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

          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Top fornecedores
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Maiores fornecedores por saída.
              </p>
            </div>

            <div className="space-y-4">
              {suppliers.slice(0, 6).map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">
                      {item.name}
                    </span>

                    <span className="dashboard-number text-sm font-semibold text-violet-200">
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-300"
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
