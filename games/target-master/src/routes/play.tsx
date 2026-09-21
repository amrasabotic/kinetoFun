import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import ArcheryGame from "@/components/ArcheryGame";

const searchSchema = z.object({
  mode: z.enum(["levels", "endless"]).default("levels"),
  level: z.number().int().min(1).max(10).optional(),
});

export const Route = createFileRoute("/play")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Play — Target Master" },
      { name: "description", content: "Aim, draw, release. Play Target Master with hand tracking." },
    ],
  }),
  component: Play,
});

function Play() {
  const { mode, level } = Route.useSearch();
  return <ArcheryGame mode={mode} startLevel={(level ?? 1) - 1} />;
}
