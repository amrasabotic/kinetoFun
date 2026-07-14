import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LEVELS } from "@/lib/levels";
import { GameBoard } from "@/components/game/GameBoard";

export const Route = createFileRoute("/play/$level")({
  head: ({ params }) => ({
    meta: [
      { title: `Level ${params.level} · Neon Flow` },
      { name: "description", content: `Solve Neon Flow level ${params.level}. Pinch to grab, draw paths, fill the grid.` },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const { level } = Route.useParams();
  const navigate = useNavigate();
  const id = Number(level);
  const exists = LEVELS.some((l) => l.id === id);
  useEffect(() => {
    if (!exists) navigate({ to: "/play" });
  }, [exists, navigate]);
  if (!exists) return null;
  return <GameBoard levelId={id} />;
}