import { CatalogManager } from "@/components/configuracoes/CatalogManager";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function ConfiguracoesFinanceiroPage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <CatalogManager
        eyebrow="Configurações / Financeiro"
        title="Bases financeiras."
        description="Gerencie centros de custo, formas de pagamento, contas bancárias, Pix CNPJ e recorrências usados nos lançamentos."
        sections={[
          {
            type: "COST_CENTER",
            title: "Centros de custo",
            description: "Área responsável pelo custo: Administração, Produção, Tecnologia, Financeiro ou Operacional.",
          },
          {
            type: "PAYMENT_METHOD",
            title: "Formas de pagamento",
            description: "Pix CNPJ, transferência bancária, boleto, débito em conta ou outro meio usado.",
          },
          {
            type: "ACCOUNT",
            title: "Contas / bancos",
            description: "Banco PJ, conta principal, Pix CNPJ ou conta usada no pagamento/recebimento.",
          },
          {
            type: "RECURRENCE",
            title: "Recorrências",
            description: "Pontual, mensal, anual, parcelado ou outro padrão de repetição.",
          },
        ]}
      />
    </AdminShell>
  );
}