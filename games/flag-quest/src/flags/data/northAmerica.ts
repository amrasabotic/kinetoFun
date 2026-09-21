import type { FlagDef, FlagRegion } from '../../types';
import {
  verticalStripes, weightedHorizontalStripes, weightedVerticalStripes,
  saltireQuadrants, saltireBands,
} from '../shapes';

/** 13 alternating stripes + a solid canton block (USA-style), skipping individual stars. */
function stripesWithCanton(): FlagRegion[] {
  const stripes = 13;
  const h = 200 / stripes;
  const regions: FlagRegion[] = [];
  for (let i = 0; i < stripes; i++) {
    regions.push({
      id: `us-stripe-${i}`,
      colorId: i % 2 === 0 ? 'red' : 'white',
      points: [[0, i * h], [300, i * h], [300, (i + 1) * h], [0, (i + 1) * h]],
    });
  }
  regions.push({
    id: 'us-canton',
    colorId: 'blue',
    points: [[0, 0], [120, 0], [120, h * 7], [0, h * 7]],
  });
  return regions;
}

function jamaicaRegions(): FlagRegion[] {
  return [
    ...saltireQuadrants('green', 'black', 300, 200),
    ...saltireBands('yellow', 34, 300, 200),
  ];
}

export const NORTH_AMERICA_FLAGS: FlagDef[] = [
  {
    id: 'canada', country: 'Canada', continent: 'North America', difficulty: 'easy',
    viewBox: [300, 200],
    regions: weightedVerticalStripes([['red', 1], ['white', 2], ['red', 1]]),
    paletteColorIds: ['red', 'white'], targetTimeSec: 25,
    facts: {
      capital: 'Ottawa', population: '~39 million', language: 'English, French',
      independence: '1867', funFact: 'Red and white were proclaimed Canada’s official colors in 1921.',
    },
  },
  {
    id: 'mexico', country: 'Mexico', continent: 'North America', difficulty: 'medium',
    viewBox: [300, 200], regions: verticalStripes(['green', 'white', 'red']),
    paletteColorIds: ['green', 'white', 'red'], targetTimeSec: 32,
    facts: {
      capital: 'Mexico City', population: '~128 million', language: 'Spanish',
      independence: '1810', funFact: 'Green stands for hope, white for unity, red for the blood of heroes.',
    },
  },
  {
    id: 'usa', country: 'United States', continent: 'North America', difficulty: 'hard',
    viewBox: [300, 200], regions: stripesWithCanton(),
    paletteColorIds: ['red', 'white', 'blue'], targetTimeSec: 60,
    facts: {
      capital: 'Washington, D.C.', population: '~335 million', language: 'English',
      independence: '1776', funFact: 'The 13 stripes represent the original 13 colonies.',
    },
  },
  {
    id: 'jamaica', country: 'Jamaica', continent: 'North America', difficulty: 'expert',
    viewBox: [300, 200], regions: jamaicaRegions(),
    paletteColorIds: ['green', 'black', 'yellow'], targetTimeSec: 55,
    facts: {
      capital: 'Kingston', population: '~2.8 million', language: 'English',
      independence: '1962', funFact: 'Jamaica is the only national flag without red, white or blue.',
    },
  },
  {
    id: 'costa-rica', country: 'Costa Rica', continent: 'North America', difficulty: 'medium',
    viewBox: [300, 200],
    regions: weightedHorizontalStripes([
      ['blue', 1], ['white', 1], ['red', 2], ['white', 1], ['blue', 1],
    ]),
    paletteColorIds: ['blue', 'white', 'red'], targetTimeSec: 40,
    facts: {
      capital: 'San José', population: '~5.2 million', language: 'Spanish',
      independence: '1821', funFact: 'Costa Rica has no standing army, disbanded in 1948.',
    },
  },
];
