import { getSpeciesExtras } from "@/data/species-extras";
import type { Pokemon, PokemonRole } from "@/types";

/**
 * Probabilistic role detection — replaces the binary threshold
 * checks (`attack >= 110 && speed >= 95`) that lost roles on
 * Kingambit, Azumarill, Dragonite-Multiscale and the entire Trick
 * Room sweeper family. Each role accumulates a weighted score from
 * stats, moveset and ability signals; the final value picks a
 * confidence level.
 *
 * Set-aware: when the caller passes the slot's 4 declared moves
 * (`slotMoves`), those are treated as the *actual* moveset and the
 * learnset is ignored for move-based signals. Without a slot moveset
 * we fall back to "this mon could plausibly run this move" via the
 * full learnset (still better than nothing for the picker / random
 * roster, but explicitly weaker than declared sets).
 */
export type RoleLevel = "primary" | "secondary" | "situational" | "none";

export interface RoleConfidence {
  role: PokemonRole;
  score: number;
  level: RoleLevel;
  /** Human-readable signals that contributed to the score. */
  factors: string[];
}

export interface RoleProfile {
  /** Confidences for every role we know how to detect, sorted desc. */
  roles: RoleConfidence[];
  /** Convenience: roles at primary level. */
  primary: PokemonRole[];
  /** Convenience: roles at primary or secondary level. */
  active: PokemonRole[];
}

// Bands tuned so role detection picks up obvious learnset-only
// signals at *secondary* level. Without static role tags (most of
// the modded Cobblemon dex has none), a 38-point learnset signal
// for pivot or hazard-setter previously fell into "situational" and
// the team-level scorers — which require active (primary OR
// secondary) — skipped them entirely.
const PRIMARY_THRESHOLD = 65;
const SECONDARY_THRESHOLD = 38;
const SITUATIONAL_THRESHOLD = 22;

// ─── Move tables ──────────────────────────────────────────────────────
// Move ids are Cobblemon-canonical (lowercased, no dashes).

const PHYSICAL_SETUP = [
  "swordsdance",
  "dragondance",
  "bulkup",
  "howl",
  "honeclaws",
  "shiftgear",
  "victorydance",
];
const SPECIAL_SETUP = [
  "nastyplot",
  "calmmind",
  "tailglow",
  "geomancy",
  "quiverdance",
  "shellsmash", // also physical
];
const PRIORITY_MOVES = [
  "extremespeed",
  "suckerpunch",
  "machpunch",
  "bulletpunch",
  "aquajet",
  "iceshard",
  "quickattack",
  "shadowsneak",
  "vacuumwave",
  "accelerock",
  "firstimpression",
];
const PIVOT_MOVES = [
  "uturn",
  "voltswitch",
  "partingshot",
  "flipturn",
  "teleport",
  "chillyreception",
  "shedtail",
  "batonpass",
];
const HAZARD_SETUP = ["stealthrock", "spikes", "toxicspikes", "stickyweb"];
const STATUS_MOVES = [
  "willowisp",
  "thunderwave",
  "toxic",
  "spore",
  "sleeppowder",
  "stunspore",
  "glare",
  "yawn",
  "encore",
  "taunt",
  "roar",
  "whirlwind",
  "trickroom",
];
const RECOVERY_MOVES = [
  "recover",
  "roost",
  "softboiled",
  "slackoff",
  "moonlight",
  "morningsun",
  "synthesis",
  "wish",
  "shoreup",
];
const SCREEN_MOVES = ["reflect", "lightscreen", "auroraveil"];

// ─── Ability flags (heuristic, subset of canonical ability list) ──────
//
// We don't have a full structured ability index yet — V2 will keep
// expanding this. For now: the abilities listed below carry concrete
// role implications strong enough that their presence shifts the
// confidence score.

