'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useDwellNav } from '../../hooks/useDwellNav';
import { DwellButton } from '../../components/DwellButton';
import { CameraError } from '../../components/CameraError';
import { HowToPlayOverlay, HOWTO_CONTINUE_ID, claimHomeHowTo, markHowToSeen } from '../../components/HowToPlayOverlay';
import { GameStorage } from '../../storage/GameStorage';
import type { HandPosition } from '../../types/gestures';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';

const analyzerRef = { current: new GestureAnalyzer() };

const BUTTON_W = 320;
const BUTTON_H = 72;
// Buttons ignore the hand for a moment after they appear, so a hand already
// resting there cannot skip the instructions or press a menu button unread.
const ARM_DELAY_MS = 1500;

export default function HomePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // How To Play opens over the menu as soon as the game loads. It starts
  // visible so it is there even before hydration; returning to home later
  // in the same page load closes it straight away.
  const [howTo, setHowTo] = useState(true);
  const [howToArmed, setHowToArmed] = useState(false);
  const [menuArmed, setMenuArmed] = useState(false);
  const [continueRect, setContinueRect] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);

  useEffect(() => {
    setBestScore(GameStorage.getBestScore());
    if (!claimHomeHowTo()) {
      setHowTo(false);
      setMenuArmed(true);
    }
  }, []);

  useEffect(() => {
    if (!howTo) return;
    const armTimer = setTimeout(() => setHowToArmed(true), ARM_DELAY_MS);
    function measure() {
      const el = document.querySelector(`[data-dwell-id="${HOWTO_CONTINUE_ID}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setContinueRect([{ id: HOWTO_CONTINUE_ID, x: r.left, y: r.top, w: r.width, h: r.height }]);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener('resize', measure);
    };
  }, [howTo]);

  useEffect(() => {
    if (howTo || menuArmed) return;
    const t = setTimeout(() => setMenuArmed(true), ARM_DELAY_MS);
    return () => clearTimeout(t);
  }, [howTo, menuArmed]);

  const handleHowToContinue = useCallback(() => {
    markHowToSeen();
    setHowTo(false);
  }, []);

  useEffect(() => {
    function updateRects() {
      if (!containerRef.current) return;
      const btns = containerRef.current.querySelectorAll('[data-dwell-id]');
      const rects: typeof buttonRects = [];
      btns.forEach((el) => {
        const id = el.getAttribute('data-dwell-id') ?? '';
        const rect = el.getBoundingClientRect();
        rects.push({ id, x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      });
      setButtonRects(rects);
    }
    updateRects();
    window.addEventListener('resize', updateRects);
    return () => window.removeEventListener('resize', updateRects);
  }, []);

  const handleHandResults = useCallback(
    (landmarks: HandLandmark[][], handedness: Array<{ label: string; score: number; index: number }>) => {
      const positions = analyzerRef.current.analyzeHands(landmarks, handedness);
      setHandPositions(positions);
    },
    []
  );

  useMediaPipe(videoRef, {
    onPoseResults: () => {},
    onHandResults: handleHandResults,
    onCameraError: (err) => setCameraError(err.message),
    onReady: () => {},
    enabled: true,
    cameraWidth: 320,
    cameraHeight: 240,
  });

  const { hoveredId, dwellProgress } = useDwellNav({
    buttons: buttonRects,
    handPositions,
    onActivate: (id) => {
      if (id === 'start') router.push('/calibration');
      if (id === 'characters') router.push('/characters');
      if (id === 'challenges') router.push('/challenges');
      if (id === 'settings') router.push('/settings');
    },
    enabled: !howTo && menuArmed,
  });

  const { hoveredId: howToHoveredId, dwellProgress: howToProgress } = useDwellNav({
    buttons: continueRect,
    handPositions,
    onActivate: () => handleHowToContinue(),
    enabled: howTo && howToArmed,
  });

  const primaryHand = handPositions.find((h) => h.visible);

  if (cameraError) return <CameraError error={cameraError} />;

  return (
    <div className="fixed inset-0 bg-[#000818] flex">
      {/* Hand cursor */}
      {primaryHand && typeof window !== 'undefined' && (
        <div
          className="fixed pointer-events-none z-[110] w-8 h-8 rounded-full border-4 border-[#00ffcc] transition-none"
          style={{
            left: primaryHand.x * window.innerWidth - 16,
            top: primaryHand.y * window.innerHeight - 16,
            backgroundColor: 'rgba(0,255,204,0.15)',
            boxShadow: '0 0 16px #00ffcc',
          }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10" ref={containerRef}>
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="text-lg text-[#00ffcc] uppercase tracking-[0.3em] mb-2 font-bold">KinetoFun presents</div>
          <h1
            className="text-7xl font-black text-white"
            style={{
              textShadow: '0 0 40px #00ffcc80, 0 0 80px #00ffcc40',
              letterSpacing: '0.05em',
            }}
          >
            GESTURE
          </h1>
          <h1
            className="text-7xl font-black"
            style={{
              color: '#00ffcc',
              textShadow: '0 0 40px #00ffcc, 0 0 80px #00ffcc80',
              letterSpacing: '0.05em',
            }}
          >
            RUNNER
          </h1>
          {bestScore > 0 && (
            <div className="mt-4 text-[#ffe04d] text-xl font-bold">
              Best Score: {bestScore.toLocaleString()}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <div data-dwell-id="start">
            <DwellButton
              label="START GAME"
              isHovered={hoveredId === 'start'}
              dwellProgress={hoveredId === 'start' ? dwellProgress : 0}
              onActivate={() => router.push('/calibration')}
              variant="primary"
              icon="▶"
            />
          </div>
          <div data-dwell-id="characters">
            <DwellButton
              label="CHARACTERS"
              isHovered={hoveredId === 'characters'}
              dwellProgress={hoveredId === 'characters' ? dwellProgress : 0}
              onActivate={() => router.push('/characters')}
              variant="secondary"
              icon="★"
            />
          </div>
          <div data-dwell-id="challenges">
            <DwellButton
              label="DAILY CHALLENGES"
              isHovered={hoveredId === 'challenges'}
              dwellProgress={hoveredId === 'challenges' ? dwellProgress : 0}
              onActivate={() => router.push('/challenges')}
              variant="secondary"
              icon="◆"
            />
          </div>
          <div data-dwell-id="settings">
            <DwellButton
              label="SETTINGS"
              isHovered={hoveredId === 'settings'}
              dwellProgress={hoveredId === 'settings' ? dwellProgress : 0}
              onActivate={() => router.push('/settings')}
              variant="secondary"
              icon="⚙"
            />
          </div>
        </div>

        <p className="text-gray-600 text-sm">Hover over buttons with your hand to select</p>
      </div>

      {/* Camera preview bottom-right */}
      <div className="fixed bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border border-gray-800 bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          playsInline
          muted
        />
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-green-500" />
      </div>

      {howTo && (
        <HowToPlayOverlay
          isHovered={howToHoveredId === HOWTO_CONTINUE_ID}
          dwellProgress={howToProgress}
          onContinue={handleHowToContinue}
        />
      )}
    </div>
  );
}
