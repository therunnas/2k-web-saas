import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Página inicial pública.
 *
 * Se o usuário já está autenticado, redireciona direto para o destino correto
 * (dashboard ou setup) — evita "tela de login presa" para quem já fez login
 * e simplesmente voltou para a raiz do domínio.
 */
export default async function Home() {
  const session = await getSession();

  if (session) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.workspaceId },
      include: { settings: true },
    });

    const setupCompleted =
      Boolean(workspace?.setupCompleted) ||
      Boolean(workspace?.settings?.setupCompleted);

    redirect(setupCompleted ? "/dashboard" : "/setup");
  }

  return <LoginScreen />;
}
