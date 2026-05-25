import { SistemaImportDashboard } from "@/components/configuracoes/SistemaImportDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesSistemaPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <SistemaImportDashboard />
    </AdminShell>
  );
}
