import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/games/connect-2-balls/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
