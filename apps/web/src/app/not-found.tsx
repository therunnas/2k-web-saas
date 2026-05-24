import Link from "next/link";
import { SearchX } from "lucide-react";
import { AppStateCard } from "@/components/states/AppStates";

export default function NotFound() {
  return (
    <main className="dashboard-ui min-h-screen bg-[#070b13] text-white">
      <AppStateCard
        icon={<SearchX size={24} />}
        eyebrow="404"
        title="Página não encontrada."
        description="A rota acessada não existe ou foi removida durante a padronização do 2K Command OS."
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            Voltar para visão geral
          </Link>
        }
      />
    </main>
  );
}