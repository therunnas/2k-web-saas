import { EntradasManualDashboard } from "@/components/entradas/EntradasManualDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function EntradasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <EntradasManualDashboard />
    </AdminShell>
  );
}