import { ClientesDashboard } from "@/components/clientes/ClientesDashboard";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ClientesPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <ClientesDashboard />
    </AdminShell>
  );
}