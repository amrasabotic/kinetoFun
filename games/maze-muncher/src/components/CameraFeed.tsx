import { useEffect, useRef } from 'react';
import type { HandData, CameraStatus } from '../hooks/useMediaPipe';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  handRef: React.RefObject<HandData>;
  status: CameraStatus;
}

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export default function CameraFeed({ videoRef, handRef, status }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const hand = handRef.current;
      if (canvas && hand) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (hand.detected && hand.landmarks.length >= 21) {
            const lm = hand.landmarks;
            ctx.strokeStyle = 'rgba(57,255,136,0.7)';
            ctx.lineWidth = 1.5;
            for (const [a, b] of CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
              ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
              ctx.stroke();
            }
            for (let i = 0; i < lm.length; i++) {
              ctx.fillStyle = i === 9 ? '#0af0ff' : '#39ff88';
              ctx.beginPath();
              ctx.arc(lm[i].x * canvas.width, lm[i].y * canvas.height, i === 9 ? 4 : 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [handRef]);

  const message =
    status === 'denied'
      ? 'Camera access denied — allow camera permission and reload'
      : status === 'unavailable'
        ? 'No camera found'
        : status === 'lost'
          ? "Can't see a hand — check lighting & step back"
          : status === 'initializing'
            ? 'Starting camera…'
            : null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-1.5 pointer-events-none">
      <div
        className="relative rounded-xl overflow-hidden border-2"
        style={{ width: 168, height: 126, borderColor: status === 'ready' ? 'rgba(57,255,136,0.5)' : 'rgba(255,80,80,0.5)', background: '#000' }}
      >
        <div style={{ transform: 'scaleX(-1)', width: '100%', height: '100%', position: 'relative' }}>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-80" muted playsInline />
          <canvas ref={canvasRef} width={168} height={126} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
        <div className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-emerald-400 animate-pulse-glow' : 'bg-red-500 animate-pulse-glow'}`} />
        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
          {status === 'ready' ? 'Tracking' : status}
        </span>
      </div>
      {message && (
        <div className="max-w-[210px] bg-black/75 rounded-lg px-2.5 py-1.5 text-[11px] text-white/85 text-right leading-snug">
          {message}
        </div>
      )}
    </div>
  );
}
