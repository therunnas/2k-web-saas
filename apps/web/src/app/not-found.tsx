import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-5 text-white">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-sm font-bold text-cyan-200">
          404
        </div>

        <p className="dashboard-label mt-5 text-[11px] text-cyan-300">
          PÁGINA NÃO ENCONTRADA
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">
          Esta rota não existe.
        </h1>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
          A página acessada não foi encontrada dentro do 2K Command OS.
        </p>

        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          Voltar para o dashboard
        </Link>
      </section>
    </main>
  );
}
