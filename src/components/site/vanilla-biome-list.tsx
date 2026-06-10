"use client";

import { useState } from "react";
import { minecraftBiomeLabel, vanillaBiomesForTag } from "@/data/biomes";

/**
 * Inline list of the concrete vanilla Minecraft biomes a Cobblemon
 * `is_*` tag resolves to. Categories like "Magique" or "Overworld"
 * are too abstract to tell the player *where* to actually look — this
 * spells out the real biome names ("Plaines", "Forêt fleurie", …) so
 * the player can recognise them in-game.
 *
 * Modded biomes (BiomesOPlenty, Terralith, Wythers, …) are filtered
 * out by `vanillaBiomesForTag` — keeping the list manageable and
 * pinned to what the player will see in F3 on a vanilla world.
 *
 * Above 12 biomes (e.g. `is_overworld` spans ~30) we collapse to the
 * first 12 + a `+N de plus` toggle so the strip never dominates the
 * card. Shared between the per-Pokémon catching guide and the
 * `/biomes` explorer.
 */
export function VanillaBiomeList({ biome }: { biome: string }) {
  const ids = vanillaBiomesForTag(biome);
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_INITIAL = 12;
  if (ids.length === 0) return null;
  const visible = showAll ? ids : ids.slice(0, VISIBLE_INITIAL);
  const hidden = ids.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((id) => (
        <span
          key={id}
          className="rounded-md border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          {minecraftBiomeLabel(id)}
        </span>
      ))}
      {hidden > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="rounded-md border border-dashed border-muted-foreground/40 bg-transparent px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          +{hidden} de plus
        </button>
      )}
      {showAll && ids.length > VISIBLE_INITIAL && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="rounded-md border border-dashed border-muted-foreground/40 bg-transparent px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          Réduire
        </button>
      )}
    </div>
  );
}
