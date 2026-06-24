import { Level } from '../types/game';

export const levels: Level[] = [
  {
    id: 1,
    name: "The Beginning",
    region: "Greenwood Village",
    duration: 45000,
    spawnRate: 1500,
    starChance: 0.15,
    speedMultiplier: 1,
    scoreTarget: 200,
    objective: "Survive and learn the basics",
    narrative: [
      { text: "In a land of plenty, a young hero discovers an ancient shield...", character: "Narrator" },
      { text: "The villages are under attack by rogue apples! Only you can protect them.", character: "Elder" },
      { text: "Use your hand to guide the shield. Block the apples, but let the stars through!", character: "Elder" }
    ]
  },
  {
    id: 2,
    name: "Rising Storm",
    region: "Stormy Peaks",
    duration: 50000,
    spawnRate: 1200,
    starChance: 0.18,
    speedMultiplier: 1.2,
    scoreTarget: 400,
    objective: "Face faster attacks",
    narrative: [
      { text: "Your skill grows, young hero. But the orchard spirits grow restless.", character: "Narrator" },
      { text: "The attacks are coming faster now. Stay focused!", character: "Elder" }
    ]
  },
  {
    id: 3,
    name: "Orchard Uprising",
    region: "The Cursed Grove",
    duration: 55000,
    spawnRate: 1000,
    starChance: 0.2,
    speedMultiplier: 1.4,
    scoreTarget: 700,
    objective: "Weather the storm",
    narrative: [
      { text: "The orchard king has awakened! His fury knows no bounds.", character: "Narrator" },
      { text: "More apples than ever before! Can you hold the line?", character: "Elder" },
      { text: "Remember: stars are your friends. Catch them all!", character: "Elder" }
    ]
  },
  {
    id: 4,
    name: "The Final Stand",
    region: "Throne of the Orchard King",
    duration: 60000,
    spawnRate: 800,
    starChance: 0.22,
    speedMultiplier: 1.6,
    scoreTarget: 1200,
    objective: "Defeat the Orchard King",
    narrative: [
      { text: "The Orchard King himself approaches the battlefield.", character: "Narrator" },
      { text: "You've come so far, hero. This is your moment!", character: "Elder" },
      { text: "Show them the power of the ancient shield!", character: "Elder" },
      { text: "Victory is within reach. Give it everything you have!", character: "Elder" }
    ]
  }
];
