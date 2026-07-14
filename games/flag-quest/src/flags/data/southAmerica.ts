import type { FlagDef, FlagRegion } from '../../types';
import {
  weightedHorizontalStripes, horizontalStripes,
  starRegion, diamondRegion, circleRegion, rectRegion,
} from '../shapes';

function brazilRegions(): FlagRegion[] {
  return [
    rectRegion('green', 0, 0, 300, 200),
    diamondRegion('yellow', 150, 100, 110, 70),
    circleRegion('blue', 150, 100, 42),
  ];
}

function chileRegions(): FlagRegion[] {
  return [
    rectRegion('white', 0, 0, 300, 100),
    rectRegion('red', 0, 100, 300, 100),
    rectRegion('blue', 0, 0, 100, 100),
    starRegion('white', 50, 50, 22, 9),
  ];
}

export const SOUTH_AMERICA_FLAGS: FlagDef[] = [
  {
    id: 'argentina', country: 'Argentina', continent: 'South America', difficulty: 'easy',
    viewBox: [300, 200], regions: horizontalStripes(['blue', 'white', 'blue']),
    paletteColorIds: ['blue', 'white'], targetTimeSec: 25,
    facts: {
      capital: 'Buenos Aires', population: '~46 million', language: 'Spanish',
      independence: '1816', funFact: 'The light blue and white bands date to 1812.',
    },
  },
  {
    id: 'bolivia', country: 'Bolivia', continent: 'South America', difficulty: 'medium',
    viewBox: [300, 200], regions: horizontalStripes(['red', 'yellow', 'green']),
    paletteColorIds: ['red', 'yellow', 'green'], targetTimeSec: 32,
    facts: {
      capital: 'Sucre (constitutional), La Paz (seat of government)', population: '~12 million', language: 'Spanish, Quechua, Aymara',
      independence: '1825', funFact: 'Red honors the animals sacrificed for the country, green its wealth.',
    },
  },
  {
    id: 'colombia', country: 'Colombia', continent: 'South America', difficulty: 'medium',
    viewBox: [300, 200],
    regions: weightedHorizontalStripes([['yellow', 2], ['blue', 1], ['red', 1]]),
    paletteColorIds: ['yellow', 'blue', 'red'], targetTimeSec: 35,
    facts: {
      capital: 'Bogotá', population: '~52 million', language: 'Spanish',
      independence: '1810', funFact: 'The double-width yellow band represents the country’s gold and sovereignty.',
    },
  },
  {
    id: 'chile', country: 'Chile', continent: 'South America', difficulty: 'medium',
    viewBox: [300, 200], regions: chileRegions(),
    paletteColorIds: ['white', 'red', 'blue'], targetTimeSec: 38,
    facts: {
      capital: 'Santiago', population: '~19.5 million', language: 'Spanish',
      independence: '1818', funFact: 'Nicknamed "La Estrella Solitaria" — the Lone Star.',
    },
  },
  {
    id: 'brazil', country: 'Brazil', continent: 'South America', difficulty: 'expert',
    viewBox: [300, 200], regions: brazilRegions(),
    paletteColorIds: ['green', 'yellow', 'blue'], targetTimeSec: 55,
    facts: {
      capital: 'Brasília', population: '~216 million', language: 'Portuguese',
      independence: '1822', funFact: 'The green and yellow represent the country’s forests and mineral wealth.',
    },
  },
];
