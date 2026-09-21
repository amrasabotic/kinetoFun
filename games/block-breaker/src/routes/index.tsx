import { createFileRoute } from "@tanstack/react-router";
import { BlockBreaker } from "@/components/BlockBreaker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Block Breaker — Retro Arcade with Hand Tracking" },
      {
        name: "description",
        content:
          "Classic retro 2D arcade block breaker. Control the paddle by moving your hand in front of your webcam. Powered by MediaPipe hand tracking.",
      },
      { property: "og:title", content: "Block Breaker — Retro Arcade" },
      {
        property: "og:description",
        content: "Move your hand to control the paddle. Break blocks. Beat your high score.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <BlockBreaker />;
}
