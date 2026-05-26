import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Guard de isolamento por workspace (defesa em profundidade no app-level).
 *
 * Enquanto o RLS real no Postgres não está ativo (ver SECURITY.md), esta
 * extensão garante que NENHUMA leitura/escrita em massa sobre modelos
 * pertencentes a um workspace rode sem um filtro `workspaceId` — falhando
 * fechado (throw) para impedir vazamento acidental entre workspaces.
 *
 * Não cobre operações por id único (`findUnique`/`update`/`delete`), que já
 * são protegidas no app por uma checagem de posse (findFirst + workspaceId)
 * antes da mutação.
 */
const GUARDED_MODELS = new Set([
  "FinancialEntry",
  "Import",
  "ManualCatalogItem",
  "DiscordConnection",
  "WorkspaceSettings",
]);

const GUARDED_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

function whereHasWorkspaceId(where: unknown): boolean {
  if (!where || typeof where !== "object") return false;

  const record = where as Record<string, unknown>;

  if ("workspaceId" in record && record.workspaceId != null) {
    return true;
  }

  for (const key of ["AND", "OR", "NOT"] as const) {
    const value = record[key];
    if (Array.isArray(value) && value.some(whereHasWorkspaceId)) return true;
    if (value && !Array.isArray(value) && whereHasWorkspaceId(value)) {
      return true;
    }
  }

  return false;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const base = new PrismaClient({ adapter });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            GUARDED_MODELS.has(model) &&
            GUARDED_OPERATIONS.has(operation)
          ) {
            const where = (args as { where?: unknown } | undefined)?.where;
            if (!whereHasWorkspaceId(where)) {
              throw new Error(
                `[workspace-guard] ${model}.${operation} bloqueado: ` +
                  `operação sem filtro workspaceId.`,
              );
            }
          }

          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
