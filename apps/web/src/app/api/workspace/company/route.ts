import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

    const companyName = String(body.companyName ?? "").trim();
    const responsibleName = String(body.responsibleName ?? "").trim();

    if (!companyName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Nome da empresa é obrigatório.",
        },
        { status: 400 },
      );
    }

    if (!responsibleName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Nome do responsável é obrigatório.",
        },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.update({
      where: {
        id: session.workspaceId,
      },
      data: {
        name: companyName,
        slug: createSlug(companyName),
      },
    });

    const user = await prisma.user.update({
      where: {
        id: session.userId,
      },
      data: {
        name: responsibleName,
      },
    });

    const settings = await prisma.workspaceSettings.upsert({
      where: {
        workspaceId: session.workspaceId,
      },
      update: {
        companyConfigured: true,
      },
      create: {
        workspaceId: session.workspaceId,
        companyConfigured: true,
        discordConfigured: false,
        defaultChannelConfigured: false,
        spreadsheetConfigured: false,
        setupCompleted: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Empresa configurada com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        setupCompleted: workspace.setupCompleted,
      },
      settings,
    });
  } catch (error) {
    return apiError("workspace.company", error, {
      fallback: "Erro desconhecido ao salvar empresa.",
    });
  }
}
