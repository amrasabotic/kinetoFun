import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LEVELS, buildGrid, WORD_COLORS, type BuiltGrid } from "@/lib/levels";
import { markCompleted } from "@/lib/progress";
import { useHandTracking, HAND_CONNECTIONS, type HandLandmark } from "@/lib/use-hand-tracking";

export const Route = createFileRoute("/play/$level")({
  head: ({ params }) => ({
    meta: [
      { title: `Level ${params.level} — Crossword Builder` },
      { name: "description", content: `Solve crossword level ${params.level} using gesture controls.` },
    ],
  }),
  component: PlayLevel,
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function PlayLevel() {
  const { level } = Route.useParams();
  const navigate = useNavigate();
  const levelNum = Number(level);
  const levelDef = LEVELS.find((l) => l.id === levelNum);

  if (!levelDef) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link to="/levels" className="rounded-2xl bg-primary px-6 py-3 text-primary-foreground">Back to levels</Link>
      </div>
    );
  }

  return (
    <GameSurface
      key={levelNum}
      levelDef={levelDef}
      onExit={() => navigate({ to: "/levels" })}
      onNext={() => {
        const next = LEVELS.find((l) => l.id === levelNum + 1);
        if (next) navigate({ to: "/play/$level", params: { level: String(next.id) } });
        else navigate({ to: "/levels" });
      }}
    />
  );
}

interface Drag {
  letter: string;
  from: { r: number; c: number } | null;
}

function wordColorVar(idx: number) {
  return `var(--${WORD_COLORS[idx % WORD_COLORS.length]})`;
}

