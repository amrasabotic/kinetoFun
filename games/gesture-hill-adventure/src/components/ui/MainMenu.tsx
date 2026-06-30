/**
 * Main menu screen with animated title, gesture cursor, and dwell-click buttons.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuHand } from '../../hooks/useMediaPipe';
import { playUiClick } from '../../game/audio/audioSystem';
import type { SaveData } from '../../types';

const DWELL_MS = 900;
const CURSOR_R = 26;

interface Props {
  save:         SaveData;
  onPlay:       () => void;
  onGarage:     () => void;
  onStats:      () => void;
  onSettings:   () => void;
  onHowToPlay:  () => void;
}

export default function MainMenu({ save, onPlay, onGarage, onStats, onSettings, onHowToPlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand     = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);

  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const dwellStart   = useRef<number | null>(null);
  const activeRef    = useRef<string | null>(null);
  const rafRef       = useRef(0);

  const dwellLoop = useCallback((ts: number) => {
    const h = hand;
    if (!h.detected) {
      setActiveId(null); setProgress(0);
      dwellStart.current = null; activeRef.current = null;
      rafRef.current = requestAnimationFrame(dwellLoop);
      return;
    }
    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;
    let hov: string | null = null;
    document.querySelectorAll<HTMLElement>('[data-dwell]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom)
        hov = el.dataset.dwell!;
    });
    if (hov !== activeRef.current) {
      activeRef.current = hov; setActiveId(hov);
      dwellStart.current = hov ? ts : null; setProgress(0);
    } else if (hov && dwellStart.current !== null) {
      const p = Math.min((ts - dwellStart.current) / DWELL_MS, 1);
      setProgress(p);
      if (p >= 1) {
        document.querySelector<HTMLElement>(`[data-dwell="${hov}"]`)?.click();
        dwellStart.current = null; setActiveId(null); setProgress(0); activeRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(dwellLoop);
  }, [hand]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(dwellLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dwellLoop]);

  function DBtn({ id, label, icon, sub, onClick, big }: {
    id: string; label: string; icon: string; sub?: string;
    onClick: () => void; big?: boolean;
  }) {
    const isAct = activeId === id;
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <motion.button
          data-dwell={id}
          onClick={() => { playUiClick(); onClick(); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-3 rounded-2xl font-bold transition-all
            ${big ? 'py-5 px-6 text-xl' : 'py-3 px-5 text-base'}
            ${isAct ? 'brightness-110 scale-[1.01]' : ''}`}
          style={{
            background: big
              ? 'linear-gradient(135deg,#FF6B35 0%,#FF8F00 100%)'
              : 'rgba(255,255,255,0.08)',
            border: `1.5px solid ${big ? 'rgba(255,180,50,0.6)' : 'rgba(255,255,255,0.14)'}`,
            boxShadow: big ? '0 6px 28px rgba(255,107,53,0.45)' : 'none',
          }}
        >
          <span className={big ? 'text-3xl' : 'text-xl'}>{icon}</span>
          <div className="text-left">
            <div className="text-white">{label}</div>
            {sub && <div className="text-white/55 text-xs">{sub}</div>}
          </div>
        </motion.button>
        {/* Dwell progress bar */}
        <div
          className="absolute bottom-0 left-0 h-1 rounded-full pointer-events-none transition-none"
          style={{
            width:  `${isAct ? progress * 100 : 0}%`,
            background: '#FF6B35',
            opacity: isAct ? 1 : 0,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0b0e1a 0%,#1a1040 60%,#0b1a2a 100%)' }}
    >
      {/* Hidden video for MediaPipe */}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {/* Animated background hills */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <motion.path
          d="M0,180 C200,80 400,160 600,100 C800,40 1000,130 1200,80 C1350,40 1420,100 1440,90 L1440,200 L0,200 Z"
          fill="rgba(255,107,53,0.12)"
          animate={{ d: [
            "M0,180 C200,80 400,160 600,100 C800,40 1000,130 1200,80 C1350,40 1420,100 1440,90 L1440,200 L0,200 Z",
            "M0,150 C200,120 400,80 600,140 C800,90 1000,60 1200,120 C1350,160 1420,70 1440,130 L1440,200 L0,200 Z",
          ]}}
          transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
        <motion.path
          d="M0,190 C300,120 500,170 700,130 C900,90 1100,160 1300,120 C1400,100 1440,150 1440,150 L1440,200 L0,200 Z"
          fill="rgba(123,104,238,0.10)"
          animate={{ d: [
            "M0,190 C300,120 500,170 700,130 C900,90 1100,160 1300,120 C1400,100 1440,150 1440,150 L1440,200 L0,200 Z",
            "M0,160 C300,190 500,130 700,170 C900,140 1100,110 1300,160 C1400,180 1440,120 1440,170 L1440,200 L0,200 Z",
          ]}}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1 }}
        />
      </svg>

      {/* Stars */}
      {[...Array(18)].map((_, i) => (
        <motion.div key={i}
          className="absolute w-1 h-1 rounded-full bg-white"
          style={{ left: `${(i * 53) % 95 + 2}%`, top: `${(i * 37) % 55 + 2}%` }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl select-none"
          style={{ filter: 'drop-shadow(0 0 24px rgba(255,107,53,0.7))' }}
        >
          🚙
        </motion.div>

        <div className="text-center">
          <h1 className="text-4xl font-black text-white leading-tight">
            Gesture Hill
          </h1>
          <h1 className="text-4xl font-black leading-tight text-gradient-orange">
            Adventure
          </h1>
          <p className="text-white/50 text-sm mt-2 tracking-widest uppercase">
            Drive with your hand · KinetoFun
          </p>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 w-full">
          {[
            { label: 'Best', value: `${Math.floor(save.bestDistance)}m`, icon: '📏' },
            { label: 'Score', value: save.highScore.toLocaleString(), icon: '⭐' },
            { label: 'Coins', value: save.coins.toLocaleString(), icon: '🪙' },
          ].map(s => (
            <div key={s.label}
              className="flex-1 glass rounded-xl py-2 px-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-white font-bold text-sm">{s.value}</div>
              <div className="text-white/45 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <DBtn id="play"  label="PLAY NOW"  icon="▶" sub="Raise your hand to drive" onClick={onPlay} big />
          <div className="grid grid-cols-2 gap-3">
            <DBtn id="garage"   label="Garage"    icon="🏎️" sub={`${save.coins} coins`} onClick={onGarage} />
            <DBtn id="howtoplay" label="How To Play" icon="📖" onClick={onHowToPlay} />
            <DBtn id="stats"    label="Statistics" icon="📊" onClick={onStats} />
            <DBtn id="settings" label="Settings"   icon="⚙️" onClick={onSettings} />
          </div>
        </div>

        {/* Hand detection status */}
        <div className="flex items-center gap-2 glass rounded-full px-4 py-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className="text-white/60">
            {hand.detected ? 'Hand detected — hover buttons 0.9s to select' : 'Awaiting camera…'}
          </span>
        </div>
      </motion.div>

      {/* Hand cursor */}
      <AnimatePresence>
        {hand.detected && (
          <motion.div
            key="cursor"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="pointer-events-none fixed z-50"
            style={{
              left: hand.x * window.innerWidth  - CURSOR_R,
              top:  hand.y * window.innerHeight - CURSOR_R,
              width: CURSOR_R * 2, height: CURSOR_R * 2,
            }}
          >
            <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
              <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3}
                fill="none" stroke="rgba(255,107,53,0.35)" strokeWidth="2.5" />
              {activeId && (
                <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3}
                  fill="none" stroke="#FF6B35" strokeWidth="2.5"
                  strokeDasharray={`${progress * (CURSOR_R - 3) * Math.PI * 2} 999`}
                  strokeDashoffset={((CURSOR_R - 3) * Math.PI * 2) * 0.25}
                  transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`}
                />
              )}
              <circle cx={CURSOR_R} cy={CURSOR_R} r={9}
                fill="#FF6B35" fillOpacity="0.9" />
              <circle cx={CURSOR_R} cy={CURSOR_R} r={4}
                fill="white" fillOpacity="0.9" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
