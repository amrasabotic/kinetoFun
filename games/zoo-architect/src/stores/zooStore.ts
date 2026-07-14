import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ZooSaveData, PlacedItem } from '../types';
import { ZOO_ITEMS, itemById, itemsByZone } from '../data/zooItems';
import { ZONES, nextZoneId } from '../data/zones';
import { computeAccruedTickets } from '../game/ticketAccrual';

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-habitat', title: 'First Habitat', description: 'Place your first animal or decoration.' },
  { id: 'zoologist', title: 'Zoologist', description: 'Unlock 10 items across your zoo.' },
  { id: 'zone-master', title: 'Zone Master', description: 'Fully unlock every item in one zone.' },
  { id: 'world-traveler', title: 'World Traveler', description: 'Unlock all 4 zones.' },
  { id: 'ticket-tycoon', title: 'Ticket Tycoon', description: 'Earn 1000 Tickets total.' },
  { id: 'master-architect', title: 'Master Architect', description: 'Place 50 total items.' },
];

const DEFAULT_SAVE: ZooSaveData = {
  version: 1,
  tickets: 20,
  totalTicketsEarned: 0,
  lastCollectedAt: Date.now(),
  unlockedZoneIds: ['savanna'],
  unlockedItemIds: ZOO_ITEMS.filter((i) => i.unlockCost === 0).map((i) => i.id),
  placedItems: [],
  achievements: [],
};

function totalAppealScore(placedItems: PlacedItem[]): number {
  let total = 0;
  for (const p of placedItems) {
    const item = itemById(p.itemId);
    if (item) total += item.appealValue;
  }
  return total;
}

interface ZooState extends ZooSaveData {
  placeItem: (itemId: string, zoneId: string, x: number, y: number) => boolean;
  unlockItem: (itemId: string) => boolean;
  unlockZone: (zoneId: string) => boolean;
  collectTickets: () => number;
  resetProgress: () => void;
}

export const useZooStore = create<ZooState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      placeItem: (itemId, zoneId, x, y) => {
        const state = get();
        if (!state.unlockedItemIds.includes(itemId)) return false;
        if (!state.unlockedZoneIds.includes(zoneId)) return false;
        const item = itemById(itemId);
        if (!item || item.zoneId !== zoneId) return false;

        const placedItems = [...state.placedItems, { itemId, zoneId, x, y }];
        const newState: ZooSaveData = { ...state, placedItems };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      unlockItem: (itemId) => {
        const state = get();
        const item = itemById(itemId);
        if (!item || state.unlockedItemIds.includes(itemId)) return false;
        if (!state.unlockedZoneIds.includes(item.zoneId)) return false;
        if (state.tickets < item.unlockCost) return false;

        const unlockedItemIds = [...state.unlockedItemIds, itemId];
        const newState: ZooSaveData = { ...state, tickets: state.tickets - item.unlockCost, unlockedItemIds };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      unlockZone: (zoneId) => {
        const state = get();
        const zone = ZONES.find((z) => z.id === zoneId);
        if (!zone || state.unlockedZoneIds.includes(zoneId)) return false;
        if (nextZoneId(state.unlockedZoneIds) !== zoneId) return false; // must unlock in order
        if (state.tickets < zone.unlockCost) return false;

        const unlockedZoneIds = [...state.unlockedZoneIds, zoneId];
        const newState: ZooSaveData = { ...state, tickets: state.tickets - zone.unlockCost, unlockedZoneIds };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      collectTickets: () => {
        const state = get();
        const now = Date.now();
        const accrued = computeAccruedTickets(state.lastCollectedAt, totalAppealScore(state.placedItems), now);
        if (accrued < 0.01) return 0;

        const newState: ZooSaveData = {
          ...state,
          tickets: state.tickets + accrued,
          totalTicketsEarned: state.totalTicketsEarned + accrued,
          lastCollectedAt: now,
        };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return accrued;
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'zoo-architect-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: ZooSaveData): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.placedItems.length >= 1) add('first-habitat');
  if (state.unlockedItemIds.length >= 10) add('zoologist');
  if (ZONES.some((z) => itemsByZone(z.id).every((i) => state.unlockedItemIds.includes(i.id)))) add('zone-master');
  if (state.unlockedZoneIds.length >= 4) add('world-traveler');
  if (state.totalTicketsEarned >= 1000) add('ticket-tycoon');
  if (state.placedItems.length >= 50) add('master-architect');

  return out;
}

export { totalAppealScore };
