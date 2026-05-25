"use client";

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
        setMessage(json.message ?? "Não foi possível acessar o painel.");
        return;
      }

      setMessage("Login realizado com sucesso.");

      router.replace(json.redirectTo ?? "/dashboard");
    } catch {
      setMessage("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06030b] px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_30%)]" />
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/20 blur-[120px]" />

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-sm border border-violet-500/80 bg-[#07040d] shadow-[0_0_38px_rgba(124,58,237,0.72)]">
        <div className="flex min-h-[520px] flex-col justify-center px-10 py-12 sm:px-14">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.45)]">
              2K
            </div>

            <span className="text-lg tracking-[0.18em] text-white/90">
              STUDIOS
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@2kstudios.com"
                className="h-9 w-full border-0 border-b-2 border-white/80 bg-transparent px-0 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">
                Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-9 w-full border-0 border-b-2 border-white/80 bg-transparent px-0 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-violet-500 to-violet-800 text-sm font-black text-white shadow-[0_0_22px_rgba(124,58,237,0.65)] transition hover:scale-[1.01] hover:from-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Validando acesso..." : "Acessar painel"}
            </button>
          </form>

          {message ? (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">
              {message}
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs text-white/55">
            Acesso restrito à administração da 2K Studios.
          </p>
        </div>
      </section>
    </main>
  );
}