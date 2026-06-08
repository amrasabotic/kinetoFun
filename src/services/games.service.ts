import { games } from "@/mock";
import type { Game, GameCategory } from "@/types";

// Reads from the mock catalog today; becomes API/Supabase calls in Phase 2.
export const gamesService = {
  list(): Game[] {
    return games;
  },

  getById(id: string): Game | undefined {
    return games.find((g) => g.id === id);
  },

  featured(): Game[] {
    return games.filter((g) => g.featured);
  },

  byCategory(category: GameCategory): Game[] {
    return games.filter((g) => g.category === category);
  },

  categories(): GameCategory[] {
    return Array.from(new Set(games.map((g) => g.category)));
  },

  search(query: string): Game[] {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q),
    );
  },
};
