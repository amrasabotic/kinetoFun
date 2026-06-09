"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Clock } from "./Clock";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

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
            "flex h-14 items-center gap-4 rounded-full border px-4 transition-all duration-300",
            "border-white/[0.08]",
            scrolled
              ? "bg-[rgba(6,9,19,0.92)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-[22px]"
              : "bg-[rgba(10,15,25,0.72)] shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-[14px]",
          )}
        >
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
                    ? "bg-white/[0.08] text-white"
                    : "text-white/60 hover:text-white hover:[text-shadow:0_0_12px_rgba(34,229,111,0.5)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2">
            <Clock />

            <Link
              href="/settings"
              data-focusable
              aria-label="Settings"
              className={cn(
                "hidden items-center justify-center rounded-full p-2 text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white md:flex",
                isActive(pathname, "/settings") && "bg-white/[0.08] text-white",
              )}
            >
              <SettingsIcon />
            </Link>

            {isAuthenticated && user ? (
              <Link
                href="/profile"
                data-focusable
                className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 pr-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.08] focus:outline-none md:flex"
              >
                <Avatar user={user} size="sm" />
                <span className="hidden text-sm font-semibold text-white lg:block">
                  {user.displayName}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  data-focusable
                  className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:text-white focus:outline-none md:block"
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white focus:outline-none md:hidden"
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
          "bg-[rgba(8,12,22,0.97)] backdrop-blur-[24px]",
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
                  ? "bg-accent/10 text-accent"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/settings"
            data-focusable
            className={cn(
              "flex items-center gap-3 rounded-2xl px-5 py-3.5 text-base font-medium transition-all duration-200 focus:outline-none",
              isActive(pathname, "/settings")
                ? "bg-accent/10 text-accent"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white",
            )}
          >
            <SettingsIcon />
            Settings
          </Link>
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-4">
          {isAuthenticated && user ? (
            <Link
              href="/profile"
              data-focusable
              className="flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.05] hover:text-white focus:outline-none"
            >
              <Avatar user={user} size="sm" />
              <span>{user.displayName}</span>
            </Link>
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
