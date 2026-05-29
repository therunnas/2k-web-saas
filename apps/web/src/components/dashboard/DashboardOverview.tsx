"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  DollarSign,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";

type MonthlyTopClient = {
  name: string;
  revenue: number;
  profit: number;
  margin: string;
  participationPercent?: number;
  projectsCount?: number;
};

type MonthlyRevenueItem = {
  month: string;
  label: string;
  value: number | null;
  revenue: number;
  received: number;
  receivable: number;
  expenses: number;
  profit: number;
  cash: number;
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
  revenueEntries?: number;
  expenseEntries?: number;
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
  received: 0,
  receivable: 0,
  expenses: 0,
  profit: 0,
  cash: 0,
  margin: 0,
  topClient: null,
}));

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return formatCurrency(value).replace(",00", "");
}

function formatChartCurrency(value: number) {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}k`;
  }

  return formatCompactCurrency(value);
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

function renderMoneyParts(value: string) {
  const currencyMatch = value.match(/^R\$\s?(.+)$/);

  if (!currencyMatch) return value;

  const [whole, cents] = currencyMatch[1].split(",");

  return (
    <>
      <span className="k-kpi-prefix">R$</span>
      {whole}
      {cents ? <span className="k-kpi-cents">,{cents}</span> : null}
    </>
  );
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function RevenueChart({
  monthly,
  summary,
}: {
  monthly: MonthlyRevenueItem[];
  summary: FinanceSummary | null;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<ActiveChartPoint | null>(null);

  const width = 920;
  const height = 280;
  const padding = { left: 56, right: 24, top: 32, bottom: 36 };
  const target = summary?.totalRevenue ? summary.totalRevenue / 12 : 25083.33;
  const now = new Date();
  const nowIndex = now.getFullYear() === 2026 ? now.getMonth() : 4;

  const maxValue = Math.max(
    130000,
    target * 1.18,
    ...monthly.map((item) => item.revenue || item.value || 0),
    ...monthly.map((item) => item.received || 0),
  );

  const x = (index: number) =>
    padding.left +
    (index * (width - padding.left - padding.right)) /
      Math.max(monthly.length - 1, 1);

  const y = (value: number) =>
    padding.top +
    (1 - value / maxValue) * (height - padding.top - padding.bottom);

  const points: ChartPoint[] = monthly.map((item, index) => {
    const value = typeof item.value === "number" ? item.value : item.revenue;
    return {
      ...item,
      value: value > 0 ? value : null,
      x: x(index),
      y: value > 0 ? y(value) : null,
    };
  });

  const receivedPoints = monthly
    .map((item, index) =>
      item.received > 0
        ? {
            x: x(index),
            y: y(item.received),
            value: item.received,
            index,
          }
        : null,
    )
    .filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
        value: number;
        index: number;
      } => Boolean(point),
    );

  const visiblePoints = points
    .map((point) => {
      if (typeof point.value !== "number" || typeof point.y !== "number") {
        return null;
      }

      return {
        ...point,
        value: point.value,
        y: point.y,
        topClient:
          point.topClient ??
          {
            name: "Sem cliente",
            revenue: point.revenue,
            profit: point.profit,
            margin: formatPercent(point.margin),
          },
      } as ActiveChartPoint;
    })
    .filter((point): point is ActiveChartPoint => Boolean(point));

  const linePath = (items: Array<{ x: number; y: number }>) =>
    items
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");

  const areaPath = (items: Array<{ x: number; y: number }>) =>
    items.length > 1
      ? `${linePath(items)} L${items[items.length - 1].x},${y(0)} L${
          items[0].x
        },${y(0)} Z`
      : "";

  const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];
  const hoveredIndex = hoveredPoint ? monthly.findIndex((item) => item.label === hoveredPoint.label) : -1;
  const hoveredReceived = hoveredIndex >= 0 ? monthly[hoveredIndex]?.received ?? 0 : 0;
  const tooltipLeft = hoveredPoint ? clamp((hoveredPoint.x / width) * 100, 18, 78) : 50;

  function handleChartMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * width;
    let closest = visiblePoints[0] ?? null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const point of visiblePoints) {
      const distance = Math.abs(point.x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = point;
      }
    }

    setHoveredPoint(closest);
  }

  return (
    <section className="k-chart-card">
      <div className="k-section-head">
        <div>
          <h2>Faturamento anual</h2>
          <div className="k-section-sub">
            Dados reais importados da planilha financeira e consolidados pelo PostgreSQL Neon.
          </div>
        </div>

        <div className="k-chart-tabs" aria-label="Visualização do gráfico">
          <button type="button" className="k-chart-tab" aria-pressed="true">
            Mensal
          </button>
          <button type="button" className="k-chart-tab" aria-pressed="false">
            Trimestral
          </button>
          <button type="button" className="k-chart-tab" aria-pressed="false">
            Acumulado
          </button>
        </div>
      </div>

      <div className="k-chart-meta">
        <div className="k-chart-metric" data-tone="cyan">
          <span className="k-chart-metric-label">Faturamento</span>
          <span className="k-chart-metric-value">
            {formatCurrency(summary?.totalRevenue ?? 0)}
          </span>
        </div>
        <div className="k-chart-metric" data-tone="purple">
          <span className="k-chart-metric-label">Recebido em caixa</span>
          <span className="k-chart-metric-value">
            {formatCurrency(summary?.receivedTotal ?? 0)}
          </span>
        </div>

        <div className="k-chart-legend">
          <span><i className="k-legend-line" />Faturado</span>
          <span><i className="k-legend-dash" style={{ color: "var(--purple)" }} />Recebido</span>
          <span><i className="k-legend-dash" />Meta</span>
        </div>
      </div>

      <div className="k-chart-shell" onMouseLeave={() => setHoveredPoint(null)}>
        {hoveredPoint ? (
          <div
            className="k-chart-tooltip"
            style={{
              left: `calc(${tooltipLeft}% + 12px)`,
              top: 70,
            }}
          >
            <div className="k-chart-tooltip-title">{hoveredPoint.month} / 2026</div>
            <div className="k-chart-tooltip-row">
              <span className="k-chart-tooltip-swatch" style={{ background: "linear-gradient(90deg, var(--cyan), var(--purple))" }} />
              <span className="k-chart-tooltip-label">Faturado</span>
              <span className="k-chart-tooltip-value">{formatCurrency(hoveredPoint.value)}</span>
            </div>
            <div className="k-chart-tooltip-row">
              <span className="k-chart-tooltip-swatch" style={{ background: "var(--purple)" }} />
              <span className="k-chart-tooltip-label">Recebido</span>
              <span className="k-chart-tooltip-value">{formatCurrency(hoveredReceived)}</span>
            </div>
            <div className="k-chart-tooltip-row">
              <span className="k-chart-tooltip-swatch" style={{ background: "var(--fg-3)" }} />
              <span className="k-chart-tooltip-label">Meta</span>
              <span className="k-chart-tooltip-value">{formatCurrency(target)}</span>
            </div>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto min-w-[860px] w-full cursor-crosshair"
          role="img"
          aria-label="Gráfico anual de faturamento"
          onMouseMove={handleChartMove}
        >
          <defs>
            <linearGradient id="dashboardFatFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.13 200)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="oklch(0.82 0.13 200)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dashboardReceivedFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.18 295)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="oklch(0.72 0.18 295)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dashboardFatStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="oklch(0.82 0.13 200)" />
              <stop offset="100%" stopColor="oklch(0.72 0.18 295)" />
            </linearGradient>
          </defs>

          {[
            { label: "Q1", start: 0, end: 2, color: "oklch(0.82 0.13 200 / 0.04)" },
            { label: "Q2", start: 3, end: 5, color: "oklch(0.72 0.18 295 / 0.04)" },
            { label: "Q3", start: 6, end: 8, color: "oklch(0.82 0.13 200 / 0.02)" },
            { label: "Q4", start: 9, end: 11, color: "oklch(0.72 0.18 295 / 0.02)" },
          ].map((zone) => {
            const x1 = x(zone.start) - 28;
            const x2 = x(zone.end) + 28;
            return (
              <g key={zone.label}>
                <rect
                  x={x1}
                  y={padding.top}
                  width={x2 - x1}
                  height={height - padding.top - padding.bottom}
                  fill={zone.color}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={padding.top - 10}
                  className="qz"
                  textAnchor="middle"
                  fill="oklch(0.5 0.015 270)"
                >
                  {zone.label}
                </text>
              </g>
            );
          })}

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="oklch(0.27 0.018 270 / 0.4)"
                strokeDasharray="2 4"
              />
              <text
                x={padding.left - 10}
                y={y(tick) + 3}
                fill="oklch(0.5 0.015 270)"
                fontSize="9.5"
                fontFamily="var(--font-mono-dashboard)"
                textAnchor="end"
              >
                {tick === 0 ? "R$ 0" : formatChartCurrency(tick)}
              </text>
            </g>
          ))}

          {monthly.map((item, index) => (
            <line
              key={`vertical-${item.label}`}
              x1={x(index)}
              x2={x(index)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="oklch(0.27 0.018 270 / 0.22)"
            />
          ))}

          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(target)}
            y2={y(target)}
            stroke="oklch(0.6 0.02 270)"
            strokeDasharray="3 5"
            opacity="0.55"
          />
          <text
            x={width - padding.right - 6}
            y={y(target) - 6}
            fill="oklch(0.65 0.015 270)"
            fontSize="9.5"
            fontFamily="var(--font-mono-dashboard)"
            letterSpacing="0.08em"
            textAnchor="end"
          >
            META · {formatChartCurrency(target)}
          </text>

          {receivedPoints.length > 1 ? (
            <>
              <path d={areaPath(receivedPoints)} fill="url(#dashboardReceivedFill)" opacity="0.72" />
              <path
                d={linePath(receivedPoints)}
                fill="none"
                stroke="oklch(0.72 0.18 295)"
                strokeDasharray="4 4"
                strokeWidth="1.6"
                opacity="0.68"
              />
            </>
          ) : null}

          {visiblePoints.length > 1 ? (
            <>
              <path d={areaPath(visiblePoints)} fill="url(#dashboardFatFill)" opacity="0.82" />
              <path
                d={linePath(visiblePoints)}
                fill="none"
                stroke="url(#dashboardFatStroke)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
              />
            </>
          ) : null}

          {monthly.map((item, index) => (
            <text
              key={item.month}
              x={x(index)}
              y={height - 14}
              fill={points[index]?.value ? "oklch(0.7 0.015 270)" : "oklch(0.4 0.015 270)"}
              fontSize="10"
              fontWeight={index === nowIndex ? "600" : "400"}
              textAnchor="middle"
            >
              {item.month.toUpperCase()}
            </text>
          ))}

          {visiblePoints.map((point) => {
            const pointIndex = monthly.findIndex((item) => item.label === point.label);
            return (
              <g key={point.label} opacity={hoveredPoint && hoveredPoint.label !== point.label ? 0.42 : 1}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredPoint?.label === point.label ? 7 : 6}
                  fill="oklch(0.13 0.012 270)"
                  stroke="oklch(0.82 0.13 200)"
                  strokeWidth="2"
                />
                <circle cx={point.x} cy={point.y} r="2.5" fill="oklch(0.82 0.13 200)" />
                <text
                  x={point.x}
                  y={point.y - 14}
                  fill="oklch(0.86 0.01 270)"
                  fontSize="10"
                  fontFamily="var(--font-mono-dashboard)"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {formatChartCurrency(point.value)}
                </text>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="18"
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(point)}
                />
                {pointIndex === nowIndex ? (
                  <>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={padding.top}
                      y2={height - padding.bottom}
                      stroke="oklch(0.82 0.13 200 / 0.3)"
                      strokeDasharray="2 3"
                    />
                    <rect
                      x={point.x - 22}
                      y={padding.top - 4}
                      width="44"
                      height="14"
                      rx="3"
                      fill="oklch(0.82 0.13 200 / 0.22)"
                      stroke="oklch(0.82 0.13 200 / 0.5)"
                    />
                    <text
                      x={point.x}
                      y={padding.top + 6}
                      fill="oklch(0.86 0.01 270)"
                      fontSize="8.5"
                      fontFamily="var(--font-mono-dashboard)"
                      fontWeight="600"
                      letterSpacing="0.18em"
                      textAnchor="middle"
                    >
                      AGORA
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}

          {points.map((point) =>
            point.value === null ? (
              <circle
                key={`future-${point.label}`}
                cx={point.x}
                cy={y(0)}
                r="3"
                fill="oklch(0.18 0.014 270)"
                stroke="oklch(0.3 0.018 270)"
              />
            ) : null,
          )}
        </svg>
      </div>
    </section>
  );
}


function OperationStrip({
  overview,
  summary,
}: {
  overview: FinanceOverview | null;
  summary: FinanceSummary | null;
}) {
  const receivedRate =
    summary && summary.totalRevenue > 0
      ? (summary.receivedTotal / summary.totalRevenue) * 100
      : 0;

  const metrics = [
    {
      label: "Produções ativas",
      value: overview?.latestEntries?.length ?? 0,
      helper: "lançamentos recentes",
    },
    {
      label: "Faturamento recebido",
      value: `${formatPercent(receivedRate)}`,
      helper: "conversão em caixa",
    },
    {
      label: "Grupos em carteira",
      value: overview?.topGroups?.length ?? 0,
      helper: "com faturamento",
    },
    {
      label: "Alta prioridade",
      value: overview?.latestEntries?.filter((entry) => entry.overdue).length ?? 0,
      helper: "pendências em atraso",
    },
    {
      label: "Entradas processadas",
      value: summary?.entries ?? 0,
      helper: "ano fiscal 2026",
    },
  ];

  return (
    <div className="k-operation-strip">
      {metrics.map((metric) => (
        <div key={metric.label} className="k-operation-item">
          <p className="k-operation-label">{metric.label}</p>
          <strong
            className="k-operation-value"
            data-accent={metric.label === "Produções ativas" ? "cyan" : undefined}
          >
            {metric.value}
          </strong>
          <span className="k-kpi-helper k-kpi-helper-info">
            {metric.helper}
          </span>
        </div>
      ))}
    </div>
  );
}

function kpiHelperTone(item: DashboardKpi) {
  const label = item.label.toLowerCase();
  const trend = item.trend.toLowerCase();

  if (trend.includes("atras") || trend.includes("crític")) {
    return "k-kpi-helper-danger";
  }

  if (label.includes("receber") || label.includes("pagar") || trend.includes("pend")) {
    return "k-kpi-helper-warning";
  }

  if (item.trendDirection === "down") {
    return "k-kpi-helper-danger";
  }

  if (item.trendDirection === "up") {
    return "k-kpi-helper-positive";
  }

  return "k-kpi-helper-info";
}

function Sparkline({
  data,
  color = "var(--cyan)",
}: {
  data: number[];
  color?: string;
}) {
  const width = 260;
  const height = 56;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index * width) / Math.max(data.length - 1, 1);
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");

  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden="true">
      <path d={area} fill={color} opacity="0.08" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function KpiPanel({
  item,
  iconIndex,
  spark,
}: {
  item: DashboardKpi;
  iconIndex: number;
  spark: number[];
}) {
  const Icon = kpiIcons[iconIndex] ?? DollarSign;
  const tone =
    item.trendDirection === "up"
      ? "positive"
      : item.trendDirection === "down"
        ? "danger"
        : "warning";

  return (
    <article
      className="k-kpi-primary"
      style={{
        "--accent": "var(--cyan)",
        "--accent-soft": "var(--cyan-soft)",
        "--accent-edge": "var(--cyan-edge)",
      } as CSSProperties}
    >
      <span className="k-kpi-primary-corner" />

      <div className="k-kpi-primary-head">
        <span className="k-kpi-label">{item.label}</span>
        <span className="k-kpi-primary-icon">
          <Icon size={18} />
        </span>
      </div>

      <strong className="k-kpi-primary-value">
        {renderMoneyParts(item.value)}
      </strong>

      <div className="k-kpi-primary-foot">
        <span className="k-kpi-primary-desc">{item.helper}</span>
        <span className="k-kpi-delta" data-tone={tone}>
          {item.trend}
        </span>
      </div>

      <div className="k-kpi-spark">
        <Sparkline data={spark} />
      </div>
    </article>
  );
}

function ScoreCard({ summary }: { summary: FinanceSummary | null }) {
  const receivedRate =
    summary && summary.totalRevenue > 0
      ? (summary.receivedTotal / summary.totalRevenue) * 100
      : 0;

  const margin = summary?.margin ?? 0;
  const profitScore = clamp(margin, 0, 100);
  const cashScore =
    summary && summary.totalRevenue > 0
      ? clamp((summary.cashResult / summary.totalRevenue) * 100, 0, 100)
      : 0;

  const score = clamp(
    receivedRate * 0.42 + profitScore * 0.38 + cashScore * 0.2,
    0,
    100,
  );

  const rows = [
    {
      label: "Faturamento",
      value: formatPercent(summary?.totalRevenue ? 86.87 : 0),
      color: "var(--cyan)",
    },
    {
      label: "Recebimento",
      value: formatPercent(receivedRate),
      color: "oklch(0.78 0.14 220)",
    },
    {
      label: "Margem",
      value: formatPercent(margin),
      color: "var(--purple)",
    },
    {
      label: "Caixa real",
      value: formatCurrency(summary?.cashResult ?? 0),
      color: "oklch(0.7 0.18 280)",
    },
  ];
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <section className="k-score-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="k-eyebrow">
            Score do ciclo · AF 2026
          </p>
          <h2 className="mt-2 text-[14.5px] font-semibold tracking-[-0.01em] text-white">
            Performance de metas
          </h2>
        </div>

        <span className="k-badge" data-tone="success">
          Em ritmo
        </span>
      </div>

      <div className="k-score-wrap">
        <div className="k-score-gauge">
          <svg viewBox="0 0 132 132" className="block rotate-[-90deg]">
            <defs>
              <linearGradient id="dashboardGaugeGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.13 200)" />
                <stop offset="100%" stopColor="oklch(0.72 0.18 295)" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--bg-3)" strokeWidth="8" />
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke="url(#dashboardGaugeGrad)"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              strokeWidth="8"
              style={{ filter: "drop-shadow(0 0 4px oklch(0.82 0.13 200 / 0.24))" }}
            />
          </svg>

          <div className="k-score-num">
            <span className="value">{formatPercent(score)}</span>
            <span className="label">Média geral</span>
          </div>
        </div>

        <div className="k-score-rings">
          {rows.map((row) => (
            <div key={row.label} className="k-score-ring">
              <span className="swatch" style={{ background: row.color }} />
              <span className="label">{row.label}</span>
              <strong className="value">{row.value}</strong>
            </div>
          ))}

          <div className="k-diagnostic-box">
            <strong style={{ color: "var(--cyan)" }}>Diagnóstico:</strong>{" "}
            ciclo dentro da banda esperada; acompanhe recebimentos e despesas em aberto.
          </div>
        </div>
      </div>
    </section>
  );
}

function PipelineStrip({ entries }: { entries: LatestEntry[] }) {
  const pipeline = entries.slice(0, 5);

  if (!pipeline.length) {
    return null;
  }

  const fallbackStatusLabels = ["REC", "Pós", "Pré-prod", "Briefing", "Roteiro"];

  function getCompactStatus(entry: LatestEntry, index: number) {
    if (entry.overdue) return "Atraso";

    const raw = String(entry.status || "").trim().toLowerCase();

    if (!raw) return fallbackStatusLabels[index] || "Roteiro";
    if (raw.includes("pag")) return "Aguardando";
    if (raw.includes("brief")) return "Briefing";
    if (raw.includes("rote")) return "Roteiro";
    if (raw.includes("pré") || raw.includes("pre")) return "Pré-prod";
    if (raw.includes("pós") || raw.includes("pos")) return "Pós";
    if (raw.includes("rec")) return "REC";

    return fallbackStatusLabels[index] || "Roteiro";
  }

  return (
    <section
      className="relative overflow-hidden rounded-[16px] border border-white/[0.055] bg-[#080a0f] px-4 py-4 shadow-[0_18px_52px_rgba(0,0,0,0.34)]"
      style={{
        height: 264,
        minHeight: 264,
        maxHeight: 264,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-slate-100">
            Próximas produções
          </h2>

          <p className="mt-1 text-[10.5px] font-medium text-slate-500">
            {pipeline.length} captações em andamento ou em pré-produção
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-white/[0.06] bg-white/[0.018] px-3.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.045] hover:text-white"
        >
          Ver todas
          <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {pipeline.map((entry, index) => {
          const title =
            entry.project ||
            entry.description ||
            entry.groupName ||
            entry.client ||
            "Produção sem título";

          const dateLabel = entry.dueAt
            ? new Date(entry.dueAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })
            : entry.competence || "—";

          const percent = clamp(28 + index * 12, 18, 88);
          const status = getCompactStatus(entry, index);

          const code =
            entry.client?.slice(0, 2).toUpperCase() ||
            entry.groupName?.slice(0, 2).toUpperCase() ||
            "2K";

          return (
            <article
              key={`${entry.id}-${entry.sourceRow}-${index}`}
              className="relative flex h-[184px] min-h-0 flex-col overflow-hidden rounded-[10px] border border-white/[0.055] bg-[#0b0d13] px-3 py-2.5 transition hover:border-white/[0.10] hover:bg-[#0e1118]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[8px] font-semibold tracking-[0.10em] text-slate-500">
                  {code} · {dateLabel}
                </span>

                <span
                  data-overdue={entry.overdue ? "true" : "false"}
                  className="shrink-0 rounded-full px-2 py-[2px] text-[8px] font-semibold tracking-[0.04em] text-emerald-200 data-[overdue=true]:bg-rose-500/10 data-[overdue=true]:text-rose-200 data-[overdue=false]:bg-emerald-500/10"
                  title={status}
                >
                  {status}
                </span>
              </div>

              <h3
                className="mt-2 overflow-hidden text-[10px] font-medium leading-[17px] tracking-[-0.01em] text-slate-100"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  minHeight: "68px",
                  maxHeight: "68px",
                  fontFamily: "var(--font-dashboard)",
                  fontWeight: 500,
                }}
                title={title}
              >
                {title}
              </h3>

              <div className="mt-auto pt-2">
                <div className="flex items-end justify-between gap-3">
                  <strong className="font-mono text-[10.5px] font-semibold tracking-[0.03em] text-emerald-200">
                    {formatCompactCurrency(entry.revenue)}
                  </strong>

                  <span className="font-mono text-[8px] text-slate-500">
                    {percent}%
                  </span>
                </div>

                <div className="mt-1.5 h-[2.5px] overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgb(45,212,191),rgb(168,85,247))]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


export function DashboardOverview() {
  const [dashboardDisplayName, setDashboardDisplayName] = useState("Administrador");

  function normalizeDashboardDisplayName(value?: string | null) {
    const name = value?.trim();

    return name || "Administrador";
  }

  async function loadDashboardProfile() {
    try {
      const response = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const json = (await response.json().catch(() => null)) as {
        status?: string;
        user?: {
          name?: string | null;
        };
      } | null;

      if (response.ok && json?.status === "ok") {
        setDashboardDisplayName(normalizeDashboardDisplayName(json.user?.name));
      }
    } catch {
      setDashboardDisplayName("Administrador");
    }
  }

  useEffect(() => {
    loadOverview();
    loadDashboardProfile();

    function handleDashboardProfileUpdated(event: Event) {
      const profileEvent = event as CustomEvent<{
        name?: string | null;
      }>;

      setDashboardDisplayName(
        normalizeDashboardDisplayName(profileEvent.detail?.name),
      );
    }

    window.addEventListener("profile-updated", handleDashboardProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleDashboardProfileUpdated);
    };
  }, []);


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
const monthly = overview?.monthly?.length ? overview.monthly : emptyMonths;
  const summary = overview?.summary ?? null;
  const revenueSpark = monthly.map((item) => item.revenue || item.value || 0);
  const receivedSpark = monthly.map((item) => item.received || 0);
  const profitSpark = monthly.map((item) => item.profit || 0);

  const kpis: DashboardKpi[] = useMemo(() => {
    if (!summary) {
      return [];
    }

    const fmt = (value: number) => formatCurrency(value);

    return [
      {
        label: "Faturamento",
        value: fmt(summary.totalRevenue),
        helper: `Total faturado · ${summary.revenueEntries ?? summary.entries} entradas`,
        trend: `${summary.revenueEntries ?? summary.entries} entradas`,
        trendDirection: "up",
      },
      {
        label: "Recebido em caixa",
        value: fmt(summary.receivedTotal),
        helper: `${formatPercent(
          summary.totalRevenue > 0
            ? (summary.receivedTotal / summary.totalRevenue) * 100
            : 0,
        )} do faturamento`,
        trend: `${formatPercent(
          summary.totalRevenue > 0
            ? (summary.receivedTotal / summary.totalRevenue) * 100
            : 0,
        )}`,
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
        trend: "Saídas pagas",
        trendDirection: "neutral",
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
        trend: formatPercent(summary.margin),
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

  const primaryKpis = useMemo(
    () =>
      [
        { item: kpis[0], index: 0 },
        { item: kpis[1], index: 1 },
        { item: kpis[7], index: 7 },
      ].filter(
        (entry): entry is { item: DashboardKpi; index: number } =>
          Boolean(entry.item),
      ),
    [kpis],
  );

  const secondaryKpis = useMemo(
    () =>
      [
        { item: kpis[2], index: 2 },
        { item: kpis[3], index: 3 },
        { item: kpis[4], index: 4 },
        { item: kpis[5], index: 5 },
        { item: kpis[6], index: 6 },
        { item: kpis[8], index: 8 },
      ].filter(
        (entry): entry is { item: DashboardKpi; index: number } =>
          Boolean(entry.item),
      ),
    [kpis],
  );

  const receivableRows = useMemo(
    () => overview?.latestEntries?.slice(0, 6) ?? [],
    [overview],
  );

  return (
    <div className="k-page dashboard-overview-v2 space-y-5 sm:space-y-6">
      <header className="k-dashboard-hero">
        <div>
          <p className="k-eyebrow">
            Visão geral · Ano fiscal 2026
          </p>

          <h1 className="k-title">
            Olá, {dashboardDisplayName}.
          </h1>

          <p className="k-subtitle">
            Visão geral da operação financeira e audiovisual da 2K STUDIOS com
            dados reais da planilha importada.
          </p>
        </div>

        <div className="hero-actions flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadOverview}
            className="k-button-ghost"
          >
            {loading ? "Atualizando..." : "Atualizar dados"}
          </button>

          <div className="k-button-ghost">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>

          <div className="k-button-ghost">
            01 Jan — 31 Dez 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <OperationStrip overview={overview} summary={summary} />

      <div className="k-kpi-primary-grid">
        {primaryKpis.map(({ item, index }) => (
          <KpiPanel
            key={item.label}
            item={item}
            iconIndex={index}
            spark={
              item.label === "Recebido em caixa"
                ? receivedSpark
                : item.label === "Lucro por competência"
                  ? profitSpark
                  : revenueSpark
            }
          />
        ))}
      </div>

      <div className="k-kpi-strip">
        {secondaryKpis.map(({ item }) => (
          <article key={item.label} className="k-kpi-strip-item">
            <span className="k-kpi-label">{item.label}</span>
            <strong className="k-kpi-value">{renderKpiValue(item.value)}</strong>
            <span className={`k-kpi-helper ${kpiHelperTone(item)}`}>
              {item.trend}
            </span>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <RevenueChart monthly={monthly} summary={summary} />
        <ScoreCard summary={summary} />
      </div>

      <PipelineStrip entries={overview?.latestEntries ?? []} />

      <section className="grid items-stretch gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="relative min-h-[326px] overflow-hidden rounded-[16px] border border-white/[0.055] bg-[#080a0f] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.34)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-slate-100">
                Top grupos por faturamento
              </h2>

              <p className="mt-1 text-[11.5px] font-medium text-slate-500">
                5 de {overview?.topGroups?.length ?? 0} grupos · participação no ano fiscal 2026
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-white/[0.06] bg-white/[0.018] px-3.5 text-[11.5px] font-medium text-slate-300 transition hover:bg-white/[0.045] hover:text-white"
            >
              Ver todos
              <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[44px_2.25fr_1.1fr_1.1fr_1.2fr] px-2 pb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>#</span>
                <span>Grupo</span>
                <span className="text-right">Faturamento</span>
                <span className="text-right">Recebido</span>
                <span className="text-right">Participação</span>
              </div>

              {(overview?.topGroups ?? []).slice(0, 5).map((group) => (
                <div
                  key={group.name}
                  className="grid grid-cols-[44px_2.25fr_1.1fr_1.1fr_1.2fr] items-center border-t border-white/[0.045] px-2 py-[11px]"
                >
                  <span className="font-mono text-[10.5px] text-slate-500">
                    {String(group.rank).padStart(2, "0")}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#1a1d25] text-[10px] font-semibold text-slate-200 ring-1 ring-white/[0.08]">
                      {getInitials(group.name)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate text-[11.5px] font-semibold uppercase tracking-[-0.01em] text-slate-100">
                        {group.name}
                      </strong>

                      <span className="block truncate text-[10px] font-medium text-slate-500">
                        {group.projectsCount} projetos · ticket {formatCompactCurrency(group.ticketMedio)}
                      </span>
                    </div>
                  </div>

                  <span className="text-right font-mono text-[11.5px] font-semibold tracking-[0.03em] text-slate-100">
                    {formatCompactCurrency(group.revenue)}
                  </span>

                  <span className="text-right font-mono text-[11.5px] font-semibold tracking-[0.03em] text-emerald-200">
                    {formatCompactCurrency(group.received)}
                  </span>

                  <div className="flex items-center justify-end gap-3">
                    <span className="w-12 text-right font-mono text-[10.5px] text-slate-300">
                      {formatPercent(group.participationPercent)}
                    </span>

                    <div className="h-[3px] w-[82px] overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-emerald-300/80"
                        style={{
                          width: `${clamp(group.participationPercent, 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {!overview?.topGroups?.length ? (
                <div className="border-t border-white/[0.045] px-2 py-6 text-sm font-medium text-slate-500">
                  Nenhum grupo financeiro encontrado.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative min-h-[326px] overflow-hidden rounded-[16px] border border-white/[0.055] bg-[#080a0f] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.34)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-slate-100">
                Próximos recebimentos
              </h2>

              <p className="mt-1 text-[11.5px] font-medium text-slate-500">
                {receivableRows.length} pendências · {formatCurrency(summary?.receivableTotal ?? 0)} em aberto
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-white/[0.06] bg-white/[0.018] px-3.5 text-[11.5px] font-medium text-slate-300 transition hover:bg-white/[0.045] hover:text-white"
            >
              Vencimentos
              <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="space-y-[11px]">
            {receivableRows.slice(0, 6).map((item) => {
              const clientName =
                item.groupName ||
                item.client ||
                item.project ||
                item.category ||
                "Sem cliente";

              const dueLabel = item.dueAt
                ? new Date(item.dueAt).toLocaleDateString("pt-BR")
                : (item.competence ?? "—");

              const statusLabel = item.overdue ? "Atrasado" : item.status || "Aguardando";

              return (
                <div
                  key={`${item.id}-${item.sourceRow}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/[0.035] pb-[11px] last:border-b-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#1a1d25] text-[10px] font-semibold text-slate-200 ring-1 ring-white/[0.08]">
                      {getInitials(clientName)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate text-[11.5px] font-semibold uppercase tracking-[-0.01em] text-slate-100">
                        {clientName}
                      </strong>

                      <span className="block truncate text-[10px] font-medium text-slate-500">
                        {dueLabel} · {item.overdue ? "em atraso" : "em aberto"}
                      </span>
                    </div>
                  </div>

                  <strong className="whitespace-nowrap text-right font-mono text-[11.5px] font-semibold tracking-[0.03em] text-slate-100">
                    {formatCompactCurrency(item.revenue)}
                  </strong>

                  <span
                    data-overdue={item.overdue ? "true" : "false"}
                    className="inline-flex h-6 min-w-[82px] items-center justify-center rounded-full border px-2.5 text-[10px] font-semibold data-[overdue=false]:border-emerald-300/14 data-[overdue=false]:bg-emerald-400/[0.07] data-[overdue=false]:text-emerald-200 data-[overdue=true]:border-rose-300/16 data-[overdue=true]:bg-rose-400/[0.075] data-[overdue=true]:text-rose-200"
                  >
                    • {statusLabel}
                  </span>
                </div>
              );
            })}

            {!receivableRows.length ? (
              <div className="rounded-[12px] border border-white/[0.055] bg-white/[0.025] px-4 py-6">
                <h4 className="text-sm font-semibold text-slate-200">
                  Nenhum recebimento encontrado
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  Quando houver pendências recentes em aberto, elas aparecerão aqui.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="k-dashboard-footer">
        <span>Sincronizado · 14:32 BRT · {summary?.entries ?? 0} lançamentos processados</span>
        <span className="dashboard-code">2K STUDIOS · painel interno · v0.7.2</span>
      </footer>
    </div>
  );
}
