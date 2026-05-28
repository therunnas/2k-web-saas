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
  | "EXPENSE_SUBCATEGORY";

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
  catalogItems?: CatalogItem[];
  message?: string;
};

type CatalogForm = {
  type: CatalogType;
  oldName: string;
  name: string;
  parentName: string;
};

const initialForm: CatalogForm = {
  type: "GROUP",
  oldName: "",
  name: "",
  parentName: "",
};

const typeOptions: Array<{ value: CatalogType; label: string; help: string }> = [
  {
    value: "GROUP",
    label: "Grupo",
    help: "Quem emite ou recebe a NF.",
  },
  {
    value: "BRAND",
    label: "Marca",
    help: "Quem pediu o job/trabalho.",
  },
  {
    value: "SUPPLIER",
    label: "Fornecedor",
    help: "Quem recebe pagamentos nas saídas.",
  },
  {
    value: "EXPENSE_CATEGORY",
    label: "Categoria de saída",
    help: "Tipo principal da despesa.",
  },
  {
    value: "EXPENSE_SUBCATEGORY",
    label: "Subcategoria de saída",
    help: "Detalhe da despesa/custo.",
  },
];

function typeLabel(type: string) {
  return typeOptions.find((option) => option.value === type)?.label ?? type;
}

function sectionHelp(type: CatalogType) {
  return typeOptions.find((option) => option.value === type)?.help ?? "";
}

function CatalogSection({
  title,
  description,
  items,
  type,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  items: Array<{ name: string; type: CatalogType }>;
  type: CatalogType;
  onEdit: (type: CatalogType, name: string) => void;
  onDelete: (type: CatalogType, name: string) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
      <h2 className="text-xl font-semibold tracking-[-0.035em]">{title}</h2>

      <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>

      <div className="mt-5 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${type}-${item.name}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3"
            >
              <span className="truncate text-sm font-semibold text-white">
                {item.name}
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(type, item.name)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Pencil size={13} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(type, item.name)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Nenhum item encontrado.</p>
        )}
      </div>
    </div>
  );
}

export function ConfiguracoesBaseDashboard() {
  const [groups, setGroups] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [expenseSubCategories, setExpenseSubCategories] = useState<string[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<CatalogForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      setGroups(json.groups ?? []);
      setBrands(json.brands ?? []);
      setSuppliers(json.suppliers ?? []);
      setExpenseCategories(json.expenseCategories ?? []);
      setExpenseSubCategories(json.expenseSubCategories ?? []);
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
          ? "Item editado com sucesso. Os lançamentos relacionados foram atualizados."
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const groupItems = useMemo(
    () => groups.map((name) => ({ name, type: "GROUP" as const })),
    [groups]
  );

  const brandItems = useMemo(
    () => brands.map((name) => ({ name, type: "BRAND" as const })),
    [brands]
  );

  const supplierItems = useMemo(
    () => suppliers.map((name) => ({ name, type: "SUPPLIER" as const })),
    [suppliers]
  );

  const expenseCategoryItems = useMemo(
    () =>
      expenseCategories.map((name) => ({
        name,
        type: "EXPENSE_CATEGORY" as const,
      })),
    [expenseCategories]
  );

  const expenseSubCategoryItems = useMemo(
    () =>
      expenseSubCategories.map((name) => ({
        name,
        type: "EXPENSE_SUBCATEGORY" as const,
      })),
    [expenseSubCategories]
  );

  return (
    <div className="manual-page-v2 final-page-v2 final-page-config space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Configurações
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Bases operacionais.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            Controle listas de entrada e saída sem misturar marcas, grupos,
            fornecedores e despesas.
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
              {form.oldName ? "Editar item da base" : "Adicionar item na base"}
            </h2>

            <p className="mt-1 text-sm font-medium text-cyan-100/65">
              {sectionHelp(form.type)}
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
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
              placeholder="Digite o nome do item"
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Grupo da marca
            </span>

            <input
              value={form.parentName}
              onChange={(event) => updateField("parentName", event.target.value)}
              placeholder="Opcional"
              list="catalog-groups"
              disabled={form.type !== "BRAND"}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 disabled:opacity-45 focus:border-cyan-300/40"
            />

            <datalist id="catalog-groups">
              {groups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
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
                onClick={() => setForm(initialForm)}
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
          <CatalogSection
            title="Grupos"
            description="Entrada: quem emite ou recebe a NF."
            items={groupItems}
            type="GROUP"
            onEdit={startEdit}
            onDelete={handleDelete}
          />

          <CatalogSection
            title="Marcas"
            description="Entrada: quem pediu o job/trabalho."
            items={brandItems}
            type="BRAND"
            onEdit={startEdit}
            onDelete={handleDelete}
          />

          <CatalogSection
            title="Fornecedores"
            description="Saída: quem recebe pagamentos, custos e despesas."
            items={supplierItems}
            type="SUPPLIER"
            onEdit={startEdit}
            onDelete={handleDelete}
          />

          <CatalogSection
            title="Categorias de saída"
            description="Saída: categoria principal da despesa."
            items={expenseCategoryItems}
            type="EXPENSE_CATEGORY"
            onEdit={startEdit}
            onDelete={handleDelete}
          />

          <CatalogSection
            title="Subcategorias de saída"
            description="Saída: detalhe operacional da despesa."
            items={expenseSubCategoryItems}
            type="EXPENSE_SUBCATEGORY"
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </section>
      )}

      <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5">
        <p className="text-sm font-semibold text-slate-300">
          Regra operacional
        </p>

        <div className="mt-3 grid gap-3 text-sm font-medium leading-6 text-slate-500 xl:grid-cols-2">
          <p>
            <strong className="text-cyan-200">Entradas:</strong> usam Grupos e
            Marcas. Grupo é quem emite/recebe NF. Marca é quem pediu o job.
          </p>

          <p>
            <strong className="text-rose-200">Saídas:</strong> usam
            Fornecedores, Categorias e Subcategorias. Não entram em Marcas ou
            Grupos.
          </p>
        </div>
      </section>
    </div>
  );
}
