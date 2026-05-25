import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        status: "blocked",
        message: "Setup state route is disabled in production.",
      },
      { status: 403 },
    );
  }

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
    const completed = Boolean(body.completed);

    const workspace = await prisma.workspace.update({
      where: {
        id: session.workspaceId,
      },
      data: {
        setupCompleted: completed,
      },
    });

    const settings = await prisma.workspaceSettings.upsert({
      where: {
        workspaceId: session.workspaceId,
      },
      update: {
        setupCompleted: completed,
        companyConfigured: completed,
        discordConfigured: completed,
        defaultChannelConfigured: completed,
        spreadsheetConfigured: completed,
      },
      create: {
        workspaceId: session.workspaceId,
        setupCompleted: completed,
        companyConfigured: completed,
        discordConfigured: completed,
        defaultChannelConfigured: completed,
        spreadsheetConfigured: completed,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: completed
        ? "Setup marcado como completo."
        : "Setup marcado como incompleto.",
      workspace: {
        id: workspace.id,
        name: workspace.name,
        setupCompleted: workspace.setupCompleted,
      },
      settings,
    });
  } catch (error) {
    return apiError("dev.setup-state", error, {
      fallback: "Erro desconhecido ao atualizar setup.",
    });
  }
}
