/**
 * Núcleo de cálculo financeiro — fonte única de verdade.
 *
 * Funções puras, sem dependência de Prisma/Next, para que possam ser
 * reaproveitadas pelas rotas de API e cobertas por testes unitários.
 *
 * Regras (separação caixa x competência):
 * - Faturamento por competência: soma do faturado no período (REVENUE + RECEIVABLE).
 * - Recebido em caixa: soma do efetivamente recebido (REVENUE).
 * - A receber: soma do pendente (RECEIVABLE).
 * - Atrasado: a receber cuja data prevista (dueAt) é anterior a hoje.
 * - Saídas por competência: todas as despesas do período (EXPENSE + PAYABLE).
 * - Saídas pagas: despesas efetivamente pagas (EXPENSE).
 * - Lucro por competência: faturamento competência - saídas competência.
 * - Resultado de caixa real: recebido - saídas pagas.
 * - Caixa comprometido: recebido - saídas totais (inclui contas a pagar).
 * - Margem por competência: lucro por competência / faturamento.
 */

export type FinanceEntryLike = {
  type: string;
  date: Date | null;
  dueAt?: Date | null;
  competence: string | null;
  client?: string | null;
  groupName?: string | null;
  project?: string | null;
  category?: string | null;
  nature?: string | null;
  status?: string | null;
  grossAmount: unknown;
  costAmount: unknown;
};

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && "toString" in value) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Margem percentual = lucro / faturamento * 100. Nunca o inverso. */
export function marginPercent(profit: number, revenue: number): number {
  if (!(revenue > 0)) return 0;
  return roundMoney((profit / revenue) * 100);
}

/** Participação = parte / total * 100. */
export function sharePercent(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return roundMoney((part / total) * 100);
}

export function isRevenue(entry: FinanceEntryLike): boolean {
  return entry.type === "REVENUE" || entry.type === "RECEIVABLE";
}

export function isExpense(entry: FinanceEntryLike): boolean {
  return entry.type === "EXPENSE" || entry.type === "PAYABLE";
}

export function revenueAmount(entry: FinanceEntryLike): number {
  return isRevenue(entry) ? Math.max(toNumber(entry.grossAmount), 0) : 0;
}

export function expenseAmount(entry: FinanceEntryLike): number {
  return isExpense(entry) ? Math.max(toNumber(entry.costAmount), 0) : 0;
}

export function getYear(entry: FinanceEntryLike): number | null {
  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date.getFullYear();
  }

  if (entry.competence) {
    const match = entry.competence.match(/(\d{1,2})\/(\d{4})/);
    if (match) return Number(match[2]);
  }

  return null;
}

export function getMonth(entry: FinanceEntryLike): number | null {
  if (entry.date instanceof Date && !Number.isNaN(entry.date.getTime())) {
    return entry.date.getMonth();
  }

  if (entry.competence) {
    const match = entry.competence.match(/(\d{1,2})\/(\d{4})/);
    if (match) {
      const month = Number(match[1]) - 1;
      return month >= 0 && month <= 11 ? month : null;
    }
  }

  return null;
}

/** Entrada considerada do ano (inclui sem data para não perder lançamentos). */
export function isInYear(entry: FinanceEntryLike, year: number): boolean {
  const entryYear = getYear(entry);
  return entryYear === null || entryYear === year;
}

export type FinanceSummary = {
  totalRevenue: number;
  receivedTotal: number;
  receivableTotal: number;
  overdueTotal: number;
  totalExpenses: number;
  paidExpenses: number;
  payableTotal: number;
  totalProfit: number;
  /** Resultado de caixa real = recebido - saídas pagas. */
  cashResult: number;
  /** Caixa comprometido = recebido - saídas totais (inclui a pagar). */
  committedCash: number;
  margin: number;
};

/**
 * Resumo financeiro de um conjunto de lançamentos.
 *
 * @param now data de referência para "atrasado" (default: agora).
 */
