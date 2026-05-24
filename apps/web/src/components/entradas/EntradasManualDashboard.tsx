"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type ManualEntry = {
  id: string;
  type: string;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  status: string | null;
  grossAmount: unknown;
  commercialStatus: string | null;
  financialStatus: string | null;
  documentNumber: string | null;
  competence: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
};

type ApiResponse = {
  status: string;
  entries?: ManualEntry[];
  message?: string;
};

type CatalogResponse = {
  status: string;
  groups?: string[];
  brands?: string[];
  message?: string;
};

type EntradaForm = {
  groupName: string;
  client: string;
  project: string;
  description: string;
  value: string;
  documentNumber: string;
  commercialStatus: string;
  financialStatus: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string;
  notes: string;
};

const initialForm: EntradaForm = {
  groupName: "",
  client: "",
  project: "",
  description: "",
  value: "",
  documentNumber: "",
  commercialStatus: "AGUARDANDO_PAGAMENTO",
  financialStatus: "A_RECEBER",
  issuedAt: "",
  dueAt: new Date().toISOString().slice(0, 10),
  paidAt: "",
  notes: "",
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toDateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function statusLabel(value: string | null) {
  const labels: Record<string, string> = {
    LEAD: "Lead",
    NF_A_ENVIAR: "NF a enviar",
    GERAR_NF: "Gerar NF",
    AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
    ATRASADO: "Atrasado",
    PAGO: "Pago",
    CONFIRMAR_INFO: "Confirmar info",
    CANCELADO: "Cancelado",
    A_RECEBER: "A receber",
  };

  if (!value) return "—";

  return labels[value] ?? value;
}

export function EntradasManualDashboard() {
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [form, setForm] = useState<EntradaForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = Boolean(editingId);

  async function loadCatalog() {
    try {
      const response = await fetch("/api/manual/catalog", {
        cache: "no-store",
      });

      const json = (await response.json()) as CatalogResponse;

      if (response.ok && json.status === "ok") {
        setGroups(json.groups ?? []);
        setBrands(json.brands ?? []);
      }
    } catch {
      // Mantém formulário funcionando mesmo se a base falhar.
    }
  }

  async function loadEntries() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/entradas", {
        cache: "no-store",
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar entradas.");
        return;
      }

      setEntries(json.entries ?? []);
    } catch {
      setErrorMessage("Erro ao conectar com a API de entradas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    loadEntries();
  }, []);

  function updateField(name: keyof EntradaForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function startEdit(entry: ManualEntry) {
    setEditingId(entry.id);
    setForm({
      groupName: entry.groupName ?? "",
      client: entry.client ?? "",
      project: entry.project ?? "",
      description: entry.description ?? "",
      value: String(toNumber(entry.grossAmount)),
      documentNumber: entry.documentNumber ?? "",
      commercialStatus: entry.commercialStatus ?? "AGUARDANDO_PAGAMENTO",
      financialStatus: entry.financialStatus ?? "A_RECEBER",
      issuedAt: toDateInput(entry.issuedAt),
      dueAt: toDateInput(entry.dueAt),
      paidAt: toDateInput(entry.paidAt),
      notes: entry.notes ?? "",
    });

    setSuccessMessage(null);
    setErrorMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/entradas", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          id: editingId,
        }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao salvar entrada.");
        return;
      }

      setSuccessMessage(
        editingId
          ? "Entrada atualizada com sucesso."
          : "Entrada criada com sucesso."
      );

      setForm(initialForm);
      setEditingId(null);

      await Promise.all([loadCatalog(), loadEntries()]);
    } catch {
      setErrorMessage("Erro ao conectar com a API de entradas.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta entrada? Ela sairá das listas e dos cálculos, mas ficará preservada tecnicamente no banco."
    );

    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/entradas", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao excluir entrada.");
        return;
      }

      if (editingId === id) {
        setForm(initialForm);
        setEditingId(null);
      }

      setSuccessMessage("Entrada excluída com sucesso.");
      await loadEntries();
    } catch {
      setErrorMessage("Erro ao conectar com a API de entradas.");
    } finally {
      setSaving(false);
    }
  }

  const total = entries.reduce((sum, entry) => sum + toNumber(entry.grossAmount), 0);
  const recebidas = entries.filter((entry) => entry.financialStatus === "PAGO");
  const aReceber = entries.filter((entry) => entry.financialStatus !== "PAGO");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Entradas
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Lançar entrada manual.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            Cadastre jobs, projetos, grupos, marcas, NF, status comercial e
            recebimento direto no SaaS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadCatalog();
            loadEntries();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5">
          <p className="dashboard-label text-[11px] text-slate-500">
            Entradas manuais
          </p>
          <strong className="dashboard-number mt-3 block text-[26px] font-semibold text-white">
            {entries.length}
          </strong>
          <p className="mt-2 text-xs font-medium text-slate-500">
            registros criados no SaaS
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5">
          <p className="dashboard-label text-[11px] text-slate-500">
            Valor lançado
          </p>
          <strong className="dashboard-number mt-3 block text-[26px] font-semibold text-white">
            {formatCurrency(total)}
          </strong>
          <p className="mt-2 text-xs font-medium text-slate-500">
            soma das entradas manuais
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5">
          <p className="dashboard-label text-[11px] text-slate-500">
            Situação
          </p>
          <strong className="dashboard-number mt-3 block text-[26px] font-semibold text-white">
            {recebidas.length}/{aReceber.length}
          </strong>
          <p className="mt-2 text-xs font-medium text-slate-500">
            recebidas / a receber
          </p>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.045] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
            <TrendingUp size={21} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              {isEditing ? "Editar entrada" : "Nova entrada"}
            </h2>
            <p className="mt-1 text-sm font-medium text-cyan-100/65">
              Equivalente à aba ENTRADAS da planilha.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-2">
          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Grupo</span>
            <select
              value={form.groupName}
              onChange={(event) => updateField("groupName", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              <option value="">Selecione um grupo</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Para adicionar ou editar grupos, use Configurações.
            </p>
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Marca / cliente</span>
            <select
              value={form.client}
              onChange={(event) => updateField("client", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              <option value="">Selecione uma marca</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Para adicionar ou editar marcas, use Configurações.
            </p>
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">Projeto</span>
            <input
              value={form.project}
              onChange={(event) => updateField("project", event.target.value)}
              placeholder="Ex: Campanha verão, reels, evento, fotos real time"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Valor</span>
            <input
              value={form.value}
              onChange={(event) => updateField("value", event.target.value)}
              placeholder="Ex: 5000 ou 5.000,00"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">NF</span>
            <input
              value={form.documentNumber}
              onChange={(event) => updateField("documentNumber", event.target.value)}
              placeholder="Ex: 123 ou vazio"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Status comercial</span>
            <select
              value={form.commercialStatus}
              onChange={(event) => updateField("commercialStatus", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              <option value="LEAD">Lead</option>
              <option value="NF_A_ENVIAR">NF a enviar</option>
              <option value="GERAR_NF">Gerar NF</option>
              <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="PAGO">Pago</option>
              <option value="CONFIRMAR_INFO">Confirmar info</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Status financeiro</span>
            <select
              value={form.financialStatus}
              onChange={(event) => updateField("financialStatus", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              <option value="A_RECEBER">A receber</option>
              <option value="PAGO">Pago / recebido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Data emissão</span>
            <input
              type="date"
              value={form.issuedAt}
              onChange={(event) => updateField("issuedAt", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Previsão recebimento</span>
            <input
              type="date"
              value={form.dueAt}
              onChange={(event) => updateField("dueAt", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">Data recebimento real</span>
            <input
              type="date"
              value={form.paidAt}
              onChange={(event) => updateField("paidAt", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">Descrição / observações</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
              placeholder="Observações do projeto, job, entrega ou negociação."
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
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
            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                <X size={16} />
                Cancelar edição
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isEditing ? "Salvar alteração" : "Salvar entrada"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.035em]">
          Entradas manuais recentes
        </h2>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[1160px]">
            <div className="grid grid-cols-[1.1fr_1.1fr_1.6fr_0.8fr_1fr_1fr_0.7fr_0.7fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Grupo</span>
              <span>Marca</span>
              <span>Projeto</span>
              <span>Valor</span>
              <span>Status</span>
              <span>Previsão</span>
              <span>NF</span>
              <span>Ações</span>
            </div>

            {loading ? (
              <div className="px-5 py-6 text-sm font-medium text-slate-500">
                Carregando entradas...
              </div>
            ) : entries.length ? (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1.1fr_1.1fr_1.6fr_0.8fr_1fr_1fr_0.7fr_0.7fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <span className="truncate font-semibold text-white">
                    {entry.groupName ?? "—"}
                  </span>
                  <span className="truncate text-slate-300">
                    {entry.client ?? "—"}
                  </span>
                  <span className="truncate text-slate-300">
                    {entry.project ?? "—"}
                  </span>
                  <span className="dashboard-number font-semibold text-emerald-200">
                    {formatCurrency(entry.grossAmount)}
                  </span>
                  <span className="w-fit rounded-lg bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {statusLabel(entry.financialStatus ?? entry.status)}
                  </span>
                  <span className="dashboard-number text-slate-400">
                    {formatDate(entry.dueAt)}
                  </span>
                  <span className="text-slate-400">
                    {entry.documentNumber || "—"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-sm font-medium text-slate-500">
                Nenhuma entrada manual cadastrada ainda.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}