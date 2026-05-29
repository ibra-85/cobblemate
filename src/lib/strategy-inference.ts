import type { Pokemon, PokemonTypeId } from "@/types";
import { lookupMove } from "@/data/moves";

/**
 * Best-effort battle build inference from base stats + types. Pokémon
 * without curated Smogon-style data still get a sensible "what should
 * I run on this thing?" hint based on its stat shape.
 *
 * All thresholds are rules of thumb tuned for the Cobblemon meta —
 * the goal is "good enough for a beginner", not optimal play.
 */

export type BuildRole =
  | "physical-sweeper"
  | "special-sweeper"
  | "mixed-sweeper"
  | "physical-wallbreaker"
  | "special-wallbreaker"
  | "physical-wall"
  | "special-wall"
  | "mixed-wall"
  | "support"
  | "balanced";

export const ROLE_LABEL: Record<BuildRole, string> = {
  "physical-sweeper":     "Sweeper physique",
  "special-sweeper":      "Sweeper spécial",
  "mixed-sweeper":        "Sweeper mixte",
  "physical-wallbreaker": "Wallbreaker physique",
  "special-wallbreaker":  "Wallbreaker spécial",
  "physical-wall":        "Mur physique",
  "special-wall":         "Mur spécial",
  "mixed-wall":           "Mur mixte",
  "support":              "Support / Pivot",
  "balanced":             "Polyvalent",
};

export const ROLE_DESCRIPTION: Record<BuildRole, string> = {
  "physical-sweeper":
    "Attaque physique élevée + vitesse pour terminer un adversaire affaibli ou enchaîner les K.O.",
  "special-sweeper":
    "Attaque spéciale élevée + vitesse — équivalent special du sweeper physique.",
  "mixed-sweeper":
    "Frappes des deux côtés (physique + spécial) selon les besoins. Plus souple, moins explosif.",
  "physical-wallbreaker":
    "Énorme attaque mais lent : casse les murs ennemis sans s'occuper de la course de vitesse.",
  "special-wallbreaker":
    "Énorme attaque spéciale mais lent — démolit les murs spéciaux adverses.",
  "physical-wall":
    "Encaisse les attaques physiques. Ralentit le combat et tease les setup adverses.",
  "special-wall":
    "Encaisse les attaques spéciales. Souvent porteur de Soin / Status.",
  "mixed-wall":
    "Bonne résistance des deux côtés : utile contre les attaquants mixtes.",
  "support":
    "Stats offensives faibles mais utilitaire : statuts, hazards, switch-pivot.",
  "balanced":
    "Pas de spike dans les stats — peut tout faire sans exceller. Polyvalent en équipe.",
};

export interface StrategyBuild {
  role: BuildRole;
  nature: { name: string; effect: string };
  evs: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  items: { id: string; reason: string }[];
  /** One-liner explaining the chosen build at a glance. */
  rationale: string;
}

/**
 * Pick a role from the base-stat profile. Cuts the stats into a
 * physical/special/bulk axis and lets a few thresholds decide.
 */
export function inferRole(pokemon: Pokemon): BuildRole {
  const { hp, attack, defense, spAtk, spDef, speed } = pokemon.baseStats;
  const bulk = hp + defense + spDef;
  const offPhys = attack;
  const offSpec = spAtk;
  const fast = speed >= 90;
  const verySlow = speed <= 60;
  const tanky = bulk >= 310;
  const veryTanky = bulk >= 360;
  const heavyPhys = offPhys >= 105;
  const heavySpec = offSpec >= 105;
  const mediumPhys = offPhys >= 80;
  const mediumSpec = offSpec >= 80;

  // Bulky-first checks
  if (veryTanky && offPhys < 80 && offSpec < 80) return "mixed-wall";
  if (tanky && defense > spDef + 15 && offPhys < 90 && offSpec < 90) return "physical-wall";
  if (tanky && spDef > defense + 15 && offPhys < 90 && offSpec < 90) return "special-wall";

  // Offensive checks
  if (heavyPhys && heavySpec) return "mixed-sweeper";
  if (heavyPhys && fast) return "physical-sweeper";
  if (heavySpec && fast) return "special-sweeper";
  if (heavyPhys && verySlow) return "physical-wallbreaker";
  if (heavySpec && verySlow) return "special-wallbreaker";
  if (mediumPhys && fast && !mediumSpec) return "physical-sweeper";
  if (mediumSpec && fast && !mediumPhys) return "special-sweeper";

  // Low offensive overall → support
  if (offPhys < 70 && offSpec < 70) return "support";

  return "balanced";
}

