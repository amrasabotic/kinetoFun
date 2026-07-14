import { useEffect, useRef } from 'react';
import type { HandState } from './types';

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handState: HandState;
}

export default function WebcamPreview({ videoRef, handState }: WebcamPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;

    function draw() {
      if (!canvas || !ctx) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        // Draw mirrored video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Camera loading...', canvas.width / 2, canvas.height / 2);
      }

      // Draw hand landmark dot
      if (handState.isTracking && handState.cursorX >= 0) {
        // Video is drawn already mirrored; cursorX is the mirrored position, so map directly
        const px = handState.cursorX * canvas.width;
        const py = handState.cursorY * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, handState.isPinching ? 6 : 8, 0, Math.PI * 2);
        ctx.fillStyle = handState.isPinching ? '#fb923c' : 'rgba(251,146,60,0.8)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      frame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frame);
  }, [videoRef, handState]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={192}
          height={144}
          className="block"
        />
        {/* Status badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              handState.isTracking ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-white text-xs font-bold drop-shadow">
            {handState.isTracking ? 'Tracking' : 'No hand'}
          </span>
        </div>
        {/* Gesture indicator */}
        {handState.isPinching && (
          <div className="absolute bottom-2 left-2 bg-orange-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            SELECT
          </div>
        )}
      </div>
    </div>
  );
}
