"use client";

// Category icon system: render a lucide icon from a stored name string, plus a
// searchable grid picker for the category form. Robust to unknown names
// (falls back to Gamepad2).

import { useEffect, useMemo, useRef, useState } from "react";
import * as Lucide from "lucide-react";
import { Gamepad2, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

/** Curated set offered in the picker (verified to exist in this lucide build). */
export const CATEGORY_ICON_NAMES = [
  "Gamepad2", "Joystick", "Swords", "Sword", "Shield", "Crosshair", "Target",
  "Puzzle", "Brain", "Blocks", "ToyBrick", "Dices", "Spade", "Club", "Diamond",
  "Trophy", "Medal", "Award", "Crown", "Flag",
  "Compass", "Mountain", "MapPin", "Tent", "TreePine", "Trees", "Waves", "Anchor",
  "PartyPopper", "Gift", "Sparkles", "Star", "Heart", "Smile", "Flame", "Zap",
  "Rocket", "Plane", "Ship", "Train", "Car", "Bike",
  "Music", "Drum", "Guitar", "Palette", "Wand2", "Wand",
  "Bot", "Ghost", "Skull", "Bomb", "Castle", "Globe", "Hexagon",
  "Cat", "Dog", "Bird", "Rabbit", "Baby", "Footprints",
  "Apple", "Pizza", "IceCream", "Candy", "Sun", "Moon", "Snowflake", "Dumbbell", "Volleyball",
].filter((v, i, a) => a.indexOf(v) === i);

/** Look up a lucide icon component by name. */
export function getIconCmp(name: string | undefined): IconCmp {
  if (name && name in Lucide) {
    const cmp = (Lucide as unknown as Record<string, IconCmp>)[name];
    if (cmp) return cmp;
  }
  return Gamepad2;
}

export function CategoryIcon({
  name,
  className,
}: {
  name: string | undefined;
  className?: string;
}) {
  const Cmp = getIconCmp(name);
  return <Cmp className={className} />;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onDoc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICON_NAMES;
    return CATEGORY_ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <CategoryIcon name={value} className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1 truncate font-medium">{value || "Choose icon"}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "absolute left-0 right-0 top-[calc(100%+6px)] z-40 origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 transition-all duration-150",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="border-b border-slate-100 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-700 placeholder-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>
        <div className="grid max-h-52 grid-cols-7 gap-1 overflow-y-auto p-2">
          {filtered.map((name) => {
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition",
                  active
                    ? "bg-violet-100 text-violet-700 ring-2 ring-violet-500/30"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                )}
              >
                <CategoryIcon name={name} className="h-[18px] w-[18px]" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-7 px-2 py-6 text-center text-xs text-slate-400">
              No icons match “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
