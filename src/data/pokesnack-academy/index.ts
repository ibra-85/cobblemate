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
import { BEST_GENERAL_OVERRIDES } from "./overrides";

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
      /** Time-of-day predicates (e.g. "night", "day"). Sometimes
       *  serialised as `{timeRange: string}` objects in the source. */
      time: Array<string | Record<string, unknown>>;
      /** Weather predicates from the Cobblemon spawn schema — usually
       *  `{isRaining: boolean}` objects, not raw strings. */
      weather: Array<string | Record<string, unknown>>;
      structures: Array<string | Record<string, unknown>>;
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

/**
 * Render a single condition predicate into a human-readable French
 * label. The upstream Academy dataset stores some predicates as
 * raw strings (`"night"`, `"day"`) and others as small objects
 * (`{isRaining: true}`, `{structure: "minecraft:village"}`). The
 * pre-baked `targeting.notes` flatten everything with `.join(", ")`
 * which prints `[object Object]` for the object shapes — fix at the
 * loader so consumers always get strings.
 */
export function formatSpawnCondition(
  kind: "time" | "weather" | "structure" | "dimension",
  value: string | Record<string, unknown>,
): string {
  if (typeof value === "string") {
    if (kind === "time") {
      return value === "night" ? "nuit"
           : value === "day" ? "jour"
           : value === "dawn" ? "aube"
           : value === "dusk" ? "crépuscule"
           : value;
    }
    return value;
  }
  // Weather predicates — `{isRaining: true|false}`. `false` is a
  // negative predicate ("must not be raining") which is the default
  // for most overworld spawns; we filter those out at the call site.
  if ("isRaining" in value) {
    return value.isRaining ? "pluie" : "temps clair";
  }
  if ("isThundering" in value) {
    return value.isThundering ? "orage" : "pas d'orage";
  }
  // Structure predicates — `{structure: "minecraft:village"}`.
  if ("structure" in value && typeof value.structure === "string") {
    return value.structure.replace(/^#?\w+:/, "").replace(/_/g, " ");
  }
  // Time-range predicates — `{timeRange: "night"}`.
  if ("timeRange" in value && typeof value.timeRange === "string") {
    return formatSpawnCondition("time", value.timeRange);
  }
  return JSON.stringify(value);
}

/**
 * Patch the entries that came out of the build script:
 *   - The pre-computed `targeting.notes` join object predicates as
 *     `[object Object]`. We drop those and re-derive readable notes
 *     from `spawn.conditions`.
 *
 * Done lazily once at module load so consumers see clean strings.
 */
function patchEntry(e: PokesnackEntry): PokesnackEntry {
  const conds = e.spawn.conditions;
  const cleanNotes: string[] = [];
  for (const n of e.targeting.notes) {
    if (typeof n === "string" && !n.includes("[object Object]")) {
      cleanNotes.push(n);
    }
  }
  // Re-derive the condition lines that previously broke. Each spawn
  // rule lists its predicates independently — many mons end up with
  // the same `{isRaining: true}` repeated 3–4× because they have 3–4
  // spawn rules. Dedupe via `Set` so the rendered note reads
  // "pluie" once instead of "pluie, pluie, pluie".
  if (conds.time.length > 0) {
    const labels = Array.from(
      new Set(
        conds.time
          .map((t) => formatSpawnCondition("time", t))
          .filter(Boolean),
      ),
    );
    if (labels.length > 0)
      cleanNotes.push(`Moment de la journée : ${labels.join(", ")}.`);
  }
  if (conds.weather.length > 0) {
    // Drop "must not be raining" predicates — they apply to almost
    // every overworld mon and add noise rather than signal.
    const labels = Array.from(
      new Set(
        conds.weather
          .filter((w) =>
            typeof w === "string" || !("isRaining" in w) || w.isRaining === true,
          )
          .map((w) => formatSpawnCondition("weather", w)),
      ),
    );
    if (labels.length > 0)
      cleanNotes.push(`Météo requise : ${labels.join(", ")}.`);
  }
  if (conds.structures.length > 0) {
    const labels = Array.from(
      new Set(
        conds.structures.map((s) => formatSpawnCondition("structure", s)),
      ),
    );
    if (labels.length > 0)
      cleanNotes.push(`Lié à une structure : ${labels.join(", ")}.`);
  }

  // Hand-curated `bestGeneral` recipe override for paradox / UB
  // mons — see `overrides.ts`. When present, it replaces the
  // build-script's inferred recipe (which used generic boosters
  // that don't actually move the elite-spawn pool).
  let recommendedSnacks = e.recommendedSnacks;
  const override = BEST_GENERAL_OVERRIDES[e.slug];
  if (override) {
    recommendedSnacks = {
      ...recommendedSnacks,
      bestGeneral: {
        label: override.label,
        ingredients: override.ingredients,
        goal: "spawn",
        reason: override.reason,
        effectConfidence: "community_or_inferred",
      },
    };
  }

  return {
    ...e,
    recommendedSnacks,
    targeting: { ...e.targeting, notes: cleanNotes },
  };
}

export const POKESNACK_ENTRIES: PokesnackEntry[] = POKESNACK_DATASET.entries.map(patchEntry);

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
