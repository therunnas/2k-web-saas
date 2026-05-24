"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";

type FinanceEntry = {
  id: string;
  type: string;
  kind: string;
  direction: "entrada" | "saida" | "outro";
  date: string | null;
  month: number | null;
  competence: string | null;
  name: string;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  value: number;
  revenue: number;
  expense: number;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type FinanceEntriesResponse = {
  status: string;
  year: number;
  filters: {
    type: string;
    search: string;
  };
  summary: {
    entries: number;
    filteredEntries: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    totalExpenses: number;
    paidExpenses: number;
    payableTotal: number;
    totalProfit: number;
    cashResult: number;
  };
  entries: FinanceEntry[];
  message?: string;
};

const filterOptions = [
  { label: "Todos", value: "all" },
  { label: "Entradas", value: "entradas" },
  { label: "Saídas", value: "saidas" },
  { label: "Recebido", value: "recebido" },
  { label: "A receber", value: "a-receber" },
  { label: "Despesas", value: "despesas" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
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

function getStatusClass(entry: FinanceEntry) {
  if (entry.type === "REVENUE") {
    return "bg-emerald-400/10 text-emerald-200";
  }

  if (entry.type === "RECEIVABLE") {
    return "bg-cyan-400/10 text-cyan-200";
  }

  if (entry.type === "EXPENSE") {
    return "bg-rose-400/10 text-rose-200";
  }

  if (entry.type === "PAYABLE") {
    return "bg-violet-400/10 text-violet-200";
  }

  return "bg-white/10 text-slate-300";
}

function getDirectionIcon(entry: FinanceEntry) {
  if (entry.direction === "entrada") {
    return <ArrowUpRight size={16} className="text-emerald-300" />;
  }

  if (entry.direction === "saida") {
    return <ArrowDownLeft size={16} className="text-rose-300" />;
  }

  return <CircleDollarSign size={16} className="text-slate-400" />;
}

export function FinanceiroDashboard() {
  const [data, setData] = useState<FinanceEntriesResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadEntries(params?: { type?: string; search?: string }) {
    const type = params?.type ?? activeFilter;
    const query = params?.search ?? appliedSearch;

    setLoading(true);
    setErrorMessage(null);

    try {
      const searchParams = new URLSearchParams({
        year: "2026",
        type,
      });

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      const response = await fetch(`/api/finance/entries?${searchParams.toString()}`, {
        cache: "no-store",
      });

      const json = (await response.json()) as FinanceEntriesResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar lançamentos.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API financeira.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries({
      type: activeFilter,
      search: appliedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, appliedSearch]);

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Faturado no ano",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Entradas + valores a receber",
        icon: TrendingUp,
        tone: "text-cyan-300",
      },
      {
        label: "Recebido no caixa",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas marcadas como pagas",
        icon: Banknote,
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
        label: "Saídas no ano",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: "Despesas e contas a pagar",
        icon: Wallet,
        tone: "text-rose-300",
      },
      {
        label: "Lucro por competência",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: "Faturado - saídas",
        icon: CircleDollarSign,
        tone: "text-violet-300",
      },
      {
        label: "Resultado de caixa",
        value: summary ? formatCompactCurrency(summary.cashResult) : "—",
        helper: "Recebido - saídas",
        icon: CircleDollarSign,
        tone: "text-emerald-300",
      },
    ];
  }, [data]);

  const entries = data?.entries ?? [];

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Financeiro
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Financeiro real da operação.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Entradas, saídas, valores recebidos, valores a receber e resultado
            calculados diretamente da planilha importada.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadEntries()}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            <Download size={16} />
            Exportar
          </button>
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
                <div>
                  <p className="dashboard-label text-[11px] text-slate-500">
                    {card.label}
                  </p>

                  <strong className="dashboard-number mt-3 block text-[25px] font-semibold text-white">
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

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Lançamentos financeiros
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              {data
                ? `${data.summary.filteredEntries} lançamentos encontrados de ${data.summary.entries} no ano.`
                : "Carregando lançamentos financeiros."}
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
                placeholder="Buscar cliente, grupo, projeto..."
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
          <div className="min-w-[1040px]">
            <div className="grid grid-cols-[1.3fr_1.2fr_1fr_1fr_1fr_1fr_0.8fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Nome</span>
              <span>Projeto / descrição</span>
              <span>Competência</span>
              <span>Categoria</span>
              <span>Valor</span>
              <span>Status</span>
              <span>Linha</span>
            </div>

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1.3fr_1.2fr_1fr_1fr_1fr_1fr_0.8fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      entry.direction === "entrada"
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-rose-400/10 text-rose-200"
                    }`}
                  >
                    {getInitials(entry.name)}
                  </span>

                  <div className="min-w-0">
                    <strong className="block truncate font-semibold text-white">
                      {entry.name}
                    </strong>
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      {getDirectionIcon(entry)}
                      {entry.kind}
                    </span>
                  </div>
                </div>

                <span className="line-clamp-2 pr-4 text-sm font-medium text-slate-400">
                  {entry.project || entry.description || "—"}
                </span>

                <div>
                  <span className="dashboard-number block text-slate-300">
                    {entry.competence ?? "—"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {formatDate(entry.date)}
                  </span>
                </div>

                <span className="text-sm font-medium text-slate-400">
                  {entry.category ?? "—"}
                </span>

                <span
                  className={`dashboard-number font-semibold ${
                    entry.direction === "entrada"
                      ? "text-emerald-200"
                      : "text-rose-200"
                  }`}
                >
                  {formatCurrency(entry.value)}
                </span>

                <span
                  className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                    entry
                  )}`}
                >
                  {entry.status || entry.kind}
                </span>

                <span className="dashboard-number text-xs text-slate-500">
                  {entry.sourceSheet ?? "—"} #{entry.sourceRow ?? "—"}
                </span>
              </div>
            ))}

            {!entries.length ? (
              <div className="px-5 py-8 text-sm font-medium text-slate-500">
                Nenhum lançamento encontrado para o filtro atual.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}