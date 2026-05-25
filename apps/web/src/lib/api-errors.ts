import { NextResponse } from "next/server";

/**
 * Retorna uma resposta de erro JSON sem vazar detalhes internos.
 *
 * Em produção, a `message` enviada ao cliente é sempre `fallback`.
 * Em desenvolvimento, é incluído um campo `debug` extra para facilitar troubleshooting.
 *
 * O erro real é sempre registrado via `console.error` para análise no servidor.
 */
export function apiError(
  context: string,
  error: unknown,
  options: {
    status?: number;
    fallback?: string;
  } = {},
) {
  const status = options.status ?? 500;
  const fallback = options.fallback ?? "Erro interno do servidor.";

  const detail =
    error instanceof Error ? error.message : "Erro desconhecido (não-Error).";

  // Log estruturado no servidor — nunca enviado ao cliente.
  console.error(`[api] ${context}:`, detail, error);

  const payload: Record<string, unknown> = {
    status: "error",
    message: fallback,
  };

  // Apenas em dev expomos detalhes para debug local.
  if (process.env.NODE_ENV !== "production") {
    payload.debug = detail;
  }

  return NextResponse.json(payload, { status });
}

/**
 * Resposta padronizada para falha de autenticação.
 */
export function unauthorized(message = "Sessão inválida.") {
  return NextResponse.json(
    {
      status: "unauthorized",
      message,
    },
    { status: 401 },
  );
}

/**
 * Resposta padronizada para validação de input.
 */
export function badRequest(message: string) {
  return NextResponse.json(
    {
      status: "error",
      message,
    },
    { status: 400 },
  );
}

/**
 * Resposta padronizada para rotas bloqueadas em produção (rotas dev).
 */
export function blockedInProduction(
  message = "Esta rota está disponível apenas em desenvolvimento.",
) {
  return NextResponse.json(
    {
      status: "blocked",
      message,
    },
    { status: 403 },
  );
}
