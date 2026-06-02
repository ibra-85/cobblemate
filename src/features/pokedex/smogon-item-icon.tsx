"use client";

import { useState } from "react";
import { smogonItemImage, smogonItemImageBulbapedia } from "@/data/smogon";

/**
 * <img> wrapper with a two-tier local fallback chain:
 *   1. Cobblemon mod texture (Minecraft pixel art, in-game look)
 *   2. Bulbapedia bag sprite mirrored at build time
 *   3. "?" placeholder (only if both PNGs were 404 — shouldn't happen
 *      in practice; the build script fetches everything we reference)
 *
 * Client component because `onError` event handlers don't cross the
 * server/client boundary in Next.js' app router.
 */
export function SmogonItemIcon({
  name,
  size = 32,
}: {
  name: string;
  size?: number;
}) {
  const [stage, setStage] = useState<"cobblemon" | "bulbapedia" | "broken">("cobblemon");

  if (stage === "broken") {
    return (
      <div
        className="grid place-items-center rounded bg-muted text-[10px] text-muted-foreground"
        style={{ width: size, height: size }}
        aria-label={name}
      >
        ?
      </div>
    );
  }

  const src =
    stage === "cobblemon" ? smogonItemImage(name) : smogonItemImageBulbapedia(name);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="size-full object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={() => setStage(stage === "cobblemon" ? "bulbapedia" : "broken")}
      />
    </div>
  );
}
