import { AdminShell } from "@/components/layout/AdminShell";
import { RelatoriosDashboard } from "@/components/relatorios/RelatoriosDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function RelatoriosPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <RelatoriosDashboard />
    </AdminShell>
  );
}