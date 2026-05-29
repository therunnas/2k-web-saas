import { test } from "node:test";
import assert from "node:assert/strict";
import {
  excelDate,
  money,
  parseEntradas,
  parseSaidas,
  type SheetMatrix,
} from "./spreadsheet-import.ts";

test("money converte número e string pt-BR para number", () => {
  assert.equal(money("R$ 1.234,56"), 1234.56);
  assert.equal(money("6.462,20"), 6462.2);
  assert.equal(money("1234.56"), 1234.56);
  assert.equal(money(6462.2), 6462.2);
  assert.equal(money(""), 0);
  assert.equal(money(null), 0);
  assert.equal(money(undefined), 0);
});

test("excelDate converte serial do Excel, Date e trata vazio", () => {
  // 45292 = 01/01/2024 (25569 = offset 1899-12-30 -> 1970-01-01).
  const d = excelDate(45292);
  assert.ok(d instanceof Date);
  assert.equal(d?.getFullYear(), 2024);
  assert.equal(d?.getMonth(), 0);
  assert.equal(d?.getDate(), 1);

  // Seriais consecutivos diferem exatamente um dia (sem drift de fuso).
  const a = excelDate(46000) as Date;
  const b = excelDate(46001) as Date;
  assert.equal(b.getTime() - a.getTime(), 86_400_000);

  // Date passa direto; vazio vira null.
  const passthrough = new Date(2026, 4, 20);
  assert.equal(excelDate(passthrough), passthrough);
  assert.equal(excelDate(null), null);
  assert.equal(excelDate(""), null);
});

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);

test("parseEntradas importa linha SEM ID e ignora cabeçalho/total/branco", () => {
  const matrix: SheetMatrix = [
    ["💰 ENTRADAS 2026"], // 0 título
    ["instrução"], // 1
    ["RESUMO:", null, 99999], // 2 (cortado pelo slice)
    ["Mês Ref.", "Grupo (NF)", "Marca", "Projeto", "Valor (R$)"], // 3 cabeçalho
    [
      D(2026, 1, 1),
      "GRUPO AMC TÊXTIL",
      "Sommer",
      "COLCCI - PRODUCAO",
      6462.2,
      "57",
      "PAGO",
      D(2026, 1, 8),
      D(2026, 1, 13),
      null,
      "✅ Sim",
      null,
      "ENT-001",
    ], // 4 paga
    [
      D(2026, 5, 1),
      "GRUPO AMC TÊXTIL",
      "ISY",
      "DIA DAS MÃES",
      5000,
      "91",
      "AGUARDANDO PAGAMENTO",
      D(2026, 5, 12),
      D(2026, 5, 27),
      null,
      "⏳ Não",
      null,
      null, // <-- ID em branco; DEVE ser importada mesmo assim
    ], // 5 a receber
    [null, null, null, null, null], // 6 linha vazia -> ignorada
    ["TOTAL", null, null, null, 99999], // 7 sem data -> ignorada
  ];

  const rows = parseEntradas(matrix);

  assert.equal(rows.length, 2, "deve importar 2 lançamentos (inclui o sem ID)");

  const paga = rows[0];
  assert.equal(paga.type, "REVENUE");
  assert.equal(paga.grossAmount, "6462.20");
  assert.equal(paga.documentNumber, "57");

  const semId = rows[1];
  assert.equal(semId.type, "RECEIVABLE", "aguardando pagamento = a receber");
  assert.equal(semId.grossAmount, "5000.00");
  assert.equal(semId.documentNumber, "91");
  assert.ok(semId.dueAt instanceof Date, "deve guardar a previsão de recebimento");
  assert.equal(semId.competence, "05/2026");
});

