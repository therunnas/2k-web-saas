"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  DatabaseZap,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

type SpreadsheetStatus = {
  status: string;
  latestImport?: {
    id: string;
    originalName: string;
    importedAt: string;
    entriesCount: number;
    outputsCount: number;
    groupsCount: number;
    brandsCount: number;
  } | null;
  totals?: {
    importsCount: number;
    spreadsheetEntriesCount: number;
    spreadsheetEntradasCount: number;
    spreadsheetSaidasCount: number;
    manualEntriesCount: number;
    manualEntradasCount: number;
    manualSaidasCount: number;
  };
  message?: string;
};

type ApiResponse = {
  status: string;
  message?: string;
  deleted?: {
    entries?: number;
    imports?: number;
  };
  preservedManualRecords?: number;
  summary?: {
    rows: number;
    entradas: number;
    saidas: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#0b101b] p-5">
      <p className="dashboard-label text-[11px] text-slate-500">{label}</p>

      <strong className="dashboard-number mt-3 block text-[26px] font-semibold text-white">
        {value}
      </strong>

      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

export function SistemaImportDashboard() {
  const [status, setStatus] = useState<SpreadsheetStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/workspace/spreadsheet/status", {
        cache: "no-store",
      });

      const json = (await response.json()) as SpreadsheetStatus;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao carregar status da planilha.");
        return;
      }

      setStatus(json);
    } catch {
      setErrorMessage("Erro ao conectar com a API de status da planilha.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Selecione uma planilha .xlsx ou .xls.");
      return;
    }

    setUploading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/workspace/spreadsheet/upload", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao importar planilha.");
        return;
      }

      setSelectedFile(null);
      setSuccessMessage(
        `Planilha importada com sucesso. Entradas: ${
          json.summary?.entradas ?? 0
        }. Saídas: ${json.summary?.saidas ?? 0}.`
      );

      const input = document.getElementById(
        "spreadsheet-file"
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadStatus();
    } catch {
      setErrorMessage("Erro ao enviar planilha.");
    } finally {
      setUploading(false);
    }
  }

  async function handleClearImportedData() {
    const confirmed = window.confirm(
      "Tem certeza que deseja limpar os dados importados da planilha? Entradas e saídas manuais serão preservadas."
    );

    if (!confirmed) return;

    setClearing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/workspace/spreadsheet/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ confirm: "LIMPAR" }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.status !== "ok") {
        setErrorMessage(json.message ?? "Erro ao limpar dados importados.");
        return;
      }

      setSuccessMessage(
        `Dados importados limpos. Registros removidos: ${
          json.deleted?.entries ?? 0
        }. Manuais preservados: ${json.preservedManualRecords ?? 0}.`
      );

      await loadStatus();
    } catch {
      setErrorMessage("Erro ao conectar com a API de limpeza.");
    } finally {
      setClearing(false);
    }
  }

  const totals = status?.totals;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="dashboard-label text-[11px] text-violet-300">
            Configurações / Sistema
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] text-white">
            Sistema e importação.
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-400">
            Controle a importação da planilha sem apagar dados manuais. Use esta área para reprocessar dados legados com segurança.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Importados"
          value={loading ? "..." : totals?.spreadsheetEntriesCount ?? 0}
          description="Registros ativos vindos da planilha."
        />

        <StatCard
          label="Entradas importadas"
          value={loading ? "..." : totals?.spreadsheetEntradasCount ?? 0}
          description="Entradas lidas da aba de entradas."
        />

        <StatCard
          label="Saídas importadas"
          value={loading ? "..." : totals?.spreadsheetSaidasCount ?? 0}
          description="Saídas lidas da aba de saídas."
        />

        <StatCard
          label="Manuais preservados"
          value={loading ? "..." : totals?.manualEntriesCount ?? 0}
          description="Entradas e saídas criadas direto no SaaS."
        />
      </section>

      <section className="rounded-[1.75rem] border border-violet-300/15 bg-violet-300/[0.045] p-4 sm:p-5 xl:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200">
            <DatabaseZap size={21} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.035em]">
              Reprocessar planilha
            </h2>

            <p className="mt-1 text-sm font-medium text-violet-100/65">
              Ao importar uma nova planilha, os dados importados antigos são substituídos. Dados manuais continuam salvos.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="dashboard-label text-[11px] text-slate-500">
              Arquivo
            </span>

            <input
              id="spreadsheet-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="mt-2 block h-11 w-full rounded-2xl border border-white/10 bg-[#070b13]/75 px-4 py-2 text-sm font-medium text-slate-300 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-violet-300/40"
            />
          </label>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-300/15 px-5 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Importar / atualizar
          </button>

          <button
            type="button"
            onClick={handleClearImportedData}
            disabled={clearing}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Limpar importados
          </button>
        </div>

        {selectedFile ? (
          <p className="mt-3 text-xs font-medium text-slate-400">
            Arquivo selecionado: {selectedFile.name}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            <CheckCircle2 size={17} />
            {successMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b101b] p-5 xl:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
          Última importação
        </h2>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <StatCard
            label="Arquivo"
            value={status?.latestImport?.originalName ?? "Nenhum"}
            description="Última planilha processada."
          />

          <StatCard
            label="Data"
            value={formatDate(status?.latestImport?.importedAt)}
            description="Horário da última importação."
          />

          <StatCard
            label="Entradas"
            value={status?.latestImport?.entriesCount ?? 0}
            description="Quantidade lida na última importação."
          />

          <StatCard
            label="Saídas"
            value={status?.latestImport?.outputsCount ?? 0}
            description="Quantidade lida na última importação."
          />
        </div>
      </section>
    </div>
  );
}
