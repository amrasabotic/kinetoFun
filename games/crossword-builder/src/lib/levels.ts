export type Dir = "A" | "D";
export interface WordDef {
  w: string;
  r: number;
  c: number;
  d: Dir;
  clue: string;
}
export interface Level {
  id: number;
  name: string;
  words: WordDef[];
}

export const LEVELS: Level[] = [
  { id: 1, name: "Furry Friends", words: [
    { w: "CAT", r: 0, c: 0, d: "A", clue: "Whiskered pet that purrs and naps a lot." },
    { w: "COW", r: 0, c: 0, d: "D", clue: "Farm animal that says 'moo' and gives milk." },
  ]},
  { id: 2, name: "Morning Light", words: [
    { w: "DOG", r: 0, c: 0, d: "A", clue: "Loyal pet that loves to bark and fetch." },
    { w: "DAY", r: 0, c: 0, d: "D", clue: "The opposite of night." },
  ]},
  { id: 3, name: "Above Us", words: [
    { w: "SUN", r: 0, c: 0, d: "A", clue: "Bright yellow star that warms the Earth." },
    { w: "SKY", r: 0, c: 0, d: "D", clue: "The big blue place where clouds float." },
  ]},
  { id: 4, name: "Barnyard", words: [
    { w: "FISH", r: 0, c: 0, d: "A", clue: "Scaly swimmer with fins and gills." },
    { w: "HEN",  r: 0, c: 3, d: "D", clue: "A female chicken that lays eggs." },
  ]},
  { id: 5, name: "Cool Flyers", words: [
    { w: "BIRD", r: 0, c: 0, d: "A", clue: "Feathered creature that lays eggs." },
    { w: "BAT",  r: 0, c: 0, d: "D", clue: "Nocturnal flying mammal." },
    { w: "ICE",  r: 0, c: 1, d: "D", clue: "Frozen solid form of water." },
  ]},
  { id: 6, name: "Backyard Fun", words: [
    { w: "TREE", r: 0, c: 0, d: "A", clue: "Tall woody plant with leaves and branches." },
    { w: "TOY",  r: 0, c: 0, d: "D", clue: "Something kids love to play with." },
    { w: "REST", r: 0, c: 1, d: "D", clue: "Take a break and relax." },
  ]},
  { id: 7, name: "Fresh Snacks", words: [
    { w: "APPLE", r: 0, c: 0, d: "A", clue: "Red or green crunchy orchard fruit." },
    { w: "PEAR",  r: 0, c: 1, d: "D", clue: "Sweet bell-shaped fruit." },
    { w: "LEAF",  r: 0, c: 3, d: "D", clue: "Green flat part of a plant." },
  ]},
  { id: 8, name: "Cozy Place", words: [
    { w: "HOUSE", r: 0, c: 0, d: "A", clue: "A building where a family lives." },
    { w: "OWL",   r: 0, c: 1, d: "D", clue: "Wise night bird that hoots." },
    { w: "USE",   r: 0, c: 2, d: "D", clue: "To put something into action." },
  ]},
  { id: 9, name: "Shoreline", words: [
    { w: "WATER", r: 0, c: 0, d: "A", clue: "Clear liquid you drink every day." },
    { w: "WAVE",  r: 0, c: 0, d: "D", clue: "A rolling swell on the ocean." },
    { w: "ROCK",  r: 0, c: 4, d: "D", clue: "Hard solid lump of stone." },
  ]},
  { id: 10, name: "Bakery Smells", words: [
    { w: "BREAD", r: 0, c: 0, d: "A", clue: "Loaf made from flour, water and yeast." },
    { w: "BAKE",  r: 0, c: 0, d: "D", clue: "To cook food using an oven." },
    { w: "ART",   r: 0, c: 3, d: "D", clue: "Creative drawing, painting or sculpture." },
  ]},
  { id: 11, name: "Outer Reach", words: [
    { w: "PLANET", r: 0, c: 0, d: "A", clue: "A round body that orbits a star." },
    { w: "PLAY",   r: 0, c: 0, d: "D", clue: "Have fun with games or toys." },
    { w: "NET",    r: 0, c: 3, d: "D", clue: "Mesh used for catching fish or balls." },
  ]},
  { id: 12, name: "Bloom", words: [
    { w: "GARDEN", r: 0, c: 0, d: "A", clue: "Outdoor patch where flowers grow." },
    { w: "GAME",   r: 0, c: 0, d: "D", clue: "An activity with rules you play." },
    { w: "DEN",    r: 0, c: 3, d: "D", clue: "A wild animal's cozy lair." },
  ]},
  { id: 13, name: "Lift Off", words: [
    { w: "ROCKET", r: 0, c: 0, d: "A", clue: "Vehicle that blasts into space." },
    { w: "RIVER",  r: 0, c: 0, d: "D", clue: "Long flowing body of fresh water." },
    { w: "KITE",   r: 0, c: 3, d: "D", clue: "Paper toy that flies on a string." },
  ]},
  { id: 14, name: "Wild Beats", words: [
    { w: "GUITAR", r: 0, c: 0, d: "A", clue: "Six-string instrument you strum." },
    { w: "GLOBE",  r: 0, c: 0, d: "D", clue: "A spinning model of the Earth." },
    { w: "TIGER",  r: 0, c: 3, d: "D", clue: "Big orange cat with black stripes." },
  ]},
  { id: 15, name: "Quest Peaks", words: [
    { w: "MOUNTAIN", r: 0, c: 0, d: "A", clue: "Huge natural rocky elevation." },
    { w: "MAGIC",    r: 0, c: 0, d: "D", clue: "Mysterious powers in stories." },
    { w: "NIGHT",    r: 0, c: 7, d: "D", clue: "The dark hours after sunset." },
  ]},
  { id: 16, name: "Savanna Trek", words: [
    { w: "ELEPHANT", r: 0, c: 0, d: "A", clue: "Largest land animal with a long trunk." },
    { w: "EARTH",    r: 0, c: 0, d: "D", clue: "The planet we all live on." },
    { w: "HOUSE",    r: 0, c: 4, d: "D", clue: "Building where a family lives." },
  ]},
  { id: 17, name: "Gadgets", words: [
    { w: "COMPUTER", r: 0, c: 0, d: "A", clue: "Electronic machine that runs programs." },
    { w: "CASTLE",   r: 0, c: 0, d: "D", clue: "Stone fortress for kings and queens." },
    { w: "PIANO",    r: 0, c: 3, d: "D", clue: "Keyboard instrument with black and white keys." },
  ]},
  { id: 18, name: "Big Journey", words: [
    { w: "ADVENTURE", r: 0, c: 0, d: "A", clue: "An exciting daring experience." },
    { w: "APPLE",     r: 0, c: 0, d: "D", clue: "Crunchy orchard fruit." },
    { w: "NIGHT",     r: 0, c: 4, d: "D", clue: "Time after sunset when stars appear." },
  ]},
  { id: 19, name: "Meadow Magic", words: [
    { w: "BUTTERFLY", r: 0, c: 0, d: "A", clue: "Colorful winged insect that visits flowers." },
    { w: "BRIDGE",    r: 0, c: 0, d: "D", clue: "Structure that crosses over a river." },
    { w: "FIRE",      r: 0, c: 6, d: "D", clue: "Hot dancing flame that gives off heat." },
  ]},
  { id: 20, name: "Final Bout", words: [
    { w: "CHALLENGE", r: 0, c: 0, d: "A", clue: "A difficult task worth trying." },
    { w: "CIRCLE",    r: 0, c: 0, d: "D", clue: "Perfectly round shape." },
    { w: "LIGHT",     r: 0, c: 3, d: "D", clue: "Brightness that lets us see." },
  ]},
];