const OFFENSIVE_ABILITIES = new Set([
  "Huge Power",
  "Pure Power",
  "Moxie",
  "Beast Boost",
  "Adaptability",
  "Sheer Force",
  "Supreme Overlord",
  "Tough Claws",
  "Iron Fist",
  "Strong Jaw",
  "Mega Launcher",
  "Reckless",
  "Aerilate",
  "Pixilate",
  "Refrigerate",
  "Galvanize",
  "Protean",
  "Libero",
  "Quark Drive",
  "Protosynthesis",
  "Hadron Engine",
  "Orichalcum Pulse",
]);

const DEFENSIVE_ABILITIES = new Set([
  "Multiscale",
  "Shadow Shield",
  "Filter",
  "Solid Rock",
  "Prism Armor",
  "Fluffy",
  "Thick Fat",
  "Unaware",
  "Magic Bounce",
  "Magic Guard",
  "Intimidate",
  "Regenerator",
  "Natural Cure",
  "Levitate",
  "Volt Absorb",
  "Water Absorb",
  "Storm Drain",
  "Lightning Rod",
  "Flash Fire",
  "Sap Sipper",
  "Motor Drive",
  "Bulletproof",
  "Heatproof",
  "Earth Eater",
  "Well-Baked Body",
]);

const PIVOT_ABILITIES = new Set(["Regenerator", "Natural Cure"]);

/**
 * High-impact talents — talents that genuinely change how a Pokémon
 * plays, with their strategic role and bonus weight. The user
 * complained that talents were under-weighted previously: "Dracolosse
 * + Multiécaille doit fortement augmenter setup reliability,
 * defensive reliability, cleaner confidence. Pas juste un petit
 * bonus." Hence the chunky deltas (15–30 instead of 5–10).
 *
 * Only credited when the slot's `selectedAbility` matches (strict),
 * OR when the Pokémon has a single ability and it's this one.
 */
const HIGH_IMPACT_ABILITIES: Record<
  string,
  { roles: PokemonRole[]; bonus: number; label: string }
> = {
  Multiscale: {
    roles: ["physical-sweeper", "special-sweeper", "physical-wall", "special-wall", "wallbreaker"],
    bonus: 25,
    label: "Multiécaille",
  },
  "Shadow Shield": {
    roles: ["physical-sweeper", "special-sweeper", "physical-wall", "special-wall"],
    bonus: 25,
    label: "Bouclier d'Ombre",
  },
  "Supreme Overlord": {
    roles: ["wallbreaker", "revenge-killer", "physical-sweeper"],
    bonus: 22,
    label: "Général Suprême",
  },
  "Huge Power": {
    roles: ["physical-sweeper", "wallbreaker"],
    bonus: 30,
    label: "Coloforce",
  },
  "Pure Power": {
    roles: ["physical-sweeper", "wallbreaker"],
    bonus: 30,
    label: "Force Pure",
  },
  Regenerator: {
    roles: ["pivot", "physical-wall", "special-wall", "mixed-wall"],
    bonus: 22,
    label: "Régé-Force",
  },
  Intimidate: {
    roles: ["physical-wall", "support", "lead"],
    bonus: 15,
    label: "Intimidation",
  },
  Levitate: {
    roles: ["pivot", "physical-wall", "special-wall"],
    bonus: 12,
    label: "Lévitation",
  },
  "Magic Bounce": {
    roles: ["support", "lead", "special-wall"],
    bonus: 18,
    label: "Miroir Magik",
  },
  Prankster: {
    roles: ["support", "lead"],
    bonus: 18,
    label: "Farceur",
  },
  Unaware: {
    roles: ["physical-wall", "special-wall", "mixed-wall"],
    bonus: 18,
    label: "Inconscient",
  },
  Moxie: {
    roles: ["physical-sweeper", "wallbreaker"],
    bonus: 15,
    label: "Impudence",
  },
  "Beast Boost": {
    roles: ["physical-sweeper", "special-sweeper", "wallbreaker"],
    bonus: 18,
    label: "Boost Chimère",
  },
  "Magic Guard": {
    roles: ["physical-wall", "special-wall", "wallbreaker"],
    bonus: 15,
    label: "Garde Magik",
  },
  Adaptability: {
    roles: ["wallbreaker", "physical-sweeper", "special-sweeper"],
    bonus: 18,
    label: "Adaptabilité",
  },
};

