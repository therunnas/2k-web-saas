import type { ModuleData } from "@/data/modules-data";
import {
  ArrowUpRight,
  Activity,
  CircleCheck,
  Database,
  Layers3,
} from "lucide-react";

type ModuleDashboardProps = {
  data: ModuleData;
};

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("ativo") ||
    normalized.includes("recebido") ||
    normalized.includes("confirmado") ||
    normalized.includes("concluído")
  ) {
    return "bg-cyan-400/10 text-cyan-200";
  }

  if (normalized.includes("pendente") || normalized.includes("programado")) {
    return "bg-violet-400/10 text-violet-200";
  }

  return "bg-white/10 text-slate-300";
}

export function ModuleDashboard({ data }: ModuleDashboardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="dashboard-label text-[11px] text-cyan-300">
              {data.eyebrow}
            </p>

            <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-[1.02] tracking-[-0.055em] text-white">
              {data.title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              {data.description}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[460px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {data.primaryLabel}
                </span>
                <Activity size={18} className="text-cyan-300" />
              </div>

              <strong className="dashboard-number mt-3 block text-[28px] font-semibold text-white">
                {data.primaryMetric}
              </strong>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {data.secondaryLabel}
                </span>
                <Database size={18} className="text-violet-300" />
              </div>

              <strong className="dashboard-number mt-3 block text-[28px] font-semibold text-white">
                {data.secondaryMetric}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-sm font-medium text-cyan-100">
          {data.status}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.cards.map((card) => (
          <article
            key={card.label}
            className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dashboard-label text-[11px] text-slate-500">
                  {card.label}
                </p>

                <strong className="dashboard-number mt-3 block text-[25px] font-semibold text-white">
                  {card.value}
                </strong>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  {card.helper}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300">
                <ArrowUpRight size={19} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 xl:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Layers3 size={21} className="text-violet-300" />
              <h2 className="text-xl font-semibold tracking-[-0.035em]">
                {data.tableTitle}
              </h2>
            </div>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
              Ver todos
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.6fr_2fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Nome</span>
                <span>Detalhe</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {data.tableRows.map((row) => (
                <div
                  key={`${row.name}-${row.value}`}
                  className="grid grid-cols-[1.6fr_2fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <strong className="font-semibold text-white">{row.name}</strong>

                  <span className="font-medium text-slate-400">{row.detail}</span>

                  <span className="dashboard-number font-semibold text-slate-200">
                    {row.value}
                  </span>

                  <span
                    className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${statusClass(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 xl:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <CircleCheck size={22} />
          </div>

          <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">
            Próxima etapa
          </h3>

          <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
            Este módulo já segue o padrão visual SaaS do dashboard principal.
            A próxima fase será conectar dados reais da planilha importada.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="dashboard-label text-[11px] text-slate-500">
              Status técnico
            </p>

            <strong className="mt-2 block text-sm font-semibold text-cyan-100">
              Visual pronto / dados mockados
            </strong>
          </div>
        </aside>
      </section>
    </div>
  );
}