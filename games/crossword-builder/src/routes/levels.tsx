import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/levels";
import { getCompleted } from "@/lib/progress";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Level Map — Crossword Builder" },
      { name: "description", content: "Pick a level to play. Twenty hand-tracked crossword puzzles, from beginner to champion." },
    ],
  }),
  component: LevelMap,
});

function LevelMap() {
  const [completed, setCompleted] = useState<number[]>([]);
  useEffect(() => { setCompleted(getCompleted()); }, []);
  const completedSet = new Set(completed);
  const highest = completed.length ? Math.max(...completed) : 0;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">← Menu</Link>
          <p className="font-display text-sm text-muted-foreground">{completed.length} / 20 complete</p>
        </div>
        <h1 className="mt-4 font-display text-6xl font-bold">Choose a level</h1>
        <p className="mt-2 text-foreground/70">Clear a level to unlock the next.</p>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {LEVELS.map((lvl) => {
            const unlocked = lvl.id === 1 || completedSet.has(lvl.id - 1) || lvl.id <= highest + 1;
            const done = completedSet.has(lvl.id);
            return (
              <LevelTile key={lvl.id} id={lvl.id} name={lvl.name} unlocked={unlocked} done={done} />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function LevelTile({ id, name, unlocked, done }: { id: number; name: string; unlocked: boolean; done: boolean }) {
  const base = "group relative flex aspect-square flex-col items-center justify-center rounded-3xl p-3 text-center font-display transition-transform";
  if (!unlocked) {
    return (
      <div className={`${base} bg-muted/60 text-muted-foreground/50`}>
        <span className="text-4xl">🔒</span>
        <span className="mt-1 text-xs uppercase">Locked</span>
      </div>
    );
  }
  return (
    <Link
      to="/play/$level"
      params={{ level: String(id) }}
      className={`${base} shadow-pop hover:-translate-y-1 ${done ? "bg-success text-success-foreground" : "bg-card text-foreground"}`}
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Level</span>
      <span className="text-5xl font-bold leading-none">{id}</span>
      <span className="mt-2 text-sm font-semibold">{name}</span>
      {done && <span className="absolute right-2 top-2 text-xl">⭐</span>}
    </Link>
  );
}
