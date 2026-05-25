export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 shadow-2xl">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />

        <span className="text-sm font-semibold tracking-[-0.02em] text-slate-200">
          Carregando...
        </span>
      </div>
    </main>
  );
}
