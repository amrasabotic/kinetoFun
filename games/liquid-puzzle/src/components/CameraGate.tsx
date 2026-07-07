import type { ReactNode } from 'react';
import { useGestureContext } from '../mediaPipe/GestureProvider';

export function CameraGate({ children }: { children: ReactNode }) {
  const { status } = useGestureContext();

  if (status === 'no-camera' || status === 'error') {
    return (
      <div className="lp-screen lp-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Liquid Puzzle needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }

  if (status === 'initializing') {
    return (
      <div className="lp-screen lp-camera-gate">
        <h2>Starting hand tracking…</h2>
        <p>Please stand in front of the camera.</p>
      </div>
    );
  }

  return <>{children}</>;
}
