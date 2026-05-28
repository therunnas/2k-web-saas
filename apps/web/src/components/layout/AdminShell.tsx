"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CircleMinus,
  CirclePlus,
  Clapperboard,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Search,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";

type SessionUser = {
  name: string;
  email: string;
  role: "ADMIN";
};

type AdminShellProps = {
  children: ReactNode;
};

const navGroups = [
  {
    label: "Operação",
    items: [
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
    ],
  },
  {
    label: "Comercial",
    items: [
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
    ],
  },
  {
    label: "Estúdio",
    items: [
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
    ],
  },
  {
    label: "Inteligência",
    items: [
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
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name?: string | null) {
  if (!name) return "2K";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "2K";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(role?: string | null) {
  if (role === "ADMIN") return "Administrador";
  if (!role) return "Usuário";
  return role;
}

function SidebarContent({
  pathname,
  user,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  user: SessionUser | null;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#07080d] text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center"
        >
          <Image
            src="/assets/2k-studios-logo.png"
            alt="2K STUDIOS"
            width={168}
            height={48}
            priority
            className="h-auto w-[122px] opacity-95"
          />
        </Link>

        <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="dashboard-label text-[10px] text-slate-500">
              Workspace
            </p>

            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              Online
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">
              2K
            </span>

            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-white">
                2K Studios
              </strong>
              <span className="block truncate text-xs font-medium text-slate-500">
                Painel privado
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <div className="space-y-4">
          {navGroups.map((group) => (
            <section key={group.label}>
              <p className="dashboard-label mb-2 px-3 text-[10px] text-slate-600">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`group flex items-center gap-3 rounded-[12px] px-3 py-2 text-[13px] font-semibold transition ${
                        active
                          ? "border border-cyan-300/20 bg-cyan-300/10 text-white shadow-[inset_3px_0_0_rgba(34,211,238,0.9)]"
                          : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-100"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={
                          active
                            ? "text-cyan-300"
                            : "text-slate-600 group-hover:text-slate-300"
                        }
                      />

                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 rounded-[14px] border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
          <p className="text-xs font-semibold text-slate-300">Suporte</p>
          <p className="mt-1 text-xs text-slate-600">Atendimento rápido</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-white/[0.035] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/15 text-xs font-bold text-white">
              {getInitials(user?.name)}
            </span>

            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-white">
                {user?.name ?? "Carregando..."}
              </strong>

              <span className="block truncate text-xs font-medium text-slate-500">
                {user ? roleLabel(user.role) : "—"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/10 text-slate-400 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-200"
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
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const json = (await response.json()) as {
          authenticated: boolean;
          session: SessionUser | null;
        };

        if (cancelled) return;

        setUser(json.authenticated && json.session ? json.session : null);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    router.push("/login");
    router.refresh();
  }

  const sidebarUser = user === undefined ? null : user;

  return (
    <main className="dashboard-ui min-h-screen bg-[#07080d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_600px_at_18%_-10%,rgba(124,58,237,0.10),transparent_62%),radial-gradient(1000px_700px_at_100%_110%,rgba(34,211,238,0.07),transparent_62%)]" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-white/10 bg-[#07080d]/95 backdrop-blur-xl xl:block">
        <SidebarContent
          pathname={pathname}
          user={sidebarUser}
          onLogout={handleLogout}
        />
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />

          <aside className="absolute inset-y-0 left-0 w-[min(88vw,330px)] border-r border-white/10 bg-[#07080d] shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>

            <SidebarContent
              pathname={pathname}
              user={sidebarUser}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}

      <section className="relative min-h-screen xl:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080d]/82 px-4 py-2.5 backdrop-blur-xl sm:px-5 xl:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.06] hover:text-white xl:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>

              <div className="hidden min-w-0 items-center gap-2 text-xs font-medium text-slate-500 md:flex">
                <span>2K STUDIOS</span>
                <span className="text-slate-700">/</span>
                <span className="truncate text-slate-300">
                  {pathname === "/dashboard"
                    ? "Dashboard executivo"
                    : pathname.replace("/", "") || "Painel"}
                </span>
              </div>
            </div>

            <div className="hidden w-full max-w-[390px] items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-500 lg:flex">
              <Search size={15} />
              <span className="text-xs">Buscar lançamento, projeto...</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 sm:flex">
                <CalendarDays size={14} />
                Ano fiscal 2026
              </div>

              <div className="hidden rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 sm:block">
                01 Jan — 31 Dez 2026
              </div>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Notificações"
              >
                <Bell size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="relative px-4 py-4 sm:px-5 xl:px-6">{children}</div>
      </section>
    </main>
  );
}
