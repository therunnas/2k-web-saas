import { CatalogManager } from "@/components/configuracoes/CatalogManager";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesEntradasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <CatalogManager
        eyebrow="Configurações / Entradas"
        title="Bases de entradas."
        description="Gerencie grupos e marcas usados nos lançamentos de entrada. Esta área não mistura fornecedores, despesas ou custos."
        sections={[
          {
            type: "GROUP",
            title: "Grupos",
            description: "Quem emite ou recebe a NF/CNPJ.",
          },
          {
            type: "BRAND",
            title: "Marcas",
            description: "Quem pediu o job/trabalho.",
          },
        ]}
      />
    </AdminShell>
  );
}