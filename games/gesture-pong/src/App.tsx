import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking } from './useHandTracking';
import { useGameCanvas } from './useGameCanvas';
import { initialGameState, stepGame, TABLE } from './gameLogic';
import type { GameState, Difficulty } from './gameLogic';

type Screen = 'landing' | 'howtoplay' | 'difficulty' | 'game';

const CANVAS_W = 480;
const CANVAS_H = 720;

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  if (screen === 'landing') return <LandingScreen onPlay={() => setScreen('difficulty')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay') return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  if (screen === 'difficulty') return <DifficultyScreen onSelect={(d) => { setDifficulty(d); setScreen('game'); }} onBack={() => setScreen('landing')} />;
  return <GameScreen difficulty={difficulty} onQuit={() => setScreen('landing')} />;
}

// ──────────────────────────────────────────────
// Landing Screen
// ──────────────────────────────────────────────
function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center gap-8 px-6 w-full max-w-md">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <PaddleSvg color="#ef4444" flip={false} size={44} />
            <h1 className="text-5xl font-black tracking-tight text-white">Gesture<span className="text-green-400">Pong</span></h1>
            <PaddleSvg color="#60a5fa" flip={true} size={44} />
          </div>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Hand-tracked Table Tennis</p>
        </div>

        {/* Mini table */}
        <div className="w-52 h-32 rounded-xl bg-gradient-to-br from-green-700 to-green-900 border-2 border-white/30 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-0.5 bg-white/60" />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-2.5 rounded-full bg-blue-500/90" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-2.5 rounded-full bg-red-500/90" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg" />
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button onClick={onPlay}
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black text-xl rounded-xl tracking-wide transition-all duration-150 shadow-lg shadow-green-900/50">
            PLAY
          </button>
          <button onClick={onHow}
            className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold text-base rounded-xl tracking-wide transition-all duration-150 border border-white/10">
            How to Play
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// How To Play Screen
// ──────────────────────────────────────────────
function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const items = [
    {
      icon: <HandIcon size={22} />,
      title: 'Hand Controls',
      desc: 'Hold your open hand in front of the webcam. Move it left and right — your paddle follows your index fingertip in real time.',
    },
    {
      icon: <span className="text-yellow-400 font-black text-lg">- -</span>,
      title: 'Yellow Guideline',
      desc: 'A dashed yellow line on both the table and the webcam shows the ideal vertical height for your hand. Keep your hand on that line for the most responsive control.',
    },
    {
      icon: <PaddleSvg color="#ef4444" flip={false} size={22} />,
      title: 'Paddle Angle',
      desc: 'Hit the ball toward the edges of your paddle to angle it left or right. Center hits go straight.',
    },
    {
      icon: <span className="text-white font-black text-base">11</span>,
      title: 'Scoring — Standard',
      desc: 'First to 11 points wins, but you must lead by at least 2. One game decides the match.',
    },
    {
      icon: <span className="text-purple-400 font-black text-base">∞</span>,
      title: 'Endless Mode',
      desc: 'No win condition — survive as long as possible. The ball and bot get faster every point. See how high you can score!',
    },
    {
      icon: <span className="text-orange-400 font-black text-base">AI</span>,
      title: 'Difficulty',
      desc: 'Easy → Impossible controls bot speed and accuracy. Impossible has a near-perfect reaction. Endless starts like Easy and scales up automatically.',
    },
  ];

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="w-full max-w-md flex flex-col gap-5">
        <h2 className="text-3xl font-black text-white text-center">How to Play</h2>
        <div className="flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {items.map(item => (
            <div key={item.title} className="flex gap-4 bg-white/5 rounded-xl p-3.5 border border-white/8">
              <div className="w-8 flex-shrink-0 flex items-start justify-center pt-0.5">{item.icon}</div>
              <div>
                <p className="text-white font-bold text-sm">{item.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onBack}
          className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 border border-white/10">
          Back
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Difficulty Screen
// ──────────────────────────────────────────────
const DIFF_OPTIONS: { id: Difficulty; label: string; desc: string; accent: string; btn: string }[] = [
  { id: 'easy',       label: 'Easy',       desc: 'Slow bot, forgiving hits',      accent: 'text-green-400',  btn: 'bg-green-700 hover:bg-green-600' },
  { id: 'medium',     label: 'Medium',     desc: 'Balanced challenge',             accent: 'text-yellow-400', btn: 'bg-yellow-700 hover:bg-yellow-600' },
  { id: 'hard',       label: 'Hard',       desc: 'Fast reactions, tight play',     accent: 'text-orange-400', btn: 'bg-orange-700 hover:bg-orange-600' },
  { id: 'impossible', label: 'Impossible', desc: 'Perfect bot — good luck',        accent: 'text-red-400',    btn: 'bg-red-800 hover:bg-red-700' },
  { id: 'endless',    label: 'Endless',    desc: 'Scales forever — no win limit',  accent: 'text-purple-400', btn: 'bg-purple-800 hover:bg-purple-700' },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="w-full max-w-md flex flex-col gap-5">
        <h2 className="text-3xl font-black text-white text-center">Select Mode</h2>
        <div className="flex flex-col gap-2.5">
          {DIFF_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => onSelect(opt.id)}
              className={`w-full py-3.5 ${opt.btn} active:scale-95 text-white rounded-xl transition-all duration-150 shadow-lg flex items-center justify-between px-5`}>
              <span className={`font-black text-lg ${opt.accent}`}>{opt.label}</span>
              <span className="text-white/60 text-sm">{opt.desc}</span>
            </button>
          ))}
        </div>
        <button onClick={onBack}
          className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 border border-white/10">
          Back
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Game Screen
// ──────────────────────────────────────────────
function GameScreen({ difficulty, onQuit }: { difficulty: Difficulty; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameStateRef = useRef<GameState>(initialGameState(difficulty));
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);
  const rafRef = useRef<number>(0);

  const handData = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handDataRef = useRef(handData);
  handDataRef.current = handData;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>, {
    state: displayState,
    handDetected: handData.detected,
  });

  const loop = useCallback(() => {
    const hand = handDataRef.current;
    const targetX = hand.detected
      ? hand.indexTipX * TABLE.width
      : gameStateRef.current.playerPaddle.x;
    gameStateRef.current = stepGame(gameStateRef.current, targetX, 16);
    setDisplayState({ ...gameStateRef.current });
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useEffect(() => { draw(); }, [displayState, draw]);

  useEffect(() => {
    if (displayState.phase === 'gameOver') {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: displayState.playerScore }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.phase]);

  const handleRestart = () => {
    gameStateRef.current = initialGameState(difficulty);
    setDisplayState(gameStateRef.current);
  };

  const gs = displayState;
  const isEndless = difficulty === 'endless';
  const diffLabel = difficulty === 'endless' ? 'Endless' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // Countdown display value
  const countdownDisplay = gs.phase === 'countdown'
    ? gs.countdown === 0 ? 'GO!' : String(gs.countdown)
    : null;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-stretch gap-4 h-full py-4 px-4" style={{ maxHeight: CANVAS_H + 32 }}>

        {/* ── Left panel: Bot ── */}
        <div className="flex flex-col items-center justify-center gap-4 w-28 shrink-0">
          <div className="flex flex-col items-center gap-2">
            <PaddleSvg color="#60a5fa" flip={false} size={32} />
            <span className="text-blue-400/60 text-xs font-bold uppercase tracking-widest">Bot</span>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-blue-400 font-black text-5xl tabular-nums leading-none">{gs.botScore}</span>
            <span className="text-blue-400/40 text-xs mt-1 uppercase tracking-widest">pts</span>
          </div>
          {!isEndless && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-blue-400/40 text-xs uppercase tracking-widest">wins</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < gs.botGames ? 'bg-blue-400 border-blue-400' : 'border-blue-400/20 bg-transparent'}`} />
                ))}
              </div>
            </div>
          )}
          {isEndless && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-purple-400/50 text-xs uppercase tracking-widest">level</span>
              <span className="text-purple-400 font-black text-xl tabular-nums">{gs.endlessLevel}</span>
            </div>
          )}
          <div className="mt-auto px-2 py-1 rounded-lg border border-white/10 bg-white/5">
            <span className="text-gray-400 text-xs uppercase tracking-widest">{diffLabel}</span>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl shadow-2xl block h-full w-auto"
            style={{ maxHeight: CANVAS_H }}
          />

          {/* Countdown overlay */}
          {countdownDisplay && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(2px)' }}>
              <div className="flex flex-col items-center gap-3">
                <span
                  className="font-black tabular-nums select-none"
                  style={{
                    fontSize: countdownDisplay === 'GO!' ? 72 : 100,
                    lineHeight: 1,
                    color: countdownDisplay === 'GO!' ? '#4ade80' : '#ffffff',
                    textShadow: countdownDisplay === 'GO!'
                      ? '0 0 40px rgba(74,222,128,0.7)'
                      : '0 0 40px rgba(255,255,255,0.4)',
                  }}
                >
                  {countdownDisplay}
                </span>
                {countdownDisplay !== 'GO!' && (
                  <span className="text-white/50 text-sm uppercase tracking-widest">get ready</span>
                )}
              </div>
            </div>
          )}

          {/* No-hand overlay */}
          {!handData.detected && gs.phase === 'playing' && (
            <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
              style={{ background: 'rgba(150,15,15,0.5)', backdropFilter: 'blur(3px)' }}>
              <HandIcon size={52} />
              <p className="text-white font-bold text-lg mt-2">No Hand Detected</p>
              <p className="text-white/65 text-sm">Show your hand to the camera</p>
            </div>
          )}

          {/* Score flash */}
          {gs.phase === 'scored' && gs.scorer && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none">
              <div className="bg-black/65 rounded-2xl px-8 py-4 backdrop-blur-sm">
                <p className="text-white font-black text-2xl tracking-wide uppercase">
                  {gs.scorer === 'player' ? 'Your Point!' : 'Bot Scores!'}
                </p>
                {isEndless && (
                  <p className="text-purple-300 text-sm text-center mt-1">Level {gs.endlessLevel}</p>
                )}
              </div>
            </div>
          )}

          {/* Game over */}
          {gs.phase === 'gameOver' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(5px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                {isEndless ? (
                  <>
                    <p className="text-purple-400 font-black text-3xl">Game Over</p>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white/50 text-xs uppercase tracking-widest">Final Score</span>
                      <span className="text-white font-black text-5xl tabular-nums">{gs.playerScore}</span>
                      <span className="text-purple-300/70 text-sm">Reached Level {gs.endlessLevel}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`font-black text-4xl ${gs.winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                      {gs.winner === 'player' ? 'You Win!' : 'Bot Wins!'}
                    </p>
                    <p className="text-white/50 text-sm">
                      {gs.playerScore} – {gs.botScore}
                    </p>
                  </>
                )}
                <div className="flex gap-3 mt-1">
                  <button onClick={handleRestart}
                    className="px-6 py-2.5 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold rounded-xl transition-all">
                    Play Again
                  </button>
                  <button onClick={onQuit}
                    className="px-6 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
                    Quit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: Player + webcam ── */}
        <div className="flex flex-col items-center justify-between gap-3 w-44 shrink-0">

          <div className="flex flex-col items-center gap-2 pt-1">
            <PaddleSvg color="#ef4444" flip={true} size={32} />
            <span className="text-red-400/60 text-xs font-bold uppercase tracking-widest">You</span>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-red-400 font-black text-5xl tabular-nums leading-none">{gs.playerScore}</span>
            <span className="text-red-400/40 text-xs mt-1 uppercase tracking-widest">pts</span>
          </div>
          {!isEndless && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-red-400/40 text-xs uppercase tracking-widest">wins</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < gs.playerGames ? 'bg-red-400 border-red-400' : 'border-red-400/20 bg-transparent'}`} />
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Webcam */}
          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            {/* Dashed guideline */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end" style={{ paddingBottom: '18%' }}>
              <div className="w-full" style={{ borderTop: '2px dashed rgba(255,220,50,0.85)' }} />
            </div>
            <span className="absolute right-1.5 text-yellow-300 font-bold text-xs drop-shadow"
              style={{ bottom: 'calc(18% + 5px)' }}>
              ← hand here
            </span>
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${handData.detected ? 'bg-green-400' : 'bg-red-500'}`} />
            {!handData.detected && (
              <div className="absolute inset-0 bg-red-900/45 flex items-end justify-center pb-2">
                <span className="text-white text-xs font-bold drop-shadow">No hand</span>
              </div>
            )}
          </div>

          {/* Restart / Quit */}
          <div className="flex flex-col gap-1.5 w-full pb-1">
            <button onClick={handleRestart}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Restart
            </button>
            <button onClick={onQuit}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Quit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Shared SVG components
// ──────────────────────────────────────────────

/** Realistic ping-pong paddle SVG icon */
function PaddleSvg({ color, flip, size }: { color: string; flip: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 48"
      fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      {/* Blade — round ellipse */}
      <ellipse cx="20" cy="18" rx="16" ry="17" fill={darkenHex(color, 0.3)} />
      <ellipse cx="20" cy="17" rx="15" ry="16" fill={color} />
      {/* Rubber highlight */}
      <ellipse cx="20" cy="17" rx="15" ry="16" fill="white" opacity="0.08" />
      <ellipse cx="14" cy="11" rx="6" ry="4" fill="white" opacity="0.18" />
      {/* Centre line divider */}
      <line x1="5" y1="17" x2="35" y2="17" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
      {/* Handle */}
      <rect x="16" y="33" width="8" height="13" rx="3" fill="#b07830" />
      <rect x="17.5" y="34.5" width="5" height="10" rx="2" fill="#c89040" />
      {/* Handle grain */}
      <line x1="17" y1="38" x2="23" y2="38" stroke="#7a4e18" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="17" y1="41" x2="23" y2="41" stroke="#7a4e18" strokeWidth="0.8" strokeOpacity="0.5" />
    </svg>
  );
}

function darkenHex(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 255 * amt)},${Math.max(0, g - 255 * amt)},${Math.max(0, b - 255 * amt)})`;
}

function HandIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}
