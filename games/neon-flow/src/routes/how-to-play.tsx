import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hand, MousePointer2, Star } from "lucide-react";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play · Neon Flow" },
      { name: "description", content: "Learn how to play Neon Flow: pinch to draw glowing paths, connect every color pair, fill the entire grid." },
      { property: "og:title", content: "How to Play Neon Flow" },
      { property: "og:description", content: "Pinch with your hand or click with your mouse to draw paths between matching neon dots." },
    ],
  }),
  component: HowTo,
});

function HowTo() {
  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/"><ArrowLeft className="size-4" /> Home</Link>
      </Button>

      <h1 className="text-4xl font-display font-black neon-glow-cyan">HOW TO PLAY</h1>
      <p className="mt-4 text-muted-foreground">
        Connect every pair of glowing dots with a single neon path. When you're done,
        every cell on the board must be filled — no empty squares allowed.
      </p>

      <ol className="mt-8 space-y-5">
        <Step n={1} title="Track your hand">
          <p>
            On the game screen, tap <span className="font-display text-[color:var(--neon-cyan)]">Use hand tracking</span> and
            allow camera access. A <span className="font-display">+</span> cursor will follow your index finger.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            No camera? Mouse and touch work too — click and drag instead of pinch.
          </p>
        </Step>
        <Step n={2} title="Pinch to grab a color">
          <p>
            Hover the cursor over a dot, then bring your thumb and index finger together.
            The path snaps to that color and follows your finger.
          </p>
        </Step>
        <Step n={3} title="Draw a path to its twin">
          <p>
            Move your hand cell by cell to draw a continuous line. Reach the matching dot to
            complete the connection. Back up to undo cells you don't want.
          </p>
        </Step>
        <Step n={4} title="Fill every square">
          <p>
            A level only finishes when every cell is covered by some path. Plan ahead so no
            cell gets stranded.
          </p>
        </Step>
        <Step n={5} title="Earn a star">
          <p className="flex items-center gap-2">
            <Star className="size-4 text-[color:var(--star)]" fill="currentColor" />
            Match the <b>minimum move count</b> shown on the HUD (one move = one pinch + release)
            to earn a glowing star for the level.
          </p>
        </Step>
      </ol>

      <div className="mt-10 panel p-5 flex items-center gap-4">
        <div className="flex gap-2">
          <Hand className="size-6 text-[color:var(--neon-cyan)]" />
          <MousePointer2 className="size-6 text-[color:var(--neon-pink)]" />
        </div>
        <p className="text-sm text-muted-foreground">
          Hand tracking runs locally in your browser using MediaPipe — your camera stream never
          leaves your device.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild variant="hero" size="lg">
          <Link to="/play">Start playing</Link>
        </Button>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="panel p-5 flex gap-4">
      <div className="text-2xl font-display font-black neon-glow-pink shrink-0 w-10 text-center">{n}</div>
      <div>
        <h3 className="font-display tracking-wider text-lg">{title}</h3>
        <div className="text-sm text-muted-foreground mt-1">{children}</div>
      </div>
    </li>
  );
}