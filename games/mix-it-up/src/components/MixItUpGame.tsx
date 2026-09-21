import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

const INGREDIENTS: Ingredient[] = [
  { id: "mush", name: "Glow Shroom", emoji: "🍄", color: "#ff6b9d" },
  { id: "eye", name: "Wobbly Eye", emoji: "👁️", color: "#a6f1ff" },
  { id: "bone", name: "Old Bone", emoji: "🦴", color: "#f0e6d2" },
  { id: "leaf", name: "Mystic Leaf", emoji: "🌿", color: "#7fdc7f" },
  { id: "chili", name: "Fire Pepper", emoji: "🌶️", color: "#ff5252" },
  { id: "lemon", name: "Sour Orb", emoji: "🍋", color: "#fff176" },
  { id: "frog", name: "Swamp Frog", emoji: "🐸", color: "#81c784" },
  { id: "bug", name: "Lab Beetle", emoji: "🪲", color: "#9575cd" },
  { id: "star", name: "Star Dust", emoji: "✨", color: "#ffd54f" },
  { id: "bolt", name: "Zap Crystal", emoji: "⚡", color: "#4fc3f7" },
  { id: "snail", name: "Slime Snail", emoji: "🐌", color: "#ce93d8" },
  { id: "potion", name: "Mystery Goo", emoji: "🧪", color: "#69f0ae" },
];

type Outcome = {
  emoji: string;
  title: string;
  subtitle: string;
  kind: "magic" | "boom";
};

const MAGIC: Outcome[] = [
  { emoji: "🌈", title: "RAINBOW BURST!", subtitle: "Beautiful! Spectacular! Unsanitary!", kind: "magic" },
  { emoji: "🦄", title: "UNICORN SUMMONED!", subtitle: "It only eats glitter.", kind: "magic" },
  { emoji: "🐉", title: "TINY DRAGON!", subtitle: "He seems friendly. Mostly.", kind: "magic" },
  { emoji: "🪄", title: "POOF! MAGIC!", subtitle: "You are now slightly more charming.", kind: "magic" },
  { emoji: "🌟", title: "STARLIGHT POTION!", subtitle: "Glows in the dark, and in cereal.", kind: "magic" },
];

const BOOM: Outcome[] = [
  { emoji: "💥", title: "KABOOM!", subtitle: "Your eyebrows are now optional.", kind: "boom" },
  { emoji: "🔥", title: "WHOOSH!", subtitle: "That was not supposed to happen. Probably.", kind: "boom" },
  { emoji: "☁️", title: "STINK CLOUD!", subtitle: "The lab smells like regret.", kind: "boom" },
  { emoji: "🥴", title: "GLOOP OVERLOAD!", subtitle: "You are 30% slime now.", kind: "boom" },
  { emoji: "🤯", title: "BRAIN MELT!", subtitle: "Science!", kind: "boom" },
];

type Phase = "play" | "mixing" | "result";

const MAX_INGREDIENTS = 5;

