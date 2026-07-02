export type WeatherKind = 'sunny' | 'snowy' | 'rainy' | 'windy' | 'hot' | 'foggy' | 'stormy' | 'cloudy';
export type ClothingKind = 'sunhat' | 'mittens' | 'raincoat' | 'kite' | 'sunglasses' | 'sweater' | 'umbrella' | 'jacket';

export interface WeatherScenario {
  id: string;
  name: string;
  description: string;
  weather: WeatherKind;
  clothing: ClothingKind;
}

export const SCENARIOS: WeatherScenario[] = [
  { id: 'sunny-summer', name: 'Sunny Summer', description: 'Wear your sunhat!', weather: 'sunny', clothing: 'sunhat' },
  { id: 'snowy-winter', name: 'Snowy Winter', description: 'Wear your mittens!', weather: 'snowy', clothing: 'mittens' },
  { id: 'rainy-spring', name: 'Rainy Spring', description: 'Wear your raincoat!', weather: 'rainy', clothing: 'raincoat' },
  { id: 'windy-fall', name: 'Windy Fall', description: 'Fly your kite!', weather: 'windy', clothing: 'kite' },
  { id: 'hot-desert', name: 'Hot Desert Day', description: 'Wear your sunglasses!', weather: 'hot', clothing: 'sunglasses' },
  { id: 'foggy-morning', name: 'Foggy Morning', description: 'Wear your sweater!', weather: 'foggy', clothing: 'sweater' },
  { id: 'stormy-day', name: 'Stormy Day', description: 'Grab your umbrella!', weather: 'stormy', clothing: 'umbrella' },
  { id: 'cloudy-afternoon', name: 'Cloudy Afternoon', description: 'Wear your jacket!', weather: 'cloudy', clothing: 'jacket' },
];

export function scenarioById(id: string): WeatherScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function speakableScenario(scenario: WeatherScenario): string {
  return `${scenario.name} — ${scenario.description}`;
}

export function randomScenario(exclude?: string): WeatherScenario {
  let candidate: WeatherScenario;
  let guard = 0;
  do {
    guard += 1;
    candidate = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  } while (exclude && candidate.id === exclude && guard < 50);
  return candidate;
}

/** Distractor scenarios must have a different clothing answer than the target (never two "right-looking" options). */
export function distinctDistractorScenarios(target: WeatherScenario, count: number): WeatherScenario[] {
  const pool = SCENARIOS.filter((s) => s.id !== target.id && s.clothing !== target.clothing);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
