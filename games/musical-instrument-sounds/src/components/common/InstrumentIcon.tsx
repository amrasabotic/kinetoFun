import type { InstrumentId } from '../../data/instruments';

interface Props {
  instrument: InstrumentId;
  size?: number;
  className?: string;
}

export default function InstrumentIcon({ instrument, size = 64, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      {instrument === 'drum' && (
        <g>
          <ellipse cx="32" cy="18" rx="20" ry="8" fill="#E4362E" />
          <rect x="12" y="18" width="40" height="26" fill="#F07A26" />
          <ellipse cx="32" cy="44" rx="20" ry="8" fill="#C4271F" />
          <ellipse cx="32" cy="18" rx="20" ry="8" fill="none" stroke="#FFD75A" strokeWidth="2" />
        </g>
      )}
      {instrument === 'tambourine' && (
        <g>
          <circle cx="32" cy="32" r="22" fill="none" stroke="#D9A441" strokeWidth="6" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 360) / 8;
            const rad = (angle * Math.PI) / 180;
            const x = 32 + Math.cos(rad) * 22;
            const y = 32 + Math.sin(rad) * 22;
            return <circle key={i} cx={x} cy={y} r="3" fill="#F4C430" />;
          })}
        </g>
      )}
      {instrument === 'xylophone' && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={10 + i * 9} y={16 + i * 2} width="7" height={36 - i * 3} rx="2"
              fill={['#E4362E', '#F07A26', '#F4C430', '#2FA35A', '#4A90D9'][i]} />
          ))}
        </g>
      )}
      {instrument === 'cymbal' && (
        <g>
          <ellipse cx="32" cy="30" rx="24" ry="10" fill="#D9A441" />
          <ellipse cx="32" cy="30" rx="24" ry="10" fill="none" stroke="#F4C430" strokeWidth="2" />
          <circle cx="32" cy="30" r="4" fill="#8C6A1E" />
          <line x1="32" y1="30" x2="32" y2="54" stroke="#5C4326" strokeWidth="3" />
        </g>
      )}
      {instrument === 'maracas' && (
        <g>
          <ellipse cx="20" cy="24" rx="10" ry="14" fill="#F07A26" />
          <line x1="20" y1="38" x2="16" y2="56" stroke="#8C6A1E" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="44" cy="24" rx="10" ry="14" fill="#2FA35A" />
          <line x1="44" y1="38" x2="48" y2="56" stroke="#8C6A1E" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {instrument === 'piano' && (
        <g>
          <rect x="8" y="20" width="48" height="28" fill="#1a0e3d" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={10 + i * 8} y="20" width="7" height="28" fill="#fff" stroke="#ccc" strokeWidth="0.5" />
          ))}
          {[0, 1, 3, 4].map((i) => (
            <rect key={i} x={15 + i * 8} y="20" width="5" height="16" fill="#1a0e3d" />
          ))}
        </g>
      )}
      {instrument === 'guitar' && (
        <g>
          <ellipse cx="32" cy="44" rx="16" ry="14" fill="#D9A441" />
          <circle cx="32" cy="44" r="5" fill="#5C4326" />
          <rect x="28" y="8" width="8" height="32" rx="2" fill="#8C6A1E" />
          <line x1="32" y1="8" x2="32" y2="54" stroke="#3d2b17" strokeWidth="1" />
        </g>
      )}
      {instrument === 'flute' && (
        <g>
          <rect x="8" y="28" width="48" height="8" rx="4" fill="#C0C0C0" />
          {[16, 26, 36, 46].map((x, i) => (
            <circle key={i} cx={x} cy="32" r="2" fill="#1a0e3d" />
          ))}
        </g>
      )}
      {instrument === 'violin' && (
        <g>
          <path d="M32 12 Q40 12 40 22 Q46 26 40 32 Q40 42 32 46 Q24 42 24 32 Q18 26 24 22 Q24 12 32 12 Z" fill="#8C6A1E" />
          <line x1="32" y1="12" x2="32" y2="4" stroke="#5C4326" strokeWidth="3" />
          <line x1="32" y1="46" x2="32" y2="58" stroke="#5C4326" strokeWidth="2" />
        </g>
      )}
      {instrument === 'trumpet' && (
        <g>
          <rect x="10" y="28" width="26" height="6" fill="#F4C430" />
          <polygon points="36,24 54,30 54,36 36,32" fill="#F4C430" />
          <circle cx="18" cy="24" r="3" fill="#D9A441" />
          <circle cx="26" cy="24" r="3" fill="#D9A441" />
        </g>
      )}
    </svg>
  );
}
