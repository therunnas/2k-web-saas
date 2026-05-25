import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Tela de login.
 *
 * Mesmo comportamento da raiz: se o cookie de sessão for válido, manda
 * direto para o destino correto em vez de mostrar o formulário de login.
 */
export default async function LoginPage() {
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
