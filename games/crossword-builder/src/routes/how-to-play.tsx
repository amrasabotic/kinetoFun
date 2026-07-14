import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play — Crossword Builder" },
      { name: "description", content: "Learn the pinch-and-drag gesture controls for Crossword Builder." },
    ],
  }),
  component: HowToPlay,
});

function HowToPlay() {
  const steps = [
    { n: 1, title: "Enable your camera", body: "When the game starts, allow webcam access so MediaPipe can see your hand. You'll see a small live preview." },
    { n: 2, title: "Move the cursor", body: "Point your index finger at the screen. A glowing cursor follows your fingertip in real time." },
    { n: 3, title: "Pinch to grab", body: "Touch your thumb to your index finger to pinch. Pinch a letter tile from the bank on the right to pick it up." },
    { n: 4, title: "Drop into the grid", body: "Move the letter over an empty box and release the pinch. Correct words turn green and lock in." },
    { n: 5, title: "Undo mistakes", body: "Pinch a placed letter to lift it out, then release outside the crossword to discard it. Locked words can't be removed." },
    { n: 6, title: "Progress through 20 levels", body: "Each level unlocks the next. Words get longer and crosswords grow as you climb." },
  ];
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="mt-4 font-display text-6xl font-bold">How to Play</h1>
        <p className="mt-4 text-lg text-foreground/70">
          Crossword Builder is controlled with your hand. No mouse, no keyboard — just gestures.
        </p>

        <ol className="mt-10 space-y-5">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-5 rounded-3xl bg-card p-6 shadow-tile">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">
                {s.n}
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-1 text-foreground/70">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex justify-center gap-4">
          <Link to="/levels" className="rounded-3xl bg-primary px-10 py-4 font-display text-2xl font-bold text-primary-foreground shadow-pop">
            Start playing
          </Link>
        </div>
      </div>
    </main>
  );
}