export interface BuiltCell {
  r: number;
  c: number;
  answer: string;
  wordIndexes: number[];
  isFirst: boolean; // first letter clue
}

export interface BuiltGrid {
  rows: number;
  cols: number;
  cells: (BuiltCell | null)[][];
  list: BuiltCell[];
  level: Level;
  /** Number assigned to each cell that starts at least one word (row-major). */
  cellNumber: Map<string, number>;
  /** Number for each word (same index as level.words). */
  wordNumber: number[];
}

export function buildGrid(level: Level): BuiltGrid {
  let rows = 0, cols = 0;
  for (const w of level.words) {
    if (w.d === "A") {
      rows = Math.max(rows, w.r + 1);
      cols = Math.max(cols, w.c + w.w.length);
    } else {
      rows = Math.max(rows, w.r + w.w.length);
      cols = Math.max(cols, w.c + 1);
    }
  }
  const cells: (BuiltCell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
  level.words.forEach((w, idx) => {
    for (let i = 0; i < w.w.length; i++) {
      const r = w.r + (w.d === "D" ? i : 0);
      const c = w.c + (w.d === "A" ? i : 0);
      const letter = w.w[i];
      const existing = cells[r][c];
      if (existing) {
        if (existing.answer !== letter) {
          console.warn(`Level ${level.id} mismatch at ${r},${c}: ${existing.answer} vs ${letter}`);
        }
        existing.wordIndexes.push(idx);
        if (i === 0) existing.isFirst = true;
      } else {
        cells[r][c] = {
          r, c,
          answer: letter,
          wordIndexes: [idx],
          isFirst: i === 0,
        };
      }
    }
  });
  const list: BuiltCell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = cells[r][c];
    if (cell) list.push(cell);
  }
  // Assign numbers: any cell that is the starting cell of one or more words.
  const cellNumber = new Map<string, number>();
  const wordNumber: number[] = new Array(level.words.length).fill(0);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startsHere: number[] = [];
      level.words.forEach((w, idx) => { if (w.r === r && w.c === c) startsHere.push(idx); });
      if (startsHere.length > 0) {
        n++;
        cellNumber.set(`${r},${c}`, n);
        startsHere.forEach((idx) => { wordNumber[idx] = n; });
      }
    }
  }
  return { rows, cols, cells, list, level, cellNumber, wordNumber };
}

export const WORD_COLORS = ["w1", "w2", "w3", "w4", "w5", "w6"];
