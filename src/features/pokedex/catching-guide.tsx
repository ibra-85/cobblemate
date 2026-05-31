"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Clock, CloudSun, Layers, Key, Target, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { SPAWNS_BY_BIOME, type SpawnAggregate } from "@/data/spawns";
import { biomeLabel } from "@/data/biomes";
import { getSpeciesExtras } from "@/data/species-extras";
import type { Pokemon, Rarity } from "@/types";

const TIME_LABEL: Record<string, string> = {
  any: "Toute heure", day: "Jour", night: "Nuit", dusk: "Crépuscule", dawn: "Aube",
};

const WEATHER_LABEL: Record<string, string> = {
  any: "Toute météo", clear: "Beau temps", rain: "Pluie",
};

const CONTEXT_LABEL: Record<string, string> = {
  grounded: "Sol", submerged: "Sous l'eau", surface: "Surface",
  seafloor: "Fond marin", fishing: "Pêche",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Commun", uncommon: "Peu commun", rare: "Rare", "ultra-rare": "Ultra rare",
};

const RARITY_TONE: Record<Rarity, string> = {
  common: "bg-zinc-500", uncommon: "bg-emerald-600",
  rare: "bg-blue-600", "ultra-rare": "bg-amber-700",
};

const COMPETITORS_INITIAL = 6;

interface Props {
  pokemon: Pokemon;
  spawn?: SpawnAggregate;
}

/**
 * "Où le trouver" — biome-by-biome catching guide. For each biome,
 * shows the rarity at this spot, the level range and (collapsed by
 * default) the competitor mons sharing the spawn pool.
 *
 * Two design choices vs the v1:
 *  - competitor list defaults to 6 entries with a "+N de plus" toggle
 *    so the card doesn't bury the player under thumbnails;
 *  - each competitor row spells out *why* they compete (their rarity
 *    in the same biome) — so the player understands at a glance
 *    whether the pool is crowded.
 */
