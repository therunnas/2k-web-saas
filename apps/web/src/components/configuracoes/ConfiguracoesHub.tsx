"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Grid3X3,
  Keyboard,
  Palette,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ConfigSectionId =
  | "geral"
  | "notificacoes"
  | "personalizacao"
  | "aplicativos"
  | "controle-dados"
  | "seguranca"
  | "conta"
  | "teclado";

type ConfigSection = {
  id: ConfigSectionId;
  label: string;
  icon: LucideIcon;
};

type ConfigRow = {
  title: string;
  description?: string;
  value?: string;
  actionLabel?: string;
  href?: string;
  enabled?: boolean;
};

const sections: ConfigSection[] = [
  { id: "geral", label: "Geral", icon: Settings2 },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "personalizacao", label: "Personalização", icon: Palette },
  { id: "aplicativos", label: "Aplicativos", icon: Grid3X3 },
  { id: "controle-dados", label: "Controle de dados", icon: Database },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck },
  { id: "conta", label: "Conta", icon: UserRound },
  { id: "teclado", label: "Teclado", icon: Keyboard },
];

const rowsBySection: Record<ConfigSectionId, ConfigRow[]> = {
  geral: [
    {
      title: "Aparência",
      description: "Visual padrão do painel administrativo.",
      value: "Escuro",
    },
    {
      title: "Workspace",
      description: "Ambiente privado usado pela operação da 2K Studios.",
      value: "2K Studios",
    },
    {
      title: "Ano fiscal",
      description: "Período usado nos dashboards e relatórios.",
      value: "2026",
    },
  ],
  notificacoes: [
    {
      title: "Alertas financeiros",
      description: "Avisos de vencimentos, recebíveis e pendências.",
      value: "Ativo",
      enabled: true,
    },
    {
      title: "Resumo operacional",
      description: "Indicadores rápidos da operação.",
      value: "Ativo",
      enabled: true,
    },
    {
      title: "Notificações externas",
      description: "Integrações futuras com e-mail, Discord ou webhooks.",
      value: "Em breve",
    },
  ],
  personalizacao: [
    {
      title: "Cor de destaque",
      description: "Destaque visual usado em botões, gráficos e estados ativos.",
      value: "Ciano",
    },
    {
      title: "Contraste",
      description: "Intensidade visual dos componentes.",
      value: "Aumentado",
    },
    {
      title: "Densidade",
      description: "Espaçamento dos componentes administrativos.",
      value: "Compacta",
    },
  ],
  aplicativos: [
    {
      title: "Vercel",
      description: "Hospedagem atual do painel.",
      value: "Conectado",
      enabled: true,
    },
    {
      title: "PostgreSQL / Neon",
      description: "Banco de dados usado pelo SaaS.",
      value: "Conectado",
      enabled: true,
    },
    {
      title: "Integrações externas",
      description: "APIs futuras de cobrança, automação e comunicação.",
      value: "Não configurado",
    },
  ],
  "controle-dados": [
    {
      title: "Importação de planilha",
      description: "Entrada principal de dados financeiros.",
      value: "Ativa",
      enabled: true,
    },
    {
      title: "Limpeza de planilha",
      description: "Permite limpar bases importadas quando necessário.",
      value: "Disponível",
    },
    {
      title: "RLS no banco",
      description: "Groundwork documentado. Ainda não ativado diretamente no PostgreSQL.",
      value: "Preparado",
    },
  ],
  seguranca: [
    {
      title: "CORS restrito",
      description: "Bloqueia origens não autorizadas chamando as APIs.",
      value: "Ativo",
      enabled: true,
    },
    {
      title: "Security Headers",
      description: "Headers de proteção aplicados em produção.",
      value: "Ativo",
      enabled: true,
    },
    {
      title: "Endpoints dev",
      description: "Rotas de desenvolvimento bloqueadas em produção.",
      value: "Bloqueado",
      enabled: true,
    },
  ],
  conta: [
    {
      title: "Perfil do administrador",
      description: "Edite nome de exibição e dados da conta.",
      actionLabel: "Abrir perfil",
      href: "/conta/perfil",
    },
    {
      title: "E-mail da conta",
      description: "Identificador principal usado no login.",
      value: "Bloqueado",
    },
    {
      title: "Sessão",
      description: "Cookie HTTP-only assinado para manter autenticação.",
      value: "Protegida",
      enabled: true,
    },
  ],
  teclado: [
    {
      title: "Busca rápida",
      description: "Atalho reservado para busca global futura.",
      value: "⌘K",
    },
    {
      title: "Navegação",
      description: "Atalhos rápidos entre módulos do painel.",
      value: "Em breve",
    },
    {
      title: "Acessibilidade",
      description: "Melhorias de foco e navegação por teclado.",
      value: "Planejado",
    },
  ],
};

function StatusPill({ enabled }: { enabled?: boolean }) {
  if (enabled === undefined) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
      <CheckCircle2 size={12} />
      Ativo
    </span>
  );
}

function ConfigRowItem({ row }: { row: ConfigRow }) {
  const content = (
    <>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-white">{row.title}</h3>
        {row.description ? (
          <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-slate-400/80">
            {row.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <StatusPill enabled={row.enabled} />

        {row.value ? (
          <span className="flex items-center gap-2 text-right text-[13px] font-semibold text-slate-100">
            {row.value}
            <ChevronDown size={14} className="text-slate-500" />
          </span>
        ) : null}

        {row.actionLabel ? (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-semibold text-white transition group-hover:border-cyan-300/30 group-hover:bg-cyan-300/10">
            {row.actionLabel}
            <ChevronRight size={14} />
          </span>
        ) : null}
      </div>
    </>
  );

  if (row.href) {
    return (
      <Link
        href={row.href}
        className="group flex items-center justify-between gap-5 border-b border-white/[0.07] px-1 py-5 last:border-b-0"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/[0.07] px-1 py-5 last:border-b-0">
      {content}
    </div>
  );
}

export function ConfiguracoesHub() {
  const router = useRouter();
  const [activeSectionId, setActiveSectionId] = useState<ConfigSectionId>("geral");

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  const rows = rowsBySection[activeSection.id];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[7px]">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => router.push("/dashboard")}
      />

      <section className="relative z-[81] grid max-h-[82vh] w-full max-w-[860px] grid-cols-[210px_1fr] overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#202124]/95 shadow-[0_30px_120px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04]">
        <aside className="border-r border-white/[0.07] bg-white/[0.025] p-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.06] text-slate-300 transition hover:bg-white/[0.10] hover:text-white"
            aria-label="Fechar configurações"
          >
            <X size={18} />
          </button>

          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={
                    active
                      ? "flex w-full items-center gap-3 rounded-[10px] bg-white/[0.08] px-3 py-2.5 text-left text-sm font-semibold text-white"
                      : "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  }
                >
                  <Icon size={17} className={active ? "text-cyan-200" : "text-slate-400"} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <article className="min-h-[560px] overflow-y-auto px-7 py-5">
          <header className="sticky top-0 z-10 border-b border-white/[0.09] bg-[#202124]/95 pb-5 backdrop-blur">
            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-white">
              {activeSection.label}
            </h1>
          </header>

          <div>
            {rows.map((row) => (
              <ConfigRowItem key={row.title} row={row} />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
