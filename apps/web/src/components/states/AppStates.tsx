import type { ReactNode } from "react";
import {
  AlertTriangle,
  Database,
  Loader2,
  RefreshCw,
  SearchX,
} from "lucide-react";

type AppStateCardProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function AppStateCard({
  icon,
  eyebrow,
  title,
  description,
  action,
}: AppStateCardProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
          {icon ?? <Database size={24} />}
        </div>

        {eyebrow ? (
          <p className="dashboard-label mt-5 text-[11px] text-cyan-300">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-white">
          {title}
        </h1>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
          {description}
        </p>

        {action ? <div className="mt-6">{action}</div> : null}
      </section>
    </div>
  );
}

export function AppLoadingState() {
  return (
    <AppStateCard
      icon={<Loader2 size={24} className="animate-spin" />}
      eyebrow="Carregando"
      title="Preparando o 2K Command OS."
      description="Estamos carregando os dados do workspace, rotas protegidas e módulos conectados ao banco."
    />
  );
}

export function AppErrorState({
  title = "Algo saiu do fluxo esperado.",
  description = "O sistema encontrou um erro ao carregar esta área. Tente atualizar a página.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <AppStateCard
      icon={<AlertTriangle size={24} />}
      eyebrow="Erro"
      title={title}
      description={description}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        ) : null
      }
    />
  );
}

export function AppEmptyState({
  title = "Nenhum dado encontrado.",
  description = "Quando houver registros disponíveis, eles aparecerão nesta área.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
        <SearchX size={22} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function AppTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.025] px-5 py-3">
        <div className="h-3 w-48 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 px-5 py-4">
            <div className="h-4 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppCardsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article
          key={index}
          className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-full">
              <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-7 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-3 w-52 animate-pulse rounded-full bg-white/10" />
            </div>

            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/10" />
          </div>
        </article>
      ))}
    </section>
  );
}