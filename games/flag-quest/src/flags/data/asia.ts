import type { FlagDef } from '../../types';
import {
  circleOnField, weightedHorizontalStripes, horizontalStripes,
  rectRegion, halfDiscRegion,
} from '../shapes';

export const ASIA_FLAGS: FlagDef[] = [
  {
    id: 'japan', country: 'Japan', continent: 'Asia', difficulty: 'easy',
    viewBox: [300, 200], regions: circleOnField('white', 'red', 0.5, 0.5, 0.3),
    paletteColorIds: ['white', 'red'], targetTimeSec: 20,
    facts: {
      capital: 'Tokyo', population: '~124 million', language: 'Japanese',
      independence: '660 BC (traditional founding)', funFact: 'The red circle represents the sun.',
    },
  },
  {
    id: 'bangladesh', country: 'Bangladesh', continent: 'Asia', difficulty: 'easy',
    viewBox: [300, 200], regions: circleOnField('green', 'red', 0.45, 0.5, 0.28),
    paletteColorIds: ['green', 'red'], targetTimeSec: 22,
    facts: {
      capital: 'Dhaka', population: '~170 million', language: 'Bengali',
      independence: '1971', funFact: 'The red disc represents the sun rising over green fields.',
    },
  },
  {
    id: 'thailand', country: 'Thailand', continent: 'Asia', difficulty: 'medium',
    viewBox: [300, 200],
    regions: weightedHorizontalStripes([
      ['red', 1], ['white', 1], ['blue', 2], ['white', 1], ['red', 1],
    ]),
    paletteColorIds: ['red', 'white', 'blue'], targetTimeSec: 40,
    facts: {
      capital: 'Bangkok', population: '~72 million', language: 'Thai',
      independence: 'Never colonized', funFact: 'The thick blue band symbolizes the monarchy.',
    },
  },
  {
    id: 'india', country: 'India', continent: 'Asia', difficulty: 'hard',
    viewBox: [300, 200],
    regions: [
      ...horizontalStripes(['orange', 'white', 'green']),
      rectRegion('blue', 135, 82, 30, 36),
    ],
    paletteColorIds: ['orange', 'white', 'green', 'blue'], targetTimeSec: 50,
    facts: {
      capital: 'New Delhi', population: '~1.43 billion', language: 'Hindi, English, +21 others',
      independence: '1947', funFact: 'The navy wheel in the center represents law and progress.',
    },
  },
  {
    id: 'south-korea', country: 'South Korea', continent: 'Asia', difficulty: 'hard',
    viewBox: [300, 200],
    regions: [
      rectRegion('white', 0, 0, 300, 200),
      halfDiscRegion('red', 150, 100, 45, -45, 0),
      halfDiscRegion('blue', 150, 100, 45, -45, 1),
    ],
    paletteColorIds: ['white', 'red', 'blue'], targetTimeSec: 55,
    facts: {
      capital: 'Seoul', population: '~52 million', language: 'Korean',
      independence: '1945', funFact: 'The central circle represents balance between opposing forces.',
    },
  },
];
