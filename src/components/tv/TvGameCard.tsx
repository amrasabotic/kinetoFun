import Image from "next/image";
import Link from "next/link";
import { Heart, Lock } from "lucide-react";
import type { Game } from "@/types";

/** Large game tile for the TV games home, sized to be read from the sofa. */
export function TvGameCard({ game, favorite }: { game: Game; favorite: boolean }) {
  const image = game.coverImage || game.thumbnail;

  return (
    <Link
      href={`/tvsetup/games/${game.id}`}
      data-focusable
      className="relative flex h-full overflow-hidden rounded-3xl bg-white/5"
    >
      {image ? (
        <Image src={image} alt="" fill sizes="25vw" className="object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${game.cover}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute right-4 top-4 flex gap-2">
        {favorite && (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
            <Heart className="h-6 w-6 fill-destructive text-destructive" />
          </span>
        )}
        {game.unlockCost ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400">
            <Lock className="h-6 w-6 text-amber-950" />
          </span>
        ) : null}
      </div>

      <div className="relative mt-auto p-6">
        <p className="text-3xl font-black leading-tight text-white drop-shadow">{game.title}</p>
        <p className="mt-1 text-xl text-white/70">{game.category}</p>
      </div>
    </Link>
  );
}
