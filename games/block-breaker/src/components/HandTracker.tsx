import { useEffect, useRef, useState } from "react";
import { getHandLandmarker } from "@/lib/hand-tracker";

interface Props {
  onX: (normX: number | null) => void;
  active: boolean;
}

/** Mini webcam preview with a horizontal guideline. Emits normalized X (0..1). */
export function HandTracker({ onX, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        const hl = await getHandLandmarker();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStatus("ready");

        const loop = () => {
          if (cancelled) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          const ts = performance.now();
          if (ts - lastTsRef.current > 16) {
            lastTsRef.current = ts;
            const res = hl.detectForVideo(v, ts);
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

            if (res.landmarks && res.landmarks.length > 0) {
              // index finger tip = landmark 8, palm center ~ 9
              const pts = res.landmarks[0];
              const palm = pts[9];
              // mirror x
              const x = 1 - palm.x;
              onX(x);
              const cx = x * c.width;
              const cy = palm.y * c.height;
              ctx.fillStyle = "rgba(255,80,200,0.9)";
              ctx.beginPath();
              ctx.arc(cx, cy, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "rgba(255,255,255,0.9)";
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              onX(null);
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        console.error(e);
        setStatus((e as Error).name === "NotAllowedError" ? "denied" : "error");
      }
    }

    if (active) start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [active, onX]);

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
