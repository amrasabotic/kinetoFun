import { useEffect, useRef, useState } from 'react';
import { courseById } from '../../data/courses';
import { useRaceStore } from '../../stores/raceStore';
import { useGesture } from '../../mediaPipe/GestureProvider';
import HoverButton from '../common/HoverButton';
import { buildOvalTrack, startingGridPositions, trackProgress, nearestWaypointIndex, type Track } from '../../game/track';
import { createCar, updateCar, DEFAULT_CAR_PARAMS, type CarKinematic, type CarPhysicsParams } from '../../game/carKinematics';
import { createAIDriver, driveAI, type AIDriver } from '../../game/aiRacer';
import { createLapTracker, addCar, updateCarPosition, type LapTrackerState } from '../../game/lapTracker';
import { playFanfare } from '../../audio/sound';

interface Props {
  courseId: string;
  onExit: () => void;
}

const CAR_IDS = ['player', 'ai1', 'ai2', 'ai3'] as const;
type CarId = (typeof CAR_IDS)[number];

const CAR_COLORS: Record<CarId, string> = {
  player: '#00D4FF',
  ai1: '#FF5252',
  ai2: '#FFC107',
  ai3: '#8BC34A',
};

const ENV_COLORS: Record<string, string> = {
  grassland: '#2E7D32',
  desert: '#C9A227',
  mountain: '#546E7A',
  snow: '#B0BEC5',
  volcano: '#4A1010',
  night: '#0B0F2E',
};

