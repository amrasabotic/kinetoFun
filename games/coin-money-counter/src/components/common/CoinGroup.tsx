import CoinIcon from './CoinIcon';
import { breakIntoCoins } from '../../data/coins';

interface Props {
  amount: number;
  size?: 'compact' | 'normal' | 'large';
  className?: string;
}

export default function CoinGroup({ amount, size = 'normal', className = '' }: Props) {
  const breakdown = breakIntoCoins(amount);
  const sizeMap = { compact: 36, normal: 48, large: 64 };
  const iconSize = sizeMap[size];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {breakdown.map((coin) =>
        Array.from({ length: coin.count }, (_, i) => (
          <CoinIcon key={`${coin.value}-${i}`} coinValue={coin.value as 1 | 5 | 10 | 25} size={iconSize} />
        )),
      )}
    </div>
  );
}
