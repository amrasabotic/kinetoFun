import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play — Target Master" },
      {
        name: "description",
        content:
          "Learn how to aim, draw, and release your bow with hand tracking in Target Master.",
      },
      { property: "og:title", content: "How to Play — Target Master" },
      {
        property: "og:description",
        content: "A quick guide to bowmanship using only your hand and webcam.",
      },
    ],
  }),
  component: HowToPlay,
});

const steps = [
  {
    icon: "📷",
    title: "Allow your camera",
    body: "Target Master needs your webcam to see your hand. Tracking runs entirely in your browser — nothing is uploaded.",
  },
  {
    icon: "✋",
    title: "Aim with an open hand",
    body: "Hold one hand up, palm facing the camera. The bow follows your hand.",
  },
  {
    icon: "✊",
    title: "Close your fist to draw",
    body: "Make a fist to pull the bowstring. The longer you hold, the more powerful your shot.",
  },
  {
    icon: "🎯",
    title: "Open to release",
    body: "Open your hand to fly the arrow. Aim for the gold center for the most points.",
  },
];

function HowToPlay() {
  return (
    <div className="relative min-h-screen w-full overflow-auto p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-block opacity-80 hover:opacity-100 mb-6">
          ← Back
        </Link>
        <h1 className="text-5xl md:text-6xl font-black text-shadow-bold mb-2">
          How to <span className="text-[color:var(--primary)]">Play</span>
        </h1>
        <p className="opacity-80 text-lg">Four simple steps to master the bow.</p>

        <div className="grid gap-4 mt-8 sm:grid-cols-2">
          {steps.map((s, i) => (
            <div key={i} className="panel p-6">
              <div className="text-5xl mb-3">{s.icon}</div>
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">
                Step {i + 1}
              </div>
              <h2 className="text-2xl font-bold">{s.title}</h2>
              <p className="opacity-85 mt-2">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="panel p-6 mt-6">
          <h2 className="text-2xl font-bold mb-3">💡 Tips</h2>
          <ul className="space-y-2 opacity-90 list-disc pl-6">
            <li>Stand back about an arm's length from the camera with good lighting.</li>
            <li>Keep your hand inside the frame — moving offscreen breaks tracking.</li>
            <li>Snappy fist → release gives a fast shot; long draws hit harder.</li>
            <li>In Adventure, clear each level's target goal to unlock the next.</li>
            <li>In Endless, targets keep coming faster — see how long you can keep up.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            to="/levels"
            className="rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] px-8 py-4 text-xl font-bold glow-primary hover:scale-105 transition-transform"
          >
            🗺️ Adventure
          </Link>
          <Link
            to="/play"
            search={{ mode: "endless" as const }}
            className="rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)] px-8 py-4 text-xl font-bold hover:scale-105 transition-transform"
          >
            ♾️ Endless
          </Link>
        </div>
      </div>
    </div>
  );
}
