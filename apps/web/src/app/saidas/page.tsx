import { AdminShell } from "@/components/layout/AdminShell";
import { SaidasManualDashboard } from "@/components/saidas/SaidasManualDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function SaidasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <SaidasManualDashboard />
    </AdminShell>
  );
}