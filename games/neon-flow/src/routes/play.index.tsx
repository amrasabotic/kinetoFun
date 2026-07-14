import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEVELS, minMovesFor } from "@/lib/levels";
import { loadProgress, resetProgress, type Progress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Star, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Level Map · Neon Flow" },
      { name: "description", content: "Pick a level. 20 neon puzzles from 4×4 to 7×7. Earn stars by matching the minimum moves." },
      { property: "og:title", content: "Neon Flow — Level Map" },
      { property: "og:description", content: "20 puzzles, increasingly challenging. Earn a star on each by hitting the minimum moves." },
    ],
  }),
  component: PlayMap,
});

function PlayMap() {
  const [progress, setProgress] = useState<Progress>({ records: {}, highestUnlocked: 1 });
  useEffect(() => setProgress(loadProgress()), []);

  const totalStars = Object.values(progress.records).filter((r) => r.star).length;

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="size-4" /> Home</Link>
        </Button>
        <h1 className="text-2xl font-display neon-glow-cyan">LEVEL MAP</h1>
        <div className="flex items-center gap-2 panel px-3 py-1 text-sm">
          <Star className="size-4 text-[color:var(--star)]" fill="currentColor" />
          <span className="font-display font-bold">{totalStars}</span>
          <span className="text-muted-foreground">/ {LEVELS.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
        {LEVELS.map((lvl) => {
          const record = progress.records[lvl.id];
          const unlocked = lvl.id <= progress.highestUnlocked;
          const star = !!record?.star;
          const completed = !!record;
          return (
            <LevelTile
              key={lvl.id}
              id={lvl.id}
              size={lvl.size}
              colors={lvl.pairs.length}
              minMoves={minMovesFor(lvl)}
              bestMoves={record?.bestMoves}
              unlocked={unlocked}
              completed={completed}
              star={star}
            />
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("Reset all progress and best scores?")) {
              resetProgress();
              setProgress({ records: {}, highestUnlocked: 1 });
            }
          }}
        >
          <RotateCcw className="size-4" /> Reset progress
        </Button>
      </div>
    </main>
  );
}

function LevelTile({
  id, size, colors, minMoves, bestMoves, unlocked, completed, star,
}: {
  id: number; size: number; colors: number; minMoves: number;
  bestMoves?: number; unlocked: boolean; completed: boolean; star: boolean;
}) {
  const base =
    "panel relative aspect-square flex flex-col items-center justify-center p-2 transition-transform hover:scale-[1.04]";
  if (!unlocked) {
    return (
      <div className={`${base} opacity-40 cursor-not-allowed`}>
        <Lock className="size-6 text-muted-foreground" />
        <div className="text-xs font-display mt-2 text-muted-foreground">{id}</div>
      </div>
    );
  }
  const starClass = star ? "neon-box-star" : completed ? "neon-box-cyan" : "";
  const bg = star
    ? "linear-gradient(160deg, color-mix(in oklab, var(--star) 60%, transparent), color-mix(in oklab, var(--neon-orange) 50%, transparent))"
    : undefined;
  return (
    <Link
      to="/play/$level"
      params={{ level: String(id) }}
      className={`${base} ${starClass}`}
      style={bg ? { background: bg } : undefined}
    >
      <div
        className={`font-display font-black text-3xl ${
          star ? "text-[color:var(--primary-foreground)]" : completed ? "neon-glow-cyan" : ""
        }`}
      >
        {id}
      </div>
      {star ? (
        <Star className="size-7 mt-1 text-[color:var(--star)] animate-star" fill="currentColor" />
      ) : completed ? (
        <div className="text-[10px] mt-1 font-display tracking-widest text-muted-foreground">
          {bestMoves} / {minMoves}
        </div>
      ) : (
        <div className="text-[10px] mt-1 font-display tracking-widest text-muted-foreground">
          {size}×{size} · {colors}c
        </div>
      )}
    </Link>
  );
}