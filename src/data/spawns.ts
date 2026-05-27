import type { SpawnCondition } from "@/types";

/**
 * Sample spawn conditions. Cobblemon spawn JSONs live in
 * `config/cobblemon/spawn_pool_world/*.json` — the schema matches very
 * closely so a converter script can replace this file 1:1.
 */
export const SPAWNS: SpawnCondition[] = [
  { pokemonId: "bulbasaur",  biomes: ["forest", "plains"],            dayPeriod: "day",   weather: "any",   dimension: "overworld", rarity: "uncommon" },
  { pokemonId: "ivysaur",    biomes: ["forest", "jungle"],            dayPeriod: "day",   weather: "any",   dimension: "overworld", rarity: "rare" },
  { pokemonId: "venusaur",   biomes: ["jungle", "swamp"],             dayPeriod: "day",   weather: "any",   dimension: "overworld", rarity: "ultra-rare" },
  { pokemonId: "raichu",     biomes: ["plains", "meadow"],            dayPeriod: "day",   weather: "thunder", dimension: "overworld", rarity: "rare" },
  { pokemonId: "charizard",  biomes: ["badlands", "savanna"],         dayPeriod: "day",   weather: "clear", dimension: "overworld", rarity: "ultra-rare", minY: 60 },
  { pokemonId: "blastoise",  biomes: ["ocean", "deep_ocean"],         dayPeriod: "any",   weather: "any",   dimension: "overworld", rarity: "rare" },
  { pokemonId: "pikachu",    biomes: ["forest", "plains", "meadow"],  dayPeriod: "day",   weather: "any",   dimension: "overworld", rarity: "uncommon" },
  { pokemonId: "snorlax",    biomes: ["plains", "meadow"],            dayPeriod: "night", weather: "any",   dimension: "overworld", rarity: "rare" },
  { pokemonId: "gengar",     biomes: ["dark_forest", "swamp"],        dayPeriod: "night", weather: "any",   dimension: "overworld", rarity: "rare" },
  { pokemonId: "garchomp",   biomes: ["badlands", "desert"],          dayPeriod: "any",   weather: "any",   dimension: "overworld", rarity: "ultra-rare", maxY: 40 },
  { pokemonId: "lucario",    biomes: ["mountain", "stony_peaks"],     dayPeriod: "any",   weather: "any",   dimension: "overworld", rarity: "rare" },
  { pokemonId: "togekiss",   biomes: ["meadow", "cherry_grove"],      dayPeriod: "day",   weather: "clear", dimension: "overworld", rarity: "ultra-rare" },
  { pokemonId: "rotom_wash", biomes: ["river", "ocean"],              dayPeriod: "any",   weather: "rain",  dimension: "overworld", rarity: "rare" },
  { pokemonId: "scizor",     biomes: ["forest", "birch_forest"],      dayPeriod: "day",   weather: "any",   dimension: "overworld", rarity: "uncommon" },
  { pokemonId: "tyranitar",  biomes: ["badlands", "stony_peaks"],     dayPeriod: "any",   weather: "any",   dimension: "overworld", rarity: "ultra-rare", maxY: 30 },
];

export const ALL_BIOMES = Array.from(new Set(SPAWNS.flatMap((s) => s.biomes))).sort();

/**
 * Localized labels for known Cobblemon / Minecraft biome ids. Falls back
 * gracefully (via `biomeLabel()`) for any biome not in this map — handy
 * when the SPAWNS list is later replaced by the full Cobblemon pool.
 */
export const BIOME_LABELS: Record<string, string> = {
  badlands:      "Badlands",
  birch_forest:  "Forêt de bouleaux",
  cherry_grove:  "Bosquet de cerisiers",
  dark_forest:   "Forêt sombre",
  deep_ocean:    "Océan profond",
  desert:        "Désert",
  forest:        "Forêt",
  jungle:        "Jungle",
  meadow:        "Prairie",
  mountain:      "Montagne",
  ocean:         "Océan",
  plains:        "Plaines",
  river:         "Rivière",
  savanna:       "Savane",
  stony_peaks:   "Pics rocheux",
  swamp:         "Marais",
};

/** Best-effort label for a biome id (falls back to a humanized form). */
export function biomeLabel(id: string): string {
  return (
    BIOME_LABELS[id] ??
    id
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
