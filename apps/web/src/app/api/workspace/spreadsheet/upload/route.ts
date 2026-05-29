import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { apiError } from "@/lib/api-errors";
import {
  matchSheetName,
  parseEntradas,
  parseSaidas,
  type ParsedFinancialRow,
} from "@/lib/spreadsheet-import";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type FinancialEntryInput = ParsedFinancialRow & {
  workspaceId: string;
  importId: string;
  sourceSheet: string;
};

function getSheet(workbook: XLSX.WorkBook, expected: "entradas" | "saidas") {
  const sheetName = matchSheetName(workbook.SheetNames, expected);

  if (!sheetName) return null;

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) return null;

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  return { sheetName, matrix };
}

function withMeta(
  rows: ParsedFinancialRow[],
  meta: { workspaceId: string; importId: string; sourceSheet: string },
): FinancialEntryInput[] {
  return rows.map((row) => ({ ...row, ...meta }));
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
        { status: 401 },
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
        { status: 400 },
      );
    }

    if (!isAllowedSpreadsheet(file.name)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Envie uma planilha .xlsx ou .xls.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          status: "error",
          message: `Arquivo acima do limite de ${MAX_FILE_SIZE_MB}MB.`,
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Parse ANTES de tocar no banco: se a planilha nova não gerar nenhuma linha
    // válida, abortamos sem apagar o lote anterior (importação não-destrutiva).
    const parsedEntradas = parseEntradas(entradasSheet.matrix);
    const parsedSaidas = parseSaidas(saidasSheet.matrix);

    if (parsedEntradas.length + parsedSaidas.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Nenhuma linha válida encontrada na planilha. Os dados anteriores foram preservados. Verifique se as abas 💰 ENTRADAS e 💸 SAÍDAS têm cabeçalho com a coluna 'Valor', valores maiores que zero e datas válidas (Mês Ref. ou Data).",
        },
        { status: 422 },
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

    const meta = {
      workspaceId: session.workspaceId,
      importId: importRecord.id,
    };

    const entradaEntries = withMeta(parsedEntradas, {
      ...meta,
      sourceSheet: entradasSheet.sheetName,
    });

    const saidaEntries = withMeta(parsedSaidas, {
      ...meta,
      sourceSheet: saidasSheet.sheetName,
    });

    const financialEntries = [...entradaEntries, ...saidaEntries];

    // Idempotência: remove o lote anterior da planilha antes de regravar,
    // evitando duplicidade ao reimportar. Só roda após confirmar que há
    // linhas novas válidas para gravar.
    await prisma.financialEntry.deleteMany({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "SPREADSHEET",
      },
    });

    // Cast pontual e localizado: o cliente Prisma tipa Decimal como
    // `Decimal | DecimalJsLike | string | number`, e aqui usamos strings
    // (`decimal()` retorna `"0.00"`). O Prisma converte na inserção.
    await prisma.financialEntry.createMany({
      data: financialEntries as unknown as NonNullable<Parameters<typeof prisma.financialEntry.createMany>[0]>["data"],
    });

    const groupsCount = new Set(
      entradaEntries
        .map((entry) => entry.groupName)
        .filter((name): name is string => Boolean(name)),
    ).size;

    const brandsCount = new Set(
      entradaEntries
        .map((entry) => entry.client)
        .filter((name): name is string => Boolean(name)),
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
      currentSettings.spreadsheetConfigured;

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
    return apiError("workspace.spreadsheet.upload", error, {
      fallback: "Erro desconhecido ao importar planilha.",
    });
  }
}
