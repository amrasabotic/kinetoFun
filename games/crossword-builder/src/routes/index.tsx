import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crossword Builder — Gesture Word Puzzle" },
      { name: "description", content: "Solve 20 colorful crossword puzzles using just your hands. Pinch to grab letters, drag with your finger." },
      { property: "og:title", content: "Crossword Builder" },
      { property: "og:description", content: "Hand-tracked crossword puzzles powered by MediaPipe." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Clouds />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
        >
          <p className="font-display text-lg font-semibold uppercase tracking-[0.3em] text-secondary-foreground/70">
            Pinch · Drag · Spell
          </p>
          <h1 className="mt-3 font-display text-7xl font-bold leading-none text-foreground sm:text-8xl md:text-[9rem]">
            <span
              className="inline-block bg-clip-text text-transparent drop-shadow-sm"
              style={{ backgroundImage: "var(--gradient-sunset)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Crossword
            </span>
            <br />
            <span className="inline-block text-foreground">Builder</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-lg text-foreground/70">
            A hand-tracked word puzzle. Use your camera to grab letters out of the air and
            drop them into the grid. Twenty levels, getting trickier as you go.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            to="/levels"
            className="rounded-3xl bg-primary px-12 py-5 font-display text-3xl font-bold text-primary-foreground shadow-pop transition-transform hover:-translate-y-1 active:translate-y-0"
          >
            ▶ Play
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-3xl bg-card px-10 py-5 font-display text-2xl font-bold text-foreground shadow-tile transition-transform hover:-translate-y-1"
          >
            How to Play
          </Link>
        </motion.div>

        <p className="mt-16 text-xs uppercase tracking-widest text-muted-foreground">
          Allow camera access to track your hand. Works best in a well-lit room.
        </p>
      </div>
    </main>
  );
}

function Clouds() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {[
        { top: "10%", left: "8%", size: 180, dur: 28 },
        { top: "60%", left: "75%", size: 220, dur: 35 },
        { top: "30%", left: "82%", size: 140, dur: 22 },
        { top: "75%", left: "12%", size: 160, dur: 30 },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/70 blur-xl"
          style={{ top: c.top, left: c.left, width: c.size, height: c.size * 0.55 }}
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
