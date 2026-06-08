"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function TopBar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-8 px-6 sm:px-10">
        <Link
          href="/"
          data-focusable
          className="flex items-center gap-2 rounded-lg text-2xl font-black tracking-tight text-white focus:outline-none"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-lg">
            K
          </span>
          Kineto<span className="text-accent">Fun</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-focusable
              className={cn(
                "rounded-lg px-4 py-2 text-base font-semibold transition focus:outline-none",
                isActive(pathname, item.href)
                  ? "bg-surface-2 text-white"
                  : "text-muted hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Clock />
          <Link
            href="/settings"
            data-focusable
            aria-label="Settings"
            className={cn(
              "grid h-11 w-11 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-white focus:outline-none",
              isActive(pathname, "/settings") && "bg-surface-2 text-white",
            )}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {isAuthenticated && user ? (
            <Link
              href="/profile"
              data-focusable
              className="flex items-center gap-3 rounded-full p-1 pr-3 transition hover:bg-surface-2 focus:outline-none"
            >
              <Avatar user={user} size="sm" />
              <span className="hidden text-sm font-semibold text-white sm:block">
                {user.displayName}
              </span>
            </Link>
          ) : (
            <ButtonLink href="/login" size="sm">
              Sign in
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
