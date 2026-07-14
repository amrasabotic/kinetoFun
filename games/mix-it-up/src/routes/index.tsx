import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MixItUpGame, Scientist } from "@/components/MixItUpGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mix It Up! - Mad Scientist Mixing Game" },
      { name: "description", content: "Use your hand to grab ingredients, fill the beaker, and discover wild reactions in this hand-tracked mixing game." },
      { property: "og:title", content: "Mix It Up!" },
      { property: "og:description", content: "Hand-tracked mad scientist mixing game." },
    ],
  }),
  component: Index,
});

function Index() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  if (stream) return <MixItUpGame stream={stream} onExit={() => {
    stream.getTracks().forEach(t => t.stop());
    setStream(null);
  }} />;
  return <HomeScreen onStream={setStream} />;
}

function HomeScreen({ onStream }: { onStream: (s: MediaStream) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    setError(null);
    setLoading(true);
    // CRITICAL: call getUserMedia synchronously inside the gesture handler
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => onStream(s))
      .catch((e) => {
        console.error(e);
        setLoading(false);
        if (e.name === "NotAllowedError") setError("Camera access was blocked. Click the camera icon in your browser's address bar to allow it, then click Start again.");
        else if (e.name === "NotFoundError") setError("No camera found. Please connect a webcam and try again.");
        else if (e.name === "NotReadableError" || /in use|Timeout/i.test(e.message || "")) setError("Your camera seems busy or starting up. Close other tabs/apps using it (Zoom, Meet, other browser tabs) and try again.");
        else setError("Could not start the camera. " + (e.message || ""));
      });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "var(--lab-bg)" }}
    >
      {/* Subtle blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Soft glow */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.8 0.25 320 / 0.35), transparent 60%)" }}
      />

      <div className="relative z-10 w-full max-w-5xl px-8 grid md:grid-cols-[1fr_320px] gap-10 items-center">
        {/* Left: title + CTA */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white/90 border-4 border-[var(--border)] rounded-full px-4 py-1.5 text-sm font-bold shadow-[0_4px_0_var(--border)]">
            <span className="w-2 h-2 rounded-full bg-[oklch(0.7_0.25_140)] animate-pulse" />
            LAB STATUS: OPEN FOR EXPERIMENTS
          </div>

          <h1
            className="mt-5 text-7xl md:text-8xl font-bold cartoon-stroke leading-[0.9]"
            style={{
              background: "linear-gradient(180deg, #fff176 0%, #ff6b9d 60%, #c2185b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MIX IT<br/>UP!
          </h1>

          <p className="mt-5 text-xl text-white/95 font-semibold max-w-md">
            Pinch ingredients out of thin air, drop them in the beaker, and see what science says today.
          </p>

          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-7 text-3xl font-bold cartoon-stroke text-white px-10 py-5 rounded-3xl border-4 border-[var(--border)] shadow-[0_8px_0_var(--border)] active:translate-y-1 active:shadow-[0_4px_0_var(--border)] hover:scale-[1.03] transition-transform disabled:opacity-60"
            style={{ background: "linear-gradient(180deg,#ff6b9d,#c2185b)" }}
          >
            {loading ? "STARTING…" : "START EXPERIMENT 🚀"}
          </button>

          <p className="mt-3 text-sm text-white/80 font-medium">
            We&rsquo;ll ask for camera access — needed for hand tracking.
          </p>

          {error && (
            <div className="mt-4 bg-white border-4 border-[oklch(0.65_0.25_25)] rounded-2xl px-4 py-3 text-sm font-semibold max-w-md shadow-[0_4px_0_oklch(0.5_0.2_25)]">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Right: scientist portrait card */}
        <div className="hidden md:block">
          <div className="relative bg-white rounded-3xl border-4 border-[var(--border)] p-6 shadow-[0_10px_0_var(--border)] wobble" style={{ transformOrigin: "bottom center" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[oklch(0.85_0.2_90)] border-4 border-[var(--border)] rounded-full px-4 py-1 text-xs font-bold whitespace-nowrap">
              DR. FIZZWICK
            </div>
            <div className="flex justify-center">
              <Scientist excited size={0.95} />
            </div>
            <div className="mt-2 text-center text-xs font-bold text-foreground/60">
              SR. CHAOS CHEMIST · LAB #5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
