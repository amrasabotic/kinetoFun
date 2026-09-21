import { useEffect, useRef } from 'react';

/** A visible, mirrored preview of the shared (hidden) tracking video stream — used only on the Calibration screen. */
export default function CameraPreview({
  sourceVideoRef,
  className = '',
}: {
  sourceVideoRef: React.RefObject<HTMLVideoElement>;
  className?: string;
}) {
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let raf = 0;
    function sync() {
      const src = sourceVideoRef.current?.srcObject;
      if (src && previewRef.current && previewRef.current.srcObject !== src) {
        previewRef.current.srcObject = src;
        previewRef.current.play().catch(() => {});
      }
      raf = requestAnimationFrame(sync);
    }
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [sourceVideoRef]);

  return (
    <video
      ref={previewRef}
      playsInline
      muted
      className={className}
      style={{ objectFit: 'cover' }}
    />
  );
}
