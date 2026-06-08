/**
 * Hand-curated PokéSnack recipe overrides for Paradox / Ultra-Beast
 * mons. The build script's recipe inference uses generic
 * spawn-rarity boosters which read as "generic budget snack" for
 * these elite spawns — community testing on Cobblemon Academy
 * surfaced more specific combos (golden apple / carrot + 1–2
 * EV-attractor berries) that actually move the spawn pool. We
 * surface those as the `bestGeneral` recipe.
 *
 * Strategy: the EV-attractor berries (Kelpsy, Hondew, Grepa, Qualot,
 * Tamato, Pomeg) attract Pokémon whose **species** yields a fixed
 * stat-EV. Since each species has a deterministic EV yield, this is
 * the most reliable way to filter the spawn pool down to a target.
 *
 * Berry French ↔ English glossary (canonical Pokémon FR names):
 *   - Baie Resin  = Grepa Berry  (attire EV Déf. Spé)
 *   - Baie Lonme  = Hondew Berry (attire EV Atk. Spé)
 *   - Baie Alga   = Kelpsy Berry (attire EV Atk)
 *   - Baie Qualot = Qualot Berry (attire EV Déf)
 *   - Baie Tamato = Tamato Berry (attire EV Vit.)
 *   - Baie Grena  = Pomeg Berry  (attire EV PV)
 *   - Baie Selro  = Roseli Berry (×10 spawn Fée — type filter)
 */

const APPLE  = "minecraft:golden_apple";
const CARROT = "minecraft:golden_carrot";
const GREPA  = "cobblemon:grepa_berry";  // Resin  — EV Déf. Spé
const HONDEW = "cobblemon:hondew_berry"; // Lonme  — EV Atk. Spé
const KELPSY = "cobblemon:kelpsy_berry"; // Alga   — EV Atk
const QUALOT = "cobblemon:qualot_berry"; // Qualot — EV Déf
const TAMATO = "cobblemon:tamato_berry"; // Tamato — EV Vit.
const ROSELI = "cobblemon:roseli_berry"; // Selro  — ×10 spawn Fée

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
    ingredients: [APPLE, CARROT, GREPA],
    label: "Combo Flotte-Mèche",
    reason:
      "Pomme d'or + carotte d'or pour pousser la rareté, Baie Resin (Grepa) — Flotte-Mèche donne 1 EV Déf. Spé donc la Resin l'attire.",
  },
  ragingbolt: {
    ingredients: [APPLE, CARROT, HONDEW],
    label: "Combo Ire-Foudre",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Lonme (Hondew) — Ire-Foudre donne 3 EV Atk. Spé.",
  },
  greattusk: {
    ingredients: [APPLE, CARROT, KELPSY],
    label: "Combo Fort-Ivoire",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Alga (Kelpsy) — Fort-Ivoire donne 3 EV Atk.",
  },
  roaringmoon: {
    ingredients: [APPLE, CARROT, KELPSY],
    label: "Combo Rugit-Lune",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Alga (Kelpsy) — Rugit-Lune donne 3 EV Atk.",
  },
  slitherwing: {
    ingredients: [APPLE, CARROT, KELPSY],
    label: "Combo Rampe-Ailes",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Alga (Kelpsy) — Rampe-Ailes donne 3 EV Atk.",
  },

  // ─── Future Paradox ──────────────────────────────────────────────
  ironvaliant: {
    ingredients: [APPLE, KELPSY, ROSELI],
    label: "Combo Garde-de-Fer",
    reason:
      "Pomme d'or pour la rareté, Baie Alga (Kelpsy) pour les 3 EV Atk, Baie Selro (Roseli) pour cibler le type Fée — c'est ce qui isole Garde-de-Fer des autres mons à 3 EV Atk (Paume-de-Fer, Épine-de-Fer…).",
  },
  ironcrown: {
    ingredients: [APPLE, HONDEW, HONDEW],
    label: "Combo Chef-de-Fer",
    reason:
      "Pomme d'or + 2 × Baie Lonme (Hondew) — Chef-de-Fer donne 3 EV Atk. Spé, doubler la Lonme sature le filtre.",
  },
  ironmoth: {
    ingredients: [APPLE, HONDEW, HONDEW],
    label: "Combo Mite-de-Fer",
    reason: "Pomme d'or + 2 × Baie Lonme (Hondew) — Mite-de-Fer donne 3 EV Atk. Spé.",
  },
  irontreads: {
    ingredients: [APPLE, CARROT, QUALOT],
    label: "Combo Roue-de-Fer",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Qualot — Roue-de-Fer donne 3 EV Déf (variante : remplacer la carotte par une 2ᵉ Qualot).",
  },
  ironboulder: {
    ingredients: [APPLE, CARROT, TAMATO],
    label: "Combo Roc-de-Fer",
    reason:
      "Pomme d'or + carotte d'or pour la rareté, Baie Tamato — Roc-de-Fer donne 3 EV Vit. (variante : remplacer la carotte par une 2ᵉ Tamato).",
  },
  ironhands: {
    ingredients: [APPLE, KELPSY, KELPSY],
    label: "Combo Paume-de-Fer",
    reason: "Pomme d'or + 2 × Baie Alga (Kelpsy) — Paume-de-Fer donne 3 EV Atk.",
  },
  ironthorns: {
    ingredients: [APPLE, KELPSY, KELPSY],
    label: "Combo Épine-de-Fer",
    reason: "Pomme d'or + 2 × Baie Alga (Kelpsy) — Épine-de-Fer donne 3 EV Atk.",
  },

  // ─── Ultra-Chimères ──────────────────────────────────────────────
  buzzwole: {
    ingredients: [APPLE, QUALOT, QUALOT],
    label: "Combo Mouscoto",
    reason: "Pomme d'or + 2 × Baie Qualot — Mouscoto donne 2 EV Déf + 1 EV Atk.",
  },
  pheromosa: {
    ingredients: [APPLE, TAMATO, TAMATO],
    label: "Combo Cancrelove",
    reason: "Pomme d'or + 2 × Baie Tamato — Cancrelove donne 3 EV Vit.",
  },
  celesteela: {
    ingredients: [APPLE, QUALOT, QUALOT],
    label: "Combo Bamboiselle",
    reason:
      "Pomme d'or + 2 × Baie Qualot — Bamboiselle donne 1 EV Déf (entre autres) ; la Qualot oriente sur la branche défensive.",
  },
  blacephalon: {
    ingredients: [APPLE, HONDEW, HONDEW],
    label: "Combo Pierroteknik",
    reason: "Pomme d'or + 2 × Baie Lonme (Hondew) — Pierroteknik donne 3 EV Atk. Spé.",
  },
  nihilego: {
    ingredients: [APPLE, GREPA, GREPA],
    label: "Combo Zéroïd",
    reason: "Pomme d'or + 2 × Baie Resin (Grepa) — Zéroïd donne 3 EV Déf. Spé.",
  },
  poipole: {
    ingredients: [APPLE, TAMATO, TAMATO],
    label: "Combo Vémini",
    reason: "Pomme d'or + 2 × Baie Tamato — Vémini donne 1 EV Vit.",
  },
};
