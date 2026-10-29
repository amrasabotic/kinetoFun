import { useState, useCallback, useEffect } from 'react';
import LandingScreen from './LandingScreen';
import HowToPlayScreen from './HowToPlayScreen';
import OrderScreen from './OrderScreen';
import BakingScreen from './BakingScreen';
import MenuHandCursor from './MenuHandCursor';
import type { GameScreen, PizzaOrder } from './types';
import { PIZZA_ORDERS } from './types';

interface PlacedIngredient {
  id: string;
  type: string;
  x: number;
  y: number;
}

const MAX_LEVEL = 10;

// Orders grow from three ingredients to The Works as levels go up.
function orderForLevel(level: number): PizzaOrder {
  const top = Math.min(PIZZA_ORDERS.length - 1, Math.floor((level - 1) / 2));
  const pool = PIZZA_ORDERS.slice(Math.max(0, top - 1), top + 1);
  return pool[Math.floor(Math.random() * pool.length)];
}

// One score per visit: every baked pizza adds to the total, sent once when the player leaves or finishes.
function reportTotal(total: number) {
  window.parent.postMessage(total > 0 ? { type: 'GAME_COMPLETE', score: total } : { type: 'GAME_EXIT' }, '*');
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen | 'howtoplay'>('howtoplay');
  const [level, setLevel] = useState(1);
  const [total, setTotal] = useState(0);
  // The platform's Back button: with pizzas baked it reports the total; otherwise one screen back, and out from the first screens.
  useEffect(() => {
    (window as unknown as { __kfBack?: () => boolean }).__kfBack = () => {
      if (total > 0) { reportTotal(total); return true; }
      if (screen === 'landing' || screen === 'howtoplay') return false;
      setScreen('landing');
      return true;
    };
  }, [screen, total]);

  const [currentOrder, setCurrentOrder] = useState<PizzaOrder>(() => orderForLevel(1));

  const [finalScore, setFinalScore] = useState<number>(0);

  const handlePlay = useCallback(() => {
    setLevel(1);
    setTotal(0);
    setCurrentOrder(orderForLevel(1));
    setScreen('order');
  }, []);

  const handleHowToPlay = useCallback(() => {
    setScreen('howtoplay');
  }, []);

  const handleBackToLanding = useCallback(() => {
    setScreen('landing');
  }, []);

  const handleAcceptOrder = useCallback(() => {
    setScreen('baking');
  }, []);

  const handleBake = useCallback((_placed: PlacedIngredient[], score: number) => {
    setFinalScore(score);
    setTotal((t) => t + score);
    setScreen('result');
  }, []);

  const handleGivePizza = useCallback(() => {
    if (level >= MAX_LEVEL) {
      reportTotal(total);
      setScreen('landing');
      return;
    }
    setLevel(level + 1);
    setCurrentOrder(orderForLevel(level + 1));
    setScreen('order');
  }, [level, total]);

  return (
    <div className="w-screen h-screen overflow-hidden">
      {screen === 'landing' && (
        <LandingScreen onPlay={handlePlay} onHowToPlay={handleHowToPlay} />
      )}
      {screen === 'howtoplay' && (
        <HowToPlayScreen onBack={handleBackToLanding} onPlay={handlePlay} />
      )}
      {screen === 'order' && (
        <OrderScreen order={currentOrder} onAccept={handleAcceptOrder} level={level} maxLevel={MAX_LEVEL} />
      )}
      {screen === 'baking' && (
        <BakingScreen order={currentOrder} level={level} onBake={handleBake} />
      )}
      {screen !== 'baking' && <MenuHandCursor />}
      {screen === 'result' && (
        <OrderScreen
          order={currentOrder}
          onAccept={handleAcceptOrder}
          showPizzaBox
          finalScore={finalScore}
          onGivePizza={handleGivePizza}
          level={level}
          maxLevel={MAX_LEVEL}
        />
      )}
    </div>
  );
}
