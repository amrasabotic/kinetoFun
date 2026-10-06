// In-game achievements that the platform collects, per game.
//
// Each game keeps its own achievement list and saves the unlocked ids in the
// browser. Games run in a same-origin iframe, so the play page reads that
// saved progress directly (see readUnlockedAchievements) instead of every game
// needing its own reporting code. The lists below mirror each game's source
// and double as the server-side allowlist: when a game adds, renames or
// removes an achievement, or changes its save key or format, update it here.
//
// Pure data, safe to import from client and server code.

/** Where a game saves unlocked achievements in localStorage. */
export interface AchievementSource {
  key: string;
  /** Property path inside the parsed JSON value. */
  path: string[];
  /**
   * "ids": the value is an array of unlocked achievement ids.
   * "unlockedAt": an array of { id, unlockedAt } where null means locked.
   */
  format: "ids" | "unlockedAt";
}

export interface GameAchievementDef {
  id: string;
  title: string;
  description: string;
  emoji?: string;
}

export const GAME_ACHIEVEMENTS: Record<
  string,
  { source: AchievementSource; items: GameAchievementDef[] }
> = {
  "alphabet-zoo": {
    source: { key: "alphabet-zoo-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "letter-master", title: "Letter Master", description: "Earn 3 stars in Letter Match mode." },
      { id: "animal-master", title: "Animal Master", description: "Earn 3 stars in Animal Sounds mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Little Scholar", description: "Play 10 sessions." },
      { id: "a-to-z", title: "A to Z", description: "See all 26 letters as prompts." },
    ],
  },
  "clock-time-teller": {
    source: { key: "clock-time-teller-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "clock-reader-master", title: "Clock Reader Master", description: "Earn 3 stars in Read the Clock mode." },
      { id: "clock-setter-master", title: "Clock Setter Master", description: "Earn 3 stars in Set the Clock mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Time Traveler", description: "Play 10 sessions." },
    ],
  },
  "coin-money-counter": {
    source: { key: "coin-money-counter-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "coin-counter-master", title: "Coin Counter Master", description: "Earn 3 stars in Count the Coins mode." },
      { id: "money-maker-master", title: "Money Maker Master", description: "Earn 3 stars in Make the Amount mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Money Wizard", description: "Play 10 sessions." },
    ],
  },
  "connect-2-balls": {
    source: { key: "kinetofun_progress", path: ["achievements"], format: "ids" },
    items: [
      { id: "first_connection", title: "First Connection", description: "Complete your first level" },
      { id: "ten_levels", title: "Getting Started", description: "Complete 10 levels" },
      { id: "fifty_levels", title: "Puzzle Enthusiast", description: "Complete 50 levels" },
      { id: "perfect_ten", title: "Perfect Ten", description: "Get 3 stars on 10 levels" },
      { id: "speed_solver", title: "Speed Solver", description: "Complete a level in under 10 seconds" },
      { id: "hint_free", title: "No Help Needed", description: "Complete 5 levels without hints" },
      { id: "star_collector", title: "Star Collector", description: "Earn 30 total stars" },
      { id: "master_connector", title: "Master Connector", description: "Complete all available levels" },
    ],
  },
  "cooking-chef": {
    source: { key: "cc_achievements", path: ["unlocked"], format: "ids" },
    items: [
      { id: "slice-master", title: "Slice Master", description: "Chop 100 vegetables", emoji: "🔪" },
      { id: "soup-legend", title: "Soup Legend", description: "Stir soup for 120 seconds", emoji: "🍜" },
      { id: "pancake-pro", title: "Pancake Pro", description: "Flip 30 perfect pancakes", emoji: "🥞" },
      { id: "cake-artist", title: "Cake Artist", description: "Decorate 20 cakes", emoji: "🎂" },
      { id: "combo-king", title: "Combo King", description: "Reach a x10 combo multiplier", emoji: "🔥" },
      { id: "no-miss-champion", title: "No-Miss Champion", description: "Complete a game with 0 misses", emoji: "✨" },
      { id: "speed-chef", title: "Speed Chef", description: "Complete a minigame in <20s", emoji: "⚡" },
      { id: "ultimate-chef", title: "Ultimate Chef", description: "Beat the Ultimate Showdown", emoji: "🏆" },
      { id: "daily-streak-7", title: "Daily Devotee", description: "Play daily challenge 7 days", emoji: "📅" },
      { id: "party-winner", title: "Party Champion", description: "Win a 2+ player party game", emoji: "🎉" },
    ],
  },
  "farm-builder": {
    source: { key: "farm-builder-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-harvest", title: "First Harvest", description: "Harvest your first crop." },
      { id: "green-thumb", title: "Green Thumb", description: "Harvest 25 crops in total." },
      { id: "full-table", title: "Full Table", description: "Unlock every crop type." },
      { id: "land-baron", title: "Land Baron", description: "Unlock every plot." },
      { id: "century-farmer", title: "Century Farmer", description: "Earn 100 coins in total." },
      { id: "master-grower", title: "Master Grower", description: "Have every unlocked plot planted at once." },
    ],
  },
  "flag-quest": {
    source: { key: "flag-quest-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-flag", title: "First Flag", description: "Complete your first flag." },
      { id: "ten-flags", title: "10 Flags", description: "Complete 10 different flags." },
      { id: "all-flags", title: "World Traveler", description: "Complete every flag in the atlas." },
      { id: "perfect-painter", title: "Perfect Painter", description: "Earn a Perfect medal." },
      { id: "europe-master", title: "Europe Master", description: "Earn 3 stars on every European flag." },
      { id: "asia-explorer", title: "Asia Explorer", description: "Earn 3 stars on every Asian flag." },
      { id: "full-accuracy", title: "100% Accuracy", description: "Finish a flag with zero mistakes." },
      { id: "speed-painter", title: "Speed Painter", description: "Finish a flag in half its target time." },
    ],
  },
  "fruit-vegetable-sorter": {
    source: { key: "fruit-vegetable-sorter-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "fruit-expert", title: "Fruit Expert", description: "Earn 3 stars in Fruits mode." },
      { id: "veggie-expert", title: "Veggie Expert", description: "Earn 3 stars in Vegetables mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "food-champion", title: "Food Champion", description: "Play 10 sessions." },
    ],
  },
  "memory-match-zoo": {
    source: { key: "memory-match-zoo-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-match", title: "First Match", description: "Finish your first board." },
      { id: "small-master", title: "Small Zoo Master", description: "Earn 3 stars in Small Zoo mode." },
      { id: "medium-master", title: "Medium Zoo Master", description: "Earn 3 stars in Medium Zoo mode." },
      { id: "big-master", title: "Big Zoo Master", description: "Earn 3 stars in Big Zoo mode." },
      { id: "perfect-memory", title: "Perfect Memory", description: "Clear a board with zero mismatches." },
      { id: "memory-champion", title: "Memory Champion", description: "Play 10 sessions." },
    ],
  },
  "mouth-open-catch": {
    source: { key: "mouth-open-catch-v1", path: ["achievements"], format: "unlockedAt" },
    items: [
      { id: "first_catch", title: "First Catch!", description: "Catch your first item", emoji: "🎯" },
      { id: "catches_100", title: "Centurion", description: "Catch 100 items total", emoji: "💯" },
      { id: "catches_1000", title: "Glutton", description: "Catch 1000 items total", emoji: "🏆" },
      { id: "combo_5", title: "Combo Starter", description: "Reach a 5x combo", emoji: "🔥" },
      { id: "combo_10", title: "Combo Master", description: "Reach a 10x combo", emoji: "⚡" },
      { id: "coins_1000", title: "Coin Collector", description: "Collect 1000 coins total", emoji: "🪙" },
      { id: "diamonds_10", title: "Diamond Hunter", description: "Collect 10 diamonds", emoji: "💎" },
      { id: "score_500", title: "Rising Star", description: "Score 500 points in one game", emoji: "⭐" },
      { id: "score_2000", title: "High Flyer", description: "Score 2000 points in one game", emoji: "🌟" },
      { id: "score_5000", title: "Legend", description: "Score 5000 points in one game", emoji: "👑" },
      { id: "survive_60", title: "Survivor", description: "Survive for 60 seconds", emoji: "⏱️" },
      { id: "survive_120", title: "Endurance King", description: "Survive for 2 minutes", emoji: "🛡️" },
      { id: "games_10", title: "Regular Player", description: "Play 10 games", emoji: "🎮" },
      { id: "treasure_catch", title: "Treasure Hunter", description: "Catch a Treasure Chest", emoji: "🎁" },
      { id: "bomb_dodger", title: "Bomb Dodger", description: "Dodge 5 bombs in a row", emoji: "💣" },
      { id: "powerup_catch", title: "Powered Up", description: "Collect your first power-up", emoji: "⚡" },
    ],
  },
  "musical-instrument-sounds": {
    source: { key: "musical-instrument-sounds-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "percussion-master", title: "Percussion Master", description: "Earn 3 stars in Percussion mode." },
      { id: "melodic-master", title: "Melodic Master", description: "Earn 3 stars in Melodic mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Music Maestro", description: "Play 10 sessions." },
    ],
  },
  "opposites-match": {
    source: { key: "opposites-match-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "word-master", title: "Word Master", description: "Earn 3 stars in Words mode." },
      { id: "picture-master", title: "Picture Master", description: "Earn 3 stars in Pictures mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Opposite Genius", description: "Play 10 sessions." },
    ],
  },
  "pocket-pal": {
    source: { key: "pocket-pal-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "new-best-friend", title: "New Best Friend", description: "Care for your pal for the first time." },
      { id: "best-buddy", title: "Best Buddy", description: "Perform 50 total care actions." },
      { id: "all-grown-up", title: "All Grown Up", description: "Reach the final growth stage." },
      { id: "full-closet", title: "Full Closet", description: "Unlock every food, toy, and accessory." },
      { id: "heart-of-gold", title: "Heart of Gold", description: "Earn 100 Hearts total." },
      { id: "picture-perfect", title: "Picture Perfect", description: "Get Hunger and Happiness to 100 at the same time." },
    ],
  },
  "shape-color-sorter": {
    source: { key: "shape-color-sorter-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-sort", title: "First Sort", description: "Finish your first session." },
      { id: "shape-master", title: "Shape Master", description: "Earn 3 stars sorting by shape." },
      { id: "color-master", title: "Color Master", description: "Earn 3 stars sorting by color." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Super Sorter", description: "Play 10 sessions." },
    ],
  },
  "spear-stickman": {
    source: { key: "spear-stickman:progress", path: ["achievements"], format: "ids" },
    items: [
      { id: "first-blood", title: "First Blood", description: "Defeat your first enemy", emoji: "🩸" },
      { id: "hundred", title: "Centurion", description: "Defeat 100 enemies", emoji: "💯" },
      { id: "five-hundred", title: "Spearmaster", description: "Defeat 500 enemies", emoji: "🔱" },
      { id: "thousand", title: "Legendary Slayer", description: "Defeat 1000 enemies", emoji: "🏆" },
      { id: "head-10", title: "Sharp Eye", description: "Land 10 headshots", emoji: "👁️" },
      { id: "head-100", title: "Headhunter", description: "Land 100 headshots", emoji: "🎯" },
      { id: "perfect", title: "Untouchable", description: "Clear a wave taking no damage", emoji: "✨" },
      { id: "boss", title: "Boss Slayer", description: "Defeat a giant boss", emoji: "👹" },
      { id: "combo", title: "Combo Master", description: "Reach a ×10 combo", emoji: "🔥" },
      { id: "wave-10", title: "Wave 10", description: "Survive to wave 10", emoji: "🌊" },
      { id: "wave-25", title: "Wave 25", description: "Survive to wave 25", emoji: "🌪️" },
      { id: "wave-50", title: "Survivor", description: "Survive to wave 50", emoji: "🛡️" },
    ],
  },
  "weather-seasons-sorter": {
    source: { key: "weather-seasons-sorter-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-round", title: "First Round", description: "Finish your first session." },
      { id: "weather-watcher-master", title: "Weather Watcher Master", description: "Earn 3 stars in What to Wear mode." },
      { id: "clothing-expert-master", title: "Clothing Expert Master", description: "Earn 3 stars in Match the Weather mode." },
      { id: "mixed-master", title: "Mixed Master", description: "Earn 3 stars in Mixed mode." },
      { id: "perfect-round", title: "Perfect Round", description: "Finish a session with zero mistakes." },
      { id: "ten-sessions", title: "Season Sage", description: "Play 10 sessions." },
    ],
  },
  "zoo-architect": {
    source: { key: "zoo-architect-progress", path: ["state", "achievements"], format: "ids" },
    items: [
      { id: "first-habitat", title: "First Habitat", description: "Place your first animal or decoration." },
      { id: "zoologist", title: "Zoologist", description: "Unlock 10 items across your zoo." },
      { id: "zone-master", title: "Zone Master", description: "Fully unlock every item in one zone." },
      { id: "world-traveler", title: "World Traveler", description: "Unlock all 4 zones." },
      { id: "ticket-tycoon", title: "Ticket Tycoon", description: "Earn 1000 Tickets total." },
      { id: "master-architect", title: "Master Architect", description: "Place 50 total items." },
    ],
  },
};

