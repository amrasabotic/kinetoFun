'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

// next-themes renders a <script> for no-flash theme detection.
// React 19 warns that scripts inside components won't execute on the client.
// This is a known upstream issue (pacocoursey/next-themes#279) — theme
// behaviour is unaffected. Suppress the one specific warning until next-themes
// ships a fix that uses <template> instead.
if (typeof window !== 'undefined') {
  const _orig = console.error.bind(console);
  console.error = (...args: Parameters<typeof console.error>) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    _orig(...args);
  };
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
