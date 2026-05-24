import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireCompletedSetup() {
  const session = await requireAdminSession();

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: session.workspaceId,
    },
    include: {
      settings: true,
    },
  });

  if (!workspace) {
    redirect("/login");
  }

  const setupCompleted =
    Boolean(workspace.setupCompleted) || Boolean(workspace.settings?.setupCompleted);

  if (!setupCompleted) {
    redirect("/setup");
  }

  return {
    session,
    workspace,
    setupCompleted,
  };
}