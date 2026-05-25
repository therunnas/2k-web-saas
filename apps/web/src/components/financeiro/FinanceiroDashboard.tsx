"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Download,
  Pencil,
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

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
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
      "Tem certeza que deseja excluir este lançamento? Ele sairá de todos os dashboards e cálculos."
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
            calculados diretamente dos lançamentos ativos.
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

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-medium text-emerald-100">
          {successMessage}
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
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[1.15fr_1.15fr_0.85fr_0.9fr_0.8fr_0.8fr_0.7fr_0.9fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Nome</span>
              <span>Projeto / descrição</span>
              <span>Competência</span>
              <span>Categoria</span>
              <span>Valor</span>
              <span>Status</span>
              <span>Linha</span>
              <span>Ações</span>
            </div>

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1.15fr_1.15fr_0.85fr_0.9fr_0.8fr_0.8fr_0.7fr_0.9fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFinanceEntry(entry.id)}
                    disabled={deletingId === entry.id}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    {deletingId === entry.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
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

      {editingEntry && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <section className="w-full max-w-4xl rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-label text-[11px] text-cyan-300">
                  Editar lançamento
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">
                  {editingEntry.name}
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Alterações feitas aqui recalculam financeiro, dashboard, relatórios, metas e demais módulos.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 text-slate-300 transition hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Tipo
                </span>
                <select
                  value={editForm.type}
                  onChange={(event) => updateEditField("type", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Valor
                </span>
                <input
                  value={editForm.value}
                  onChange={(event) => updateEditField("value", event.target.value)}
                  placeholder="Ex: 5000 ou 5.000,00"
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Cliente / fornecedor
                </span>
                <input
                  value={editForm.client}
                  onChange={(event) => updateEditField("client", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Grupo
                </span>
                <input
                  value={editForm.groupName}
                  onChange={(event) => updateEditField("groupName", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Projeto
                </span>
                <input
                  value={editForm.project}
                  onChange={(event) => updateEditField("project", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Categoria
                </span>
                <input
                  value={editForm.category}
                  onChange={(event) => updateEditField("category", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Competência
                </span>
                <input
                  value={editForm.competence}
                  onChange={(event) => updateEditField("competence", event.target.value)}
                  placeholder="Ex: 05/2026"
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Data
                </span>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(event) => updateEditField("date", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Status
                </span>
                <input
                  value={editForm.status}
                  onChange={(event) => updateEditField("status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="dashboard-label text-[11px] text-slate-500">
                  Descrição
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(event) => updateEditField("description", event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 xl:col-span-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <X size={16} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
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