"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Minus,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

type ManualExit = {
  id: string;
  type: string;
  client: string | null;
  groupName: string | null;
  project: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  costAmount: unknown;
  financialStatus: string | null;
  supplierName: string | null;
  subCategory: string | null;
  nature: string | null;
  recurrence: string | null;
  dueAt: string | null;
  paidAt: string | null;
  notes: string | null;
  competence: string | null;
  linkedClient: string | null;
  costCenter: string | null;
  paymentMethod: string | null;
  accountName: string | null;
  proofUrl: string | null;
  expectedAmount: unknown;
  paidAmount: unknown;
};

type ApiResponse = {
  status: string;
  entries?: ManualExit[];
  message?: string;
};

type CatalogResponse = {
  status: string;
  suppliers?: string[];
  brands?: string[];
  expenseCategories?: string[];
  expenseSubCategories?: string[];
  expenseNatures?: string[];
  paymentMethods?: string[];
  accountNames?: string[];
  costCenters?: string[];
  recurrences?: string[];
  message?: string;
};

type SaidaForm = {
  category: string;
  subCategory: string;
  supplierName: string;
  description: string;
  project: string;
  linkedClient: string;
  expectedValue: string;
  paidValue: string;
  financialStatus: string;
  recurrence: string;
  nature: string;
  costCenter: string;
  paymentMethod: string;
  accountName: string;
  dueAt: string;
  paidAt: string;
  proofUrl: string;
  notes: string;
};

const initialForm: SaidaForm = {
  category: "",
  subCategory: "",
  supplierName: "",
  description: "",
  project: "",
  linkedClient: "",
  expectedValue: "",
  paidValue: "",
  financialStatus: "A_PAGAR",
  recurrence: "PONTUAL",
  nature: "VARIAVEL",
  costCenter: "",
  paymentMethod: "",
  accountName: "",
  dueAt: new Date().toISOString().slice(0, 10),
  paidAt: "",
  proofUrl: "",
  notes: "",
};

const defaultCategories = [
  "Pessoas",
  "Produção / Projeto",
  "Tecnologia / Assinaturas",
  "Administrativo",
  "Financeiro / Impostos",
  "Viagens / Deslocamento",
  "Infraestrutura / Operacional",
  "Outros",
];

const defaultCostCenters = [
  "Administração",
  "Produção",
  "Tecnologia",
  "Financeiro",
  "Operacional",
];

const defaultPaymentMethods = [
  "Pix",
  "Cartão",
  "Boleto",
  "Transferência",
  "Dinheiro",
];

