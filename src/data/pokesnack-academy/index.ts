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
import { baitsForType } from "@/data/baits";
import { getSpeciesExtras, type EvYield } from "@/data/species-extras";
import type { PokemonTypeId } from "@/types";

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

// ─── Effect formatting ──────────────────────────────────────────

/**
 * French type labels — matches the rest of the app (see
 * `src/data/types.ts`) so the bullet point line ("×10 spawn Feu")
 * uses the same translation everywhere it appears.
 */
const TYPE_FR: Record<string, string> = {
  normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik",
  grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison",
  ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte",
  rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres",
  steel: "Acier", fairy: "Fée",
};

/** EV/Nature subcategory codes used by Cobblemon. */
const STAT_FR: Record<string, string> = {
  hp:  "PV",
  atk: "Atk",
  def: "Déf",
  spa: "Atk. Spé",
  spd: "Déf. Spé",
  spe: "Vit.",
};

/**
 * Translate a single seasoning's effects into short, human-readable
 * French bullets. Used by the PokéSnack cards to show what each
 * slot in the recipe actually contributes (×10 spawn Feu, +1 palier
 * rareté, Shiny ×5, Morsure -25 %, etc.) so the player understands
 * the recipe at a glance instead of guessing.
 *
 * Returns an empty array when the seasoning has no measurable
 * effect — the UI hides empty rows so they don't take vertical space.
 */
export function formatSeasoningEffects(s: Seasoning): string[] {
  const e = s.effects;
  const out: string[] = [];

  if (e.typeSpawnMultiplier) {
    const t = TYPE_FR[e.typeSpawnMultiplier.type] ?? e.typeSpawnMultiplier.type;
    out.push(`×${e.typeSpawnMultiplier.value} spawn ${t}`);
  }
  if (e.rarityBoost > 0) {
    out.push(`+${e.rarityBoost} palier${e.rarityBoost > 1 ? "s" : ""} rareté`);
  }
  if (e.shinyMultiplier > 1) {
    out.push(`Shiny ×${e.shinyMultiplier}`);
  }
  if (e.biteRateModifier !== 0) {
    // Stored as a fraction: 0.75 means "bite time is 75 % of normal"
    // (i.e. 25 % faster). Convert to the player-facing percent.
    const pct = Math.round((1 - (1 - e.biteRateModifier)) * 100);
    // Simpler: biteRateModifier > 0 means the bite is faster by
    // that fraction; modifier 0.75 → -25 % bite time.
    const reduction = Math.round(e.biteRateModifier * 100);
    out.push(`Morsure -${reduction} %`);
    // (the unused `pct` keeps the math obvious — Cobblemon stores
    // the *reduction*, not the multiplier).
    void pct;
  }
  if (e.hiddenAbilityBoost > 0) {
    out.push(`Talent caché +${e.hiddenAbilityBoost}`);
  }
  if (e.alphaBoost > 0) {
    out.push(`Alpha +${e.alphaBoost}`);
  }
  if (e.marksBoost > 0) {
    out.push(`Marques +${e.marksBoost}`);
  }
  if (e.friendshipDelta !== 0) {
    const sign = e.friendshipDelta > 0 ? "+" : "";
    out.push(`Amitié ${sign}${e.friendshipDelta}`);
  }
  if (e.dropsRerolls > 0) {
    out.push(`Drops ×${e.dropsRerolls + 1} rerolls`);
  }
  for (const x of e.extra ?? []) {
    const chance = Math.round(x.chance * 100);
    const stripNs = (s: string | null) =>
      s ? s.replace(/^[a-z]+:/, "") : "";
    if (x.type === "ev") {
      const stat =
        STAT_FR[stripNs(x.subcategory)] ?? stripNs(x.subcategory);
      out.push(`Attire +${x.value} EV ${stat}`);
    } else if (x.type === "iv") {
      const stat =
        STAT_FR[stripNs(x.subcategory)] ?? stripNs(x.subcategory);
      out.push(`IV ${stat} +${x.value}`);
    } else if (x.type === "nature") {
      const stat =
        STAT_FR[stripNs(x.subcategory)] ?? stripNs(x.subcategory) ?? "?";
      out.push(`Nature ${stat} (${chance}%)`);
    } else if (x.type === "level_raise") {
      out.push(`Niveau +${x.value}`);
    } else if (x.type === "egg_group") {
      const group = stripNs(x.subcategory).replace(/_/g, " ");
      out.push(`×${x.value} groupe d'œuf ${group}`);
    } else if (x.type === "gender_chance") {
      const g = stripNs(x.subcategory);
      const fr = g === "female" ? "femelle" : g === "male" ? "mâle" : g;
      out.push(`${chance} % ${fr}`);
    } else if (x.type === "size") {
      // Jaboca = +50 (bigger), Rowap = -50 (smaller).
      out.push(x.value > 0 ? `Taille +${x.value} %` : `Taille ${x.value} %`);
    } else {
      out.push(`${x.type} ${x.value} (${chance}%)`);
    }
  }
  return out;
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

  // `bestGeneral` recipe — replaces the build-script's inferred
  // recipe (which always equalled `rareSpawn` so the two tabs
  // showed identical content) with one of two sensible defaults:
  //
  //   1. Hand-curated `BEST_GENERAL_OVERRIDES` entry (paradox /
  //      ultra-beast — recipes the user supplied per-mon).
  //   2. Auto-generated `generateBestGeneral(e)` (everyone else):
  //      Golden Apple + Golden Carrot + best type berry. This is
  //      the universal "one good recipe" combo — +2 rarity paliers
  //      and a 10× type-boost — distinct from `rareSpawn`'s
  //      Enchanted Apple stack which is overkill for everyday use.
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
  } else {
    const generated = generateBestGeneral(e);
    if (generated) {
      recommendedSnacks = {
        ...recommendedSnacks,
        bestGeneral: generated,
      };
    }
  }

  return {
    ...e,
    recommendedSnacks,
    targeting: { ...e.targeting, notes: cleanNotes },
  };
}

