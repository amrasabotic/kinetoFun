'use client';

import { Suspense, lazy } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
            <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
            </svg>
          </div>
        }
      >
        <Spline scene={scene} className="w-full h-full" />
      </Suspense>
      {/* Cover the "Built with Spline" watermark injected at bottom-right */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-10"
        style={{ width: 220, height: 56, background: 'linear-gradient(to left, rgba(0,0,0,1) 40%, transparent 100%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-10"
        style={{ width: 220, height: 56, background: 'linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%)' }}
      />
    </div>
  );
}
