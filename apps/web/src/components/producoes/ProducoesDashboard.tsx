"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

type ProductionItem = {
  id: string;
  group: string;
  brand: string;
  project: string;
  description: string | null;
  type: string;
  status: string;
  rawStatus: string | null;
  pipelineStage: string;
  value: number;
  received: number;
  receivable: number;
  date: string | null;
  month: number | null;
  competence: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
};

type ProducoesOverviewResponse = {
  status: string;
  year: number;
  filters: {
    search: string;
    status: string;
  };
  summary: {
    totalProductions: number;
    filteredProductions: number;
    totalRevenue: number;
    receivedTotal: number;
    receivableTotal: number;
    finishedCount: number;
    pendingCount: number;
    groupsCount: number;
    brandsCount: number;
    topGroup: {
      name: string;
      value: number;
    } | null;
    topBrand: {
      name: string;
      value: number;
    } | null;
  };
  pipeline: Array<{
    name: string;
    count: number;
  }>;
  productions: ProductionItem[];
  message?: string;
};

const filterOptions = [
  { label: "Todas", value: "all" },
  { label: "Recebidas", value: "received" },
  { label: "Pendentes", value: "pending" },
];

const pipelineBarColors = {
  success: "rgb(52, 211, 153)",
  attention: "rgb(251, 191, 36)",
  info: "rgb(34, 211, 238)",
  danger: "rgb(248, 113, 113)",
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

function getStatusTone(item: ProductionItem) {
  const normalized = `${item.status} ${item.rawStatus ?? ""} ${item.pipelineStage}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("atras")) {
    return "danger";
  }

  if (
    item.type === "RECEIVABLE" ||
    normalized.includes("aguard") ||
    normalized.includes("pendente") ||
    normalized.includes("a pagar")
  ) {
    return "attention";
  }

  if (item.type === "REVENUE") {
    return "success";
  }

  return "neutral";
}

function getPipelineTone(stage: string) {
  const normalized = stage.toLowerCase();

  if (normalized.includes("finalizado")) {
    return "success";
  }

  if (normalized.includes("pendente")) {
    return "attention";
  }

  return "info";
}

function kpiHelperColor(tone: string) {
  if (tone === "k-kpi-helper-warning") return "rgb(251, 191, 36)";
  if (tone === "k-kpi-helper-danger") return "rgb(248, 113, 113)";

  return "rgb(45, 212, 191)";
}

function getProductionStatusStyle(item: ProductionItem) {
  const normalized = `${item.status} ${item.rawStatus ?? ""} ${item.pipelineStage}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("atras")) {
    return {
      background: "rgba(248, 113, 113, 0.1)",
      borderColor: "rgba(248, 113, 113, 0.38)",
      color: "rgb(252, 165, 165)",
    };
  }

  if (
    item.type === "RECEIVABLE" ||
    normalized.includes("aguard") ||
    normalized.includes("pendente") ||
    normalized.includes("a pagar")
  ) {
    return {
      background: "rgba(251, 191, 36, 0.1)",
      borderColor: "rgba(251, 191, 36, 0.36)",
      color: "rgb(251, 191, 36)",
    };
  }

  if (
    item.type === "REVENUE" ||
    normalized.includes("receb") ||
    /\bpago\b/.test(normalized) ||
    normalized.includes("paga")
  ) {
    return {
      background: "rgba(45, 212, 191, 0.1)",
      borderColor: "rgba(45, 212, 191, 0.34)",
      color: "rgb(94, 234, 212)",
    };
  }

  return {
    background: "rgba(251, 191, 36, 0.1)",
    borderColor: "rgba(251, 191, 36, 0.36)",
    color: "rgb(251, 191, 36)",
  };
}

