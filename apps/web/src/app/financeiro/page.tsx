import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function FinanceiroPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <FinanceiroDashboard />
    </AdminShell>
  );
}