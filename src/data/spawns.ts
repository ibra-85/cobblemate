import generated from "./spawns-generated.json";
import type { Rarity } from "@/types";

/**
 * Aggregated spawn data per Pokémon id, built from the Cobblemon mod
 * (`spawn_pool_world/` + `habitat_pools/`) and the Myths & Legends
 * datapack. Rebuild with: `node scripts/build-spawns-data.mjs`.
 *
 * One entry per Pokémon — multiple spawn rules collapse into unions of
 * their conditions. Use the array form `SPAWNS` for filter predicates,
 * `SPAWNS_BY_ID` for direct lookup on detail pages.
 */

export interface ItemRequirement {
  id: string;
  count: number;
  consume: boolean;
}

export interface SpawnAggregate {
  pokemonId: string;
  rarities: Rarity[];
  /** Cobblemon biome tag keys (`is_jungle`) or raw biome ids (`minecraft:frozen_peaks`). */
  biomes: string[];
  excludedBiomes: string[];
  /** "any" | "day" | "night" | "dusk" */
  times: string[];
  /** "any" | "clear" | "rain" */
  weathers: string[];
  /** "grounded" | "submerged" | "fishing" | "surface" | "seafloor" | … */
  contexts: string[];
  /** Habitat ids (e.g. "abandoned_fortress") — empty for natural-only spawns. */
  structures: string[];
  /** Key items required to trigger the spawn (Myths & Legends). */
  keyItems: string[];
  /** Items the spawn consumes/checks (Myths & Legends). */
  itemRequirements: ItemRequirement[];
  /** Overall level window across all rules. */
  levelRange: [number, number] | null;
  /** Origin labels for traceability ("cobblemon-mod/spawn_pool_world", …). */
  sources: string[];
}

type GeneratedEntry = Omit<SpawnAggregate, "pokemonId">;

// `generated`'s JSON-derived type widens `levelRange` to `number[]` —
// cast through `unknown` because the build script guarantees the tuple
// shape (or null).
export const SPAWNS_BY_ID: Record<string, SpawnAggregate> = Object.fromEntries(
  Object.entries(generated as unknown as Record<string, GeneratedEntry>).map(
    ([id, value]) => [id, { pokemonId: id, ...value }],
  ),
);

export const SPAWNS: SpawnAggregate[] = Object.values(SPAWNS_BY_ID);

/**
 * Reverse index — every Pokémon that spawns in a given biome key.
 * Used by the catching-guide UI to surface "also attracted" competitors
 * sharing the same biome.
 */
export const SPAWNS_BY_BIOME: Record<string, SpawnAggregate[]> = (() => {
  const idx: Record<string, SpawnAggregate[]> = {};
  for (const s of SPAWNS) {
    for (const b of s.biomes) (idx[b] ??= []).push(s);
  }
  return idx;
})();

// ─── Aggregate accessors used by the filter UI ───────────────────────

export const ALL_BIOMES: string[] = Array.from(
  new Set(SPAWNS.flatMap((s) => s.biomes)),
).sort();

export const ALL_STRUCTURES: string[] = Array.from(
  new Set(SPAWNS.flatMap((s) => s.structures)),
).sort();

export const ALL_RARITIES_IN_DATA: Rarity[] = Array.from(
  new Set(SPAWNS.flatMap((s) => s.rarities)),
) as Rarity[];

export { biomeLabel } from "./biomes";
