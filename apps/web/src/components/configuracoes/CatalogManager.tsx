"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

type CatalogType =
  | "GROUP"
  | "BRAND"
  | "SUPPLIER"
  | "EXPENSE_CATEGORY"
  | "EXPENSE_SUBCATEGORY"
  | "PAYMENT_METHOD"
  | "ACCOUNT"
  | "COST_CENTER"
  | "RECURRENCE";

type CatalogItem = {
  id: string;
  type: CatalogType | string;
  name: string;
  parentName: string | null;
  active: boolean;
};

type CatalogResponse = {
  status: string;
  groups?: string[];
  brands?: string[];
  suppliers?: string[];
  expenseCategories?: string[];
  expenseSubCategories?: string[];
  paymentMethods?: string[];
  accountNames?: string[];
  costCenters?: string[];
  recurrences?: string[];
  catalogItems?: CatalogItem[];
  message?: string;
};

type CatalogSectionConfig = {
  type: CatalogType;
  title: string;
  description: string;
};

type CatalogForm = {
  type: CatalogType;
  oldName: string;
  name: string;
  parentName: string;
};

type CatalogManagerProps = {
  title: string;
  eyebrow: string;
  description: string;
  sections: CatalogSectionConfig[];
};

function uniqueOptions(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getTypeLabel(type: CatalogType) {
  const labels: Record<CatalogType, string> = {
    GROUP: "Grupo",
    BRAND: "Marca",
    SUPPLIER: "Fornecedor",
    EXPENSE_CATEGORY: "Categoria de saída",
    EXPENSE_SUBCATEGORY: "Subcategoria de saída",
    PAYMENT_METHOD: "Forma de pagamento",
    ACCOUNT: "Conta / banco",
    COST_CENTER: "Centro de custo",
    RECURRENCE: "Recorrência",
  };

  return labels[type];
}

function getTypeHelp(type: CatalogType) {
  const labels: Record<CatalogType, string> = {
    GROUP: "Quem emite ou recebe a NF.",
    BRAND: "Quem pediu o job/trabalho.",
    SUPPLIER: "Quem recebe pagamentos nas saídas.",
    EXPENSE_CATEGORY: "Categoria principal da despesa.",
    EXPENSE_SUBCATEGORY: "Detalhe operacional da despesa.",
    PAYMENT_METHOD: "Forma usada para pagamento.",
    ACCOUNT: "Banco, conta PJ ou Pix CNPJ.",
    COST_CENTER: "Área responsável pelo custo.",
    RECURRENCE: "Periodicidade do lançamento.",
  };

  return labels[type];
}

function getItemsByType(type: CatalogType, data: CatalogResponse) {
  if (type === "GROUP") return uniqueOptions(data.groups ?? []);
  if (type === "BRAND") return uniqueOptions(data.brands ?? []);
  if (type === "SUPPLIER") return uniqueOptions(data.suppliers ?? []);
  if (type === "EXPENSE_CATEGORY") {
    return uniqueOptions(data.expenseCategories ?? []);
  }
  if (type === "EXPENSE_SUBCATEGORY") {
    return uniqueOptions(data.expenseSubCategories ?? []);
  }
  if (type === "PAYMENT_METHOD") {
    return uniqueOptions(data.paymentMethods ?? []);
  }
  if (type === "ACCOUNT") {
    return uniqueOptions(data.accountNames ?? []);
  }
  if (type === "COST_CENTER") {
    return uniqueOptions(data.costCenters ?? []);
  }
  if (type === "RECURRENCE") {
    return uniqueOptions(data.recurrences ?? []);
  }

  return [];
}

function CatalogSection({
  section,
  items,
  onEdit,
  onDelete,
}: {
  section: CatalogSectionConfig;
  items: string[];
  onEdit: (type: CatalogType, name: string) => void;
  onDelete: (type: CatalogType, name: string) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
      <div>
        <p className="dashboard-label text-[11px] text-slate-500">
          {getTypeLabel(section.type)}
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
          {section.title}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          {section.description}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {items.length ? (
          items.map((name) => (
            <div
              key={`${section.type}-${name}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3"
            >
              <span className="truncate text-sm font-semibold text-white">
                {name}
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(section.type, name)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Pencil size={13} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(section.type, name)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-5 text-sm font-medium text-slate-500">
            Nenhum item encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

export function CatalogManager({
  title,
  eyebrow,
  description,
  sections,
}: CatalogManagerProps) {
  const initialForm = useMemo<CatalogForm>(
    () => ({
      type: sections[0]?.type ?? "GROUP",
      oldName: "",
      name: "",
      parentName: "",
    }),
    [sections]
  );

  const [catalogData, setCatalogData] = useState<CatalogResponse>({
    status: "idle",
  });
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<CatalogForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  async function loadCatalog() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/catalog", {
        cache: "no-store",
      });

      const json = (await response.json()) as CatalogResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar base.");
        return;
      }

      setCatalogData(json);
      setCatalogItems(json.catalogItems ?? []);
    } catch {
      setErrorMessage("Erro ao conectar com a API de catálogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  function updateField(name: keyof CatalogForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(form.oldName);

      const response = await fetch("/api/manual/catalog", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = (await response.json()) as CatalogResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao salvar item.");
        return;
      }

      setSuccessMessage(
        isEditing
          ? "Item editado com sucesso."
          : "Item adicionado com sucesso."
      );

      setForm(initialForm);
      await loadCatalog();
    } catch {
      setErrorMessage("Erro ao conectar com a API de catálogo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: CatalogType, name: string) {
    const confirmed = window.confirm(
      `Tem certeza que deseja remover "${name}" da lista? Lançamentos antigos não serão apagados.`
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/manual/catalog", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          name,
        }),
      });

      const json = (await response.json()) as CatalogResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao excluir item.");
        return;
      }

      if (form.oldName === name && form.type === type) {
        setForm(initialForm);
      }

      setSuccessMessage("Item removido da lista de seleção.");
      await loadCatalog();
    } catch {
      setErrorMessage("Erro ao conectar com a API de catálogo.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(type: CatalogType, name: string) {
    const item = catalogItems.find(
      (catalogItem) => catalogItem.type === type && catalogItem.name === name
    );

    setForm({
      type,
      oldName: name,
      name,
      parentName: item?.parentName ?? "",
    });

    setSuccessMessage(null);
    setErrorMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const groupsForBrand = uniqueOptions(catalogData.groups ?? []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={loadCatalog}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      <section className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.045] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
            <Database size={21} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              {form.oldName ? "Editar item" : "Adicionar item"}
            </h2>

            <p className="mt-1 text-sm font-medium text-cyan-100/65">
              {getTypeHelp(form.type)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-4">
          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Tipo
            </span>

            <select
              value={form.type}
              onChange={(event) =>
                updateField("type", event.target.value as CatalogType)
              }
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-cyan-300/40"
            >
              {sections.map((section) => (
                <option key={section.type} value={section.type}>
                  {getTypeLabel(section.type)}
                </option>
              ))}
            </select>
          </label>

          <label className="block xl:col-span-2">
            <span className="dashboard-label text-[11px] text-slate-500">
              Nome
            </span>

            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Digite o nome"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Grupo da marca
            </span>

            <select
              value={form.parentName}
              onChange={(event) => updateField("parentName", event.target.value)}
              disabled={form.type !== "BRAND"}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none disabled:opacity-45 focus:border-cyan-300/40"
            >
              <option value="">Opcional</option>
              {groupsForBrand.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          {errorMessage ? (
            <div className="xl:col-span-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="xl:col-span-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
              <CheckCircle2 size={17} />
              {successMessage}
            </div>
          ) : null}

          <div className="xl:col-span-4 flex flex-wrap justify-end gap-3">
            {form.oldName ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                Cancelar edição
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {form.oldName ? "Salvar alteração" : "Adicionar"}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-6 text-sm font-semibold text-slate-500">
          Carregando bases...
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          {sections.map((section) => (
            <CatalogSection
              key={section.type}
              section={section}
              items={getItemsByType(section.type, catalogData)}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}
    </div>
  );
}