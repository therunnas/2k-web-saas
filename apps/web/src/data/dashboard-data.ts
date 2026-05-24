export type DashboardKpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
};

export type MonthlyTopClient = {
  name: string;
  revenue: number;
  profit: number;
  margin: string;
};

export type MonthlyRevenueItem = {
  month: string;
  label: string;
  value: number | null;
  topClient: MonthlyTopClient | null;
};

export type TopGroup = {
  rank: number;
  badge: string;
  name: string;
  revenue: string;
  profit: string;
  margin: string;
  width: string;
};

export type Receivable = {
  client: string;
  badge: string;
  dueDate: string;
  value: string;
  status: "A receber" | "Programado";
};

export const dashboardKpis: DashboardKpi[] = [
  {
    label: "Faturamento total",
    value: "R$ 42.000",
    helper: "Volume consolidado do mês",
    trend: "▲ 18,2% vs. mês anterior",
    trendDirection: "up",
  },
  {
    label: "Lucro líquido",
    value: "R$ 9.100",
    helper: "Resultado estimado após custos",
    trend: "▲ 7,5% vs. mês anterior",
    trendDirection: "up",
  },
  {
    label: "Margem estimada",
    value: "54%",
    helper: "Lucro sobre faturamento",
    trend: "▼ -1 p.p. vs. mês anterior",
    trendDirection: "down",
  },
  {
    label: "Cliente mais lucrativo",
    value: "Grupo Lunelli",
    helper: "R$ 9.100 de lucro",
    trend: "Maior margem do período",
    trendDirection: "neutral",
  },
];

export const monthlyRevenue: MonthlyRevenueItem[] = [
  {
    month: "Jan",
    label: "01/2026",
    value: 90000,
    topClient: {
      name: "GRUPO AMC TÊXTIL",
      revenue: 42000,
      profit: 21800,
      margin: "52%",
    },
  },
  {
    month: "Fev",
    label: "02/2026",
    value: 12000,
    topClient: {
      name: "DK FASHION",
      revenue: 6800,
      profit: 3100,
      margin: "46%",
    },
  },
  {
    month: "Mar",
    label: "03/2026",
    value: 105000,
    topClient: {
      name: "FG EMPREENDIMENTOS",
      revenue: 51700,
      profit: 28600,
      margin: "55%",
    },
  },
  {
    month: "Abr",
    label: "04/2026",
    value: 18000,
    topClient: {
      name: "SENNA TOWER",
      revenue: 8554,
      profit: 4320,
      margin: "51%",
    },
  },
  {
    month: "Mai",
    label: "05/2026",
    value: 42000,
    topClient: {
      name: "GRUPO LUNELLI",
      revenue: 16585,
      profit: 9100,
      margin: "54%",
    },
  },
  { month: "Jun", label: "06/2026", value: null, topClient: null },
  { month: "Jul", label: "07/2026", value: null, topClient: null },
  { month: "Ago", label: "08/2026", value: null, topClient: null },
  { month: "Set", label: "09/2026", value: null, topClient: null },
  { month: "Out", label: "10/2026", value: null, topClient: null },
  { month: "Nov", label: "11/2026", value: null, topClient: null },
  { month: "Dez", label: "12/2026", value: null, topClient: null },
];

export const topGroups: TopGroup[] = [
  {
    rank: 1,
    badge: "L",
    name: "Grupo Lunelli",
    revenue: "R$ 16.585",
    profit: "R$ 9.100",
    margin: "54%",
    width: "78%",
  },
  {
    rank: 2,
    badge: "D",
    name: "DK Fashion",
    revenue: "R$ 12.000",
    profit: "R$ 5.100",
    margin: "45%",
    width: "64%",
  },
  {
    rank: 3,
    badge: "F",
    name: "FG Empreendimentos",
    revenue: "R$ 6.800",
    profit: "R$ 3.600",
    margin: "53%",
    width: "58%",
  },
  {
    rank: 4,
    badge: "O",
    name: "Grupo Oliveira",
    revenue: "R$ 4.650",
    profit: "R$ 2.150",
    margin: "46%",
    width: "52%",
  },
  {
    rank: 5,
    badge: "A",
    name: "Alpha Group",
    revenue: "R$ 2.200",
    profit: "R$ 1.050",
    margin: "48%",
    width: "55%",
  },
];

export const receivables: Receivable[] = [
  {
    client: "Grupo Lunelli",
    badge: "L",
    dueDate: "05/06/2026",
    value: "R$ 16.585",
    status: "A receber",
  },
  {
    client: "DK Fashion",
    badge: "D",
    dueDate: "10/06/2026",
    value: "R$ 12.000",
    status: "A receber",
  },
  {
    client: "FG Empreendimentos",
    badge: "F",
    dueDate: "15/06/2026",
    value: "R$ 6.800",
    status: "A receber",
  },
  {
    client: "Grupo Oliveira",
    badge: "O",
    dueDate: "20/06/2026",
    value: "R$ 4.650",
    status: "Programado",
  },
  {
    client: "Alpha Group",
    badge: "A",
    dueDate: "25/06/2026",
    value: "R$ 2.200",
    status: "Programado",
  },
];