import { createFileRoute } from "@tanstack/react-router";
import GestureAirHockey from "@/components/GestureAirHockey";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gesture Air Hockey — Play with your hands" },
      {
        name: "description",
        content:
          "A kid-friendly 2D air hockey game controlled by your hand using your webcam. Pick Easy, Medium, Hard, or Endless and play!",
      },
      { property: "og:title", content: "Gesture Air Hockey" },
      {
        property: "og:description",
        content: "Play air hockey using hand gestures with your webcam.",
      },
    ],
  }),
  component: () => <GestureAirHockey />,
});
