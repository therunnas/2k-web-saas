import { AdminShell } from "@/components/layout/AdminShell";
import { ProducoesDashboard } from "@/components/producoes/ProducoesDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ProducoesPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <ProducoesDashboard />
    </AdminShell>
  );
}
