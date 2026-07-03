import { useState, useEffect, useRef } from 'react';
import { courseById } from '../../data/courses';
import { useRaceStore } from '../../stores/raceStore';
import { playConfirm } from '../../audio/sound';

interface Props {
  courseId: string;
  onExit: () => void;
}

export default function RaceScreen({ courseId, onExit }: Props) {
  const [raceState, setRaceState] = useState({
    lapCount: 0,
    position: 1,
    speed: 0,
    finished: false,
  });

  const course = courseById(courseId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updateRace = useRaceStore((s) => s.completeCourse);

  useEffect(() => {
    if (!course) return;

    // Simulate race logic - this is a placeholder that advances the race
    const interval = setInterval(() => {
      setRaceState((prev) => {
        if (prev.finished) return prev;
        if (prev.lapCount >= course.lapCount) {
          playConfirm();
          updateRace(courseId, 1, 3); // 1st place = 3 coins
          return { ...prev, finished: true };
        }
        return { ...prev, lapCount: prev.lapCount + 0.016, speed: prev.speed + 1 };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [course, courseId, updateRace]);

  if (!course) {
    return <div className="fixed inset-0 bg-black text-white flex items-center justify-center">Course not found</div>;
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1"
        width={1280}
        height={720}
        style={{ background: '#1a1a1a' }}
      />

      {/* HUD */}
      <div className="absolute top-8 left-8 text-white font-bold z-10">
        <div className="text-2xl mb-2">{course.name}</div>
        <div className="text-lg">Lap {Math.floor(raceState.lapCount + 1)} / {course.lapCount}</div>
        <div className="text-sm text-white/70">Speed: {Math.round(raceState.speed)} mph</div>
        <div className="text-sm text-white/70">Position: {raceState.position}</div>
      </div>

      {/* Results screen */}
      {raceState.finished && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4">🏁 Race Finished!</h2>
            <p className="text-xl mb-2">1st Place 🥇</p>
            <p className="text-lg text-yellow-400 mb-6">+3 Coins</p>
            <button
              onClick={onExit}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 text-xs text-white/50">
        Hand-X to steer • Raise hand to accelerate • Lower hand to brake
      </div>
    </div>
  );
}
