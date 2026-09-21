import { COINS } from '../../data/coins';

interface Props {
  coinValue: 1 | 5 | 10 | 25;
  size?: number;
  className?: string;
}

export default function CoinIcon({ coinValue, size = 48, className = '' }: Props) {
  const coin = COINS.find((c) => c.value === coinValue);
  if (!coin) return null;

  const sizeMap = { small: 36, medium: 44, large: 56 };
  const coinSize = sizeMap[coin.size];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      <circle cx="32" cy="32" r={coinSize / 2} fill={coin.color} stroke="#000" strokeWidth="1.5" />
      <circle cx="32" cy="32" r={coinSize / 2 - 3} fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#000" opacity="0.7">
        {coinValue}¢
      </text>
    </svg>
  );
}
