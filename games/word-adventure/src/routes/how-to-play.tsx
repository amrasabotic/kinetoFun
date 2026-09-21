import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, Pointer, Sparkles, Camera } from "lucide-react";

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
  { icon: Camera, title: "Enable your webcam", body: "Allow camera access so the game can see your hand." },
  { icon: Pointer, title: "Move the +", body: "Point your index finger. A + cursor follows your fingertip across the screen." },
  { icon: Hand, title: "Pinch to grab", body: "Touch your thumb to your index finger to start a selection. Release to drop it." },
  { icon: Sparkles, title: "Trace a word", body: "Drag from the first letter to the last — horizontal, vertical, or diagonal. ✓ = found. ✗ = try again." },
];

function HowTo() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="mt-4 text-5xl font-black tracking-tight">How to play</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Word Search Adventure uses your webcam to track your hand. No mouse, no touch — just your fingers.
      </p>

      <ol className="mt-10 space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <s.icon className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{i + 1}. {s.title}</h3>
              <p className="mt-1 text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex justify-center">
        <Link to="/levels" className="rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30">
          Choose a level
        </Link>
      </div>
    </main>
  );
}
