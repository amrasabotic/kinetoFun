import { createFileRoute } from "@tanstack/react-router";
import SamuraiGame from "@/components/SamuraiGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Samurai Slice — Gesture-controlled samurai runner" },
      {
        name: "description",
        content:
          "A samurai runner controlled with your hand. MediaPipe reads your gestures to slash enemies in slow motion.",
      },
      { property: "og:title", content: "Samurai Slice" },
      { property: "og:description", content: "Cut down enemies with hand gestures. Powered by MediaPipe." },
    ],
  }),
  component: Index,
});

function Index() {
  return <SamuraiGame />;
}
