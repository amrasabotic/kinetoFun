import { useState } from "react";
import { HandProvider, useHand } from "@/contexts/HandContext";
import GestureCursor from "@/components/GestureCursor";
import MainMenu from "@/pages/MainMenu";
import LevelSelect from "@/pages/LevelSelect";
import HowToPlay from "@/pages/HowToPlay";
import Game from "@/pages/Game";

type Screen = "menu" | "levelSelect" | "howToPlay" | "game";

function AppContent() {
  const [screen, setScreen]             = useState<Screen>("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const { cursor, isPinching }          = useHand();

  function startLevel(level: number) {
    setCurrentLevel(level);
    setScreen("game");
  }

  function handleNextLevel() {
    if (currentLevel < 10) {
      setCurrentLevel((l) => l + 1);
      setScreen("game");
    } else {
      setScreen("levelSelect");
    }
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black cursor-none">
      {screen === "menu" && (
        <MainMenu
          cursor={cursor}
          onPlay={() => setScreen("levelSelect")}
          onHowToPlay={() => setScreen("howToPlay")}
        />
      )}
      {screen === "levelSelect" && (
        <LevelSelect
          cursor={cursor}
          onSelectLevel={startLevel}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "howToPlay" && (
        <HowToPlay cursor={cursor} onBack={() => setScreen("menu")} />
      )}
      {screen === "game" && (
        <Game
          key={currentLevel}
          level={currentLevel}
          onMenu={() => setScreen("menu")}
          onNextLevel={handleNextLevel}
          onRetry={() => setScreen("game")}
        />
      )}
      <GestureCursor cursor={cursor} isPinching={isPinching} />
    </div>
  );
}

export default function App() {
  return (
    <HandProvider>
      <AppContent />
    </HandProvider>
  );
}
