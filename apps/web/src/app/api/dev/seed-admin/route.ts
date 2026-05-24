import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

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

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        status: "blocked",
        message: "Seed admin is disabled in production.",
      },
      { status: 403 }
    );
  }

  try {
    const adminName = process.env.ADMIN_NAME?.trim() || "Admin 2K Studios";
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        {
          status: "error",
          message: "ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env.",
        },
        { status: 400 }
      );
    }

    if (adminPassword.length < 8) {
      return NextResponse.json(
        {
          status: "error",
          message: "ADMIN_PASSWORD must have at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hash(adminPassword, 12);

    const user = await prisma.user.upsert({
      where: {
        email: adminEmail,
      },
      update: {
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
      create: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });

    const workspaceName = "2K Studios";
    const workspaceSlug = createSlug(workspaceName);

    const workspace = await prisma.workspace.upsert({
      where: {
        slug: workspaceSlug,
      },
      update: {
        name: workspaceName,
      },
      create: {
        name: workspaceName,
        slug: workspaceSlug,
      },
    });

    const member = await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      update: {
        role: "ADMIN",
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });

    const settings = await prisma.workspaceSettings.upsert({
      where: {
        workspaceId: workspace.id,
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        companyConfigured: false,
        discordConfigured: false,
        defaultChannelConfigured: false,
        spreadsheetConfigured: false,
        setupCompleted: false,
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Admin seed created.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        setupCompleted: workspace.setupCompleted,
      },
      member: {
        id: member.id,
        role: member.role,
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
            : "Unknown error while creating admin seed.",
      },
      { status: 500 }
    );
  }
}