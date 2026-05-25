import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

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

  const negative = raw.includes("-");

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
  return value.toFixed(2);
}

function parseDate(value: unknown) {
  if (!value) return new Date();

  const parsed = new Date(String(value));

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function competenceFromDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${year}`;
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

    const body = await request.json();

    const groupName = text(body.groupName);
    const client = text(body.client);
    const project = text(body.project);
    const description = text(body.description);
    const status = text(body.status || "PENDING");
    const value = money(body.value);
    const date = parseDate(body.date);

    if (!groupName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe o grupo.",
        },
        { status: 400 },
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe o cliente/marca.",
        },
        { status: 400 },
      );
    }

    if (!project) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe o projeto.",
        },
        { status: 400 },
      );
    }

    if (value <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe um valor maior que zero.",
        },
        { status: 400 },
      );
    }

    const isReceived = status === "RECEIVED";

    const entry = await prisma.financialEntry.create({
      data: {
        workspaceId: session.workspaceId,
        importId: null,
        type: isReceived ? "REVENUE" : "RECEIVABLE",
        date,
        competence: competenceFromDate(date),
        client,
        groupName,
        project,
        description: description || project,
        category: "Produção manual",
        status: isReceived ? "PAGO" : "AGUARDANDO PAGAMENTO",
        grossAmount: decimal(value),
        costAmount: decimal(0),
        profitAmount: decimal(0),
        marginPercent: null,
        sourceType: "MANUAL",
        isManual: true,
        editable: true,
        sourceSheet: "SAAS_MANUAL",
        sourceRow: null,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Produção manual criada com sucesso.",
      entry,
    });
  } catch (error) {
    return apiError("producoes.manual", error, {
      fallback: "Erro desconhecido ao criar produção manual.",
    });
  }
}
