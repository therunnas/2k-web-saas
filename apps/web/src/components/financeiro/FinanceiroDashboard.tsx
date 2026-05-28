"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
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

type EditForm = {
  id: string;
  type: string;
  date: string;
  competence: string;
  client: string;
  groupName: string;
  project: string;
  description: string;
  category: string;
  status: string;
  value: string;
};

type SummaryTone = "cyan" | "emerald" | "amber" | "rose" | "violet";

type SummaryCard = {
  label: string;
  value: string;
  helper: string;
  delta: string;
  tone: SummaryTone;
  icon: typeof TrendingUp;
};

const filterOptions = [
  { label: "Todos", value: "all" },
  { label: "Entradas", value: "entradas" },
  { label: "Saídas", value: "saidas" },
  { label: "Recebido", value: "recebido" },
  { label: "A receber", value: "a-receber" },
  { label: "Despesas", value: "despesas" },
];

const typeOptions = [
  { label: "Recebido", value: "REVENUE" },
  { label: "A receber", value: "RECEIVABLE" },
  { label: "Despesa paga", value: "EXPENSE" },
  { label: "A pagar", value: "PAYABLE" },
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
  })
    .format(value || 0)
    .replace(",00", "");
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)}%`;
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

function toDateInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
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

function getStatusInfo(entry: FinanceEntry) {
  if (entry.type === "REVENUE") {
    return {
      label: "Recebido",
      tone: "success",
    };
  }

  if (entry.type === "RECEIVABLE") {
    return {
      label: "A receber",
      tone: "info",
    };
  }

  if (entry.type === "EXPENSE") {
    return {
      label: "Pago",
      tone: "success",
    };
  }

  if (entry.type === "PAYABLE") {
    return {
      label: "A pagar",
      tone: "attention",
    };
  }

  return {
    label: entry.status || entry.kind || "Sem status",
    tone: "neutral",
  };
}

function getDirectionIcon(entry: FinanceEntry) {
  if (entry.direction === "entrada") {
    return <ArrowUpRight size={14} className="text-emerald-300" />;
  }

  if (entry.direction === "saida") {
    return <ArrowDownLeft size={14} className="text-rose-300" />;
  }

  return <CircleDollarSign size={14} className="text-slate-500" />;
}

function getEntryKindLabel(entry: FinanceEntry) {
  if (entry.direction === "entrada") return "Entrada";
  if (entry.direction === "saida") return "Saída";
  return "Outro";
}

function getEntryName(entry: FinanceEntry) {
  return entry.client || entry.groupName || entry.name || "Sem nome";
}

function getEntryDescription(entry: FinanceEntry) {
  return entry.project || entry.description || "Sem descrição";
}

function toneClasses(tone: SummaryTone) {
  const map: Record<
    SummaryTone,
    {
      text: string;
      bg: string;
      badge: string;
      line: string;
    }
  > = {
    cyan: {
      text: "text-cyan-200",
      bg: "bg-cyan-300/10",
      badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
      line: "from-cyan-300/75 via-emerald-300/50 to-transparent",
    },
    emerald: {
      text: "text-emerald-200",
      bg: "bg-emerald-300/10",
      badge: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
      line: "from-emerald-300/75 via-cyan-300/45 to-transparent",
    },
    amber: {
      text: "text-amber-200",
      bg: "bg-amber-300/10",
      badge: "border-amber-300/20 bg-amber-300/10 text-amber-200",
      line: "from-amber-300/75 via-orange-300/45 to-transparent",
    },
    rose: {
      text: "text-rose-200",
      bg: "bg-rose-300/10",
      badge: "border-rose-300/20 bg-rose-300/10 text-rose-200",
      line: "from-rose-300/70 via-violet-300/40 to-transparent",
    },
    violet: {
      text: "text-violet-200",
      bg: "bg-violet-300/10",
      badge: "border-violet-300/20 bg-violet-300/10 text-violet-200",
      line: "from-violet-300/75 via-cyan-300/40 to-transparent",
    },
  };

  return map[tone];
}

function SummaryMiniCard({ card }: { card: SummaryCard }) {
  const Icon = card.icon;
  const tone = toneClasses(card.tone);

  return (
    <article className="k-kpi-card group min-h-[104px] p-4">
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r ${tone.line}`} />

      <div
        className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[10px] border border-current/20 ${tone.bg} ${tone.text}`}
      >
        <Icon size={15} />
      </div>

      <p className="dashboard-label pr-12 text-[9px] text-slate-500">
        {card.label}
      </p>

      <strong className="k-number mt-3 block truncate text-[23px] leading-none text-white">
        {card.value}
      </strong>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-[11px] font-medium text-slate-500">
          {card.helper}
        </p>

        <span
          className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[10px] font-bold ${tone.badge}`}
        >
          {card.delta}
        </span>
      </div>
    </article>
  );
}

