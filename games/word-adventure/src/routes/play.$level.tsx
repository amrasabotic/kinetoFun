import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { getLevel, LEVELS } from "@/lib/levels";
import { generatePuzzle, lineCells, type Puzzle } from "@/lib/wordsearch";
import { unlockLevel } from "@/lib/progress";
import { useHandTracking } from "@/hooks/useHandTracking";
import { Check, X, Pause, RotateCcw, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/play/$level")({
  params: { parse: (p) => ({ level: z.string().parse(p.level) }) },
  head: ({ params }) => ({
    meta: [
      { title: `Level ${params.level} — Word Search Adventure` },
      { name: "description", content: `Play level ${params.level} of Word Search Adventure.` },
    ],
  }),
  component: Play,
});

interface Feedback { x: number; y: number; ok: boolean; id: number; }

function Play() {
  const { level } = Route.useParams();
  const navigate = useNavigate();
  const levelNum = Number(level);
  const lvl = getLevel(levelNum);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [currentEnd, setCurrentEnd] = useState<{ row: number; col: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const lastPinchRef = useRef(false);
  const fbIdRef = useRef(0);

  const { state: hand, error: camError } = useHandTracking(videoRef, !paused);

  // Generate puzzle once per level
  useEffect(() => {
    if (!lvl) return;
    setPuzzle(generatePuzzle(lvl.size, lvl.words));
    setFound([]);
    setAnchor(null);
    setCurrentEnd(null);
  }, [lvl]);

  // Found-cells set for highlighting
  const foundCells = useMemo(() => {
    const s = new Set<string>();
    if (!puzzle) return s;
    for (const p of puzzle.placements) {
      if (!found.includes(p.word)) continue;
      for (let i = 0; i < p.word.length; i++) {
        s.add(`${p.row + p.dir[0] * i}_${p.col + p.dir[1] * i}`);
      }
    }
    return s;
  }, [puzzle, found]);

  const cellAt = useCallback((x: number, y: number): { row: number; col: number } | null => {
    if (!gridRef.current || !puzzle) return null;
    const rect = gridRef.current.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const cellW = rect.width / puzzle.size;
    const cellH = rect.height / puzzle.size;
    const col = Math.floor((x - rect.left) / cellW);
    const row = Math.floor((y - rect.top) / cellH);
    if (row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size) return null;
    return { row, col };
  }, [puzzle]);

  // Selecting cells while pinched
  const selectingSet = useMemo(() => {
    const s = new Set<string>();
    if (!anchor || !currentEnd) return s;
    const cells = lineCells(anchor.row, anchor.col, currentEnd.row, currentEnd.col);
    if (!cells) return s;
    for (const c of cells) s.add(`${c.row}_${c.col}`);
    return s;
  }, [anchor, currentEnd]);

  const finishSelection = useCallback((endCell: { row: number; col: number } | null, screenX: number, screenY: number) => {
    if (!anchor || !puzzle) { setAnchor(null); setCurrentEnd(null); return; }
    const end = endCell ?? currentEnd ?? anchor;
    const cells = lineCells(anchor.row, anchor.col, end.row, end.col);
    let ok = false;
    if (cells) {
      const letters = cells.map((c) => puzzle.grid[c.row][c.col]).join("");
      const rev = letters.split("").reverse().join("");
      const target = lvl!.words.map((w) => w.toUpperCase());
      const remaining = target.filter((w) => !found.includes(w));
      const match = remaining.find((w) => w === letters || w === rev);
      if (match) {
        ok = true;
        setFound((f) => [...f, match]);
      }
    }
    fbIdRef.current += 1;
    setFeedback({ x: screenX, y: screenY, ok, id: fbIdRef.current });
    setAnchor(null);
    setCurrentEnd(null);
  }, [anchor, currentEnd, puzzle, lvl, found]);

  // Hand-driven pinch state machine
  useEffect(() => {
    if (paused || !hand.visible) return;
    const cell = cellAt(hand.x, hand.y);
    const wasPinching = lastPinchRef.current;
    if (hand.pinching && !wasPinching) {
      if (cell) setAnchor(cell);
    } else if (hand.pinching && wasPinching) {
      if (cell) setCurrentEnd(cell);
    } else if (!hand.pinching && wasPinching) {
      finishSelection(cell, hand.x, hand.y);
    }
    lastPinchRef.current = hand.pinching;
  }, [hand, paused, cellAt, finishSelection]);

  // Mouse fallback for testing without camera
  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current;
    const onDown = (e: MouseEvent) => {
      const c = cellAt(e.clientX, e.clientY);
      if (c) setAnchor(c);
    };
    const onMove = (e: MouseEvent) => {
      if (!anchor) return;
      const c = cellAt(e.clientX, e.clientY);
      if (c) setCurrentEnd(c);
    };
    const onUp = (e: MouseEvent) => {
      if (!anchor) return;
      const c = cellAt(e.clientX, e.clientY);
      finishSelection(c, e.clientX, e.clientY);
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [anchor, cellAt, finishSelection]);

  // Auto-clear feedback
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 750);
    return () => clearTimeout(t);
  }, [feedback]);

  // Win
  const total = lvl?.words.length ?? 0;
  const complete = total > 0 && found.length === total;
  useEffect(() => {
    if (complete && lvl) unlockLevel(lvl.id + 1);
  }, [complete, lvl]);
  useEffect(() => {
    if (complete) window.parent.postMessage({ type: 'GAME_COMPLETE', score: found.length * 100 }, '*');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!lvl) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Level not found</h1>
          <Link to="/levels" className="mt-4 inline-block text-primary underline">Back to levels</Link>
        </div>
      </main>
    );
  }

  const nextLevel = LEVELS.find((l) => l.id === lvl.id + 1);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level {lvl.id} · {lvl.theme}</div>
          <div className="font-display text-2xl font-black">
            {found.length} <span className="text-muted-foreground">/ {total}</span> words
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setPuzzle(generatePuzzle(lvl.size, lvl.words)); setFound([]); }}
            className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-bold transition hover:bg-muted"
            title="New grid"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-bold transition hover:bg-muted"
          >
            <Pause className="size-4" />
          </button>
          <Link to="/levels" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Exit
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-[220px_1fr] gap-6 px-6 pb-6">
        {/* Word list */}
        <aside className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Find these</div>
          <ul className="space-y-1.5">
            {lvl.words.map((w) => {
              const done = found.includes(w.toUpperCase());
              return (
                <li
                  key={w}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-base font-bold transition ${
                    done ? "bg-success/15 text-success line-through" : "text-foreground"
                  }`}
                >
                  {w.toUpperCase()}
                  {done && <Check className="size-4" />}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Grid */}
        <section className="relative">
          {puzzle && (
            <div
              ref={gridRef}
              className="mx-auto grid touch-none select-none"
              style={{
                gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
                gap: "6px",
                maxWidth: `min(70vh, 800px)`,
              }}
            >
              {puzzle.grid.map((row, r) =>
                row.map((letter, c) => {
                  const key = `${r}_${c}`;
                  const sel = selectingSet.has(key);
                  const isFound = foundCells.has(key);
                  return (
                    <div
                      key={key}
                      ref={(el) => {
                        cellRefs.current[r] = cellRefs.current[r] ?? [];
                        cellRefs.current[r][c] = el;
                      }}
                      className={`grid-cell ${sel ? "selecting" : ""} ${isFound ? "found" : ""}`}
                      style={{ fontSize: `clamp(0.7rem, ${5 / puzzle.size}vw, 1.6rem)` }}
                    >
                      {letter}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>

      {/* Webcam (bottom right) */}
      <div className="fixed bottom-4 right-4 z-30 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-xl">
        <video
          ref={videoRef}
          className="block h-32 w-44 -scale-x-100 object-cover sm:h-40 sm:w-56"
          autoPlay
          playsInline
          muted
        />
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/95 p-2 text-center text-xs text-muted-foreground">
            Camera unavailable. Use mouse to play.
          </div>
        )}
      </div>

      {/* Hand cursor */}
      {hand.visible && (
        <div className={`game-cursor ${hand.pinching ? "pinching" : ""}`} style={{ left: hand.x, top: hand.y }}>
          <Plus className="size-full" strokeWidth={3} />
        </div>
      )}

      {/* Feedback badge */}
      {feedback && (
        <div key={feedback.id} className="feedback-badge" style={{ left: feedback.x, top: feedback.y }}>
          <div className={`flex size-16 items-center justify-center rounded-full shadow-2xl ${
            feedback.ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
          }`}>
            {feedback.ok ? <Check className="size-10" strokeWidth={3} /> : <X className="size-10" strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-border bg-card p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-black">Paused</h2>
            <p className="mt-1 text-muted-foreground">Take a breath.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => setPaused(false)}
                className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground"
              >
                Resume
              </button>
              <Link to="/levels" className="rounded-2xl border-2 border-border bg-card px-6 py-3 font-bold">
                Exit to levels
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {complete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="max-w-md rounded-3xl border-2 border-border bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="size-10" strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black">Level {lvl.id} complete!</h2>
            <p className="mt-2 text-muted-foreground">You found all {total} words.</p>
            <div className="mt-6 flex flex-col gap-3">
              {nextLevel ? (
                <button
                  onClick={() => navigate({ to: "/play/$level", params: { level: String(nextLevel.id) } })}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground"
                >
                  Next level <ArrowRight className="size-4" />
                </button>
              ) : (
                <div className="rounded-2xl bg-accent px-6 py-3 font-bold text-accent-foreground">
                  You finished all 20 levels!
                </div>
              )}
              <Link to="/levels" className="rounded-2xl border-2 border-border bg-card px-6 py-3 font-bold">
                Level map
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
