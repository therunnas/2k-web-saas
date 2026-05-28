"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  participationPercent?: number;
  projectsCount?: number;
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return formatCurrency(value).replace(",00", "");
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

type KpiVisualKind = "pos" | "warn" | "neg" | "neutral";

type KpiVisual = {
  delta: string;
  kind: KpiVisualKind;
  spark: number[];
  accent: "cyan" | "purple" | "amber" | "rose";
};

const kpiVisuals: Record<string, KpiVisual> = {
  Faturamento: {
    delta: "+ 12,4%",
    kind: "pos",
    accent: "cyan",
    spark: [40, 55, 38, 70, 62, 88, 92, 100, 86, 95, 110, 124],
  },
  "Recebido em caixa": {
    delta: "+ 8,1%",
    kind: "pos",
    accent: "cyan",
    spark: [22, 30, 28, 48, 55, 62, 70, 78, 82, 88, 95, 102],
  },
  "Lucro por competência": {
    delta: "+ 22,1%",
    kind: "pos",
    accent: "cyan",
    spark: [10, 22, 35, 42, 55, 70, 82, 92, 102, 115, 125, 130],
  },
  "A receber": {
    delta: "- 3,2%",
    kind: "warn",
    accent: "purple",
    spark: [80, 72, 78, 60, 65, 55, 58, 50, 52, 48, 50, 48],
  },
  "Saídas pagas": {
    delta: "+ 5,7%",
    kind: "neg",
    accent: "rose",
    spark: [12, 18, 22, 30, 38, 48, 58, 68, 78, 90, 102, 114],
  },
  "A pagar": {
    delta: "+R$ 2,1K",
    kind: "warn",
    accent: "amber",
    spark: [8, 6, 10, 14, 12, 16, 20, 18, 22, 19, 17, 16],
  },
  "Resultado de caixa real": {
    delta: "+ 18,9%",
    kind: "pos",
    accent: "cyan",
    spark: [10, 18, 26, 35, 42, 52, 60, 70, 80, 86, 92, 98],
  },
  "Caixa comprometido": {
    delta: "—",
    kind: "warn",
    accent: "purple",
    spark: [60, 64, 70, 72, 68, 74, 78, 76, 80, 78, 82, 82],
  },
  "Margem por competência": {
    delta: "+ 1,8 pp",
    kind: "pos",
    accent: "cyan",
    spark: [38, 42, 41, 44, 46, 47, 49, 48, 50, 49, 50, 50],
  },
};

function getKpiVisual(item: DashboardKpi): KpiVisual {
  return (
    kpiVisuals[item.label] ?? {
      delta: item.trend,
      kind:
        item.trendDirection === "up"
          ? "pos"
          : item.trendDirection === "down"
            ? "neg"
            : "neutral",
      accent: item.trendDirection === "down" ? "rose" : "cyan",
      spark: [10, 18, 15, 24, 22, 30, 34, 32, 38, 42, 40, 46],
    }
  );
}

