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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-0)] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_600px_at_8%_-10%,oklch(0.72_0.18_295_/_0.10),transparent_60%),radial-gradient(1100px_700px_at_95%_110%,oklch(0.82_0.13_200_/_0.08),transparent_60%)] before:absolute before:inset-0 before:bg-[linear-gradient(oklch(0.27_0.018_270_/_0.4)_1px,transparent_1px),linear-gradient(90deg,oklch(0.27_0.018_270_/_0.4)_1px,transparent_1px)] before:bg-[length:56px_56px] before:opacity-[0.35]" />

      <section className="relative z-10 w-full max-w-[390px]">
        <div className="mb-8 flex justify-center">
          <Image
            src="/assets/2k-studios-logo.png"
            alt="2K STUDIOS"
            width={320}
            height={96}
            priority
            className="h-7 w-auto opacity-[0.95]"
          />
        </div>

        <div className="k-card p-5 backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="k-title text-[26px]">
              Entrar
            </h1>

            <p className="k-subtitle mx-auto">
              Acesse a plataforma privada da 2K STUDIOS.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="k-form-label mb-2">
                E-mail
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@2kstudios.com"
                autoComplete="email"
                className="k-input h-11 px-[13px]"
              />
            </label>

            <label className="block">
              <span className="k-form-label mb-2">
                Senha
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="k-input h-11 px-[13px]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="k-button-primary mt-2 h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>

          {message ? (
            <div className="k-toast mt-5" data-tone="info">
              {message}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-5 text-[11px] text-[var(--fg-3)]">
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
