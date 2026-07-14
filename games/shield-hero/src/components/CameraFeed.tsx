import React, { useEffect, useRef } from 'react';

interface CameraFeedProps {
  onVideoReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<boolean> | void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (videoRef.current && canvasRef.current && !startedRef.current) {
      startedRef.current = true;
      onVideoReady(videoRef.current, canvasRef.current);
    }
  }, [onVideoReady]);

  return (
    <div className="absolute bottom-4 right-4 z-40 overflow-hidden rounded-xl shadow-2xl border-2 border-slate-700">
      <div className="relative" style={{ width: 320, height: 240 }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />

        <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded text-xs text-slate-300">
          Hand Tracker
        </div>

        <div className="absolute bottom-2 right-2 px-2 py-1 bg-emerald-500/80 backdrop-blur-sm rounded text-xs text-white">
          Move finger on circle
        </div>
      </div>
    </div>
  );
};
