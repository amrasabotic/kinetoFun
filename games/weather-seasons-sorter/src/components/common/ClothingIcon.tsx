import type { ClothingKind } from '../../data/weather';

interface Props {
  clothing: ClothingKind;
  size?: number;
  className?: string;
}

export default function ClothingIcon({ clothing, size = 64, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      {clothing === 'sunhat' && (
        <g>
          <ellipse cx="32" cy="40" rx="26" ry="7" fill="#F4C430" />
          <path d="M18 40 Q18 20 32 20 Q46 20 46 40 Z" fill="#FFD75A" />
        </g>
      )}
      {clothing === 'mittens' && (
        <g fill="#E4362E">
          <path d="M14 24 a10 10 0 0 1 20 0 v18 a10 10 0 0 1 -20 0 Z" />
          <path d="M30 44 a10 10 0 0 1 20 0 v6 a10 10 0 0 1 -20 0 Z" />
        </g>
      )}
      {clothing === 'raincoat' && (
        <g fill="#2A5CD6">
          <path d="M20 16 L32 10 L44 16 L48 26 L40 24 V54 H24 V24 L16 26 Z" />
        </g>
      )}
      {clothing === 'kite' && (
        <g>
          <polygon points="32,10 48,28 32,54 16,28" fill="#F07A26" />
          <line x1="32" y1="54" x2="32" y2="60" stroke="#8C5CFF" strokeWidth="2" />
          <line x1="10" y1="14" x2="32" y2="10" stroke="#8C5CFF" strokeWidth="2" />
        </g>
      )}
      {clothing === 'sunglasses' && (
        <g fill="none" stroke="#1a0e3d" strokeWidth="4">
          <circle cx="20" cy="32" r="10" fill="#1a0e3d" />
          <circle cx="44" cy="32" r="10" fill="#1a0e3d" />
          <line x1="30" y1="30" x2="34" y2="30" />
          <line x1="10" y1="26" x2="4" y2="22" />
          <line x1="54" y1="26" x2="60" y2="22" />
        </g>
      )}
      {clothing === 'sweater' && (
        <g fill="#9B4FD6">
          <path d="M18 18 L26 14 L32 20 L38 14 L46 18 L46 26 L40 24 V50 H24 V24 L18 26 Z" />
        </g>
      )}
      {clothing === 'umbrella' && (
        <g>
          <path d="M10 30 A22 22 0 0 1 54 30 Z" fill="#2FA35A" />
          <line x1="32" y1="30" x2="32" y2="56" stroke="#5C4326" strokeWidth="3" />
          <path d="M32 56 q6 0 6 -6" fill="none" stroke="#5C4326" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {clothing === 'jacket' && (
        <g fill="#F07A26">
          <path d="M18 18 L28 12 L32 18 L36 12 L46 18 L48 28 L40 26 V52 H24 V26 L16 28 Z" />
        </g>
      )}
    </svg>
  );
}
