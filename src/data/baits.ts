import generated from "./bait-effects-generated.json";
import type { PokemonTypeId } from "@/types";

/**
 * Cobblemon Poké Snack bait data — generated from the official mod
 * `spawn_bait_effects/` + `seasonings/` directories. Rebuild with:
 *   node scripts/build-bait-data.mjs
 */

export type BaitEffectType =
  | "typing"
  | "shiny_reroll"
  | "rarity_bucket"
  | "bite_time"
  | "ha_chance"
  | "alpha_chance"
  | "mark_chance"
  | "nature"
  | "size"
  | "ev"
  | "iv"
  | "level_raise"
  | "friendship"
  | "drops_reroll"
  | "gender_chance"
  | "egg_group";

export interface BaitEffect {
  type: BaitEffectType;
  subcategory?: string;
  chance: number;
  value: number | null;
}

export interface BaitItem {
  id: string;
  /** Friendlier label derived from the item id. */
  label: string;
  /** Optional seasoning colour ("yellow", "red", …). */
  color?: string;
  effects: BaitEffect[];
}

function humanize(id: string): string {
  const tail = id.split(":").pop() ?? id;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const BAITS: Record<string, BaitItem> = Object.fromEntries(
  Object.entries(generated.items).map(([id, def]) => [
    id,
    {
      id,
      label: humanize(id),
      ...(def as { color?: string; effects: BaitEffect[] }),
    } satisfies BaitItem,
  ]),
);

export const POKE_SNACK_RECIPE = generated.recipe;
export const VALID_SEASONINGS: string[] = generated.validSeasonings;

// ─── Effect labels (FR) ────────────────────────────────────────────────

export const EFFECT_LABEL: Record<BaitEffectType, string> = {
  typing:         "Type Pokémon",
  shiny_reroll:   "Shiny (relance)",
  rarity_bucket:  "Rareté (+1 palier)",
  bite_time:      "Délai de morsure (pêche)",
  ha_chance:      "Talent Caché",
  alpha_chance:   "Spawn Alpha",
  mark_chance:    "Marques",
  nature:         "Nature",
  size:           "Taille",
  ev:             "EVs",
  iv:             "IVs",
  level_raise:    "Niveau (+)",
  friendship:     "Bonheur",
  drops_reroll:   "Drops (relance)",
  gender_chance:  "Sexe",
  egg_group:      "Groupe d'œuf",
};

// ─── Query helpers ─────────────────────────────────────────────────────

/** All bait items as an array. */
export const ALL_BAITS: BaitItem[] = Object.values(BAITS);

/** Bait items that boost the spawn rate of a given Pokémon type. */
export function baitsForType(type: PokemonTypeId): BaitItem[] {
  return ALL_BAITS
    .filter((b) => b.effects.some((e) => e.type === "typing" && e.subcategory === type))
    .sort((a, b) => {
      const av = a.effects.find((e) => e.type === "typing" && e.subcategory === type)?.value ?? 0;
      const bv = b.effects.find((e) => e.type === "typing" && e.subcategory === type)?.value ?? 0;
      return bv - av;
    });
}

/** Bait items carrying a given non-typing effect, ranked by value desc. */
export function baitsByEffect(effect: BaitEffectType): BaitItem[] {
  return ALL_BAITS
    .filter((b) => b.effects.some((e) => e.type === effect))
    .sort((a, b) => {
      const av = a.effects.find((e) => e.type === effect)?.value ?? 0;
      const bv = b.effects.find((e) => e.type === effect)?.value ?? 0;
      return bv - av;
    });
}

/** Best single bait per "useful" effect category, for a Pokémon's types. */
export function recommendBaits(types: PokemonTypeId[]): {
  typing: { type: PokemonTypeId; bait: BaitItem; value: number }[];
  shiny: BaitItem | null;
  rarity: BaitItem | null;
  ha: BaitItem | null;
  alpha: BaitItem | null;
} {
  const typing = types
    .map((t) => {
      const list = baitsForType(t);
      const best = list[0];
      if (!best) return null;
      const value = best.effects.find(
        (e) => e.type === "typing" && e.subcategory === t,
      )?.value ?? 0;
      return { type: t, bait: best, value };
    })
    .filter((x): x is { type: PokemonTypeId; bait: BaitItem; value: number } => x !== null);

  return {
    typing,
    shiny:  baitsByEffect("shiny_reroll")[0]  ?? null,
    rarity: baitsByEffect("rarity_bucket")[0] ?? null,
    ha:     baitsByEffect("ha_chance")[0]     ?? null,
    alpha:  baitsByEffect("alpha_chance")[0]  ?? null,
  };
}
