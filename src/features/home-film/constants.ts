import type { FilmCopy, FilmFormat, FormatKey, SceneName } from "./types";

/** Mascot colours, sampled from public/logo.png. */
export const MASCOT = {
  body: "#009EE8",
  bodyLight: "#0AA4EC",
  bodyShade: "#077FD3",
  bodyHighlight: "#7FD0F7",
  screen: "#FFFFFF",
  ink: "#012F6F",
  cheek: "#FB7B92",
  tongue: "#FD276D",
  sparkle: "#9CC9F2",
  hand: "#FEB119",
  handLight: "#FFC23A",
  handShade: "#FD9A01",
  green: "#8CCA26",
  greenButton: "#83C407",
  pink: "#FB226C",
} as const;

/** The landing page's palette, so the film sits in the page around it. */
export const PALETTE = {
  blue: "#2F80FF",
  sky: "#EAF4FF",
  yellow: "#FFD84D",
  orange: "#FF8A3D",
  green: "#5BD97B",
  pink: "#FF5FA2",
  purple: "#8A5CFF",
  ink: "#16356B",
  inkSoft: "#5B77A8",
  /** The palette blue darkened for words, so large type keeps 3:1 on the light wall. */
  blueText: "#1B6BE8",
  /** The hand cursor's progress colour, the app's primary. */
  cursor: "#1AACE0",
} as const;

/** The room, drawn in its own units; scenes frame it with a camera. */
export const ROOM = {
  colours: {
    wallTop: "#CBDCF4",
    wallBottom: "#DDE8F8",
    floor: "#E7D3B6",
    floorShade: "#D9C29F",
    rug: "#C6DCFF",
    wood: "#F4E3C9",
    woodFront: "#EDD5B1",
    woodShade: "#DCBF95",
    woodHandle: "#C59E6C",
    tvBezel: "#18203A",
    tvBezelEdge: "#2A3456",
    device: "#1B2235",
    deviceTop: "#2C354F",
    lens: "#0B1020",
    ledOff: "#3A4766",
    rim: "#F4FAFF",
    leaf: "#4CC46E",
    leafDark: "#36A65A",
    pot: "#FF8A3D",
  },
  tv: { x: 568, y: 300, width: 784, height: 448, radius: 18 },
  screen: { x: 576, y: 308, width: 768, height: 432, radius: 10 },
  /** The camera clipped to the top of the TV; its lens looks at the room. */
  camera: { x: 960, y: 280, width: 132, height: 38 },
  /** The console on the sideboard, right of the TV. */
  console: { x: 1396, y: 716, width: 162, height: 74, radius: 14 },
  sideboardTop: 790,
  floorTop: 986,
} as const;

/** The child in front of the TV, seen from behind. */
export const KID = {
  hair: "#3B2B29",
  hairLight: "#6A4D44",
  skin: "#E0A47C",
  skinShade: "#C98A62",
  shirt: "#FF5FA2",
  shirtShade: "#E2468A",
  jeans: "#2D4E8E",
  jeansShade: "#243F75",
  shoe: "#F3F6FB",
  sole: "#C9D3E4",
} as const;

/** The film's text faces. Both are loaded by the root layout. */
export const FONTS = {
  display: '"Baloo 2", "Nunito", system-ui, sans-serif',
  body: '"Nunito", system-ui, sans-serif',
} as const;

/** The faces the film waits for before it measures text, as `document.fonts.load` specs. */
export const FONT_SPECS = ['800 100px "Baloo 2"'] as const;

export const SCENES: readonly { name: SceneName; seconds: number }[] = [
  { name: "hello", seconds: 3 },
  { name: "tv", seconds: 3.8 },
  { name: "dive", seconds: 1 },
  { name: "pop", seconds: 2.6 },
  { name: "slice", seconds: 2.6 },
  { name: "catch", seconds: 2.8 },
  { name: "learn", seconds: 2.6 },
  { name: "library", seconds: 2.8 },
  { name: "rewards", seconds: 3 },
  { name: "bye", seconds: 2.8 },
];

/** The moment held still when the visitor prefers reduced motion. */
export const POSTER_TIME = 5.95;

export const FORMATS: Record<FormatKey, FilmFormat> = {
  desktop: {
    key: "desktop",
    width: 1920,
    height: 960,
    screenShot: { x: 960, y: 524, scale: 2.5 },
    roomShot: { x: 720, y: 650, scale: 1 },
    helloMascot: { x: 548, y: 340, width: 236 },
    helloText: { x: 150, y: 250, width: 780, height: 460, align: "left", maxSize: 136 },
    captionText: { x: 100, y: 110, width: 620, height: 300, align: "left", maxSize: 96 },
    playBox: { x: 372, y: 40, width: 388, height: 328, ground: 368, mascot: 204 },
  },
  phone: {
    key: "phone",
    width: 1080,
    height: 1350,
    screenShot: { x: 960, y: 524, scale: 3.125 },
    roomShot: { x: 1000, y: 640, scale: 0.86 },
    helloMascot: { x: 384, y: 262, width: 214 },
    helloText: { x: 80, y: 900, width: 920, height: 380, align: "center", maxSize: 132 },
    captionText: { x: 80, y: 70, width: 920, height: 200, align: "center", maxSize: 88 },
    playBox: { x: 215, y: 16, width: 338, height: 260, ground: 276, mascot: 172 },
  },
};

/** Where the mascot stands on the TV screen once the room is in view, in screen units. */
export const TV_MASCOT = { x: 548, y: 340, width: 236 } as const;

/** The film's words, one table per language. Lines are kept short so every one fits its box when translated. */
export const COPY: Record<"en", FilmCopy> = {
  en: {
    lines: {
      hello: ["No controller.", "Just your hands."],
      camera: ["The camera", "follows your hand."],
      pop: ["Point.", "Pop!"],
      slice: ["Swipe.", "Slice!"],
      catch: ["Reach.", "Catch!"],
      learn: ["Play.", "Learn the ABC."],
      library: ["Over 100 games.", "For the whole family."],
      rewards: ["Earn tickets.", "Climb the leaderboard."],
      bye: ["Play with", "a wave."],
    },
    description:
      "An animation about KinetoFun. The KinetoFun mascot, a smiling TV with a waving hand, says hello: no controller, just your hands. The view pulls back to a living room, where a child raises a hand towards the family TV. The camera on top of the TV follows the hand, a cursor ring appears on screen, and the mascot waves back. Then the mascot walks through a few games on the TV: pointing pops a balloon, a swipe slices fruit, two hands catch falling stars, and letter blocks light up one by one. A wall of game tiles scrolls past, over 100 games for the whole family. Tickets fly to a counter, the mascot jumps onto a leaderboard podium, and waves goodbye: play with a wave.",
  },
};
