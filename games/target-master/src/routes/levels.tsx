import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Adventure Map — Target Master" },
      {
        name: "description",
        content: "Choose a level on the Target Master adventure map.",
      },
    ],
  }),
  component: LevelsMap,
});

const LEVEL_COUNT = 10;

// Hand-placed positions so the map feels like a winding archery trail.
const POSITIONS: Array<{ x: number; y: number }> = [
  { x: 10, y: 82 },
  { x: 22, y: 68 },
  { x: 35, y: 78 },
  { x: 48, y: 60 },
  { x: 38, y: 42 },
  { x: 55, y: 30 },
  { x: 70, y: 42 },
  { x: 82, y: 30 },
  { x: 75, y: 60 },
  { x: 90, y: 78 },
];

function LevelsMap() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-block opacity-80 hover:opacity-100 mb-4">
          ← Back
        </Link>
        <h1 className="text-4xl md:text-6xl font-black text-shadow-bold">
          Adventure <span className="text-[color:var(--primary)]">Map</span>
        </h1>
        <p className="opacity-80 mt-2">
          Tap a level to start. Difficulty grows as you climb the trail.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto mt-6 aspect-[16/10] panel overflow-hidden">
        {/* Decorative background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 70% 10%, oklch(0.55 0.18 60 / 0.35), transparent 55%), radial-gradient(ellipse at 20% 90%, oklch(0.45 0.18 150 / 0.4), transparent 55%)",
          }}
        />

        {/* Trail line connecting levels */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <polyline
            fill="none"
            stroke="oklch(0.98 0.01 90 / 0.35)"
            strokeWidth="0.6"
            strokeDasharray="1.2 1.4"
            strokeLinecap="round"
            points={POSITIONS.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        </svg>

        {/* Level nodes */}
        {POSITIONS.map((p, i) => {
          const lvl = i + 1;
          return (
            <Link
              key={lvl}
              to="/play"
              search={{ mode: "levels" as const, level: lvl }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] font-black text-2xl md:text-3xl shadow-xl glow-primary group-hover:scale-110 transition-transform">
                {lvl}
                <div className="absolute -top-2 -right-2 text-xl">
                  {lvl >= 8 ? "🔥" : lvl >= 5 ? "⭐" : "🎯"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="max-w-5xl mx-auto mt-4 text-sm opacity-70 text-center">
        Levels 1–{LEVEL_COUNT} • Static targets → fast moving swarms
      </p>
    </div>
  );
}
