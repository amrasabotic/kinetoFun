import { useState } from 'react';
import { Hand, ArrowRight } from 'lucide-react';
import { Theme } from '../../data/types';
import { GestureButton } from '../GestureUI';

interface TutorialProps {
  theme: Theme;
  onComplete: () => void;
}

const steps = [
  {
    title: 'Move Your Cursor',
    description: 'Hold your hand in front of the webcam. Your index finger tip controls the cursor position on screen.',
    tip: 'Keep your hand steady for better tracking',
  },
  {
    title: 'Start Drawing',
    description: 'To start drawing a path, pinch your thumb and index finger together while hovering over a colored ball.',
    tip: 'The ball will glow when selected',
  },
  {
    title: 'Draw a Path',
    description: 'Keep pinching and move your hand to extend the path along the grid. The path automatically snaps to grid cells.',
    tip: 'Only up, down, left, right moves are allowed',
  },
  {
    title: 'Complete a Connection',
    description: 'Release the pinch when your path reaches the matching colored ball. If correct, the connection locks in!',
    tip: 'Match same-colored balls to complete pairs',
  },
  {
    title: 'Cancel & Undo',
    description: 'Open your palm for 0.8 seconds to cancel the current path. Swipe left with an open palm to undo the last completed path.',
    tip: 'Completed paths stay when you cancel',
  },
  {
    title: 'Navigate Menus',
    description: 'Move your cursor over buttons and pinch to select. All menus, settings, and game interactions use only hand gestures.',
    tip: 'No mouse or keyboard needed!',
  },
  {
    title: 'Special Gestures',
    description: 'Closed fist (1 sec) = Pause. Open palm (0.8 sec) = Cancel/Back. Swipe left = Undo. Raise hand high = Hint.',
    tip: 'These work during gameplay',
  },
];

export default function Tutorial({ theme, onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: theme.background }}>
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: i <= step ? theme.accentColor : 'rgba(255,255,255,0.2)',
              transform: i === step ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-md w-full text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: `${theme.accentColor}20` }}
        >
          <Hand className="w-8 h-8" style={{ color: theme.accentColor }} />
        </div>

        <h2 className="text-2xl font-bold mb-3" style={{ color: theme.textColor }}>
          {current.title}
        </h2>
        <p className="text-base opacity-80 mb-4 leading-relaxed" style={{ color: theme.textColor }}>
          {current.description}
        </p>
        <p className="text-sm opacity-50 italic" style={{ color: theme.textColor }}>
          {current.tip}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-10">
        {step > 0 && (
          <GestureButton
            onActivate={() => setStep(step - 1)}
            className="px-5 py-2 rounded-full text-sm font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            Back
          </GestureButton>
        )}
        <GestureButton
          onActivate={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else onComplete();
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
          style={{ background: theme.accentColor, color: '#1a1a2e' }}
        >
          {step < steps.length - 1 ? 'Next' : 'Start Playing'}
          <ArrowRight className="w-4 h-4" />
        </GestureButton>
      </div>

      {/* Skip */}
      {step < steps.length - 1 && (
        <GestureButton
          onActivate={onComplete}
          className="mt-4 text-xs opacity-40 px-4 py-2 rounded-full"
          style={{ color: theme.textColor }}
        >
          Skip Tutorial
        </GestureButton>
      )}
    </div>
  );
}
