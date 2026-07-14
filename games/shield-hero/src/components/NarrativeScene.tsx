import React, { useState, useEffect } from 'react';
import { Level } from '../types/game';
import { ChevronRight } from 'lucide-react';

interface NarrativeProps {
  level: Level;
  onComplete: () => void;
  type: 'intro' | 'outro';
}

export const Narrative: React.FC<NarrativeProps> = ({ level, onComplete, type }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const scenes = level.narrative;
  const currentScene = scenes[currentSceneIndex];

  useEffect(() => {
    if (!currentScene) return;

    setDisplayedText('');
    setIsTyping(true);

    const text = currentScene.text;
    let index = 0;

    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [currentSceneIndex, currentScene]);

  const handleNext = () => {
    if (isTyping) {
      setDisplayedText(currentScene?.text || '');
      setIsTyping(false);
      return;
    }

    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!currentScene) {
    onComplete();
    return null;
  }

  return (
    <div
      className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30 cursor-pointer"
      onClick={handleNext}
    >
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(78, 204, 167, 0.2) 0%, transparent 70%)'
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-emerald-400 mb-2">
            {type === 'intro' ? `Level ${level.id}` : 'Level Complete!'}
          </h2>
          <p className="text-xl text-slate-400">{level.name}</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          {currentScene.character && (
            <div className="mb-4 text-amber-400 font-semibold">
              {currentScene.character}
            </div>
          )}

          <p className="text-xl text-white leading-relaxed min-h-[4rem]">
            {displayedText}
            {isTyping && <span className="animate-pulse">|</span>}
          </p>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
            <span className="text-sm">
              {currentSceneIndex < scenes.length - 1 ? 'Click to continue' : 'Click to start'}
            </span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>

          <div className="flex justify-center gap-2 mt-4">
            {scenes.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSceneIndex
                    ? 'bg-emerald-400'
                    : index < currentSceneIndex
                    ? 'bg-slate-500'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
