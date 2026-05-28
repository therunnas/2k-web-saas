"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
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
    return <ArrowUpRight size={14} className="text-cyan-300/75" />;
  }

  if (entry.direction === "saida") {
    return <ArrowDownLeft size={14} className="text-violet-300/65" />;
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

function summaryHelperTone(card: SummaryCard) {
  if (card.label === "A receber") return "k-kpi-helper-warning";
  if (card.tone === "rose") return "k-kpi-helper-danger";
  if (card.tone === "amber") return "k-kpi-helper-warning";
  if (card.tone === "emerald") return "k-kpi-helper-positive";
  if (card.label.includes("Lucro") && !card.delta.includes("-")) {
    return "k-kpi-helper-positive";
  }
  if (card.label.includes("Caixa") && card.delta !== "Atenção") {
    return "k-kpi-helper-positive";
  }

  return "k-kpi-helper-info";
}

function SummaryMiniCard({ card }: { card: SummaryCard }) {
  return (
    <article className="k-kpi-strip-item">
      <span className="k-kpi-label">{card.label}</span>
      <strong className="k-kpi-value">{renderKpiValue(card.value)}</strong>
      <span className={`k-kpi-helper ${summaryHelperTone(card)}`}>
        {card.delta}
      </span>
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
        delta: summary ? `${summary.entries} entradas` : "—",
        tone: "cyan",
      },
      {
        label: "Recebido em caixa",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas pagas",
        delta: formatPercent(receivedPercent),
        tone: "emerald",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "Pendências abertas",
        delta: formatPercent(receivablePercent),
        tone: receivablePercent > 20 ? "amber" : "cyan",
      },
      {
        label: "Saídas pagas",
        value: summary ? formatCompactCurrency(summary.paidExpenses) : "—",
        helper: "Despesas quitadas",
        delta: summary ? `${formatCompactCurrency(summary.totalExpenses)}` : "—",
        tone: "violet",
      },
      {
        label: "Lucro por competência",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: "Faturado menos saídas",
        delta: formatPercent(margin),
        tone: margin < 0 ? "rose" : "violet",
      },
      {
        label: "Caixa real",
        value: summary ? formatCompactCurrency(summary.cashResult) : "—",
        helper: "Recebido menos saídas pagas",
        delta: summary && summary.cashResult < 0 ? "Atenção" : "Em ritmo",
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
      <header className="k-page-header k-finance-header">
        <div>
          <p className="k-eyebrow">
            Financeiro
          </p>

          <h1 className="k-title">
            Financeiro.
          </h1>

          <p className="k-subtitle">
            Lançamentos, recebimentos, despesas e resultado consolidados dos
            dados ativos da operação.
          </p>
        </div>

        <div className="k-finance-actions">
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
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="k-toast" data-tone="success">
          {successMessage}
        </div>
      ) : null}

      <section className="k-kpi-strip k-finance-kpi-strip">
        {summaryCards.map((card) => (
          <SummaryMiniCard key={card.label} card={card} />
        ))}
      </section>

      <section className="k-card k-finance-table">
        <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
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
                className="k-input h-9 pl-9 pr-4 text-sm font-medium xl:w-80"
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
          <div className="k-table min-w-[1180px]">
            <div
              data-table-head
              className="grid grid-cols-[1.1fr_1.2fr_0.85fr_0.95fr_0.8fr_0.75fr_0.55fr_0.9fr] px-5 py-3"
            >
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
                  className="k-table-row grid grid-cols-[1.1fr_1.2fr_0.85fr_0.95fr_0.8fr_0.75fr_0.55fr_0.9fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar">
                      {getInitials(name)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-slate-100">
                        {name}
                      </strong>

                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        {getDirectionIcon(entry)}
                        {getEntryKindLabel(entry)}
                      </span>
                    </div>
                  </div>

                  <span className="line-clamp-2 pr-4 text-[12.5px] font-medium leading-5 text-slate-400">
                    {description}
                  </span>

                  <div>
                    <span className="k-number block text-xs text-slate-300">
                      {entry.competence ?? "—"}
                    </span>
                      <span className="mt-0.5 block text-[10.5px] text-slate-600">
                      {formatDate(entry.date)}
                    </span>
                  </div>

                  <span className="truncate pr-3 text-[12.5px] font-medium text-slate-400">
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
                    className="k-button-ghost p-0"
                    data-icon-only="true"
                    aria-label="Editar lançamento"
                  >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFinanceEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      className="k-icon-button k-danger-subtle disabled:cursor-not-allowed disabled:opacity-60"
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
          <section className="k-modal max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="k-form-label text-cyan-300">
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
                className="k-icon-button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="k-form-label">
                  Tipo
                </span>
                <select
                  value={editForm.type}
                  onChange={(event) => updateEditField("type", event.target.value)}
                  className="k-select mt-2 h-11 px-4 text-sm font-medium"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="k-form-label">
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
                <span className="k-form-label">
                  Cliente / fornecedor
                </span>
                <input
                  value={editForm.client}
                  onChange={(event) => updateEditField("client", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="k-form-label">
                  Grupo
                </span>
                <input
                  value={editForm.groupName}
                  onChange={(event) => updateEditField("groupName", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="k-form-label">
                  Projeto
                </span>
                <input
                  value={editForm.project}
                  onChange={(event) => updateEditField("project", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="k-form-label">
                  Categoria
                </span>
                <input
                  value={editForm.category}
                  onChange={(event) => updateEditField("category", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block">
                <span className="k-form-label">
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
                <span className="k-form-label">
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
                <span className="k-form-label">
                  Status
                </span>
                <input
                  value={editForm.status}
                  onChange={(event) => updateEditField("status", event.target.value)}
                  className="k-input mt-2 h-11 px-4 text-sm font-medium"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="k-form-label">
                  Descrição
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    updateEditField("description", event.target.value)
                  }
                  rows={3}
                  className="k-textarea mt-2 w-full px-4 py-3 text-sm font-medium"
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
