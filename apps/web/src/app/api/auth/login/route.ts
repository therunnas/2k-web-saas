import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        {
          status: "error",
          message: "E-mail e senha são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          status: "error",
          message: "Credenciais inválidas.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          status: "error",
          message: "Usuário sem permissão administrativa.",
        },
        { status: 403 }
      );
    }

    const passwordIsValid = await compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          status: "error",
          message: "Credenciais inválidas.",
        },
        { status: 401 }
      );
    }

    const membership = user.workspaces[0];

    if (!membership) {
      return NextResponse.json(
        {
          status: "error",
          message: "Nenhum workspace vinculado ao admin.",
        },
        { status: 403 }
      );
    }

    const workspace = membership.workspace;
    const setupCompleted =
      Boolean(workspace.setupCompleted) ||
      Boolean(workspace.settings?.setupCompleted);

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: workspace.id,
    });

    return NextResponse.json({
      status: "ok",
      message: "Login realizado com sucesso.",
      redirectTo: setupCompleted ? "/dashboard" : "/setup",
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
        setupCompleted,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao realizar login.",
      },
      { status: 500 }
    );
  }
}