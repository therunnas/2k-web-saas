import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "unauthorized",
          authenticated: false,
          message: "Sessão inválida.",
        },
        { status: 401 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: session.workspaceId,
      },
      include: {
        settings: true,
        discordConnection: true,
        imports: {
          orderBy: {
            importedAt: "desc",
          },
          take: 5,
        },
        financialEntries: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        {
          status: "not_found",
          authenticated: true,
          message: "Workspace não encontrado.",
        },
        { status: 404 }
      );
    }

    const settings = workspace.settings;

    const setupStatus = {
      companyConfigured: Boolean(settings?.companyConfigured),
      discordConfigured: Boolean(settings?.discordConfigured),
      defaultChannelConfigured: Boolean(settings?.defaultChannelConfigured),
      spreadsheetConfigured: Boolean(settings?.spreadsheetConfigured),
      setupCompleted:
        Boolean(workspace.setupCompleted) || Boolean(settings?.setupCompleted),
    };

    const completedSteps = [
      setupStatus.companyConfigured,
      setupStatus.discordConfigured,
      setupStatus.defaultChannelConfigured,
      setupStatus.spreadsheetConfigured,
    ].filter(Boolean).length;

    return NextResponse.json({
      status: "ok",
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        setupCompleted: workspace.setupCompleted,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      settings,
      discordConnection: workspace.discordConnection,
      imports: workspace.imports,
      financialEntries: workspace.financialEntries,
      setup: {
        completedSteps,
        totalSteps: 4,
        ...setupStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        authenticated: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar workspace.",
      },
      { status: 500 }
    );
  }
}