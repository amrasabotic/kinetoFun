import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MixItUpGame, Scientist } from './components/MixItUpGame';
import './styles.css';

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (stream) {
    return (
      <MixItUpGame
        stream={stream}
        onExit={() => {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }}
      />
    );
  }

  const handleStart = () => {
    setError(null);
    setLoading(true);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => { setLoading(false); setStream(s); })
      .catch((e) => {
        setLoading(false);
        if (e.name === 'NotAllowedError') setError('Camera access was blocked. Allow it in your browser settings.');
        else if (e.name === 'NotFoundError') setError('No camera found. Please connect a webcam.');
        else setError('Could not start the camera. ' + (e.message || ''));
      });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden" style={{ background: 'var(--lab-bg)' }}>
      <div className="relative z-10 w-full max-w-5xl px-8 grid md:grid-cols-[1fr_320px] gap-10 items-center">
        <div>
          <h1 className="mt-5 text-7xl md:text-8xl font-bold leading-[0.9]" style={{ background: 'linear-gradient(180deg, #fff176 0%, #ff6b9d 60%, #c2185b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MIX IT<br />UP!
          </h1>
          <p className="mt-5 text-xl text-white/95 font-semibold max-w-md">Pinch ingredients out of thin air, drop them in the beaker, and see what science says today.</p>
          <button onClick={handleStart} disabled={loading}
            className="mt-7 text-3xl font-bold text-white px-10 py-5 rounded-3xl border-4 border-[var(--border)] shadow-[0_8px_0_var(--border)] active:translate-y-1 hover:scale-[1.03] transition-transform disabled:opacity-60"
            style={{ background: 'linear-gradient(180deg,#ff6b9d,#c2185b)' }}>
            {loading ? 'STARTING…' : 'START EXPERIMENT 🚀'}
          </button>
          {error && <div className="mt-4 bg-white border-4 border-red-400 rounded-2xl px-4 py-3 text-sm font-semibold max-w-md">⚠️ {error}</div>}
        </div>
        <div className="hidden md:block">
          <div className="relative bg-white rounded-3xl border-4 border-[var(--border)] p-6 shadow-[0_10px_0_var(--border)]">
            <Scientist excited size={0.95} />
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