export function ProducoesDashboard() {
  const [data, setData] = useState<ProducoesOverviewResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProducoes(params?: { status?: string; search?: string }) {
    const status = params?.status ?? activeFilter;
    const query = params?.search ?? appliedSearch;

    setLoading(true);
    setErrorMessage(null);

    try {
      const searchParams = new URLSearchParams({
        year: "2026",
        status,
      });

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      const response = await fetch(
        `/api/producoes/overview?${searchParams.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json = (await response.json()) as ProducoesOverviewResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar produções.");
        return;
      }

      setData(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de produções.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducoes({
      status: activeFilter,
      search: appliedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, appliedSearch]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(search);
  }

  const summaryCards = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        label: "Produções",
        value: summary ? String(summary.totalProductions) : "—",
        helper: "projetos no ano",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Faturamento",
        value: summary ? formatCompactCurrency(summary.totalRevenue) : "—",
        helper: "valor total",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Recebidas",
        value: summary ? String(summary.finishedCount) : "—",
        helper: summary ? formatCompactCurrency(summary.receivedTotal) : "Pagas",
        tone: "k-kpi-helper-positive",
      },
      {
        label: "Pendentes",
        value: summary ? String(summary.pendingCount) : "—",
        helper: summary
          ? formatCompactCurrency(summary.receivableTotal)
          : "Aguardando pagamento",
        tone: "k-kpi-helper-warning",
      },
      {
        label: "Grupos",
        value: summary ? String(summary.groupsCount) : "—",
        helper: "com produções",
        tone: "k-kpi-helper-info",
      },
      {
        label: "Top grupo",
        value: summary?.topGroup?.name ?? "—",
        helper: summary?.topGroup
          ? formatCompactCurrency(summary.topGroup.value)
          : "Sem dados",
        tone: "k-kpi-helper-info",
      },
    ];
  }, [data]);

  const productions = data?.productions ?? [];
  const pipeline = data?.pipeline ?? [];
  const pipelineMaxCount = Math.max(...pipeline.map((stage) => stage.count), 1);
  const pipelineTotals = useMemo(() => {
    return productions.reduce<Record<string, number>>((acc, item) => {
      acc[item.pipelineStage] = (acc[item.pipelineStage] ?? 0) + item.value;
      return acc;
    }, {});
  }, [productions]);
  const nextCapture = useMemo(() => {
    const pendingProductions = productions.filter((item) => {
      const status = `${item.status} ${item.pipelineStage}`.toLowerCase();

      return item.receivable > 0 || status.includes("pendente") || item.type === "RECEIVABLE";
    });

    return [...(pendingProductions.length ? pendingProductions : productions)].sort(
      (a, b) => b.value - a.value,
    )[0] ?? null;
  }, [productions]);
  const nextCaptureLinkedCount = nextCapture
    ? productions.filter((item) => item.group === nextCapture.group).length
    : 0;

  return (
    <div className="k-page space-y-6" style={{ gap: "18px", paddingTop: "30px" }}>
      <header
        className="k-page-header k-page-heading"
        style={{
          alignItems: "flex-start",
          display: "flex",
          flexDirection: "row",
          gap: "24px",
          justifyContent: "space-between",
          padding: 0,
        }}
      >
        <div style={{ maxWidth: "760px" }}>
          <h1
            className="k-title"
            style={{
              fontSize: "28px",
              fontWeight: 750,
              letterSpacing: 0,
              lineHeight: 1.05,
              margin: "0 0 14px",
            }}
          >
            Produções reais da operação.
          </h1>

          <p
            className="k-subtitle"
            style={{
              color: "rgba(148, 163, 184, 0.84)",
              fontSize: "12px",
              lineHeight: 1.45,
              margin: 0,
              maxWidth: "690px",
            }}
          >
            Jobs, projetos, marcas, grupos, valores e status financeiro consolidados das entradas.
          </p>
        </div>

        <div
          className="k-page-actions"
          style={{ alignItems: "center", gap: "8px", paddingTop: "24px" }}
        >
          <button
            type="button"
            onClick={() => loadProducoes()}
            className="k-button-ghost"
            style={{
              background: "rgba(15, 23, 42, 0.34)",
              borderColor: "rgba(148, 163, 184, 0.22)",
              borderRadius: "10px",
              color: "rgba(226, 232, 240, 0.9)",
              fontSize: "11.5px",
              fontWeight: 650,
              minHeight: "32px",
              paddingInline: "13px",
            }}
          >
            <RefreshCw size={14} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            type="button"
            className="k-button-primary"
            title="Cadastro rápido de produção será aberto em uma próxima etapa."
            style={{
              background: "rgba(34, 211, 238, 0.13)",
              borderColor: "rgba(34, 211, 238, 0.28)",
              borderRadius: "10px",
              color: "rgb(207, 250, 254)",
              fontSize: "11.5px",
              fontWeight: 650,
              minHeight: "32px",
              paddingInline: "13px",
            }}
          >
            <Plus size={14} />
            Nova produção
          </button>
        </div>
      </header>

      {errorMessage ? (
        <div className="k-toast" data-tone="danger">
          {errorMessage}
        </div>
      ) : null}

      <section
        className="k-kpi-strip"
        style={{
          background: "rgba(10, 14, 22, 0.92)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "14px",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.018)",
          display: "grid",
          gap: 0,
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          minHeight: "72px",
          overflow: "hidden",
        }}
      >
        {summaryCards.map((card, index) => (
          <article
            key={card.label}
            className="k-kpi-strip-item"
            style={{
              background: "transparent",
              border: 0,
              borderRadius: 0,
              borderRight:
                index === summaryCards.length - 1
                  ? 0
                  : "1px solid rgba(148, 163, 184, 0.12)",
              gap: "7px",
              justifyContent: "center",
              minHeight: "72px",
              padding: "12px 16px",
            }}
          >
            <span
              className="k-kpi-label"
              style={{
                color: "rgba(148, 163, 184, 0.58)",
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                lineHeight: 1.15,
              }}
            >
              {card.label}
            </span>

            <strong
              className="k-kpi-value"
              style={{
                color: "rgba(226, 232, 240, 0.94)",
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "15.5px",
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {renderKpiValue(card.value)}
            </strong>

            <span
              className={`k-kpi-helper ${card.tone}`}
              style={{
                color: kpiHelperColor(card.tone),
                fontFamily: "var(--font-mono-dashboard)",
                fontSize: "9px",
                fontWeight: 750,
                lineHeight: 1.2,
                minHeight: 0,
              }}
            >
              {card.helper}
            </span>
          </article>
        ))}
      </section>

      <section
        className="ops-bento-grid grid xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.58fr)]"
        style={{ gap: "12px" }}
      >
        <div
          className="k-card k-entry-table"
          style={{
            background: "rgba(10, 14, 22, 0.92)",
            borderColor: "rgba(148, 163, 184, 0.15)",
            borderRadius: "14px",
            boxShadow: "none",
            padding: "18px",
          }}
        >
          <div
            className="k-section-head flex-col items-start xl:flex-row xl:items-start"
            style={{ marginBottom: "15px", paddingBottom: 0 }}
          >
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                Pipeline de produções
              </h2>

              <p className="k-section-sub" style={{ fontSize: "11px", marginTop: "8px" }}>
                {data
                  ? `${data.summary.filteredProductions} de ${data.summary.totalProductions} produções.`
                  : "Carregando produções."}
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar grupo, marca ou projeto..."
                  className="k-input h-9 pl-10 pr-4 text-sm font-medium lg:w-80"
                  style={{
                    background: "rgba(7, 10, 16, 0.48)",
                    borderColor: "rgba(148, 163, 184, 0.16)",
                    borderRadius: "9px",
                    color: "rgba(226, 232, 240, 0.86)",
                    fontSize: "11px",
                    height: "30px",
                  }}
                />
              </form>

              <div
                className="flex flex-wrap"
                style={{
                  background: "rgba(7, 10, 16, 0.44)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: "9px",
                  gap: "2px",
                  padding: "3px",
                }}
              >
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className="k-filter-chip"
                    aria-pressed={activeFilter === option.value}
                    style={{
                      border: 0,
                      borderRadius: "7px",
                      fontSize: "10px",
                      minHeight: "24px",
                      paddingInline: "10px",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="k-table-card overflow-x-auto"
            style={{
              background: "transparent",
              border: 0,
              borderRadius: 0,
            }}
          >
            <div className="k-table min-w-[820px]">
              <div
                data-table-head
                className="grid grid-cols-[1.35fr_1.75fr_0.9fr_0.75fr_0.75fr]"
                style={{ padding: "12px 12px 10px" }}
              >
                <span>Grupo / Marca</span>
                <span>Projeto</span>
                <span>Competência</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {productions.map((item) => (
                <div
                  key={item.id}
                  className="k-table-row k-production-row grid grid-cols-[1.35fr_1.75fr_0.9fr_0.75fr_0.75fr] items-center border-b border-white/[0.045] last:border-b-0"
                  style={{ minHeight: "44px", padding: "0 12px" }}
                >
                  <div className="flex min-w-0 items-center" style={{ gap: "10px" }}>
                    <span className="k-avatar k-avatar-brand" style={{ height: "20px", width: "20px", fontSize: "9px" }}>
                      {getInitials(item.group)}
                    </span>

                    <div className="min-w-0">
                      <strong className="block truncate text-slate-100" style={{ fontSize: "11px", fontWeight: 750 }}>
                        {item.group}
                      </strong>

                      <span className="mt-1 block truncate text-slate-500" style={{ fontSize: "10px", lineHeight: 1.1 }}>
                        {item.brand}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 pr-4">
                    <span className="block truncate font-medium text-slate-300" style={{ fontSize: "11px" }}>
                      {item.project}
                    </span>
                  </div>

                  <div>
                    <span className="k-number block text-slate-300" style={{ fontSize: "11px" }}>
                      {item.competence ?? "—"}
                    </span>

                    <span className="mt-1 block text-slate-600" style={{ fontSize: "10px" }}>
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <span className="k-number font-semibold" style={{ color: "rgb(34, 211, 238)", fontSize: "12px" }}>
                    {formatCurrency(item.value)}
                  </span>

                  <span
                    className="k-badge"
                    data-tone={getStatusTone(item)}
                    style={{
                      ...getProductionStatusStyle(item),
                      borderRadius: "999px",
                      fontSize: "10px",
                      minHeight: "22px",
                      paddingInline: "9px",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}

              {!productions.length ? (
                <div className="k-empty">
                  Nenhuma produção encontrada para o filtro atual.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div
            className="k-card k-pipeline-status-card"
            style={{
              background: "rgba(10, 14, 22, 0.92)",
              borderColor: "rgba(148, 163, 184, 0.15)",
              borderRadius: "14px",
              boxShadow: "none",
              padding: "18px",
            }}
          >
            <div className="k-section-head" style={{ marginBottom: "17px", paddingBottom: 0 }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                  Status do pipeline
                </h2>

                <p className="k-section-sub" style={{ fontSize: "11px", marginTop: "8px" }}>
                  Distribuição operacional
                </p>
              </div>
            </div>

            <div className="k-pipeline-status-list" style={{ gap: "15px" }}>
              {pipeline.map((stage) => (
                <div
                  key={stage.name}
                  className="k-pipeline-status-item"
                  data-tone={getPipelineTone(stage.name)}
                  style={{
                    background: "transparent",
                    border: 0,
                    borderRadius: 0,
                    padding: 0,
                  }}
                >
                  <div className="k-pipeline-status-header" style={{ marginBottom: "8px" }}>
                    <span style={{ color: "rgba(226, 232, 240, 0.9)", fontSize: "11px", fontWeight: 650 }}>
                      {stage.name}
                    </span>

                    <strong className="k-pipeline-status-value" style={{ fontSize: "11px", fontWeight: 800 }}>
                      {stage.count}
                    </strong>
                  </div>

                  <div
                    className="k-pipeline-status-track"
                    style={{
                      background: "rgba(30, 41, 59, 0.72)",
                      height: "3px",
                    }}
                  >
                    <div
                      className="k-pipeline-status-bar"
                      style={{
                        background:
                          pipelineBarColors[getPipelineTone(stage.name) as keyof typeof pipelineBarColors],
                        width: `${Math.min(Math.max((stage.count / pipelineMaxCount) * 100, 6), 100)}%`,
                      }}
                    />
                  </div>

                  <p className="k-pipeline-status-helper" style={{ fontSize: "10px", marginTop: "6px" }}>
                    {formatCompactCurrency(pipelineTotals[stage.name] ?? 0)}
                  </p>
                </div>
              ))}

              {!pipeline.length ? (
                <div className="k-empty">
                  Nenhum status de produção encontrado.
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="k-card k-next-capture-card"
            style={{
              background: "rgba(10, 14, 22, 0.92)",
              borderColor: "rgba(148, 163, 184, 0.15)",
              borderRadius: "14px",
              boxShadow: "none",
              padding: "18px",
            }}
          >
            <div className="k-next-capture-header">
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 750, lineHeight: 1.1, margin: 0 }}>Próxima captação</h2>
                <p style={{ fontSize: "11px", marginTop: "8px" }}>Job de maior valor pendente</p>
              </div>

              <span
                className="k-next-capture-rec"
                style={{
                  background: "rgba(34, 211, 238, 0.1)",
                  borderColor: "rgba(34, 211, 238, 0.34)",
                  color: "rgb(103, 232, 249)",
                  fontSize: "10px",
                }}
              >
                <span />
                REC
              </span>
            </div>

            {nextCapture ? (
              <div className="k-next-capture-body">
                <div className="k-next-capture-identity">
                  <span className="k-next-capture-avatar" style={{ height: "24px", width: "24px", fontSize: "10px" }}>
                    {getInitials(nextCapture.group)}
                  </span>

                  <div className="min-w-0">
                    <strong className="k-next-capture-title">
                      {nextCapture.group}
                    </strong>
                    <span className="k-next-capture-meta">
                      {formatDate(nextCapture.date)} · {nextCapture.brand}
                    </span>
                  </div>
                </div>

                <strong className="k-next-capture-value">
                  {formatCurrency(nextCapture.value)}
                </strong>

                <p className="k-next-capture-helper" style={{ lineHeight: 1.45 }}>
                  {(nextCapture.description || nextCapture.project).trim()} · {nextCaptureLinkedCount} entradas vinculadas ao grupo.
                </p>
              </div>
            ) : (
              <div className="k-empty">
                Nenhuma captação pendente encontrada.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
