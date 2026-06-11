"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import { InitialsAvatar } from "./ui";
import type { AdminIdentity } from "./Sidebar";

const TITLES: Record<string, string> = {
  "/superadmin/dashboard": "Dashboard",
  "/superadmin/users": "Users",
  "/superadmin/games": "Games",
};

function titleFor(pathname: string): string {
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k));
  return key ? TITLES[key]! : "Admin";
}

/** Close `open` on outside click or Escape. */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onDoc);
    };
  }, [ref, open, onClose]);
}

export function Topbar({
  user,
  onOpenMobile,
}: {
  user: AdminIdentity;
  onOpenMobile: () => void;
}) {
  const pathname = usePathname();
  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-[#F8FAFC]/80 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title + breadcrumb */}
      <div className="min-w-0">
        <nav className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex">
          <span>Admin</span>
          <span>/</span>
          <span className="text-slate-600">{title}</span>
        </nav>
        <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search"
            placeholder="Search…"
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-12 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </div>

        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-[#F8FAFC]" />
      </button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-30 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-300/40 transition-all duration-150",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">You&apos;re all caught up</p>
          <p className="mt-0.5 text-xs text-slate-400">No new notifications.</p>
        </div>
      </div>
    </div>
  );
}

function ProfileMenu({ user }: { user: AdminIdentity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { logout } = useSession();
  useDismiss(ref, open, () => setOpen(false));

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  const items = [
    { label: "Profile", Icon: UserIcon, onClick: () => { setOpen(false); router.push("/profile"); } },
    { label: "Settings", Icon: Settings, onClick: () => { setOpen(false); router.push("/settings"); } },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <InitialsAvatar name={user.name} size="sm" />
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-30 w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-300/40 transition-all duration-150",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <div className="p-1.5">
          {items.map(({ label, Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
            >
              <Icon className="h-4 w-4 text-slate-400" />
              {label}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-100 p-1.5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
