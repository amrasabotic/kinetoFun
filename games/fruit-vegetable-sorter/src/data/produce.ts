export type ProduceId =
  | 'apple' | 'banana' | 'strawberry' | 'watermelon' | 'orange' | 'grape'
  | 'carrot' | 'broccoli' | 'lettuce' | 'tomato' | 'bell-pepper' | 'corn';

export type ProduceCategory = 'fruit' | 'vegetable';

export interface Produce {
  id: ProduceId;
  name: string;
  category: ProduceCategory;
  emoji: string;
}

export const PRODUCE_LIST: Produce[] = [
  { id: 'apple', name: 'Apple', category: 'fruit', emoji: '🍎' },
  { id: 'banana', name: 'Banana', category: 'fruit', emoji: '🍌' },
  { id: 'strawberry', name: 'Strawberry', category: 'fruit', emoji: '🍓' },
  { id: 'watermelon', name: 'Watermelon', category: 'fruit', emoji: '🍉' },
  { id: 'orange', name: 'Orange', category: 'fruit', emoji: '🍊' },
  { id: 'grape', name: 'Grape', category: 'fruit', emoji: '🍇' },
  { id: 'carrot', name: 'Carrot', category: 'vegetable', emoji: '🥕' },
  { id: 'broccoli', name: 'Broccoli', category: 'vegetable', emoji: '🥦' },
  { id: 'lettuce', name: 'Lettuce', category: 'vegetable', emoji: '🥬' },
  { id: 'tomato', name: 'Tomato', category: 'vegetable', emoji: '🍅' },
  { id: 'bell-pepper', name: 'Bell Pepper', category: 'vegetable', emoji: '🫑' },
  { id: 'corn', name: 'Corn', category: 'vegetable', emoji: '🌽' },
];

export function produceById(id: string): Produce | undefined {
  return PRODUCE_LIST.find((p) => p.id === id);
}

export function randomProduce(category: ProduceCategory | 'mixed', exclude?: string): Produce {
  const pool = category === 'mixed' ? PRODUCE_LIST : PRODUCE_LIST.filter((p) => p.category === category);
  let candidate: Produce;
  let guard = 0;
  do {
    guard += 1;
    candidate = pool[Math.floor(Math.random() * pool.length)];
  } while (exclude && candidate.id === exclude && guard < 50);
  return candidate;
}

export function distinctDistractorProduce(
  targetId: string,
  category: ProduceCategory | 'mixed',
  count: number,
): Produce[] {
  const pool = PRODUCE_LIST.filter((p) => {
    if (category !== 'mixed' && p.category !== category) return false;
    return p.id !== targetId;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
