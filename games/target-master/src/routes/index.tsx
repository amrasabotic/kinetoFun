import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Target Master — Hand-Tracked Archery Game" },
      {
        name: "description",
        content:
          "Aim with your hand and shoot targets in this MediaPipe hand-tracking archery game. Adventure & Endless modes.",
      },
      { property: "og:title", content: "Target Master — Hand-Tracked Archery" },
      {
        property: "og:description",
        content:
          "Use your webcam to draw the bow and shoot. Two modes, 10 levels, and endless target practice.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;800&family=Bungee&display=swap",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6">
      {/* Floating decorative targets */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <FloatingTarget className="absolute left-[6%] top-[18%] w-24" delay={0} />
        <FloatingTarget className="absolute right-[8%] top-[10%] w-32" delay={0.7} />
        <FloatingTarget className="absolute left-[12%] bottom-[14%] w-20" delay={1.3} />
        <FloatingTarget className="absolute right-[14%] bottom-[20%] w-28" delay={2} />
        <FloatingTarget className="absolute left-[45%] top-[6%] w-16" delay={1.6} />
      </div>

      <div className="relative z-10 text-center max-w-3xl">
        <div className="text-8xl mb-2 animate-bounce-slow">🏹</div>
        <h1
          className="text-6xl md:text-8xl font-black tracking-tight text-shadow-bold leading-none"
          style={{ fontFamily: "Bungee, Fredoka, sans-serif" }}
        >
          TARGET
          <br />
          <span className="bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--accent)] to-[color:var(--destructive)] bg-clip-text text-transparent">
            MASTER
          </span>
        </h1>
        <p className="mt-6 text-xl md:text-2xl opacity-90">
          Wave your hand. Draw the bow. Hit the bullseye.
        </p>
        <p className="mt-2 text-sm opacity-70">
          Powered by webcam hand tracking — no controller needed.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-xl mx-auto">
          <Link
            to="/levels"
            className="group panel p-6 hover:scale-105 transition-transform glow-primary text-left"
          >
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-2xl font-bold">Adventure</div>
            <div className="text-sm opacity-80 mt-1">
              10 levels of increasing challenge across the archery map.
            </div>
          </Link>
          <Link
            to="/play"
            search={{ mode: "endless" as const }}
            className="group panel p-6 hover:scale-105 transition-transform text-left"
            style={{
              boxShadow:
                "0 0 0 4px oklch(0.72 0.20 30 / 0.25), 0 12px 40px oklch(0.72 0.20 30 / 0.35)",
            }}
          >
            <div className="text-4xl mb-2">♾️</div>
            <div className="text-2xl font-bold">Endless</div>
            <div className="text-sm opacity-80 mt-1">
              Targets never stop. Survive as long as you can.
            </div>
          </Link>
        </div>

        <Link
          to="/how-to-play"
          className="mt-8 inline-block text-lg underline underline-offset-4 opacity-80 hover:opacity-100"
        >
          How to play →
        </Link>
      </div>
    </div>
  );
}

function FloatingTarget({ className, delay }: { className: string; delay: number }) {
  return (
    <div className={className} style={{ animation: `float-y 6s ease-in-out ${delay}s infinite` }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <circle cx="50" cy="50" r="48" fill="oklch(0.98 0.01 90)" />
        <circle cx="50" cy="50" r="38" fill="oklch(0.22 0.05 260)" />
        <circle cx="50" cy="50" r="28" fill="oklch(0.7 0.18 220)" />
        <circle cx="50" cy="50" r="18" fill="oklch(0.62 0.24 25)" />
        <circle cx="50" cy="50" r="9" fill="oklch(0.95 0.20 90)" />
      </svg>
    </div>
  );
}