/**
 * Returns a bonus to apply when the slot's effective ability matches
 * a high-impact entry for the given role. Mirrors `effectiveAbility`
 * semantics — only credits an explicit `selectedAbility` or an
 * auto-resolved single-option talent.
 */
function highImpactAbilityBonus(
  p: Pokemon,
  selectedAbility: string | undefined,
  role: PokemonRole,
): { bonus: number; label: string } | null {
  const ability = effectiveAbility(p, selectedAbility);
  if (!ability) return null;
  const meta = HIGH_IMPACT_ABILITIES[ability];
  if (!meta || !meta.roles.includes(role)) return null;
  return { bonus: meta.bonus, label: meta.label };
}

/**
 * **Highly negative** talents — abilities so handicapping that they
 * essentially disqualify a Pokémon from competitive consideration.
 * Surfaced as a flat penalty on every role scorer + consumed by
 * `team-analysis.ts` as a per-mon team-score penalty so the team
 * optimiser stops picking Monaflèmit (Truant), Castello (Slow Start)
 * et al just for their BST.
 *
 * Keys are EN-collapsed and EN-spaced — `matchAbilityToPokemon` /
 * `effectiveAbility` already normalise across formats. Penalty values
 * mirror the user's spec: Truant -45, Slow Start -35, Defeatist -25.
 */
export const NEGATIVE_ABILITIES: Record<
  string,
  { penalty: number; label: string }
> = {
  Truant: { penalty: 45, label: "Absentéisme" },
  Slowstart: { penalty: 35, label: "Début Calme" },
  "Slow Start": { penalty: 35, label: "Début Calme" },
  Defeatist: { penalty: 25, label: "Défaitiste" },
  Klutz: { penalty: 15, label: "Maladresse" },
  Stall: { penalty: 10, label: "Frein" },
};

/**
 * Look up the negative-ability penalty for a slot's effective
 * ability. Returns 0 when the ability is fine (or no ability is
 * resolved). The matcher tolerates the EN collapsed form Cobblemon
 * ships ("Slowstart") and the EN spaced form Smogon uses ("Slow
 * Start").
 */
export function negativeAbilityPenalty(
  p: Pokemon,
  selectedAbility?: string,
): { penalty: number; label: string } | null {
  const ability = effectiveAbility(p, selectedAbility);
  if (!ability) return null;
  // Direct lookup first (EN-collapsed or EN-spaced).
  const direct = NEGATIVE_ABILITIES[ability];
  if (direct) return direct;
  // Normalised fallback so e.g. "slow start" / "SlowStart" / FR
  // overrides like "Début Calme" all land on the same entry.
  const key = ability.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [k, meta] of Object.entries(NEGATIVE_ABILITIES)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === key) return meta;
  }
  return null;
}

/**
 * Decide which of a slot's role-profile entries are *confirmed* by
 * the declared moves on the slot vs. merely *potential* (the species
 * could learn one of the role's key moves but the user hasn't picked
 * it). The Pokémon-card UI uses the result to render confirmed roles
 * solid and potential roles dashed/dimmed, matching the team scorer
 * which now weights the two very differently.
 *
 * Mapping rule, per role:
 *  - **pivot** → at least one PIVOT_MOVES entry declared
 *  - **hazard-setter** → at least one HAZARD_SETUP entry declared
 *  - **support** → at least one of STATUS / RECOVERY / SCREEN moves
 *  - **lead** → screens or hazards declared
 *  - **physical-sweeper / special-sweeper** → matching setup move
 *    declared (Dragon Dance, Calm Mind, …) — these roles can also
 *    work without setup (cleaners with priority) so we accept any
 *    declared offensive set as confirmation when a setup move isn't
 *    available
 *  - **revenge-killer** → priority move declared
 *  - **physical-wall / special-wall / mixed-wall** → recovery move
 *    declared (a wall without recovery is dead in 3 turns)
 *  - **wallbreaker** → any declared moveset (a wallbreaker is mostly
 *    a stat profile + STAB; declared moves are enough to commit to
 *    the role)
 *
 * Returns an empty array when `selectedMoves` is empty/missing — the
 * slot has no declared moves so nothing can be confirmed.
 */
