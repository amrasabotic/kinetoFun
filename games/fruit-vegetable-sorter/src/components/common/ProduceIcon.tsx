import { produceById } from '../../data/produce';
import type { ProduceId } from '../../data/produce';

interface Props {
  produce: ProduceId;
  size?: number;
  className?: string;
}

export default function ProduceIcon({ produce, size = 64, className = '' }: Props) {
  const item = produceById(produce);
  if (!item) return null;

  return (
    <div className={className} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
      {item.emoji}
    </div>
  );
}
