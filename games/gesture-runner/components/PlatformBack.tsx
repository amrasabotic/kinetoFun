'use client';

import { useEffect } from 'react';

// The KinetoFun platform's Back button: from a round or a side screen go to the home screen.
export function PlatformBack() {
  useEffect(() => {
    (window as unknown as { __kfBack?: () => boolean }).__kfBack = () => {
      if (!/\/(game|game-over|challenges|characters|settings)\//.test(window.location.pathname)) return false;
      window.location.assign(new URL('../home/index.html', window.location.href).href);
      return true;
    };
  }, []);
  return null;
}
