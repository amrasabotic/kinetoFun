import { useEffect, useRef } from 'react';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { useSettingsStore } from '../../stores/settingsStore';

/** A visible preview of the shared camera stream (mirrored), used on Calibration screens. */
export default function CameraFeed({ className = '' }: { className?: string }) {
  const { videoRef } = useGesture();
  const previewRef = useRef<HTMLVideoElement>(null);
  const mirror = useSettingsStore((s) => s.mirrorCamera);

  useEffect(() => {
    let raf = 0;
    function sync() {
      const src = videoRef.current?.srcObject;
      if (src && previewRef.current && previewRef.current.srcObject !== src) {
        previewRef.current.srcObject = src;
        previewRef.current.play().catch(() => {});
      }
      raf = requestAnimationFrame(sync);
    }
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  return (
    <video
      ref={previewRef}
      playsInline
      muted
      className={className}
      style={{ transform: mirror ? 'scaleX(-1)' : undefined, objectFit: 'cover' }}
    />
  );
}
