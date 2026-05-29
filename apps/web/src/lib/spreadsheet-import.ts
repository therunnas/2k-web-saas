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

  const str = String(value).trim();
  if (!str) return null;

  // Datas em texto pt-BR: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (e ano com 2 dígitos).
  // O construtor nativo de Date interpreta "13/05/2026" como mês 13 (inválido),
  // então tratamos esse formato explicitamente antes do fallback.
  const br = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dt = new Date(year, month - 1, day);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  const parsed = new Date(str);
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

/** Especificação de uma coluna: índice padrão (legado) + tokens de cabeçalho. */
type ColumnSpec = Record<string, { index: number; tokens: string[] }>;

/**
 * Localiza a linha de cabeçalho de forma tolerante a linhas de título/instrução
 * extras no topo. Uma linha é cabeçalho se contém a coluna "Valor" E pelo menos
 * mais um rótulo conhecido (evita confundir com frases de instrução).
 * Retorna -1 quando não há cabeçalho reconhecível (cai no offset legado).
 */
function findHeaderRow(matrix: SheetMatrix): number {
  const known = [
    "mesref",
    "mes",
    "data",
    "categoria",
    "grupo",
    "marca",
    "projeto",
    "fornecedor",
    "descricao",
    "status",
  ];

  for (let i = 0; i < matrix.length; i += 1) {
    const cells = (matrix[i] ?? []).map((cell) => normalizeText(cell));
    const hasValor = cells.some((cell) => cell.includes("valor"));
    if (!hasValor) continue;
    const hits = known.filter((token) =>
      cells.some((cell) => cell.includes(token)),
    ).length;
    if (hits >= 1) return i;
  }

  return -1;
}

/**
 * Resolve o índice de cada coluna a partir do cabeçalho real. Se um rótulo não
 * for encontrado pelo nome, mantém o índice fixo legado — garantindo
 * compatibilidade total com a planilha já validada.
 */
function resolveColumns(
  header: unknown[] | undefined,
  spec: ColumnSpec,
): Record<string, number> {
  const cells = (header ?? []).map((cell) => normalizeText(cell));
  const resolved: Record<string, number> = {};

  // Tokens curtos (ex.: "nf") exigem igualdade exata para não casar por
  // substring com outras colunas (ex.: "Grupo (NF)" contém "nf").
  const matches = (cell: string, token: string) =>
    token.length >= 3 ? cell.includes(token) : cell === token;

  for (const [field, { index, tokens }] of Object.entries(spec)) {
    const found = cells.findIndex((cell) =>
      tokens.some((token) => matches(cell, token)),
    );
    resolved[field] = found >= 0 ? found : index;
  }

  return resolved;
}

const ENTRADAS_COLUMNS: ColumnSpec = {
  mesRef: { index: 0, tokens: ["mesref", "competencia", "referencia"] },
  grupo: { index: 1, tokens: ["grupo"] },
  marca: { index: 2, tokens: ["marca"] },
  projeto: { index: 3, tokens: ["projeto"] },
  valor: { index: 4, tokens: ["valor"] },
  nf: { index: 5, tokens: ["nf", "notafiscal", "documento"] },
  status: { index: 6, tokens: ["status"] },
  dataEmissao: { index: 7, tokens: ["emissao"] },
  prevRecebimento: { index: 8, tokens: ["recebimento", "previsao", "prev"] },
  recebido: { index: 10, tokens: ["recebido"] },
  obs: { index: 11, tokens: ["obs", "observacao"] },
};

/**
 * Aba 💰 ENTRADAS — cabeçalho detectado dinamicamente (legado: linha 4 / índice 3).
 * Colunas: 0 Mês Ref. | 1 Grupo | 2 Marca | 3 Projeto | 4 Valor | 5 NF |
 * 6 Status | 7 Data Emissão | 8 Prev. Recebimento | 10 Recebido? | 11 Obs | 12 ID
 */
export function parseEntradas(matrix: SheetMatrix): ParsedFinancialRow[] {
  const headerRow = findHeaderRow(matrix);
  const dataStart = headerRow >= 0 ? headerRow + 1 : 4;
  const col =
    headerRow >= 0
      ? resolveColumns(matrix[headerRow], ENTRADAS_COLUMNS)
      : Object.fromEntries(
          Object.entries(ENTRADAS_COLUMNS).map(([f, c]) => [f, c.index]),
        );

  return matrix
    .slice(dataStart)
    .map((row, index): ParsedFinancialRow | null => {
      const mesRef = row[col.mesRef];
      const grupo = text(row[col.grupo]);
      const marca = text(row[col.marca]);
      const projeto = text(row[col.projeto]);
      const valor = money(row[col.valor]);
      const nf = text(row[col.nf]);
      const status = text(row[col.status]);
      const dataEmissao = row[col.dataEmissao];
      const prevRecebimento = row[col.prevRecebimento];
      const recebido = text(row[col.recebido]);
      const obs = text(row[col.obs]);

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
        sourceRow: dataStart + index + 1,
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

const SAIDAS_COLUMNS: ColumnSpec = {
  mesRef: { index: 0, tokens: ["mesref", "competencia", "referencia"] },
  data: { index: 1, tokens: ["data"] },
  categoria: { index: 2, tokens: ["categoriaprincipal", "categoria"] },
  fornecedor: { index: 3, tokens: ["fornecedor", "nome"] },
  descricao: { index: 4, tokens: ["descricao"] },
  valor: { index: 5, tokens: ["valor"] },
  status: { index: 6, tokens: ["status", "pagto", "pagamento"] },
  recorrencia: { index: 7, tokens: ["recorrencia"] },
  obs: { index: 8, tokens: ["obs", "observacao"] },
  subcategoria: { index: 10, tokens: ["subcategoria"] },
  natureza: { index: 11, tokens: ["natureza"] },
};

/**
 * Aba 💸 SAÍDAS — cabeçalho detectado dinamicamente (legado: linha 5 / índice 4).
 * Colunas: 0 Mês Ref. | 1 Data | 2 Categoria Principal | 3 Fornecedor | 4 Descrição |
 * 5 Valor | 6 Status Pagto | 7 Recorrência | 8 Obs | 9 ID | 10 Subcategoria | 11 Natureza
 */
export function parseSaidas(matrix: SheetMatrix): ParsedFinancialRow[] {
  const headerRow = findHeaderRow(matrix);
  const dataStart = headerRow >= 0 ? headerRow + 1 : 5;
  const col =
    headerRow >= 0
      ? resolveColumns(matrix[headerRow], SAIDAS_COLUMNS)
      : Object.fromEntries(
          Object.entries(SAIDAS_COLUMNS).map(([f, c]) => [f, c.index]),
        );

  return matrix
    .slice(dataStart)
    .map((row, index): ParsedFinancialRow | null => {
      const mesRef = row[col.mesRef];
      const data = row[col.data];
      const categoria = text(row[col.categoria]);
      const fornecedor = text(row[col.fornecedor]);
      const descricao = text(row[col.descricao]);
      const valor = money(row[col.valor]);
      const status = text(row[col.status]);
      const recorrencia = text(row[col.recorrencia]);
      const obs = text(row[col.obs]);
      const subcategoria = text(row[col.subcategoria]);
      const natureza = text(row[col.natureza]);

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
        sourceRow: dataStart + index + 1,
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
