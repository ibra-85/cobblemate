"use client";

import Image from "next/image";
import { useState } from "react";
import type { Pokemon } from "@/types";
import { getOfficialArtworkUrl, getSpriteUrl } from "@/lib/sprites";
import { cn } from "@/lib/utils";

interface Props {
  pokemon: Pick<Pokemon, "dexNumber" | "name" | "imageUrl">;
  variant?: "sprite" | "artwork";
  className?: string;
  /** Tailwind size class (size-12, size-32…). Defaults to size-full. */
  size?: string;
  /**
   * Set `true` for the LCP image — typically the largest artwork above
   * the fold (featured-pokemon banner, detail-page hero). Forces eager
   * loading + `fetchpriority=high` + preload hint, silencing Next.js's
   * LCP warning.
   */
  priority?: boolean;
}

/**
 * Pokémon sprite/artwork with graceful fallback to initials when the
 * remote image fails (e.g. offline or non-Gen-1-to-8 dex number).
 */
export function PokemonSprite({
  pokemon,
  variant = "sprite",
  className,
  size = "size-full",
  priority = false,
}: Props) {
  const [errored, setErrored] = useState(false);

  const src =
    pokemon.imageUrl ??
    (variant === "artwork"
      ? getOfficialArtworkUrl(pokemon.dexNumber)
      : getSpriteUrl(pokemon.dexNumber));

  const initials = pokemon.name.slice(0, 2).toUpperCase();

  if (errored) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-md bg-muted font-heading text-sm font-bold text-muted-foreground",
          size,
          className,
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn("relative", size, className)}>
      <Image
        src={src}
        alt={pokemon.name}
        fill
        sizes="(max-width: 768px) 96px, 160px"
        className="object-contain"
        unoptimized
        priority={priority}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
