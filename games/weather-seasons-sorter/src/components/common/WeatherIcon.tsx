import type { WeatherKind } from '../../data/weather';

interface Props {
  weather: WeatherKind;
  size?: number;
  className?: string;
}

export default function WeatherIcon({ weather, size = 64, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      {weather === 'sunny' && (
        <g>
          <circle cx="32" cy="32" r="14" fill="#FFD700" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 360) / 8;
            const rad = (angle * Math.PI) / 180;
            const x1 = 32 + Math.cos(rad) * 20;
            const y1 = 32 + Math.sin(rad) * 20;
            const x2 = 32 + Math.cos(rad) * 28;
            const y2 = 32 + Math.sin(rad) * 28;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />;
          })}
        </g>
      )}
      {weather === 'snowy' && (
        <g stroke="#BEE3F8" strokeWidth="3" strokeLinecap="round">
          <line x1="32" y1="10" x2="32" y2="54" />
          <line x1="10" y1="32" x2="54" y2="32" />
          <line x1="16" y1="16" x2="48" y2="48" />
          <line x1="48" y1="16" x2="16" y2="48" />
        </g>
      )}
      {weather === 'rainy' && (
        <g>
          <ellipse cx="32" cy="24" rx="18" ry="12" fill="#B0B8C8" />
          {[20, 32, 44].map((x, i) => (
            <line key={i} x1={x} y1="40" x2={x - 4} y2="54" stroke="#4A90D9" strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
      )}
      {weather === 'windy' && (
        <g fill="none" stroke="#8FD3E8" strokeWidth="3" strokeLinecap="round">
          <path d="M10 22 H40 a6 6 0 1 0 -6 -6" />
          <path d="M10 34 H48 a6 6 0 1 1 -6 6" />
          <path d="M10 46 H36" />
        </g>
      )}
      {weather === 'hot' && (
        <g>
          <circle cx="32" cy="26" r="12" fill="#FF8C42" />
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 360) / 6;
            const rad = (angle * Math.PI) / 180;
            const x1 = 32 + Math.cos(rad) * 16;
            const y1 = 26 + Math.sin(rad) * 16;
            const x2 = 32 + Math.cos(rad) * 22;
            const y2 = 26 + Math.sin(rad) * 22;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FF8C42" strokeWidth="3" strokeLinecap="round" />;
          })}
          <rect x="26" y="42" width="12" height="16" rx="6" fill="#FF4E4E" />
        </g>
      )}
      {weather === 'foggy' && (
        <g stroke="#C4CDD8" strokeWidth="4" strokeLinecap="round">
          <line x1="12" y1="20" x2="52" y2="20" />
          <line x1="8" y1="32" x2="56" y2="32" />
          <line x1="14" y1="44" x2="50" y2="44" />
        </g>
      )}
      {weather === 'stormy' && (
        <g>
          <ellipse cx="32" cy="20" rx="18" ry="11" fill="#6B7280" />
          <polygon points="30,32 20,48 28,48 24,58 40,40 32,40" fill="#FFD700" />
        </g>
      )}
      {weather === 'cloudy' && (
        <g>
          <ellipse cx="26" cy="30" rx="14" ry="10" fill="#D8DEE8" />
          <ellipse cx="40" cy="26" rx="16" ry="12" fill="#E8ECF2" />
        </g>
      )}
    </svg>
  );
}
