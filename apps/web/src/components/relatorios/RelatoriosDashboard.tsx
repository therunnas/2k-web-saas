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
    cyan: "bg-cyan-300",
    violet: "bg-violet-300",
    rose: "bg-rose-300",
    emerald: "bg-emerald-300",
  }[tone];

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.035em]">
          {title}
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {items.slice(0, 6).map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {item.rank}. {item.name}
                </span>
                <span className="text-xs font-medium text-slate-600">
                  {item.count} lançamentos
                </span>
              </div>

              <span className="dashboard-number shrink-0 text-sm font-semibold text-slate-200">
                {formatCompactCurrency(item.total)}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${colorClass}`}
                style={{
                  width: `${clamp((item.total / maxValue) * 100, 4, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}

        {!items.length ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-medium text-slate-500">
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
        tone: "text-emerald-300",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas pagas",
        icon: ArrowUpRight,
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
        label: "Saídas",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: `${summary?.expenseEntries ?? 0} despesas`,
        icon: ArrowDownLeft,
        tone: "text-rose-300",
      },
      {
        label: "Lucro",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: `Margem ${summary ? formatPercent(summary.margin) : "—"}`,
        icon: PieChart,
        tone: "text-violet-300",
      },
      {
        label: "Resultado de caixa real",
        value: summary ? formatCompactCurrency(summary.cashResult) : "—",
        helper: "Recebido - saídas pagas",
        icon: Wallet,
        tone: "text-cyan-300",
      },
    ];
  }, [data]);

  const monthly = data?.monthly ?? [];
  const rankings = data?.rankings;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Relatórios
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Relatórios executivos reais.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Consolidação anual de faturamento, caixa, despesas, margem,
            clientes, produções e rankings calculados com base na planilha
            importada.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadReports}
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
            Exportar futuro
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

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <BarChart3 size={21} className="text-cyan-300" />
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Relatório mensal
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Receita, recebimento, despesas, lucro e caixa por mês.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Mês</span>
              <span>Faturamento</span>
              <span>Recebido</span>
              <span>A receber</span>
              <span>Saídas</span>
              <span>Lucro</span>
              <span>Margem</span>
            </div>

            {monthly.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <strong className="block font-semibold text-white">
                    {item.month}
                  </strong>
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>

                <span className="dashboard-number text-slate-200">
                  {formatCurrency(item.revenue)}
                </span>

                <span className="dashboard-number text-emerald-200">
                  {formatCurrency(item.received)}
                </span>

                <span className="dashboard-number text-cyan-200">
                  {formatCurrency(item.receivable)}
                </span>

                <span className="dashboard-number text-rose-200">
                  {formatCurrency(item.expenses)}
                </span>

                <span
                  className={`dashboard-number font-semibold ${
                    item.profit >= 0 ? "text-violet-200" : "text-rose-200"
                  }`}
                >
                  {formatCurrency(item.profit)}
                </span>

                <span className="dashboard-number text-slate-300">
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

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 xl:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <FileText size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Próxima evolução dos relatórios
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
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