export function CatchingGuide({ pokemon, spawn }: Props) {
  if (!spawn) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        Ce Pokémon n&apos;a pas de spawn naturel — il est obtenu via évolution,
        structure spéciale ou objet clé.
      </div>
    );
  }

  const cobblemonBiomes = spawn.biomes.filter(
    (b) => /(^|\/)is_/.test(b) && !b.includes(":"),
  );

  if (cobblemonBiomes.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        Pas de catégorie de biome lisible (uniquement des biomes spécifiques modés).
      </div>
    );
  }

  // Headline rarity for the spawn — used when a per-biome rarity isn't
  // distinguishable (the data is aggregated, all biomes share the same
  // rarity list).
  const rarityOrder: Rarity[] = ["ultra-rare", "rare", "uncommon", "common"];
  const headlineRarity = rarityOrder.find((r) => spawn.rarities.includes(r));

  return (
    <div className="flex flex-col gap-4">
      <SpawnMetaStrip spawn={spawn} pokemonId={pokemon.id} />

      {cobblemonBiomes.map((biome, i) => (
        <div key={biome}>
          {i > 0 && <Separator className="mb-4" />}
          <BiomeBlock
            pokemon={pokemon}
            biome={biome}
            rarity={headlineRarity}
            levelRange={spawn.levelRange}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Top strip absorbing the spawn data that used to clutter the hero
 * details column: niveau, contexte, heure, météo, objet-clé, catch
 * rate. Each chip is omitted when the underlying value is `any` /
 * empty so the strip stays tight for common cases.
 */
function SpawnMetaStrip({
  spawn,
  pokemonId,
}: {
  spawn: SpawnAggregate;
  pokemonId: string;
}) {
  const extras = getSpeciesExtras(pokemonId);

  const contexts = spawn.contexts.filter((c) => c !== "any");
  const times = spawn.times.filter((t) => t !== "any");
  const weathers = spawn.weathers.filter((w) => w !== "any");
  const keyItem = spawn.keyItems[0];
  const catchRate = extras?.catchRate;

  // Bail out cleanly if there's nothing meaningful to surface —
  // common for very generic spawns where everything is "any".
  if (
    !spawn.levelRange &&
    contexts.length === 0 &&
    times.length === 0 &&
    weathers.length === 0 &&
    !keyItem &&
    catchRate == null
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {spawn.levelRange && (
        <MetaChip icon={<Target className="size-3.5" />} label="Niveau">
          <span className="font-mono">{spawn.levelRange[0]}–{spawn.levelRange[1]}</span>
        </MetaChip>
      )}
      {contexts.length > 0 && (
        <MetaChip icon={<Layers className="size-3.5" />} label="Contexte">
          {contexts.map((c) => CONTEXT_LABEL[c] ?? c).join(" · ")}
        </MetaChip>
      )}
      {times.length > 0 && (
        <MetaChip icon={<Clock className="size-3.5" />} label="Heure">
          {times.map((t) => TIME_LABEL[t] ?? t).join(" · ")}
        </MetaChip>
      )}
      {weathers.length > 0 && (
        <MetaChip icon={<CloudSun className="size-3.5" />} label="Météo">
          {weathers.map((w) => WEATHER_LABEL[w] ?? w).join(" · ")}
        </MetaChip>
      )}
      {keyItem && (
        <MetaChip
          icon={<Key className="size-3.5" />}
          label="Objet-clé"
          tone="amber"
        >
          <span className="font-mono">{keyItem}</span>
        </MetaChip>
      )}
      {catchRate != null && (
        // Distinct icon from "Niveau" — both used `Target` before, which
        // made the level/catch chips read as duplicates at a glance.
        <MetaChip icon={<CircleDot className="size-3.5" />} label="Capture">
          <span className="font-mono">{catchRate} / 255</span>
        </MetaChip>
      )}
    </div>
  );
}

function MetaChip({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  /** Optional accent for key-items so the rare gated mechanic stands out. */
  tone?: "amber";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-muted/40";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${toneClasses}`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{children}</span>
    </span>
  );
}

function BiomeBlock({
  pokemon,
  biome,
  rarity,
  levelRange,
}: {
  pokemon: Pokemon;
  biome: string;
  rarity: Rarity | undefined;
  levelRange: [number, number] | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const competitors = (SPAWNS_BY_BIOME[biome] ?? [])
    .filter((s) => s.pokemonId !== pokemon.id);
  const visible = expanded ? competitors : competitors.slice(0, COMPETITORS_INITIAL);
  const hidden = competitors.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium">
          {biomeLabel(biome)}
        </span>
        {rarity && (
          <span
            className={`rounded border-none px-2 py-0.5 text-xs font-medium text-white ${RARITY_TONE[rarity]}`}
          >
            {RARITY_LABEL[rarity]}
          </span>
        )}
        {levelRange && (
          <span className="font-mono text-xs text-muted-foreground">
            Lv. {levelRange[0]}–{levelRange[1]}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {competitors.length} autre{competitors.length > 1 ? "s" : ""} Pokémon ici
        </span>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
          {visible.map((c) => {
            const p = POKEMON_BY_ID[c.pokemonId];
            if (!p) return null;
            const r = (["ultra-rare", "rare", "uncommon", "common"] as Rarity[])
              .find((x) => c.rarities.includes(x));
            return (
              <CompetitorCard key={c.pokemonId} pokemon={p} rarity={r} />
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aucun concurrent — {pokemon.name} a le biome pour lui seul ici.
        </p>
      )}

      {hidden > 0 && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="size-4" />
          +{hidden} de plus
        </Button>
      )}
      {expanded && competitors.length > COMPETITORS_INITIAL && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(false)}
          className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        >
          Réduire
        </Button>
      )}
    </div>
  );
}

function CompetitorCard({
  pokemon,
  rarity,
}: {
  pokemon: Pokemon;
  rarity: Rarity | undefined;
}) {
  return (
    <Link
      href={`/pokedex/${pokemon.id}`}
      className="group flex flex-col items-center gap-0.5 rounded-md bg-muted/40 p-2 text-center transition-colors hover:bg-accent/60"
    >
      <div className="size-14">
        <PokemonSprite pokemon={pokemon} />
      </div>
      <span className="line-clamp-1 w-full text-xs font-medium capitalize">
        {pokemon.name}
      </span>
      {rarity && (
        <Badge
          variant="secondary"
          className="px-1.5 text-[9px] font-medium uppercase"
        >
          {RARITY_LABEL[rarity]}
        </Badge>
      )}
    </Link>
  );
}
