"use client";

// Shared presentational primitives for the SuperAdmin area.
// A self-contained light "premium SaaS" design system: off-white canvas, white
// elevated cards, restrained violet accent, slate neutrals. Intentionally does
// NOT use the app's themeable tokens so the admin stays light + consistent.

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── KPI / Stat card ──────────────────────────────────────────────────────────

const TINTS = {
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
} as const;

export function StatCard({
  icon,
  label,
  value,
  hint,
  tint = "violet",
  live,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tint?: keyof typeof TINTS;
  live?: boolean;
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
            TINTS[tint],
          )}
        >
          {icon}
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
        {hint && <div className="mt-2 text-xs text-slate-400">{hint}</div>}
      </div>
    </Card>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  violet: "bg-violet-50 text-violet-700 ring-violet-600/10",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/10",
} as const;

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Initials avatar ──────────────────────────────────────────────────────────

const AVATAR_TINTS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function InitialsAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tint = AVATAR_TINTS[hash % AVATAR_TINTS.length];
  const sizeCls =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        tint,
        sizeCls,
      )}
    >
      {initials(name)}
    </span>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────

const BTN_VARIANTS = {
  primary:
    "bg-violet-600 text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 active:scale-[0.98]",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]",
  ghost: "text-slate-600 hover:bg-slate-100 active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.98]",
} as const;

export function AdminButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: keyof typeof BTN_VARIANTS;
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        BTN_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
      <p className="text-xs text-slate-400">
        {total} {total === 1 ? "result" : "results"} · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Select (styled native dropdown) ──────────────────────────────────────────

export function Select({
  value,
  onChange,
  options,
  icon,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          icon ? "pl-8" : "pl-3",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
    </div>
  );
}

// ── Search input ─────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
    </div>
  );
}

// ── View toggle (table / card) ───────────────────────────────────────────────

export function ViewToggle({
  view,
  onChange,
}: {
  view: "table" | "card";
  onChange: (v: "table" | "card") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
      {(["table", "card"] as const).map((v) => {
        const Icon = v === "table" ? List : LayoutGrid;
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            aria-label={`${v} view`}
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition",
              active
                ? "bg-violet-50 text-violet-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        checked ? "bg-violet-600" : "bg-slate-200",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Table skeleton ───────────────────────────────────────────────────────────

export function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="divide-y divide-slate-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-44" />
          </div>
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton key={j} className="hidden h-3 w-16 sm:block" />
          ))}
        </div>
      ))}
    </div>
  );
}
