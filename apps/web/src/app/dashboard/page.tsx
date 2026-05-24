import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function DashboardPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <DashboardOverview />
    </AdminShell>
  );
}