import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError, blockedInProduction, unauthorized } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function POST() {
  // Rota de desenvolvimento — popula a conexão Discord com valores fake
  // para permitir avançar o setup local sem OAuth real. Bloqueada em produção.
  if (process.env.NODE_ENV === "production") {
    return blockedInProduction(
      "Conexão Discord em modo desenvolvimento está desabilitada em produção.",
    );
  }

  try {
    const session = await getSession();

    if (!session) {
      return unauthorized();
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
    return apiError("workspace.discord.dev-connect", error, {
      fallback: "Erro desconhecido ao conectar Discord.",
    });
  }
}
