"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  DollarSign,
  PieChart,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";

type MonthlyTopClient = {
  name: string;
  revenue: number;
  profit: number;
  margin: string;
};

type MonthlyRevenueItem = {
  month: string;
  label: string;
  value: number | null;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  topClient: MonthlyTopClient | null;
};

type TopGroup = {
  rank: number;
  name: string;
  revenue: number;
  received: number;
  receivable: number;
  projectsCount: number;
  ticketMedio: number;
  participationPercent: number;
};

type LatestEntry = {
  id: string;
  type: string;
  date: string | null;
  dueAt: string | null;
  competence: string | null;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  overdue: boolean;
  revenue: number;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type FinanceSummary = {
  entries: number;
  totalRevenue: number;
  receivedTotal: number;
  receivableTotal: number;
  overdueTotal: number;
  totalExpenses: number;
  paidExpenses: number;
  payableTotal: number;
  totalProfit: number;
  cashResult: number;
  committedCash: number;
  margin: number;
};

type FinanceOverview = {
  status: string;
  year: number;
  summary: FinanceSummary;
  currentMonth: {
    month: string;
    label: string;
    revenue: number;
    received: number;
    receivable: number;
    expenses: number;
    profit: number;
    cash: number;
    margin: number;
  } | null;
  monthly: MonthlyRevenueItem[];
  topGroups: TopGroup[];
  latestEntries: LatestEntry[];
};

type ChartPoint = MonthlyRevenueItem & {
  x: number;
  y: number | null;
};

type ActiveChartPoint = ChartPoint & {
  value: number;
  y: number;
  topClient: MonthlyTopClient;
};

type KpiTrendDirection = "up" | "down" | "neutral";

type DashboardKpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  trendDirection: KpiTrendDirection;
};

const kpiIcons = [
  DollarSign,
  TrendingUp,
  CalendarDays,
  PieChart,
  CalendarDays,
  TrendingUp,
  PieChart,
  DollarSign,
  PieChart,
];

