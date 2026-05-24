"use client";

import { useEffect } from "react";
import { AppErrorState } from "@/components/states/AppStates";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="dashboard-ui min-h-screen bg-[#070b13] text-white">
      <AppErrorState
        title="Não foi possível carregar esta área."
        description="Ocorreu uma falha inesperada ao renderizar o módulo. Tente novamente."
        onRetry={reset}
      />
    </main>
  );
}