export function FinanceiroDashboard() {
  const [data, setData] = useState<FinanceEntriesResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

      const response = await fetch(
        `/api/finance/entries?${searchParams.toString()}`,
        {
          cache: "no-store",
        },
      );

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
    const receivedPercent =
      summary && summary.totalRevenue > 0
        ? (summary.receivedTotal / summary.totalRevenue) * 100
        : 0;
    const receivablePercent =
      summary && summary.totalRevenue > 0
        ? (summary.receivableTotal / summary.totalRevenue) * 100
        : 0;
    const margin =
      summary && summary.totalRevenue > 0
        ? (summary.totalProfit / summary.totalRevenue) * 100
        : 0;

    return [
      {
        label: "Faturado",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Receitas do ano",
        delta: summary ? `${summary.entries} itens` : "—",
        icon: TrendingUp,
        tone: "cyan",
      },
      {
        label: "Recebido em caixa",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas pagas",
        delta: formatPercent(receivedPercent),
        icon: Banknote,
        tone: "emerald",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "Pendências abertas",
        delta: formatPercent(receivablePercent),
        icon: CalendarDays,
        tone: receivablePercent > 20 ? "amber" : "cyan",
      },
      {
        label: "Saídas pagas",
        value: summary ? formatCompactCurrency(summary.paidExpenses) : "—",
        helper: "Despesas quitadas",
        delta: summary ? `${formatCompactCurrency(summary.totalExpenses)}` : "—",
        icon: Wallet,
        tone: "violet",
      },
      {
        label: "Lucro por competência",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: "Faturado menos saídas",
        delta: formatPercent(margin),
        icon: CircleDollarSign,
        tone: margin < 0 ? "rose" : "violet",
      },
      {
        label: "Caixa real",
        value: summary ? formatCompactCurrency(summary.cashResult) : "—",
        helper: "Recebido menos saídas pagas",
        delta: summary && summary.cashResult < 0 ? "Atenção" : "Em ritmo",
        icon: CircleDollarSign,
        tone: summary && summary.cashResult < 0 ? "rose" : "emerald",
      },
    ] satisfies SummaryCard[];
  }, [data]);

  const entries = data?.entries ?? [];

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  function startEdit(entry: FinanceEntry) {
    setEditingEntry(entry);
    setEditForm({
      id: entry.id,
      type: entry.type,
      date: toDateInputValue(entry.date),
      competence: entry.competence ?? "",
      client: entry.client ?? entry.name ?? "",
      groupName: entry.groupName ?? "",
      project: entry.project ?? "",
      description: entry.description ?? "",
      category: entry.category ?? "",
      status: entry.status ?? "",
      value: String(entry.value ?? 0),
    });
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function closeEdit() {
    setEditingEntry(null);
    setEditForm(null);
    setSavingEdit(false);
  }

  function updateEditField(field: keyof EditForm, value: string) {
    setEditForm((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm) return;

    setSavingEdit(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/finance/entries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const json = await response.json();

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao editar lançamento.");
        return;
      }

      setSuccessMessage("Lançamento editado com sucesso.");
      closeEdit();

      await loadEntries({
        type: activeFilter,
        search: appliedSearch,
      });
    } catch {
      setErrorMessage("Erro ao conectar com a API de edição.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteFinanceEntry(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este lançamento? Ele sairá de todos os dashboards e cálculos.",
    );

    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/finance/entries", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = await response.json();

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao excluir lançamento.");
        return;
      }

      setSuccessMessage("Lançamento excluído com sucesso.");

      await loadEntries({
        type: activeFilter,
        search: appliedSearch,
      });
    } catch {
      setErrorMessage("Erro ao conectar com a API de exclusão.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="k-page financeiro-v2 flex flex-col gap-6">
      <header className="k-page-header xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[10px] text-cyan-300">
            Financeiro
          </p>

          <h1 className="mt-3 text-[38px] font-semibold leading-none tracking-[-0.07em] text-white sm:text-[44px]">
            Financeiro.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Lançamentos, recebimentos, despesas e resultado consolidados dos
            dados ativos da operação.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadEntries()}
            className="k-button-ghost"
          >
            <RefreshCw size={15} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            type="button"
            className="k-button-ghost"
          >
            <Download size={15} />
            Exportar
          </button>

          <Link
            href="/entradas"
            className="k-button-primary"
          >
            <Plus size={15} />
            Nova entrada
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-card border-rose-400/20 bg-rose-400/10 p-4 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="k-card border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-medium text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <SummaryMiniCard key={card.label} card={card} />
        ))}
      </section>

      <section className="k-card p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="k-section-title">
              Lançamentos financeiros
            </h2>

            <p className="k-muted mt-2 text-sm">
              {data
                ? `${data.summary.filteredEntries} de ${data.summary.entries} lançamentos no ano.`
                : "Carregando lançamentos financeiros."}
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente, grupo, projeto..."
                className="k-input h-10 pl-9 pr-4 text-sm font-medium xl:w-80"
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
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[1.1fr_1.2fr_0.85fr_0.95fr_0.8fr_0.75fr_0.55fr_0.9fr] border-b border-white/[0.075] bg-white/[0.025] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Nome</span>
              <span>Projeto / descrição</span>
              <span>Competência</span>
              <span>Categoria</span>
              <span className="text-right">Valor</span>
              <span>Status</span>
              <span>Linha</span>
              <span className="text-right">Ações</span>
            </div>

            {entries.map((entry) => {
              const status = getStatusInfo(entry);
              const name = getEntryName(entry);
              const description = getEntryDescription(entry);

              return (
                <div
                  key={entry.id}
                  className="grid min-h-[62px] grid-cols-[1.1fr_1.2fr_0.85fr_0.95fr_0.8fr_0.75fr_0.55fr_0.9fr] items-center border-b border-white/[0.045] px-5 py-3 text-sm last:border-b-0 hover:bg-white/[0.018]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar h-8 w-8 rounded-full text-xs">
                      {getInitials(name)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-white">
                        {name}
                      </strong>

                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        {getDirectionIcon(entry)}
                        {getEntryKindLabel(entry)}
                      </span>
                    </div>
                  </div>

                  <span className="line-clamp-2 pr-4 text-[13px] font-medium leading-5 text-slate-400">
                    {description}
                  </span>

                  <div>
                    <span className="k-number block text-xs text-slate-300">
                      {entry.competence ?? "—"}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-600">
                      {formatDate(entry.date)}
                    </span>
                  </div>

                  <span className="truncate pr-3 text-[13px] font-medium text-slate-400">
                    {entry.category ?? "—"}
                  </span>

                  <span
                    className={`k-number text-right text-sm font-semibold ${
                      entry.value < 0
                        ? "text-rose-200"
                        : entry.direction === "entrada"
                          ? "text-emerald-200"
                          : "text-slate-200"
                    }`}
                  >
                    {formatCurrency(entry.value)}
                  </span>

                  <span className="k-badge" data-tone={status.tone}>
                    {status.label}
                  </span>

                  <span className="k-number text-xs text-slate-500">
                    {entry.sourceSheet ?? "—"} #{entry.sourceRow ?? "—"}
                  </span>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="k-button-ghost h-8 min-h-8 w-8 rounded-[9px] p-0"
                      aria-label="Editar lançamento"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFinanceEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-rose-400/20 bg-rose-400/10 text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Excluir lançamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {!entries.length ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-semibold text-white">
                  Nenhum lançamento encontrado
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Ajuste os filtros ou o termo de busca.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {editingEntry && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <section className="k-card max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-label text-[10px] text-cyan-300">
                  Editar lançamento
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">
                  {editingEntry.name}
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Alterações feitas aqui recalculam financeiro, dashboard,
                  relatórios, metas e demais módulos.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-[10px] border border-white/10 bg-white/[0.035] p-2 text-slate-300 transition hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Tipo
                </span>
                <select
                  value={editForm.type}
                  onChange={(event) => updateEditField("type", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Valor
                </span>
                <input
                  value={editForm.value}
                  onChange={(event) => updateEditField("value", event.target.value)}
                  placeholder="Ex.: 5000 ou 5.000,00"
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Cliente / fornecedor
                </span>
                <input
                  value={editForm.client}
                  onChange={(event) => updateEditField("client", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Grupo
                </span>
                <input
                  value={editForm.groupName}
                  onChange={(event) => updateEditField("groupName", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Projeto
                </span>
                <input
                  value={editForm.project}
                  onChange={(event) => updateEditField("project", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Categoria
                </span>
                <input
                  value={editForm.category}
                  onChange={(event) => updateEditField("category", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Competência
                </span>
                <input
                  value={editForm.competence}
                  onChange={(event) => updateEditField("competence", event.target.value)}
                  placeholder="Ex.: 05/2026"
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Data
                </span>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(event) => updateEditField("date", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Status
                </span>
                <input
                  value={editForm.status}
                  onChange={(event) => updateEditField("status", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="dashboard-label text-[10px] text-slate-500">
                  Descrição
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    updateEditField("description", event.target.value)
                  }
                  rows={3}
                  className="k-input mt-2 w-full resize-none px-4 py-3 text-sm font-medium"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 xl:col-span-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="k-button-ghost px-5"
                >
                  <X size={15} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="k-button-primary px-5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} />
                  {savingEdit ? "Salvando..." : "Salvar edição"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