export function computeSummary(
  entries: FinanceEntryLike[],
  now: Date = new Date(),
): FinanceSummary {
  let receivedTotal = 0;
  let receivableTotal = 0;
  let overdueTotal = 0;
  let paidExpenses = 0;
  let payableTotal = 0;

  for (const entry of entries) {
    if (entry.type === "REVENUE") {
      receivedTotal += revenueAmount(entry);
    } else if (entry.type === "RECEIVABLE") {
      const amount = revenueAmount(entry);
      receivableTotal += amount;
      if (
        entry.dueAt instanceof Date &&
        !Number.isNaN(entry.dueAt.getTime()) &&
        entry.dueAt.getTime() < now.getTime()
      ) {
        overdueTotal += amount;
      }
    } else if (entry.type === "EXPENSE") {
      paidExpenses += expenseAmount(entry);
    } else if (entry.type === "PAYABLE") {
      payableTotal += expenseAmount(entry);
    }
  }

  const totalRevenue = roundMoney(receivedTotal + receivableTotal);
  const totalExpenses = roundMoney(paidExpenses + payableTotal);
  receivedTotal = roundMoney(receivedTotal);
  receivableTotal = roundMoney(receivableTotal);
  overdueTotal = roundMoney(overdueTotal);
  paidExpenses = roundMoney(paidExpenses);
  payableTotal = roundMoney(payableTotal);

  const totalProfit = roundMoney(totalRevenue - totalExpenses);
  const cashResult = roundMoney(receivedTotal - paidExpenses);
  const committedCash = roundMoney(receivedTotal - totalExpenses);
  const margin = marginPercent(totalProfit, totalRevenue);

  return {
    totalRevenue,
    receivedTotal,
    receivableTotal,
    overdueTotal,
    totalExpenses,
    paidExpenses,
    payableTotal,
    totalProfit,
    cashResult,
    committedCash,
    margin,
  };
}

export type MonthlyPoint = {
  index: number;
  revenue: number;
  received: number;
  receivable: number;
  expenses: number;
  paid: number;
  profit: number;
  cash: number;
  margin: number;
};

/** Série mensal: faturamento/recebido por competência e caixa por mês. */
export function computeMonthly(entries: FinanceEntryLike[]): MonthlyPoint[] {
  const points: MonthlyPoint[] = Array.from({ length: 12 }, (_, index) => ({
    index,
    revenue: 0,
    received: 0,
    receivable: 0,
    expenses: 0,
    paid: 0,
    profit: 0,
    cash: 0,
    margin: 0,
  }));

  for (const entry of entries) {
    const month = getMonth(entry);
    if (month === null) continue;
    const point = points[month];

    if (entry.type === "REVENUE") {
      const amount = revenueAmount(entry);
      point.revenue += amount;
      point.received += amount;
    } else if (entry.type === "RECEIVABLE") {
      const amount = revenueAmount(entry);
      point.revenue += amount;
      point.receivable += amount;
    } else if (entry.type === "EXPENSE") {
      const amount = expenseAmount(entry);
      point.expenses += amount;
      point.paid += amount;
    } else if (entry.type === "PAYABLE") {
      point.expenses += expenseAmount(entry);
    }
  }

  for (const point of points) {
    point.revenue = roundMoney(point.revenue);
    point.received = roundMoney(point.received);
    point.receivable = roundMoney(point.receivable);
    point.expenses = roundMoney(point.expenses);
    point.paid = roundMoney(point.paid);
    point.profit = roundMoney(point.revenue - point.expenses);
    point.cash = roundMoney(point.received - point.paid);
    point.margin = marginPercent(point.profit, point.revenue);
  }

  return points;
}

export function groupNameOf(entry: FinanceEntryLike): string {
  return entry.groupName || entry.client || entry.project || "Sem grupo";
}

export type GroupRankingItem = {
  rank: number;
  name: string;
  revenue: number;
  received: number;
  receivable: number;
  projectsCount: number;
  ticketMedio: number;
  participationPercent: number;
};

/**
 * Ranking comercial por grupo. NÃO calcula margem por grupo porque não há
 * vínculo confiável de despesas por grupo na planilha — usa participação no
 * faturamento (participação % = faturamento do grupo / faturamento total).
 */
export function computeGroupRanking(
  entries: FinanceEntryLike[],
  limit?: number,
): GroupRankingItem[] {
  type Bucket = {
    name: string;
    revenue: number;
    received: number;
    receivable: number;
    projects: Set<string>;
    entries: number;
  };

  const map = new Map<string, Bucket>();
  let total = 0;

  for (const entry of entries) {
    if (!isRevenue(entry)) continue;
    const amount = revenueAmount(entry);
    if (amount <= 0) continue;

    const name = groupNameOf(entry);
    const bucket = map.get(name) ?? {
      name,
      revenue: 0,
      received: 0,
      receivable: 0,
      projects: new Set<string>(),
      entries: 0,
    };

    bucket.revenue += amount;
    bucket.entries += 1;
    if (entry.type === "REVENUE") bucket.received += amount;
    if (entry.type === "RECEIVABLE") bucket.receivable += amount;
    if (entry.project) bucket.projects.add(entry.project);
    map.set(name, bucket);
    total += amount;
  }

  const ranked = Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((bucket, index) => {
      const projectsCount = bucket.projects.size || bucket.entries;
      return {
        rank: index + 1,
        name: bucket.name,
        revenue: roundMoney(bucket.revenue),
        received: roundMoney(bucket.received),
        receivable: roundMoney(bucket.receivable),
        projectsCount,
        ticketMedio: projectsCount > 0 ? roundMoney(bucket.revenue / projectsCount) : 0,
        participationPercent: sharePercent(bucket.revenue, total),
      };
    });

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
