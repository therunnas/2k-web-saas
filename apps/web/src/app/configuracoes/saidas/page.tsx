import { CatalogManager } from "@/components/configuracoes/CatalogManager";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesSaidasPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <CatalogManager
        eyebrow="Configurações / Saídas"
        title="Bases de saídas."
        description="Gerencie fornecedores, categorias e subcategorias de despesas. Esta área não mistura grupos e marcas."
        sections={[
          {
            type: "SUPPLIER",
            title: "Fornecedores",
            description: "Quem recebe pagamentos, custos ou despesas.",
          },
          {
            type: "EXPENSE_CATEGORY",
            title: "Categorias de saída",
            description: "Categoria principal da despesa.",
          },
          {
            type: "EXPENSE_SUBCATEGORY",
            title: "Subcategorias de saída",
            description: "Detalhe operacional da despesa/custo.",
          },
        ]}
      />
    </AdminShell>
  );
}