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

function getStatusTone(item: VencimentosItem) {
  const status = item.status?.toUpperCase() ?? "";

  if (status.includes("ATRAS")) return "danger";

  if (item.type === "RECEIVABLE") {
    return "info";
  }

  if (item.type === "PAYABLE") {
    return "attention";
  }

  if (item.type === "REVENUE") {
    return "success";
  }

  if (item.type === "EXPENSE") {
    return "success";
  }

  return "neutral";
}

function DirectionIcon({ item }: { item: VencimentosItem }) {
  if (item.direction === "entrada") {
    return <ArrowUpRight size={14} className="text-cyan-300/75" />;
  }

  if (item.direction === "saida") {
    return <ArrowDownLeft size={14} className="text-violet-300/65" />;
  }

  return <CircleDollarSign size={14} className="text-slate-500" />;
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
        tone: "k-kpi-helper-warning",
      },
      {
        label: "A receber",
        value: summary ? formatCompactCurrency(summary.receivableTotal) : "—",
        helper: `${summary?.receivablesCount ?? 0} recebimentos pendentes`,
        icon: ArrowUpRight,
        tone: "k-kpi-helper-info",
      },
      {
        label: "A pagar",
        value: summary ? formatCompactCurrency(summary.payableTotal) : "—",
        helper: `${summary?.payablesCount ?? 0} pagamentos pendentes`,
        icon: ArrowDownLeft,
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Saldo projetado",
        value: summary ? formatCompactCurrency(summary.projectedBalance) : "—",
        helper: "A receber - a pagar",
        icon: CircleDollarSign,
        tone:
          summary && summary.projectedBalance < 0
            ? "k-kpi-helper-danger"
            : "k-kpi-helper-info",
      },
      {
        label: "Recebido",
        value: summary ? formatCompactCurrency(summary.receivedTotal) : "—",
        helper: "Entradas já pagas",
        icon: CheckCircle2,
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Despesas pagas",
        value: summary ? formatCompactCurrency(summary.paidTotal) : "—",
        helper: "Saídas já pagas",
        icon: Wallet,
        tone: "k-kpi-helper-positive",
      },
    ];
  }, [data]);

  const agendaItems = data?.agendaItems ?? [];
  const recentDoneItems = data?.recentDoneItems ?? [];

  return (
    <div className="k-page space-y-6">
      <header className="k-page-header k-page-heading">
        <div>
          <p className="k-eyebrow">
            Vencimentos
          </p>

          <h1 className="k-title">
            Vencimentos financeiros.
          </h1>

          <p className="k-subtitle">
            Próximos recebimentos, pagamentos pendentes e movimentos recentes
            calculados diretamente da planilha importada.
          </p>
        </div>

        <div className="k-page-actions">
          <button
            type="button"
            onClick={loadVencimentos}
            className="k-button-ghost"
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <div className="k-button-secondary">
            <CalendarDays size={16} />
            Ano fiscal 2026
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <section className="k-kpi-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className="k-kpi-strip-item">
            <span className="k-kpi-label">{card.label}</span>
            <strong className="k-kpi-value">{renderKpiValue(card.value)}</strong>
            <span className={`k-kpi-helper ${card.tone}`}>{card.helper}</span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="k-card k-entry-table k-due-table">
          <div className="k-section-head">
            <div>
            <h2>
              Próximas pendências
            </h2>

            <p className="k-section-sub">
              {agendaItems.length} itens financeiros em aberto.
            </p>
            </div>
          </div>

          <div className="k-table-card overflow-x-auto">
            <div className="k-table min-w-[860px]">
              <div data-table-head className="grid grid-cols-[1.4fr_1.5fr_1fr_1fr_1fr] px-5 py-3">
                <span>Cliente / fornecedor</span>
                <span>Descrição</span>
                <span>Competência</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {agendaItems.map((item) => (
                <div
                  key={item.id}
                  className="k-table-row grid grid-cols-[1.4fr_1.5fr_1fr_1fr_1fr] items-center border-b border-white/[0.045] px-5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="k-avatar k-avatar-brand">
                      {getInitials(item.name)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-slate-100">
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
                    <span className="k-number block text-slate-300">
                      {item.competence ?? "—"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span
                    className={`k-number font-semibold ${
                      item.direction === "entrada"
                        ? "text-emerald-200"
                        : "text-slate-200"
                    }`}
                  >
                    {formatCurrency(item.value)}
                  </span>

                  <span className="k-badge" data-tone={getStatusTone(item)}>
                    {item.status || item.kind}
                  </span>
                </div>
              ))}

              {!agendaItems.length ? (
                <div className="k-empty">
                  Nenhuma pendência financeira encontrada.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="k-card k-recent-list">
          <div className="k-section-head">
            <div>
            <h2>
              Movimentos recentes
            </h2>

            <p className="k-section-sub">
              Últimos recebidos e pagos identificados.
            </p>
            </div>
          </div>

          <div className="space-y-3">
            {recentDoneItems.map((item) => (
              <div
                key={item.id}
                className="k-card-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-slate-100">
                      {item.name}
                    </strong>

                    <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`k-number text-sm font-semibold ${
                      item.direction === "entrada"
                        ? "text-emerald-200"
                        : "text-slate-200"
                    }`}
                  >
                    {formatCompactCurrency(item.value)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="k-badge" data-tone={getStatusTone(item)}>
                    {item.kind}
                  </span>

                  <span className="text-xs font-medium text-slate-600">
                    {item.competence ?? "—"}
                  </span>
                </div>
              </div>
            ))}

            {!recentDoneItems.length ? (
              <div className="k-empty">
                Nenhum movimento recente encontrado.
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}