/** Nature pick — adds 10 % to one stat, removes 10 % from another. */
export function inferNature(role: BuildRole, pokemon: Pokemon): { name: string; effect: string } {
  const { attack, spAtk } = pokemon.baseStats;
  const physical =
    role === "physical-sweeper" ||
    role === "physical-wallbreaker" ||
    role === "physical-wall";

  switch (role) {
    case "physical-sweeper":
      return { name: "Jovial", effect: "+ Vitesse · − Att. Spé" };
    case "special-sweeper":
      return { name: "Timide", effect: "+ Vitesse · − Attaque" };
    case "physical-wallbreaker":
      return { name: "Rigide", effect: "+ Attaque · − Att. Spé" };
    case "special-wallbreaker":
      return { name: "Modeste", effect: "+ Att. Spé · − Attaque" };
    case "mixed-sweeper":
      return attack >= spAtk
        ? { name: "Hardi", effect: "+ Vitesse · − Défense Spé" }
        : { name: "Foufou", effect: "+ Vitesse · − Défense" };
    case "physical-wall":
      return { name: "Malin", effect: "+ Défense · − Att. Spé" };
    case "special-wall":
      return { name: "Calme", effect: "+ Défense Spé · − Attaque" };
    case "mixed-wall":
      return { name: "Pudique", effect: "+ Défense Spé · − Att. Spé" };
    case "support":
      return physical
        ? { name: "Relax", effect: "+ Défense · − Vitesse" }
        : { name: "Sage", effect: "+ Défense Spé · − Vitesse" };
    case "balanced":
      return attack >= spAtk
        ? { name: "Rigide", effect: "+ Attaque · − Att. Spé" }
        : { name: "Modeste", effect: "+ Att. Spé · − Attaque" };
  }
}

/** EV spread — 510 total budget, capped at 252 per stat (Gen 6+ rules). */
export function inferEvs(role: BuildRole): StrategyBuild["evs"] {
  switch (role) {
    case "physical-sweeper":      return { hp: 4,   atk: 252,            spe: 252 };
    case "special-sweeper":       return { hp: 4,   spa: 252,            spe: 252 };
    case "mixed-sweeper":         return { hp: 4,   atk: 126, spa: 126,  spe: 252 };
    case "physical-wallbreaker":  return { hp: 252, atk: 252,            spd: 4   };
    case "special-wallbreaker":   return { hp: 252, spa: 252,            spd: 4   };
    case "physical-wall":         return { hp: 252, def: 252,            spd: 4   };
    case "special-wall":          return { hp: 252,            spd: 252, def: 4   };
    case "mixed-wall":            return { hp: 252, def: 128,  spd: 128         };
    case "support":               return { hp: 252, def: 128,  spd: 128         };
    case "balanced":              return { hp: 252, atk: 4,    spa: 4,  spe: 252 };
  }
}

/** Item suggestions — top 2 picks per role with reasoning. */
export function inferItems(role: BuildRole): { id: string; reason: string }[] {
  switch (role) {
    case "physical-sweeper":
    case "special-sweeper":
      return [
        { id: "Bandeau Choix / Lunettes Choix", reason: "Boost 1.5× les dégâts mais verrouille l'attaque." },
        { id: "Orbe Vie", reason: "Boost 1.3× sans verrouillage (10 % de recul par K.O.)." },
      ];
    case "mixed-sweeper":
      return [
        { id: "Orbe Vie", reason: "Boost les attaques des deux côtés." },
        { id: "Mouchoir Choix", reason: "Boost +50 % Vitesse — vise un revenge-kill." },
      ];
    case "physical-wallbreaker":
    case "special-wallbreaker":
      return [
        { id: "Bandeau / Lunettes Choix", reason: "Maximise les dégâts immédiats sans s'inquiéter de la vitesse." },
        { id: "Orbe Vie", reason: "Plus souple — change de move chaque tour." },
      ];
    case "physical-wall":
    case "special-wall":
    case "mixed-wall":
      return [
        { id: "Restes", reason: "Récupère 1/16 PV par tour passivement." },
        { id: "Bottes Increvables", reason: "Ignore les hazards (Pics, Stealth Rock…)." },
      ];
    case "support":
      return [
        { id: "Restes", reason: "Récupération passive pour tenir la durée du combat." },
        { id: "Bottes Increvables", reason: "Coup-de-grâce contre les équipes à hazards." },
      ];
    case "balanced":
      return [
        { id: "Orbe Vie", reason: "Flexible — boost les attaques sans verrouillage." },
        { id: "Restes", reason: "Récupération passive si tu joues plutôt patient." },
      ];
  }
}

/**
 * Build the final strategy from a Pokémon. Pure function — easy to
 * test, no side effects.
 */
export function buildStrategy(pokemon: Pokemon): StrategyBuild {
  const role = inferRole(pokemon);
  return {
    role,
    nature: inferNature(role, pokemon),
    evs: inferEvs(role),
    items: inferItems(role),
    rationale: ROLE_DESCRIPTION[role],
  };
}

// ─── Moveset suggestion ────────────────────────────────────────────────

/**
 * Pick up to 4 moves from `notableMoves` to suggest as a starter
 * moveset. Resolves each id through {@link lookupMove} so the full
 * 937-move database is in play (not just the curated subset). Priority:
 *   1. STAB moves (matching one of the Pokémon's types).
 *   2. Coverage moves (offensive, not matching STAB).
 *   3. Utility (status moves, healing).
 */
export function suggestMoves(
  pokemon: Pokemon,
): { stab: string[]; coverage: string[]; utility: string[] } {
  const own = new Set<string>(pokemon.types);

  const stab: string[] = [];
  const coverage: string[] = [];
  const utility: string[] = [];

  for (const mid of pokemon.notableMoves ?? []) {
    const m = lookupMove(mid);
    if (!m) continue;
    if (m.category === "status") {
      utility.push(mid);
    } else if (own.has(m.type as PokemonTypeId)) {
      stab.push(mid);
    } else {
      coverage.push(mid);
    }
  }

  return {
    stab:     stab.slice(0, 2),
    coverage: coverage.slice(0, 2),
    utility:  utility.slice(0, 2),
  };
}

