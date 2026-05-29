"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Database,
  Keyboard,
  Loader2,
  Palette,
  Plug,
  Shield,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

type SettingsTab =
  | "geral"
  | "notificacoes"
  | "personalizacao"
  | "aplicativos"
  | "controle-dados"
  | "seguranca"
  | "conta"
  | "teclado";

type FeedbackState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const settingsTabs: Array<{
  id: SettingsTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "geral", label: "Geral", icon: <SlidersHorizontal size={15} /> },
  { id: "notificacoes", label: "Notificações", icon: <Bell size={15} /> },
  { id: "personalizacao", label: "Personalização", icon: <Palette size={15} /> },
  { id: "aplicativos", label: "Aplicativos", icon: <Plug size={15} /> },
  { id: "controle-dados", label: "Controle de dados", icon: <Database size={15} /> },
  { id: "seguranca", label: "Segurança", icon: <Shield size={15} /> },
  { id: "conta", label: "Conta", icon: <UserRound size={15} /> },
  { id: "teclado", label: "Teclado", icon: <Keyboard size={15} /> },
];

function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium data-[tone=danger]:border-rose-300/15 data-[tone=danger]:bg-rose-400/[0.07] data-[tone=danger]:text-rose-200 data-[tone=neutral]:border-white/[0.06] data-[tone=neutral]:bg-white/[0.025] data-[tone=neutral]:text-slate-400 data-[tone=success]:border-emerald-300/15 data-[tone=success]:bg-emerald-400/[0.07] data-[tone=success]:text-emerald-200 data-[tone=warning]:border-amber-300/15 data-[tone=warning]:bg-amber-400/[0.07] data-[tone=warning]:text-amber-200"
    >
      {tone === "success" ? <CheckCircle2 size={12} /> : null}
      {children}
    </span>
  );
}

function SettingRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-white/[0.055] py-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <h3 className="text-[13px] font-medium tracking-[-0.01em] text-slate-100">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-start gap-2 sm:justify-end">
        {action}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-tone={tone}
      className="inline-flex h-9 items-center gap-2 rounded-[10px] border px-3.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 data-[tone=default]:border-white/[0.07] data-[tone=default]:bg-white/[0.025] data-[tone=default]:text-slate-200 data-[tone=default]:hover:bg-white/[0.045] data-[tone=danger]:border-rose-300/15 data-[tone=danger]:bg-rose-400/[0.07] data-[tone=danger]:text-rose-100 data-[tone=danger]:hover:bg-rose-400/[0.12]"
    >
      {children}
    </button>
  );
}

