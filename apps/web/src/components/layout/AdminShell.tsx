"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  BarChart3,
  CircleMinus,
  CirclePlus,
  CalendarClock,
  CalendarDays,
  Clapperboard,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";

type AdminShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    label: "Visão geral",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: BarChart3,
  },
  {
    label: "Entradas",
    href: "/entradas",
    icon: CirclePlus,
  },
  {
    label: "Saídas",
    href: "/saidas",
    icon: CircleMinus,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Grupos",
    href: "/grupos",
    icon: Network,
  },
  {
    label: "Vencimentos",
    href: "/vencimentos",
    icon: CalendarClock,
  },
  {
    label: "Despesas",
    href: "/despesas",
    icon: CreditCard,
  },
  {
    label: "Produções",
    href: "/producoes",
    icon: Clapperboard,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: FileText,
  },
  {
    label: "Metas",
    href: "/metas",
    icon: Target,
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span className="text-[30px] font-semibold tracking-[-0.08em]">
        <span className="text-violet-400">2</span>
        <span className="text-cyan-300">K</span>
      </span>

      <span className="text-[13px] font-semibold uppercase tracking-[0.32em] text-white">
        Studios
      </span>
    </Link>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-5 pt-7">
        <Brand />
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
        <p className="dashboard-label text-[10px] text-slate-500">
          Workspace
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white">
            2K
          </span>

          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-white">
              2K Studios
            </strong>
            <span className="text-xs font-medium text-slate-500">
              Painel privado
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white/[0.085] text-white shadow-[inset_3px_0_0_rgba(34,211,238,0.9)]"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"
              }`}
            >
              <Icon
                size={17}
                className={
                  active
                    ? "text-cyan-300"
                    : "text-slate-500 group-hover:text-slate-300"
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-semibold text-slate-400">Suporte</p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Atendimento rápido
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-300 text-xs font-semibold text-white">
              VM
            </span>

            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold">
                Vinicius Macaneiro
              </strong>
              <span className="text-xs font-medium text-slate-500">
                Administrador
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <main className="dashboard-ui min-h-screen bg-[#070b13] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/10 bg-[#070b13]/95 backdrop-blur-xl xl:block">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />

          <aside className="absolute inset-y-0 left-0 w-[ min(86vw,320px) ] border-r border-white/10 bg-[#070b13] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>

            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}

      <section className="min-h-screen xl:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b13]/80 px-4 py-4 backdrop-blur-xl sm:px-6 xl:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.06] hover:text-white xl:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>

              <div className="xl:hidden">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span className="text-[26px] font-semibold tracking-[-0.08em]">
                    <span className="text-violet-400">2</span>
                    <span className="text-cyan-300">K</span>
                  </span>
                  <span className="hidden text-[11px] font-semibold uppercase tracking-[0.28em] sm:block">
                    Studios
                  </span>
                </Link>
              </div>
            </div>

            <div className="hidden xl:block" />

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-medium text-slate-300 sm:flex">
                <CalendarDays size={15} />
                Ano fiscal 2026
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-slate-300 sm:px-4">
                01 Jan — 31 Dez 2026
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 xl:px-8">{children}</div>
      </section>
    </main>
  );
}