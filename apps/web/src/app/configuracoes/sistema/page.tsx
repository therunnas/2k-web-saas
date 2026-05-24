import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesSistemaPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <div className="space-y-6">
        <header>
          <p className="dashboard-label text-[11px] text-violet-300">
            Configurações / Sistema
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Configurações do sistema.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            Área preparada para empresa, workspace, importação de planilha,
            integrações e preferências gerais.
          </p>
        </header>

        <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6">
          <p className="text-sm font-semibold text-slate-300">
            Próximas opções
          </p>

          <div className="mt-4 grid gap-3 text-sm font-medium text-slate-500 xl:grid-cols-2">
            <p>Dados da empresa e workspace.</p>
            <p>Importação e histórico de planilhas.</p>
            <p>Integrações futuras.</p>
            <p>Preferências gerais do SaaS.</p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}