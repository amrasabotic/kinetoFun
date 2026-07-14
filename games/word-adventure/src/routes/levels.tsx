import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/levels";
import { getUnlocked } from "@/lib/progress";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Levels — Word Search Adventure" },
      { name: "description", content: "Pick a level — 20 stages from quick warm-ups to tough word hunts." },
    ],
  }),
  component: Levels,
});

function Levels() {
  const [unlocked, setUnlocked] = useState(1);
  useEffect(() => { setUnlocked(getUnlocked()); }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Home</Link>
        <span className="text-sm font-semibold text-muted-foreground">
          Progress: <span className="text-foreground">{Math.min(unlocked, 20)} / 20</span>
        </span>
      </div>

      <h1 className="mt-4 text-5xl font-black tracking-tight">Choose a level</h1>
      <p className="mt-2 text-muted-foreground">Beat a level to unlock the next.</p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {LEVELS.map((lvl) => {
          const locked = lvl.id > unlocked;
          const cls = locked
            ? "cursor-not-allowed opacity-50"
            : "hover:-translate-y-1 hover:shadow-xl";
          const inner = (
            <div className={`relative aspect-square rounded-2xl border-2 border-border bg-card p-4 text-left shadow-md transition ${cls}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level</div>
              <div className="font-display text-5xl font-black text-primary">{lvl.id}</div>
              <div className="absolute bottom-3 left-4 right-4">
                <div className="text-sm font-bold">{lvl.theme}</div>
                <div className="text-xs text-muted-foreground">{lvl.words.length} words · {lvl.size}×{lvl.size}</div>
              </div>
              {locked && (
                <div className="absolute right-3 top-3 rounded-full bg-muted p-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
          return locked ? (
            <div key={lvl.id}>{inner}</div>
          ) : (
            <Link key={lvl.id} to="/play/$level" params={{ level: String(lvl.id) }}>
              {inner}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
