"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-5 text-white">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-lg font-bold text-rose-200">
          !
        </div>

        <p className="dashboard-label mt-5 text-[11px] text-rose-300">
          ERRO
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">
          Não foi possível carregar esta área.
        </h1>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
          Ocorreu uma falha inesperada ao renderizar o módulo. Tente novamente.
        </p>

        {error?.message ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-left text-xs font-medium leading-5 text-rose-100">
            {error.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
