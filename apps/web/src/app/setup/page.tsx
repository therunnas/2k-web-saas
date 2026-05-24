"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Disc3,
  FileSpreadsheet,
  Loader2,
  RadioTower,
} from "lucide-react";

type WorkspaceCurrentResponse = {
  status: string;
  authenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  workspace?: {
    id: string;
    name: string;
    slug: string;
    setupCompleted: boolean;
  };
  settings?: {
    companyConfigured: boolean;
    discordConfigured: boolean;
    defaultChannelConfigured: boolean;
    spreadsheetConfigured: boolean;
    setupCompleted: boolean;
  } | null;
  discordConnection?: {
    guildName: string | null;
    defaultChannelName: string | null;
  } | null;
  imports?: Array<{
    id: string;
    originalName: string;
    entriesCount: number;
    importedAt: string;
  }>;
  setup?: {
    completedSteps: number;
    totalSteps: number;
    companyConfigured: boolean;
    discordConfigured: boolean;
    defaultChannelConfigured: boolean;
    spreadsheetConfigured: boolean;
    setupCompleted: boolean;
  };
  message?: string;
};

type ApiResponse = {
  status: string;
  message?: string;
  summary?: {
    fileName: string;
    sheets: number;
    rows: number;
  };
};

const stepIcons = {
  company: Building2,
  discord: Disc3,
  channel: RadioTower,
  spreadsheet: FileSpreadsheet,
};

