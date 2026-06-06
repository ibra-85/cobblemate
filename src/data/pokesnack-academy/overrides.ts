/**
 * Hand-curated PokéSnack recipe overrides for Paradox / Ultra-Beast
 * mons. The build script's recipe inference uses generic
 * spawn-rarity boosters which read as "generic budget snack" for
 * these elite spawns — community testing on Cobblemon Academy
 * surfaced more specific combos (golden apple / carrot + 1–2 flavour
 * berries) that actually move the spawn pool. We surface those as
 * the `bestGeneral` recipe.
 *
 * Sources: server feedback + cross-checked against the in-game
 * Campfire Pot reroll logic.
 *
 * Berry French ↔ English glossary (the user supplied recipes in FR):
 *   - Baie Résin = Iapapa Berry
 *   - Baie Lonme = Aguav Berry
 *   - Baie Alga  = Wiki Berry
 *   - Baie Selro = Mago Berry
 *   - Baie Qualot= Qualot Berry
 *   - Baie Tamato= Tamato Berry
 */

const APPLE  = "minecraft:golden_apple";
const CARROT = "minecraft:golden_carrot";
const IAPAPA = "cobblemon:iapapa_berry"; // Résin
const AGUAV  = "cobblemon:aguav_berry";  // Lonme
const WIKI   = "cobblemon:wiki_berry";   // Alga
const MAGO   = "cobblemon:mago_berry";   // Selro
const QUALOT = "cobblemon:qualot_berry";
const TAMATO = "cobblemon:tamato_berry";

export interface RecipeOverride {
  ingredients: [string, string | null, string | null];
  label: string;
  reason: string;
}

/**
 * Slug-keyed override map. Each entry replaces the `bestGeneral`
 * recipe surfaced in the UI. Anything not listed here keeps the
 * inferred recipe from `pokesnacks.generated.json`.
 */
export const BEST_GENERAL_OVERRIDES: Record<string, RecipeOverride> = {
  // ─── Past Paradox ────────────────────────────────────────────────
  fluttermane: {
    ingredients: [APPLE, CARROT, IAPAPA],
    label: "Combo Flotte-Mèche",
    reason:
      "Pomme d'or + carotte d'or pour pousser la rareté, Baie Résin (Iapapa) pour orienter le pool sur les Paradox du passé.",
  },
  ragingbolt: {
    ingredients: [APPLE, CARROT, AGUAV],
    label: "Combo Ire-Foudre",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Lonme (Aguav) pour cibler la branche Paradox du passé.",
  },
  greattusk: {
    ingredients: [APPLE, CARROT, WIKI],
    label: "Combo Fort-Ivoire",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Alga (Wiki) — combo testé sur l'Academy.",
  },
  roaringmoon: {
    ingredients: [APPLE, CARROT, WIKI],
    label: "Combo Rugit-Lune",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Alga (Wiki) pour orienter Paradox passé.",
  },
  slitherwing: {
    // The user supplied data per family; keep the past-paradox combo
    // pattern for Rampe-Ailes.
    ingredients: [APPLE, CARROT, AGUAV],
    label: "Combo Rampe-Ailes",
    reason: "Combo Paradox du passé (Pomme d'or + carotte d'or + Baie Lonme).",
  },

  // ─── Future Paradox ──────────────────────────────────────────────
  ironvaliant: {
    // User-labelled as "Garde-de-Fer" in the FR dex.
    ingredients: [APPLE, WIKI, MAGO],
    label: "Combo Garde-de-Fer",
    reason:
      "Pomme d'or pour la rareté, Baie Alga (Wiki) + Baie Selro (Mago) — combo testé sur l'Academy.",
  },
  ironcrown: {
    ingredients: [APPLE, AGUAV, AGUAV],
    label: "Combo Chef-de-Fer",
    reason:
      "Pomme d'or + 2 × Baie Lonme (Aguav) pour saturer la branche Paradox du futur.",
  },
  ironmoth: {
    ingredients: [APPLE, AGUAV, AGUAV],
    label: "Combo Mite-de-Fer",
    reason: "Pomme d'or + 2 × Baie Lonme (Aguav) — Paradox du futur.",
  },
  irontreads: {
    ingredients: [APPLE, CARROT, QUALOT],
    label: "Combo Roue-de-Fer",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Qualot pour cibler Roue-de-Fer (variante : remplacer la carotte par une 2e Qualot).",
  },
  ironboulder: {
    ingredients: [APPLE, CARROT, TAMATO],
    label: "Combo Roc-de-Fer",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Tamato pour cibler Roc-de-Fer (variante : remplacer la carotte par une 2e Tamato).",
  },
  ironhands: {
    ingredients: [APPLE, WIKI, WIKI],
    label: "Combo Paume-de-Fer",
    reason: "Pomme d'or + 2 × Baie Alga (Wiki) — Paradox du futur.",
  },
  ironthorns: {
    ingredients: [APPLE, AGUAV, AGUAV],
    label: "Combo Épine-de-Fer",
    reason: "Pomme d'or + 2 × Baie Lonme (Aguav) — Paradox du futur.",
  },

  // ─── Ultra-Chimères ──────────────────────────────────────────────
  buzzwole: {
    ingredients: [APPLE, QUALOT, QUALOT],
    label: "Combo Mouscoto",
    reason: "Pomme d'or + 2 × Baie Qualot pour cibler la famille UB Bug/Combat.",
  },
  pheromosa: {
    ingredients: [APPLE, TAMATO, TAMATO],
    label: "Combo Cancrelove",
    reason: "Pomme d'or + 2 × Baie Tamato pour cibler la branche UB rapide.",
  },
  celesteela: {
    ingredients: [APPLE, QUALOT, QUALOT],
    label: "Combo Bamboiselle",
    reason: "Pomme d'or + 2 × Baie Qualot — UB volante.",
  },
  blacephalon: {
    ingredients: [APPLE, AGUAV, AGUAV],
    label: "Combo Pierroteknik",
    reason: "Pomme d'or + 2 × Baie Lonme (Aguav) — UB Feu/Spectre.",
  },
  nihilego: {
    ingredients: [APPLE, IAPAPA, IAPAPA],
    label: "Combo Zéroïd",
    reason: "Pomme d'or + 2 × Baie Résin (Iapapa) — UB Roche/Poison.",
  },
  poipole: {
    ingredients: [APPLE, TAMATO, TAMATO],
    label: "Combo Vémini",
    reason: "Pomme d'or + 2 × Baie Tamato — bébé UB Poison.",
  },
};
