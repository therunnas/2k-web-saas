import { AdminShell } from "@/components/layout/AdminShell";
import { NovaProducaoCard } from "@/components/producoes/NovaProducaoCard";
import { ProducoesDashboard } from "@/components/producoes/ProducoesDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ProducoesPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <div className="space-y-6">
        <NovaProducaoCard />
        <ProducoesDashboard />
      </div>
    </AdminShell>
  );
}