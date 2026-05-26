import type { SessionPayload } from "@/lib/auth";

/**
 * Helpers centralizados para escopo por workspace.
 *
 * Padrão canônico das rotas de API: obter a sessão com `getSession()`, validar,
 * e SEMPRE espalhar `workspaceScope(session)` no `where` de qualquer query sobre
 * modelos pertencentes ao workspace. O guard em `src/lib/prisma.ts` reforça isso
 * em runtime (falha fechado se o filtro estiver ausente).
 *
 * Exemplo:
 *   const session = await getSession();
 *   if (!session) return unauthorized();
 *   const rows = await prisma.financialEntry.findMany({
 *     where: { ...workspaceScope(session), deletedAt: null },
 *   });
 */
export function workspaceScope(session: Pick<SessionPayload, "workspaceId">) {
  return { workspaceId: session.workspaceId };
}

/** Garante que há um workspaceId válido antes de operar. */
export function assertWorkspaceId(
  workspaceId: string | null | undefined,
): asserts workspaceId is string {
  if (!workspaceId) {
    throw new Error("workspaceId ausente: operação não autorizada.");
  }
}
