import { ConfiguracoesHub } from "@/components/configuracoes/ConfiguracoesHub";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <ConfiguracoesHub />
    </AdminShell>
  );
}