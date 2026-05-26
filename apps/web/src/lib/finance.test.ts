import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGroupRanking,
  computeMonthly,
  computeSummary,
  getMonth,
  marginPercent,
  sharePercent,
  type FinanceEntryLike,
} from "./finance.ts";

const REF = new Date(2026, 4, 25); // 25/05/2026

function entry(part: Partial<FinanceEntryLike>): FinanceEntryLike {
  return {
    type: "REVENUE",
    date: new Date(2026, 0, 15),
    competence: null,
    grossAmount: 0,
    costAmount: 0,
    ...part,
  };
}

const sample: FinanceEntryLike[] = [
  // Recebido
  entry({
    type: "REVENUE",
    grossAmount: 100,
    groupName: "Grupo A",
    project: "P1",
    date: new Date(2026, 0, 15),
  }),
  // A receber em atraso (dueAt < hoje)
  entry({
    type: "RECEIVABLE",
    grossAmount: 50,
    groupName: "Grupo B",
    project: "P2",
    dueAt: new Date(2026, 3, 10),
    date: new Date(2026, 1, 20),
  }),
  // A receber no futuro (dueAt > hoje)
  entry({
    type: "RECEIVABLE",
    grossAmount: 30,
    groupName: "Grupo B",
    project: "P3",
    dueAt: new Date(2026, 5, 10),
    date: new Date(2026, 1, 5),
  }),
  // Saída paga
  entry({ type: "EXPENSE", costAmount: 40, date: new Date(2026, 0, 20) }),
  // Saída a pagar
  entry({ type: "PAYABLE", costAmount: 20, date: new Date(2026, 1, 28) }),
];

test("margem = lucro/faturamento (nunca o inverso)", () => {
  assert.equal(marginPercent(120, 180), 66.67);
  assert.notEqual(marginPercent(120, 180), 150); // fat/lucro estaria errado
  assert.equal(marginPercent(10, 0), 0); // sem faturamento -> 0, sem divisão por zero
});

test("participação = parte/total", () => {
  assert.equal(sharePercent(100, 180), 55.56);
  assert.equal(sharePercent(50, 0), 0);
});

test("computeSummary separa caixa de competência", () => {
  const s = computeSummary(sample, REF);

  assert.equal(s.totalRevenue, 180, "faturamento = recebido + a receber");
  assert.equal(s.receivedTotal, 100, "recebido = só REVENUE");
  assert.equal(s.receivableTotal, 80, "a receber = só RECEIVABLE");
  assert.equal(s.overdueTotal, 50, "atrasado = a receber com dueAt < hoje");
  assert.equal(s.totalExpenses, 60, "saídas totais = paga + a pagar");
  assert.equal(s.paidExpenses, 40, "saídas pagas = só EXPENSE");
  assert.equal(s.payableTotal, 20, "a pagar = só PAYABLE");
  assert.equal(s.totalProfit, 120, "lucro competência = faturamento - saídas totais");
  assert.equal(s.cashResult, 60, "resultado de caixa real = recebido - pagas");
  assert.equal(s.committedCash, 40, "caixa comprometido = recebido - saídas totais");
  assert.equal(s.margin, 66.67, "margem = lucro/faturamento");
});

test("resultado de caixa real != caixa comprometido", () => {
  const s = computeSummary(sample, REF);
  assert.notEqual(
    s.cashResult,
    s.committedCash,
    "as duas métricas de caixa devem ser distintas",
  );
});

test("computeGroupRanking usa participação, não margem global", () => {
  const ranking = computeGroupRanking(sample);

  assert.equal(ranking.length, 2);

  const a = ranking.find((g) => g.name === "Grupo A");
  const b = ranking.find((g) => g.name === "Grupo B");

  assert.ok(a && b);
  assert.equal(a.revenue, 100);
  assert.equal(a.received, 100);
  assert.equal(a.receivable, 0);
  assert.equal(a.projectsCount, 1);
  assert.equal(a.ticketMedio, 100);

  assert.equal(b.revenue, 80);
  assert.equal(b.received, 0);
  assert.equal(b.receivable, 80);
  assert.equal(b.projectsCount, 2);
  assert.equal(b.ticketMedio, 40);

  // Participação soma ~100% e cada grupo tem valor próprio (não repetido).
  assert.equal(a.participationPercent, 55.56);
  assert.equal(b.participationPercent, 44.44);
  assert.notEqual(a.participationPercent, b.participationPercent);

  // Nenhuma propriedade "margin" no ranking de grupos.
  assert.equal("margin" in a, false);
});

test("agrupamento mensal funciona com datas reais (não só dia 01)", () => {
  // getMonth deve respeitar o mês de qualquer dia.
  assert.equal(getMonth(entry({ date: new Date(2026, 4, 20) })), 4);
  assert.equal(getMonth(entry({ date: null, competence: "05/2026" })), 4);

  const monthly = computeMonthly(sample);

  // Jan: recebido 100, pago 40
  assert.equal(monthly[0].received, 100);
  assert.equal(monthly[0].paid, 40);
  assert.equal(monthly[0].profit, 60);
  assert.equal(monthly[0].cash, 60);

  // Fev: receber 50+30 (competência por data), a pagar 20 -> caixa 0
  assert.equal(monthly[1].receivable, 80);
  assert.equal(monthly[1].expenses, 20);
  assert.equal(monthly[1].cash, 0);

  // Abr não tem competência (a data de vencimento de abr é só para "atrasado").
  assert.equal(monthly[3].receivable, 0);
});
