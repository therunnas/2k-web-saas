"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  PieChart,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

type MonthlyReport = {
  month: string;
  label: string;
  revenue: number;
  received: number;
  receivable: number;
  expenses: number;
  profit: number;
  cash: number;
  margin: number;
  entries: number;
};

type RankingItem = {
  rank: number;
  name: string;
  total: number;
  count: number;
};

type RelatoriosOverviewResponse = {
  status: string;
  year: number;
  summary: {
    entries: number;
    revenueEntries: number;
    expenseEntries: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    totalExpenses: number;
    paidExpenses: number;
    payableTotal: number;
    totalProfit: number;
    cashResult: number;
    margin: number;
    groupsCount: number;
    brandsCount: number;
    projectsCount: number;
    categoriesCount: number;
    suppliersCount: number;
  };
  monthly: MonthlyReport[];
  rankings: {
    topGroups: RankingItem[];
    topBrands: RankingItem[];
    topProjects: RankingItem[];
    topExpenseCategories: RankingItem[];
    topSuppliers: RankingItem[];
  };
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)}%`;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function RankingList({
  title,
  description,
  items,
  tone = "cyan",
}: {
  title: string;
  description: string;
  items: RankingItem[];
  tone?: "cyan" | "violet" | "rose" | "emerald";
}) {
  const maxValue = Math.max(...items.map((item) => item.total), 1);

  const colorClass = {
    cyan: "k-report-bar-cyan",
    violet: "k-report-bar-violet",
    rose: "k-report-bar-rose",
    emerald: "k-report-bar-emerald",
  }[tone];

  return (
    <section className="k-card k-report-card k-report-ranking-card">
      <div className="k-section-head">
        <div>
          <h2>
            {title}
          </h2>

          <p className="k-section-sub">
            {description}
          </p>
        </div>
      </div>

      <div className="k-compact-list">
        {items.slice(0, 6).map((item) => (
          <div key={item.name} className="k-report-rank-row">
            <div className="k-report-rank-head">
              <div className="min-w-0">
                <span className="k-report-rank-title">
                  {item.rank}. {item.name}
                </span>
                <span className="k-muted text-xs">
                  {item.count} lançamentos
                </span>
              </div>

              <span className="k-number k-report-rank-value">
                {formatCompactCurrency(item.total)}
              </span>
            </div>

            <div className="k-progress-line">
              <div
                className={colorClass}
                style={{
                  width: `${clamp((item.total / maxValue) * 100, 4, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}

        {!items.length ? (
          <div className="k-empty">
            Nenhum dado encontrado.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function RelatoriosDashboard() {
  const [data, setData] = useState<RelatoriosOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/relatorios/overview?year=2026", {
        cache: "no-store",
      });

      const json = (await response.json()) as RelatoriosOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar relatórios.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de relatórios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: `${summary?.revenueEntries ?? 0} entradas`,
        icon: TrendingUp,
        tone: "positive",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas pagas",
        icon: ArrowUpRight,
        tone: "positive",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "Entradas pendentes",
        icon: CalendarDays,
        tone: "warning",
      },
      {
        label: "Saídas",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: `${summary?.expenseEntries ?? 0} despesas`,
        icon: ArrowDownLeft,
        tone: "info",
      },
      {
        label: "Lucro",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: `Margem ${summary ? formatPercent(summary.margin) : "—"}`,
        icon: PieChart,
        tone: "positive",
      },
      {
        label: "Caixa real",
        value: summary ? formatCompactCurrency(summary.cashResult) : "—",
        helper: "Recebido - saídas pagas",
        icon: Wallet,
        tone: "positive",
      },
    ];
  }, [data]);

  const monthly = data?.monthly ?? [];
  const rankings = data?.rankings;

  return (
    <div className="k-page k-report-page">
      <header className="k-report-hero">
        <div>
          <p className="k-eyebrow">
            RELATÓRIOS
          </p>

          <h1 className="k-title">
            Relatórios executivos.
          </h1>

          <p className="k-subtitle">
            Consolidação anual de faturamento, caixa, despesas, margem,
            clientes, produções e rankings calculados com base na planilha
            importada.
          </p>
        </div>

        <div className="k-report-actions">
          <button
            type="button"
            onClick={loadReports}
            className="k-button-ghost"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            type="button"
            className="k-button-secondary"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <section className="k-kpi-strip k-report-kpi-strip">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="k-kpi-strip-item"
              data-tone={card.tone}
            >
              <div className="k-report-kpi-inner">
                <div className="min-w-0">
                  <p className="k-kpi-label">
                    {card.label}
                  </p>

                  <strong className="k-kpi-value">
                    {renderKpiValue(card.value)}
                  </strong>

                  <p className="k-kpi-helper">
                    {card.helper}
                  </p>
                </div>

                <div className="k-report-icon">
                  <Icon size={15} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="k-card k-report-card k-report-monthly-card">
        <div className="k-section-head">
          <div className="k-form-title-row">
            <div className="k-form-icon">
              <BarChart3 size={15} />
            </div>
            <div>
              <h2>
                Relatório mensal
              </h2>
              <p className="k-section-sub">
                Receita, recebimento, despesas, lucro e caixa por mês.
              </p>
            </div>
          </div>

          <span className="k-report-period-badge">12 meses</span>
        </div>

        <div className="k-table-card overflow-x-auto">
          <div className="k-table k-report-table min-w-[1080px]">
            <div data-table-head className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr] px-5 py-3">
              <span>Mês</span>
              <span className="text-right">Faturamento</span>
              <span className="text-right">Recebido</span>
              <span className="text-right">A receber</span>
              <span className="text-right">Saídas</span>
              <span className="text-right">Lucro</span>
              <span className="text-right">Margem</span>
            </div>

            {monthly.map((item) => (
              <div
                key={item.label}
                className="k-table-row grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                data-empty={item.revenue || item.received || item.receivable || item.expenses || item.profit ? undefined : "true"}
              >
                <div>
                  <strong className="block font-semibold text-slate-100">
                    {item.month}
                  </strong>
                  <span className="k-muted text-xs">{item.label}</span>
                </div>

                <span className="k-number text-right text-slate-200">
                  {formatCurrency(item.revenue)}
                </span>

                <span className="k-number text-right text-emerald-200">
                  {formatCurrency(item.received)}
                </span>

                <span className="k-number text-right text-cyan-200">
                  {formatCurrency(item.receivable)}
                </span>

                <span className="k-number text-right text-rose-200">
                  {formatCurrency(item.expenses)}
                </span>

                <span
                  className={`k-number text-right font-semibold ${
                    item.profit > 0 ? "text-slate-100" : item.profit < 0 ? "text-rose-200" : "text-slate-600"
                  }`}
                >
                  {formatCurrency(item.profit)}
                </span>

                <span className="k-number text-right text-slate-300">
                  {formatPercent(item.margin)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RankingList
          title="Top grupos"
          description="Grupos com maior faturamento."
          items={rankings?.topGroups ?? []}
          tone="cyan"
        />

        <RankingList
          title="Top projetos"
          description="Produções/projetos com maior valor."
          items={rankings?.topProjects ?? []}
          tone="violet"
        />

        <RankingList
          title="Top categorias de despesas"
          description="Maiores grupos de custo."
          items={rankings?.topExpenseCategories ?? []}
          tone="rose"
        />

        <RankingList
          title="Top fornecedores"
          description="Fornecedores com maior volume de saída."
          items={rankings?.topSuppliers ?? []}
          tone="emerald"
        />
      </section>

      <section className="k-card k-report-card">
        <div className="flex items-start gap-4">
          <div className="k-report-icon text-violet-200">
            <FileText size={22} />
          </div>

          <div>
            <h2 className="k-section-title">
              Próxima evolução dos relatórios
            </h2>

            <p className="k-muted mt-3 max-w-3xl text-sm font-medium leading-6">
              O módulo já consolida os dados reais. Depois podemos adicionar
              exportação CSV, relatório PDF executivo, filtro por mês, filtro
              por cliente/grupo e comparação entre competência e caixa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


