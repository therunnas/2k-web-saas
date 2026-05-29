"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Plus,
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

const categoryBarColors = [
  "rgb(248, 113, 113)",
  "rgb(244, 114, 182)",
  "rgb(251, 113, 133)",
  "rgb(249, 168, 212)",
  "rgb(251, 146, 60)",
];

const supplierBarColors = [
  "rgb(34, 211, 238)",
  "rgb(45, 212, 191)",
  "rgb(52, 211, 153)",
  "rgb(196, 181, 253)",
  "rgb(167, 139, 250)",
  "rgb(74, 222, 128)",
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

function kpiHelperColor(tone: string) {
  if (tone === "k-kpi-helper-warning") return "rgb(251, 191, 36)";
  if (tone === "k-kpi-helper-danger") return "rgb(248, 113, 113)";

  return "rgb(45, 212, 191)";
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
  const status = String(item.status || item.kind || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (status.includes("atras")) {
    return "danger";
  }

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

function getExpenseBadgeStyle(item: ExpenseItem) {
  const status = String(item.status || item.kind || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (status.includes("atras")) {
    return {
      background: "rgba(248, 113, 113, 0.1)",
      borderColor: "rgba(248, 113, 113, 0.38)",
      color: "rgb(252, 165, 165)",
    };
  }

  if (item.type === "PAYABLE") {
    return {
      background: "rgba(251, 191, 36, 0.1)",
      borderColor: "rgba(251, 191, 36, 0.36)",
      color: "rgb(251, 191, 36)",
    };
  }

  return {
    background: "rgba(45, 212, 191, 0.1)",
    borderColor: "rgba(45, 212, 191, 0.34)",
    color: "rgb(94, 234, 212)",
  };
}

export function DespesasDashboard() {
  const [data, setData] = useState<DespesasOverviewResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDespesas(params?: { status?: string; search?: string }) {
    const status = params?.status ?? activeFilter;

    setLoading(true);
    setErrorMessage(null);

    try {
      const searchParams = new URLSearchParams({
        year: "2026",
        status,
      });

      if (params?.search?.trim()) {
        searchParams.set("search", params.search.trim());
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  function handleFilterChange(value: string) {
    setActiveFilter(value);
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Saídas no ano",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: `${summary?.totalEntries ?? 0} lançamentos`,
        tone: "k-kpi-helper-info",
      },
      {
        label: "Despesas pagas",
        value: summary ? formatCompactCurrency(summary.paidTotal) : "—",
        helper: `${summary?.paidCount ?? 0} itens`,
        tone: "k-kpi-helper-positive",
      },
      {
        label: "A pagar",
        value: summary ? formatCompactCurrency(summary.payableTotal) : "—",
        helper: `${summary?.payableCount ?? 0} pendências`,
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Categorias",
        value: summary ? String(summary.categoriesCount) : "—",
        helper: "grupos de custo",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Fornecedores",
        value: summary ? String(summary.suppliersCount) : "—",
        helper: "ativos",
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
    <div className="k-page space-y-6" style={{ gap: "18px", paddingTop: "30px" }}>
      <header
        className="k-page-header k-page-heading"
        style={{
          alignItems: "flex-start",
          display: "flex",
          flexDirection: "row",
          gap: "24px",
          justifyContent: "space-between",
          padding: "0",
        }}
      >
        <div style={{ maxWidth: "760px" }}>
          <h1
            className="k-title"
            style={{
              fontSize: "28px",
              fontWeight: 750,
              letterSpacing: 0,
              lineHeight: 1.05,
              margin: "0 0 14px",
            }}
          >
            Despesas reais da operação.
          </h1>

          <p
            className="k-subtitle"
            style={{
              color: "rgba(148, 163, 184, 0.84)",
              fontSize: "12px",
              lineHeight: 1.45,
              margin: 0,
              maxWidth: "690px",
            }}
          >
            Saídas, fornecedores, categorias, custos pagos e pendências consolidados da aba SAÍDAS.
          </p>
        </div>

        <div
          className="k-page-actions"
          style={{ alignItems: "center", gap: "8px", paddingTop: "28px" }}
        >
          <button
            type="button"
            aria-disabled="true"
            title="Exportação de despesas ainda não implementada."
            className="k-button-ghost"
            style={{
              background: "rgba(15, 23, 42, 0.34)",
              borderColor: "rgba(148, 163, 184, 0.22)",
              borderRadius: "10px",
              color: "rgba(226, 232, 240, 0.9)",
              fontSize: "11.5px",
              fontWeight: 650,
              minHeight: "32px",
              paddingInline: "13px",
            }}
          >
            <Download size={14} />
            Exportar
          </button>

          <Link
            href="/saidas"
            className="k-button-primary"
            style={{
              background: "rgba(34, 211, 238, 0.13)",
              borderColor: "rgba(34, 211, 238, 0.28)",
              borderRadius: "10px",
              color: "rgb(207, 250, 254)",
              fontSize: "11.5px",
              fontWeight: 650,
              minHeight: "32px",
              paddingInline: "13px",
            }}
          >
            <Plus size={14} />
            Nova saída
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <section
        className="k-kpi-strip"
        style={{
          background: "rgba(10, 14, 22, 0.92)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "14px",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.018)",
          display: "grid",
          gap: 0,
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          minHeight: "72px",
          overflow: "hidden",
        }}
      >
        {summaryCards.map((card, index) => (
          <article
            key={card.label}
            className="k-kpi-strip-item"
            style={{
              background: "transparent",
              border: 0,
              borderRadius: 0,
              borderRight:
                index === summaryCards.length - 1
                  ? 0
                  : "1px solid rgba(148, 163, 184, 0.12)",
              gap: "7px",
              justifyContent: "center",
              minHeight: "72px",
              padding: "12px 16px",
            }}
          >
            <span
              className="k-kpi-label"
              style={{
                color: "rgba(148, 163, 184, 0.58)",
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                lineHeight: 1.15,
              }}
            >
              {card.label}
            </span>

            <strong
              className="k-kpi-value"
              style={{
                color: "rgba(226, 232, 240, 0.94)",
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "15.5px",
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {renderKpiValue(card.value)}
            </strong>

            <span
              className={`k-kpi-helper ${card.tone}`}
              style={{
                color: kpiHelperColor(card.tone),
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "9px",
                fontWeight: 750,
                lineHeight: 1.2,
                minHeight: 0,
              }}
            >
              {card.helper}
            </span>
          </article>
        ))}
      </section>

      <section
        className="grid xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.6fr)]"
        style={{ gap: "12px" }}
      >
        <div
          className="k-card k-entry-table k-expense-table"
          style={{
            background: "rgba(10, 14, 22, 0.92)",
            borderColor: "rgba(148, 163, 184, 0.15)",
            borderRadius: "14px",
            boxShadow: "none",
            padding: "18px",
          }}
        >
          <div
            className="k-section-head flex-col items-start xl:flex-row xl:items-start"
            style={{ marginBottom: "15px", paddingBottom: 0 }}
          >
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                Lançamentos de despesas
              </h2>

              <p className="k-section-sub" style={{ fontSize: "11px", marginTop: "8px" }}>
                {data
                  ? `${data.summary.filteredEntries} de ${data.summary.totalEntries} no período.`
                  : "Carregando despesas."}
              </p>
            </div>

            <div className="ml-auto">
              <div
                className="flex flex-wrap"
                style={{
                  background: "rgba(7, 10, 16, 0.44)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: "9px",
                  gap: "2px",
                  padding: "3px",
                }}
              >
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleFilterChange(option.value)}
                    className="k-filter-chip"
                    aria-pressed={activeFilter === option.value}
                    style={{
                      border: 0,
                      borderRadius: "7px",
                      fontSize: "10px",
                      minHeight: "24px",
                      paddingInline: "10px",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="k-table-card overflow-x-auto"
            style={{
              background: "transparent",
              border: 0,
              borderRadius: 0,
            }}
          >
            <div className="k-table min-w-[760px]">
              <div
                data-table-head
                className="grid grid-cols-[1.1fr_1.55fr_0.9fr_0.8fr_0.7fr]"
                style={{ padding: "12px 12px 10px" }}
              >
                <span>Fornecedor</span>
                <span>Descrição</span>
                <span>Categoria</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {expenses.map((item) => (
                <div
                  key={item.id}
                  className="k-table-row grid grid-cols-[1.1fr_1.55fr_0.9fr_0.8fr_0.7fr] items-center border-b border-white/[0.045] last:border-b-0"
                  style={{ minHeight: "44px", padding: "0 12px" }}
                >
                  <div className="flex min-w-0 items-center" style={{ gap: "10px" }}>
                    <span className="k-avatar k-avatar-brand" style={{ height: "20px", width: "20px", fontSize: "9px" }}>
                      {getInitials(item.supplier)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate text-slate-100" style={{ fontSize: "11px", fontWeight: 750 }}>
                        {item.supplier}
                      </strong>
                    </div>
                  </div>

                  <span className="truncate pr-4 font-medium text-slate-400" style={{ fontSize: "11px" }}>
                    {item.description}
                  </span>

                  <span className="truncate font-medium text-slate-400" style={{ fontSize: "11px" }}>
                    {item.category}
                  </span>

                  <span className="k-number font-semibold text-slate-200" style={{ fontSize: "12px" }}>
                    {formatCurrency(item.value)}
                  </span>

                  <span
                    className="k-badge"
                    data-tone={getStatusTone(item)}
                    style={{
                      ...getExpenseBadgeStyle(item),
                      borderRadius: "999px",
                      fontSize: "10px",
                      minHeight: "22px",
                      paddingInline: "9px",
                    }}
                  >
                    {item.status || item.kind}
                  </span>
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

        <aside className="space-y-3">
          <section
            className="k-card k-recent-list"
            style={{
              background: "rgba(10, 14, 22, 0.92)",
              borderColor: "rgba(148, 163, 184, 0.15)",
              borderRadius: "14px",
              boxShadow: "none",
              padding: "18px",
            }}
          >
            <div className="k-section-head" style={{ marginBottom: "17px", paddingBottom: 0 }}>
              <div>
              <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                Top categorias
              </h2>

              <p className="k-section-sub" style={{ fontSize: "11px", marginTop: "8px" }}>
                Maiores grupos de custo
              </p>
              </div>
            </div>

            <div className="space-y-3">
              {categories.slice(0, 6).map((item, index) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate font-semibold text-slate-100" style={{ fontSize: "11px" }}>
                      {item.name}
                    </span>

                    <span className="k-number font-semibold text-slate-200" style={{ fontSize: "11px" }}>
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div
                    className="k-bar-track"
                    style={{
                      background: "rgba(30, 41, 59, 0.72)",
                      height: "3px",
                      maxWidth: "none",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    <div
                      className="k-bar-fill"
                      style={{
                        background: categoryBarColors[index % categoryBarColors.length],
                        width: `${clamp((item.total / maxCategoryValue) * 100, 4, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="k-card k-recent-list"
            style={{
              background: "rgba(10, 14, 22, 0.92)",
              borderColor: "rgba(148, 163, 184, 0.15)",
              borderRadius: "14px",
              boxShadow: "none",
              padding: "18px",
            }}
          >
            <div className="k-section-head" style={{ marginBottom: "17px", paddingBottom: 0 }}>
              <div>
              <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                Top fornecedores
              </h2>

              <p className="k-section-sub" style={{ fontSize: "11px", marginTop: "8px" }}>
                Maior volume de saída
              </p>
              </div>
            </div>

            <div className="space-y-3">
              {suppliers.slice(0, 6).map((item, index) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate font-semibold text-slate-100" style={{ fontSize: "11px" }}>
                      {item.name}
                    </span>

                    <span className="k-number font-semibold text-slate-200" style={{ fontSize: "11px" }}>
                      {formatCompactCurrency(item.total)}
                    </span>
                  </div>

                  <div
                    className="k-bar-track"
                    style={{
                      background: "rgba(30, 41, 59, 0.72)",
                      height: "3px",
                      maxWidth: "none",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    <div
                      className="k-bar-fill"
                      style={{
                        background: supplierBarColors[index % supplierBarColors.length],
                        width: `${clamp((item.total / maxSupplierValue) * 100, 4, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

