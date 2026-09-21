"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Gamepad2,
  ScrollText,
  ChevronLeft,
  Trophy,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InitialsAvatar } from "./ui";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/superadmin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/superadmin/users", label: "Users", Icon: Users },
  { href: "/superadmin/categories", label: "Categories", Icon: FolderTree },
  { href: "/superadmin/games", label: "Games", Icon: Gamepad2 },
  { href: "/superadmin/leaderboards", label: "Leaderboards", Icon: Trophy },
  { href: "/superadmin/subscriptions", label: "Subscriptions", Icon: CreditCard },
  { href: "/superadmin/settings", label: "Settings", Icon: Settings },
  { href: "/superadmin/audit-logs", label: "Audit Logs", Icon: ScrollText },
];

export interface AdminIdentity {
  name: string;
  email: string;
  role: string;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  user,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  user: AdminIdentity;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const isCollapsed = collapsed && !mobile;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-200/50 transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[76px]" : "w-64",
      )}
    >
      {/* Collapse toggle (desktop only) */}
      {!mobile && onToggleCollapse && (
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
          className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-violet-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ChevronLeft
            className={cn("h-3.5 w-3.5 transition-transform duration-300", isCollapsed && "rotate-180")}
          />
        </button>
      )}

      {/* Brand */}
      <div className={cn("flex items-center gap-3 px-1.5 py-2", isCollapsed && "justify-center")}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          <Image src="/logo.png" alt="KinetoFun" width={56} height={56} className="h-14 w-14 object-contain" />
        </span>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">KinetoFun</p>
            <p className="truncate text-[11px] font-medium text-slate-400">Admin Console</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {!isCollapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>
        )}
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-focusable
              onClick={onNavigate}
              title={isCollapsed ? label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                isCollapsed && "justify-center",
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-violet-600" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}

              {/* Tooltip in collapsed mode */}
              {isCollapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+12px)] z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div
        className={cn(
          "mt-2 flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5",
          isCollapsed && "justify-center border-transparent bg-transparent p-1.5",
        )}
      >
        <InitialsAvatar name={user.name} size="sm" />
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}
