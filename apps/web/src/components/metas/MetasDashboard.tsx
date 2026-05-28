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
    if (goal.current <= goal.target) return "k-report-bar-emerald";
    if (goal.current <= goal.target * 1.15) return "k-report-bar-cyan";
    return "k-report-bar-rose";
  }

  if (goal.progress >= 100) return "k-report-bar-emerald";
  if (goal.progress >= 75) return "k-report-bar-cyan";
  if (goal.progress >= 50) return "k-report-bar-violet";
  return "k-report-bar-rose";
}

function getStatusTone(goal: GoalItem) {
  if (goal.lowerIsBetter) {
    if (goal.current <= goal.target) return "success";
    if (goal.current <= goal.target * 1.15) return "info";
    return "danger";
  }

  if (goal.progress >= 100) return "success";
  if (goal.progress >= 75) return "info";
  if (goal.progress >= 50) return "neutral";
  return "danger";
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
    <div className="k-page space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <p className="k-eyebrow">
            Metas
          </p>

          <h1 className="k-title">
            Metas comerciais e financeiras.
          </h1>

          <p className="k-subtitle">
            Acompanhamento de metas automáticas com base nos dados reais da
            planilha: faturamento, recebimento, lucro, margem, despesas e
            valores a receber.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={loadGoals}
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
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="k-kpi-strip-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="k-kpi-label">
                    {card.label}
                  </p>

                  <strong className="k-kpi-value">
                    {card.value}
                  </strong>

                  <p className="k-kpi-helper k-kpi-helper-info">
                    {card.helper}
                  </p>
                </div>

                <div className="k-report-icon">
                  <Icon size={22} className={card.tone} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="k-goals-layout">
        <div className="k-card k-goals-panel">
          <div className="k-section-head k-goals-panel-head">
            <div className="k-form-title-row">
              <div className="k-form-icon">
                <Target size={17} />
              </div>
              <div>
                <h2>
                  Metas principais
                </h2>

                <p className="k-section-sub">
                  Realizado versus meta sugerida para o ciclo atual.
                </p>
              </div>
            </div>

            <span className="k-badge" data-tone="info">
              AF 2026
            </span>
          </div>

          <div className="k-goals-list">
            {goals.map((goal) => (
              <article
                key={goal.id}
                className="k-goal-row"
              >
                <div className="k-goal-row-main">
                  <div className="k-goal-row-copy">
                    <div className="k-goal-row-header">
                      <h3>{goal.label}</h3>

                      <span
                        className="k-goal-status"
                        data-tone={getStatusTone(goal)}
                      >
                        {goal.status}
                      </span>
                    </div>

                    <p>
                      {goal.description}
                    </p>
                  </div>

                  <div className="k-goal-metrics">
                    <div className="k-goal-metric">
                      <span>
                        Atual
                      </span>
                      <strong className="k-goal-value">
                        {formatGoalValue(goal, goal.current)}
                      </strong>
                    </div>

                    <div className="k-goal-metric">
                      <span>
                        Meta
                      </span>
                      <strong className="k-goal-target">
                        {formatGoalValue(goal, goal.target)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="k-goal-progress-block">
                  <div className="k-goal-progress-head">
                    <span>Progresso</span>
                    <span>{formatPercent(goal.progress)}</span>
                  </div>

                  <div className="k-goal-progress-track">
                    <div
                      className={`k-goal-progress-bar ${getProgressTone(goal)}`}
                      style={{
                        width: `${clamp(goal.progress, 4, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}

            {!goals.length ? (
              <div className="k-empty">
                Nenhuma meta encontrada.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="k-card k-goal-reading-card">
          <div className="k-section-head">
            <div>
            <h2>
              Leitura executiva
            </h2>

            <p className="k-section-sub">
              Diagnóstico automático do ciclo atual.
            </p>
            </div>
          </div>

          <div className="k-compact-list">
            <div className="k-card-soft k-diagnostic-box">
              <p className="text-sm font-semibold text-cyan-100">
                Metas automáticas
              </p>

              <p className="mt-2 text-sm font-medium leading-6 text-cyan-100/70">
                Esta versão calcula metas sugeridas a partir dos dados reais. A
                próxima evolução será permitir cadastro manual de metas por mês.
              </p>
            </div>

            <div className="k-card-soft">
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

      <section className="k-card k-goal-card">
        <div className="k-section-head">
          <div>
          <h2>
            Progresso mensal
          </h2>

          <p className="k-section-sub">
            Faturamento, recebimento e controle de despesas por mês.
          </p>
          </div>
        </div>

        <div className="k-table-card overflow-x-auto">
          <div className="k-table min-w-[1080px]">
            <div data-table-head className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3">
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
                className="k-table-row grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
              >
                <div>
                  <strong className="block font-semibold text-slate-100">
                    {item.month}
                  </strong>
                  <span className="k-muted text-xs">{item.label}</span>
                </div>

                <div>
                  <span className="k-number block text-slate-200">
                    {formatCurrency(item.revenue)}
                  </span>
                  <span className="mt-1 block text-xs text-cyan-300">
                    {formatPercent(item.revenueProgress)}
                  </span>
                </div>

                <span className="k-number text-cyan-200">
                  {formatCurrency(item.revenueTarget)}
                </span>

                <div>
                  <span className="k-number block text-emerald-200">
                    {formatCurrency(item.received)}
                  </span>
                  <span className="mt-1 block text-xs text-emerald-300">
                    {formatPercent(item.receivedProgress)}
                  </span>
                </div>

                <div>
                  <span className="k-number block text-rose-200">
                    {formatCurrency(item.expenses)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    teto {formatCurrency(item.expenseCeiling)}
                  </span>
                </div>

                <span className="k-badge" data-tone="info">
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

