import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

function mapSaidaType(financialStatus: string): FinancialEntryTypeValue {
  if (financialStatus === "CANCELADO") {
    return "CANCELED";
  }

  if (financialStatus === "PAGO") {
    return "EXPENSE";
  }

  return "PAYABLE";
}

function buildSaidaPayload(body: Record<string, unknown>) {
  const category = text(body.category);
  const supplierName = text(body.supplierName);
  const description = text(body.description);
  const project = text(body.project);
  const linkedClient = text(body.linkedClient);
  const financialStatus = text(body.financialStatus || "A_PAGAR");
  const recurrence = text(body.recurrence || "PONTUAL");
  const subCategory = text(body.subCategory);
  const nature = text(body.nature || "VARIAVEL");
  const costCenter = text(body.costCenter);
  const paymentMethod = text(body.paymentMethod);
  const accountName = text(body.accountName);
  const proofUrl = text(body.proofUrl);
  const notes = text(body.notes);

  const expectedValue = money(body.expectedValue ?? body.value);
  const paidValue = money(body.paidValue);
  const fallbackValue = money(body.value);

  const resolvedValue =
    financialStatus === "PAGO"
      ? paidValue || expectedValue || fallbackValue
      : expectedValue || fallbackValue || paidValue;

  const dueAt = parseDate(body.dueAt);
  const paidAt = parseDate(body.paidAt);

  const mainDate = paidAt ?? dueAt ?? new Date();

  return {
    category,
    supplierName,
    description,
    project,
    linkedClient,
    financialStatus,
    recurrence,
    subCategory,
    nature,
    costCenter,
    paymentMethod,
    accountName,
    proofUrl,
    notes,
    expectedValue,
    paidValue,
    resolvedValue,
    dueAt,
    paidAt,
    mainDate,
    type: mapSaidaType(financialStatus),
  };
}

function validateSaida(payload: ReturnType<typeof buildSaidaPayload>) {
  if (!payload.category) return "Informe a categoria.";
  if (!payload.subCategory) return "Informe a subcategoria.";
  if (!payload.supplierName) return "Informe o fornecedor/nome.";
  if (!payload.description) return "Informe a descrição.";
  if (payload.resolvedValue <= 0) return "Informe um valor maior que zero.";

  if (payload.financialStatus === "PAGO" && !payload.paidAt) {
    return "Informe a data de pagamento para saídas pagas.";
  }

  return null;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 }
      );
    }

    const entries = await prisma.financialEntry.findMany({
      where: {
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "SAIDA",
        deletedAt: null,
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });

    return NextResponse.json({
      status: "ok",
      entries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao listar saídas manuais.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = buildSaidaPayload(body);
    const validationError = validateSaida(payload);

    if (validationError) {
      return NextResponse.json(
        { status: "error", message: validationError },
        { status: 400 }
      );
    }

    const entry = await prisma.financialEntry.create({
      data: {
        workspaceId: session.workspaceId,
        importId: null,
        type: payload.type,
        date: payload.mainDate,
        competence: competenceFromDate(payload.mainDate),
        client: payload.supplierName,
        groupName: payload.supplierName,
        project: payload.project || payload.description,
        description: payload.description,
        category: payload.category,
        status: payload.financialStatus,
        grossAmount: decimal(0),
        costAmount: decimal(payload.resolvedValue),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "MANUAL",
        isManual: true,
        editable: true,
        deletedAt: null,
        manualKind: "SAIDA",
        documentNumber: null,
        commercialStatus: null,
        financialStatus: payload.financialStatus,
        issuedAt: null,
        dueAt: payload.dueAt,
        paidAt: payload.paidAt,
        supplierName: payload.supplierName,
        subCategory: payload.subCategory,
        nature: payload.nature,
        recurrence: payload.recurrence,
        notes: payload.notes,
        linkedClient: payload.linkedClient,
        costCenter: payload.costCenter,
        paymentMethod: payload.paymentMethod,
        accountName: payload.accountName,
        proofUrl: payload.proofUrl,
        expectedAmount: decimal(payload.expectedValue || payload.resolvedValue),
        paidAmount: decimal(
          payload.financialStatus === "PAGO"
            ? payload.paidValue || payload.resolvedValue
            : 0
        ),
        sourceSheet: "SAAS_SAIDAS",
        sourceRow: null,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Saída criada com sucesso.",
      entry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao criar saída manual.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = text(body.id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID da saída não informado." },
        { status: 400 }
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "SAIDA",
        editable: true,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          status: "error",
          message: "Saída manual não encontrada ou não editável.",
        },
        { status: 404 }
      );
    }

    const payload = buildSaidaPayload(body);
    const validationError = validateSaida(payload);

    if (validationError) {
      return NextResponse.json(
        { status: "error", message: validationError },
        { status: 400 }
      );
    }

    const entry = await prisma.financialEntry.update({
      where: { id },
      data: {
        type: payload.type,
        date: payload.mainDate,
        competence: competenceFromDate(payload.mainDate),
        client: payload.supplierName,
        groupName: payload.supplierName,
        project: payload.project || payload.description,
        description: payload.description,
        category: payload.category,
        status: payload.financialStatus,
        grossAmount: decimal(0),
        costAmount: decimal(payload.resolvedValue),
        profitAmount: decimal(0),
        marginPercent: null,
        financialStatus: payload.financialStatus,
        dueAt: payload.dueAt,
        paidAt: payload.paidAt,
        supplierName: payload.supplierName,
        subCategory: payload.subCategory,
        nature: payload.nature,
        recurrence: payload.recurrence,
        notes: payload.notes,
        linkedClient: payload.linkedClient,
        costCenter: payload.costCenter,
        paymentMethod: payload.paymentMethod,
        accountName: payload.accountName,
        proofUrl: payload.proofUrl,
        expectedAmount: decimal(payload.expectedValue || payload.resolvedValue),
        paidAmount: decimal(
          payload.financialStatus === "PAGO"
            ? payload.paidValue || payload.resolvedValue
            : 0
        ),
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Saída atualizada com sucesso.",
      entry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao editar saída manual.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { status: "unauthorized", message: "Sessão inválida." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = text(body.id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID da saída não informado." },
        { status: 400 }
      );
    }

    const existing = await prisma.financialEntry.findFirst({
      where: {
        id,
        workspaceId: session.workspaceId,
        sourceType: "MANUAL",
        manualKind: "SAIDA",
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Saída manual não encontrada." },
        { status: 404 }
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
      message: "Saída excluída com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao excluir saída manual.",
      },
      { status: 500 }
    );
  }
}