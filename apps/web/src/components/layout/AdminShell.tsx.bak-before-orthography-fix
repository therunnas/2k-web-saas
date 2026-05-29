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
  RefreshCw,
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
  username?: string | null;
  avatarDataUrl?: string | null;
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

function getSidebarSubLabel(user?: SessionUser | null) {
  if (user?.username) return `@${user.username}`;
  return user ? roleLabel(user.role) : "—";
}

function UserAvatar({ user }: { user: SessionUser | null }) {
  const className =
    "k-avatar h-[30px] w-[30px] overflow-hidden rounded-[9px] text-[11px] text-[var(--bg-0)]";

  if (user?.avatarDataUrl) {
    return (
      <span className={className}>
        <img
          src={user.avatarDataUrl}
          alt="Foto de perfil"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return <span className={className}>{getInitials(user?.name)}</span>;
}

function SidebarAvatar({ user }: { user: SessionUser | null }) {
  const className =
    "k-avatar h-[30px] w-[30px] overflow-hidden rounded-[9px] text-[11px] text-[var(--bg-0)]";

  if (user?.avatarDataUrl) {
    return (
      <span className={className}>
        <img
          src={user.avatarDataUrl}
          alt="Foto de perfil"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return <span className={className}>{getInitials(user?.name)}</span>;
}

function isPrimaryAdminEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return (
    normalized === "admin@2kstudios.com" ||
    normalized === "admin@2kstudio.com"
  );
}

function getSessionDisplayName(user?: SessionUser | null) {
  if (!user) return "Carregando...";
  return user.name?.trim() || "Administrador";
}

function getSessionInitials(user?: SessionUser | null) {
  if (!user) return "2K";
  return getInitials(user.name);
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  function handleAccountNavigate() {
    setAccountMenuOpen(false);
    onNavigate?.();
  }

  function handleAccountLogout() {
    setAccountMenuOpen(false);
    onLogout();
  }

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,oklch(0.14_0.012_270)_0%,oklch(0.125_0.01_270)_100%)] text-white">
      <div className="border-b border-[var(--line-soft)] px-[22px] pb-[18px] pt-6">
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
            className="h-[22px] w-auto opacity-[0.92]"
          />
        </Link>

      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        <div className="space-y-2">
          {navGroups.map((group) => (
            <section key={group.label}>
              <p className="dashboard-label px-3 pb-1 pt-[14px] text-[9px] tracking-[0.2em] text-[var(--fg-3)]">
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
                      className={`group relative flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[12.5px] transition ${
                        active
                          ? "bg-[linear-gradient(90deg,var(--cyan-soft),transparent_70%)] font-medium text-white before:absolute before:-left-2.5 before:bottom-[7px] before:top-[7px] before:w-0.5 before:rounded-sm before:bg-[var(--cyan)] before:shadow-[0_0_10px_var(--cyan)]"
                          : "text-[var(--fg-2)] hover:bg-[oklch(0.2_0.014_270_/_0.6)] hover:text-[var(--fg-1)]"
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

      <div className="relative border-t border-[var(--line-soft)] px-[14px] py-3">
        {accountMenuOpen ? (
          <div className="absolute bottom-[76px] left-[14px] right-[14px] z-50 rounded-[14px] border border-white/[0.10] bg-[#1f2025] p-2 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
            <Link
              href="/conta/perfil"
              onClick={handleAccountNavigate}
              className="flex items-center justify-between rounded-[10px] px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/[0.06]"
            >
              <span>Perfil</span>
              <span className="text-slate-500">›</span>
            </Link>

            <Link
              href="/configuracoes"
              onClick={handleAccountNavigate}
              className="flex items-center justify-between rounded-[10px] px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/[0.06]"
            >
              <span>Configurações</span>
              <span className="text-slate-500">›</span>
            </Link>

            <div className="my-1 h-px bg-white/[0.08]" />

            <button
              type="button"
              onClick={handleAccountLogout}
              className="flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-left text-sm font-medium text-slate-100 transition hover:bg-rose-400/10 hover:text-rose-200"
            >
              <span>Sair</span>
              <LogOut size={16} />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((current) => !current)}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/[0.04]"
            aria-expanded={accountMenuOpen}
            aria-label="Abrir menu da conta"
          >
            <SidebarAvatar user={user} />

            <span className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-white">
                {getSessionDisplayName(user)}
              </strong>

              <span className="block truncate text-xs font-medium text-slate-500">
                {getSidebarSubLabel(user)}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleAccountLogout}
            className="k-icon-button h-[30px] min-h-[30px] w-[30px] min-w-[30px] rounded-[8px] text-slate-400 hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-200"
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

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<Partial<SessionUser>>).detail;

      setUser((current) =>
        current
          ? {
              ...current,
              ...detail,
            }
          : current,
      );
    }

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, []);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<Partial<SessionUser>>).detail;

      setUser((current) =>
        current
          ? {
              ...current,
              ...detail,
            }
          : current,
      );
    }

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
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
    <main className="dashboard-ui min-h-screen bg-[var(--bg-0)] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_600px_at_8%_-10%,oklch(0.72_0.18_295_/_0.10),transparent_60%),radial-gradient(1100px_700px_at_95%_110%,oklch(0.82_0.13_200_/_0.08),transparent_60%)] before:absolute before:inset-0 before:bg-[linear-gradient(oklch(0.27_0.018_270_/_0.4)_1px,transparent_1px),linear-gradient(90deg,oklch(0.27_0.018_270_/_0.4)_1px,transparent_1px)] before:bg-[length:56px_56px] before:opacity-[0.35]" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--side-w)] border-r border-[var(--line-soft)] bg-[var(--bg-0)]/95 backdrop-blur-xl xl:block">
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

      <section className="relative min-h-screen xl:pl-[var(--side-w)]">
        <header className="sticky top-0 z-30 h-[var(--top-h)] border-b border-[var(--line-soft)] bg-[var(--bg-0)]/60 px-4 backdrop-blur-xl sm:px-5 xl:px-6">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.06] hover:text-white xl:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>

              <div className="hidden min-w-0 items-center gap-2 text-xs font-medium text-[var(--fg-3)] md:flex">
                <span className="truncate text-[var(--fg-1)]">
                  {pathname === "/dashboard"
                    ? "Visão geral"
                    : pathname.replace("/", "") || "Painel"}
                </span>
                <span className="opacity-50">·</span>
                <span>Ano fiscal 2026</span>
              </div>
            </div>

            <div className="hidden h-8 min-w-[280px] items-center gap-2.5 rounded-[9px] border border-[var(--line)] bg-[var(--bg-1)] px-3 text-[12px] text-[var(--fg-3)] lg:flex">
              <Search size={15} />
              <span className="text-xs">Buscar lançamento, projeto...</span>
              <kbd className="ml-auto rounded-[5px] border border-[var(--line)] bg-[var(--bg-0)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-2)]">
                ⌘K
              </kbd>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="k-icon-button"
                aria-label="Atualizar"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                className="k-icon-button relative"
                aria-label="Notificações"
              >
                <Bell size={16} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--pos)] shadow-[0_0_8px_var(--pos)]" />
              </button>
            </div>
          </div>
        </header>

        <div className="relative">{children}</div>
      </section>
    </main>
  );
}
