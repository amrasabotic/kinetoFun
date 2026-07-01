import type { FlagDef, FlagRegion } from '../../types';
import {
  verticalStripes, horizontalStripes, starRegion,
  trianglePolygonRegion,
} from '../shapes';

/** Simplified 4-color pall (Y-shape), built from four tiled, edge-sharing polygons. */
function southAfricaRegions(): FlagRegion[] {
  const green: FlagRegion = {
    id: 'sa-green', colorId: 'green',
    points: [[0, 0], [170, 84], [300, 60], [300, 140], [170, 116], [0, 200]],
  };
  const red: FlagRegion = {
    id: 'sa-red', colorId: 'red',
    points: [[0, 0], [300, 0], [300, 60], [170, 84]],
  };
  const blue: FlagRegion = {
    id: 'sa-blue', colorId: 'blue',
    points: [[0, 200], [300, 200], [300, 140], [170, 116]],
  };
  const black = trianglePolygonRegion('black', [0, 0], [0, 200], [120, 100]);
  black.id = 'sa-black';
  return [green, red, blue, black];
}

export const AFRICA_FLAGS: FlagDef[] = [
  {
    id: 'nigeria', country: 'Nigeria', continent: 'Africa', difficulty: 'easy',
    viewBox: [300, 200], regions: verticalStripes(['green', 'white', 'green']),
    paletteColorIds: ['green', 'white'], targetTimeSec: 22,
    facts: {
      capital: 'Abuja', population: '~223 million', language: 'English',
      independence: '1960', funFact: 'Green represents forests and natural wealth.',
    },
  },
  {
    id: 'ivory-coast', country: 'Ivory Coast', continent: 'Africa', difficulty: 'medium',
    viewBox: [300, 200], regions: verticalStripes(['orange', 'white', 'green']),
    paletteColorIds: ['orange', 'white', 'green'], targetTimeSec: 32,
    facts: {
      capital: 'Yamoussoukro', population: '~28 million', language: 'French',
      independence: '1960', funFact: 'Nearly a mirror image of Ireland’s flag, reversed.',
    },
  },
  {
    id: 'egypt', country: 'Egypt', continent: 'Africa', difficulty: 'medium',
    viewBox: [300, 200], regions: horizontalStripes(['red', 'white', 'black']),
    paletteColorIds: ['red', 'white', 'black'], targetTimeSec: 32,
    facts: {
      capital: 'Cairo', population: '~112 million', language: 'Arabic',
      independence: '1922', funFact: 'The Pan-Arab colors are shared with several regional flags.',
    },
  },
  {
    id: 'ghana', country: 'Ghana', continent: 'Africa', difficulty: 'hard',
    viewBox: [300, 200],
    regions: [
      ...horizontalStripes(['red', 'yellow', 'green']),
      starRegion('black', 150, 100, 24, 10),
    ],
    paletteColorIds: ['red', 'yellow', 'green', 'black'], targetTimeSec: 45,
    facts: {
      capital: 'Accra', population: '~33 million', language: 'English',
      independence: '1957', funFact: 'The black star symbolizes African freedom and unity.',
    },
  },
  {
    id: 'south-africa', country: 'South Africa', continent: 'Africa', difficulty: 'expert',
    viewBox: [300, 200],
    regions: southAfricaRegions(),
    paletteColorIds: ['black', 'green', 'red', 'blue'], targetTimeSec: 70,
    facts: {
      capital: 'Pretoria, Cape Town, Bloemfontein', population: '~60 million', language: '12 official languages',
      independence: '1910 (Union), 1994 (democratic flag)',
      funFact: 'The Y-shaped pall represents the convergence of different paths into unity.',
    },
  },
];
