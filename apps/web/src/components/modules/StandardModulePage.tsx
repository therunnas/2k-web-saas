import {
  ArrowUpRight,
  CircleCheck,
  Database,
  Layers3,
} from "lucide-react";

type Card = {
  label: string;
  value: string;
  helper: string;
};

type StandardModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  cards: Card[];
  nextSteps: string[];
};

export function StandardModulePage({
  eyebrow,
  title,
  description,
  status,
  cards,
  nextSteps,
}: StandardModulePageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="dashboard-label text-[11px] text-cyan-300">
              {eyebrow}
            </p>

            <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-[1.02] tracking-[-0.055em] text-white">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              {description}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5 xl:w-[380px]">
            <div className="flex items-center gap-3">
              <CircleCheck size={20} className="text-cyan-200" />
              <strong className="text-sm font-semibold text-cyan-100">
                Status técnico
              </strong>
            </div>

            <p className="mt-3 text-sm font-medium leading-6 text-cyan-100/80">
              {status}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
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
          <div className="mb-5 flex items-center gap-3">
            <Layers3 size={21} className="text-violet-300" />
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Próximas implementações
            </h2>
          </div>

          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                  {index + 1}
                </span>

                <p className="text-sm font-medium leading-6 text-slate-300">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 xl:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <Database size={22} />
          </div>

          <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">
            Dados reais
          </h3>

          <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
            Este módulo já está no padrão visual do 2K Command OS. A conexão
            com dados reais será feita por fase, sem quebrar o que já está
            funcionando.
          </p>
        </aside>
      </section>
    </div>
  );
}