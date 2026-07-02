import { useGesture } from '../../mediaPipe/GestureProvider';
import { useSettingsStore } from '../../stores/settingsStore';

export default function GestureCursorDot() {
  const { frame } = useGesture();
  const largerCursor = useSettingsStore((s) => s.largerCursor);
  const highContrast = useSettingsStore((s) => s.highContrast);

  if (!frame.detected) return null;

  const size = largerCursor ? 44 : 26;
  const left = frame.cursorX * window.innerWidth;
  const top = frame.cursorY * window.innerHeight;

  return (
    <div
      className="fixed z-[9999] pointer-events-none rounded-full"
      style={{
        left, top, width: size, height: size,
        transform: 'translate(-50%, -50%)',
        background: highContrast
          ? 'radial-gradient(circle, #FFFF00 0%, #FFFF0055 70%, transparent 100%)'
          : 'radial-gradient(circle, #ffffff 0%, #8C5CFF88 60%, transparent 100%)',
        border: `2px solid ${highContrast ? '#000' : 'rgba(255,255,255,0.9)'}`,
        boxShadow: '0 0 12px 2px rgba(140,92,255,0.6)',
        transition: 'width 0.15s, height 0.15s',
      }}
    />
  );
}
