"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function renderKpiValue(value: string) {
  const currencyMatch = value.match(/^R\$\s?(.+)$/);

  if (!currencyMatch) return value;

  return (
    <>
      <span className="k-kpi-prefix">R$</span>
      {currencyMatch[1]}
    </>
  );
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
    CONFIRMAR_INFO: "Confirmar informação",
    CANCELADO: "Cancelado",
    A_RECEBER: "A receber",
  };

  if (!value) return "—";

  return labels[value] ?? value;
}

function statusTone(value: string | null) {
  if (value === "PAGO") {
    return "success";
  }

  if (value === "ATRASADO") {
    return "danger";
  }

  if (value === "AGUARDANDO_PAGAMENTO" || value === "A_RECEBER") {
    return "info";
  }

  if (value === "NF_A_ENVIAR" || value === "GERAR_NF" || value === "CONFIRMAR_INFO") {
    return "attention";
  }

  return "neutral";
}

function getInitials(value: string | null) {
  if (!value) return "2K";

  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (!parts.length) return "2K";

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="k-form-label">
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "cyan",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "cyan" | "emerald" | "amber";
}) {
  const helperClass =
    tone === "emerald"
      ? "k-kpi-helper-positive"
      : tone === "amber"
        ? "k-kpi-helper-warning"
        : "k-kpi-helper-info";

  return (
    <article className="k-kpi-strip-item">
      <span className="k-kpi-label">{label}</span>
      <strong className="k-kpi-value">{renderKpiValue(value)}</strong>
      <span className={`k-kpi-helper ${helperClass}`}>{helper}</span>
    </article>
  );
}