export default function RaceScreen({ courseId, onExit }: Props) {
  const course = courseById(courseId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frameRef } = useGesture();
  const completeCourse = useRaceStore((s) => s.completeCourse);

  const [countdown, setCountdown] = useState(3);
  const [raceOver, setRaceOver] = useState<{ position: number; coins: number } | null>(null);

  const trackRef = useRef<Track | null>(null);
  const carsRef = useRef<Record<CarId, CarKinematic>>({} as Record<CarId, CarKinematic>);
  const aiDriversRef = useRef<Record<string, AIDriver>>({});
  const lapTrackerRef = useRef<LapTrackerState | null>(null);
  const paramsRef = useRef<Record<CarId, CarPhysicsParams>>({} as Record<CarId, CarPhysicsParams>);
  const rafRef = useRef<number>();
  const lastTsRef = useRef<number>(0);
  const raceStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const countdownRef = useRef(3);

  // Canvas fills the window; internal pixel buffer matches CSS size 1:1 so
  // camera math (world px -> screen px) doesn't need extra scale factors.
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Build track, cars, AI drivers, and the lap tracker once per course.
  useEffect(() => {
    if (!course) return;
    const track = buildOvalTrack();
    trackRef.current = track;

    const grid = startingGridPositions(track, CAR_IDS.length);
    const cars = {} as Record<CarId, CarKinematic>;
    const aiDrivers: Record<string, AIDriver> = {};
    const params = {} as Record<CarId, CarPhysicsParams>;

    CAR_IDS.forEach((id, i) => {
      const pos = grid[i];
      cars[id] = createCar(pos.x, pos.y, track.startHeading);
      if (id === 'player') {
        params[id] = { ...DEFAULT_CAR_PARAMS };
      } else {
        aiDrivers[id] = createAIDriver(track, pos.x, pos.y);
        const variance = 0.92 + i * 0.06;
        params[id] = { ...DEFAULT_CAR_PARAMS, maxSpeed: DEFAULT_CAR_PARAMS.maxSpeed * course.aiSpeedMultiplier * variance };
      }
    });

    carsRef.current = cars;
    aiDriversRef.current = aiDrivers;
    paramsRef.current = params;

    const tracker = createLapTracker(course.lapCount, track.waypoints.length);
    CAR_IDS.forEach((id) => {
      const c = cars[id];
      addCar(tracker, id, nearestWaypointIndex(track, c.x, c.y));
    });
    lapTrackerRef.current = tracker;

    raceStartedRef.current = false;
    finishedRef.current = false;
    lastTsRef.current = 0;
    setCountdown(3);
    setRaceOver(null);
  }, [courseId, course]);

  // 3-2-1-GO countdown. Controls unlock the instant "GO!" appears.
  useEffect(() => {
    countdownRef.current = countdown;
    if (!course) return;
    if (countdown === 0) raceStartedRef.current = true;
    if (countdown <= -1) return;
    const delay = countdown === 0 ? 500 : 800;
    const t = setTimeout(() => setCountdown((c) => c - 1), delay);
    return () => clearTimeout(t);
  }, [countdown, course]);

  // Main game loop: physics + AI + lap tracking + rendering, all in refs so
  // 60fps updates never trigger a React re-render.
  useEffect(() => {
    if (!course) return;

    function frame(ts: number) {
      const dt = lastTsRef.current ? Math.min(0.05, (ts - lastTsRef.current) / 1000) : 0.016;
      lastTsRef.current = ts;

      const track = trackRef.current;
      const tracker = lapTrackerRef.current;
      const cars = carsRef.current;

      if (track && tracker && cars.player && !finishedRef.current && raceStartedRef.current) {
        const hf = frameRef.current;
        const steer = hf.detected ? Math.max(-1, Math.min(1, (hf.cursorX - 0.5) * 3.2)) : 0;
        let throttle = 0;
        if (hf.detected) {
          if (hf.cursorY < 0.38) throttle = 1;
          else if (hf.cursorY > 0.72) throttle = -1;
        }
        const boost = hf.detected && hf.isFist;

        updateCar(cars.player, throttle, steer, boost, paramsRef.current.player, dt);

        for (const id of CAR_IDS) {
          if (id === 'player') continue;
          const driver = aiDriversRef.current[id];
          const input = driveAI(driver, cars[id], track);
          updateCar(cars[id], input.throttle, input.steer, false, paramsRef.current[id], dt);
        }

        const now = performance.now();
        for (const id of CAR_IDS) {
          updateCarPosition(tracker, id, nearestWaypointIndex(track, cars[id].x, cars[id].y), now);
        }

        const playerCar = tracker.cars.find((c) => c.id === 'player')!;
        if (playerCar.finished) {
          finishedRef.current = true;
          const rank = 1 + tracker.cars.filter(
            (c) => c.id !== 'player' && c.finished && (c.finishTime ?? Infinity) <= (playerCar.finishTime ?? Infinity),
          ).length;
          const coins = rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0;
          completeCourse(courseId, rank, coins);
          playFanfare();
          setRaceOver({ position: rank, coins });
        }
      }

      draw();
      rafRef.current = requestAnimationFrame(frame);
    }

    function draw() {
      const canvas = canvasRef.current;
      const track = trackRef.current;
      const cars = carsRef.current;
      const tracker = lapTrackerRef.current;
      if (!canvas || !track || !cars.player || !course) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = ENV_COLORS[course.environment] ?? '#222';
      ctx.fillRect(0, 0, w, h);

      const camX = cars.player.x - w / 2;
      const camY = cars.player.y - h / 2;

      ctx.save();
      ctx.translate(-camX, -camY);

      // Track surface
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3A3A3A';
      ctx.lineWidth = track.width;
      ctx.beginPath();
      track.waypoints.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Lane dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 6;
      ctx.setLineDash([26, 22]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Checkered start/finish line
      const sp = track.startPoint;
      const checkSize = 16;
      const rows = Math.floor(track.width / (2 * checkSize));
      for (let i = -rows; i < rows; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#111';
        ctx.fillRect(sp.x - 6, sp.y + i * checkSize, 12, checkSize);
      }

      // Cars
      for (const id of CAR_IDS) {
        const c = cars[id];
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.heading);
        ctx.fillStyle = CAR_COLORS[id];
        ctx.fillRect(-18, -11, 36, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(4, -8, 10, 16);
        ctx.restore();
      }

      ctx.restore();

      // HUD
      if (tracker) {
        const playerCar = tracker.cars.find((c) => c.id === 'player')!;
        const lap = Math.min(course.lapCount, playerCar.lapCount + 1);
        const speedMph = Math.round(Math.abs(cars.player.speed) / 4.4);

        const ranked = [...CAR_IDS].sort((a, b) => {
          const ca = tracker.cars.find((c) => c.id === a)!;
          const cb = tracker.cars.find((c) => c.id === b)!;
          const pa = ca.lapCount + trackProgress(track, cars[a].x, cars[a].y);
          const pb = cb.lapCount + trackProgress(track, cars[b].x, cars[b].y);
          return pb - pa;
        });
        const position = ranked.indexOf('player') + 1;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(16, 16, 260, 96);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(course.name, 28, 42);
        ctx.font = '16px sans-serif';
        ctx.fillText(`Lap ${lap} / ${course.lapCount}`, 28, 66);
        ctx.fillText(`Speed: ${speedMph} mph   Pos: ${position}/4`, 28, 88);
      }

      if (countdownRef.current > -1) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 96px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(countdownRef.current > 0 ? String(countdownRef.current) : 'GO!', w / 2, h / 2);
        ctx.textAlign = 'left';
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [course, courseId, completeCourse, frameRef]);

  if (!course) {
    return <div className="fixed inset-0 bg-black text-white flex items-center justify-center">Course not found</div>;
  }

  return (
    <div className="fixed inset-0 bg-black text-white">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      <div className="absolute top-4 right-4 z-10">
        <HoverButton onActivate={onExit} ringColor="#FF6B6B" dwellMs={900} className="px-4 py-2 rounded-full bg-black/40 border border-white/15 text-xs font-semibold">
          Quit Race
        </HoverButton>
      </div>

      <div className="absolute bottom-8 left-8 text-xs text-white/60 z-10">
        Hand-X to steer &bull; Raise hand to accelerate &bull; Lower hand to brake &bull; Fist to boost
      </div>

      {raceOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4">🏁 Race Finished!</h2>
            <p className="text-xl mb-2">
              {raceOver.position === 1 ? '1st Place 🥇' : raceOver.position === 2 ? '2nd Place 🥈' : raceOver.position === 3 ? '3rd Place 🥉' : `${raceOver.position}th Place`}
            </p>
            <p className="text-lg text-yellow-400 mb-6">+{raceOver.coins} Coins</p>
            <button
              onClick={onExit}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
