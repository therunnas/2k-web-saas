import { AgendaDashboard } from "@/components/agenda/AgendaDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function AgendaPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <AgendaDashboard />
    </AdminShell>
  );
}