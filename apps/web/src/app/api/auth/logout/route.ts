import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  await destroySession();

  return NextResponse.json({
    status: "ok",
    message: "Logout realizado com sucesso.",
  });
}
