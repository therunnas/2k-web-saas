"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";

type FormState = {
  groupName: string;
  client: string;
  project: string;
  description: string;
  value: string;
  date: string;
  status: "PENDING" | "RECEIVED";
};

const initialForm: FormState = {
  groupName: "",
  client: "",
  project: "",
  description: "",
  value: "",
  date: new Date().toISOString().slice(0, 10),
  status: "PENDING",
};

export function NovaProducaoCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/producoes/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await response.json();

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao criar produção.");
        return;
      }

      setSuccessMessage("Produção manual criada. Atualizando painel...");
      setForm(initialForm);

      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch {
      setErrorMessage("Erro ao conectar com a API de produção manual.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-4 sm:p-5 xl:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Teste FASE 11
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
            Cadastro manual de produção.
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-100/70">
            Crie uma produção direto pelo SaaS. O registro entra no banco como
            dado manual e passa a alimentar os módulos reais.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
        >
          {open ? <X size={16} /> : <Plus size={16} />}
          {open ? "Fechar" : "Nova produção manual"}
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 xl:grid-cols-2">
          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Grupo
            </span>
            <input
              value={form.groupName}
              onChange={(event) => updateField("groupName", event.target.value)}
              placeholder="Ex: GRUPO AMC TÊXTIL"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Cliente / marca
            </span>
            <input
              value={form.client}
              onChange={(event) => updateField("client", event.target.value)}
              placeholder="Ex: Marca X"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">
              Projeto
            </span>
            <input
              value={form.project}
              onChange={(event) => updateField("project", event.target.value)}
              placeholder="Ex: Campanha verão 2026"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">
              Descrição / observação
            </span>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Ex: Captação de reels, stills e vídeo institucional."
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Valor
            </span>
            <input
              value={form.value}
              onChange={(event) => updateField("value", event.target.value)}
              placeholder="Ex: 5000 ou 5.000,00"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Data
            </span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">
              Status financeiro
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                updateField("status", event.target.value as FormState["status"])
              }
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/70 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              <option value="PENDING">Aguardando pagamento</option>
              <option value="RECEIVED">Recebido / pago</option>
            </select>
          </label>

          {errorMessage ? (
            <div className="xl:col-span-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="xl:col-span-2 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
              <CheckCircle2 size={17} />
              {successMessage}
            </div>
          ) : null}

          <div className="xl:col-span-2 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
            >
              Limpar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Salvar produção
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}