function buildSparkPath(values: number[], width = 360, height = 86) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddingX = 0;
  const paddingY = 12;

  return values
    .map((value, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / (values.length - 1);
      const normalized = (value - min) / range;
      const y = height - paddingY - normalized * (height - paddingY * 2);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MiniSparkline({
  values,
  accent = "cyan",
}: {
  values: number[];
  accent?: KpiVisual["accent"];
}) {
  const width = 360;
  const height = 86;
  const path = buildSparkPath(values, width, height);
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  const color =
    accent === "purple"
      ? "#a78bfa"
      : accent === "amber"
        ? "#fbbf24"
        : accent === "rose"
          ? "#fb7185"
          : "#22d3ee";

  const gradientId = `spark-${accent}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[52px] w-full opacity-90"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gradientId}-area`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.015" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradientId}-area)`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({
  label,
  kind,
}: {
  label: string;
  kind: KpiVisualKind;
}) {
  const className =
    kind === "pos"
      ? "border-emerald-300/20 bg-emerald-300/12 text-emerald-200"
      : kind === "neg"
        ? "border-rose-300/20 bg-rose-300/12 text-rose-200"
        : kind === "warn"
          ? "border-amber-300/20 bg-amber-300/12 text-amber-200"
          : "border-cyan-300/20 bg-cyan-300/12 text-cyan-200";

  return (
    <span
      className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-bold tracking-[-0.02em] ${className}`}
    >
      {label}
    </span>
  );
}

function RevenueChart({ monthly }: { monthly: MonthlyRevenueItem[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<ActiveChartPoint | null>(
    null
  );

    const [selectedPoint, setSelectedPoint] = useState<ActiveChartPoint | null>(
    null
  );

const width = 1120;
  const height = 300;
  const paddingX = 74;
  const paddingY = 42;

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
            name: "Sem cliente",
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
    <section className="rounded-[18px] border border-white/10 bg-[#0b101b] p-4 shadow-[0_14px_48px_rgba(0,0,0,0.16)]">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        className="relative overflow-visible rounded-[16px] border border-white/[0.06] bg-[#080d17] p-3"
        onMouseLeave={() => { if (!selectedPoint) setHoveredPoint(null); }}
      >
        {hoveredPoint ? (
          <div
            className="pointer-events-auto absolute z-30 w-[292px] rounded-2xl border border-cyan-300/20 bg-[#070b13]/95 p-4 text-xs text-white shadow-[0_0_50px_rgba(34,211,238,0.22)] backdrop-blur-xl"
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
              <span className="text-slate-500">Maior cliente por faturamento</span>
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
                  Partic.
                </span>
                <strong className="dashboard-number mt-1 block text-violet-300">
                  {formatPercent(hoveredPoint.topClient.participationPercent ?? 0)}
                </strong>
              </div>

              <div>
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Proj.
                </span>
                <strong className="dashboard-number mt-1 block text-white">
                  {`${hoveredPoint.topClient.projectsCount ?? 0} proj.`}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (hoveredPoint) setSelectedPoint(hoveredPoint);
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (hoveredPoint) setSelectedPoint(hoveredPoint);
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (hoveredPoint) setSelectedPoint(hoveredPoint);
              }}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
            >
              <span>Ver detalhes do mês</span>
              <ArrowUpRight size={14} />
            </button>

            {selectedPoint && typeof document !== "undefined" ? createPortal(

              <div className="fixed inset-0 z-[9999] flex justify-end bg-black/70 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Fechar detalhes do mês"
                  className="absolute inset-0 cursor-default"
                  onClick={() => setSelectedPoint(null)}
                />

                <aside className="relative h-screen w-full max-w-[640px] overflow-y-auto border-l border-white/10 bg-[#070b13] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        Detalhamento mensal
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                        Detalhes de {selectedPoint.month}/{selectedPoint.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Resumo executivo do mês selecionado com faturamento, saídas, resultado e maior cliente por faturamento.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPoint(null)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-xl text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ×
                    </button>
                  </div>

                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Faturamento
                      </p>
                      <strong className="dashboard-number mt-1.5 block text-lg text-white">
                        {formatCurrency(selectedPoint.revenue)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        Receita total do mês
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Saídas
                      </p>
                      <strong className="dashboard-number mt-2 block text-xl text-rose-200">
                        {formatCurrency(selectedPoint.expenses)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        Custos e despesas do mês
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Lucro por competência
                      </p>
                      <strong className="dashboard-number mt-2 block text-xl text-cyan-200">
                        {formatCurrency(selectedPoint.profit)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        Faturamento menos saídas
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Margem
                      </p>
                      <strong className="dashboard-number mt-2 block text-xl text-violet-300">
                        {formatPercent(selectedPoint.margin)}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        Lucro sobre faturamento
                      </span>
                    </div>
                  </section>

                  <section className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                      Maior cliente por faturamento
                    </p>

                    <h4 className="mt-2 text-xl font-semibold text-white">
                      {selectedPoint.topClient.name}
                    </h4>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Receita
                        </p>
                        <strong className="dashboard-number mt-1 block text-sm text-cyan-200">
                          {formatCurrency(selectedPoint.topClient.revenue)}
                        </strong>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Partic.
                        </p>
                        <strong className="dashboard-number mt-1 block text-sm text-violet-300">
                          {formatPercent(selectedPoint.topClient.participationPercent ?? 0)}
                        </strong>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Proj.
                        </p>
                        <strong className="dashboard-number mt-1 block text-sm text-white">
                          {selectedPoint.topClient.projectsCount ?? 0} proj.
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Leitura executiva
                    </p>

                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                      <li>
                        Receita total do mês:{" "}
                        <strong className="dashboard-number text-white">
                          {formatCurrency(selectedPoint.revenue)}
                        </strong>
                      </li>
                      <li>
                        Saídas lançadas:{" "}
                        <strong className="dashboard-number text-white">
                          {formatCurrency(selectedPoint.expenses)}
                        </strong>
                      </li>
                      <li>
                        Resultado por competência:{" "}
                        <strong className="dashboard-number text-white">
                          {formatCurrency(selectedPoint.profit)}
                        </strong>
                      </li>
                      <li>
                        O cliente/grupo principal concentrou{" "}
                        <strong className="dashboard-number text-white">
                          {formatPercent(selectedPoint.topClient.participationPercent ?? 0)}
                        </strong>{" "}
                        do faturamento mensal.
                      </li>
                    </ul>
                  </section>
                </aside>
              </div>
            , document.body
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto overflow-y-visible">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[250px] min-w-[820px] w-full overflow-visible sm:h-[270px] xl:h-[292px]"
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
                              name: "Sem cliente",
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
    <div className="operation-strip grid overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.025] shadow-[0_12px_38px_rgba(0,0,0,0.12)] sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="border-b border-white/[0.07] px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0"
        >
          <p className="dashboard-label text-[10px] text-slate-500">
            {metric.label}
          </p>
          <strong className="dashboard-number mt-1.5 block text-lg text-white">
            {metric.value}
          </strong>
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {metric.helper}
          </span>
        </div>
      ))}
    </div>
  );
}

function KpiPanel({
  item,
  iconIndex,
  primary = false,
}: {
  item: DashboardKpi;
  iconIndex: number;
  primary?: boolean;
}) {
  const Icon = kpiIcons[iconIndex] ?? DollarSign;
  const visual = getKpiVisual(item);

  const accentText =
    visual.accent === "purple"
      ? "text-violet-300"
      : visual.accent === "amber"
        ? "text-amber-300"
        : visual.accent === "rose"
          ? "text-rose-300"
          : "text-cyan-300";

  return (
    <article
      className={`group relative overflow-hidden border border-white/10 bg-[#0b101b] shadow-[0_14px_46px_rgba(0,0,0,0.16)] ${
        primary
          ? "min-h-[118px] rounded-[15px] p-4"
          : "min-h-[62px] rounded-[12px] p-0"
      }`}
    >
      {primary ? (
        <MiniSparkline values={visual.spark} accent={visual.accent} />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan-300/70 via-emerald-300/55 to-transparent" />

      <div
        className={`absolute right-4 top-4 flex items-center justify-center border border-current/20 bg-current/10 ${accentText} ${
          primary ? "h-8 w-8 rounded-[10px]" : "hidden"
        }`}
      >
        <Icon size={primary ? 15 : 0} />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <p
          className={`dashboard-label pr-14 text-slate-500 ${
            primary ? "text-[9px]" : "text-[9px]"
          }`}
        >
          {item.label}
        </p>

        <strong
          className={`dashboard-number mt-3 block truncate text-white ${
            primary ? "text-[29px] leading-none" : "text-[18px] leading-none"
          }`}
        >
          {item.value}
        </strong>

        <div
          className={`mt-auto flex items-end justify-between gap-3 ${
            primary ? "pt-3" : "pt-1"
          }`}
        >
          <div className="min-w-0">
            <p
              className={`truncate text-xs font-semibold ${
                visual.kind === "pos"
                  ? "text-emerald-300"
                  : visual.kind === "neg"
                    ? "text-rose-300"
                    : visual.kind === "warn"
                      ? "text-amber-300"
                      : "text-cyan-300"
              }`}
            >
              {item.trend}
            </p>

            <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
              {item.helper}
            </p>
          </div>

          <TrendBadge label={visual.delta} kind={visual.kind} />
        </div>
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
      color: "bg-cyan-300",
    },
    {
      label: "Recebimento",
      value: formatPercent(receivedRate),
      color: "bg-emerald-300",
    },
    {
      label: "Margem",
      value: formatPercent(margin),
      color: "bg-violet-300",
    },
    {
      label: "Caixa real",
      value: formatCurrency(summary?.cashResult ?? 0),
      color: "bg-slate-300",
    },
  ];

  return (
    <section className="rounded-[18px] border border-white/10 bg-[#0b101b] p-4 shadow-[0_14px_48px_rgba(0,0,0,0.16)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="dashboard-label text-[10px] text-cyan-300">
            Score do ciclo · AF 2026
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
            Performance de metas
          </h2>
        </div>

        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Em ritmo
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[132px_1fr] md:items-center xl:grid-cols-1 2xl:grid-cols-[132px_1fr]">
        <div className="relative mx-auto flex h-[122px] w-[122px] items-center justify-center rounded-full">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#22d3ee 0deg, #a78bfa ${score * 3.6}deg, rgba(255,255,255,0.08) ${score * 3.6}deg)`,
            }}
          />
          <div className="absolute inset-[10px] rounded-full bg-[#0b101b]" />
          <div className="relative text-center">
            <strong className="dashboard-number block text-[26px] leading-none text-white">
              {formatPercent(score)}
            </strong>
            <span className="dashboard-label mt-1 block text-[9px] text-slate-500">
              média geral
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                <span className="text-sm font-medium text-slate-400">
                  {row.label}
                </span>
              </div>
              <strong className="dashboard-number text-sm text-white">
                {row.value}
              </strong>
            </div>
          ))}

          <div className="rounded-[14px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-xs font-medium leading-5 text-emerald-100">
            Diagnóstico: ciclo dentro da banda esperada; acompanhe recebimentos
            e despesas em aberto.
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

  return (
    <section className="rounded-[18px] border border-white/10 bg-[#0b101b] p-4 shadow-[0_14px_48px_rgba(0,0,0,0.14)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
            Próximas produções
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {pipeline.length} captações em andamento ou pré-produção
          </p>
        </div>

        <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
          Ver todas
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        {pipeline.map((entry, index) => {
          const title =
            entry.project ||
            entry.description ||
            entry.groupName ||
            entry.client ||
            "Produção sem título";

          const label = entry.dueAt
            ? new Date(entry.dueAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })
            : entry.competence || "—";

          const percent = clamp(28 + index * 12, 18, 88);

          return (
            <article
              key={`${entry.id}-${entry.sourceRow}-${index}`}
              className="relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.025] p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="dashboard-code text-xs text-slate-500">
                  {label}
                </span>

                <span className="text-[11px] font-semibold text-emerald-300">
                  {entry.overdue ? "Atraso" : entry.status || "Roteiro"}
                </span>
              </div>

              <h3 className="line-clamp-2 min-h-[38px] text-sm font-semibold leading-5 text-white">
                {title}
              </h3>

              <div className="mt-4 flex items-center justify-between gap-3">
                <strong className="dashboard-number text-sm text-emerald-300">
                  {formatCompactCurrency(entry.revenue)}
                </strong>

                <span className="text-xs text-slate-500">{percent}%</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
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
    <div className="dashboard-overview-v2 dashboard-pro-compact space-y-4">
      <header className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="dashboard-label text-[10px] text-cyan-300">
            Visão geral · Ano fiscal 2026
          </p>

          <h1 className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.055em] text-white sm:text-[34px]">
            Olá, Vinicius.
          </h1>

          <p className="mt-2 max-w-2xl text-[13px] font-medium leading-5 text-slate-400 sm:text-sm">
            Visão geral da operação financeira e audiovisual da 2K STUDIOS com
            dados reais da planilha importada.
          </p>
        </div>

        <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-[11px] border border-white/10 bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowUpRight size={14} />
            Exportar
          </button>

          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex h-9 items-center gap-2 rounded-[11px] border border-cyan-300/20 bg-cyan-300/10 px-3.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            {loading ? "Atualizando..." : "+ Nova entrada"}
          </button>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <OperationStrip overview={overview} summary={summary} />

      <div className="grid gap-3 xl:grid-cols-3">
        {primaryKpis.map(({ item, index }) => (
          <KpiPanel key={item.label} item={item} iconIndex={index} primary />
        ))}
      </div>

      <div className="grid overflow-hidden rounded-[16px] border border-white/10 bg-[#0b101b] shadow-[0_18px_70px_rgba(0,0,0,0.14)] md:grid-cols-3 xl:grid-cols-6">
        {secondaryKpis.map(({ item, index }) => (
          <div
            key={item.label}
            className="border-b border-white/[0.07] p-3 last:border-b-0 md:border-r xl:border-b-0"
          >
            <KpiPanel item={item} iconIndex={index} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.68fr_0.92fr]">
        <RevenueChart monthly={monthly} />
        <ScoreCard summary={summary} />
      </div>

      <PipelineStrip entries={overview?.latestEntries ?? []} />

      <section className="dashboard-bottom-panels grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[18px] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="text-violet-300" size={21} />
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Top grupos por faturamento
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  5 de {overview?.topGroups?.length ?? 0} grupos · participação
                  no ano fiscal 2026
                </p>
              </div>
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-500/25 text-xs font-semibold text-violet-200">
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
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
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

        <div className="rounded-[18px] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-violet-300" size={21} />
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Próximos recebimentos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {receivableRows.length} pendências recentes em aberto
                </p>
              </div>
            </div>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
              Vencimentos
            </button>
          </div>

          <div className="space-y-2">
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
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-violet-500/25 text-xs font-semibold text-violet-200">
                      {getInitials(clientName)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold">
                        {clientName}
                      </strong>
                      <span className="text-[11px] font-medium text-slate-500">
                        {dueLabel} · {item.overdue ? "em atraso" : "em aberto"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <strong className="dashboard-number block text-sm text-slate-200">
                      {formatCompactCurrency(item.revenue)}
                    </strong>
                    <span
                      className={`mt-1 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        item.overdue
                          ? "bg-rose-400/10 text-rose-200"
                          : "bg-emerald-400/10 text-emerald-200"
                      }`}
                    >
                      {item.overdue ? "Atrasado" : item.status || "Aguardando"}
                    </span>
                  </div>
                </div>
              );
            })}

            {!receivableRows.length ? (
              <div className="rounded-[16px] border border-white/10 px-5 py-6 text-sm font-medium text-slate-500">
                Nenhum recebimento encontrado.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-3 border-t border-white/10 px-1 pt-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Sincronizado · 14:32 BRT · {summary?.entries ?? 0} lançamentos processados</span>
        <span className="dashboard-code">2K STUDIOS · painel interno · v0.7.2</span>
      </footer>
    </div>
  );
}






