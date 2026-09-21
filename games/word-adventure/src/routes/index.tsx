import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Word Search Adventure — Hand-Tracked Word Puzzle Game" },
      {
        name: "description",
        content:
          "Find hidden words with a pinch of your fingers. A hand-tracked word search game with 20 levels of increasing challenge.",
      },
      { property: "og:title", content: "Word Search Adventure" },
      {
        property: "og:description",
        content: "A hand-tracked word search game powered by your webcam.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 size-72 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute bottom-10 right-10 size-96 rounded-full bg-secondary/50 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground shadow-sm">
          <span className="inline-block size-2 rounded-full bg-primary" />
          Hand-tracked word puzzle
        </span>
        <h1 className="text-balance text-6xl font-black leading-[0.95] tracking-tight md:text-8xl">
          Word Search<br />
          <span className="text-primary">Adventure</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground md:text-xl">
          Point with your finger. Pinch to grab. Trace hidden words across a sea of letters — no
          keyboard required.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/levels"
            className="rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition hover:translate-y-[-2px] hover:shadow-xl"
          >
            Play
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-2xl border-2 border-foreground/15 bg-card px-8 py-4 text-lg font-bold text-foreground transition hover:border-foreground/30"
          >
            How to play
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-sm text-muted-foreground md:gap-10">
          <div><div className="text-3xl font-black text-foreground">20</div>Levels</div>
          <div><div className="text-3xl font-black text-foreground">8</div>Directions</div>
          <div><div className="text-3xl font-black text-foreground">0</div>Clicks</div>
        </div>
      </div>
    </main>
  );
}
