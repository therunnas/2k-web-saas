import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type SheetMatrix = unknown[][];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function money(value: unknown) {
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

function decimal(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  if (Math.abs(value) > 999999999.99) return "0.00";
  return value.toFixed(2);
}

function excelDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return null;

    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const parsed = new Date(String(value));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function competenceFromDate(date: Date | null) {
  if (!date) return null;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${year}`;
}

function getSheet(workbook: XLSX.WorkBook, expected: "entradas" | "saidas") {
  const sheetName = workbook.SheetNames.find((name) => {
    const normalized = normalizeText(name);

    if (expected === "entradas") {
      return normalized.includes("entradas");
    }

    return normalized.includes("saidas");
  });

  if (!sheetName) return null;

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) return null;

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  return {
    sheetName,
    matrix,
  };
}

function buildEntradaEntries(params: {
  matrix: SheetMatrix;
  sheetName: string;
  workspaceId: string;
  importId: string;
}) {
  const rows = params.matrix.slice(4);

  return rows
    .map((row, index) => {
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
      const id = text(row[12]);

      if (!id.startsWith("ENT-")) return null;
      if (!valor || valor <= 0) return null;

      const statusNormalized = normalizeText(`${status} ${recebido}`);

      const isPaid =
        statusNormalized.includes("pago") ||
        statusNormalized.includes("sim");

      const date = excelDate(mesRef) ?? excelDate(dataEmissao) ?? excelDate(prevRecebimento);

      return {
        workspaceId: params.workspaceId,
        importId: params.importId,
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
        sourceSheet: params.sheetName,
        sourceRow: index + 5,
      };
    })
    .filter(Boolean);
}

function buildSaidaEntries(params: {
  matrix: SheetMatrix;
  sheetName: string;
  workspaceId: string;
  importId: string;
}) {
  const rows = params.matrix.slice(5);

  return rows
    .map((row, index) => {
      const mesRef = row[0];
      const data = row[1];
      const categoria = text(row[2]);
      const fornecedor = text(row[3]);
      const descricao = text(row[4]);
      const valor = money(row[5]);
      const status = text(row[6]);
      const recorrencia = text(row[7]);
      const obs = text(row[8]);
      const id = text(row[9]);
      const subcategoria = text(row[10]);
      const natureza = text(row[11]);

      if (!id.startsWith("SAI-")) return null;
      if (!valor || valor <= 0) return null;

      const statusNormalized = normalizeText(status);
      const isPaid = statusNormalized.includes("pago");

      const date = excelDate(mesRef) ?? excelDate(data);

      return {
        workspaceId: params.workspaceId,
        importId: params.importId,
        type: isPaid ? "EXPENSE" : "PAYABLE",
        date,
        competence: competenceFromDate(date),
        client: fornecedor || null,
        groupName: null,
        project: descricao || null,
        description: descricao || obs || null,
        category: categoria || subcategoria || natureza || "Saída",
        status: status || recorrencia || null,
        grossAmount: decimal(0),
        costAmount: decimal(valor),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "SPREADSHEET",
        isManual: false,
        editable: false,
        sourceSheet: params.sheetName,
        sourceRow: index + 6,
      };
    })
    .filter(Boolean);
}

function isAllowedSpreadsheet(fileName: string) {
  const normalized = fileName.toLowerCase();

  return normalized.endsWith(".xlsx") || normalized.endsWith(".xls");
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Sessão inválida.",
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Nenhum arquivo foi enviado.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedSpreadsheet(file.name)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Envie uma planilha .xlsx ou .xls.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          status: "error",
          message: `Arquivo acima do limite de ${MAX_FILE_SIZE_MB}MB.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    const entradasSheet = getSheet(workbook, "entradas");
    const saidasSheet = getSheet(workbook, "saidas");

    if (!entradasSheet || !saidasSheet) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Não encontrei as abas obrigatórias 💰 ENTRADAS e 💸 SAÍDAS.",
        },
        { status: 400 }
      );
    }

    const importRecord = await prisma.import.create({
      data: {
        workspaceId: session.workspaceId,
        fileName: `${Date.now()}-${file.name}`,
        originalName: file.name,
        entriesCount: 0,
        outputsCount: 0,
        groupsCount: 0,
        brandsCount: 0,
      },
    });

    const entradaEntries = buildEntradaEntries({
      matrix: entradasSheet.matrix,
      sheetName: entradasSheet.sheetName,
      workspaceId: session.workspaceId,
      importId: importRecord.id,
    });

    const saidaEntries = buildSaidaEntries({
      matrix: saidasSheet.matrix,
      sheetName: saidasSheet.sheetName,
      workspaceId: session.workspaceId,
      importId: importRecord.id,
    });

    const financialEntries = [...entradaEntries, ...saidaEntries];

    await prisma.financialEntry.deleteMany({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "SPREADSHEET",
      },
    });

    if (financialEntries.length > 0) {
      await prisma.financialEntry.createMany({
        data: financialEntries as any[],
      });
    }

    const groupsCount = new Set(
      entradaEntries
        .map((entry: any) => entry.groupName)
        .filter(Boolean)
    ).size;

    const brandsCount = new Set(
      entradaEntries
        .map((entry: any) => entry.client)
        .filter(Boolean)
    ).size;

    const updatedImport = await prisma.import.update({
      where: {
        id: importRecord.id,
      },
      data: {
        entriesCount: entradaEntries.length,
        outputsCount: saidaEntries.length,
        groupsCount,
        brandsCount,
      },
    });

    const currentSettings = await prisma.workspaceSettings.upsert({
      where: {
        workspaceId: session.workspaceId,
      },
      update: {
        spreadsheetConfigured: true,
      },
      create: {
        workspaceId: session.workspaceId,
        companyConfigured: false,
        discordConfigured: false,
        defaultChannelConfigured: false,
        spreadsheetConfigured: true,
        setupCompleted: false,
      },
    });

    const setupCompleted =
      currentSettings.companyConfigured &&
      currentSettings.discordConfigured &&
      currentSettings.defaultChannelConfigured &&
      true;

    const settings = await prisma.workspaceSettings.update({
      where: {
        workspaceId: session.workspaceId,
      },
      data: {
        spreadsheetConfigured: true,
        setupCompleted,
      },
    });

    const workspace = await prisma.workspace.update({
      where: {
        id: session.workspaceId,
      },
      data: {
        setupCompleted,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Planilha importada e dados financeiros salvos com sucesso.",
      import: {
        id: updatedImport.id,
        originalName: updatedImport.originalName,
        entriesCount: updatedImport.entriesCount,
        outputsCount: updatedImport.outputsCount,
        groupsCount: updatedImport.groupsCount,
        brandsCount: updatedImport.brandsCount,
        importedAt: updatedImport.importedAt,
      },
      summary: {
        fileName: file.name,
        sheets: workbook.SheetNames.length,
        rows: financialEntries.length,
        rowsRead: financialEntries.length,
        rowsSaved: financialEntries.length,
        entradas: entradaEntries.length,
        saidas: saidaEntries.length,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        setupCompleted: workspace.setupCompleted,
      },
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao importar planilha.",
      },
      { status: 500 }
    );
  }
}