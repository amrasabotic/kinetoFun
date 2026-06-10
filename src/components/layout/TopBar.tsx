"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Clock } from "./Clock";
import { User, Settings, ChevronDown } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({ user }: { user: NonNullable<ReturnType<typeof useSession>["user"]> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open]);

  const ITEMS = [
    { href: "/profile", label: "Profile", Icon: User },
    { href: "/settings", label: "Settings", Icon: Settings },
  ];

  return (
    <div ref={ref} className="relative hidden md:flex">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1 pr-3 text-sm font-semibold text-[#1A2E74] transition-all duration-200 hover:bg-[#1A2E74]/10 dark:text-white dark:hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1AACE0]/60"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden text-sm font-semibold text-[#1A2E74] dark:text-white lg:block">
          {user.displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[#1A2E74]/50 transition-transform duration-200 dark:text-white/40",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute right-0 top-full mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-white/[0.10] shadow-[0_12px_40px_rgba(26,46,116,0.22)]",
          "bg-white/90 backdrop-blur-xl dark:bg-[#0a1438]/95 dark:border-white/[0.08]",
          "transition-all duration-200",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {ITEMS.map(({ href, label, Icon }) => (
          <button
            key={href}
            type="button"
            onClick={() => { setOpen(false); router.push(href); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#1A2E74]/80 transition-colors duration-150 hover:bg-[#1AACE0]/10 hover:text-[#1A2E74] dark:text-white/65 dark:hover:bg-white/[0.07] dark:hover:text-white first:rounded-t-2xl last:rounded-b-2xl focus:outline-none focus-visible:bg-[#1AACE0]/10"
          >
            <Icon className="h-4 w-4 shrink-0 opacity-60" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* ─── Floating pill navbar ─────────────────────────────────── */}
      <header
        className={cn(
          "fixed left-0 right-0 top-4 z-50 mx-auto px-4 transition-all duration-300",
          "max-w-5xl",
        )}
      >
        <div
          className={cn(
            "relative flex h-14 items-center gap-4 rounded-full border px-4 backdrop-blur-xl transition-all duration-300",
            scrolled
              ? "border-white/20 bg-white/20 shadow-[0_8px_40px_rgba(26,46,116,0.25)] dark:bg-[#1A2E74]/40 dark:border-white/15"
              : "border-white/15 bg-white/15 shadow-[0_4px_24px_rgba(26,46,116,0.15)] dark:bg-[#1A2E74]/30 dark:border-white/10",
          )}
        >
          {/* Glass top highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20" />

          {/* Logo */}
          <Link
            href="/"
            data-focusable
            className="flex shrink-0 items-center rounded-full px-1 focus:outline-none"
          >
            <Image
              src="/logo.png"
              alt="KinetoFun"
              width={280}
              height={84}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav — centred in the remaining space */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-focusable
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none",
                  isActive(pathname, item.href)
                    ? "bg-[#1AACE0]/20 text-[#1A2E74] dark:bg-white/15 dark:text-white"
                    : "text-[#1A2E74]/70 hover:text-[#1A2E74] dark:text-white/65 dark:hover:text-white hover:[text-shadow:0_0_12px_rgba(26,172,224,0.6)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2">
            <Clock />

            {isAuthenticated && user ? (
              <ProfileDropdown user={user} />
            ) : (
              <>
                <Link
                  href="/login"
                  data-focusable
                  className="hidden rounded-full px-4 py-2 text-sm font-medium text-[#1A2E74]/70 transition-all duration-200 hover:text-[#1A2E74] dark:text-white/70 dark:hover:text-white focus:outline-none md:block"
                >
                  Log in
                </Link>
                <ButtonLink
                  href="/signup"
                  size="sm"
                  className="hidden rounded-full md:inline-flex"
                >
                  Get started
                </ButtonLink>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              data-focusable
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1A2E74]/20 bg-[#1A2E74]/08 text-[#1A2E74]/70 transition-all duration-200 hover:bg-[#1A2E74]/15 hover:text-[#1A2E74] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white focus:outline-none md:hidden"
            >
              {/* Animated bars → X */}
              <span className="relative flex h-4 w-4 flex-col items-center justify-between">
                <span
                  className={cn(
                    "block h-px w-full rounded-full bg-current transition-all duration-300 origin-center",
                    mobileOpen ? "translate-y-[7px] rotate-45" : "",
                  )}
                />
                <span
                  className={cn(
                    "block h-px rounded-full bg-current transition-all duration-300",
                    mobileOpen ? "w-0 opacity-0" : "w-full opacity-100",
                  )}
                />
                <span
                  className={cn(
                    "block h-px w-full rounded-full bg-current transition-all duration-300 origin-center",
                    mobileOpen ? "-translate-y-[7px] -rotate-45" : "",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile full-screen menu ──────────────────────────────── */}
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 transition-all duration-500 md:hidden",
          mobileOpen
            ? "bg-black/60 backdrop-blur-md pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      {/* Slide-in panel */}
      <div
        className={cn(
          "fixed inset-x-4 top-20 z-40 overflow-hidden rounded-3xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
          "bg-[rgba(10,26,80,0.98)] backdrop-blur-[24px]",
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col px-4 py-6 gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-focusable
              className={cn(
                "flex items-center rounded-2xl px-5 py-3.5 text-base font-medium transition-all duration-200 focus:outline-none",
                isActive(pathname, item.href)
                  ? "bg-[#1AACE0]/20 text-[#1AACE0]"
                  : "text-white/70 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-4">
          {isAuthenticated && user ? (
            <div className="flex flex-col gap-1">
              {/* Profile header row */}
              <div className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-white">
                <Avatar user={user} size="sm" />
                <span>{user.displayName}</span>
              </div>
              {/* Profile link */}
              <Link
                href="/profile"
                data-focusable
                className="flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white focus:outline-none"
              >
                <User className="h-4 w-4 opacity-60" />
                Profile
              </Link>
              {/* Settings link */}
              <Link
                href="/settings"
                data-focusable
                className="flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white focus:outline-none"
              >
                <Settings className="h-4 w-4 opacity-60" />
                Settings
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                data-focusable
                className="flex items-center justify-center rounded-2xl border border-white/[0.08] px-5 py-3 text-sm font-semibold text-white/80 transition-all duration-200 hover:bg-white/[0.05] hover:text-white focus:outline-none"
              >
                Log in
              </Link>
              <ButtonLink href="/signup" fullWidth className="rounded-2xl">
                Get started
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {/* ─── Spacer so page content starts below the floating bar ─── */}
      <div className="h-[calc(3.5rem+1rem)]" aria-hidden />
    </>
  );
}
