import { createSession, getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AVATAR_DATA_URL_LENGTH = 900_000;

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanUsername(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function defaultUsernameFromEmail(email: string) {
  return email.split("@")[0] || "admin";
}

function cleanAvatarDataUrl(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const avatarDataUrl = String(value);

  const allowedPattern =
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

  if (!allowedPattern.test(avatarDataUrl)) {
    throw new Error("Formato de imagem inválido. Use PNG, JPG ou WEBP.");
  }

  if (avatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error("Imagem muito grande. Use uma imagem menor.");
  }

  return avatarDataUrl;
}

export async function GET() {
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

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatarDataUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          status: "not_found",
          message: "Usuário não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "ok",
      user: {
        ...user,
        username: user.username ?? defaultUsernameFromEmail(user.email),
      },
    });
  } catch (error) {
    return apiError("account.profile.get", error, {
      fallback: "Erro desconhecido ao carregar perfil.",
    });
  }
}

export async function PATCH(request: Request) {
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

    const name = cleanName(body.name);
    const username = cleanUsername(body.username);
    const avatarDataUrl = cleanAvatarDataUrl(body.avatarDataUrl);

    if (name.length < 2) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe um nome com pelo menos 2 caracteres.",
        },
        { status: 400 },
      );
    }

    if (name.length > 80) {
      return NextResponse.json(
        {
          status: "error",
          message: "O nome deve ter no máximo 80 caracteres.",
        },
        { status: 400 },
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          status: "error",
          message: "Informe um nome de usuário com pelo menos 3 caracteres.",
        },
        { status: 400 },
      );
    }

    if (username.length > 32) {
      return NextResponse.json(
        {
          status: "error",
          message: "O nome de usuário deve ter no máximo 32 caracteres.",
        },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.userId,
      },
      data: {
        name,
        username,
        ...(avatarDataUrl !== undefined
          ? {
              avatarDataUrl,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatarDataUrl: true,
        updatedAt: true,
      },
    });

    await createSession({
      userId: session.userId,
      email: session.email,
      name: updatedUser.name,
      role: session.role,
      workspaceId: session.workspaceId,
    });

    return NextResponse.json({
      status: "ok",
      message: "Perfil atualizado com sucesso.",
      user: updatedUser,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao atualizar perfil.";

    if (
      message.includes("Formato de imagem inválido") ||
      message.includes("Imagem muito grande")
    ) {
      return NextResponse.json(
        {
          status: "error",
          message,
        },
        { status: 400 },
      );
    }

    return apiError("account.profile.patch", error, {
      fallback: "Erro desconhecido ao atualizar perfil.",
    });
  }
}