/** Fallback sticker for achievements whose game does not define an emoji. */
export const DEFAULT_ACHIEVEMENT_EMOJI = "🏅";

/** Tickets paid once for each collected in-game achievement. */
export const TICKETS_PER_GAME_ACHIEVEMENT = 2;

export function findGameAchievement(
  gameId: string,
  achievementId: string,
): GameAchievementDef | undefined {
  return GAME_ACHIEVEMENTS[gameId]?.items.find((a) => a.id === achievementId);
}

/**
 * Read the achievements this browser has unlocked for a game. Returns only ids
 * the catalogue knows about; any storage or parse problem yields an empty list.
 */
export function readUnlockedAchievements(gameId: string, storage: Storage): string[] {
  const entry = GAME_ACHIEVEMENTS[gameId];
  if (!entry) return [];
  try {
    const raw = storage.getItem(entry.source.key);
    if (!raw) return [];
    let value: unknown = JSON.parse(raw);
    for (const segment of entry.source.path) {
      value = (value as Record<string, unknown> | null)?.[segment];
    }
    if (!Array.isArray(value)) return [];
    const ids =
      entry.source.format === "ids"
        ? value.filter((v): v is string => typeof v === "string")
        : value
            .filter((v) => v && typeof v === "object" && (v as { unlockedAt?: unknown }).unlockedAt != null)
            .map((v) => String((v as { id?: unknown }).id));
    const known = new Set(entry.items.map((a) => a.id));
    return [...new Set(ids)].filter((id) => known.has(id));
  } catch {
    return [];
  }
}
