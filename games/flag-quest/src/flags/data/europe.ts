import type { FlagDef } from '../../types';
import {
  horizontalStripes, verticalStripes, offsetCross,
  rectRegion, bandRegion,
} from '../shapes';

export const EUROPE_FLAGS: FlagDef[] = [
  {
    id: 'poland', country: 'Poland', continent: 'Europe', difficulty: 'easy',
    viewBox: [300, 200], regions: horizontalStripes(['white', 'red']),
    paletteColorIds: ['white', 'red'], targetTimeSec: 25,
    facts: {
      capital: 'Warsaw', population: '~37 million', language: 'Polish',
      independence: '1918', funFact: 'The white and red colors were officially adopted in 1831.',
    },
  },
  {
    id: 'france', country: 'France', continent: 'Europe', difficulty: 'medium',
    viewBox: [300, 200], regions: verticalStripes(['blue', 'white', 'red']),
    paletteColorIds: ['blue', 'white', 'red'], targetTimeSec: 35,
    facts: {
      capital: 'Paris', population: '~68 million', language: 'French',
      independence: '486 (Kingdom founding)', funFact: 'The tricolor dates back to the French Revolution of 1789.',
    },
  },
  {
    id: 'germany', country: 'Germany', continent: 'Europe', difficulty: 'medium',
    viewBox: [300, 200], regions: horizontalStripes(['black', 'red', 'yellow']),
    paletteColorIds: ['black', 'red', 'yellow'], targetTimeSec: 35,
    facts: {
      capital: 'Berlin', population: '~84 million', language: 'German',
      independence: '1871 (unification)', funFact: 'Black, red and gold symbolize unity and freedom.',
    },
  },
  {
    id: 'italy', country: 'Italy', continent: 'Europe', difficulty: 'medium',
    viewBox: [300, 200], regions: verticalStripes(['green', 'white', 'red']),
    paletteColorIds: ['green', 'white', 'red'], targetTimeSec: 35,
    facts: {
      capital: 'Rome', population: '~59 million', language: 'Italian',
      independence: '1861 (unification)', funFact: 'Inspired by the French tricolor, adopted in 1946.',
    },
  },
  {
    id: 'ireland', country: 'Ireland', continent: 'Europe', difficulty: 'medium',
    viewBox: [300, 200], regions: verticalStripes(['green', 'white', 'orange']),
    paletteColorIds: ['green', 'white', 'orange'], targetTimeSec: 35,
    facts: {
      capital: 'Dublin', population: '~5 million', language: 'Irish, English',
      independence: '1922', funFact: 'The white band represents lasting peace between green and orange traditions.',
    },
  },
  {
    id: 'norway', country: 'Norway', continent: 'Europe', difficulty: 'medium',
    viewBox: [300, 200],
    regions: offsetCross('red', 'white', 0.35, 0.32, 300, 200, { color: 'blue', thickFrac: 0.16 }),
    paletteColorIds: ['red', 'white', 'blue'], targetTimeSec: 45,
    facts: {
      capital: 'Oslo', population: '~5.5 million', language: 'Norwegian',
      independence: '1905', funFact: 'The offset cross design is shared by every Nordic country’s flag.',
    },
  },
  {
    id: 'united-kingdom', country: 'United Kingdom', continent: 'Europe', difficulty: 'expert',
    viewBox: [300, 200],
    regions: [
      rectRegion('blue', 0, 0, 300, 200),
      bandRegion('white', 0, 0, 300, 200, 46),
      bandRegion('white', 0, 200, 300, 0, 46),
      bandRegion('red', 0, 0, 300, 200, 20),
      bandRegion('red', 0, 200, 300, 0, 20),
      rectRegion('white', 0, 82, 300, 36),
      rectRegion('white', 127, 0, 46, 200),
      rectRegion('red', 0, 90, 300, 20),
      rectRegion('red', 135, 0, 30, 200),
    ],
    paletteColorIds: ['blue', 'white', 'red'], targetTimeSec: 60,
    facts: {
      capital: 'London', population: '~67 million', language: 'English',
      independence: '1801 (Act of Union)', funFact: 'Combines the crosses of St George, St Andrew and St Patrick.',
    },
  },
];