const emptyMonths: MonthlyRevenueItem[] = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
].map((month, index) => ({
  month,
  label: `${String(index + 1).padStart(2, "0")}/2026`,
  value: null,
  revenue: 0,
  expenses: 0,
  profit: 0,
  margin: 0,
  topClient: null,
}));

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return formatCurrency(value).replace(",00", "");
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value || 0)}%`;
}

function formatAxisValue(value: number) {
  if (value >= 120000) return "R$ 120 mil";
  if (value >= 90000) return "R$ 90 mil";
  if (value >= 60000) return "R$ 60 mil";
  if (value >= 30000) return "R$ 30 mil";
  return "R$ 0";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function RevenueChart({ monthly }: { monthly: MonthlyRevenueItem[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<ActiveChartPoint | null>(
    null
  );

  const width = 1120;
  const height = 340;
  const paddingX = 74;
  const paddingY = 48;

  const values = monthly
    .map((item) => item.value)
    .filter((value): value is number => typeof value === "number");

  const maxValue = Math.max(...values, 120000);
  const minValue = 0;

  const points: ChartPoint[] = monthly.map((item, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (monthly.length - 1);

    if (item.value === null) {
      return {
        ...item,
        x,
        y: null,
      };
    }

    const normalized = (item.value - minValue) / (maxValue - minValue);
    const y = height - paddingY - normalized * (height - paddingY * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const visiblePoints = points
    .map((point) => {
      if (
        typeof point.value === "number" &&
        typeof point.y === "number" &&
        point.topClient
      ) {
        return point as ActiveChartPoint;
      }

      if (typeof point.value === "number" && typeof point.y === "number") {
        return {
          ...point,
          topClient: {
            name: "Sem cliente identificado",
            revenue: point.revenue,
            profit: point.profit,
            margin: formatPercent(point.margin),
          },
        } as ActiveChartPoint;
      }

      return null;
    })
    .filter((point): point is ActiveChartPoint => Boolean(point));

  const path = visiblePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    visiblePoints.length > 1
      ? `${path} L ${visiblePoints[visiblePoints.length - 1].x} ${
          height - paddingY
        } L ${visiblePoints[0].x} ${height - paddingY} Z`
      : "";

  const lastVisiblePoint = visiblePoints[visiblePoints.length - 1];
  const axisValues = [120000, 90000, 60000, 30000, 0];

  const tooltipLeft = hoveredPoint
    ? clamp((hoveredPoint.x / width) * 100, 17, 83)
    : 50;

  const tooltipTop = hoveredPoint
    ? clamp((hoveredPoint.y / height) * 100, 24, 76)
    : 50;

  const tooltipBelow = hoveredPoint ? hoveredPoint.y < 150 : false;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-5 xl:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Faturamento anual
            </h2>

            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] text-slate-400">
              i
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Dados reais importados da planilha financeira e consolidados pelo
            PostgreSQL Neon.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]">
            Mensal
          </button>

          <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]">
            <SlidersHorizontal size={16} />
            Filtros
          </button>
        </div>
      </div>

      <div
        className="relative overflow-visible rounded-[1.5rem] border border-white/[0.06] bg-[#080d17] p-3 sm:p-4 xl:p-5"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute z-30 w-[292px] rounded-2xl border border-cyan-300/20 bg-[#070b13]/95 p-4 text-xs text-white shadow-[0_0_50px_rgba(34,211,238,0.22)] backdrop-blur-xl"
            style={{
              left: `${tooltipLeft}%`,
              top: `${tooltipTop}%`,
              transform: tooltipBelow
                ? "translate(-50%, 22px)"
                : "translate(-50%, calc(-100% - 22px))",
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              <strong className="font-semibold uppercase tracking-[0.18em] text-white">
                {hoveredPoint.month} / {hoveredPoint.label}
              </strong>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-slate-500">Faturamento total</span>
              <strong className="dashboard-number text-white">
                {formatCurrency(hoveredPoint.value)}
              </strong>
            </div>

            <div className="py-3">
              <span className="text-slate-500">Cliente mais lucrativo</span>
              <strong className="mt-1 block text-sm font-semibold text-white">
                {hoveredPoint.topClient.name}
              </strong>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Receita
                </span>
                <strong className="dashboard-number mt-1 block text-cyan-200">
                  {formatCompactCurrency(hoveredPoint.topClient.revenue)}
                </strong>
              </div>

              <div>
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Lucro
                </span>
                <strong className="dashboard-number mt-1 block text-violet-300">
                  {formatCompactCurrency(hoveredPoint.topClient.profit)}
                </strong>
              </div>

              <div>
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Margem
                </span>
                <strong className="dashboard-number mt-1 block text-white">
                  {hoveredPoint.topClient.margin}
                </strong>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-slate-300">
              <span>Ver detalhes do mês</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto overflow-y-visible">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[300px] min-w-[860px] w-full overflow-visible sm:h-[320px] xl:h-[350px]"
            role="img"
            aria-label="Gráfico anual de faturamento"
          >
            <defs>
              <linearGradient
                id="chartLineEnterprise"
                x1="0"
                x2="1"
                y1="0"
                y2="0"
              >
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>

              <linearGradient
                id="chartAreaEnterprise"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.012" />
              </linearGradient>
            </defs>

            {axisValues.map((value) => {
              const normalized = (value - minValue) / (maxValue - minValue);
              const y =
                height - paddingY - normalized * (height - paddingY * 2);

              return (
                <g key={value}>
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1"
                  />

                  <text
                    x="0"
                    y={y + 4}
                    fill="rgba(203,213,225,0.55)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {formatAxisValue(value)}
                  </text>
                </g>
              );
            })}

            {points.map((point) => (
              <line
                key={`grid-${point.label}`}
                x1={point.x}
                x2={point.x}
                y1={paddingY}
                y2={height - paddingY}
                stroke="rgba(255,255,255,0.032)"
                strokeWidth="1"
              />
            ))}

            {areaPath ? (
              <path d={areaPath} fill="url(#chartAreaEnterprise)" />
            ) : null}

            <path
              d={path}
              fill="none"
              stroke="url(#chartLineEnterprise)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {lastVisiblePoint ? (
              <line
                x1={lastVisiblePoint.x}
                y1={height - paddingY}
                x2={width - paddingX}
                y2={height - paddingY}
                stroke="rgba(148,163,184,0.35)"
                strokeWidth="2"
                strokeDasharray="6 8"
              />
            ) : null}

            {points.map((point) => (
              <g key={point.label}>
                {typeof point.y === "number" && typeof point.value === "number" ? (
                  <>
                    <line
                      x1={point.x}
                      y1={point.y}
                      x2={point.x}
                      y2={height - paddingY}
                      stroke={
                        hoveredPoint?.label === point.label
                          ? "rgba(34,211,238,0.35)"
                          : "transparent"
                      }
                      strokeWidth="1.5"
                      strokeDasharray="4 5"
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="18"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        if (
                          typeof point.value !== "number" ||
                          typeof point.y !== "number"
                        ) {
                          return;
                        }

                        const activePoint: ActiveChartPoint = {
                          ...point,
                          value: point.value,
                          y: point.y,
                          topClient:
                            point.topClient ??
                            {
                              name: "Sem cliente identificado",
                              revenue: point.revenue,
                              profit: point.profit,
                              margin: formatPercent(point.margin),
                            },
                        };

                        setHoveredPoint(activePoint);
                      }}
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={hoveredPoint?.label === point.label ? "7" : "5"}
                      fill="#080d17"
                      stroke={
                        hoveredPoint?.label === point.label
                          ? "#a78bfa"
                          : "#22d3ee"
                      }
                      strokeWidth="3"
                      className="pointer-events-none"
                    />

                    <text
                      x={point.x}
                      y={point.y - 16}
                      textAnchor="middle"
                      fill="rgba(226,232,240,0.82)"
                      fontSize="11"
                      fontWeight="650"
                      className="pointer-events-none"
                    >
                      {formatCompactCurrency(point.value)}
                    </text>
                  </>
                ) : (
                  <circle
                    cx={point.x}
                    cy={height - paddingY}
                    r="5"
                    fill="#080d17"
                    stroke="rgba(148,163,184,0.35)"
                    strokeWidth="2"
                  />
                )}

                <text
                  x={point.x}
                  y={height - 6}
                  textAnchor="middle"
                  fill={
                    typeof point.value === "number"
                      ? "rgba(203,213,225,0.78)"
                      : "rgba(100,116,139,0.7)"
                  }
                  fontSize="11"
                  fontWeight="650"
                >
                  {point.month}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

export function DashboardOverview() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadOverview() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/finance/overview?year=2026", {
        cache: "no-store",
      });

      const json = (await response.json()) as FinanceOverview & {
        message?: string;
      };

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar dados financeiros.");
        return;
      }

      setOverview(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API financeira.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const monthly = overview?.monthly?.length ? overview.monthly : emptyMonths;

  const summary = overview?.summary ?? null;

  const kpis: DashboardKpi[] = useMemo(() => {
    if (!summary) {
      return [];
    }

    const fmt = (value: number) => formatCurrency(value);

    return [
      {
        label: "Faturamento",
        value: fmt(summary.totalRevenue),
        helper: "Total faturado no ano (competência)",
        trend: "Independe de ter sido recebido",
        trendDirection: "up",
      },
      {
        label: "Recebido em caixa",
        value: fmt(summary.receivedTotal),
        helper: "Entradas efetivamente recebidas",
        trend: `${formatPercent(
          summary.totalRevenue > 0
            ? (summary.receivedTotal / summary.totalRevenue) * 100
            : 0,
        )} do faturamento`,
        trendDirection: "up",
      },
      {
        label: "A receber",
        value: fmt(summary.receivableTotal),
        helper: "Faturado ainda não recebido",
        trend:
          summary.overdueTotal > 0
            ? `${fmt(summary.overdueTotal)} em atraso`
            : "Sem atrasos",
        trendDirection: summary.overdueTotal > 0 ? "down" : "neutral",
      },
      {
        label: "Saídas pagas",
        value: fmt(summary.paidExpenses),
        helper: "Despesas já pagas",
        trend: "Saídas com status pago",
        trendDirection: "down",
      },
      {
        label: "A pagar",
        value: fmt(summary.payableTotal),
        helper: "Saídas pendentes (contas a pagar)",
        trend: "Compromissos futuros",
        trendDirection: summary.payableTotal > 0 ? "down" : "neutral",
      },
      {
        label: "Resultado de caixa real",
        value: fmt(summary.cashResult),
        helper: "Recebido menos saídas já pagas",
        trend: "Caixa realizado",
        trendDirection: summary.cashResult < 0 ? "down" : "up",
      },
      {
        label: "Caixa comprometido",
        value: fmt(summary.committedCash),
        helper: "Recebido menos todas as saídas lançadas",
        trend: "Inclui contas a pagar",
        trendDirection: summary.committedCash < 0 ? "down" : "neutral",
      },
      {
        label: "Lucro por competência",
        value: fmt(summary.totalProfit),
        helper: "Faturamento menos todas as saídas lançadas",
        trend: "Resultado do período",
        trendDirection: summary.totalProfit < 0 ? "down" : "up",
      },
      {
        label: "Margem por competência",
        value: formatPercent(summary.margin),
        helper: "Lucro por competência sobre faturamento",
        trend: "Lucro / faturamento",
        trendDirection: summary.margin < 0 ? "down" : "neutral",
      },
    ];
  }, [summary]);

  const receivableRows = useMemo(
    () => overview?.latestEntries?.slice(0, 5) ?? [],
    [overview],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Dashboard executivo
          </p>

          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.055em] text-white sm:text-[34px]">
            Olá, Vinicius!
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400 sm:text-base">
            Acompanhe os resultados e a saúde financeira da 2K Studios com dados
            reais da planilha importada.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadOverview}
            className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            {loading ? "Atualizando..." : "Atualizar dados"}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300">
            01 Jan — 31 Dez 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item, index) => {
          const Icon = kpiIcons[index] ?? DollarSign;

          return (
            <article
              key={item.label}
              className="min-h-[138px] rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] xl:p-6"
            >
              <div className="flex h-full items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="dashboard-label text-[11px] text-slate-500">
                    {item.label}
                  </p>

                  <strong className="dashboard-number mt-3 block truncate text-[24px] font-semibold tracking-[-0.045em]">
                    {item.value}
                  </strong>

                  <p
                    className={`mt-2 text-xs font-medium ${
                      item.trendDirection === "up"
                        ? "text-emerald-300"
                        : item.trendDirection === "down"
                          ? "text-rose-300"
                          : "text-cyan-300"
                    }`}
                  >
                    {item.trend}
                  </p>

                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {item.helper}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                  <Icon size={22} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <RevenueChart monthly={monthly} />

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="text-violet-300" size={21} />
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Top grupos por faturamento
              </h2>
            </div>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
              Ver todos
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[0.4fr_2fr_1fr_1fr_1.4fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>#</span>
                <span>Grupo</span>
                <span>Faturamento</span>
                <span>Recebido</span>
                <span>Participação</span>
              </div>

              {(overview?.topGroups ?? []).slice(0, 5).map((group) => (
                <div
                  key={group.name}
                  className="grid grid-cols-[0.4fr_2fr_1fr_1fr_1.4fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <span className="text-slate-500">{group.rank}</span>

                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-200">
                      {getInitials(group.name)}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold">
                        {group.name}
                      </strong>
                      <span className="text-[11px] font-medium text-slate-500">
                        {group.projectsCount} proj. · ticket{" "}
                        {formatCompactCurrency(group.ticketMedio)}
                      </span>
                    </div>
                  </div>

                  <span className="dashboard-number text-slate-300">
                    {formatCompactCurrency(group.revenue)}
                  </span>

                  <span className="dashboard-number font-semibold text-emerald-300">
                    {formatCompactCurrency(group.received)}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="dashboard-number w-12 text-slate-300">
                      {formatPercent(group.participationPercent)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-300"
                        style={{
                          width: `${clamp(group.participationPercent, 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {!overview?.topGroups?.length ? (
                <div className="px-5 py-6 text-sm font-medium text-slate-500">
                  Nenhum grupo financeiro encontrado.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-violet-300" size={21} />
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                Próximos recebimentos
              </h2>
            </div>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
              Ver todos
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Cliente</span>
                <span>Previsão</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {receivableRows.map((item) => {
                const clientName =
                  item.groupName ||
                  item.client ||
                  item.project ||
                  item.category ||
                  "Sem cliente";

                const dueLabel = item.dueAt
                  ? new Date(item.dueAt).toLocaleDateString("pt-BR")
                  : (item.competence ?? "—");

                return (
                  <div
                    key={`${item.id}-${item.sourceRow}`}
                    className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-200">
                        {getInitials(clientName)}
                      </span>
                      <strong className="truncate font-semibold">
                        {clientName}
                      </strong>
                    </div>

                    <span className="dashboard-number text-slate-300">
                      {dueLabel}
                    </span>

                    <span className="dashboard-number font-semibold text-slate-200">
                      {formatCompactCurrency(item.revenue)}
                    </span>

                    <span
                      className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${
                        item.overdue
                          ? "bg-rose-400/10 text-rose-200"
                          : "bg-cyan-400/10 text-cyan-200"
                      }`}
                    >
                      {item.overdue ? "Atrasado" : item.status || "A receber"}
                    </span>
                  </div>
                );
              })}

              {!receivableRows.length ? (
                <div className="px-5 py-6 text-sm font-medium text-slate-500">
                  Nenhum recebimento encontrado.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}