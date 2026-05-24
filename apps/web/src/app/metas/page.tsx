import { AdminShell } from "@/components/layout/AdminShell";
import { MetasDashboard } from "@/components/metas/MetasDashboard";
import { requireCompletedSetup } from "@/lib/guards";

export default async function MetasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <MetasDashboard />
    </AdminShell>
  );
}