export function confirmedRoles(
  selectedMoves: string[] | undefined,
): PokemonRole[] {
  if (!selectedMoves || selectedMoves.length === 0) return [];
  const pool = new Set(selectedMoves);
  const out: PokemonRole[] = [];
  if (knowsAny(pool, PIVOT_MOVES)) out.push("pivot");
  if (knowsAny(pool, HAZARD_SETUP)) out.push("hazard-setter");
  if (
    knowsAny(pool, STATUS_MOVES) ||
    knowsAny(pool, RECOVERY_MOVES) ||
    knowsAny(pool, SCREEN_MOVES)
  ) {
    out.push("support");
  }
  if (knowsAny(pool, SCREEN_MOVES) || knowsAny(pool, HAZARD_SETUP)) {
    out.push("lead");
  }
  if (knowsAny(pool, PHYSICAL_SETUP)) {
    out.push("physical-sweeper");
    // Setup is enough to confirm the wallbreaker reading too —
    // Swords Dance Kingambit, Dragon Dance Dracolosse etc.
    out.push("wallbreaker");
  }
  if (knowsAny(pool, SPECIAL_SETUP)) {
    out.push("special-sweeper");
    out.push("wallbreaker");
  }
  if (knowsAny(pool, PRIORITY_MOVES)) {
    out.push("revenge-killer");
  }
  if (knowsAny(pool, RECOVERY_MOVES)) {
    out.push("physical-wall");
    out.push("special-wall");
    out.push("mixed-wall");
  }
  return Array.from(new Set(out));
}

/**
 * Worst-case negative ability assuming the species *might* be forced
 * onto its only-available talent. Used by the optimiser to avoid
 * picking Monaflèmit (single-ability Truant) just because its BST is
 * high. Returns null for Pokémon with at least one safe ability —
 * the user can still pick the bad one manually but the optimiser
 * trusts they wouldn't.
 */
