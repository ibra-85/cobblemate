"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemIcon, itemMeta } from "@/components/site/minecraft-item";
import { itemDisplayName } from "@/data/competitive-items";
import { itemSlug, lookupItem } from "@/data/items-pokeapi";
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
  // Strip the `cobblemon:` / `minecraft:` prefix to land the
  // PokéAPI-style slug used by the item detail route. When the slug
  // resolves we wrap the icon + name in a Link so a click jumps
  // straight to the item page; tooltip works either way.
  const bare = drop.item.replace(/^[a-z]+:/, "");
  const slug = itemSlug(bare);
  const href = slug ? `/items/${slug}` : null;
  const fr = itemDisplayName(bare);
  const pokeapi = lookupItem(bare);
  const eff = pokeapi?.shortEffect?.trim();
  const desc = pokeapi?.description?.trim();
  const showDesc = desc && desc !== eff;

  const inner = (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm transition-colors hover:bg-accent/40">
      {/* Plain item image (no inventory-slot chrome). The previous
          `MinecraftSlot` painted a 3D bevel + dark frame that read as
          "this is a slot you can interact with" — distracting on a
          loot list where the items are purely informational. */}
      <ItemIcon item={drop.item} size="size-7" className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{fr || meta.label}</span>
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

  const triggered = href ? (
    <Link
      href={href}
      className="no-underline"
      aria-label={`Voir ${fr || meta.label}`}
    >
      {inner}
    </Link>
  ) : (
    <div className="cursor-help">{inner}</div>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="block">{triggered}</span>} />
      <TooltipContent>
        <div className="flex flex-col gap-2 py-0.5 text-left">
          <div className="flex items-center gap-2.5">
            <ItemIcon item={drop.item} size="size-9" />
            <span className="text-sm font-semibold leading-tight text-foreground">
              {fr || meta.label}
            </span>
          </div>
          {eff && (
            <p className="text-[11px] leading-snug text-foreground/90">{eff}</p>
          )}
          {showDesc && (
            <p className="text-[10px] italic leading-snug text-muted-foreground">
              {desc}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Visual cue: greenish for very-likely, neutral for mid, muted for rare. */
function dropTone(pct: number | undefined): "default" | "secondary" | "outline" {
  if (pct == null) return "default";
  if (pct >= 50) return "default";
  if (pct >= 15) return "secondary";
  return "outline";
}

