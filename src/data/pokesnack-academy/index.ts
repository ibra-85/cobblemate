/**
 * PokéSnacks (Academy) — typed access layer for the dataset built by
 * `scripts/build-pokesnacks-academy.mjs`. Everything below is sourced
 * from the Cobblemon Academy Season 2 dex, NOT Smogon.
 *
 * See `src/data/pokesnacks/{seasonings,rules,pokesnacks.generated}.json`
 * for the raw data.
 */
import seasoningsRaw from "./seasonings.json";
import datasetRaw from "./pokesnacks.generated.json";

// ─── Confidence flags ───────────────────────────────────────────

export type EffectConfidence =
  | "official"
  | "community_or_inferred"
  | "missing";

export type DataConfidence =
  | "official"
  | "inferred"
  | "missing";

// ─── Seasonings ─────────────────────────────────────────────────

export interface SeasoningEffects {
  /** When non-null, multiplies spawn rate for the named type. */
  typeSpawnMultiplier: { type: string; value: number } | null;
  /** Rarity bucket bump, in paliers (0 = none). */
  rarityBoost: number;
  /** Shiny reroll multiplier (1 = base, 10 = ×10). */
  shinyMultiplier: number;
  /** % modifier on fishing bite time. Negative = faster bite. */
  biteRateModifier: number;
  hiddenAbilityBoost: number;
  alphaBoost: number;
  marksBoost: number;
  friendshipDelta: number;
  dropsRerolls: number;
  /** Effects that don't fit the flat axes above (nature, IV, EV, …). */
  extra?: {
    type: string;
    subcategory: string | null;
    chance: number;
    value: number;
  }[];
}

export interface Seasoning {
  /** snake_case slug without namespace ("golden_apple"). */
  id: string;
  /** Full Cobblemon/Minecraft id with namespace ("minecraft:golden_apple"). */
  fullId: string;
  name: { en: string; fr: string };
  color: string | null;
  effects: SeasoningEffects;
  effectConfidence: EffectConfidence;
  source: string;
  validInCampfirePot: boolean;
}

export const SEASONINGS: Seasoning[] = seasoningsRaw as Seasoning[];

const SEASONING_BY_FULL_ID = new Map<string, Seasoning>(
  SEASONINGS.map((s) => [s.fullId, s]),
);
const SEASONING_BY_ID = new Map<string, Seasoning>(
  SEASONINGS.map((s) => [s.id, s]),
);

export function getSeasoning(idOrFullId: string): Seasoning | null {
  return (
    SEASONING_BY_FULL_ID.get(idOrFullId) ??
    SEASONING_BY_ID.get(idOrFullId) ??
    null
  );
}

// ─── Per-Pokémon dataset ────────────────────────────────────────

export interface SnackRecipe {
  label: string;
  /** Up to 3 ingredient full-ids (Cobblemon/Minecraft namespaced).
   *  `null` = empty slot. */
  ingredients: (string | null)[];
  goal: string;
  reason: string;
  effectConfidence: EffectConfidence;
}

export interface PokesnackEntry {
  nationalDex: number | null;
  /** Academy-style id (snake_case, "tauros_paldea"). */
  slug: string;
  name: { en: string; fr: string };
  types: string[];
  category:
    | "common"
    | "uncommon"
    | "rare"
    | "ultra_rare"
    | "starter"
    | "fossil"
    | "legendary"
    | "mythical"
    | "paradox"
    | "ultra_beast"
    | "baby"
    | "regional";
  labels: string[];
  /** True when the Academy dex carries this mon (always true in the
   *  current dataset — we only iterate over the dex). */
  serverAvailable: boolean;
  implemented: boolean | null;
  forms: unknown[];
  spawn: {
    biomes: string[];
    biomesFr: string[];
    conditions: {
      time: string[];
      weather: string[];
      structures: string[];
      dimension: string[];
    };
    rarity: "common" | "uncommon" | "rare" | "ultra-rare" | "unknown";
    confidence: DataConfidence;
    sources: string[];
  };
  recommendedSnacks: {
    bestGeneral: SnackRecipe;
    budget: SnackRecipe;
    typeCoverage: SnackRecipe;
    rareSpawn: SnackRecipe;
    shinyHunt: SnackRecipe;
  };
  targeting: {
    priorityType: string | null;
    secondaryType: string | null;
    useCase: "general" | "starter_farm" | "elite_hunt";
    possibleParasiteSpawns: string[];
    notes: string[];
  };
  confidence: {
    pokemonData: DataConfidence;
    spawnData: DataConfidence;
    snackLogic: DataConfidence;
    seasoningEffects: EffectConfidence;
  };
}

export interface PokesnackDataset {
  meta: {
    generatedAt: string;
    source: string;
    counts: Record<string, number>;
  };
  entries: PokesnackEntry[];
}

export const POKESNACK_DATASET = datasetRaw as unknown as PokesnackDataset;
export const POKESNACK_ENTRIES: PokesnackEntry[] = POKESNACK_DATASET.entries;

const BY_SLUG = new Map<string, PokesnackEntry>(
  POKESNACK_ENTRIES.map((e) => [e.slug, e]),
);
const BY_DEX = new Map<number, PokesnackEntry[]>();
for (const e of POKESNACK_ENTRIES) {
  if (e.nationalDex == null) continue;
  const list = BY_DEX.get(e.nationalDex) ?? [];
  list.push(e);
  BY_DEX.set(e.nationalDex, list);
}

// ─── Public helpers ─────────────────────────────────────────────

/**
 * Look up the PokéSnack recommendations for one Pokémon by Academy
 * slug ("bulbasaur") or national-dex number (1).
 *
 *   getPokesnackRecommendationsForPokemon("pikachu")
 *   getPokesnackRecommendationsForPokemon(25)
 *
 * Numeric inputs can match several entries (regional forms share a
 * dex number) — when that happens we return the first; pass a slug
 * for an exact match.
 */
export function getPokesnackRecommendationsForPokemon(
  slugOrDex: string | number,
): PokesnackEntry | null {
  if (typeof slugOrDex === "number") {
    return BY_DEX.get(slugOrDex)?.[0] ?? null;
  }
  return BY_SLUG.get(slugOrDex) ?? null;
}

/** Variant of the above that returns every entry sharing the dex
 *  number — useful for surfacing all regional forms at once. */
export function getAllFormsForDex(dex: number): PokesnackEntry[] {
  return BY_DEX.get(dex) ?? [];
}

/** Cheap exact-match Pokémon lookup helpers for the UI search box. */
export function searchPokemon(query: string, limit = 30): PokesnackEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: PokesnackEntry[] = [];
  for (const e of POKESNACK_ENTRIES) {
    if (out.length >= limit) break;
    if (
      e.slug.includes(q) ||
      e.name.en.toLowerCase().includes(q) ||
      e.name.fr.toLowerCase().includes(q)
    ) {
      out.push(e);
    }
  }
  return out;
}
