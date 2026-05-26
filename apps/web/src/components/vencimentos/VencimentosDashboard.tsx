"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  Wallet,
} from "lucide-react";

type VencimentosItem = {
  id: string;
  type: string;
  direction: "entrada" | "saida" | "outro";
  kind: string;
  date: string | null;
  month: number | null;
  competence: string | null;
  name: string;
  description: string;
  category: string | null;
  status: string | null;
  value: number;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type VencimentosOverviewResponse = {
  status: string;
  year: number;
  summary: {
    pendingItems: number;
    receivablesCount: number;
    payablesCount: number;
    receivableTotal: number;
    payableTotal: number;
    receivedTotal: number;
    paidTotal: number;
    projectedBalance: number;
  };
  agendaItems: VencimentosItem[];
  recentDoneItems: VencimentosItem[];
  message?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getStatusClass(item: VencimentosItem) {
  if (item.type === "RECEIVABLE") {
    return "bg-cyan-400/10 text-cyan-200";
  }

  if (item.type === "PAYABLE") {
    return "bg-violet-400/10 text-violet-200";
  }

  if (item.type === "REVENUE") {
    return "bg-emerald-400/10 text-emerald-200";
  }

  if (item.type === "EXPENSE") {
    return "bg-rose-400/10 text-rose-200";
  }

  return "bg-white/10 text-slate-300";
}

function DirectionIcon({ item }: { item: VencimentosItem }) {
  if (item.direction === "entrada") {
    return <ArrowUpRight size={16} className="text-emerald-300" />;
  }

  if (item.direction === "saida") {
    return <ArrowDownLeft size={16} className="text-rose-300" />;
  }

  return <CircleDollarSign size={16} className="text-slate-400" />;
}

export function VencimentosDashboard() {
  const [data, setData] = useState<VencimentosOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadVencimentos() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/vencimentos/overview?year=2026", {
        cache: "no-store",
      });

      const json = (await response.json()) as VencimentosOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar agenda.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVencimentos();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Pendências",
        value: summary ? String(summary.pendingItems) : "—",
        helper: "Recebimentos e pagamentos em aberto",
        icon: CalendarClock,
        tone: "text-cyan-300",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: `${summary?.receivablesCount ?? 0} recebimentos pendentes`,
        icon: ArrowUpRight,
        tone: "text-emerald-300",
      },
      {
        label: "A pagar",
        value: summary ? formatCompactCurrency(summary.payableTotal) : "—",
        helper: `${summary?.payablesCount ?? 0} pagamentos pendentes`,
        icon: ArrowDownLeft,
        tone: "text-rose-300",
      },
      {
        label: "Saldo projetado",
        value: summary ? formatCompactCurrency(summary.projectedBalance) : "—",
        helper: "A receber - a pagar",
        icon: CircleDollarSign,
        tone:
          summary && summary.projectedBalance < 0
            ? "text-rose-300"
            : "text-cyan-300",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas já pagas",
        icon: CheckCircle2,
        tone: "text-emerald-300",
      },
      {
        label: "Despesas pagas",
        value: summary ? formatCompactCurrency(summary.paidTotal) : "—",
        helper: "Saídas já pagas",
        icon: Wallet,
        tone: "text-violet-300",
      },
    ];
  }, [data]);

  const agendaItems = data?.agendaItems ?? [];
  const recentDoneItems = data?.recentDoneItems ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-cyan-300">
            Vencimentos
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Vencimentos financeiros.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            Próximos recebimentos, pagamentos pendentes e movimentos recentes
            calculados diretamente da planilha importada.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadVencimentos}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="dashboard-label text-[11px] text-slate-500">
                    {card.label}
                  </p>

                  <strong className="dashboard-number mt-3 block truncate text-[25px] font-semibold text-white">
                    {card.value}
                  </strong>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {card.helper}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                  <Icon size={22} className={card.tone} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Próximas pendências
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              {agendaItems.length} itens financeiros em aberto.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[1.4fr_1.5fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Cliente / fornecedor</span>
                <span>Descrição</span>
                <span>Competência</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {agendaItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.4fr_1.5fr_1fr_1fr_1fr] items-center border-b border-white/[0.06] px-5 py-4 text-sm last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        item.direction === "entrada"
                          ? "bg-emerald-400/10 text-emerald-200"
                          : "bg-rose-400/10 text-rose-200"
                      }`}
                    >
                      {getInitials(item.name)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-white">
                        {item.name}
                      </strong>

                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <DirectionIcon item={item} />
                        {item.kind}
                      </span>
                    </div>
                  </div>

                  <span className="line-clamp-2 pr-4 text-sm font-medium text-slate-400">
                    {item.description}
                  </span>

                  <div>
                    <span className="dashboard-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span
                    className={`dashboard-number font-semibold ${
                      item.direction === "entrada"
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {formatCurrency(item.value)}
                  </span>

                  <span
                    className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${getStatusClass(
                      item
                    )}`}
                  >
                    {item.status || item.kind}
                  </span>
                </div>
              ))}

              {!agendaItems.length ? (
                <div className="px-5 py-8 text-sm font-medium text-slate-500">
                  Nenhuma pendência financeira encontrada.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-4 sm:p-5 xl:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Movimentos recentes
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Últimos recebidos e pagos identificados.
            </p>
          </div>

          <div className="space-y-3">
            {recentDoneItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-white">
                      {item.name}
                    </strong>

                    <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`dashboard-number text-sm font-semibold ${
                      item.direction === "entrada"
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {formatCompactCurrency(item.value)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(item)}`}>
                    {item.kind}
                  </span>

                  <span className="text-xs font-medium text-slate-600">
                    {item.competence ?? "—"}
                  </span>
                </div>
              </div>
            ))}

            {!recentDoneItems.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-medium text-slate-500">
                Nenhum movimento recente encontrado.
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