export function speciesForcedNegativeAbility(
  p: Pokemon,
): { penalty: number; label: string } | null {
  const all = Array.from(
    new Set([...p.abilities, p.hiddenAbility].filter((a): a is string => !!a)),
  );
  if (all.length === 0) return null;
  // Every accessible ability must be negative for this to bite.
  let worst: { penalty: number; label: string } | null = null;
  for (const a of all) {
    const meta = NEGATIVE_ABILITIES[a];
    if (!meta) return null;
    if (!worst || meta.penalty > worst.penalty) worst = meta;
  }
  return worst;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function learnsetOf(pokemonId: string): Set<string> {
  const m = getSpeciesExtras(pokemonId)?.movesByMethod;
  if (!m) return new Set();
  const out = new Set<string>();
  for (const lm of m.level) out.add(lm.move);
  for (const id of m.tm) out.add(id);
  for (const id of m.egg) out.add(id);
  for (const id of m.tutor) out.add(id);
  return out;
}

function knowsAny(pool: Set<string>, ids: string[]): boolean {
  for (const id of ids) if (pool.has(id)) return true;
  return false;
}

function countKnown(pool: Set<string>, ids: string[]): number {
  let n = 0;
  for (const id of ids) if (pool.has(id)) n++;
  return n;
}

/**
 * Resolve the talent the mon is actually running.
 *
 * Behavior, mirroring the user requirement "ne jamais créditer
 * automatiquement le meilleur talent":
 *  - When the user has explicitly set `selectedAbility`, return it.
 *  - When the Pokémon has exactly one talent option (single regular
 *    ability and no hidden, or both pointing at the same name), it's
 *    safe to assume the mon runs that talent — auto-select.
 *  - Otherwise return `undefined`. The scoring then gets *no*
 *    ability credit; the user must pick one for the bonus to apply.
 */
function effectiveAbility(
  p: Pokemon,
  selectedAbility?: string,
): string | undefined {
  if (selectedAbility) return selectedAbility;
  const uniqueOptions = new Set(
    [...p.abilities, p.hiddenAbility].filter((a): a is string => !!a),
  );
  return uniqueOptions.size === 1 ? [...uniqueOptions][0] : undefined;
}

function hasOffensiveAbility(p: Pokemon, selectedAbility?: string): boolean {
  const ability = effectiveAbility(p, selectedAbility);
  return ability ? OFFENSIVE_ABILITIES.has(ability) : false;
}
function hasDefensiveAbility(p: Pokemon, selectedAbility?: string): boolean {
  const ability = effectiveAbility(p, selectedAbility);
  return ability ? DEFENSIVE_ABILITIES.has(ability) : false;
}
function hasPivotAbility(p: Pokemon, selectedAbility?: string): boolean {
  const ability = effectiveAbility(p, selectedAbility);
  return ability ? PIVOT_ABILITIES.has(ability) : false;
}

// ─── Confidence-score-based role detection ────────────────────────────

/**
 * Convert a raw confidence score (0–100+) to a `RoleLevel` band.
 * Bands tuned so primary ≈ "this mon clearly does that job",
 * secondary ≈ "viable variant slot", situational ≈ "edge case".
 */
function levelFor(score: number): RoleLevel {
  if (score >= PRIMARY_THRESHOLD) return "primary";
  if (score >= SECONDARY_THRESHOLD) return "secondary";
  if (score >= SITUATIONAL_THRESHOLD) return "situational";
  return "none";
}

interface ScoringContext {
  pokemon: Pokemon;
  /** Move pool to consider for "knows X" signals — set-aware when a
   *  slot moveset is provided, else the full learnset. */
  movePool: Set<string>;
  /** `true` when `movePool` is the 4 declared moves rather than the
   *  full learnset. Some signals trust declared moves more than
   *  hypothetical learnset access. */
  setAware: boolean;
  /** The selected ability for this slot, when the user picked one
   *  explicitly. Drives the strict ability-bonus scoring. */
  selectedAbility?: string;
}

type Scorer = (ctx: ScoringContext) => { score: number; factors: string[] };

const ROLE_SCORERS: Record<PokemonRole, Scorer> = {
  "physical-sweeper": ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { attack, spAtk, speed } = pokemon.baseStats;
    // Stat base — wider band than the old hard cutoff. Each step adds
    // points so a 105 Atk mon registers as situational instead of
    // being silently dropped.
    if (attack >= 130) {
      s += 30;
      f.push(`Atk ${attack} → +30`);
    } else if (attack >= 110) {
      s += 22;
      f.push(`Atk ${attack} → +22`);
    } else if (attack >= 95) {
      s += 14;
      f.push(`Atk ${attack} → +14`);
    }
    if (attack <= spAtk - 10) {
      // Special-skewed mon: less likely to be physical.
      s -= 10;
      f.push("Atk < SpA → -10");
    }
    if (speed >= 110) {
      s += 18;
      f.push(`Speed ${speed} → +18`);
    } else if (speed >= 95) {
      s += 12;
      f.push(`Speed ${speed} → +12`);
    } else if (speed >= 80) {
      s += 6;
      f.push(`Speed ${speed} → +6`);
    } else if (speed <= 60) {
      // Slow physical attackers are wallbreakers/cleaners (Kingambit,
      // Azumarill) — they get partial credit through priority/setup
      // signals below rather than raw speed.
      s -= 5;
      f.push("Speed très faible → -5");
    }
    if (knowsAny(movePool, PHYSICAL_SETUP)) {
      const w = setAware ? 25 : 18;
      s += w;
      f.push(`Setup phys. ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (knowsAny(movePool, PRIORITY_MOVES)) {
      const w = setAware ? 15 : 10;
      s += w;
      f.push(`Priorité ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasOffensiveAbility(pokemon, selectedAbility)) {
      s += 15;
      f.push("Talent offensif → +15");
    }
    if (hasDefensiveAbility(pokemon, selectedAbility) && attack < 100) {
      // Wall-flavoured ability + average attack: probably not a sweeper.
      s -= 8;
      f.push("Talent défensif → -8");
    }
    return { score: s, factors: f };
  },

  "special-sweeper": ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { attack, spAtk, speed } = pokemon.baseStats;
    if (spAtk >= 130) {
      s += 30;
      f.push(`SpA ${spAtk} → +30`);
    } else if (spAtk >= 110) {
      s += 22;
      f.push(`SpA ${spAtk} → +22`);
    } else if (spAtk >= 95) {
      s += 14;
      f.push(`SpA ${spAtk} → +14`);
    }
    if (spAtk <= attack - 10) {
      s -= 10;
      f.push("SpA < Atk → -10");
    }
    if (speed >= 110) {
      s += 18;
      f.push(`Speed ${speed} → +18`);
    } else if (speed >= 95) {
      s += 12;
      f.push(`Speed ${speed} → +12`);
    } else if (speed >= 80) {
      s += 6;
      f.push(`Speed ${speed} → +6`);
    } else if (speed <= 60) {
      s -= 5;
      f.push("Speed très faible → -5");
    }
    if (knowsAny(movePool, SPECIAL_SETUP)) {
      const w = setAware ? 25 : 18;
      s += w;
      f.push(`Setup spé. ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasOffensiveAbility(pokemon, selectedAbility)) {
      s += 15;
      f.push("Talent offensif → +15");
    }
    if (hasDefensiveAbility(pokemon, selectedAbility) && spAtk < 100) {
      s -= 8;
      f.push("Talent défensif → -8");
    }
    return { score: s, factors: f };
  },

  "physical-wall": ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { hp, defense, attack, speed } = pokemon.baseStats;
    const bulk = hp + defense;
    if (bulk >= 240) {
      s += 48;
      f.push(`HP+Def ${bulk} → +48`);
    } else if (bulk >= 200) {
      s += 32;
      f.push(`HP+Def ${bulk} → +32`);
    } else if (bulk >= 170) {
      s += 18;
      f.push(`HP+Def ${bulk} → +18`);
    }
    if (knowsAny(movePool, RECOVERY_MOVES)) {
      const w = setAware ? 20 : 14;
      s += w;
      f.push(`Récup ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasDefensiveAbility(pokemon, selectedAbility)) {
      s += 15;
      f.push("Talent défensif → +15");
    }
    if (attack >= 110 && bulk < 200) {
      s -= 8;
      f.push("Atk haut, bulk moyen → -8");
    }
    if (speed >= 100) {
      // Fast mons are rarely walls.
      s -= 5;
      f.push("Speed élevé → -5");
    }
    return { score: s, factors: f };
  },

  "special-wall": ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { hp, spDef, spAtk, speed } = pokemon.baseStats;
    const bulk = hp + spDef;
    if (bulk >= 240) {
      s += 48;
      f.push(`HP+SpD ${bulk} → +48`);
    } else if (bulk >= 200) {
      s += 32;
      f.push(`HP+SpD ${bulk} → +32`);
    } else if (bulk >= 170) {
      s += 18;
      f.push(`HP+SpD ${bulk} → +18`);
    }
    if (knowsAny(movePool, RECOVERY_MOVES)) {
      const w = setAware ? 20 : 14;
      s += w;
      f.push(`Récup ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasDefensiveAbility(pokemon, selectedAbility)) {
      s += 15;
      f.push("Talent défensif → +15");
    }
    if (spAtk >= 110 && bulk < 200) {
      s -= 8;
      f.push("SpA haut, bulk moyen → -8");
    }
    if (speed >= 100) {
      s -= 5;
      f.push("Speed élevé → -5");
    }
    return { score: s, factors: f };
  },

  "mixed-wall": ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { hp, defense, spDef } = pokemon.baseStats;
    if (hp + defense >= 200 && hp + spDef >= 200) {
      s += 50;
      f.push("HP+Def ET HP+SpD ≥ 200 → +50");
    } else if (hp + defense >= 180 && hp + spDef >= 180) {
      s += 30;
      f.push("Bulk équilibré → +30");
    }
    if (knowsAny(movePool, RECOVERY_MOVES)) {
      s += setAware ? 20 : 14;
      f.push("Récup → +" + (setAware ? 20 : 14));
    }
    if (hasDefensiveAbility(pokemon, selectedAbility)) {
      s += 15;
      f.push("Talent défensif → +15");
    }
    return { score: s, factors: f };
  },

  "revenge-killer": ({ pokemon, movePool, setAware }) => {
    const f: string[] = [];
    let s = 0;
    const { attack, spAtk, speed } = pokemon.baseStats;
    if (speed >= 130) {
      s += 35;
      f.push(`Speed ${speed} → +35`);
    } else if (speed >= 115) {
      s += 25;
      f.push(`Speed ${speed} → +25`);
    } else if (speed >= 100) {
      s += 15;
      f.push(`Speed ${speed} → +15`);
    }
    if (knowsAny(movePool, PRIORITY_MOVES)) {
      const w = setAware ? 35 : 22;
      s += w;
      f.push(`Priorité ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (attack >= 110 || spAtk >= 110) {
      s += 12;
      f.push("Offensif → +12");
    }
    return { score: s, factors: f };
  },

  "hazard-setter": ({ movePool, setAware }) => {
    const f: string[] = [];
    let s = 0;
    const ids = HAZARD_SETUP.filter((id) => movePool.has(id));
    if (ids.length === 0) return { score: 0, factors: [] };
    const w = setAware ? 70 : 45;
    s += w;
    f.push(`${ids.join(", ")} ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    return { score: s, factors: f };
  },

  pivot: ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const ids = PIVOT_MOVES.filter((id) => movePool.has(id));
    if (ids.length > 0) {
      const w = setAware ? 60 : 38;
      s += w;
      f.push(`${ids[0]} ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasPivotAbility(pokemon, selectedAbility)) {
      s += 25;
      f.push("Régé-Force / Médic Nature → +25");
    }
    return { score: s, factors: f };
  },

  support: ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const statusN = countKnown(movePool, STATUS_MOVES);
    const screenN = countKnown(movePool, SCREEN_MOVES);
    if (statusN >= 2) {
      const w = setAware ? 35 : 22;
      s += w;
      f.push(`${statusN} status ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    } else if (statusN === 1) {
      s += 12;
      f.push("1 status → +12");
    }
    if (screenN >= 1) {
      s += setAware ? 20 : 14;
      f.push("Écran → +" + (setAware ? 20 : 14));
    }
    if (knowsAny(movePool, RECOVERY_MOVES)) {
      s += 10;
      f.push("Récup → +10");
    }
    if (hasDefensiveAbility(pokemon, selectedAbility)) {
      s += 10;
      f.push("Talent défensif → +10");
    }
    return { score: s, factors: f };
  },

  wallbreaker: ({ pokemon, movePool, setAware, selectedAbility }) => {
    const f: string[] = [];
    let s = 0;
    const { attack, spAtk } = pokemon.baseStats;
    const peak = Math.max(attack, spAtk);
    if (peak >= 135) {
      s += 35;
      f.push(`Stat off. ${peak} → +35`);
    } else if (peak >= 120) {
      s += 22;
      f.push(`Stat off. ${peak} → +22`);
    } else if (peak >= 105) {
      s += 12;
      f.push(`Stat off. ${peak} → +12`);
    }
    if (knowsAny(movePool, [...PHYSICAL_SETUP, ...SPECIAL_SETUP])) {
      const w = setAware ? 20 : 14;
      s += w;
      f.push(`Setup ${setAware ? "(set)" : "(learnset)"} → +${w}`);
    }
    if (hasOffensiveAbility(pokemon, selectedAbility)) {
      s += 20;
      f.push("Talent offensif → +20");
    }
    return { score: s, factors: f };
  },

  lead: ({ pokemon, movePool, setAware }) => {
    const f: string[] = [];
    let s = 0;
    const { speed } = pokemon.baseStats;
    const isSetter = knowsAny(movePool, HAZARD_SETUP);
    if (isSetter) {
      s += setAware ? 35 : 22;
      f.push("Hazard setter → +" + (setAware ? 35 : 22));
    }
    if (speed >= 100) {
      s += 25;
      f.push(`Speed ${speed} → +25`);
    } else if (speed >= 85) {
      s += 10;
      f.push(`Speed ${speed} → +10`);
    }
    if (knowsAny(movePool, ["taunt"])) {
      s += 15;
      f.push("Taunt → +15");
    }
    return { score: s, factors: f };
  },
};

const ALL_ROLES = Object.keys(ROLE_SCORERS) as PokemonRole[];

/**
 * Compute the role profile for one Pokémon.
 *
 * `slotMoves` and `selectedAbility` describe the **declared** set the
 * user is running. When either is set, the scorers credit it
 * confidently (set-aware bonuses, high-impact ability bonuses).
 * Without them, the engine falls back to "anything in the learnset /
 * any of the listed abilities" — explicitly weaker so the user feels
 * the value of configuring the slot.
 */
export function getRoleProfile(
  pokemon: Pokemon,
  slotMoves?: string[],
  selectedAbility?: string,
): RoleProfile {
  const movePool = slotMoves && slotMoves.length > 0
    ? new Set(slotMoves)
    : learnsetOf(pokemon.id);
  const setAware = Boolean(slotMoves && slotMoves.length > 0);

  const roles: RoleConfidence[] = ALL_ROLES.map((role) => {
    const { score, factors } = ROLE_SCORERS[role]({
      pokemon,
      movePool,
      setAware,
      selectedAbility,
    });
    // Static tag bonus — if the Pokémon was hand-tagged with this
    // role, treat that as a "yes the community agrees" nudge of +15.
    const staticBoost = pokemon.roles.includes(role) ? 15 : 0;
    // High-impact ability bonus — Multiécaille / Coloforce /
    // Régé-Force etc. carry serious strategic weight when actually
    // running, so the role they enable gets a +15–30 nudge.
    const impact = highImpactAbilityBonus(pokemon, selectedAbility, role);
    const impactDelta = impact?.bonus ?? 0;
    const total = Math.max(
      0,
      Math.min(100, score + staticBoost + impactDelta),
    );
    const extraFactors: string[] = [];
    if (staticBoost) extraFactors.push(`Tag déclaré → +${staticBoost}`);
    if (impact) extraFactors.push(`${impact.label} → +${impact.bonus}`);
    return {
      role,
      score: total,
      level: levelFor(total),
      factors: extraFactors.length ? [...factors, ...extraFactors] : factors,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    roles,
    primary: roles.filter((r) => r.level === "primary").map((r) => r.role),
    active: roles
      .filter((r) => r.level === "primary" || r.level === "secondary")
      .map((r) => r.role),
  };
}

/**
 * Roles a team is missing at *active* (primary OR secondary) level.
 * Looser than V1's "any tag matches" check — a mon needs to credibly
 * play the role, not just learn one related move.
 */
export function teamMissingRoles(
  team: Pokemon[],
  slotMoves: (string[] | undefined)[] = [],
  slotAbilities: (string | undefined)[] = [],
): { covered: PokemonRole[]; missing: PokemonRole[] } {
  const covered = new Set<PokemonRole>();
  for (let i = 0; i < team.length; i++) {
    const profile = getRoleProfile(team[i]!, slotMoves[i], slotAbilities[i]);
    for (const r of profile.active) covered.add(r);
    // Union with declarative truth — if the slot has the role's key
    // moves declared, the role IS filled regardless of where the
    // probabilistic role-scorer landed (fixes off-by-1 misses like
    // Motisma 37 vs threshold 38, or Defog/Pain Split that aren't in
    // the curated STATUS / RECOVERY lists the scorer reads).
    for (const r of confirmedRoles(slotMoves[i])) covered.add(r);
  }
  const wanted: PokemonRole[] = [
    "physical-sweeper",
    "special-sweeper",
    "physical-wall",
    "special-wall",
    "support",
    "hazard-setter",
    "pivot",
    "revenge-killer",
  ];
  return {
    covered: Array.from(covered),
    missing: wanted.filter((r) => !covered.has(r)),
  };
}
