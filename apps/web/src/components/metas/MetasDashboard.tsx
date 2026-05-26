"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

type GoalItem = {
  id: string;
  label: string;
  description: string;
  current: number;
  target: number;
  unit: "currency" | "percent";
  lowerIsBetter: boolean;
  progress: number;
  status: string;
};

type MonthlyGoal = {
  month: string;
  label: string;
  revenue: number;
  received: number;
  expenses: number;
  profit: number;
  revenueTarget: number;
  receivedTarget: number;
  expenseCeiling: number;
  revenueProgress: number;
  receivedProgress: number;
  expenseProgress: number;
  status: string;
};

type MetasOverviewResponse = {
  status: string;
  year: number;
  summary: {
    entries: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    totalExpenses: number;
    paidExpenses: number;
    payableTotal: number;
    totalProfit: number;
    cashResult: number;
    margin: number;
    overallScore: number;
  };
  goals: GoalItem[];
  monthly: MonthlyGoal[];
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

function formatGoalValue(goal: GoalItem, value: number) {
  if (goal.unit === "percent") return formatPercent(value);
  return formatCompactCurrency(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProgressTone(goal: GoalItem) {
  if (goal.lowerIsBetter) {
    if (goal.current <= goal.target) return "bg-emerald-300";
    if (goal.current <= goal.target * 1.15) return "bg-cyan-300";
    return "bg-rose-300";
  }

  if (goal.progress >= 100) return "bg-emerald-300";
  if (goal.progress >= 75) return "bg-cyan-300";
  if (goal.progress >= 50) return "bg-violet-300";
  return "bg-rose-300";
}

function getStatusClass(goal: GoalItem) {
  if (goal.lowerIsBetter) {
    if (goal.current <= goal.target) return "bg-emerald-400/10 text-emerald-200";
    if (goal.current <= goal.target * 1.15) return "bg-cyan-400/10 text-cyan-200";
    return "bg-rose-400/10 text-rose-200";
  }

  if (goal.progress >= 100) return "bg-emerald-400/10 text-emerald-200";
  if (goal.progress >= 75) return "bg-cyan-400/10 text-cyan-200";
  if (goal.progress >= 50) return "bg-violet-400/10 text-violet-200";
  return "bg-rose-400/10 text-rose-200";
}

export function MetasDashboard() {
  const [data, setData] = useState<MetasOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadGoals() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/metas/overview?year=2026", {
        cache: "no-store",
      });

      const json = (await response.json()) as MetasOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar metas.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de metas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Score geral",
        value: summary ? formatPercent(summary.overallScore) : "—",
        helper: "Média de avanço das metas",
        icon: Gauge,
        tone: "text-cyan-300",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "Realizado no ano",
        icon: TrendingUp,
        tone: "text-emerald-300",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Caixa confirmado",
        icon: Wallet,
        tone: "text-emerald-300",
      },
      {
        label: "Lucro",
        value: summary ? formatCompactCurrency(summary.totalProfit) : "—",
        helper: `Margem ${summary ? formatPercent(summary.margin) : "—"}`,
        icon: CircleDollarSign,
        tone: "text-violet-300",
      },
      {
        label: "Despesas",
        value: summary ? formatCompactCurrency(summary.totalExpenses) : "—",
        helper: "Saídas no ano",
        icon: ArrowDownLeft,
        tone: "text-rose-300",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: "Controle de pendências",
        icon: ArrowUpRight,
        tone: "text-cyan-300",
      },
    ];
  }, [data]);

  const goals = data?.goals ?? [];
  const monthly = data?.monthly ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Metas
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Metas comerciais e financeiras.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Acompanhamento de metas automáticas com base nos dados reais da
            planilha: faturamento, recebimento, lucro, margem, despesas e
            valores a receber.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadGoals}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Target size={21} className="text-cyan-300" />
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Metas principais
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Realizado versus meta sugerida para o ciclo atual.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {goals.map((goal) => (
              <article
                key={goal.id}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-white">
                        {goal.label}
                      </h3>

                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                          goal
                        )}`}
                      >
                        {goal.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {goal.description}
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-6 text-right">
                    <div>
                      <span className="dashboard-label text-[10px] text-slate-600">
                        Atual
                      </span>
                      <strong className="dashboard-number mt-1 block text-sm font-semibold text-white">
                        {formatGoalValue(goal, goal.current)}
                      </strong>
                    </div>

                    <div>
                      <span className="dashboard-label text-[10px] text-slate-600">
                        Meta
                      </span>
                      <strong className="dashboard-number mt-1 block text-sm font-semibold text-cyan-200">
                        {formatGoalValue(goal, goal.target)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Progresso</span>
                    <span>{formatPercent(goal.progress)}</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${getProgressTone(goal)}`}
                      style={{
                        width: `${clamp(goal.progress, 4, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}

            {!goals.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-medium text-slate-500">
                Nenhuma meta encontrada.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Leitura executiva
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Diagnóstico automático do ciclo atual.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
              <p className="text-sm font-semibold text-cyan-100">
                Metas automáticas
              </p>

              <p className="mt-2 text-sm font-medium leading-6 text-cyan-100/70">
                Esta versão calcula metas sugeridas a partir dos dados reais. A
                próxima evolução será permitir cadastro manual de metas por mês.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-white">
                Próxima evolução
              </p>

              <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-400">
                <li>• Criar metas editáveis no banco</li>
                <li>• Comparar realizado x planejado por mês</li>
                <li>• Criar alertas de desvio</li>
                <li>• Exibir meta por cliente/grupo</li>
              </ul>
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-[-0.035em]">
            Progresso mensal
          </h2>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Faturamento, recebimento e controle de despesas por mês.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Mês</span>
              <span>Faturamento</span>
              <span>Meta fat.</span>
              <span>Recebido</span>
              <span>Despesas</span>
              <span>Status</span>
            </div>

            {monthly.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <strong className="block font-semibold text-white">
                    {item.month}
                  </strong>
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>

                <div>
                  <span className="dashboard-number block text-slate-200">
                    {formatCurrency(item.revenue)}
                  </span>
                  <span className="mt-1 block text-xs text-cyan-300">
                    {formatPercent(item.revenueProgress)}
                  </span>
                </div>

                <span className="dashboard-number text-cyan-200">
                  {formatCurrency(item.revenueTarget)}
                </span>

                <div>
                  <span className="dashboard-number block text-emerald-200">
                    {formatCurrency(item.received)}
                  </span>
                  <span className="mt-1 block text-xs text-emerald-300">
                    {formatPercent(item.receivedProgress)}
                  </span>
                </div>

                <div>
                  <span className="dashboard-number block text-rose-200">
                    {formatCurrency(item.expenses)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    teto {formatCurrency(item.expenseCeiling)}
                  </span>
                </div>

                <span className="w-fit rounded-lg bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
