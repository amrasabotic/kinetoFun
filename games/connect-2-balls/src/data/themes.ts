import { Theme } from './types';

export const themes: Theme[] = [
  {
    id: 'forest',
    name: 'Forest',
    background: 'linear-gradient(135deg, #1a4332 0%, #2d6a4f 50%, #40916c 100%)',
    gridColor: '#2d6a4f',
    cellColor: 'rgba(45, 106, 79, 0.3)',
    cellBorder: 'rgba(64, 145, 108, 0.4)',
    textColor: '#d8f3dc',
    accentColor: '#95d5b2',
    particleColors: ['#95d5b2', '#74c69d', '#52b788', '#40916c'],
    unlockLevel: 0,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: 'linear-gradient(135deg, #023e8a 0%, #0077b6 50%, #0096c7 100%)',
    gridColor: '#0077b6',
    cellColor: 'rgba(0, 119, 182, 0.3)',
    cellBorder: 'rgba(0, 150, 199, 0.4)',
    textColor: '#caf0f8',
    accentColor: '#48cae4',
    particleColors: ['#48cae4', '#00b4d8', '#0096c7', '#90e0ef'],
    unlockLevel: 5,
  },
  {
    id: 'candy',
    name: 'Candy Land',
    background: 'linear-gradient(135deg, #ff6b9d 0%, #ffa07a 50%, #ffd93d 100%)',
    gridColor: '#ff8fab',
    cellColor: 'rgba(255, 143, 171, 0.3)',
    cellBorder: 'rgba(255, 183, 197, 0.4)',
    textColor: '#fff',
    accentColor: '#ffd93d',
    particleColors: ['#ff6b9d', '#ffa07a', '#ffd93d', '#a8e6cf'],
    unlockLevel: 10,
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2c3e50 100%)',
    gridColor: '#1b2838',
    cellColor: 'rgba(27, 40, 56, 0.5)',
    cellBorder: 'rgba(52, 73, 94, 0.5)',
    textColor: '#ecf0f1',
    accentColor: '#3498db',
    particleColors: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'],
    unlockLevel: 15,
  },
  {
    id: 'neon',
    name: 'Neon',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    gridColor: '#1a1a2e',
    cellColor: 'rgba(26, 26, 46, 0.6)',
    cellBorder: 'rgba(0, 255, 136, 0.2)',
    textColor: '#00ff88',
    accentColor: '#00ff88',
    particleColors: ['#00ff88', '#ff0066', '#00ccff', '#ffcc00'],
    unlockLevel: 20,
  },
  {
    id: 'temple',
    name: 'Ancient Temple',
    background: 'linear-gradient(135deg, #3d2b1f 0%, #5c3d2e 50%, #8b6914 100%)',
    gridColor: '#5c3d2e',
    cellColor: 'rgba(92, 61, 46, 0.4)',
    cellBorder: 'rgba(139, 105, 20, 0.4)',
    textColor: '#f4e4c1',
    accentColor: '#d4a017',
    particleColors: ['#d4a017', '#f4e4c1', '#8b6914', '#cd853f'],
    unlockLevel: 25,
  },
];

export const ballColors = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#e11d48', // rose
];

export const colorblindColors = [
  '#0072B2', // blue
  '#E69F00', // orange
  '#009E73', // teal
  '#CC79A7', // pink
  '#F0E442', // yellow
  '#56B4E9', // sky
  '#D55E00', // vermillion
  '#000000', // black
  '#FFFFFF', // white
  '#999999', // gray
];
