"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setMessage(json.message ?? "Não foi possível acessar a plataforma.");
        return;
      }

      router.replace(json.redirectTo ?? "/dashboard");
    } catch {
      setMessage("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020204] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_420px_at_50%_42%,rgba(124,58,237,0.10),transparent_68%),radial-gradient(820px_520px_at_100%_100%,rgba(34,211,238,0.045),transparent_64%)]" />

      <section className="relative z-10 w-full max-w-[420px]">
        <div className="mb-9 flex justify-center">
          <Image
            src="/assets/2k-studios-logo.png"
            alt="2K STUDIOS"
            width={320}
            height={96}
            priority
            className="h-auto w-[240px] opacity-95"
          />
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[#0b0d14]/88 p-8 shadow-[0_26px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-[25px] font-semibold tracking-[-0.045em] text-white">
              Entrar
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Acesse a plataforma privada da 2K STUDIOS.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">
                E-mail
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@2kstudios.com"
                autoComplete="email"
                className="h-12 w-full rounded-[12px] border border-white/10 bg-[#11141f] px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:bg-[#141827] focus:shadow-[0_0_0_3px_rgba(34,211,238,0.10)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">
                Senha
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 w-full rounded-[12px] border border-white/10 bg-[#11141f] px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:bg-[#141827] focus:shadow-[0_0_0_3px_rgba(34,211,238,0.10)]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-[12px] border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(124,58,237,0.18)),linear-gradient(135deg,#10202b,#171528)] text-sm font-semibold text-white shadow-[0_16px_45px_rgba(34,211,238,0.10)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>

          {message ? (
            <div className="mt-5 rounded-[12px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-medium text-cyan-100">
              {message}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-slate-500">
            <span>Ambiente privado</span>

            <button
              type="button"
              onClick={() =>
                setMessage("Solicite a redefinição de acesso ao administrador.")
              }
              className="text-slate-400 transition hover:text-cyan-200"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
