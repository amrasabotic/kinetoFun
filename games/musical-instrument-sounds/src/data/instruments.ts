export type InstrumentId =
  | 'drum' | 'tambourine' | 'xylophone' | 'cymbal' | 'maracas'
  | 'piano' | 'guitar' | 'flute' | 'violin' | 'trumpet';

export type InstrumentFamily = 'percussion' | 'melodic';

export interface Instrument {
  id: InstrumentId;
  name: string;
  family: InstrumentFamily;
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'drum', name: 'Drum', family: 'percussion' },
  { id: 'tambourine', name: 'Tambourine', family: 'percussion' },
  { id: 'xylophone', name: 'Xylophone', family: 'percussion' },
  { id: 'cymbal', name: 'Cymbal', family: 'percussion' },
  { id: 'maracas', name: 'Maracas', family: 'percussion' },
  { id: 'piano', name: 'Piano', family: 'melodic' },
  { id: 'guitar', name: 'Guitar', family: 'melodic' },
  { id: 'flute', name: 'Flute', family: 'melodic' },
  { id: 'violin', name: 'Violin', family: 'melodic' },
  { id: 'trumpet', name: 'Trumpet', family: 'melodic' },
];

export function instrumentById(id: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

function poolForFamily(family: InstrumentFamily | 'mixed'): Instrument[] {
  return family === 'mixed' ? INSTRUMENTS : INSTRUMENTS.filter((i) => i.family === family);
}

export function randomInstrument(family: InstrumentFamily | 'mixed', exclude?: string): Instrument {
  const pool = poolForFamily(family);
  let candidate: Instrument;
  let guard = 0;
  do {
    guard += 1;
    candidate = pool[Math.floor(Math.random() * pool.length)];
  } while (exclude && candidate.id === exclude && guard < 50);
  return candidate;
}

export function distinctDistractorInstruments(
  targetId: string,
  family: InstrumentFamily | 'mixed',
  count: number,
): Instrument[] {
  const pool = poolForFamily(family).filter((i) => i.id !== targetId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