export function ConfiguracoesHub() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("geral");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const busy = uploading || clearing;

  function closeModal() {
    router.push("/dashboard");
  }

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleSpreadsheetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validFile = /\.(xlsx|xls)$/i.test(file.name);

    if (!validFile) {
      setFeedback({
        tone: "error",
        message: "Envie uma planilha válida no formato .xlsx ou .xls.",
      });
      return;
    }

    setUploading(true);
    setFeedback({
      tone: "info",
      message: "Importando planilha financeira...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/workspace/spreadsheet/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const json = (await response.json().catch(() => null)) as {
        status?: string;
        message?: string;
        imported?: {
          entries?: number;
        };
      } | null;

      if (!response.ok || json?.status === "error") {
        throw new Error(json?.message ?? "Não foi possível importar a planilha.");
      }

      setFeedback({
        tone: "success",
        message:
          json?.imported?.entries && json.imported.entries > 0
            ? `Planilha importada com sucesso. ${json.imported.entries} lançamentos processados.`
            : "Planilha importada com sucesso.",
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao importar planilha.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleClearSpreadsheetData() {
    const confirmed = window.confirm(
      "Isso vai limpar todos os lançamentos financeiros importados e o histórico de importação deste workspace. Perfil, usuário e configurações serão mantidos. Deseja continuar?",
    );

    if (!confirmed) return;

    setClearing(true);
    setFeedback({
      tone: "info",
      message: "Limpando dados financeiros...",
    });

    try {
      const response = await fetch("/api/workspace/spreadsheet/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          confirm: "LIMPAR",
        }),
      });

      const json = (await response.json().catch(() => null)) as {
        status?: string;
        message?: string;
        deleted?: {
          entries?: number;
          imports?: number;
        };
      } | null;

      if (!response.ok || json?.status === "error") {
        throw new Error(json?.message ?? "Não foi possível limpar os dados.");
      }

      const entries = json?.deleted?.entries ?? 0;
      const imports = json?.deleted?.imports ?? 0;

      setFeedback({
        tone: "success",
        message: `Dados limpos com sucesso. ${entries} lançamentos e ${imports} importações removidos.`,
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao limpar dados.",
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/78 px-4 py-6 backdrop-blur-[5px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleSpreadsheetChange}
      />

      <div
        className="grid h-[min(760px,92vh)] w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#111318] text-slate-100 shadow-[0_24px_120px_rgba(0,0,0,0.55)] md:grid-cols-[220px_1fr]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <aside className="border-b border-white/[0.06] bg-[#0f1116] p-3 md:border-b-0 md:border-r md:border-white/[0.06]">
          <button
            type="button"
            onClick={closeModal}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.045] text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Fechar configurações"
          >
            <X size={18} />
          </button>

          <nav className="space-y-1">
            {settingsTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setFeedback(null);
                }}
                data-active={activeTab === item.id ? "true" : "false"}
                className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[13px] font-medium text-slate-300 transition hover:bg-white/[0.045] hover:text-white data-[active=true]:bg-white/[0.06] data-[active=true]:text-white"
              >
                <span className="text-slate-400">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 overflow-y-auto bg-[#111318] px-6 py-5 md:px-8">
          <header className="border-b border-white/[0.06] pb-4">
            <h1 className="text-[18px] font-semibold tracking-[-0.035em] text-white">
              {settingsTabs.find((item) => item.id === activeTab)?.label ?? "Configurações"}
            </h1>
          </header>

          {feedback ? (
            <div
              data-tone={feedback.tone}
              className="mt-4 rounded-[12px] border px-4 py-3 text-[13px] font-medium data-[tone=error]:border-rose-300/15 data-[tone=error]:bg-rose-400/[0.07] data-[tone=error]:text-rose-100 data-[tone=info]:border-white/[0.07] data-[tone=info]:bg-white/[0.035] data-[tone=info]:text-slate-300 data-[tone=success]:border-emerald-300/15 data-[tone=success]:bg-emerald-400/[0.07] data-[tone=success]:text-emerald-100"
            >
              {feedback.message}
            </div>
          ) : null}

          <section className="mt-1">
            {activeTab === "geral" ? (
              <>
                <SettingRow
                  title="Aparência"
                  description="Visual padrão do painel administrativo."
                  action={
                    <>
                      <span className="text-[12px] font-medium text-slate-200">Escuro</span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </>
                  }
                />

                <SettingRow
                  title="Workspace"
                  description="Ambiente privado usado pela operação da 2K Studios."
                  action={
                    <>
                      <span className="text-[12px] font-medium text-slate-200">2K Studios</span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </>
                  }
                />

                <SettingRow
                  title="Ano fiscal"
                  description="Período usado nos dashboards e relatórios."
                  action={
                    <>
                      <span className="text-[12px] font-medium text-slate-200">2026</span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </>
                  }
                />
              </>
            ) : null}

            {activeTab === "controle-dados" ? (
              <>
                <SettingRow
                  title="Importação de planilha"
                  description="Entrada principal de dados financeiros. Use a planilha oficial em .xlsx ou .xls."
                  action={
                    <>
                      <StatusBadge tone="success">Ativa</StatusBadge>
                      <ActionButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                      >
                        {uploading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UploadCloud size={14} />
                        )}
                        {uploading ? "Importando" : "Importar"}
                      </ActionButton>
                    </>
                  }
                />

                <SettingRow
                  title="Limpeza de planilha"
                  description="Zera lançamentos financeiros e histórico de importação do workspace."
                  action={
                    <ActionButton
                      tone="danger"
                      onClick={handleClearSpreadsheetData}
                      disabled={busy}
                    >
                      {clearing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {clearing ? "Limpando" : "Limpar dados"}
                    </ActionButton>
                  }
                />

                <SettingRow
                  title="RLS no banco"
                  description="Groundwork documentado. Ainda não ativado diretamente no PostgreSQL."
                  action={
                    <>
                      <StatusBadge tone="neutral">Preparado</StatusBadge>
                      <ChevronDown size={14} className="text-slate-500" />
                    </>
                  }
                />
              </>
            ) : null}

            {activeTab === "notificacoes" ? (
              <>
                <SettingRow
                  title="Alertas financeiros"
                  description="Notificações de vencimentos, atrasos e dados importados."
                  action={<StatusBadge tone="success">Ativo</StatusBadge>}
                />
                <SettingRow
                  title="Resumo operacional"
                  description="Preparado para alertas futuros no painel."
                  action={<StatusBadge tone="neutral">Preparado</StatusBadge>}
                />
              </>
            ) : null}

            {activeTab === "personalizacao" ? (
              <>
                <SettingRow
                  title="Tema visual"
                  description="Interface escura, clean e institucional."
                  action={<StatusBadge tone="success">Escuro</StatusBadge>}
                />
                <SettingRow
                  title="Tipografia"
                  description="Geist Sans para interface e Geist Mono para números."
                  action={<StatusBadge tone="success">Aplicada</StatusBadge>}
                />
              </>
            ) : null}

            {activeTab === "aplicativos" ? (
              <SettingRow
                title="Integrações"
                description="Área preparada para conexões futuras."
                action={<StatusBadge tone="neutral">Preparado</StatusBadge>}
              />
            ) : null}

            {activeTab === "seguranca" ? (
              <>
                <SettingRow
                  title="Sessão autenticada"
                  description="Acesso protegido por sessão real e cookie HTTP-only."
                  action={<StatusBadge tone="success">Ativo</StatusBadge>}
                />
                <SettingRow
                  title="Permissões"
                  description="Controles internos por workspace e usuário."
                  action={<StatusBadge tone="neutral">Preparado</StatusBadge>}
                />
              </>
            ) : null}

            {activeTab === "conta" ? (
              <SettingRow
                title="Perfil"
                description="Editar nome, usuário e avatar da conta."
                action={
                  <ActionButton onClick={() => router.push("/conta/perfil")}>
                    Abrir perfil
                  </ActionButton>
                }
              />
            ) : null}

            {activeTab === "teclado" ? (
              <>
                <SettingRow
                  title="ESC"
                  description="Fecha modais e áreas sobrepostas quando disponível."
                  action={<StatusBadge tone="success">Ativo</StatusBadge>}
                />
                <SettingRow
                  title="Ctrl + K"
                  description="Reservado para command palette futura."
                  action={<StatusBadge tone="neutral">Em breve</StatusBadge>}
                />
              </>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}