test("parseSaidas importa TITO (Freela, PAGO) com natureza e subcategoria", () => {
  const matrix: SheetMatrix = [
    ["💸 SAÍDAS 2026"], // 0
    ["instrução"], // 1
    ["RESUMO:", null, 99999], // 2
    ["categorias"], // 3
    [
      "Mês Ref.",
      "Data",
      "Categoria Principal",
      "Fornecedor/Nome",
      "Descrição",
      "Valor (R$)",
    ], // 4 cabeçalho
    [
      D(2026, 5, 1),
      D(2026, 5, 20),
      "Freelas",
      "TITO",
      "SENNA TOWER - FILME DIVULGAÇÃO GP MIAMI - IA",
      500,
      "PAGO",
      "Pontual",
      null,
      "SAI-0098",
      "Freela",
      "Variável",
    ], // 5
    [
      D(2026, 5, 1),
      D(2026, 6, 9),
      "Equipe Variável",
      "MATHEUS",
      "FG",
      1000,
      "À PAGAR",
      "Pontual",
      null,
      "SAI-0121",
      "Equipe Variável",
      "Variável",
    ], // 6
    [null, null, null, null, null, null, null, null, null, "SAI-0123"], // 7 modelo sem valor -> ignorada
  ];

  const rows = parseSaidas(matrix);

  assert.equal(rows.length, 2);

  const tito = rows[0];
  assert.equal(tito.type, "EXPENSE", "PAGO -> saída paga");
  assert.equal(tito.costAmount, "500.00");
  assert.equal(tito.category, "Freelas");
  assert.equal(tito.subCategory, "Freela");
  assert.equal(tito.nature, "Variável");
  assert.equal(tito.supplierName, "TITO");
  assert.equal(tito.competence, "05/2026");
  assert.ok(tito.paidAt instanceof Date, "saída paga deve ter data de pagamento");

  const aPagar = rows[1];
  assert.equal(aPagar.type, "PAYABLE", "À PAGAR -> saída pendente");
  assert.equal(aPagar.paidAt, null);
});

test("parseEntradas detecta cabeçalho deslocado (linha extra no topo)", () => {
  const matrix: SheetMatrix = [
    ["RELATÓRIO 2K STUDIOS"], // 0 linha extra
    ["💰 ENTRADAS 2026"], // 1 título
    ["instrução"], // 2
    ["RESUMO:", null, 99999], // 3
    ["Mês Ref.", "Grupo (NF)", "Marca", "Projeto", "Valor (R$)"], // 4 cabeçalho deslocado
    [
      D(2026, 3, 1),
      "GRUPO X",
      "Marca Y",
      "Projeto Z",
      1200,
      "10",
      "PAGO",
      D(2026, 3, 5),
      D(2026, 3, 10),
      null,
      "Sim",
      null,
      "ENT-010",
    ], // 5 dados
  ];

  const rows = parseEntradas(matrix);

  assert.equal(rows.length, 1, "deve importar mesmo com cabeçalho deslocado");
  assert.equal(rows[0].grossAmount, "1200.00");
  assert.equal(rows[0].documentNumber, "10");
  assert.equal(rows[0].competence, "03/2026");
});

test("parseSaidas aceita datas em texto pt-BR (dd/mm/yyyy)", () => {
  const matrix: SheetMatrix = [
    ["💸 SAÍDAS 2026"],
    [
      "Mês Ref.",
      "Data",
      "Categoria Principal",
      "Fornecedor/Nome",
      "Descrição",
      "Valor (R$)",
    ], // cabeçalho na linha 2 (índice 1)
    [
      "13/05/2026",
      "20/05/2026",
      "Freelas",
      "FULANO",
      "Serviço",
      750,
      "PAGO",
    ],
  ];

  const rows = parseSaidas(matrix);

  assert.equal(rows.length, 1, "deve importar linha com datas em texto");
  assert.equal(rows[0].costAmount, "750.00");
  assert.equal(rows[0].competence, "05/2026", "13/05 deve virar maio, não inválido");
  assert.equal(rows[0].type, "EXPENSE");
});

test("parse é determinístico (sem duplicar ao reprocessar)", () => {
  const matrix: SheetMatrix = [
    [],
    [],
    [],
    [],
    [
      D(2026, 1, 1),
      "G",
      "M",
      "P",
      100,
      "1",
      "PAGO",
      D(2026, 1, 1),
      D(2026, 1, 1),
      null,
      "Sim",
      null,
      "ENT-001",
    ],
  ];

  const a = parseEntradas(matrix);
  const b = parseEntradas(matrix);

  assert.equal(a.length, b.length);
  assert.equal(a.length, 1);
  assert.equal(a[0].grossAmount, b[0].grossAmount);
});
