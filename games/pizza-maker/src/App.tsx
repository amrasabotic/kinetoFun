import { useState, useCallback } from 'react';
import LandingScreen from './LandingScreen';
import HowToPlayScreen from './HowToPlayScreen';
import OrderScreen from './OrderScreen';
import BakingScreen from './BakingScreen';
import type { GameScreen, PizzaOrder } from './types';
import { PIZZA_ORDERS } from './types';

interface PlacedIngredient {
  id: string;
  type: string;
  x: number;
  y: number;
}

function getRandomOrder(): PizzaOrder {
  return PIZZA_ORDERS[Math.floor(Math.random() * PIZZA_ORDERS.length)];
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen | 'howtoplay'>('landing');
  const [currentOrder, setCurrentOrder] = useState<PizzaOrder>(() => getRandomOrder());
  const [finalScore, setFinalScore] = useState<number>(0);

  const handlePlay = useCallback(() => {
    setCurrentOrder(getRandomOrder());
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
    window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    setScreen('result');
  }, []);

  const handleGivePizza = useCallback(() => {
    setCurrentOrder(getRandomOrder());
    setScreen('order');
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      {screen === 'landing' && (
        <LandingScreen onPlay={handlePlay} onHowToPlay={handleHowToPlay} />
      )}
      {screen === 'howtoplay' && (
        <HowToPlayScreen onBack={handleBackToLanding} onPlay={handlePlay} />
      )}
      {screen === 'order' && (
        <OrderScreen order={currentOrder} onAccept={handleAcceptOrder} />
      )}
      {screen === 'baking' && (
        <BakingScreen order={currentOrder} onBake={handleBake} />
      )}
      {screen === 'result' && (
        <OrderScreen
          order={currentOrder}
          onAccept={handleAcceptOrder}
          showPizzaBox
          finalScore={finalScore}
          onGivePizza={handleGivePizza}
        />
      )}
    </div>
  );
}
