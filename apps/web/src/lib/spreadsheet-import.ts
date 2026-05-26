/**
 * Parsing puro da planilha financeira da 2K Studios (abas ENTRADAS e SAÍDAS).
 *
 * Sem dependência de Prisma/Next/XLSX para ser coberto por testes unitários.
 * Recebe a matriz já extraída (linha = array de células) e devolve lançamentos
 * normalizados.
 *
 * Regra de validade de linha: tem VALOR > 0 e uma DATA de referência.
 * O ID da planilha (ENT-/SAI-) é opcional e NÃO pode ser critério de validade —
 * linhas reais podem vir sem ID preenchido (ex.: aguardando pagamento).
 */

export type SheetMatrix = unknown[][];

export type ParsedFinancialRow = {
  type: "REVENUE" | "RECEIVABLE" | "EXPENSE" | "PAYABLE";
  date: Date | null;
  competence: string | null;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  grossAmount: string;
  costAmount: string;
  profitAmount: string;
  marginPercent: string | null;
  sourceType: string;
  isManual: boolean;
  editable: boolean;
  sourceRow: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  documentNumber: string | null;
  subCategory: string | null;
  nature: string | null;
  recurrence: string | null;
  supplierName: string | null;
};

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

export function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Converte valor monetário (número ou string pt-BR) para number. */
export function money(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let raw = String(value)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^\d,.-]/g, "");

  const negative = raw.includes("-") || /^\(.*\)$/.test(raw);

  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }

  raw = raw.replace(/-/g, "");

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) return 0;

  return negative ? parsed * -1 : parsed;
}

export function decimal(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  if (Math.abs(value) > 999999999.99) return "0.00";
  return value.toFixed(2);
}

/** Dias entre 1899-12-30 (epoch do Excel, com bug do ano 1900) e 1970-01-01. */
const EXCEL_EPOCH_OFFSET = 25569;

/** Converte data do Excel (Date, número serial ou string) para Date local. */
export function excelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const ms = Math.round((value - EXCEL_EPOCH_OFFSET) * 86400 * 1000);
    const utc = new Date(ms);
    if (Number.isNaN(utc.getTime())) return null;
    // Reconstrói em horário local para evitar deslocamento de fuso.
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function competenceFromDate(date: Date | null): string | null {
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
}

/** Localiza a aba ENTRADAS ou SAÍDAS independentemente de emojis/acentos. */
export function matchSheetName(
  names: string[],
  expected: "entradas" | "saidas",
): string | null {
  return (
    names.find((name) => normalizeText(name).includes(expected)) ?? null
  );
}

/**
 * Aba 💰 ENTRADAS — cabeçalho na linha 4 (índice 3); dados a partir do índice 4.
 * Colunas: 0 Mês Ref. | 1 Grupo | 2 Marca | 3 Projeto | 4 Valor | 5 NF |
 * 6 Status | 7 Data Emissão | 8 Prev. Recebimento | 10 Recebido? | 11 Obs | 12 ID
 */
export function parseEntradas(matrix: SheetMatrix): ParsedFinancialRow[] {
  return matrix
    .slice(4)
    .map((row, index): ParsedFinancialRow | null => {
      const mesRef = row[0];
      const grupo = text(row[1]);
      const marca = text(row[2]);
      const projeto = text(row[3]);
      const valor = money(row[4]);
      const nf = text(row[5]);
      const status = text(row[6]);
      const dataEmissao = row[7];
      const prevRecebimento = row[8];
      const recebido = text(row[10]);
      const obs = text(row[11]);

      // Competência = Mês Ref.; fallback para datas reais se ausente.
      const date =
        excelDate(mesRef) ??
        excelDate(dataEmissao) ??
        excelDate(prevRecebimento);

      if (!date) return null;
      if (!valor || valor <= 0) return null;

      const statusNormalized = normalizeText(`${status} ${recebido}`);
      const isPaid =
        statusNormalized.includes("pago") || statusNormalized.includes("sim");

      const issuedAt = excelDate(dataEmissao);
      const dueAt = excelDate(prevRecebimento);

      return {
        type: isPaid ? "REVENUE" : "RECEIVABLE",
        date,
        competence: competenceFromDate(date),
        client: marca || grupo || null,
        groupName: grupo || marca || null,
        project: projeto || null,
        description: projeto || obs || null,
        category: "Entrada",
        status: status || recebido || null,
        grossAmount: decimal(valor),
        costAmount: decimal(0),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "SPREADSHEET",
        isManual: false,
        editable: false,
        sourceRow: index + 5,
        issuedAt,
        dueAt,
        paidAt: isPaid ? (dueAt ?? date) : null,
        documentNumber: nf || null,
        subCategory: null,
        nature: null,
        recurrence: null,
        supplierName: null,
      };
    })
    .filter((row): row is ParsedFinancialRow => row !== null);
}

/**
 * Aba 💸 SAÍDAS — cabeçalho na linha 5 (índice 4); dados a partir do índice 5.
 * Colunas: 0 Mês Ref. | 1 Data | 2 Categoria Principal | 3 Fornecedor | 4 Descrição |
 * 5 Valor | 6 Status Pagto | 7 Recorrência | 8 Obs | 9 ID | 10 Subcategoria | 11 Natureza
 */
export function parseSaidas(matrix: SheetMatrix): ParsedFinancialRow[] {
  return matrix
    .slice(5)
    .map((row, index): ParsedFinancialRow | null => {
      const mesRef = row[0];
      const data = row[1];
      const categoria = text(row[2]);
      const fornecedor = text(row[3]);
      const descricao = text(row[4]);
      const valor = money(row[5]);
      const status = text(row[6]);
      const recorrencia = text(row[7]);
      const obs = text(row[8]);
      const subcategoria = text(row[10]);
      const natureza = text(row[11]);

      const date = excelDate(mesRef) ?? excelDate(data);
      const launchDate = excelDate(data) ?? date;

      if (!date) return null;
      if (!valor || valor <= 0) return null;

      const isPaid = normalizeText(status).includes("pago");

      return {
        type: isPaid ? "EXPENSE" : "PAYABLE",
        date,
        competence: competenceFromDate(date),
        client: fornecedor || null,
        groupName: null,
        project: descricao || null,
        description: descricao || obs || null,
        category: categoria || "Saída",
        status: status || recorrencia || null,
        grossAmount: decimal(0),
        costAmount: decimal(valor),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "SPREADSHEET",
        isManual: false,
        editable: false,
        sourceRow: index + 6,
        issuedAt: launchDate,
        dueAt: launchDate,
        paidAt: isPaid ? launchDate : null,
        documentNumber: null,
        subCategory: subcategoria || null,
        nature: natureza || null,
        recurrence: recorrencia || null,
        supplierName: fornecedor || null,
      };
    })
    .filter((row): row is ParsedFinancialRow => row !== null);
}
