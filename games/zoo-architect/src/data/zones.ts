export interface ZoneDef {
  id: string;
  name: string;
  theme: string; // Tailwind gradient classes
  unlockCost: number; // tickets, 0 = unlocked from the start
}

export const ZONES: ZoneDef[] = [
  { id: 'savanna', name: 'Savanna', theme: 'from-amber-700 via-yellow-700 to-orange-800', unlockCost: 0 },
  { id: 'arctic', name: 'Arctic', theme: 'from-cyan-200 via-blue-300 to-indigo-400', unlockCost: 40 },
  { id: 'ocean', name: 'Ocean', theme: 'from-blue-700 via-cyan-700 to-teal-800', unlockCost: 90 },
  { id: 'rainforest', name: 'Rainforest', theme: 'from-green-800 via-emerald-800 to-lime-900', unlockCost: 160 },
];

export function zoneById(id: string): ZoneDef | undefined {
  return ZONES.find((z) => z.id === id);
}

/** Index-order unlock chain: zone N requires zone N-1 already unlocked. */
export function nextZoneId(unlockedZoneIds: string[]): string | null {
  for (const zone of ZONES) {
    if (!unlockedZoneIds.includes(zone.id)) return zone.id;
  }
  return null;
}
