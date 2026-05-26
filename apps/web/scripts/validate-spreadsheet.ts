/**
 * Validação ponta-a-ponta da importação financeira contra uma planilha real.
 *
 * Roda o MESMO parser usado pela rota de upload (src/lib/spreadsheet-import.ts)
 * e o mesmo núcleo de cálculo (src/lib/finance.ts), e compara com os totais
 * oficiais da 2K Studios.
 *
 * Uso:
 *   node --experimental-strip-types scripts/validate-spreadsheet.ts <caminho.xlsx>
 *
 * Não faz parte do build (excluído em tsconfig/eslint). Não persiste nada.
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  matchSheetName,
  parseEntradas,
  parseSaidas,
} from "../src/lib/spreadsheet-import.ts";
import { computeSummary, type FinanceEntryLike } from "../src/lib/finance.ts";

const path = process.argv[2];
if (!path) {
  console.error("Informe o caminho da planilha .xlsx");
  process.exit(1);
}

const OFICIAL = {
  faturamento: 261479.78,
  recebido: 212913.19,
  aReceber: 48566.59,
  saidasTotais: 130835.96,
  saidasPagas: 114335.96,
  aPagar: 16500,
  resultadoCaixaReal: 98577.23,
  caixaComprometido: 82077.23,
  lucroCompetencia: 130643.82,
  margem: 49.96,
};

const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
const matrix = (name: string | null) =>
  name
    ? XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1,
        defval: null,
        raw: true,
      })
    : [];

const entradas = parseEntradas(matrix(matchSheetName(wb.SheetNames, "entradas")));
const saidas = parseSaidas(matrix(matchSheetName(wb.SheetNames, "saidas")));
const entries = [...entradas, ...saidas] as unknown as FinanceEntryLike[];

const s = computeSummary(entries, new Date(2026, 4, 25));

const rows: Array<[string, number, number]> = [
  ["Faturamento", s.totalRevenue, OFICIAL.faturamento],
  ["Recebido em caixa", s.receivedTotal, OFICIAL.recebido],
  ["A receber", s.receivableTotal, OFICIAL.aReceber],
  ["Saídas totais", s.totalExpenses, OFICIAL.saidasTotais],
  ["Saídas pagas", s.paidExpenses, OFICIAL.saidasPagas],
  ["A pagar", s.payableTotal, OFICIAL.aPagar],
  ["Resultado de caixa real", s.cashResult, OFICIAL.resultadoCaixaReal],
  ["Caixa comprometido", s.committedCash, OFICIAL.caixaComprometido],
  ["Lucro por competência", s.totalProfit, OFICIAL.lucroCompetencia],
  ["Margem por competência (%)", s.margin, OFICIAL.margem],
];

let ok = true;
console.log(`Entradas: ${entradas.length} | Saídas: ${saidas.length}\n`);
for (const [label, got, exp] of rows) {
  const pass = Math.abs(got - exp) < 0.01;
  ok = ok && pass;
  console.log(
    `${pass ? "✓" : "✗"} ${label.padEnd(28)} ${got.toFixed(2).padStart(12)} (oficial ${exp.toFixed(2)})`,
  );
}

console.log(`\n${ok ? "TODOS OS TOTAIS BATEM" : "DIVERGÊNCIA ENCONTRADA"}`);
process.exit(ok ? 0 : 1);