function GameSurface({ levelDef, onExit, onNext }: { levelDef: typeof LEVELS[number]; onExit: () => void; onNext: () => void }) {
  const grid = useMemo(() => buildGrid(levelDef), [levelDef]);
  const [enableHand, setEnableHand] = useState(true);
  const hand = useHandTracking(enableHand);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const pinchPrev = useRef(false);

  const lastInputRef = useRef<"hand" | "mouse">("hand");
  useEffect(() => {
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastInputRef.current = "mouse";
      setCursor({ x: e.clientX, y: e.clientY });
    };
    const onDown = () => { if (lastInputRef.current === "mouse") setPinching(true); };
    const onUp = () => { if (lastInputRef.current === "mouse") setPinching(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!hand.active) return;
    lastInputRef.current = "hand";
    setCursor({ x: hand.x * window.innerWidth, y: hand.y * window.innerHeight });
    setPinching(hand.pinching);
  }, [hand.x, hand.y, hand.pinching, hand.active]);

  // Game state
  const initial = useMemo(() => {
    const p = new Map<string, string>();
    for (const cell of grid.list) {
      if (cell.isFirst) p.set(`${cell.r},${cell.c}`, cell.answer);
    }
    return p;
  }, [grid]);
  const [placed, setPlaced] = useState<Map<string, string>>(initial);
  const [lockedWords, setLockedWords] = useState<Set<number>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [won, setWon] = useState(false);
  // Hint is shown while the player is pinching on the hint button.
  const [hinting, setHinting] = useState(false);
  const hintHoldRef = useRef(false);

  const isCellLocked = (r: number, c: number): boolean => {
    const cell = grid.cells[r][c];
    if (!cell) return true;
    if (cell.isFirst) return true;
    return cell.wordIndexes.some((wi) => lockedWords.has(wi));
  };

  const recomputeLocks = (placedMap: Map<string, string>): Set<number> => {
    const newLocked = new Set(lockedWords);
    grid.level.words.forEach((w, idx) => {
      if (newLocked.has(idx)) return;
      let ok = true;
      for (let i = 0; i < w.w.length; i++) {
        const r = w.r + (w.d === "D" ? i : 0);
        const c = w.c + (w.d === "A" ? i : 0);
        const placedLetter = placedMap.get(`${r},${c}`);
        if (placedLetter !== w.w[i]) { ok = false; break; }
      }
      if (ok) newLocked.add(idx);
    });
    return newLocked;
  };

  useEffect(() => {
    const wasPinching = pinchPrev.current;
    pinchPrev.current = pinching;

    if (pinching && !wasPinching) {
      const el = document.elementFromPoint(cursor.x, cursor.y);
      if (!el) return;

      // Pinch on the hint button → show hint while held.
      const hintBtn = (el as HTMLElement).closest<HTMLElement>("[data-pinch-hint]");
      if (hintBtn) {
        hintHoldRef.current = true;
        setHinting(true);
        return;
      }

      const tileEl = (el as HTMLElement).closest<HTMLElement>("[data-letter]");
      if (tileEl) {
        setDrag({ letter: tileEl.dataset.letter!, from: null });
        return;
      }
      const cellEl = (el as HTMLElement).closest<HTMLElement>("[data-cell]");
      if (cellEl) {
        const [r, c] = cellEl.dataset.cell!.split(",").map(Number);
        if (!isCellLocked(r, c)) {
          const key = `${r},${c}`;
          const letter = placed.get(key);
          if (letter) {
            const next = new Map(placed);
            next.delete(key);
            setPlaced(next);
            setDrag({ letter, from: { r, c } });
          }
        }
      }
    } else if (!pinching && wasPinching) {
      // Pinch UP: release hint hold first.
      if (hintHoldRef.current) {
        hintHoldRef.current = false;
        setHinting(false);
      }
      if (drag) {
        const el = document.elementFromPoint(cursor.x, cursor.y);
        const cellEl = el ? (el as HTMLElement).closest<HTMLElement>("[data-cell]") : null;
        if (cellEl) {
          const [r, c] = cellEl.dataset.cell!.split(",").map(Number);
          if (!isCellLocked(r, c) && !placed.has(`${r},${c}`)) {
            const next = new Map(placed);
            next.set(`${r},${c}`, drag.letter);
            const newLocks = recomputeLocks(next);
            setPlaced(next);
            if (newLocks.size !== lockedWords.size) setLockedWords(newLocks);
            if (newLocks.size === grid.level.words.length) {
              setTimeout(() => setWon(true), 400);
            }
          }
        }
        setDrag(null);
      }
    }
  }, [pinching, cursor.x, cursor.y]);

  useEffect(() => {
    if (won) {
      markCompleted(grid.level.id);
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: grid.level.words.length * 100 }, '*');
    }
  }, [won, grid.level.id]);

  // For each letter A-Z, list the word indexes that still need it at an empty/wrong cell.
  const letterNeeds = useMemo(() => {
    const map = new Map<string, number[]>();
    grid.level.words.forEach((w, idx) => {
      if (lockedWords.has(idx)) return;
      for (let i = 0; i < w.w.length; i++) {
        const r = w.r + (w.d === "D" ? i : 0);
        const c = w.c + (w.d === "A" ? i : 0);
        if (placed.get(`${r},${c}`) === w.w[i]) continue;
        const L = w.w[i];
        const arr = map.get(L) ?? [];
        if (!arr.includes(idx)) arr.push(idx);
        map.set(L, arr);
      }
    });
    return map;
  }, [grid, placed, lockedWords]);

  return (
    <main className="no-select fixed inset-0 cursor-none overflow-hidden">
      <BackgroundDecor />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <button onClick={onExit} className="rounded-2xl bg-card/80 px-4 py-2 font-display text-sm font-bold shadow-tile backdrop-blur hover:bg-card">
          ← Levels
        </button>
        <div className="rounded-2xl bg-card/80 px-5 py-2 text-center font-display shadow-tile backdrop-blur">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Level {grid.level.id}</div>
          <div className="text-xl font-bold leading-tight">{grid.level.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div
            data-pinch-hint
            className={`select-none rounded-2xl px-4 py-2 font-display text-sm font-bold shadow-tile backdrop-blur transition-all ${
              hinting ? "scale-105 bg-accent text-accent-foreground ring-2 ring-primary" : "bg-card/80"
            }`}
            title="Pinch and hold to reveal a hint"
          >
            💡 Hint {hinting ? "ON" : ""}
          </div>
          <div className="rounded-2xl bg-card/80 px-4 py-2 font-display text-sm font-bold shadow-tile backdrop-blur">
            {lockedWords.size} / {grid.level.words.length} ✓
          </div>
        </div>
      </div>

      {/* Three-column layout: crossword | clues | letter bank */}
      <div
        className="grid h-full gap-4 px-6 pb-6 pt-24"
        style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(220px, 320px) minmax(0,0.9fr)" }}
      >
        <CrosswordBoard grid={grid} placed={placed} lockedWords={lockedWords} dragging={drag !== null} />
        <ClueList grid={grid} lockedWords={lockedWords} />
        <LetterBank dragging={drag !== null} letterNeeds={hinting ? letterNeeds : null} />
      </div>

      <WebcamPreview stream={hand.stream} landmarks={hand.landmarks} pinching={hand.pinching} />

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-2xl bg-card/80 px-3 py-2 text-xs shadow-tile backdrop-blur">
        <span className={`h-2 w-2 rounded-full ${hand.active ? "bg-success" : hand.error ? "bg-destructive" : "bg-accent animate-pulse"}`} />
        <span className="font-semibold">
          {hand.active ? "Hand tracked" : hand.error ? "Mouse mode" : "Starting camera…"}
        </span>
        {hand.error && (
          <button onClick={() => setEnableHand(false)} className="ml-2 text-muted-foreground underline">dismiss</button>
        )}
      </div>

      <Cursor x={cursor.x} y={cursor.y} pinching={pinching} drag={drag} />

      <AnimatePresence>
        {won && (
          <WinOverlay
            level={grid.level.id}
            isLast={grid.level.id === LEVELS.length}
            onNext={onNext}
            onMenu={onExit}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-secondary/40 blur-3xl" />
    </div>
  );
}

function CrosswordBoard({
  grid, placed, lockedWords, dragging,
}: {
  grid: BuiltGrid;
  placed: Map<string, string>;
  lockedWords: Set<number>;
  dragging: boolean;
}) {
  const maxDim = Math.max(grid.rows, grid.cols);
  const cellSize = Math.min(72, Math.max(36, Math.floor(440 / maxDim)));
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="rounded-3xl bg-card/70 p-5 shadow-pop backdrop-blur"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.rows}, ${cellSize}px)`,
          gap: 6,
        }}
      >
        {Array.from({ length: grid.rows }).map((_, r) =>
          Array.from({ length: grid.cols }).map((_, c) => {
            const cell = grid.cells[r][c];
            if (!cell) {
              return <div key={`${r},${c}`} style={{ width: cellSize, height: cellSize }} />;
            }
            const placedLetter = placed.get(`${r},${c}`);
            const isLocked = cell.isFirst || cell.wordIndexes.some((wi) => lockedWords.has(wi));
            const isComplete = cell.wordIndexes.some((wi) => lockedWords.has(wi));
            const colorIdx = cell.wordIndexes[0];
            const tint = wordColorVar(colorIdx);
            const number = grid.cellNumber.get(`${r},${c}`);
            return (
              <div
                key={`${r},${c}`}
                data-cell={`${r},${c}`}
                style={{
                  width: cellSize, height: cellSize,
                  background: isComplete ? "var(--color-success)" : `color-mix(in oklab, ${tint} 30%, white)`,
                  borderColor: isComplete ? "var(--color-success)" : tint,
                }}
                className={`relative flex items-center justify-center rounded-xl border-2 font-display font-bold shadow-tile transition-all ${
                  dragging && !placedLetter && !isLocked ? "scale-105 ring-2 ring-foreground/40" : ""
                } ${isComplete ? "text-success-foreground" : "text-foreground"}`}
              >
                {number !== undefined && (
                  <span className="absolute left-1 top-0.5 text-[10px] font-bold text-foreground/60">
                    {number}
                  </span>
                )}
                <span style={{ fontSize: cellSize * 0.5 }}>{placedLetter || ""}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ClueList({ grid, lockedWords }: { grid: BuiltGrid; lockedWords: Set<number> }) {
  const items = grid.level.words.map((w, idx) => ({
    idx,
    number: grid.wordNumber[idx],
    dir: w.d,
    clue: w.clue,
    solved: lockedWords.has(idx),
  }));
  // Sort by number then direction (Across first)
  items.sort((a, b) => a.number - b.number || (a.dir === "A" ? -1 : 1));
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl bg-card/70 p-4 shadow-pop backdrop-blur">
        <p className="text-center font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Clues
        </p>
        <ul className="flex flex-col gap-2 overflow-auto pr-1" style={{ maxHeight: "60vh" }}>
          {items.map((it) => {
            const tint = wordColorVar(it.idx);
            return (
              <li
                key={`${it.idx}`}
                style={{
                  background: it.solved
                    ? "var(--color-success)"
                    : `color-mix(in oklab, ${tint} 22%, white)`,
                  borderColor: it.solved ? "var(--color-success)" : tint,
                }}
                className={`flex items-start gap-2 rounded-2xl border-2 px-3 py-2 text-sm leading-snug shadow-tile transition-colors ${
                  it.solved ? "text-success-foreground line-through opacity-90" : "text-foreground"
                }`}
              >
                <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-foreground/10 px-1 font-display text-xs font-bold">
                  {it.number}{it.dir === "A" ? "▶" : "▼"}
                </span>
                <span>{it.clue}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function LetterBank({ dragging, letterNeeds }: { dragging: boolean; letterNeeds: Map<string, number[]> | null }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-3xl bg-card/70 p-5 shadow-pop backdrop-blur">
        <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Letter Bank {letterNeeds && <span className="text-primary">· hint</span>}
        </p>
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {ALPHABET.map((L) => {
            const needs = letterNeeds?.get(L);
            const isNeeded = !!needs && needs.length > 0;
            return (
              <div
                key={L}
                data-letter={L}
                className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-2xl font-display text-2xl font-bold text-foreground shadow-tile transition-transform ${
                  dragging ? "" : "hover:-translate-y-0.5"
                } ${
                  isNeeded
                    ? "ring-2 ring-primary"
                    : letterNeeds
                      ? "opacity-30"
                      : ""
                }`}
                style={{
                  background: isNeeded
                    ? `color-mix(in oklab, ${wordColorVar(needs![0])} 55%, white)`
                    : "linear-gradient(to bottom, white, color-mix(in oklab, var(--accent) 25%, white))",
                }}
              >
                <span>{L}</span>
                {isNeeded && (
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {needs!.map((wi) => (
                      <span
                        key={wi}
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-white"
                        style={{ background: wordColorVar(wi) }}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WebcamPreview({ stream, landmarks, pinching }: {
  stream: MediaStream | null;
  landmarks: HandLandmark[] | null;
  pinching: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const W = 200, H = 150;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (!landmarks) return;
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = pinching ? "#ff7a3d" : "rgba(255,255,255,0.85)";
    for (const [a, b] of HAND_CONNECTIONS) {
      const p = landmarks[a], q = landmarks[b];
      ctx.beginPath();
      ctx.moveTo(p.x * W, p.y * H);
      ctx.lineTo(q.x * W, q.y * H);
      ctx.stroke();
    }
    landmarks.forEach((lm, i) => {
      const isTip = i === 4 || i === 8;
      ctx.beginPath();
      ctx.arc(lm.x * W, lm.y * H, isTip ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? (pinching ? "#ff7a3d" : "#ffd23d") : "#3dd6ff";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.stroke();
    });
    ctx.restore();
  }, [landmarks, pinching]);

  if (!stream) return null;
  return (
    <div
      className="pointer-events-none absolute bottom-4 right-4 z-20 overflow-hidden rounded-2xl bg-card/80 shadow-pop ring-2 ring-card backdrop-blur"
      style={{ width: W, height: H }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ width: W, height: H, objectFit: "cover", transform: "scaleX(-1)" }}
      />
      <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0" />
      <div className="absolute left-2 top-2 rounded-md bg-foreground/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        You
      </div>
    </div>
  );
}

function Cursor({ x, y, pinching, drag }: { x: number; y: number; pinching: boolean; drag: Drag | null }) {
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      {drag ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display text-3xl font-bold text-primary-foreground shadow-pop ring-4 ring-primary/30">
          {drag.letter}
        </div>
      ) : (
        <div
          className={`rounded-full border-4 transition-all ${
            pinching
              ? "h-6 w-6 border-primary bg-primary/40"
              : "h-12 w-12 border-foreground/70 bg-foreground/10"
          }`}
        />
      )}
    </div>
  );
}

function WinOverlay({ level, isLast, onNext, onMenu }: { level: number; isLast: boolean; onNext: () => void; onMenu: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.6, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="rounded-3xl bg-card p-10 text-center shadow-pop"
      >
        <p className="text-5xl">🎉</p>
        <h2 className="mt-4 font-display text-5xl font-bold">Level {level} solved!</h2>
        <p className="mt-2 text-foreground/70">
          {isLast ? "You finished every puzzle. Word wizard status: confirmed." : "Next level unlocked."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={onMenu} className="rounded-2xl bg-muted px-6 py-3 font-display font-bold">
            Level Map
          </button>
          {!isLast && (
            <button onClick={onNext} className="rounded-2xl bg-primary px-8 py-3 font-display font-bold text-primary-foreground shadow-tile">
              Next ▶
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