/** EV-stat → corresponding EV-attractor berry (Cobblemon bait
 *  system: a non-zero EV yield in that stat makes the species
 *  eligible for the bait's targeting pool). */
const EV_BERRY: Record<keyof EvYield, { id: string; fr: string; statFr: string }> = {
  hp:               { id: "cobblemon:pomeg_berry",  fr: "Baie Grena",  statFr: "PV" },
  attack:           { id: "cobblemon:kelpsy_berry", fr: "Baie Alga",   statFr: "Atk" },
  defence:          { id: "cobblemon:qualot_berry", fr: "Baie Qualot", statFr: "Déf" },
  special_attack:   { id: "cobblemon:hondew_berry", fr: "Baie Lonme",  statFr: "Atk. Spé" },
  special_defence:  { id: "cobblemon:grepa_berry",  fr: "Baie Resin",  statFr: "Déf. Spé" },
  speed:            { id: "cobblemon:tamato_berry", fr: "Baie Tamato", statFr: "Vit." },
};

/** Pick the highest-yield EV stat. Ties resolve in the iteration
 *  order of `EvYield` (hp → atk → def → spa → spd → spe) which
 *  matches the gen-3 stat order players are used to. */
function dominantEvStat(evY: EvYield): keyof EvYield | null {
  let best: keyof EvYield | null = null;
  let bestVal = 0;
  for (const stat of Object.keys(EV_BERRY) as (keyof EvYield)[]) {
    const v = evY[stat];
    if (v > bestVal) { bestVal = v; best = stat; }
  }
  return best;
}

/**
 * Build a "Meilleur choix" recipe for one entry — Pomme d'or +
 * carotte d'or + baie EV-attractor matchée sur le yield principal
 * du Pokémon. Fallback sur la baie de type quand le yield est
 * inconnu ou nul (Pokémon legendary/mythical sans EV yield exposé).
 *
 * Stratégie (validée par la communauté Academy) : l'EV yield étant
 * **figé par espèce**, la baie EV-attractor filtre la pool de spawn
 * sur les espèces qui partagent ce yield — beaucoup plus fiable que
 * les baies de nature (qui se déclenchent par individu aléatoire).
 *
 * Apple + carrot donnent +2 paliers de rareté (suffit pour la
 * plupart des spawns rares sans Pomme d'or enchantée). Différent de
 * `rareSpawn` qui sature avec la Pomme enchantée.
 */
function generateBestGeneral(e: PokesnackEntry): SnackRecipe | null {
  const extras = getSpeciesExtras(e.slug);
  const evY = extras?.evYield;
  const dominant = evY ? dominantEvStat(evY) : null;

  if (dominant) {
    const berry = EV_BERRY[dominant];
    const value = evY![dominant];
    return {
      label: "Meilleur choix",
      ingredients: [
        "minecraft:golden_apple",
        "minecraft:golden_carrot",
        berry.id,
      ],
      goal: "spawn",
      reason:
        `Pomme d'or + carotte d'or pour +2 paliers de rareté, ${berry.fr} pour cibler les espèces qui donnent ${value} EV ${berry.statFr} — comme ce Pokémon. L'EV yield est fixé par espèce donc le filtre est fiable.`,
      effectConfidence: "community_or_inferred",
    };
  }

  // Fallback: aucun EV yield exploitable (legendaires sans data, formes
  // exotiques…) → on retombe sur la baie de type.
  const primary = e.types[0];
  if (!primary) return null;
  const bait = baitsForType(primary as PokemonTypeId)[0];
  if (!bait) return null;
  return {
    label: "Meilleur choix",
    ingredients: [
      "minecraft:golden_apple",
      "minecraft:golden_carrot",
      bait.id,
    ],
    goal: "spawn",
    reason:
      `Pomme d'or + carotte d'or pour +2 paliers de rareté, ${bait.label} pour cibler le type ${primary} (pas d'EV yield exposé pour ce mon).`,
    effectConfidence: "community_or_inferred",
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
