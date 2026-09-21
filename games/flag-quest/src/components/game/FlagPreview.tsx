import type { FlagDef } from '../../types';
import { colorHex } from '../../flags/palette';

/** Renders a flag fully painted with its correct colors — used for thumbnails/previews. */
export default function FlagPreview({ flag, className = '' }: { flag: FlagDef; className?: string }) {
  const [w, h] = flag.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="xMidYMid slice">
      {flag.regions.map((r) => (
        <polygon key={r.id} points={r.points.map((p) => p.join(',')).join(' ')} fill={colorHex(r.colorId)} />
      ))}
    </svg>
  );
}
