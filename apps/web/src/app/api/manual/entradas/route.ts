import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type FinancialEntryTypeValue =
  | "REVENUE"
  | "RECEIVABLE"
  | "EXPENSE"
  | "PAYABLE"
  | "UNKNOWN"
  | "LEAD"
  | "CANCELED";

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

  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }

  raw = raw.replace(/-/g, "");

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function parseDate(value: unknown) {
  if (!value) return null;

  const parsed = new Date(String(value));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function competenceFromDate(date: Date | null) {
  const base = date ?? new Date();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const year = base.getFullYear();

  return `${month}/${year}`;
}

function mapEntradaType(
  commercialStatus: string,
  financialStatus: string,
): FinancialEntryTypeValue {
  if (commercialStatus === "CANCELADO" || financialStatus === "CANCELADO") {
    return "CANCELED";
  }

  if (commercialStatus === "LEAD") {
    return "LEAD";
  }

  if (financialStatus === "PAGO") {
    return "REVENUE";
  }

  return "RECEIVABLE";
}

function buildEntradaPayload(body: Record<string, unknown>) {
  const groupName = text(body.groupName);
  const client = text(body.client);
  const project = text(body.project);
  const description = text(body.description);
  const documentNumber = text(body.documentNumber);
  const commercialStatus = text(
    body.commercialStatus || "AGUARDANDO_PAGAMENTO",
  );
  const financialStatus = text(body.financialStatus || "A_RECEBER");
  const notes = text(body.notes);

  const value = money(body.value);
  const issuedAt = parseDate(body.issuedAt);
  const dueAt = parseDate(body.dueAt);
  const paidAt = parseDate(body.paidAt);

  const mainDate = paidAt ?? dueAt ?? issuedAt ?? new Date();

  return {
    groupName,
    client,
    project,
    description,
    documentNumber,
    commercialStatus,
    financialStatus,
    notes,
    value,
    issuedAt,
    dueAt,
    paidAt,
    mainDate,
    type: mapEntradaType(commercialStatus, financialStatus),
  };
}

function validateEntrada(payload: ReturnType<typeof buildEntradaPayload>) {
  if (!payload.groupName) return "Informe o grupo.";
  if (!payload.client) return "Informe a marca/cliente.";
  if (!payload.project) return "Informe o projeto.";
  if (payload.value <= 0) return "Informe um valor maior que zero.";
  return null;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 },
      );
    }

    const entries = await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "ENTRADA",
        deletedAt: null,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({
      status: "ok",
      entries,
    });
  } catch (error) {
    return apiError("manual.entradas", error, {
      fallback: "Erro desconhecido ao listar entradas manuais.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const payload = buildEntradaPayload(body);
    const validationError = validateEntrada(payload);

    if (validationError) {
      return NextResponse.json(
        { status: "error", message: validationError },
        { status: 400 },
      );
    }

    const entry = await prisma.financialEntry.create({
      data: {
        workspaceId: session.workspaceId,
        importId: null,
        type: payload.type,
        date: payload.mainDate,
        competence: competenceFromDate(payload.mainDate),
        client: payload.client,
        groupName: payload.groupName,
        project: payload.project,
        description: payload.description || payload.project,
        category: "Entrada manual",
        status: payload.financialStatus,
        grossAmount: decimal(payload.value),
        costAmount: decimal(0),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "MANUAL",
        isManual: true,
        editable: true,
        deletedAt: null,
        manualKind: "ENTRADA",
        documentNumber: payload.documentNumber,
        commercialStatus: payload.commercialStatus,
        financialStatus: payload.financialStatus,
        issuedAt: payload.issuedAt,
        dueAt: payload.dueAt,
        paidAt: payload.paidAt,
        supplierName: null,
        subCategory: null,
        nature: null,
        recurrence: null,
        notes: payload.notes,
        sourceSheet: "SAAS_ENTRADAS",
        sourceRow: null,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Entrada criada com sucesso.",
      entry,
    });
  } catch (error) {
    return apiError("manual.entradas", error, {
      fallback: "Erro desconhecido ao criar entrada manual.",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const id = text(body.id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID da entrada não informado." },
        { status: 400 },
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "ENTRADA",
        editable: true,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Entrada manual não encontrada ou não editável.",
        },
        { status: 404 },
      );
    }

    const payload = buildEntradaPayload(body);
    const validationError = validateEntrada(payload);

    if (validationError) {
      return NextResponse.json(
        { status: "error", message: validationError },
        { status: 400 },
      );
    }

    const entry = await prisma.financialEntry.update({
      where: { id },
      data: {
        type: payload.type,
        date: payload.mainDate,
        competence: competenceFromDate(payload.mainDate),
        client: payload.client,
        groupName: payload.groupName,
        project: payload.project,
        description: payload.description || payload.project,
        category: "Entrada manual",
        status: payload.financialStatus,
        grossAmount: decimal(payload.value),
        costAmount: decimal(0),
        profitAmount: decimal(0),
        marginPercent: null,
        documentNumber: payload.documentNumber,
        commercialStatus: payload.commercialStatus,
        financialStatus: payload.financialStatus,
        issuedAt: payload.issuedAt,
        dueAt: payload.dueAt,
        paidAt: payload.paidAt,
        notes: payload.notes,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Entrada atualizada com sucesso.",
      entry,
    });
  } catch (error) {
    return apiError("manual.entradas", error, {
      fallback: "Erro desconhecido ao editar entrada manual.",
    });
  }
}
export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = text(body.id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID da entrada não informado." },
        { status: 400 },
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "ENTRADA",
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Entrada manual não encontrada." },
        { status: 404 },
      );
    }

    await prisma.financialEntry.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        editable: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Entrada excluída com sucesso.",
    });
  } catch (error) {
    return apiError("manual.entradas", error, {
      fallback: "Erro desconhecido ao excluir entrada manual.",
    });
  }
}
