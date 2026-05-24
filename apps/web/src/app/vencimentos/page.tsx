import { AdminShell } from "@/components/layout/AdminShell";
import { VencimentosDashboard } from "@/components/vencimentos/VencimentosDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function VencimentosPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <VencimentosDashboard />
    </AdminShell>
  );
}