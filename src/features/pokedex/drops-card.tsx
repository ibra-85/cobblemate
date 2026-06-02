"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MinecraftSlot, itemMeta } from "@/components/site/minecraft-item";
import { getSpeciesExtras, type DropEntry } from "@/data/species-extras";

interface Props {
  pokemonId: string;
}

/**
 * Loot table card — surfaces the Cobblemon mob drops on the detail
 * page instead of leaving them buried inside the "Détails du Pokémon"
 * modal. Drops are the most uniquely Cobblemon piece of data: a player
 * deciding what to farm needs to see this without an extra click.
 *
 * The whole block is hidden when the species has no drop table (e.g.
 * unobtainable forms, evolutions that inherit nothing) so empty
 * placeholders don't litter the page.
 */
export function DropsCard({ pokemonId }: Props) {
  const x = getSpeciesExtras(pokemonId);
  const rawEntries = x?.drops?.entries;

  // Sort by % desc so the most reliable drops sit at the top of the
  // list — entries without a percentage land last (guaranteed drops
  // are rare in Cobblemon and worth highlighting explicitly). Memoised
  // on the raw array reference so the sort fires once per species even
  // when the parent re-renders for unrelated reasons.
  const entries = useMemo(() => {
    if (!rawEntries) return null;
    return [...rawEntries].sort((a, b) => {
      if (a.percentage == null && b.percentage == null) return 0;
      if (a.percentage == null) return 1;
      if (b.percentage == null) return -1;
      return b.percentage - a.percentage;
    });
  }, [rawEntries]);

  if (!x?.drops || !entries || entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Jusqu&apos;à <strong>{x.drops.amount} objet{x.drops.amount > 1 ? "s" : ""}</strong> par K.O. — chaque ligne est tirée indépendamment.
      </p>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {entries.map((d, i) => (
          <DropRow key={`${d.item}-${i}`} drop={d} />
        ))}
      </div>
    </div>
  );
}

function DropRow({ drop }: { drop: DropEntry }) {
  const meta = itemMeta(drop.item);
  const tone = dropTone(drop.percentage);

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm">
      <MinecraftSlot item={drop.item} size="size-9" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{meta.label}</span>
        {drop.quantityRange && (
          <span className="font-mono text-[10px] text-muted-foreground">
            ×{drop.quantityRange}
          </span>
        )}
      </div>
      {drop.percentage != null ? (
        <Badge variant={tone} className="font-mono">
          {drop.percentage}%
        </Badge>
      ) : (
        <Badge variant="outline" className="font-mono text-[10px]">
          garanti
        </Badge>
      )}
    </div>
  );
}

/** Visual cue: greenish for very-likely, neutral for mid, muted for rare. */
function dropTone(pct: number | undefined): "default" | "secondary" | "outline" {
  if (pct == null) return "default";
  if (pct >= 50) return "default";
  if (pct >= 15) return "secondary";
  return "outline";
}

