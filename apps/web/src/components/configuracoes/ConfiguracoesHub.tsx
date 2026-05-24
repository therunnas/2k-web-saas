import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Database,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";

const cards = [
  {
    title: "Entradas",
    description: "Gerenciar grupos e marcas usados nos lançamentos de entrada.",
    href: "/configuracoes/entradas",
    icon: Database,
    accent: "text-cyan-200",
  },
  {
    title: "Saídas",
    description:
      "Gerenciar fornecedores, categorias e subcategorias de despesas.",
    href: "/configuracoes/saidas",
    icon: SlidersHorizontal,
    accent: "text-rose-200",
  },
  {
    title: "Financeiro",
    description:
      "Preparado para contas, cartões, formas de pagamento e centros de custo.",
    href: "/configuracoes/financeiro",
    icon: Banknote,
    accent: "text-emerald-200",
  },
  {
    title: "Sistema",
    description:
      "Empresa, workspace, importação, integrações e preferências gerais.",
    href: "/configuracoes/sistema",
    icon: Settings2,
    accent: "text-violet-200",
  },
];

export function ConfiguracoesHub() {
  return (
    <div className="space-y-6">
      <header>
        <p className="dashboard-label text-[11px] text-cyan-300">
          Configurações
        </p>

        <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
          Central de configurações.
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
          Organize as bases do SaaS por área para não misturar grupos, marcas,
          fornecedores, categorias, contas e regras financeiras.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 transition hover:border-cyan-300/25 hover:bg-white/[0.035] xl:p-6"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ${card.accent}`}>
                    <Icon size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
                      {card.title}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                      {card.description}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={18}
                  className="mt-1 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-200"
                />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5">
        <p className="text-sm font-semibold text-slate-300">
          Regra oficial de organização
        </p>

        <div className="mt-3 grid gap-3 text-sm font-medium leading-6 text-slate-500 xl:grid-cols-2">
          <p>
            <strong className="text-cyan-200">Entradas:</strong> usam Grupos e
            Marcas. Grupo é quem emite/recebe NF. Marca é quem pediu o job.
          </p>

          <p>
            <strong className="text-rose-200">Saídas:</strong> usam
            Fornecedores, Categorias e Subcategorias. Não entram em Marcas ou
            Grupos.
          </p>
        </div>
      </section>
    </div>
  );
}