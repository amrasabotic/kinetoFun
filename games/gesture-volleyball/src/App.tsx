import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }   from './useHandTracking';
import { useMenuHand }       from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import { deriveVolleyballGesture, useGestureRefs } from './useGesture';
import { initialGameState, stepGame, WINNING_SCORE, CANVAS_W, CANVAS_H } from './gameLogic';
import type { GameState, Difficulty, VolleyGestureInput } from './gameLogic';
import {
  initAudio, playHit, playSmash, playBlock,
  playAIHit, playAISmash, playServe,
  playPointScored, playPointLost, playGameOver,
} from './audio';
import type { MenuHandData } from './useMenuHand';

// ── Screen router ─────────────────────────────────────────────────────────────

type Screen = 'landing' | 'howtoplay' | 'difficulty' | 'game';

export default function App() {
  const [screen,     setScreen]     = useState<Screen>('landing');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  if (screen === 'landing')    return <LandingScreen    onPlay={() => setScreen('difficulty')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay')  return <HowToPlayScreen  onBack={() => setScreen('landing')} />;
  if (screen === 'difficulty') return <DifficultyScreen onSelect={d => { setDifficulty(d); setScreen('game'); }} onBack={() => setScreen('landing')} />;
  return <GameScreen difficulty={difficulty} onQuit={() => setScreen('landing')} />;
}

// ── Dwell-to-click (menu gesture layer) ──────────────────────────────────────

const DWELL_MS = 900;
const CURSOR_R = 22;

function MenuGestureLayer({ children }: {
  children: (props: { hand: MenuHandData; activeId: string | null; dwellProgress: number }) => React.ReactNode;
}) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const hand         = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef      = useRef(hand);
  handRef.current    = hand;

  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef  = useRef<number | null>(null);
  const activeIdRef    = useRef<string | null>(null);
  const rafRef         = useRef<number>(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; activeIdRef.current = null;
      rafRef.current = requestAnimationFrame(loop); return;
    }

    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;

    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id   = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) hoveredId = id;
    });

    if (hoveredId !== activeIdRef.current) {
      activeIdRef.current   = hoveredId;
      setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null;
      setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const progress = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(progress);
      if (progress >= 1) {
        (document.querySelector(`[data-dwell-id="${hoveredId}"]`) as HTMLElement | null)?.click();
        dwellStartRef.current = null; setActiveId(null); setDwellProgress(0); activeIdRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {children({ hand, activeId, dwellProgress })}

      {hand.detected && (
        <div className="pointer-events-none fixed z-40"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6}            fill="#38bdf8" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none"   stroke="rgba(56,189,248,0.3)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      <div className={`fixed top-3 left-3 z-40 w-2.5 h-2.5 rounded-full border border-black/30 ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
    </div>
  );
}

function GestureBtn({
  dwellId, activeId, dwellProgress, onClick, className = '', children,
}: {
  dwellId: string; activeId: string | null; dwellProgress: number;
  onClick: () => void; className?: string; children: React.ReactNode;
}) {
  const isActive      = activeId === dwellId;
  const circumference = 2 * Math.PI * (CURSOR_R - 3);
  const dash          = circumference * (isActive ? dwellProgress : 0);

  return (
    <div className="relative">
      <button
        data-dwell-id={dwellId}
        onClick={(e) => { if (e.isTrusted) return; onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none' }}
        className={`${className} ${isActive ? 'ring-2 ring-sky-400/60' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#38bdf8" strokeWidth="3"
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-8 w-full max-w-sm">
            <div className="text-8xl select-none">🏐</div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-black tracking-tight text-white">
                Gesture<span className="text-sky-400">Volleyball</span>
              </h1>
              <p className="text-gray-400 text-sm tracking-widest uppercase">
                Smash &amp; Block with your hands
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/55 leading-relaxed text-center space-y-1">
              <p>Move your hand left/right to position the player</p>
              <p>✋ Raise hand → <strong className="text-sky-300">Smash</strong> · 🤲 Spread hands → <strong className="text-blue-300">Block</strong></p>
              <p>First to {WINNING_SCORE} points wins!</p>
            </div>

            <p className="text-white/30 text-xs text-center">
              Hover your hand over a button and hold still to select
            </p>

            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-sky-900/50">
                PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold text-base rounded-xl tracking-wide transition-all border border-white/10">
                How to Play
              </GestureBtn>
            </div>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── How To Play Screen ────────────────────────────────────────────────────────

const HOW_ITEMS = [
  { icon: '📷', title: 'Camera Setup',
    desc: 'Position your webcam so your upper body and both arms are visible. Good lighting improves hand tracking accuracy.' },
  { icon: '↔️', title: 'Move & Position',
    desc: 'Move your hand(s) left and right to slide the player across your half of the court. The average position of all visible hands drives movement.' },
  { icon: '☝️', title: 'Smash Hit',
    desc: 'Raise one hand high above your forehead — when the ball is near, your player launches a powerful smash across the net. Edge-triggered: lower your hand between smashes.' },
  { icon: '🤲', title: 'Block',
    desc: 'Spread both hands far apart horizontally. Your player spreads their arms to deflect the ball back over the net without sending it at full speed.' },
  { icon: '🤖', title: 'AI Opponent',
    desc: 'The AI moves to intercept the ball and sometimes smashes. Difficulty controls its speed and smash frequency. Easy AI misses occasionally — Hard AI almost never does.' },
  { icon: '🏆', title: 'Scoring',
    desc: `First to ${WINNING_SCORE} points wins the match. A point is scored whenever the ball touches the floor on the opponent's side. Serves alternate after each point.` },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center">How to Play</h2>
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {HOW_ITEMS.map(item => (
                <div key={item.title} className="flex gap-4 bg-white/5 rounded-xl p-3 border border-white/8">
                  <div className="w-8 flex-shrink-0 flex items-start justify-center pt-0.5 text-xl">{item.icon}</div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Difficulty Screen ─────────────────────────────────────────────────────────

const DIFF_OPTIONS: { id: Difficulty; label: string; desc: string; btn: string; accent: string }[] = [
  { id: 'easy',   label: 'Easy',   desc: 'AI is slow and misses occasionally — great for beginners',    accent: 'text-green-400',  btn: 'bg-green-800 hover:bg-green-700' },
  { id: 'normal', label: 'Normal', desc: 'Balanced challenge — AI smashes and tracks ball reliably',     accent: 'text-yellow-400', btn: 'bg-yellow-800 hover:bg-yellow-700' },
  { id: 'hard',   label: 'Hard',   desc: 'Fast AI that smashes aggressively and almost never misses',    accent: 'text-red-400',    btn: 'bg-red-900 hover:bg-red-800' },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center">Select Difficulty</h2>
            <div className="flex flex-col gap-2.5">
              {DIFF_OPTIONS.map(opt => (
                <GestureBtn key={opt.id} dwellId={`diff-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                  onClick={() => onSelect(opt.id)}
                  className={`w-full py-3.5 ${opt.btn} active:scale-95 text-white rounded-xl transition-all shadow-lg flex items-center justify-between px-5`}>
                  <div className="flex flex-col items-start">
                    <span className={`font-black text-lg ${opt.accent}`}>{opt.label}</span>
                    <span className="text-white/50 text-xs">{opt.desc}</span>
                  </div>
                </GestureBtn>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function GameScreen({ difficulty, onQuit }: { difficulty: Difficulty; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);

  const gameStateRef   = useRef<GameState>(initialGameState(difficulty));
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);

  const rafRef       = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  const scoreSentRef = useRef(false);

  const { smashFiredRef } = useGestureRefs();

  const handsRaw   = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef   = useRef(handsRaw);
  handsRef.current = handsRaw;

  const gestureRef = useRef<VolleyGestureInput>({
    playerX: 0.5, isSmashing: false, isBlocking: false,
    highestHandY: 1, handsSpread: 0, handDetected: false,
  });

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const rawDt = lastTimeRef.current ? ts - lastTimeRef.current : 16;
    const dt    = Math.min(rawDt, 50) / 16.67;
    lastTimeRef.current = ts;

    const raw     = handsRef.current;
    const gesture = deriveVolleyballGesture(raw.hands, raw.handednesses, smashFiredRef);
    gestureRef.current = gesture;

    let gs = gameStateRef.current;

    if (gs.phase !== 'game_over') {
      const newGs = stepGame(gs, dt, gesture);

      // Audio
      if (newGs.audioTrigger !== null) {
        switch (newGs.audioTrigger) {
          case 'player_hit':    playHit();          break;
          case 'player_smash':  playSmash();        break;
          case 'player_block':  playBlock();        break;
          case 'ai_hit':        playAIHit();        break;
          case 'ai_smash':      playAISmash();      break;
          case 'serve':         playServe();        break;
          case 'point_player':  playPointScored();  break;
          case 'point_ai':      playPointLost();    break;
          case 'gameover':      playGameOver();     break;
        }
      }

      // Post score when game ends
      if (newGs.phase === 'game_over' && gs.phase !== 'game_over' && !scoreSentRef.current) {
        scoreSentRef.current = true;
        const bonus = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 50 : 100;
        window.parent.postMessage(
          { type: 'GAME_COMPLETE', score: newGs.player.score * 100 + bonus },
          '*',
        );
      }

      gs = newGs;
      gameStateRef.current = gs;
      setDisplayState({ ...gs });
    }

    draw({ state: gs, videoEl: videoRef.current, gesture: gestureRef.current });
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, smashFiredRef, difficulty]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const handleRestart = () => {
    gameStateRef.current  = initialGameState(difficulty);
    scoreSentRef.current  = false;
    smashFiredRef.current = false;
    setDisplayState(gameStateRef.current);
  };

  const gs       = displayState;
  const anyHand  = handsRaw.leftDetected || handsRaw.rightDetected;
  const isGameOver = gs.phase === 'game_over';

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden gap-3 px-2">

      {/* Score row above canvas */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: CANVAS_W }}>
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-black text-2xl tabular-nums">{gs.player.score}</span>
          <span className="text-white/40 text-sm font-semibold">YOU</span>
        </div>
        <div className="text-white/30 text-xs text-center px-3">
          {gs.phase === 'game_over'
            ? (gs.winner === 'player' ? '🏆 You Win!' : '😔 AI Wins')
            : `First to ${WINNING_SCORE}`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-semibold">AI</span>
          <span className="text-red-400 font-black text-2xl tabular-nums">{gs.ai.score}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl shadow-2xl block"
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 130px)' }}
        />

        {/* No-hand prompt */}
        {!anyHand && !isGameOver && gs.phase === 'playing' && (
          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
            <span className="text-5xl mb-3">🙌</span>
            <p className="text-white font-bold text-lg">Show your hands!</p>
            <p className="text-white/50 text-sm mt-1">Hold your hands in front of the camera</p>
          </div>
        )}

        {/* Game over overlay */}
        {isGameOver && (
          <GameOverOverlay gs={gs} onRestart={handleRestart} onQuit={onQuit} />
        )}
      </div>

      {/* Controls strip below canvas */}
      <div className="flex items-center gap-4">
        <div className={`w-2.5 h-2.5 rounded-full border border-black/30 flex-shrink-0 ${anyHand ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className="text-white/35 text-xs">{anyHand ? 'Hands detected' : 'No hands detected'}</span>
        <div className="flex gap-2">
          <button onClick={handleRestart}
            className="px-4 py-1.5 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
            Restart
          </button>
          <button onClick={onQuit}
            className="px-4 py-1.5 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
            Quit
          </button>
        </div>
      </div>

      {/* Hidden video element (MediaPipe streams into this) */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1"
        muted
        playsInline
      />
    </div>
  );
}

// ── Game Over overlay ─────────────────────────────────────────────────────────

function GameOverOverlay({ gs, onRestart, onQuit }: {
  gs: GameState; onRestart: () => void; onQuit: () => void;
}) {
  const won = gs.winner === 'player';
  return (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(6px)' }}>
      <div className="text-center flex flex-col items-center gap-5 px-8">
        <div className="text-6xl">{won ? '🏆' : '😔'}</div>
        <p className={`font-black text-4xl ${won ? 'text-yellow-400' : 'text-red-400'}`}>
          {won ? 'You Win!' : 'AI Wins!'}
        </p>
        <div className="flex gap-10 items-center">
          <div className="flex flex-col items-center">
            <span className="text-sky-300 font-black text-5xl tabular-nums">{gs.player.score}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest mt-1">You</span>
          </div>
          <span className="text-white/30 text-3xl">–</span>
          <div className="flex flex-col items-center">
            <span className="text-red-300 font-black text-5xl tabular-nums">{gs.ai.score}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest mt-1">AI</span>
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={onRestart}
            className="px-8 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-xl transition-all">
            Play Again
          </button>
          <button onClick={onQuit}
            className="px-8 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