// MediaPipe hand connections (pairs of landmark indices)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function MixItUpGame({ onExit, stream }: { onExit: () => void; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothed = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const [hand, setHand] = useState<{
    x: number; y: number; pinching: boolean; thumbsUp: boolean; visible: boolean;
    landmarks: { x: number; y: number }[];
  }>({
    x: 0.5, y: 0.5, pinching: false, thumbsUp: false, visible: false, landmarks: [],
  });
  const [carrying, setCarrying] = useState<Ingredient | null>(null);
  const [beaker, setBeaker] = useState<Ingredient[]>([]);
  const [phase, setPhase] = useState<Phase>("play");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [status, setStatus] = useState<string>("Loading hand tracking…");
  const [hoverProgress, setHoverProgress] = useState(0);

  const handRef = useRef(hand);
  const carryingRef = useRef(carrying);
  const beakerRef = useRef(beaker);
  const phaseRef = useRef(phase);
  useEffect(() => { handRef.current = hand; }, [hand]);
  useEffect(() => { carryingRef.current = carrying; }, [carrying]);
  useEffect(() => { beakerRef.current = beaker; }, [beaker]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Init MediaPipe
  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      const v = videoRef.current;
      const lm = landmarkerRef.current;
      if (!v || !lm || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      let res;
      try {
        res = lm.detectForVideo(v, performance.now());
      } catch {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      if (res.landmarks && res.landmarks.length > 0) {
        const pts = res.landmarks[0];
        const tip = pts[8];
        const thumb = pts[4];
        const targetX = 1 - tip.x;
        const targetY = tip.y;
        const alpha = 0.45;
        smoothed.current.x = smoothed.current.x + (targetX - smoothed.current.x) * alpha;
        smoothed.current.y = smoothed.current.y + (targetY - smoothed.current.y) * alpha;
        const dx = tip.x - thumb.x;
        const dy = tip.y - thumb.y;
        const dz = (tip.z ?? 0) - (thumb.z ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const pinching = dist < 0.06;
        // Thumbs up: thumb tip well above wrist & thumb MCP, and the other 4 fingers curled
        // (tip y greater than PIP y => bent down in image space).
        const wrist = pts[0];
        const thumbMcp = pts[2];
        const thumbUpExtended = thumb.y < thumbMcp.y - 0.05 && thumb.y < wrist.y - 0.08;
        const curled =
          pts[8].y > pts[6].y &&
          pts[12].y > pts[10].y &&
          pts[16].y > pts[14].y &&
          pts[20].y > pts[18].y;
        const thumbsUp = thumbUpExtended && curled;
        // Store raw (un-mirrored) landmarks — they're drawn on top of the
        // webcam preview which itself has scaleX(-1) applied to it.
        const raw = pts.map((p) => ({ x: p.x, y: p.y }));
        setHand({
          x: smoothed.current.x, y: smoothed.current.y,
          pinching, thumbsUp, visible: true, landmarks: raw,
        });
      } else {
        setHand((h) => ({ ...h, visible: false, pinching: false, thumbsUp: false, landmarks: [] }));
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    (async () => {
      try {
        // Attach stream FIRST so the webcam preview shows even if model load is slow
        const v = videoRef.current!;
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        await new Promise<void>((resolve) => {
          if (v.readyState >= 2) return resolve();
          v.onloadedmetadata = () => resolve();
        });
        try { await v.play(); } catch { /* may already be playing */ }
        setStatus("Loading hand tracking model…");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        const mkLandmarker = (delegate: "GPU" | "CPU") =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 1,
          });
        let lm: HandLandmarker;
        try {
          lm = await mkLandmarker("GPU");
        } catch (gpuErr) {
          console.warn("GPU delegate failed, falling back to CPU", gpuErr);
          lm = await mkLandmarker("CPU");
        }
        if (cancelled) return;
        landmarkerRef.current = lm;
        setStatus("");
        loop();
      } catch (e) {
        console.error(e);
        setStatus("Could not load hand tracking. Check your network and try again.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
  }, [stream]);

  // Game logic: respond to pinch state changes
  const wasPinching = useRef(false);
  useEffect(() => {
    const pinching = hand.pinching && hand.visible;
    if (phase !== "play") { wasPinching.current = pinching; return; }
    if (pinching && !wasPinching.current) {
      // Pinch start: try to pick up an ingredient under cursor
      if (!carrying) {
        const hit = hitTestIngredient(hand.x, hand.y);
        if (hit) setCarrying(hit);
      }
    } else if (!pinching && wasPinching.current) {
      // Release: drop in beaker if over it
      if (carrying && hitTestBeaker(hand.x, hand.y) && beaker.length < MAX_INGREDIENTS) {
        setBeaker((b) => [...b, carrying]);
      }
      setCarrying(null);
    }
    wasPinching.current = pinching;
  }, [hand, carrying, beaker, phase]);

  const mix = useCallback(() => {
    if (beaker.length === 0) return;
    setPhase("mixing");
    setTimeout(() => {
      const isBoom = Math.random() < 0.5;
      const pool = isBoom ? BOOM : MAGIC;
      setOutcome(pool[Math.floor(Math.random() * pool.length)]);
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: isBoom ? 0 : 100 }, '*');
      setPhase("result");
    }, 1800);
  }, [beaker]);

  const reset = useCallback(() => {
    setBeaker([]);
    setOutcome(null);
    setCarrying(null);
    setPhase("play");
  }, []);

  // Confirm by hovering the MIX button for 3 seconds.
  const hoverStartRef = useRef<number | null>(null);
  useEffect(() => {
    const overMix =
      hand.visible &&
      hand.x > 0.80 && hand.x < 0.98 &&
      hand.y > 0.84 && hand.y < 0.98;
    if (phase !== "play" || beaker.length === 0 || !overMix) {
      hoverStartRef.current = null;
      setHoverProgress(0);
      return;
    }
    if (hoverStartRef.current === null) hoverStartRef.current = performance.now();
    const id = setInterval(() => {
      if (hoverStartRef.current === null) return;
      const elapsed = performance.now() - hoverStartRef.current;
      const p = Math.min(1, elapsed / 3000);
      setHoverProgress(p);
      if (p >= 1) {
        hoverStartRef.current = null;
        setHoverProgress(0);
        mix();
      }
    }, 60);
    return () => clearInterval(id);
  }, [hand, phase, beaker, mix]);

  useEffect(() => {
    if (phase !== "result") return;
    if (!hand.visible || !hand.pinching) return;
    if (hand.x > 0.4 && hand.x < 0.6 && hand.y > 0.75 && hand.y < 0.92) {
      reset();
    }
  }, [hand, phase, reset]);

  return (
    <div className="fixed inset-0 select-none" style={{ background: "var(--lab-bg)" }}>
      {/* Webcam monitor (lab CCTV feel) */}
      <div className="absolute bottom-4 left-4 z-50 pop-in">
        <div className="rounded-2xl border-4 border-[var(--border)] bg-[oklch(0.25_0.04_280)] p-2 shadow-xl">
          <div className="relative rounded-lg overflow-hidden border-2 border-[oklch(0.4_0.04_280)]">
            <video
              ref={videoRef}
              playsInline
              muted
              className="block w-48 h-36 object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Hand-joint overlay drawn on top of the webcam preview */}
            {hand.visible && hand.landmarks.length === 21 && (
              <svg
                className="pointer-events-none absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ transform: "scaleX(-1)" }}
              >
                {HAND_CONNECTIONS.map(([a, b], i) => {
                  const pa = hand.landmarks[a];
                  const pb = hand.landmarks[b];
                  return (
                    <line key={i}
                      x1={pa.x * 100} y1={pa.y * 100}
                      x2={pb.x * 100} y2={pb.y * 100}
                      stroke="#a6f1ff" strokeLinecap="round"
                      style={{ strokeWidth: 1.2 }}
                    />
                  );
                })}
                {hand.landmarks.map((p, i) => (
                  <circle key={i} cx={p.x * 100} cy={p.y * 100} r="1.4"
                    fill={i === 8 ? "#ff6b9d" : i === 4 ? "#ffd54f" : "#ffffff"}
                    stroke="#2a2440"
                    style={{ strokeWidth: 0.4 }}
                  />
                ))}
              </svg>
            )}
          </div>
          <div className="flex items-center justify-between mt-1 px-1 text-[10px] font-bold text-[oklch(0.85_0.18_140)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[oklch(0.7_0.25_25)] animate-pulse" />
              LIVE • LAB CAM
            </span>
            <span>CH-01</span>
          </div>
        </div>
      </div>

      {status && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 text-white text-2xl text-center p-8">
          {status}
        </div>
      )}

      {/* Lab scene */}
      <Lab beaker={beaker} carrying={carrying} phase={phase} outcome={outcome} />

      {/* Shelves with ingredients */}
      <Shelves carrying={carrying} hand={hand} />

      {/* Confirm button — hover for 3s with hand, or click as fallback */}
      {phase === "play" && (
        <button
          onClick={mix}
          disabled={beaker.length === 0}
          className={`absolute z-30 right-[2%] bottom-[2%] w-[18%] h-[14%] rounded-3xl text-xl font-bold cartoon-stroke text-white border-4 border-[var(--border)] shadow-[0_8px_0_var(--border)] active:translate-y-1 active:shadow-[0_4px_0_var(--border)] disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center leading-tight overflow-hidden ${hoverProgress > 0 ? "rainbow" : ""}`}
          style={{ background: beaker.length ? "linear-gradient(180deg,#ff6b9d,#c2185b)" : "#888" }}
        >
          <span className="text-3xl relative z-10">🧪 MIX!</span>
          <span className="text-[10px] opacity-90 mt-1 relative z-10">hover 3s to mix</span>
          {/* Hover-progress fill */}
          <span
            className="absolute left-0 bottom-0 w-full bg-white/35 pointer-events-none transition-[height] duration-75"
            style={{ height: `${hoverProgress * 100}%` }}
          />
        </button>
      )}

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/90 px-6 py-2 rounded-full border-4 border-[var(--border)] text-xl font-bold shadow-lg">
        {beaker.length} / {MAX_INGREDIENTS} ingredients
      </div>

      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-30 bg-white/90 px-4 py-2 rounded-full border-4 border-[var(--border)] font-bold shadow-lg hover:bg-white"
      >
        ← Home
      </button>

      {/* Mixing overlay */}
      {phase === "mixing" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="text-9xl shake">🧪</div>
        </div>
      )}

      {/* Result overlay */}
      {phase === "result" && outcome && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 pop-in">
          <div className={`text-[14rem] ${outcome.kind === "magic" ? "rainbow" : "shake"}`}>{outcome.emoji}</div>
          <h2 className="text-6xl font-bold text-white cartoon-stroke mt-2">{outcome.title}</h2>
          <p className="text-2xl text-white mt-3 font-semibold">{outcome.subtitle}</p>
          <button
            onClick={reset}
            className="mt-8 text-3xl font-bold cartoon-stroke text-white px-10 py-4 rounded-3xl border-4 border-[var(--border)] shadow-[0_8px_0_var(--border)] active:translate-y-1"
            style={{ background: "linear-gradient(180deg,#7fdc7f,#2e7d32)" }}
          >
            AGAIN! 🔁
          </button>
        </div>
      )}

      {/* Hand cursor */}
      {hand.visible && (
        <div
          className="pointer-events-none absolute z-[55] -translate-x-1/2 -translate-y-1/2 transition-transform"
          style={{
            left: `${hand.x * 100}%`,
            top: `${hand.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${hand.pinching ? 0.75 : 1})`,
          }}
        >
          <div
            className="rounded-full border-4 border-white shadow-lg flex items-center justify-center text-3xl"
            style={{
              width: 64, height: 64,
              background: hand.pinching ? "rgba(255,107,157,0.85)" : "rgba(255,255,255,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            {carrying ? carrying.emoji : hand.pinching ? "✊" : "✋"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Hit testing ---------- */

function getShelfSlots(): { ing: Ingredient; x: number; y: number; w: number; h: number }[] {
  const slots: { ing: Ingredient; x: number; y: number; w: number; h: number }[] = [];
  // All ingredients arranged across 3 stacked top shelves (4 per row).
  const rows = [0.10, 0.24, 0.38];
  const cols = [0.18, 0.38, 0.58, 0.78];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const idx = r * cols.length + c;
      if (idx >= INGREDIENTS.length) break;
      slots.push({ ing: INGREDIENTS[idx], x: cols[c], y: rows[r], w: 0.12, h: 0.12 });
    }
  }
  return slots;
}

function hitTestIngredient(x: number, y: number): Ingredient | null {
  const slots = getShelfSlots();
  for (const s of slots) {
    if (Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2) return s.ing;
  }
  return null;
}

function hitTestBeaker(x: number, y: number): boolean {
  // Beaker around center, 0.42-0.58 x, 0.45-0.78 y
  return x > 0.4 && x < 0.6 && y > 0.42 && y < 0.82;
}

/* ---------- Visuals ---------- */

function Shelves({ carrying, hand }: { carrying: Ingredient | null; hand: { x: number; y: number; visible: boolean } }) {
  const slots = getShelfSlots();
  return (
    <>
      {/* Stacked top shelf planks */}
      {[0.17, 0.31, 0.45].map((top, i) => (
        <div key={i} className="absolute z-10"
          style={{ left: "10%", right: "10%", top: `${top * 100}%`, height: "14px", background: "var(--shelf)", borderRadius: 4, boxShadow: "0 4px 0 rgba(0,0,0,0.25)" }} />
      ))}

      {slots.map((s, i) => {
        const isCarried = carrying?.id === s.ing.id;
        const isHover = hand.visible &&
          Math.abs(hand.x - s.x) < s.w / 2 && Math.abs(hand.y - s.y) < s.h / 2;
        return (
          <div
            key={s.ing.id + i}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
          >
            <div
              className={`rounded-full border-4 border-[var(--border)] flex items-center justify-center text-5xl ${isHover ? "wobble" : "float-bob"}`}
              style={{
                width: 88, height: 88,
                background: s.ing.color,
                opacity: isCarried ? 0.3 : 1,
                boxShadow: isHover ? "0 0 30px white, 0 6px 0 var(--border)" : "0 6px 0 var(--border)",
                animationDelay: `${(i % 5) * 0.3}s`,
              }}
            >
              {s.ing.emoji}
            </div>
            <div className="text-xs font-bold mt-1 bg-white/85 px-2 py-0.5 rounded-full border-2 border-[var(--border)] whitespace-nowrap">
              {s.ing.name}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Lab({ beaker, carrying, phase, outcome }: {
  beaker: Ingredient[]; carrying: Ingredient | null; phase: Phase; outcome: Outcome | null;
}) {
  const charred = outcome?.kind === "boom" && phase === "result";
  return (
    <>
      {/* Floor */}
      <div className="absolute inset-x-0 bottom-0 h-[18%] z-0" style={{ background: "linear-gradient(180deg, oklch(0.45 0.08 30), oklch(0.3 0.06 30))" }} />
      {/* Scientist */}
      <div
        className={`absolute z-10 ${phase === "mixing" ? "shake" : "wobble"}`}
        style={{ left: "20%", bottom: "12%", width: 260, height: 360 }}
      >
        <Scientist charred={charred} excited={phase === "result" && outcome?.kind === "magic"} />
      </div>
      {/* Table */}
      <div className="absolute z-10" style={{ left: "38%", right: "38%", bottom: "14%", height: "30px", background: "oklch(0.4 0.08 40)", borderRadius: 6, boxShadow: "0 6px 0 rgba(0,0,0,0.3)" }} />
      <div className="absolute z-10" style={{ left: "40%", bottom: "0%", width: "10px", height: "15%", background: "oklch(0.35 0.08 40)" }} />
      <div className="absolute z-10" style={{ right: "40%", bottom: "0%", width: "10px", height: "15%", background: "oklch(0.35 0.08 40)" }} />

      {/* Beaker */}
      <Beaker items={beaker} carrying={carrying} mixing={phase === "mixing"} />
    </>
  );
}

export function Scientist({ charred = false, excited = false, size = 1 }: { charred?: boolean; excited?: boolean; size?: number }) {
  const skin = charred ? "#6b5544" : "#f5d6b3";
  const coat = charred ? "#cfcfcf" : "#ffffff";
  const hair = charred ? "#3a3a3a" : "#f4f4f4";
  const mouth = excited ? "M70 132 Q90 158 110 132" : "M75 138 Q90 148 105 138";
  return (
    <svg viewBox="0 0 180 260" style={{ width: 260 * size, height: 360 * size, overflow: "visible" }}>
      {/* Lab coat body */}
      <path d="M30 170 L25 255 L155 255 L150 170 Q140 150 90 150 Q40 150 30 170 Z" fill={coat} stroke="#2a2440" strokeWidth="4" strokeLinejoin="round" />
      {/* Coat lapels */}
      <path d="M70 152 L90 200 L110 152" fill="none" stroke="#2a2440" strokeWidth="3" />
      {/* Pocket */}
      <rect x="105" y="200" width="32" height="28" rx="3" fill="none" stroke="#2a2440" strokeWidth="3" />
      <rect x="112" y="206" width="4" height="14" fill="#ff6b9d" />
      <rect x="120" y="206" width="4" height="14" fill="#4fc3f7" />
      {/* Buttons */}
      <circle cx="90" cy="195" r="3" fill="#2a2440" />
      <circle cx="90" cy="220" r="3" fill="#2a2440" />
      {/* Arms */}
      <path d="M30 175 Q10 210 18 245 L40 248 Q38 215 50 185 Z" fill={coat} stroke="#2a2440" strokeWidth="4" strokeLinejoin="round" />
      <path d="M150 175 Q170 210 162 245 L140 248 Q142 215 130 185 Z" fill={coat} stroke="#2a2440" strokeWidth="4" strokeLinejoin="round" />
      {/* Hands */}
      <circle cx="28" cy="245" r="11" fill={skin} stroke="#2a2440" strokeWidth="3" />
      <circle cx="152" cy="245" r="11" fill={skin} stroke="#2a2440" strokeWidth="3" />
      {/* Neck */}
      <rect x="80" y="140" width="20" height="15" fill={skin} stroke="#2a2440" strokeWidth="3" />
      {/* Head */}
      <ellipse cx="90" cy="110" rx="42" ry="46" fill={skin} stroke="#2a2440" strokeWidth="4" />
      {/* Crazy white hair */}
      <path d="M48 88 Q35 60 50 55 Q45 35 65 45 Q70 25 85 40 Q95 20 105 42 Q120 28 122 50 Q140 45 132 70 Q145 75 132 92 Z"
        fill={hair} stroke="#2a2440" strokeWidth="3.5" strokeLinejoin="round" />
      {/* Side hair tufts */}
      <path d="M48 110 Q35 115 42 130 Q50 122 52 118 Z" fill={hair} stroke="#2a2440" strokeWidth="3" />
      <path d="M132 110 Q145 115 138 130 Q130 122 128 118 Z" fill={hair} stroke="#2a2440" strokeWidth="3" />
      {/* Eyebrows */}
      <path d="M58 92 L78 88" stroke="#2a2440" strokeWidth="4" strokeLinecap="round" />
      <path d="M102 88 L122 92" stroke="#2a2440" strokeWidth="4" strokeLinecap="round" />
      {/* Goggles strap */}
      <path d="M48 108 Q90 100 132 108" fill="none" stroke="#2a2440" strokeWidth="4" />
      {/* Goggles */}
      <circle cx="70" cy="112" r="16" fill="#a6f1ff" stroke="#2a2440" strokeWidth="4" />
      <circle cx="110" cy="112" r="16" fill="#a6f1ff" stroke="#2a2440" strokeWidth="4" />
      <line x1="86" y1="112" x2="94" y2="112" stroke="#2a2440" strokeWidth="4" />
      {/* Goggle shine */}
      <circle cx="65" cy="107" r="4" fill="#ffffff" />
      <circle cx="105" cy="107" r="4" fill="#ffffff" />
      {/* Pupils */}
      <circle cx={excited ? 74 : 72} cy={excited ? 116 : 114} r="2.5" fill="#2a2440" />
      <circle cx={excited ? 114 : 112} cy={excited ? 116 : 114} r="2.5" fill="#2a2440" />
      {/* Mustache */}
      <path d="M65 130 Q80 138 90 132 Q100 138 115 130 Q108 142 90 140 Q72 142 65 130 Z" fill={hair} stroke="#2a2440" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Mouth */}
      <path d={mouth} fill="none" stroke="#2a2440" strokeWidth="3.5" strokeLinecap="round" />
      {/* Charred soot puffs */}
      {charred && (
        <>
          <circle cx="50" cy="80" r="8" fill="#444" opacity="0.6" />
          <circle cx="130" cy="85" r="6" fill="#444" opacity="0.6" />
          <circle cx="90" cy="60" r="7" fill="#444" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

function Beaker({ items, carrying, mixing }: { items: Ingredient[]; carrying: Ingredient | null; mixing: boolean }) {
  const fillPct = (items.length / MAX_INGREDIENTS) * 100;
  const lastColor = items[items.length - 1]?.color ?? "#7fdc7f";
  return (
    <div
      className={`absolute z-20 ${mixing ? "shake" : ""}`}
      style={{ left: "50%", bottom: "16%", transform: "translateX(-50%)", width: 180, height: 240 }}
    >
      {/* Glass body */}
      <div className="absolute inset-0 rounded-b-[40px] rounded-t-2xl border-4 border-[var(--border)] overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.25))", backdropFilter: "blur(2px)" }}>
        {/* Liquid */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-300"
          style={{
            height: `${Math.max(15, fillPct)}%`,
            background: `linear-gradient(180deg, ${lastColor}cc, ${lastColor})`,
          }}
        >
          {/* Bubbles */}
          {items.map((it, i) => (
            <div
              key={i}
              className="absolute bottom-0 rounded-full opacity-70"
              style={{
                left: `${15 + i * 17}%`, width: 16, height: 16,
                background: "rgba(255,255,255,0.7)",
                animation: `bubble-up ${2 + (i % 3) * 0.5}s ease-in ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>
        {/* Ingredients floating in beaker */}
        <div className="absolute inset-x-0 bottom-2 flex flex-wrap-reverse justify-center gap-1 p-2">
          {items.map((it, i) => (
            <span key={i} className="text-2xl drop-shadow pop-in" style={{ animationDelay: `${i * 0.1}s` }}>
              {it.emoji}
            </span>
          ))}
        </div>
      </div>
      {/* Neck highlight */}
      <div className="absolute top-2 left-3 w-3 h-20 rounded-full bg-white/60" />
      {/* Label */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border-2 border-[var(--border)] text-sm font-bold whitespace-nowrap">
        Drop here {carrying ? "👇" : ""}
      </div>
    </div>
  );
}