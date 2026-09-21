export interface Level {
  id: number;
  size: number;
  words: string[];
  theme: string;
}

// 20 levels: progressively larger grids and harder word lists.
export const LEVELS: Level[] = [
  { id: 1, size: 6, theme: "Animals", words: ["CAT", "DOG", "FOX"] },
  { id: 2, size: 6, theme: "Fruits", words: ["FIG", "PEAR", "PLUM"] },
  { id: 3, size: 7, theme: "Colors", words: ["RED", "BLUE", "PINK", "GOLD"] },
  { id: 4, size: 7, theme: "Sky", words: ["SUN", "MOON", "STAR", "CLOUD"] },
  { id: 5, size: 8, theme: "Ocean", words: ["FISH", "WAVE", "CORAL", "SHARK"] },
  { id: 6, size: 8, theme: "Forest", words: ["TREE", "LEAF", "BIRD", "MOSS", "FERN"] },
  { id: 7, size: 9, theme: "Music", words: ["DRUM", "PIANO", "SONG", "TUNE", "CHORD"] },
  { id: 8, size: 9, theme: "Space", words: ["MARS", "EARTH", "COMET", "ORBIT", "NEBULA"] },
  { id: 9, size: 10, theme: "Weather", words: ["RAIN", "SNOW", "STORM", "FROST", "BREEZE"] },
  { id: 10, size: 10, theme: "Garden", words: ["ROSE", "TULIP", "DAISY", "LILY", "POPPY", "ORCHID"] },
  { id: 11, size: 11, theme: "Kitchen", words: ["SPOON", "PLATE", "KNIFE", "WHISK", "LADLE", "OVEN"] },
  { id: 12, size: 11, theme: "Sports", words: ["TENNIS", "SOCCER", "HOCKEY", "RUGBY", "GOLF", "SKI"] },
  { id: 13, size: 12, theme: "Travel", words: ["FLIGHT", "TRAIN", "HOTEL", "BEACH", "PASSPORT", "CITY"] },
  { id: 14, size: 12, theme: "Tech", words: ["LAPTOP", "MOUSE", "PIXEL", "CLOUD", "ROUTER", "BINARY"] },
  { id: 15, size: 13, theme: "Mythology", words: ["DRAGON", "PHOENIX", "GRIFFIN", "KRAKEN", "SPHINX", "TITAN"] },
  { id: 16, size: 13, theme: "Science", words: ["ATOM", "ENERGY", "GRAVITY", "QUARK", "FUSION", "PLASMA", "PROTON"] },
  { id: 17, size: 14, theme: "Cities", words: ["LONDON", "TOKYO", "PARIS", "BERLIN", "SYDNEY", "MUMBAI", "LISBON"] },
  { id: 18, size: 14, theme: "Cuisine", words: ["RAMEN", "SUSHI", "TACOS", "PASTA", "CURRY", "GELATO", "FALAFEL"] },
  { id: 19, size: 15, theme: "Adventure", words: ["JUNGLE", "SUMMIT", "CANYON", "VOLCANO", "GLACIER", "DESERT", "ISLAND", "CAVERN"] },
  { id: 20, size: 15, theme: "Cosmos", words: ["GALAXY", "QUASAR", "PULSAR", "ECLIPSE", "METEOR", "AURORA", "STARDUST", "NEBULA"] },
];

export function getLevel(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
