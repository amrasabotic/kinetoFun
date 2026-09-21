import type { FlagDef, FlagRegion } from '../../types';
import {
  circleOnField, rectRegion, trianglePolygonRegion, bandRegion, starRegion,
} from '../shapes';

function tongaRegions(): FlagRegion[] {
  return [
    rectRegion('red', 0, 0, 300, 200),
    rectRegion('white', 0, 0, 126, 116),
    rectRegion('red', 0, 48, 126, 20),
    rectRegion('red', 53, 0, 20, 116),
  ];
}

function vanuatuRegions(): FlagRegion[] {
  return [
    trianglePolygonRegion('green', [0, 0], [300, 0], [0, 160]),
    trianglePolygonRegion('red', [300, 0], [300, 160], [0, 160]),
    bandRegion('yellow', 0, 160, 300, 0, 18),
    rectRegion('black', 0, 160, 300, 40),
  ];
}

function samoaRegions(): FlagRegion[] {
  return [
    rectRegion('red', 0, 0, 300, 200),
    rectRegion('blue', 0, 0, 140, 110),
    starRegion('white', 70, 55, 22, 9),
  ];
}

export const OCEANIA_FLAGS: FlagDef[] = [
  {
    id: 'palau', country: 'Palau', continent: 'Oceania', difficulty: 'easy',
    viewBox: [300, 200], regions: circleOnField('blue', 'yellow', 0.44, 0.5, 0.27),
    paletteColorIds: ['blue', 'yellow'], targetTimeSec: 22,
    facts: {
      capital: 'Ngerulmud', population: '~18,000', language: 'Palauan, English',
      independence: '1994', funFact: 'The gold disc represents the moon, considered a symbol of peace.',
    },
  },
  {
    id: 'tonga', country: 'Tonga', continent: 'Oceania', difficulty: 'medium',
    viewBox: [300, 200], regions: tongaRegions(),
    paletteColorIds: ['red', 'white'], targetTimeSec: 35,
    facts: {
      capital: "Nuku'alofa", population: '~107,000', language: 'Tongan, English',
      independence: 'Never colonized', funFact: 'The red cross-in-canton design has been protected from change since 1875.',
    },
  },
  {
    id: 'vanuatu', country: 'Vanuatu', continent: 'Oceania', difficulty: 'hard',
    viewBox: [300, 200], regions: vanuatuRegions(),
    paletteColorIds: ['green', 'red', 'yellow', 'black'], targetTimeSec: 48,
    facts: {
      capital: 'Port Vila', population: '~330,000', language: 'Bislama, English, French',
      independence: '1980', funFact: 'The yellow band traces the shape of a traditional boar-tusk pendant.',
    },
  },
  {
    id: 'samoa', country: 'Samoa', continent: 'Oceania', difficulty: 'hard',
    viewBox: [300, 200], regions: samoaRegions(),
    paletteColorIds: ['red', 'blue', 'white'], targetTimeSec: 42,
    facts: {
      capital: 'Apia', population: '~220,000', language: 'Samoan, English',
      independence: '1962', funFact: 'The stars echo the Southern Cross constellation.',
    },
  },
];
