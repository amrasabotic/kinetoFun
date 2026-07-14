import HoverButton from './HoverButton';
import { useCameraDevices } from '../../gestures/useCameraDevices';

/** Gesture-only camera picker — hover-dwell cycles through available devices (replaces a native <select>, which can't be gesture-driven). */
export default function CameraCycleButton({
  deviceId,
  onChange,
}: {
  deviceId: string | null;
  onChange: (id: string | null) => void;
}) {
  const { devices } = useCameraDevices(deviceId);

  if (devices.length <= 1) {
    return <div className="px-4 py-2.5 rounded-lg bg-white/5 text-white/50 text-sm text-center">Default Camera</div>;
  }

  const options: (string | null)[] = [null, ...devices.map((d) => d.deviceId)];
  const labelFor = (id: string | null) => (id === null ? 'Default Camera' : (devices.find((d) => d.deviceId === id)?.label || 'Camera'));
  const currentIndex = Math.max(0, options.indexOf(deviceId));

  function next() {
    onChange(options[(currentIndex + 1) % options.length]);
  }

  return (
    <HoverButton onSelect={next} className="w-full rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-white/10 text-white text-sm font-bold text-center">
        📷 {labelFor(deviceId)}
        <div className="text-[10px] text-white/40 font-normal mt-0.5">hover to switch camera</div>
      </div>
    </HoverButton>
  );
}
