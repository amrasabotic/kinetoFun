import { useEffect, useRef } from "react";
import { useHand } from "@/lib/hand-context";

interface Props {
  onX: (normX: number | null) => void;
  active: boolean;
}

/**
 * Mini webcam preview with a horizontal guideline. Emits normalized palm X
 * (0..1) while active. Camera and detection are shared (HandProvider), so the
 * menus stay hand-controlled before and after a match.
 */
export function HandTracker({ onX, active }: Props) {
  const { sample, stream, status } = useHand();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      const ctx = c.getContext("2d")!;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      // mirror
      ctx.save();
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0);
      ctx.restore();

      // guideline
      const guideY = c.height * 0.5;
      ctx.strokeStyle = "rgba(0,255,180,0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, guideY);
      ctx.lineTo(c.width, guideY);
      ctx.stroke();
      ctx.setLineDash([]);

      const { landmarks, palmX } = sample.current;
      if (active) onX(palmX);
      if (landmarks && palmX != null) {
        const cx = palmX * c.width;
        const cy = landmarks[9].y * c.height;
        ctx.fillStyle = "rgba(255,80,200,0.9)";
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, onX, sample]);

  return (
    <div className="relative w-48 h-36 rounded border-2 border-primary overflow-hidden bg-black shadow-[0_0_20px_var(--primary)]">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-center p-2 bg-black/80 text-primary">
          {status === "loading" && "Loading camera..."}
          {status === "denied" && "Camera access denied"}
          {status === "error" && "Camera error"}
        </div>
      )}
      <div className="absolute top-1 left-1 text-[7px] text-primary bg-black/60 px-1">HAND</div>
    </div>
  );
}
