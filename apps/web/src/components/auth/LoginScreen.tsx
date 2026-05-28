"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  status: string;
  message?: string;
  redirectTo?: string;
};

export function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@2kstudios.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setMessage(json.message ?? "Não foi possível acessar o painel.");
        return;
      }

      router.replace(json.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setMessage("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020304] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:44px_44px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.025),transparent_30%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.82))]" />

      <section className="relative z-10 w-full max-w-[380px]">
        <div className="mb-9 flex justify-center">
          <div className="select-none text-center text-[27px] font-light uppercase tracking-[0.34em] text-white/82">
            <span className="font-semibold tracking-[0.08em] text-white">2K</span>
            <span className="ml-3">STUDIOS</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-white">
            Entrar
          </h1>

          <p className="mt-3 text-[14px] font-normal leading-relaxed text-slate-400">
            Acesso ao painel privado da 2K STUDIOS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-medium text-slate-300">
              E-mail
            </span>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@2kstudios.com"
              autoComplete="email"
              className="h-11 w-full rounded-[8px] border border-white/[0.075] bg-[#0a0d14] px-4 text-[14px] font-normal text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/25 focus:bg-[#0c1017]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-medium text-slate-300">
              Senha
            </span>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              className="h-11 w-full rounded-[8px] border border-white/[0.075] bg-[#0a0d14] px-4 text-[14px] font-normal text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/25 focus:bg-[#0c1017]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full rounded-[8px] border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(25,40,54,0.92),rgba(43,35,69,0.92))] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Validando..." : "Entrar"}
          </button>
        </form>

        {message ? (
          <div className="mt-5 rounded-[10px] border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-center text-[13px] font-medium text-rose-100">
            {message}
          </div>
        ) : null}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() =>
              setMessage("Solicite a redefinição de acesso ao administrador.")
            }
            className="text-[13px] font-normal text-slate-400 transition hover:text-white"
          >
            Esqueci minha senha
          </button>
        </div>
      </section>
    </main>
  );
}