function uniqueOptions(values: string[]) {
  return Array.from(
    new Set(values.map((item) => item.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

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
    A_PAGAR: "A pagar",
    PAGO: "Pago",
    CANCELADO: "Cancelado",
  };

  if (!value) return "—";

  return labels[value] ?? value;
}

function recurrenceLabel(value: string | null) {
  const labels: Record<string, string> = {
    MENSAL: "Mensal",
    PONTUAL: "Pontual",
    ANUAL: "Anual",
    PARCELADO: "Parcelado",
  };

  if (!value) return "—";

  return labels[value] ?? value;
}

function natureLabel(value: string | null) {
  const labels: Record<string, string> = {
    FIXO: "Fixo",
    VARIAVEL: "Variável",
  };

  if (!value) return "—";

  return labels[value] ?? value;
}

function statusTone(value: string | null) {
  if (value === "PAGO") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (value === "A_PAGAR") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }

  if (value === "CANCELADO") {
    return "border-slate-300/15 bg-slate-300/10 text-slate-300";
  }

  return "border-rose-300/20 bg-rose-300/10 text-rose-200";
}

function getInitials(value: string | null) {
  if (!value) return "2K";

  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (!parts.length) return "2K";

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="dashboard-label text-[10px] text-slate-500">
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "rose",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "rose" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-300/18 to-transparent text-emerald-200"
      : tone === "amber"
        ? "from-amber-300/18 to-transparent text-amber-200"
        : "from-rose-300/18 to-transparent text-rose-200";

  return (
    <article className="relative min-h-[104px] overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,30,0.96),rgba(10,13,20,0.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r ${toneClass}`} />

      <p className="dashboard-label text-[10px] text-slate-500">{label}</p>

      <strong className="dashboard-number mt-3 block text-[25px] font-semibold leading-none text-white">
        {value}
      </strong>

      <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p>
    </article>
  );
}

export function SaidasManualDashboard() {
  const [entries, setEntries] = useState<ManualExit[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [expenseSubCategories, setExpenseSubCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [recurrences, setRecurrences] = useState<string[]>([]);
  const [form, setForm] = useState<SaidaForm>(initialForm);
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
        setSuppliers(json.suppliers ?? []);
        setBrands(json.brands ?? []);
        setExpenseCategories(json.expenseCategories ?? []);
        setExpenseSubCategories(json.expenseSubCategories ?? []);
        setPaymentMethods(json.paymentMethods ?? []);
        setAccountNames(json.accountNames ?? []);
        setCostCenters(json.costCenters ?? []);
        setRecurrences(json.recurrences ?? []);
      }
    } catch {
      // Mantém formulário funcionando mesmo se a base falhar.
    }
  }

  async function loadEntries() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/saidas", {
        cache: "no-store",
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar saídas.");
        return;
      }

      setEntries(json.entries ?? []);
    } catch {
      setErrorMessage("Erro ao conectar com a API de saídas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    loadEntries();
  }, []);

  function updateField(name: keyof SaidaForm, value: string) {
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

  function startEdit(entry: ManualExit) {
    const expectedAmount = toNumber(entry.expectedAmount) || toNumber(entry.costAmount);
    const paidAmount = toNumber(entry.paidAmount);

    setEditingId(entry.id);
    setForm({
      category: entry.category ?? "",
      subCategory: entry.subCategory ?? "",
      supplierName: entry.supplierName ?? entry.client ?? "",
      description: entry.description ?? "",
      project: entry.project ?? "",
      linkedClient: entry.linkedClient ?? "",
      expectedValue: expectedAmount ? String(expectedAmount) : "",
      paidValue: paidAmount ? String(paidAmount) : "",
      financialStatus: entry.financialStatus ?? "A_PAGAR",
      recurrence: entry.recurrence ?? "PONTUAL",
      nature: entry.nature ?? "VARIAVEL",
      costCenter: entry.costCenter ?? "",
      paymentMethod: entry.paymentMethod ?? "",
      accountName: entry.accountName ?? "",
      dueAt: toDateInput(entry.dueAt),
      paidAt: toDateInput(entry.paidAt),
      proofUrl: entry.proofUrl ?? "",
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
      const response = await fetch("/api/manual/saidas", {
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
        setErrorMessage(json.message ?? "Erro ao salvar saída.");
        return;
      }

      setSuccessMessage(
        editingId
          ? "Saída atualizada com sucesso."
          : "Saída criada com sucesso."
      );

      setForm(initialForm);
      setEditingId(null);

      await Promise.all([loadCatalog(), loadEntries()]);
    } catch {
      setErrorMessage("Erro ao conectar com a API de saídas.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta saída? Ela sairá das listas e dos cálculos, mas ficará preservada tecnicamente no banco."
    );

    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/manual/saidas", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao excluir saída.");
        return;
      }

      if (editingId === id) {
        setForm(initialForm);
        setEditingId(null);
      }

      setSuccessMessage("Saída excluída com sucesso.");
      await loadEntries();
    } catch {
      setErrorMessage("Erro ao conectar com a API de saídas.");
    } finally {
      setSaving(false);
    }
  }

  const total = entries.reduce((sum, entry) => sum + toNumber(entry.costAmount), 0);
  const pagas = entries.filter((entry) => entry.financialStatus === "PAGO");
  const aPagar = entries.filter((entry) => entry.financialStatus !== "PAGO");

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return entries;

    return entries.filter((entry) =>
      [
        entry.category,
        entry.subCategory,
        entry.supplierName,
        entry.client,
        entry.description,
        entry.project,
        entry.linkedClient,
        entry.paymentMethod,
        entry.accountName,
        entry.financialStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [entries, query]);

  const paidPercent = entries.length
    ? Math.round((pagas.length / entries.length) * 100)
    : 0;

  return (
    <div className="manual-page-v2 manual-page-exits space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-rose-300">
            Saídas
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Lançar saída manual.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            Cadastre despesas, custos, fornecedores, centro de custo, pagamento, vencimento e comprovante.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              loadCatalog();
              loadEntries();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-rose-300/25 bg-rose-300/12 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/18"
          >
            <Minus size={16} />
            Nova saída
          </button>
        </div>
      </header>

      <section className="manual-summary-strip grid gap-3 md:grid-cols-3">
        <StatCard
          label="Saídas manuais"
          value={String(entries.length)}
          helper="registros criados"
        />

        <StatCard
          label="Valor lançado"
          value={formatCurrency(total)}
          helper="soma das saídas manuais"
        />

        <StatCard
          label="Situação"
          value={`${pagas.length}/${aPagar.length}`}
          helper="pagas · a pagar"
          tone="rose"
        />
      </section>
<section className="rounded-[18px] border border-rose-300/15 bg-[linear-gradient(180deg,rgba(45,22,30,0.56),rgba(10,13,20,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-rose-300/20 bg-rose-300/10 text-rose-200">
            <WalletCards size={21} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
              {isEditing ? "Editar saída" : "Nova saída"}
            </h2>
            <p className="mt-1 text-sm font-medium text-rose-100/65">
              Estrutura baseada em categoria, subcategoria, fornecedor, pagamento, centro de custo e vencimento.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-2">
          <label className="block">
            <FieldLabel>Categoria principal</FieldLabel>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione uma categoria</option>
              {uniqueOptions([...defaultCategories, ...expenseCategories]).map(
                (item) => (
                  <option key={`category-${item}`} value={item}>
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Subcategoria</FieldLabel>
            <select
              value={form.subCategory}
              onChange={(event) => updateField("subCategory", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione uma subcategoria</option>
              {uniqueOptions(expenseSubCategories).map((item) => (
                <option key={`subcategory-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Para adicionar subcategorias, use Configurações → Saídas.
            </p>
          </label>

          <label className="block">
            <FieldLabel>Fornecedor / nome</FieldLabel>
            <select
              value={form.supplierName}
              onChange={(event) => updateField("supplierName", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione um fornecedor</option>
              {uniqueOptions(suppliers).map((supplier) => (
                <option key={`supplier-${supplier}`} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Para adicionar fornecedores, use Configurações → Saídas.
            </p>
          </label>

          <label className="block">
            <FieldLabel>Cliente vinculado</FieldLabel>
            <select
              value={form.linkedClient}
              onChange={(event) => updateField("linkedClient", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Interno / não vinculado</option>
              {uniqueOptions(brands).map((brand) => (
                <option key={`brand-${brand}`} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>

          <label className="block xl:col-span-2">
            <FieldLabel>Descrição</FieldLabel>
            <input
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Ex: assinatura mensal, freela de edição ou aluguel de luz"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          <label className="block">
            <FieldLabel>Projeto vinculado</FieldLabel>
            <input
              value={form.project}
              onChange={(event) => updateField("project", event.target.value)}
              placeholder="Opcional"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          <label className="block">
            <FieldLabel>Centro de custo</FieldLabel>
            <select
              value={form.costCenter}
              onChange={(event) => updateField("costCenter", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione</option>
              {uniqueOptions([...defaultCostCenters, ...costCenters]).map((item) => (
                <option key={`cost-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Valor previsto</FieldLabel>
            <input
              value={form.expectedValue}
              onChange={(event) => updateField("expectedValue", event.target.value)}
              placeholder="Ex: 500 ou 1.500,00"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          <label className="block">
            <FieldLabel>Valor pago</FieldLabel>
            <input
              value={form.paidValue}
              onChange={(event) => updateField("paidValue", event.target.value)}
              placeholder="Preencher quando pago"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          <label className="block">
            <FieldLabel>Status financeiro</FieldLabel>
            <select
              value={form.financialStatus}
              onChange={(event) => updateField("financialStatus", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="A_PAGAR">A pagar</option>
              <option value="PAGO">Pago</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel>Recorrência</FieldLabel>
            <select
              value={form.recurrence}
              onChange={(event) => updateField("recurrence", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              {uniqueOptions(["PONTUAL", "MENSAL", "ANUAL", "PARCELADO", ...recurrences]).map((item) => (
                <option key={`recurrence-${item}`} value={item}>
                  {recurrenceLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Natureza</FieldLabel>
            <select
              value={form.nature}
              onChange={(event) => updateField("nature", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="FIXO">Fixo</option>
              <option value="VARIAVEL">Variável</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel>Forma de pagamento</FieldLabel>
            <select
              value={form.paymentMethod}
              onChange={(event) => updateField("paymentMethod", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione</option>
              {uniqueOptions([...defaultPaymentMethods, ...paymentMethods]).map((item) => (
                <option key={`payment-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Conta / cartão</FieldLabel>
            <select
              value={form.accountName}
              onChange={(event) => updateField("accountName", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            >
              <option value="">Selecione</option>
              {uniqueOptions([form.accountName, ...accountNames]).map((item) => (
                <option key={`account-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Para adicionar contas ou cartões, use Configurações → Financeiro.
            </p>
          </label>

          <label className="block">
            <FieldLabel>Vencimento</FieldLabel>
            <input
              type="date"
              value={form.dueAt}
              onChange={(event) => updateField("dueAt", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            />
          </label>

          <label className="block">
            <FieldLabel>Data de pagamento</FieldLabel>
            <input
              type="date"
              value={form.paidAt}
              onChange={(event) => updateField("paidAt", event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none focus:border-rose-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <FieldLabel>Comprovante</FieldLabel>
            <input
              value={form.proofUrl}
              onChange={(event) => updateField("proofUrl", event.target.value)}
              placeholder="Link do comprovante, Drive ou observação de arquivo"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          <label className="block xl:col-span-2">
            <FieldLabel>Observação</FieldLabel>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              placeholder="Observações internas sobre pagamento, negociação, parcelamento ou vínculo com projeto."
              className="mt-2 w-full resize-none rounded-[12px] border border-white/10 bg-[#070b13]/75 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-[14px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100 xl:col-span-2">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="flex items-center gap-2 rounded-[14px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100 xl:col-span-2">
              <CheckCircle2 size={17} />
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 xl:col-span-2">
            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-[11px] border border-white/10 bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                <X size={16} />
                Cancelar edição
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[11px] border border-rose-300/20 bg-rose-300/15 px-5 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />}
              {isEditing ? "Salvar alteração" : "Salvar saída"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,30,0.96),rgba(10,13,20,0.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-5 xl:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
              Saídas manuais recentes
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {filteredEntries.length} de {entries.length} saídas cadastradas.
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
              placeholder="Buscar categoria, fornecedor ou descrição..."
              className="h-10 w-full rounded-[12px] border border-white/10 bg-white/[0.035] pl-10 pr-4 text-sm font-medium text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-rose-300/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-white/10">
          <div className="min-w-[1320px]">
            <div className="grid grid-cols-[1fr_1fr_1.2fr_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Categoria</span>
              <span>Subcategoria</span>
              <span>Fornecedor</span>
              <span>Descrição</span>
              <span>Valor</span>
              <span>Status</span>
              <span>Vencimento</span>
              <span>Ações</span>
            </div>

            {loading ? (
              <div className="px-5 py-6 text-sm font-medium text-slate-500">
                Carregando saídas...
              </div>
            ) : filteredEntries.length ? (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid min-h-[58px] grid-cols-[1fr_1fr_1.2fr_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] items-center border-b border-white/[0.055] px-5 py-3 text-sm last:border-b-0"
                >
                  <span className="truncate font-semibold text-white">
                    {entry.category ?? "—"}
                  </span>
                  <span className="truncate text-slate-300">
                    {entry.subCategory ?? "—"}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-300/20 bg-rose-300/10 text-xs font-semibold text-rose-200">
                      {getInitials(entry.supplierName ?? entry.client)}
                    </span>
                    <span className="truncate text-slate-300">
                      {entry.supplierName ?? entry.client ?? "—"}
                    </span>
                  </div>
                  <span className="truncate text-slate-300">
                    {entry.description ?? "—"}
                  </span>
                  <span className="dashboard-number font-semibold text-rose-200">
                    {formatCurrency(entry.costAmount)}
                  </span>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                      entry.financialStatus ?? entry.status
                    )}`}
                  >
                    {statusLabel(entry.financialStatus ?? entry.status)}
                  </span>
                  <span className="dashboard-number text-slate-400">
                    {formatDate(entry.dueAt)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-sm font-medium text-slate-500">
                Nenhuma saída manual encontrada.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


