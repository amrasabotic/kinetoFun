import type { OppositeGlyph } from '../../data/opposites';

interface Props {
  glyph: OppositeGlyph;
  size?: number;
  className?: string;
}

export default function OppositeIcon({ glyph, size = 64, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      {glyph === 'big' && <circle cx="32" cy="32" r="26" fill="#F07A26" />}
      {glyph === 'small' && <circle cx="32" cy="32" r="10" fill="#F07A26" />}

      {glyph === 'hot' && (
        <g>
          <rect x="26" y="10" width="12" height="34" rx="6" fill="#E4362E" />
          <circle cx="32" cy="48" r="10" fill="#E4362E" />
        </g>
      )}
      {glyph === 'cold' && (
        <g stroke="#4A90D9" strokeWidth="3" strokeLinecap="round">
          <line x1="32" y1="10" x2="32" y2="54" />
          <line x1="10" y1="32" x2="54" y2="32" />
          <line x1="16" y1="16" x2="48" y2="48" />
          <line x1="48" y1="16" x2="16" y2="48" />
        </g>
      )}

      {glyph === 'fast' && (
        <g fill="none" stroke="#2FA35A" strokeWidth="4" strokeLinecap="round">
          <line x1="8" y1="22" x2="38" y2="22" />
          <line x1="8" y1="32" x2="48" y2="32" />
          <line x1="8" y1="42" x2="38" y2="42" />
        </g>
      )}
      {glyph === 'slow' && (
        <g fill="none" stroke="#9B4FD6" strokeWidth="4" strokeLinecap="round">
          <line x1="20" y1="32" x2="44" y2="32" />
        </g>
      )}

      {glyph === 'up' && (
        <polygon points="32,10 50,40 14,40" fill="#F4C430" />
      )}
      {glyph === 'down' && (
        <polygon points="32,54 14,24 50,24" fill="#F4C430" />
      )}

      {glyph === 'happy' && (
        <g>
          <circle cx="32" cy="32" r="24" fill="#FFD75A" />
          <circle cx="24" cy="26" r="3" fill="#1a0e3d" />
          <circle cx="40" cy="26" r="3" fill="#1a0e3d" />
          <path d="M20 38 Q32 50 44 38" fill="none" stroke="#1a0e3d" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {glyph === 'sad' && (
        <g>
          <circle cx="32" cy="32" r="24" fill="#8FBCE6" />
          <circle cx="24" cy="26" r="3" fill="#1a0e3d" />
          <circle cx="40" cy="26" r="3" fill="#1a0e3d" />
          <path d="M20 46 Q32 34 44 46" fill="none" stroke="#1a0e3d" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {glyph === 'day' && (
        <g>
          <circle cx="32" cy="32" r="14" fill="#FFD700" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 360) / 8;
            const rad = (angle * Math.PI) / 180;
            const x1 = 32 + Math.cos(rad) * 20;
            const y1 = 32 + Math.sin(rad) * 20;
            const x2 = 32 + Math.cos(rad) * 27;
            const y2 = 32 + Math.sin(rad) * 27;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />;
          })}
        </g>
      )}
      {glyph === 'night' && (
        <path d="M40 12 A20 20 0 1 0 40 52 A16 16 0 0 1 40 12 Z" fill="#5C4CBF" />
      )}

      {glyph === 'open' && (
        <g fill="none" stroke="#2FA35A" strokeWidth="4">
          <rect x="10" y="14" width="20" height="36" rx="2" />
          <line x1="40" y1="14" x2="54" y2="20" strokeLinecap="round" />
        </g>
      )}
      {glyph === 'closed' && (
        <rect x="14" y="14" width="36" height="36" rx="2" fill="none" stroke="#E4362E" strokeWidth="4" />
      )}

      {glyph === 'full' && (
        <rect x="18" y="10" width="28" height="44" rx="4" fill="#4A90D9" />
      )}
      {glyph === 'empty' && (
        <rect x="18" y="10" width="28" height="44" rx="4" fill="none" stroke="#4A90D9" strokeWidth="3" />
      )}

      {glyph === 'tall' && (
        <rect x="26" y="6" width="12" height="52" rx="4" fill="#9B4FD6" />
      )}
      {glyph === 'short' && (
        <rect x="20" y="38" width="24" height="20" rx="4" fill="#9B4FD6" />
      )}

      {glyph === 'wet' && (
        <path d="M32 10 C40 26 48 34 48 42 A16 16 0 0 1 16 42 C16 34 24 26 32 10 Z" fill="#4A90D9" />
      )}
      {glyph === 'dry' && (
        <g stroke="#D9A441" strokeWidth="3" strokeLinecap="round">
          <line x1="32" y1="12" x2="32" y2="52" />
          <line x1="18" y1="24" x2="32" y2="32" />
          <line x1="46" y1="24" x2="32" y2="32" />
          <line x1="18" y1="44" x2="32" y2="36" />
          <line x1="46" y1="44" x2="32" y2="36" />
        </g>
      )}

      {glyph === 'loud' && (
        <g fill="none" stroke="#F07A26" strokeWidth="3" strokeLinecap="round">
          <polygon points="10,26 22,26 32,16 32,48 22,38 10,38" fill="#F07A26" stroke="none" />
          <path d="M38 20 Q48 32 38 44" />
          <path d="M44 14 Q58 32 44 50" />
        </g>
      )}
      {glyph === 'quiet' && (
        <g fill="none" stroke="#9B4FD6" strokeWidth="3" strokeLinecap="round">
          <polygon points="14,26 24,26 32,18 32,46 24,38 14,38" fill="#9B4FD6" stroke="none" />
          <line x1="40" y1="26" x2="48" y2="38" />
          <line x1="48" y1="26" x2="40" y2="38" />
        </g>
      )}

      {glyph === 'heavy' && (
        <g>
          <rect x="16" y="26" width="32" height="24" rx="3" fill="#6B7280" />
          <path d="M22 26 a10 10 0 0 1 20 0" fill="none" stroke="#6B7280" strokeWidth="4" />
        </g>
      )}
      {glyph === 'light' && (
        <g>
          <ellipse cx="32" cy="26" rx="14" ry="12" fill="#BEE3F8" />
          <line x1="32" y1="36" x2="32" y2="52" stroke="#BEE3F8" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
