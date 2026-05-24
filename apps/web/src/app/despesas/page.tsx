import { DespesasDashboard } from "@/components/despesas/DespesasDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function DespesasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <DespesasDashboard />
    </AdminShell>
  );
}