export function EntradasManualDashboard() {
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [form, setForm] = useState<EntradaForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return entries;

    return entries.filter((entry) =>
      [
        entry.groupName,
        entry.client,
        entry.project,
        entry.description,
        entry.documentNumber,
        entry.financialStatus,
        entry.commercialStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [entries, query]);

  return (
    <div className="k-page manual-page-v2 manual-page-entries space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <h1 className="k-title">
            Lançar entrada manual.
          </h1>

          <p className="k-subtitle">
            Cadastre uma entrada direto pelo painel. O registro alimenta financeiro, vencimentos e produções.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={() => {
              loadCatalog();
              loadEntries();
            }}
            className="k-button-ghost"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </header>

      <section className="k-kpi-strip" data-columns="3">
        <StatCard
          label="Entradas manuais"
          value={String(entries.length)}
          helper="registros criados"
        />

        <StatCard
          label="Valor lançado"
          value={formatCurrency(total)}
          helper="soma das entradas manuais"
          tone="emerald"
        />

        <StatCard
          label="Situação"
          value={`${recebidas.length}/${aReceber.length}`}
          helper="recebidas · a receber"
          tone="amber"
        />
      </section>
      <section className="k-card k-form-card">
        <div className="k-form-head">
          <div className="k-form-title-row">
            <div className="k-form-icon">
              <TrendingUp size={17} />
            </div>

            <div>
              <h2 className="k-section-title">
                {isEditing ? "Editar entrada" : "Nova entrada"}
              </h2>
              <p className="k-muted mt-1 text-sm">
                Equivalente à aba ENTRADAS da planilha.
              </p>
            </div>
          </div>

          <span className="k-form-tag">Postgres Neon</span>
        </div>

        <form onSubmit={handleSubmit} className="k-form-grid">
          <label className="k-form-field">
            <FieldLabel>Grupo</FieldLabel>
            <select
              value={form.groupName}
              onChange={(event) => updateField("groupName", event.target.value)}
              className="k-select mt-2 h-11 px-4 text-sm font-medium"
            >
              <option value="">Selecione um grupo</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <span className="k-form-hint">
              Para adicionar ou editar grupos, use Configurações.
            </span>
          </label>

          <label className="k-form-field">
            <FieldLabel>Marca / cliente</FieldLabel>
            <select
              value={form.client}
              onChange={(event) => updateField("client", event.target.value)}
              className="k-select mt-2 h-11 px-4 text-sm font-medium"
            >
              <option value="">Selecione uma marca</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <span className="k-form-hint">
              Para adicionar ou editar marcas, use Configurações.
            </span>
          </label>

          <label className="k-form-field" data-span="2">
            <FieldLabel>Projeto</FieldLabel>
            <input
              value={form.project}
              onChange={(event) => updateField("project", event.target.value)}
              placeholder="Ex: campanha de verão, reels, evento ou fotos em tempo real"
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field">
            <FieldLabel>Valor</FieldLabel>
            <input
              value={form.value}
              onChange={(event) => updateField("value", event.target.value)}
              placeholder="Ex: 5000 ou 5.000,00"
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field">
            <FieldLabel>NF</FieldLabel>
            <input
              value={form.documentNumber}
              onChange={(event) => updateField("documentNumber", event.target.value)}
              placeholder="Ex: 123 ou vazio"
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field">
            <FieldLabel>Status comercial</FieldLabel>
            <select
              value={form.commercialStatus}
              onChange={(event) => updateField("commercialStatus", event.target.value)}
              className="k-select mt-2 h-11 px-4 text-sm font-medium"
            >
              <option value="LEAD">Lead</option>
              <option value="NF_A_ENVIAR">NF a enviar</option>
              <option value="GERAR_NF">Gerar NF</option>
              <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="PAGO">Pago</option>
              <option value="CONFIRMAR_INFO">Confirmar informação</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="k-form-field">
            <FieldLabel>Status financeiro</FieldLabel>
            <select
              value={form.financialStatus}
              onChange={(event) => updateField("financialStatus", event.target.value)}
              className="k-select mt-2 h-11 px-4 text-sm font-medium"
            >
              <option value="A_RECEBER">A receber</option>
              <option value="PAGO">Pago / recebido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="k-form-field">
            <FieldLabel>Data de emissão</FieldLabel>
            <input
              type="date"
              value={form.issuedAt}
              onChange={(event) => updateField("issuedAt", event.target.value)}
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field">
            <FieldLabel>Previsão de recebimento</FieldLabel>
            <input
              type="date"
              value={form.dueAt}
              onChange={(event) => updateField("dueAt", event.target.value)}
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field">
            <FieldLabel>Data de recebimento real</FieldLabel>
            <input
              type="date"
              value={form.paidAt}
              onChange={(event) => updateField("paidAt", event.target.value)}
              className="k-input mt-2 h-11 px-4 text-sm font-medium"
            />
          </label>

          <label className="k-form-field" data-span="2">
            <FieldLabel>Descrição / observações</FieldLabel>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
              placeholder="Observações do projeto, job, entrega ou negociação."
              className="k-textarea mt-2 w-full resize-none px-4 py-3 text-sm font-medium"
            />
          </label>

          {errorMessage ? (
            <div className="k-toast k-form-field" data-span="2" data-tone="danger">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="k-toast k-form-field" data-span="2" data-tone="success">
              <CheckCircle2 size={17} />
              {successMessage}
            </div>
          ) : null}

          <div className="k-action-row k-form-field" data-span="2">
            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="k-button-ghost px-5"
              >
                <X size={16} />
                Cancelar edição
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="k-button-primary px-5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isEditing ? "Salvar alteração" : "Salvar entrada"}
            </button>
          </div>
        </form>
      </section>

      <section className="k-card k-entry-table">
        <div className="k-section-head flex-col items-start xl:flex-row xl:items-center">
          <div>
            <h2 className="k-section-title">
              Entradas manuais recentes
            </h2>
            <p className="k-muted mt-2 text-sm">
              {filteredEntries.length} de {entries.length} entradas cadastradas.
            </p>
          </div>

          <div className="relative w-full xl:w-[360px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar grupo, marca, projeto ou NF..."
              className="k-input h-9 pl-10 pr-4 text-sm font-medium"
            />
          </div>
        </div>

        <div className="k-table-card overflow-x-auto">
          <div className="k-table min-w-[1160px]">
            <div
              data-table-head
              className="grid grid-cols-[1.1fr_1.1fr_1.6fr_0.8fr_1fr_1fr_0.7fr_0.8fr] px-5 py-3"
            >
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
              <div className="k-empty">
                Carregando entradas...
              </div>
            ) : filteredEntries.length ? (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="k-table-row grid grid-cols-[1.1fr_1.1fr_1.6fr_0.8fr_1fr_1fr_0.7fr_0.8fr] items-center px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar">
                      {getInitials(entry.groupName)}
                    </span>
                    <span className="truncate font-semibold text-slate-100">
                      {entry.groupName ?? "—"}
                    </span>
                  </div>

                  <span className="truncate text-[12.5px] text-slate-300">
                    {entry.client ?? "—"}
                  </span>
                  <span className="truncate text-[12.5px] text-slate-300">
                    {entry.project ?? "—"}
                  </span>
                  <span className="k-number font-semibold text-emerald-200">
                    {formatCurrency(entry.grossAmount)}
                  </span>
                  <span
                    className="k-badge"
                    data-tone={statusTone(entry.financialStatus ?? entry.status)}
                  >
                    {statusLabel(entry.financialStatus ?? entry.status)}
                  </span>
                  <span className="k-number text-slate-400">
                    {formatDate(entry.dueAt)}
                  </span>
                  <span className="text-[12.5px] text-slate-400">
                    {entry.documentNumber || "—"}
                  </span>
                  <div className="k-action-row justify-start">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="k-button-ghost min-h-8 px-3 text-xs"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="k-button-danger min-h-8 px-3 text-xs"
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="k-empty">
                Nenhuma entrada manual encontrada.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