export default function SetupPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [data, setData] = useState<WorkspaceCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [connectingDiscord, setConnectingDiscord] = useState(false);
  const [uploadingSpreadsheet, setUploadingSpreadsheet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("2K Studios");
  const [responsibleName, setResponsibleName] = useState("Vinicius Macaneiro");

  async function loadWorkspace() {
    setLoading(true);

    try {
      const response = await fetch("/api/workspace/current", {
        cache: "no-store",
      });

      const json = (await response.json()) as WorkspaceCurrentResponse;

      setData(json);

      if (json.workspace?.name) {
        setCompanyName(json.workspace.name);
      }

      if (json.user?.name) {
        setResponsibleName(json.user.name);
      }
    } catch {
      setData({
        status: "error",
        authenticated: false,
        message: "Não foi possível carregar o setup.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingCompany(true);
    setMessage(null);

    try {
      const response = await fetch("/api/workspace/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          responsibleName,
        }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setMessage(json.message ?? "Erro ao salvar empresa.");
        return;
      }

      setMessage("Empresa configurada com sucesso.");
      await loadWorkspace();
    } catch {
      setMessage("Erro ao conectar com o servidor.");
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleDiscordConnect() {
    setConnectingDiscord(true);
    setMessage(null);

    try {
      const response = await fetch("/api/workspace/discord/dev-connect", {
        method: "POST",
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setMessage(json.message ?? "Erro ao conectar Discord.");
        return;
      }

      setMessage("Discord conectado em modo desenvolvimento.");
      await loadWorkspace();
    } catch {
      setMessage("Erro ao conectar com o servidor.");
    } finally {
      setConnectingDiscord(false);
    }
  }

  function handleSpreadsheetButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleSpreadsheetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingSpreadsheet(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/workspace/spreadsheet/upload", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setMessage(json.message ?? "Erro ao importar planilha.");
        return;
      }

      const summary = json.summary;

      setMessage(
        summary
          ? `Planilha importada com sucesso. Arquivo: ${summary.fileName}. Abas: ${summary.sheets}. Linhas: ${summary.rows}.`
          : "Planilha importada com sucesso."
      );

      await loadWorkspace();
    } catch {
      setMessage("Erro ao enviar a planilha para o servidor.");
    } finally {
      setUploadingSpreadsheet(false);
      event.target.value = "";
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const steps = useMemo(() => {
    const setup = data?.setup;

    return [
      {
        key: "company",
        title: "Empresa",
        description: "Dados principais da operação.",
        done: Boolean(setup?.companyConfigured),
        icon: stepIcons.company,
      },
      {
        key: "discord",
        title: "Discord",
        description: "Servidor conectado via OAuth2.",
        done: Boolean(setup?.discordConfigured),
        icon: stepIcons.discord,
      },
      {
        key: "channel",
        title: "Canal padrão",
        description: "Canal principal para alertas e mensagens.",
        done: Boolean(setup?.defaultChannelConfigured),
        icon: stepIcons.channel,
      },
      {
        key: "spreadsheet",
        title: "Planilha",
        description: "Primeira importação financeira concluída.",
        done: Boolean(setup?.spreadsheetConfigured),
        icon: stepIcons.spreadsheet,
      },
    ];
  }, [data]);

  const completedSteps = data?.setup?.completedSteps ?? 0;
  const totalSteps = data?.setup?.totalSteps ?? 4;
  const setupCompleted = Boolean(data?.setup?.setupCompleted);
  const lastImport = data?.imports?.[0];

  return (
    <main className="min-h-screen bg-[#050913] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-black text-white shadow-[0_0_30px_rgba(124,58,237,0.45)]">
              2K
            </div>

            <div>
              <strong className="block text-sm font-black">2K Studios</strong>
              <span className="block text-xs text-slate-400">
                Setup inicial
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadWorkspace}
            className="rounded-full border border-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10"
          >
            Atualizar status
          </button>
        </div>

        <div className="rounded-[2rem] border border-violet-500/40 bg-white/[0.035] p-8 shadow-[0_0_60px_rgba(124,58,237,0.22)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
                Primeiro acesso
              </p>

              <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em]">
                Configure o ambiente inicial da operação.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
                Esta tela lê e atualiza dados reais do PostgreSQL Neon usando a
                sessão autenticada do admin.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#090817] p-5 lg:min-w-72">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Status do setup
              </p>

              {loading ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                  <Loader2 className="animate-spin" size={18} />
                  Carregando...
                </div>
              ) : (
                <>
                  <strong className="mt-3 block text-3xl font-black">
                    {completedSteps}/{totalSteps}
                  </strong>

                  <p className="mt-2 text-sm text-slate-400">
                    {setupCompleted
                      ? "Setup completo. Dashboard liberado."
                      : "Setup incompleto. Complete as etapas pendentes."}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-300">
                    <strong className="block text-white">
                      {data?.workspace?.name ?? "Workspace não encontrado"}
                    </strong>
                    <span>{data?.user?.email ?? "Usuário não carregado"}</span>

                    {data?.discordConnection?.guildName ? (
                      <span className="mt-2 block">
                        Discord: {data.discordConnection.guildName}
                      </span>
                    ) : null}

                    {data?.discordConnection?.defaultChannelName ? (
                      <span className="block">
                        Canal: {data.discordConnection.defaultChannelName}
                      </span>
                    ) : null}

                    {lastImport ? (
                      <span className="mt-2 block">
                        Última planilha: {lastImport.originalName} —{" "}
                        {lastImport.entriesCount} linhas
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`rounded-3xl border p-6 ${
                    step.done
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-white/10 bg-[#090817]"
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500 text-sm font-black">
                      {index + 1}
                    </div>

                    {step.done ? (
                      <CheckCircle2 className="text-emerald-300" size={22} />
                    ) : (
                      <CircleAlert className="text-orange-300" size={22} />
                    )}
                  </div>

                  <Icon className="mb-4 text-cyan-200" size={24} />

                  <h2 className="text-xl font-black">{step.title}</h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {step.description}
                  </p>

                  <span
                    className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      step.done
                        ? "bg-emerald-300/15 text-emerald-200"
                        : "bg-orange-300/15 text-orange-200"
                    }`}
                  >
                    {step.done ? "Concluído" : "Pendente"}
                  </span>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleCompanySubmit}
            className="mt-8 rounded-3xl border border-white/10 bg-[#090817] p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              Etapa 1
            </p>

            <h2 className="mt-2 text-2xl font-black">Configurar empresa</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Estes dados são salvos no banco real e atualizam o status da etapa
              Empresa.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Nome da empresa
                </span>

                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="2K Studios"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Responsável
                </span>

                <input
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                  placeholder="Vinicius Macaneiro"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleSpreadsheetChange}
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={savingCompany}
                className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-300 px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingCompany ? "Salvando..." : "Salvar empresa"}
              </button>

              <button
                type="button"
                onClick={handleDiscordConnect}
                disabled={connectingDiscord}
                className="rounded-full border border-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectingDiscord ? "Conectando..." : "Conectar Discord"}
              </button>

              <button
                type="button"
                onClick={handleSpreadsheetButtonClick}
                disabled={uploadingSpreadsheet}
                className="rounded-full border border-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingSpreadsheet ? "Importando..." : "Importar planilha"}
              </button>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
                {message}
              </div>
            ) : null}
          </form>

          <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-xs leading-6 text-cyan-100">
            <strong className="block text-white">
              Setup conectado ao banco real.
            </strong>
            A planilha agora é enviada pelo navegador, lida no backend e
            registrada no PostgreSQL Neon.
          </div>
        </div>
      </section>
    </main>
  );
}