import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LEVELS, NEON_COLORS, minMovesFor, type LevelDef } from "@/lib/levels";
import { recordCompletion, loadProgress } from "@/lib/progress";
import { startHandTracking, type HandTracker } from "@/lib/hand-tracking";
import { Button } from "@/components/ui/button";
import { Pause, Play, Hand, Star, X, Redo2, Camera } from "lucide-react";

// Standard MediaPipe hand connections (joint pairs to draw).
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type Cell = { color: number; isEndpoint: boolean } | null;

interface Props {
  levelId: number;
}

function emptyGrid(size: number, level: LevelDef): Cell[][] {
  const g: Cell[][] = Array.from({ length: size }, () => Array(size).fill(null));
  level.pairs.forEach((pair, color) => {
    pair.forEach(([r, c]) => (g[r][c] = { color, isEndpoint: true }));
  });
  return g;
}

function clonePaths(paths: [number, number][][]): [number, number][][] {
  return paths.map((p) => p.map((c) => [c[0], c[1]] as [number, number]));
}

export function GameBoard({ levelId }: Props) {
  const navigate = useNavigate();
  const level = useMemo(() => LEVELS.find((l) => l.id === levelId)!, [levelId]);
  const minMoves = minMovesFor(level);

  // paths[color] = ordered list of cells from one endpoint
  const [paths, setPaths] = useState<[number, number][][]>(() => level.pairs.map(() => []));
  const [moves, setMoves] = useState(0);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState<{ moves: number; best: number; star: boolean } | null>(null);

  // Cursor: normalized [0..1] x/y in board area
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [pinch, setPinch] = useState(false);

  // Hand tracking is the only gameplay input. Camera must be enabled to play.
  const [handStatus, setHandStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const trackerRef = useRef<HandTracker | null>(null);
  const landmarksRef = useRef<Array<{ x: number; y: number; z: number }> | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Reset all per-level state whenever the level changes (e.g. Next Level).
  useEffect(() => {
    setPaths(level.pairs.map(() => []));
    setMoves(0);
    setActiveColor(null);
    setCompleted(null);
    setPaused(false);
  }, [level]);

  // ── Build occupancy grid from paths ──────────────────
  const grid = useMemo(() => {
    const g = emptyGrid(level.size, level);
    paths.forEach((path, color) => {
      path.forEach(([r, c]) => {
        if (!g[r][c]) g[r][c] = { color, isEndpoint: false };
      });
    });
    return g;
  }, [paths, level]);

  const isEndpoint = useCallback(
    (r: number, c: number, color?: number): { color: number } | null => {
      for (let i = 0; i < level.pairs.length; i++) {
        if (color !== undefined && i !== color) continue;
        for (const [er, ec] of level.pairs[i]) if (er === r && ec === c) return { color: i };
      }
      return null;
    },
    [level],
  );

  // ── Pinch / drag interactions ────────────────────────
  const cursorCell = useCallback((): [number, number] | null => {
    if (!cursor) return null;
    const r = Math.floor(cursor.y * level.size);
    const c = Math.floor(cursor.x * level.size);
    if (r < 0 || c < 0 || r >= level.size || c >= level.size) return null;
    return [r, c];
  }, [cursor, level.size]);

  const beginPath = useCallback(
    (color: number, startCell: [number, number]) => {
      setActiveColor(color);
      setPaths((prev) => {
        const next = clonePaths(prev);
        // Clear any previous path for this color
        next[color] = [startCell];
        return next;
      });
    },
    [],
  );

  const extendPath = useCallback(
    (cell: [number, number]) => {
      if (activeColor === null || paused || completed) return;
      setPaths((prev) => {
        const path = prev[activeColor];
        if (path.length === 0) return prev;
        const head = path[path.length - 1];
        if (head[0] === cell[0] && head[1] === cell[1]) return prev;
        // Manhattan-adjacent?
        if (Math.abs(head[0] - cell[0]) + Math.abs(head[1] - cell[1]) !== 1) return prev;
        // Backtrack
        if (path.length >= 2) {
          const prevCell = path[path.length - 2];
          if (prevCell[0] === cell[0] && prevCell[1] === cell[1]) {
            const next = clonePaths(prev);
            next[activeColor] = path.slice(0, -1);
            return next;
          }
        }
        // Don't allow crossing self
        if (path.some(([r, c]) => r === cell[0] && c === cell[1])) return prev;
        // Don't allow crossing OTHER colors' paths/endpoints
        for (let other = 0; other < prev.length; other++) {
          if (other === activeColor) continue;
          if (prev[other].some(([r, c]) => r === cell[0] && c === cell[1])) return prev;
        }
        const ep = isEndpoint(cell[0], cell[1]);
        if (ep && ep.color !== activeColor) return prev;
        const next = clonePaths(prev);
        next[activeColor] = [...path, cell];
        return next;
      });
    },
    [activeColor, paused, completed, isEndpoint],
  );

  const endPath = useCallback(() => {
    if (activeColor === null) return;
    setMoves((m) => m + 1);
    setActiveColor(null);
  }, [activeColor]);

  // Process pinch transitions
  const prevPinch = useRef(false);
  useEffect(() => {
    if (paused || completed) return;
    if (pinch && !prevPinch.current) {
      // Pinch began
      const cell = cursorCell();
      if (cell) {
        const ep = isEndpoint(cell[0], cell[1]);
        if (ep) beginPath(ep.color, cell);
      }
    } else if (!pinch && prevPinch.current) {
      // Pinch ended
      endPath();
    } else if (pinch && activeColor !== null) {
      const cell = cursorCell();
      if (cell) extendPath(cell);
    }
    prevPinch.current = pinch;
  }, [pinch, cursor, paused, completed, cursorCell, isEndpoint, beginPath, endPath, extendPath, activeColor]);

  // ── Mouse fallback ───────────────────────────────────
  // ── Hand tracking ────────────────────────────────────
  const enableHandTracking = async () => {
    if (handStatus === "active" || handStatus === "loading") return;
    setHandStatus("loading");
    try {
      const tracker = await startHandTracking(({ point, pinch: p, landmarks }) => {
        landmarksRef.current = landmarks;
        if (point) setCursor(point);
        setPinch(p);
      });
      trackerRef.current = tracker;
      setHandStatus("active");
    } catch (e) {
      console.error(e);
      setHandStatus("error");
      setTimeout(() => setHandStatus("idle"), 2000);
    }
  };

  useEffect(() => () => trackerRef.current?.stop(), []);

  // ── Win condition ────────────────────────────────────
  useEffect(() => {
    if (completed || activeColor !== null) return;
    const total = level.size * level.size;
    let filled = 0;
    const colorComplete = level.pairs.map(() => false);
    for (let r = 0; r < level.size; r++)
      for (let c = 0; c < level.size; c++) if (grid[r][c]) filled++;
    paths.forEach((path, color) => {
      if (path.length < 2) return;
      const start = path[0];
      const end = path[path.length - 1];
      const eps = level.pairs[color];
      const matches = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];
      const ok =
        (matches(start, eps[0]) && matches(end, eps[1])) ||
        (matches(start, eps[1]) && matches(end, eps[0]));
      colorComplete[color] = ok;
    });
    if (filled === total && colorComplete.every(Boolean)) {
      const finalMoves = moves;
      const prior = loadProgress().records[level.id]?.bestMoves;
      const best = prior ? Math.min(prior, finalMoves) : finalMoves;
      const star = best <= minMoves;
      recordCompletion(level.id, finalMoves, minMoves, LEVELS.length);
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: star ? 100 : 50 }, '*');
      setCompleted({ moves: finalMoves, best, star });
    }
  }, [grid, paths, activeColor, moves, level, minMoves, completed]);

  // ── Reset ────────────────────────────────────────────
  const reset = () => {
    setPaths(level.pairs.map(() => []));
    setMoves(0);
    setActiveColor(null);
    setCompleted(null);
  };

  // ── Render ───────────────────────────────────────────
  const cell = cursorCell();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start gap-6 py-6 px-4">
      {/* Top HUD */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/play" })}>
          <X className="size-4" /> Exit
        </Button>
        <div className="flex items-center gap-4">
          <div className="panel px-4 py-2 text-center">
            <div className="text-xs font-display tracking-widest text-muted-foreground">LEVEL</div>
            <div className="text-2xl font-display font-bold neon-glow-cyan">{level.id}</div>
          </div>
          <div className="panel px-4 py-2 text-center">
            <div className="text-xs font-display tracking-widest text-muted-foreground">MOVES</div>
            <div className="text-2xl font-display font-bold">
              <span className={moves === minMoves ? "neon-glow-pink" : ""}>{moves}</span>
              <span className="text-muted-foreground text-base"> / {minMoves}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset} title="Reset">
            <Redo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPaused(true)}>
            <Pause className="size-4" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="relative">
        <div
          ref={boardRef}
          className="relative panel scanline overflow-hidden cursor-none select-none touch-none"
          style={{
            width: "min(82vw, 560px)",
            aspectRatio: "1 / 1",
            background: "var(--grid-bg)",
            padding: "12px",
          }}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-3 grid"
            style={{
              gridTemplateColumns: `repeat(${level.size}, 1fr)`,
              gridTemplateRows: `repeat(${level.size}, 1fr)`,
              gap: "2px",
            }}
          >
            {Array.from({ length: level.size * level.size }, (_, i) => {
              const r = Math.floor(i / level.size);
              const c = i % level.size;
              const g = grid[r][c];
              const colorVar = g ? NEON_COLORS[g.color % NEON_COLORS.length] : null;
              return (
                <div
                  key={i}
                  className="relative rounded-sm"
                  style={{
                    background: colorVar
                      ? `color-mix(in oklab, ${colorVar} 22%, transparent)`
                      : "color-mix(in oklab, var(--grid-line) 18%, transparent)",
                    boxShadow: colorVar
                      ? `inset 0 0 12px -2px ${colorVar}, 0 0 8px -4px ${colorVar}`
                      : "inset 0 0 0 1px var(--grid-line)",
                    transition: "background 120ms",
                  }}
                >
                  {g?.isEndpoint && (
                    <div
                      className="absolute inset-[15%] rounded-full animate-neon-pulse"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${colorVar} 100%, white 30%), ${colorVar} 60%, color-mix(in oklab, ${colorVar} 60%, black))`,
                        color: colorVar as string,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cursor overlay */}
          {cursor && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(12px + ${cursor.x} * (100% - 24px))`,
                top: `calc(12px + ${cursor.y} * (100% - 24px))`,
                transform: "translate(-50%, -50%)",
                transition: "left 60ms, top 60ms",
              }}
            >
              <Crosshair pinch={pinch} cell={cell} />
            </div>
          )}
        </div>

        {handStatus === "error" && (
          <p className="mt-2 text-center text-sm text-destructive">
            Could not access camera. Check permissions and try again.
          </p>
        )}
      </div>

      {/* Webcam + landmark overlay (corner) */}
      {handStatus === "active" && trackerRef.current && (
        <HandCamera video={trackerRef.current.video} landmarksRef={landmarksRef} />
      )}

      {/* Camera-required overlay (blocks gameplay until enabled) */}
      {handStatus !== "active" && !paused && !completed && (
        <Overlay>
          <div className="text-center">
            <Camera className="size-12 mx-auto mb-3 text-[color:var(--neon-cyan)]" />
            <h2 className="text-2xl font-display neon-glow-cyan mb-2">Camera required</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Neon Flow is played with hand tracking. Pinch your thumb and index to grab and draw.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="hero" onClick={enableHandTracking} disabled={handStatus === "loading"}>
                <Hand className="size-4" />
                {handStatus === "loading" ? "Starting camera…" : "Enable camera"}
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/play" })}>
                <X className="size-4" /> Back to map
              </Button>
            </div>
            {handStatus === "error" && (
              <p className="mt-3 text-sm text-destructive">
                Could not access camera. Check browser permissions.
              </p>
            )}
          </div>
        </Overlay>
      )}

      {/* Pause overlay */}
      {paused && !completed && (
        <Overlay>
          <h2 className="text-3xl font-display neon-glow-cyan mb-6">Paused</h2>
          <div className="flex flex-col gap-3 w-56">
            <Button onClick={() => setPaused(false)} variant="hero">
              <Play className="size-4" /> Resume
            </Button>
            <Button variant="outline" onClick={() => { reset(); setPaused(false); }}>
              <Redo2 className="size-4" /> Restart level
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/play" })}>
              <X className="size-4" /> Exit to map
            </Button>
          </div>
        </Overlay>
      )}

      {/* Complete overlay */}
      {completed && (
        <Overlay>
          <div className="text-center">
            {completed.star ? (
              <Star className="size-16 mx-auto text-[color:var(--star)] animate-star" fill="currentColor" />
            ) : (
              <div className="text-5xl mb-2">✦</div>
            )}
            <h2 className="text-3xl font-display neon-glow-pink mt-2">Level Complete</h2>
            <p className="text-muted-foreground mt-1">
              {completed.star ? "Perfect run!" : "Try to match the minimum to earn a star."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Moves" value={completed.moves} />
              <Stat label="Best" value={completed.best} highlight={completed.star} />
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}>Replay</Button>
              {level.id < LEVELS.length && (
                <Button
                  variant="hero"
                  onClick={() => {
                    setCompleted(null);
                    navigate({ to: "/play/$level", params: { level: String(level.id + 1) } });
                  }}
                >
                  Next level →
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate({ to: "/play" })}>Map</Button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function HandCamera({
  video,
  landmarksRef,
}: {
  video: HTMLVideoElement;
  landmarksRef: React.RefObject<Array<{ x: number; y: number; z: number }> | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.transform = "scaleX(-1)"; // selfie mirror
    c.appendChild(video);
    return () => {
      if (video.parentElement === c) c.removeChild(video);
    };
  }, [video]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          const lms = landmarksRef.current;
          if (lms) {
            // Mirror x to match video transform.
            const px = (i: number) => (1 - lms[i].x) * w;
            const py = (i: number) => lms[i].y * h;
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#22d3ee";
            ctx.shadowBlur = 6;
            for (const [a, b] of HAND_CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(px(a), py(a));
              ctx.lineTo(px(b), py(b));
              ctx.stroke();
            }
            ctx.fillStyle = "#f0abfc";
            ctx.shadowColor = "#f0abfc";
            for (let i = 0; i < lms.length; i++) {
              ctx.beginPath();
              ctx.arc(px(i), py(i), 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [landmarksRef]);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 panel overflow-hidden border border-[color:var(--neon-cyan)]/40"
      style={{
        width: "180px",
        aspectRatio: "4 / 3",
        boxShadow: "0 0 18px -4px var(--neon-cyan)",
      }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute top-1 left-2 text-[10px] font-display tracking-widest text-[color:var(--neon-cyan)]">
        HAND
      </div>
    </div>
  );
}

function Crosshair({ pinch }: { pinch: boolean; cell: [number, number] | null }) {
  const color = pinch ? "var(--neon-pink)" : "var(--neon-cyan)";
  const size = pinch ? 36 : 30;
  return (
    <div
      style={{
        width: size,
        height: size,
        color,
        filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color})`,
        transition: "all 120ms",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="9" />
        <line x1="12" y1="15" x2="12" y2="22" />
        <line x1="2" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="22" y2="12" />
        {pinch && <circle cx="12" cy="12" r="3" fill="currentColor" />}
      </svg>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="panel p-8 max-w-md w-full neon-box-violet">{children}</div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="panel py-3">
      <div className="text-xs font-display tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-3xl font-display font-bold ${highlight ? "neon-glow-pink text-[color:var(--star)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}