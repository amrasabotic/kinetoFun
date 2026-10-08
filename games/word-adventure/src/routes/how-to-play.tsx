import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, Pointer, Sparkles, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play — Word Search Adventure" },
      { name: "description", content: "Learn to play Word Search Adventure with hand tracking and pinch gestures." },
    ],
  }),
  component: HowTo,
});

const steps = [
  { icon: Pointer, title: "Point", body: "Hold up your index finger. A + cursor follows your fingertip across the letters." },
  { icon: Hand, title: "Pinch on the first letter", body: "Touch your thumb to your index finger over the first letter of a word." },
  { icon: Sparkles, title: "Slide and let go", body: "Keep pinching, slide to the last letter, then open your fingers. Words run across, down or diagonally." },
  { icon: MousePointerClick, title: "Press buttons", body: "Hold your fingertip over a button until the ring fills. Find every word to unlock the next level." },
];

function HowTo() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-8 text-center">
      <h1 className="text-5xl font-black tracking-tight md:text-6xl">
        How to <span className="text-primary">play</span>
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">Find the hidden words using only your hand.</p>

      <ol className="mt-8 grid w-full gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <s.icon className="size-7" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Step {i + 1}</div>
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mt-1 text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/" className="rounded-2xl bg-primary px-10 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30">
          Let's Play
        </Link>
        <Link to="/levels" className="rounded-2xl border-2 border-foreground/15 bg-card px-8 py-4 text-lg font-bold text-foreground">
          Choose a level
        </Link>
      </div>
    </main>
  );
}
