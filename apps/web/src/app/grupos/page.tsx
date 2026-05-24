import { GruposDashboard } from "@/components/grupos/GruposDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function GruposPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <GruposDashboard />
    </AdminShell>
  );
}