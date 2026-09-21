'use client';
import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    // Relative URL to the explicit index.html: works from file:// and any base path,
    // and static hosts (incl. Next's public/ folder) don't serve directory indexes.
    window.location.replace('./home/index.html');
  }, []);
  return null;
}
