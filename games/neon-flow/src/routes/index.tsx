import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Hand, Play, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neon Flow — Hand-Tracked Puzzle Game" },
      { name: "description", content: "Connect glowing pairs by drawing paths with your finger. 20 progressively challenging neon levels." },
      { property: "og:title", content: "Neon Flow" },
      { property: "og:description", content: "Pinch with your hand, draw glowing paths, fill the grid. 20 levels." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center gap-2 panel px-3 py-1 text-xs font-display tracking-[0.3em] text-[color:var(--neon-cyan)] mb-8">
          <Hand className="size-3" /> HAND-TRACKED PUZZLE
        </div>
        <h1 className="text-6xl md:text-8xl font-display font-black neon-glow-cyan leading-none">
          NEON
        </h1>
        <h1 className="text-6xl md:text-8xl font-display font-black neon-glow-pink leading-none mt-1">
          FLOW
        </h1>
        <p className="mt-8 text-lg text-muted-foreground">
          Pinch your fingers to grab a glowing dot. Draw a path to its twin. Fill every cell.
          Match the minimum moves to earn a star.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="hero" size="lg">
            <Link to="/play"><Play className="size-4" /> Play</Link>
          </Button>
          <Button asChild variant="neonOutline" size="lg">
            <Link to="/how-to-play"><BookOpen className="size-4" /> How to Play</Link>
          </Button>
        </div>
      </div>

      <footer className="absolute bottom-4 text-xs text-muted-foreground font-display tracking-widest">
        20 LEVELS · 4×4 → 7×7 · MEDIAPIPE HAND TRACKING
      </footer>
    </main>
  );
}
