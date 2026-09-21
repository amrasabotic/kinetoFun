import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick } from '../../game/audio/audioSystem';

interface Props {
  onBack: () => void;
}

const SLIDES = [
  {
    emoji: '✋',
    title: 'Move Your Hand',
    body: 'Point your hand left, right, up, or down to steer your snake. The snake always follows where you point.',
    tip: 'Keep your hand in the camera frame for best results.',
  },
  {
    emoji: '↔️',
    title: 'Control Speed',
    body: 'Move your hand further from the center of the frame to go faster. Stay near the center to slow down.',
    tip: 'Analog control — more distance = more speed.',
  },
  {
    emoji: '✊',
    title: 'Fist to Boost',
    body: 'Make a closed fist to activate a speed boost! You leave a glowing trail and move much faster.',
    tip: 'Boosting slowly shrinks your snake. A 2-second cooldown applies after releasing.',
  },
  {
    emoji: '⚡',
    title: 'Collect Energy Orbs',
    body: 'Glowing orbs are scattered around the arena. Collect them to grow longer and score points. Rarer orbs are worth more!',
    tip: 'Blue → Green → Purple → Gold → Rainbow (most valuable).',
  },
  {
    emoji: '🐍',
    title: 'Avoid Enemy Bodies',
    body: 'Crashing into another snake\'s body destroys you! Larger snake heads win head-to-head collisions.',
    tip: 'Use your own body to trap enemies and force them to crash into you.',
  },
  {
    emoji: '💥',
    title: 'Trap Opponents',
    body: 'Circle around AI snakes to trap them. When they crash into your body, they explode into energy for you to collect!',
    tip: 'Bigger snake kills smaller snake in a head-on crash.',
  },
  {
    emoji: '🎯',
    title: 'Use Power-ups',
    body: 'Hexagonal power-ups appear in the arena: Shield (immunity), Magnet (attract orbs), Ghost (pass through), Freeze (slow AI), and more!',
    tip: 'They disappear after 15 seconds — grab them fast!',
  },
  {
    emoji: '🏆',
    title: 'Beat Your Score',
    body: 'Build combos by collecting orbs quickly. Complete quests for bonus coins. Unlock cosmetics in the Skins menu!',
    tip: 'Survive longer = more survival score. Be the longest snake!',
  },
];

export default function HowToPlay({ onBack }: Props) {
  const [slide, setSlide] = useState(0);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-2">
        <button className="text-white/60 font-display text-lg hover:text-white transition-colors"
          onClick={() => { playClick(); onBack(); }}>← Back</button>
        <h2 className="text-2xl font-black font-display text-white">How to Play</h2>
      </div>

      {/* Slide progress */}
      <div className="flex gap-1.5 px-6 py-2">
        {SLIDES.map((_, i) => (
          <button key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i === slide ? '#7C3AED' : 'rgba(255,255,255,0.15)' }}
            onClick={() => { playClick(); setSlide(i); }}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            className="flex flex-col items-center gap-5 text-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-7xl">{SLIDES[slide].emoji}</div>
            <h3 className="text-2xl font-black font-display text-white">{SLIDES[slide].title}</h3>
            <p className="text-white/70 font-sans text-base max-w-sm leading-relaxed">{SLIDES[slide].body}</p>
            <div className="px-4 py-3 rounded-2xl text-sm font-sans text-sky-300 max-w-sm"
              style={{ background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)' }}>
              💡 {SLIDES[slide].tip}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 px-6 pb-8">
        <button
          className="flex-1 py-4 rounded-2xl font-display font-bold text-white/60 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => { playClick(); setSlide(Math.max(0, slide - 1)); }}
          disabled={slide === 0}>
          ← Prev
        </button>
        {slide < SLIDES.length - 1
          ? <button
              className="flex-1 py-4 rounded-2xl font-display font-bold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
              onClick={() => { playClick(); setSlide(slide + 1); }}>
              Next →
            </button>
          : <button
              className="flex-1 py-4 rounded-2xl font-display font-bold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}
              onClick={() => { playClick(); onBack(); }}>
              Got It! ✓
            </button>
        }
      </div>
    </div>
  );
}
