import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
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

    const discordConnection = await prisma.discordConnection.upsert({
      where: {
        workspaceId: session.workspaceId,
      },
      update: {
        guildId: "dev-guild-2k-studios",
        guildName: "Servidor 2K Studios Dev",
        defaultChannelId: "dev-channel-chat-privado",
        defaultChannelName: "chat-privado",
        connectedAt: new Date(),
      },
      create: {
        workspaceId: session.workspaceId,
        guildId: "dev-guild-2k-studios",
        guildName: "Servidor 2K Studios Dev",
        defaultChannelId: "dev-channel-chat-privado",
        defaultChannelName: "chat-privado",
        connectedAt: new Date(),
      },
    });

    const settings = await prisma.workspaceSettings.upsert({
      where: {
        workspaceId: session.workspaceId,
      },
      update: {
        discordConfigured: true,
        defaultChannelConfigured: true,
      },
      create: {
        workspaceId: session.workspaceId,
        companyConfigured: false,
        discordConfigured: true,
        defaultChannelConfigured: true,
        spreadsheetConfigured: false,
        setupCompleted: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Discord conectado em modo desenvolvimento.",
      discordConnection,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao conectar Discord.",
      },
      { status: 500 }
    );
  }
}