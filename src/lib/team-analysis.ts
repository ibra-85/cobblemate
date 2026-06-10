import { POKEMON_BY_ID, POKEMON } from "@/data/pokemon";
import {
  getSpeciesExtras,
  isLegendary,
  isMythical,
  isParadox,
} from "@/data/species-extras";
import type { Pokemon, PokemonRole, PokemonTypeId, TeamSlot } from "@/types";
import {
  ALL_TYPES,
  calculateTypeEffectiveness,
  getResistances,
  getWeaknesses,
} from "@/lib/type-chart";
import {
  confirmedRoles as confirmedRolesImpl,
  getRoleProfile,
  negativeAbilityPenalty,
  speciesForcedNegativeAbility,
  teamMissingRoles,
  type RoleProfile,
} from "@/lib/team-roles";
import { findItemById } from "@/data/competitive-items";
import { getSmogonStats } from "@/data/smogon";
import { smogonSetToSlotPatch } from "@/lib/smogon-set-mapping";
import {
  CAP_LABEL_FR,
  CAP_NEED_BONUS,
  slotCapabilities,
} from "@/lib/team-set-optimizer";

// ─── Types ────────────────────────────────────────────────────────────

export interface TeamReplacement {
  fromIndex: number;
  current: Pokemon | null;
  candidate: Pokemon;
  newScore: number;
  gain: number;
  /** Short human-readable reasons the candidate ranks where it does
   *  (Smogon viability, critical-need coverage, role overlap, …).
   *  Surfaced in the suggestions panel so swaps aren't a magic +N. */
  factors: CandidateFactor[];
}

/**
 * One contribution to an axis score, surfaced in the UI so the user
 * can see WHY the axis is what it is. Positive `delta` = bonus,
 * negative = penalty. `label` is human-readable French.
 */
export interface AxisFactor {
  delta: number;
  label: string;
}

export interface AxisScore {
  value: number;
  factors: AxisFactor[];
}

export interface TeamScoreBreakdown {
  offense: AxisScore;
  defense: AxisScore;
  speed: AxisScore;
  hazard: AxisScore;
  utility: AxisScore;
  synergy: AxisScore;
  /** New axis: structural reliability — does the team hold together,
   *  or does it collapse if one key mon is gone? */
  reliability: AxisScore;
}

export interface ThreatNote {
  level: "warn" | "good";
  label: string;
  /** Optional explanatory bullets — surfaced under the headline in
   *  the UI so the user sees *why* the threat is flagged, not just
   *  "Sensible aux setup sweepers". Up to 3 bullets per note. */
  reasons?: string[];
  /** Severity tier for the warn-level notes. `high` = clear gap that
   *  shapes match-ups; `medium` = noticeable but manageable. Only
   *  meaningful when `level === "warn"`. */
  severity?: "low" | "medium" | "high";
}

export interface TeamAnalysis {
  members: Pokemon[];
  sharedWeaknesses: Partial<Record<PokemonTypeId, number>>;
  resistanceCoverage: Partial<Record<PokemonTypeId, number>>;
  immunityCoverage: Partial<Record<PokemonTypeId, number>>;
  offensiveCoverage: PokemonTypeId[];
  missingOffensiveTypes: PokemonTypeId[];
  /** Roles where at least one member hits primary or secondary level. */
  presentRoles: PokemonRole[];
  /** Roles still missing at active (primary/secondary) level. */
  missingRoles: PokemonRole[];
  /** Per-member full role confidence profile. */
  roleProfiles: RoleProfile[];
  score: number;
  breakdown: TeamScoreBreakdown;
  /** Top-N "vulnérable à …" / "domine contre …" insights. */
  threats: ThreatNote[];
  replacements: TeamReplacement[];
}

// ─── Constants ────────────────────────────────────────────────────────

const HAZARD_MOVES = ["stealthrock", "spikes", "toxicspikes", "stickyweb"];
const HAZARD_REMOVAL = ["rapidspin", "defog", "tidyup", "courtchange"];
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
// Axis weights — final score = weighted blend.
// Less weight on raw offensive coverage (the V1 bias the user
// flagged), more weight on hazard and reliability.
const BREAKDOWN_WEIGHTS: Record<keyof TeamScoreBreakdown, number> = {
  offense: 0.15,
  defense: 0.18,
  speed: 0.10,
  hazard: 0.15,
  utility: 0.10,
  synergy: 0.16,
  reliability: 0.16,
};

// ─── Move pool / slot moves ──────────────────────────────────────────

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

/**
 * Returns the set of moves the team is "running" — taking declared
 * `selectedMoves` per slot when present, falling back to the full
 * learnset otherwise. Each entry corresponds to one team member.
 */
function teamMovePools(
  team: Pokemon[],
  slotMoves: (string[] | undefined)[],
): { pool: Set<string>; setAware: boolean }[] {
  return team.map((p, i) => {
    const moves = slotMoves[i];
    if (moves && moves.length > 0) {
      return { pool: new Set(moves), setAware: true };
    }
    return { pool: learnsetOf(p.id), setAware: false };
  });
}

// ─── Type-chart analysis ──────────────────────────────────────────────

export function resolveTeam(slots: TeamSlot[]): Pokemon[] {
  return slots
    .map((s) => (s.pokemonId ? POKEMON_BY_ID[s.pokemonId] : null))
    .filter((p): p is Pokemon => Boolean(p));
}

function teamSelectedMoves(slots?: TeamSlot[]): (string[] | undefined)[] {
  if (!slots) return [];
  return slots
    .filter((s) => s.pokemonId)
    .map((s) => s.selectedMoves);
}

function teamSelectedAbilities(slots?: TeamSlot[]): (string | undefined)[] {
  if (!slots) return [];
  return slots
    .filter((s) => s.pokemonId)
    .map((s) => s.selectedAbility);
}

function teamSelectedItems(slots?: TeamSlot[]): (string | undefined)[] {
  if (!slots) return [];
  return slots
    .filter((s) => s.pokemonId)
    .map((s) => s.selectedItem);
}

// Item recognition routes through the canonical registry — any saved
// team using snake_case / kebab-case / "minecraft:" prefixed forms
// resolves to the same entry, so the hazard-scoring branch fires
// uniformly regardless of where the team was originally written.
function isBoots(item: string | undefined): boolean {
  const meta = findItemById(item);
  return meta?.id === "heavy_duty_boots";
}

export function analyzeTeamWeaknesses(team: Pokemon[]) {
  const weak: Partial<Record<PokemonTypeId, number>> = {};
  const resist: Partial<Record<PokemonTypeId, number>> = {};
  const immune: Partial<Record<PokemonTypeId, number>> = {};

  for (const p of team) {
    for (const t of ALL_TYPES) {
      const m = calculateTypeEffectiveness(t, p.types);
      if (m === 0) immune[t] = (immune[t] ?? 0) + 1;
      else if (m >= 2) weak[t] = (weak[t] ?? 0) + 1;
      else if (m < 1) resist[t] = (resist[t] ?? 0) + 1;
    }
  }
  return { weak, resist, immune };
}

export function analyzeTeamCoverage(team: Pokemon[]) {
  const covered = new Set<PokemonTypeId>();
  for (const p of team) {
    for (const t of p.types) {
      for (const defType of ALL_TYPES) {
        if (calculateTypeEffectiveness(t, [defType]) >= 2) covered.add(defType);
      }
    }
  }
  const missing = ALL_TYPES.filter((t) => !covered.has(t));
  return { covered: Array.from(covered), missing };
}

// ─── Factor-based axis scoring ────────────────────────────────────────
//
// Each `scoreXxx` helper builds an `AxisScore` — a numeric value and a
// list of explainable factors. The headline `scoreTeam` is the weighted
// blend; the UI also displays the per-axis factor list so the user
// understands *why* the axis is what it is.

function newAxis(base: number, baseLabel: string = "Base"): AxisScore {
  return {
    value: base,
    factors: [{ delta: base, label: baseLabel }],
  };
}

function addFactor(axis: AxisScore, delta: number, label: string): void {
  if (delta === 0) return;
  axis.value += delta;
  axis.factors.push({ delta, label });
}

function finaliseAxis(axis: AxisScore, teamFactor: number): AxisScore {
  // Partial-team scaling is informational — applied uniformly so the
  // breakdown also reads "your team isn't full".
  if (teamFactor < 1) {
    const before = axis.value;
    axis.value = Math.round(before * teamFactor);
    axis.factors.push({
      delta: axis.value - before,
      label: `Équipe incomplète × ${(teamFactor * 100).toFixed(0)}%`,
    });
  }
  axis.value = Math.max(0, Math.min(100, Math.round(axis.value)));
  return axis;
}

// ─── Per-axis scoring ─────────────────────────────────────────────────

function scoreOffense(
  team: Pokemon[],
  profiles: RoleProfile[],
  movePools: { pool: Set<string>; setAware: boolean }[],
  covered: PokemonTypeId[],
): AxisScore {
  const axis = newAxis(40);
  // STAB coverage (capped, half weight vs V1 to reduce role-coverage
  // bias the user called out).
  const stabBonus = Math.min(covered.length, 18) * 1.5;
  addFactor(axis, stabBonus, `Couverture STAB ${covered.length}/18`);

  // Wallbreakers — confirmed vs potential split, matching the
  // hazard / utility / reliability axes. A primary-level wallbreaker
  // inferred purely from stats (no declared moves) is "could become
  // one once the user picks a set" not a real wallbreaker.
  const wallbreakersConfirmed = profiles.filter(
    (rp, i) =>
      movePools[i]?.setAware &&
      rp.roles.some((r) => r.role === "wallbreaker" && r.level === "primary"),
  ).length;
  const wallbreakersPotential = profiles.filter(
    (rp, i) =>
      !movePools[i]?.setAware &&
      rp.roles.some((r) => r.role === "wallbreaker" && r.level === "primary"),
  ).length;
  if (wallbreakersConfirmed >= 1) {
    addFactor(axis, 12, `${wallbreakersConfirmed} wallbreaker(s) confirmé(s)`);
  } else if (wallbreakersPotential >= 1) {
    addFactor(axis, 3, "Wallbreaker potentiel");
  }

  // Sweepers — same confirmed-vs-potential split.
  const sweepersConfirmed = profiles.filter(
    (rp, i) =>
      movePools[i]?.setAware &&
      rp.primary.some(
        (r) => r === "physical-sweeper" || r === "special-sweeper",
      ),
  ).length;
  const sweepersPotential = profiles.filter(
    (rp, i) =>
      !movePools[i]?.setAware &&
      rp.primary.some(
        (r) => r === "physical-sweeper" || r === "special-sweeper",
      ),
  ).length;
  if (sweepersConfirmed >= 1) {
    addFactor(axis, 10, `${sweepersConfirmed} sweeper(s) confirmé(s)`);
  } else if (sweepersPotential >= 1) {
    addFactor(axis, 3, "Sweeper potentiel");
  }

  // Raw firepower — average peak offensive stat.
  const avgPeak =
    team.reduce(
      (acc, p) => acc + Math.max(p.baseStats.attack, p.baseStats.spAtk),
      0,
    ) / Math.max(1, team.length);
  if (avgPeak >= 110) {
    addFactor(axis, 8, `Puissance moyenne ${Math.round(avgPeak)}`);
  } else if (avgPeak < 85) {
    addFactor(axis, -6, `Puissance faible ${Math.round(avgPeak)}`);
  }

  return axis;
}

function scoreDefense(
  team: Pokemon[],
  profiles: RoleProfile[],
  weak: Partial<Record<PokemonTypeId, number>>,
  resist: Partial<Record<PokemonTypeId, number>>,
  immune: Partial<Record<PokemonTypeId, number>>,
): AxisScore {
  const axis = newAxis(50);
  // Defensive coverage — one bonus point per covered type.
  let covered = 0;
  for (const t of ALL_TYPES) {
    if ((resist[t] ?? 0) + (immune[t] ?? 0) >= 1) covered++;
  }
  addFactor(axis, covered, `${covered}/18 types défensivement couverts`);

  // Shared weakness penalty, immunity-aware. We only cite the top 3
  // worst weaknesses (the ones that actually shape matches) — listing
  // every 2-member 2× weakness would crush the axis on type-diverse
  // teams that genuinely play fine. Discounted by immunities (free
  // pivot) and strong resistances.
  const sortedWeaknesses = (Object.entries(weak) as [PokemonTypeId, number][])
    .filter(([, w]) => w >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  for (const [t, w] of sortedWeaknesses) {
    const immuneCount = immune[t] ?? 0;
    const resistCount = resist[t] ?? 0;
    const discount = Math.max(
      0,
      1 - 0.5 * immuneCount - 0.2 * resistCount,
    );
    if (discount === 0) continue;
    const base = w >= 3 ? 9 : 4;
    const penalty = Math.round(-base * discount);
    if (penalty !== 0) {
      addFactor(
        axis,
        penalty,
        `${w} membres faibles ${t}${immuneCount > 0 ? ` (${immuneCount} immune)` : ""}`,
      );
    }
  }

  // Wall presence — accept secondary-level walls because a single mon
  // running a defensive set is enough to absorb a category of hits.
  // The strict "primary only" check disqualified Fort-Ivoire-class
  // hybrids the user pointed out as legitimate part-time walls.
  const physWalls = profiles.filter((rp) =>
    rp.active.includes("physical-wall"),
  ).length;
  if (physWalls >= 1) addFactor(axis, 6, "Mur physique présent");
  const specWalls = profiles.filter((rp) =>
    rp.active.includes("special-wall"),
  ).length;
  if (specWalls >= 1) addFactor(axis, 6, "Mur spécial présent");
  if (physWalls === 0 && specWalls === 0) {
    addFactor(axis, -8, "Aucun mur");
  }

  return axis;
}

function scoreSpeed(
  team: Pokemon[],
  movePools: { pool: Set<string>; setAware: boolean }[],
): AxisScore {
  const axis = newAxis(35);
  const speeds = team.map((p) => p.baseStats.speed);
  const maxSpeed = Math.max(...speeds);
  if (maxSpeed >= 130) addFactor(axis, 30, `Top speed ${maxSpeed}`);
  else if (maxSpeed >= 110) addFactor(axis, 22, `Top speed ${maxSpeed}`);
  else if (maxSpeed >= 95) addFactor(axis, 14, `Top speed ${maxSpeed}`);
  else if (maxSpeed >= 80) addFactor(axis, 6, `Top speed ${maxSpeed}`);
  else addFactor(axis, -8, `Top speed faible (${maxSpeed})`);

  const fastCount = speeds.filter((s) => s >= 100).length;
  if (fastCount >= 2) {
    addFactor(axis, 12, `${fastCount} mons 100+ speed`);
  } else if (fastCount === 1) {
    addFactor(axis, 6, "1 mon 100+ speed");
  }

  // Priority — split confirmed (declared) vs potential (learnset
  // only). A learnset-only priority signal doesn't deliver until the
  // user actually picks the move; treating it as full credit was
  // padding the speed axis on bare teams.
  const priorityConfirmed = movePools.filter(
    ({ pool, setAware }) => setAware && knowsAny(pool, PRIORITY_MOVES),
  ).length;
  const priorityPotential = movePools.filter(
    ({ pool, setAware }) => !setAware && knowsAny(pool, PRIORITY_MOVES),
  ).length;
  if (priorityConfirmed >= 2) {
    addFactor(axis, 15, `${priorityConfirmed} mons à priorité confirmée`);
  } else if (priorityConfirmed === 1) {
    addFactor(axis, 10, "1 mon à priorité confirmée");
  } else if (priorityPotential >= 1) {
    addFactor(
      axis,
      3,
      `Priorité potentielle (×${priorityPotential})`,
    );
  }

  return axis;
}

function scoreHazard(
  team: Pokemon[],
  movePools: { pool: Set<string>; setAware: boolean }[],
  selectedItems: (string | undefined)[],
): AxisScore {
  const axis = newAxis(50);

  // Confirmed vs potential: the user explicitly called out that a
  // theoretical "could run Stealth Rock" learnset doesn't deserve the
  // same bonus as a slot that actually has Piège de Roc declared.
  // Confirmed = a slot with `setAware: true` and one of the moves on
  // its declared list. Potential = a slot that *could* run it from
  // its learnset but hasn't declared it.
  const confirmedSetter = movePools.some(
    ({ pool, setAware }) => setAware && knowsAny(pool, HAZARD_MOVES),
  );
  const potentialSetter =
    !confirmedSetter &&
    movePools.some(({ pool }) => knowsAny(pool, HAZARD_MOVES));
  const confirmedRemover = movePools.some(
    ({ pool, setAware }) => setAware && knowsAny(pool, HAZARD_REMOVAL),
  );
  const potentialRemover =
    !confirmedRemover &&
    movePools.some(({ pool }) => knowsAny(pool, HAZARD_REMOVAL));
  const hasSetter = confirmedSetter || potentialSetter;
  const hasRemover = confirmedRemover || potentialRemover;
  const hasSpinblocker = team.some((p) => p.types.includes("ghost"));

  if (confirmedSetter) addFactor(axis, 18, "Hazard setter confirmé");
  else if (potentialSetter) addFactor(axis, 4, "Hazard setter potentiel");
  if (confirmedRemover) addFactor(axis, 18, "Hazard removal confirmé");
  else if (potentialRemover) addFactor(axis, 3, "Hazard removal potentiel");
  else addFactor(axis, -10, "Aucun removal");
  if (confirmedSetter && hasSpinblocker) {
    addFactor(axis, 8, "Synergie setter + spinblocker");
  }

  // Centralisation penalty — when a single mon carries both the
  // hazard setter AND the removal, losing it tears the whole hazard
  // game in two. The axis is still high (both jobs done!) but the
  // structural fragility deserves a chip-off. The user explicitly
  // flagged a Fort-Ivoire that does everything by itself.
  const dualCarrier = movePools.some(
    ({ pool, setAware }) =>
      setAware && knowsAny(pool, HAZARD_MOVES) && knowsAny(pool, HAZARD_REMOVAL),
  );
  if (dualCarrier) {
    // Count how many *other* mons share the load. If at least one
    // other setter OR remover exists, the centralisation is mild.
    const otherSetters = movePools.filter(
      ({ pool, setAware }, i) =>
        setAware &&
        knowsAny(pool, HAZARD_MOVES) &&
        !(knowsAny(pool, HAZARD_REMOVAL) && i === movePools.findIndex(
          (mp) => mp.setAware && knowsAny(mp.pool, HAZARD_MOVES) && knowsAny(mp.pool, HAZARD_REMOVAL),
        )),
    ).length;
    const otherRemovers = movePools.filter(
      ({ pool, setAware }) => setAware && knowsAny(pool, HAZARD_REMOVAL),
    ).length;
    // Fully centralised: the *only* setter and the *only* remover
    // sit on the same Pokémon → bigger hit. Some redundancy on
    // either side → softer hit.
    const fullyCentralised = otherSetters <= 1 && otherRemovers <= 1;
    addFactor(
      axis,
      fullyCentralised ? -18 : -8,
      `Centralisation hazards sur 1 Pokémon${fullyCentralised ? " (aucun relais)" : ""}`,
    );
  }

  // Stealth Rock dependency — per-member, now item-aware:
  //  - Heavy-Duty Boots on the mon → zero hazard chip damage → no
  //    penalty even on 4× weak Pokémon (the user's explicit fix:
  //    "Dracaufeu sans Bottes ≠ Dracaufeu avec Bottes").
  //  - Otherwise the base penalty fires, lightened by ≈½ when the
  //    team carries a hazard remover (Defog / Rapid Spin / Tidy Up
  //    can clear the rocks before the dangerous switch-in).
  for (let i = 0; i < team.length; i++) {
    const p = team[i]!;
    const eff = calculateTypeEffectiveness("rock", p.types);
    if (eff < 2) continue;
    const weight = eff >= 4 ? 1 : 0.5;
    const wearsBoots = isBoots(selectedItems[i]);
    if (wearsBoots) {
      // Boots negate Stealth Rock pressure on this mon — credit it
      // so the user sees their item choice paid off.
      addFactor(
        axis,
        Math.round(2 * weight),
        `${p.name} ${eff >= 4 ? "×4" : "×2"} Roche couvert par Bottes`,
      );
      continue;
    }
    const noRemoval = !hasRemover;
    let penalty = 12 * weight;
    if (noRemoval) penalty *= 1.6;
    penalty = Math.round(penalty);
    if (penalty > 0) {
      addFactor(
        axis,
        -penalty,
        `${p.name} ${eff >= 4 ? "×4" : "×2"} Roche${noRemoval ? " sans removal/Bottes" : " sans Bottes"}`,
      );
    }
  }

  return axis;
}

function scoreUtility(
  profiles: RoleProfile[],
  movePools: { pool: Set<string>; setAware: boolean }[],
): AxisScore {
  const axis = newAxis(40);
  // Split confirmed vs potential the same way `scoreHazard` does —
  // a role profile that exists only because of learnset access (no
  // declared moves) gets a much smaller bonus than one tied to an
  // actual set. Without this the score reads as 90+ on a brand-new
  // team where no move has been picked.
  const confirmed = (role: PokemonRole) =>
    profiles.filter((rp, i) => movePools[i]?.setAware && rp.active.includes(role)).length;
  const potential = (role: PokemonRole) =>
    profiles.filter((rp, i) => !movePools[i]?.setAware && rp.active.includes(role)).length;

  const pivotsConfirmed = confirmed("pivot");
  const pivotsPotential = potential("pivot");
  if (pivotsConfirmed >= 2) addFactor(axis, 20, `${pivotsConfirmed} pivots confirmés`);
  else if (pivotsConfirmed === 1) addFactor(axis, 14, "Pivot confirmé");
  else if (pivotsPotential >= 1) addFactor(axis, 3, `Pivot potentiel (×${pivotsPotential})`);
  else addFactor(axis, -12, "Aucun pivot");

  const supportConfirmed = confirmed("support");
  const supportPotential = potential("support");
  if (supportConfirmed >= 1) addFactor(axis, 12, "Support confirmé");
  else if (supportPotential >= 1) addFactor(axis, 2, "Support potentiel");

  const revengeConfirmed = confirmed("revenge-killer");
  const revengePotential = potential("revenge-killer");
  if (revengeConfirmed >= 1) addFactor(axis, 12, "Revenge killer confirmé");
  else if (revengePotential >= 1) addFactor(axis, 2, "Revenge killer potentiel");

  const leadConfirmed = confirmed("lead");
  if (leadConfirmed >= 1) addFactor(axis, 6, "Lead confirmé");

  return axis;
}

function scoreSynergy(
  team: Pokemon[],
  weak: Partial<Record<PokemonTypeId, number>>,
  immune: Partial<Record<PokemonTypeId, number>>,
  coveredCount: number,
): AxisScore {
  const axis = newAxis(50);

  // Heavy shared-weakness penalty without offsets.
  for (const t of ALL_TYPES) {
    const w = weak[t] ?? 0;
    const imm = immune[t] ?? 0;
    if (w >= 4) {
      addFactor(axis, -16, `${w} membres faibles ${t}`);
    } else if (w === 3 && imm === 0) {
      addFactor(axis, -8, `${w} membres faibles ${t}, aucune immunité`);
    } else if (w >= 2 && imm === 0 && w * 2 >= team.length) {
      addFactor(axis, -4, `${w} membres faibles ${t}, aucune immunité`);
    }
  }

  // Primary-type variety.
  const primaryTypes = new Set(team.map((p) => p.types[0]));
  addFactor(
    axis,
    Math.min(15, primaryTypes.size * 3),
    `Variété de types (${primaryTypes.size})`,
  );

  // Duplicate exact type pairs (two pure Fire / Fire-Flying).
  const typeKeys = team.map((p) => p.types.slice().sort().join("/"));
  const duplicates = typeKeys.length - new Set(typeKeys).size;
  if (duplicates > 0) {
    addFactor(axis, -duplicates * 5, `${duplicates} type(s) redondant(s)`);
  }

  // Defensive variety bonus.
  if (coveredCount >= 16) addFactor(axis, 10, "Couverture défensive large");
  else if (coveredCount >= 14) addFactor(axis, 5, "Couverture défensive correcte");

  return axis;
}

function scoreReliability(
  team: Pokemon[],
  profiles: RoleProfile[],
  movePools: { pool: Set<string>; setAware: boolean }[],
): AxisScore {
  const axis = newAxis(50);

  // Win conditions — same confirmed-vs-potential split as the
  // hazard/utility axes. A sweeper inferred from learnset alone is
  // "could win if it gets the right set", not a real win condition,
  // so it gets a much smaller credit.
  const winRoles: PokemonRole[] = [
    "physical-sweeper",
    "special-sweeper",
    "wallbreaker",
  ];
  const winConsConfirmed = profiles.filter(
    (rp, i) =>
      movePools[i]?.setAware && rp.active.some((r) => winRoles.includes(r)),
  ).length;
  const winConsPotential = profiles.filter(
    (rp, i) =>
      !movePools[i]?.setAware && rp.active.some((r) => winRoles.includes(r)),
  ).length;
  if (winConsConfirmed >= 3) addFactor(axis, 22, `${winConsConfirmed} win conditions confirmées`);
  else if (winConsConfirmed === 2) addFactor(axis, 16, `${winConsConfirmed} win conditions confirmées`);
  else if (winConsConfirmed === 1) addFactor(axis, 10, "1 win condition confirmée");
  else if (winConsPotential >= 2) addFactor(axis, 4, `${winConsPotential} win conditions potentielles`);
  else if (winConsPotential === 1) addFactor(axis, 2, "1 win condition potentielle");
  else addFactor(axis, -15, "Aucune win condition fiable");

  // Pivot/momentum keeper — confirmed only. A pivot that lives in
  // the learnset alone doesn't keep momentum until the user actually
  // declares Demi-Tour / Change Éclair / Téléport.
  const hasPivot = profiles.some(
    (rp, i) => movePools[i]?.setAware && rp.active.includes("pivot"),
  );
  if (hasPivot) addFactor(axis, 8, "Pivot pour le momentum");

  // Setter + spinblocker synergy is structural reliability — only
  // credit when the setter is confirmed (declared hazard move), not
  // learnset-only.
  const hasSetter = movePools.some(
    ({ pool, setAware }) => setAware && knowsAny(pool, HAZARD_MOVES),
  );
  const hasSpinblocker = team.some((p) => p.types.includes("ghost"));
  if (hasSetter && hasSpinblocker) addFactor(axis, 8, "Setter + spinblocker");

  // Over-reliance: one mon carries ≥3 active roles, and at least 2 of
  // them aren't filled by anyone else. Losing it would tear holes in
  // the team's coverage.
  let weakestLink = false;
  for (let i = 0; i < team.length; i++) {
    const mine = profiles[i]!.active;
    if (mine.length < 3) continue;
    const othersUnion = new Set<PokemonRole>();
    for (let j = 0; j < team.length; j++) {
      if (j === i) continue;
      for (const r of profiles[j]!.active) othersUnion.add(r);
    }
    const exclusive = mine.filter((r) => !othersUnion.has(r));
    if (exclusive.length >= 2) {
      weakestLink = true;
      break;
    }
  }
  if (weakestLink) addFactor(axis, -10, "Sur-dépendance à un seul Pokémon");

  // Role redundancy floor — only penalise when ≥4 mons all play the
  // same active role (rare but a real over-centralisation signal).
  const roleCount: Partial<Record<PokemonRole, number>> = {};
  for (const rp of profiles) {
    for (const r of rp.active) {
      roleCount[r] = (roleCount[r] ?? 0) + 1;
    }
  }
  for (const [r, n] of Object.entries(roleCount) as [PokemonRole, number][]) {
    if (n >= 5) {
      addFactor(axis, -6, `${n}× ${r} (redondant)`);
    }
  }

  return axis;
}

// ─── Threat engine ────────────────────────────────────────────────────
//
// V1 of a "what does this team struggle / dominate against?" module.
// Each rule looks at the team's structure and emits a `ThreatNote`
// when its trigger fires. UI groups them by `level` (warn / good).

function buildThreatNotes(
  team: Pokemon[],
  weak: Partial<Record<PokemonTypeId, number>>,
  resist: Partial<Record<PokemonTypeId, number>>,
  immune: Partial<Record<PokemonTypeId, number>>,
  profiles: RoleProfile[],
  movePools: { pool: Set<string>; setAware: boolean }[],
  hazardAxisValue: number,
): ThreatNote[] {
  const notes: ThreatNote[] = [];

  // Vulnerabilities by type.
  const TYPE_LABELS: Partial<Record<PokemonTypeId, string>> = {
    ice: "Glace offensive",
    rock: "Roche / Stealth Rock",
    fairy: "Fée offensive",
    ground: "Sol offensif",
    fighting: "Combat offensif",
    fire: "Feu offensif",
    electric: "Électrik offensif",
    ghost: "Spectre offensif",
  };
  // Shared-weakness threats — list the actual members so the user
  // sees the structural problem (which 3 mons share Ice weakness).
  for (const t of Object.keys(TYPE_LABELS) as PokemonTypeId[]) {
    const w = weak[t] ?? 0;
    const imm = immune[t] ?? 0;
    const weakMembers = team
      .filter((p) => calculateTypeEffectiveness(t, p.types) >= 2)
      .map((p) => p.name);
    if (w >= 4) {
      notes.push({
        level: "warn",
        label: `Très vulnérable au ${TYPE_LABELS[t]}`,
        severity: "high",
        reasons: [
          `${w} membres faibles — ${weakMembers.slice(0, 4).join(", ")}`,
          imm > 0 ? `${imm} immunité partielle` : "Aucune immunité",
        ],
      });
    } else if (w >= 3 && imm === 0) {
      notes.push({
        level: "warn",
        label: `Vulnérable au ${TYPE_LABELS[t]}`,
        severity: "medium",
        reasons: [
          `${w} membres faibles — ${weakMembers.slice(0, 4).join(", ")}`,
          "Aucune immunité dans l'équipe",
        ],
      });
    }
  }

  // Hazard pressure — explain *why* the axis is low (no setter? no
  // remover? heavy-rocks dependency?).
  if (hazardAxisValue < 45) {
    const hasSetter = movePools.some(
      ({ pool, setAware }) =>
        setAware && knowsAny(pool, ["stealthrock", "spikes", "toxicspikes", "stickyweb"]),
    );
    const hasRemover = movePools.some(
      ({ pool, setAware }) =>
        setAware && knowsAny(pool, ["rapidspin", "defog", "tidyup", "courtchange"]),
    );
    const reasons: string[] = [];
    if (!hasSetter) reasons.push("Pas de poseur confirmé");
    if (!hasRemover) reasons.push("Pas de removal confirmé");
    const rockWeak = team.filter(
      (p) => calculateTypeEffectiveness("rock", p.types) >= 2,
    );
    if (rockWeak.length > 0) {
      reasons.push(
        `${rockWeak.length} membre${rockWeak.length > 1 ? "s" : ""} faible${rockWeak.length > 1 ? "s" : ""} Roche — ${rockWeak.map((p) => p.name).slice(0, 3).join(", ")}`,
      );
    }
    notes.push({
      level: "warn",
      label: "Forte pression hazard",
      severity: hasRemover ? "medium" : "high",
      reasons,
    });
  } else if (hazardAxisValue >= 80) {
    notes.push({ level: "good", label: "Jeu hazard solide" });
  }

  // Setup sweeper vulnerability — surface the missing answer
  // explicitly (no Haze, no Inconscient, no phazing).
  const hasUnaware = team.some(
    (p) =>
      p.abilities.includes("Unaware") || p.hiddenAbility === "Unaware",
  );
  const hasHaze = movePools.some(({ pool }) =>
    knowsAny(pool, ["haze", "clearsmog"]),
  );
  const hasPhaze = movePools.some(({ pool }) =>
    knowsAny(pool, ["roar", "whirlwind", "dragontail", "circlethrow"]),
  );
  if (!hasUnaware && !hasHaze && !hasPhaze) {
    notes.push({
      level: "warn",
      label: "Sensible aux setup sweepers",
      severity: "medium",
      reasons: [
        "Aucun vrai outil anti-setup confirmé",
        "Chercher : Inconscient, Brume/Buée Noire, phazing ou Encore",
      ],
    });
  }

  // Priority / speed.
  const fastCount = team.filter((p) => p.baseStats.speed >= 100).length;
  if (fastCount === 0) {
    const priorityMons = team
      .filter((p, i) => knowsAny(movePools[i]!.pool, PRIORITY_MOVES))
      .map((p) => p.name);
    const reasons: string[] = [
      `Vitesse max ${Math.max(...team.map((p) => p.baseStats.speed))}`,
    ];
    if (priorityMons.length === 0) {
      reasons.push("Aucune attaque de priorité pour compenser");
    } else {
      reasons.push(`Priorité disponible sur ${priorityMons.join(", ")}`);
    }
    notes.push({
      level: "warn",
      label: "Lent — souffre face aux teams rapides",
      severity: priorityMons.length > 0 ? "medium" : "high",
      reasons,
    });
  }
  const priorityCount = movePools.filter(({ pool }) =>
    knowsAny(pool, PRIORITY_MOVES),
  ).length;
  if (priorityCount >= 3) {
    notes.push({ level: "good", label: "Excellente pression en priorité" });
  }

  // Defensive immunities that read as strengths.
  if ((immune.ground ?? 0) >= 2) {
    notes.push({ level: "good", label: "Double immunité Sol — solide vs EQ" });
  }
  if ((immune.ghost ?? 0) >= 1 && team.some((p) => p.types.includes("dark"))) {
    notes.push({ level: "good", label: "Couverture anti-Spectre via Ténèbres" });
  }
  if ((immune.electric ?? 0) >= 1 && team.some((p) => p.types.includes("ground"))) {
    notes.push({ level: "good", label: "Couverture anti-Électrik via Sol" });
  }

  // Late-game cleaning capability — high-priority wallbreakers /
  // sweepers indicate late-game pressure.
  const cleaners = profiles.filter((rp) =>
    rp.primary.some((r) => ["wallbreaker", "physical-sweeper", "special-sweeper"].includes(r)),
  ).length;
  if (cleaners >= 2) {
    notes.push({ level: "good", label: "Late-game pressure forte" });
  }

  // Centralisation — does a single Pokémon carry the hazard game
  // (setter + remover on the same slot)? Already chips the hazard
  // axis but worth surfacing as a named threat with the mon's name.
  for (let i = 0; i < team.length; i++) {
    const mp = movePools[i]!;
    if (!mp.setAware) continue;
    const isSetter = knowsAny(mp.pool, [
      "stealthrock",
      "spikes",
      "toxicspikes",
      "stickyweb",
    ]);
    const isRemover = knowsAny(mp.pool, [
      "rapidspin",
      "defog",
      "tidyup",
      "courtchange",
    ]);
    if (isSetter && isRemover) {
      notes.push({
        level: "warn",
        label: `Dépendance à ${team[i]!.name} pour hazards/removal`,
        severity: "medium",
        reasons: [
          "Pose et retire les pièges seul",
          "Une élimination/Taunt sur lui casse le jeu hazard",
        ],
      });
      break; // one centralisation note is enough
    }
  }

  // Cleric / status absorber gap — surface when no team member can
  // wake up sleep or remove status (Aromathérapie / Glas de Soin /
  // Cloche Soin) and at least one mon is sleep/poison-bait.
  const hasCleric = movePools.some(({ pool, setAware }) =>
    setAware && knowsAny(pool, ["healbell", "aromatherapy"]),
  );
  const hasNaturalCure = team.some(
    (p) =>
      p.abilities.includes("Natural Cure") || p.hiddenAbility === "Natural Cure",
  );
  const statusBait =
    team.filter((p) => p.baseStats.speed < 90).length >= 3;
  if (!hasCleric && !hasNaturalCure && statusBait) {
    notes.push({
      level: "warn",
      label: "Pas de support anti-statut",
      severity: "low",
      reasons: [
        "Aucun Cloche Soin / Aromathérapie confirmé",
        "Aucun Médic Nature dans l'équipe",
      ],
    });
  }

  return notes;
}

// ─── Headline scoring ────────────────────────────────────────────────

export function computeBreakdown(
  team: Pokemon[],
  slots?: TeamSlot[],
): TeamScoreBreakdown {
  const emptyAxis = (): AxisScore => ({ value: 0, factors: [] });
  if (team.length === 0) {
    return {
      offense: emptyAxis(),
      defense: emptyAxis(),
      speed: emptyAxis(),
      hazard: emptyAxis(),
      utility: emptyAxis(),
      synergy: emptyAxis(),
      reliability: emptyAxis(),
    };
  }

  const selectedMoves = teamSelectedMoves(slots);
  const selectedAbilities = teamSelectedAbilities(slots);
  const selectedItems = teamSelectedItems(slots);
  const movePools = teamMovePools(team, selectedMoves);
  const profiles = team.map((p, i) =>
    getRoleProfile(p, selectedMoves[i], selectedAbilities[i]),
  );
  const { weak, resist, immune } = analyzeTeamWeaknesses(team);
  const { covered } = analyzeTeamCoverage(team);
  // Target size = the slot-grid length (the builder supports 3–6
  // formats). A full 3-mon team on a 3-slot grid is *complete* — no
  // "Équipe incomplète" malus. Slot-less callers keep the legacy
  // 6-mon assumption; the max() guard protects against a slots array
  // shorter than the resolved team (shouldn't happen, but a factor
  // > 1 would silently inflate every axis).
  const targetSize = Math.max(team.length, slots?.length ?? 6);
  const teamFactor = team.length / targetSize;

  const offense = scoreOffense(team, profiles, movePools, covered);
  const defense = scoreDefense(team, profiles, weak, resist, immune);
  const reliability = scoreReliability(team, profiles, movePools);
  // Negative-ability penalty — applied per-mon across the axes the
  // ability actually breaks. Truant (Monaflèmit) kills offense and
  // reliability; Slow Start (Castello) hurts the same; Defeatist
  // (Maeglin) caps offense once HP drops. We attribute the penalty
  // to the most-relevant axes rather than blanket-deducting from
  // the headline so the breakdown still reads as informative.
  for (let i = 0; i < team.length; i++) {
    const meta = negativeAbilityPenalty(team[i]!, selectedAbilities[i]);
    if (!meta) continue;
    const halfA = Math.round(meta.penalty * 0.6);
    const halfB = Math.round(meta.penalty * 0.4);
    addFactor(offense, -halfA, `${team[i]!.name} : ${meta.label}`);
    addFactor(reliability, -halfB, `${team[i]!.name} : ${meta.label}`);
  }

  return {
    offense: finaliseAxis(offense, teamFactor),
    defense: finaliseAxis(defense, teamFactor),
    speed: finaliseAxis(scoreSpeed(team, movePools), teamFactor),
    hazard: finaliseAxis(
      scoreHazard(team, movePools, selectedItems),
      teamFactor,
    ),
    utility: finaliseAxis(scoreUtility(profiles, movePools), teamFactor),
    synergy: finaliseAxis(
      scoreSynergy(team, weak, immune, covered.length),
      teamFactor,
    ),
    reliability: finaliseAxis(reliability, teamFactor),
  };
}

export function scoreTeam(team: Pokemon[], slots?: TeamSlot[]): number {
  if (team.length === 0) return 0;
  const b = computeBreakdown(team, slots);
  const blended =
    b.offense.value * BREAKDOWN_WEIGHTS.offense +
    b.defense.value * BREAKDOWN_WEIGHTS.defense +
    b.speed.value * BREAKDOWN_WEIGHTS.speed +
    b.hazard.value * BREAKDOWN_WEIGHTS.hazard +
    b.utility.value * BREAKDOWN_WEIGHTS.utility +
    b.synergy.value * BREAKDOWN_WEIGHTS.synergy +
    b.reliability.value * BREAKDOWN_WEIGHTS.reliability;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

// ─── Replacement search ────────────────────────────────────────────────

/** Minimum adjusted gain for a swap to surface in the UI. Below this
 *  threshold the suggestion isn't worth the user's attention — better
 *  to show "Aucune amélioration évidente trouvée" than noise. */
const SUGGESTION_MIN_GAIN = 4;

/** Cap on critical-loss penalty above which the swap is rejected
 *  outright, even if the raw gain looks positive. Set so removing
 *  the team's only hazard setter / pivot / spinblocker → reject. */
const CRITICAL_LOSS_HARD_LIMIT = 20;

/**
 * Capabilities the slot's Pokémon provides that *no other slot* on
 * the team replicates. Returned as both the list of cap ids (for
 * negative factors in the UI) and the summed penalty (used to
 * downweight the swap).
 */
function uniqueContributions(
  baseTeam: Pokemon[],
  baseSlots: TeamSlot[] | undefined,
  slotMap: number[] | undefined,
  teamIndex: number,
): { caps: string[]; penalty: number } {
  const mySlot = projectSlot(baseTeam[teamIndex]!, baseSlots, slotMap, teamIndex);
  const myCaps = new Set(slotCapabilities(mySlot, baseTeam[teamIndex]!));
  if (myCaps.size === 0) return { caps: [], penalty: 0 };
  const otherCaps = new Set<string>();
  for (let i = 0; i < baseTeam.length; i++) {
    if (i === teamIndex) continue;
    const otherSlot = projectSlot(baseTeam[i]!, baseSlots, slotMap, i);
    for (const c of slotCapabilities(otherSlot, baseTeam[i]!)) otherCaps.add(c);
  }
  const unique = Array.from(myCaps).filter((c) => !otherCaps.has(c));
  let penalty = 0;
  for (const c of unique) penalty += CAP_NEED_BONUS[c] ?? 0;
  return { caps: unique, penalty };
}

/**
 * Get the user's actual slot for the i-th Pokémon in `team`. `team`
 * is the resolved-team array (filled slots only), and `slotMap`
 * maps team index → original slot index. Falls back to a synthetic
 * slot with the top Smogon set when no `baseSlots` provided so the
 * cap diff still has signal in fresh-search contexts.
 */
function projectSlot(
  p: Pokemon,
  baseSlots: TeamSlot[] | undefined,
  slotMap: number[] | undefined,
  teamIndex: number,
): TeamSlot {
  if (baseSlots && slotMap) {
    const idx = slotMap[teamIndex];
    if (idx !== undefined && baseSlots[idx]) return baseSlots[idx];
  }
  return { pokemonId: p.id, ...topSetPatchFor(p) };
}

export function findBestReplacements(
  team: Pokemon[],
  slotMap?: number[],
  limit: number = 5,
  baseSlots?: TeamSlot[],
): TeamReplacement[] {
  const teamIds = new Set(team.map((p) => p.id));

  // Project bare / partially-declared slots through their top Smogon
  // set so the baseline sees the same level of "confirmed roles" the
  // candidate is evaluated with. Without this, a user who hasn't
  // picked moves yet gets suggestions like Motisma → Ogerpon: the
  // candidate is scored *with* its top set (confirmed pivot/sweeper),
  // the baseline is scored without (potential only) → asymmetric
  // inflated gain.
  //
  // Projection fires on slots with **fewer than 3 declared moves**.
  // The user's explicit ability / item / partial moves always win
  // field-by-field via the `{ ...patch, ...s }` spread order — so a
  // user who picked Levitate manually keeps Levitate, etc. The 3-move
  // threshold mirrors `matchSlotToSmogonSet`'s set-recognition floor:
  // anything below is treated as "uncommitted" for scoring purposes.
  const projectedSlots: TeamSlot[] | undefined = baseSlots?.map((s) => {
    if (!s.pokemonId) return s;
    if (s.selectedMoves && s.selectedMoves.length >= 3) return s;
    const p = POKEMON_BY_ID[s.pokemonId];
    if (!p) return s;
    return { ...topSetPatchFor(p), ...s };
  });

  // Baseline uses the projected slots so confirmed-vs-potential
  // weighting matches what the candidate will be scored under.
  // Falls back to bare `scoreTeam` (no viability bonus) when no
  // slots passed — viability is now strictly an optimiser-only
  // metric, see comment on `optimizerScore`.
  const baseScore = projectedSlots
    ? scoreTeam(team, projectedSlots)
    : scoreTeam(team);
  const pool = OPTIMIZER_POOL.filter((p) => !teamIds.has(p.id));

  // Per-slot critical-loss tally — precomputed once because it
  // doesn't depend on the candidate, only on what the current slot
  // uniquely provides. Saves O(pool × slots) recomputes.
  const slotLosses: Array<{ caps: string[]; penalty: number }> = team.map(
    (_, i) => uniqueContributions(team, projectedSlots, slotMap, i),
  );

  type Eval = {
    cand: Pokemon;
    rawGain: number;
    adjustedGain: number;
    newScore: number;
    lostCaps: string[];
  };
  const slotEvals = new Map<number, Eval[]>();

  for (let i = 0; i < team.length; i++) {
    const evals: Eval[] = [];
    const loss = slotLosses[i]!;
    for (const cand of pool) {
      // Build candidate slot WITH its top Smogon set, keep other
      // slots as the user has them. This is the apples-to-apples
      // comparison the user wants: the candidate's *real* footprint
      // vs. what they're replacing.
      const candSlot: TeamSlot = {
        pokemonId: cand.id,
        ...topSetPatchFor(cand),
      };
      const candCaps = new Set(slotCapabilities(candSlot, cand));
      // How much of the lost caps does the candidate restore? Each
      // restored cap cancels its own penalty.
      let restored = 0;
      for (const c of loss.caps) {
        if (candCaps.has(c)) restored += CAP_NEED_BONUS[c] ?? 0;
      }
      const effectiveLoss = loss.penalty - restored;

      const test = team.slice();
      test[i] = cand;
      const testSlots = projectedSlots
        ? buildSwapSlots(projectedSlots, slotMap, i, candSlot)
        : undefined;
      // Score with the *same* structural function as the baseline —
      // no viability bonus. The viability differential is surfaced
      // as a factor in the suggestion row instead, so the headline
      // `+N` matches what the user-visible team score would shift to
      // if they applied the swap.
      const newScore = testSlots
        ? scoreTeam(test, testSlots)
        : scoreTeam(test);
      const rawGain = newScore - baseScore;
      const adjustedGain = rawGain - effectiveLoss;

      // Hard rejection: removing 20+ points of unique caps is a team
      // surgery, not an improvement. Skip regardless of raw gain.
      if (effectiveLoss >= CRITICAL_LOSS_HARD_LIMIT) continue;
      if (adjustedGain < SUGGESTION_MIN_GAIN) continue;

      const lostCaps = loss.caps.filter((c) => !candCaps.has(c));
      evals.push({
        cand,
        rawGain,
        adjustedGain,
        newScore,
        lostCaps,
      });
    }
    evals.sort((a, b) => b.adjustedGain - a.adjustedGain);
    if (evals.length > 0) slotEvals.set(i, evals);
  }

  // "Add to empty slot" branch — no replacement, no loss penalty.
  // Gate on the actual grid size (3–6) so a full 3-mon team doesn't
  // get "add a 4th" suggestions it has no slot for.
  const targetSize = baseSlots?.length ?? 6;
  if (team.length < targetSize) {
    const evals: Eval[] = [];
    for (const cand of pool) {
      const candSlot: TeamSlot = {
        pokemonId: cand.id,
        ...topSetPatchFor(cand),
      };
      const test = [...team, cand];
      // Fill the first empty slot instead of compacting the array —
      // the grid length doubles as the target team size for the
      // completeness scaling, so dropping empty slots here would
      // score the addition as if the team were suddenly "full".
      const testSlots = projectedSlots
        ? fillFirstEmpty(projectedSlots, candSlot)
        : undefined;
      const newScore = testSlots
        ? scoreTeam(test, testSlots)
        : scoreTeam(test);
      const rawGain = newScore - baseScore;
      if (rawGain < SUGGESTION_MIN_GAIN) continue;
      evals.push({
        cand,
        rawGain,
        adjustedGain: rawGain,
        newScore,
        lostCaps: [],
      });
    }
    evals.sort((a, b) => b.adjustedGain - a.adjustedGain);
    if (evals.length > 0) slotEvals.set(-1, evals);
  }

  const usedCandIds = new Set<string>();
  const usedSlots = new Set<number>();
  const result: TeamReplacement[] = [];

  while (result.length < limit) {
    let bestSlot = 0;
    let bestEval: Eval | null = null;

    for (const [slotIdx, evals] of slotEvals) {
      if (usedSlots.has(slotIdx)) continue;
      const first = evals.find((e) => !usedCandIds.has(e.cand.id));
      if (!first) continue;
      if (!bestEval || first.adjustedGain > bestEval.adjustedGain) {
        bestEval = first;
        bestSlot = slotIdx;
      }
    }

    if (!bestEval) break;
    const current = bestSlot >= 0 ? team[bestSlot] ?? null : null;
    const fromIndex =
      bestSlot === -1
        ? -1
        : slotMap
        ? slotMap[bestSlot] ?? bestSlot
        : bestSlot;
    const factors = explainCandidate(
      team,
      baseSlots,
      bestEval.cand,
      bestEval.lostCaps,
    );
    result.push({
      fromIndex,
      current,
      candidate: bestEval.cand,
      newScore: bestEval.newScore,
      // Surface the *adjusted* gain so the +N badge reflects the
      // critical-loss accounting, not the raw score delta.
      gain: Math.max(1, bestEval.adjustedGain),
      factors,
    });
    usedCandIds.add(bestEval.cand.id);
    if (bestSlot !== -1) usedSlots.add(bestSlot);
  }

  return result;
}

/** Slot array with the first empty position filled by `slot` — keeps
 *  the grid length intact (it doubles as the target team size). */
function fillFirstEmpty(baseSlots: TeamSlot[], slot: TeamSlot): TeamSlot[] {
  const idx = baseSlots.findIndex((s) => !s.pokemonId);
  if (idx === -1) return [...baseSlots, slot];
  const out = baseSlots.slice();
  out[idx] = slot;
  return out;
}

/** Build a slot array with one slot swapped to a new value. Used by
 *  the candidate evaluator to score the team WITH the user's actual
 *  config preserved on every other slot. */
function buildSwapSlots(
  baseSlots: TeamSlot[],
  slotMap: number[] | undefined,
  teamIndex: number,
  replacement: TeamSlot,
): TeamSlot[] {
  const out = baseSlots.slice();
  const targetIdx = slotMap ? slotMap[teamIndex] : teamIndex;
  if (targetIdx !== undefined) out[targetIdx] = replacement;
  return out;
}

// ─── Public analyse entrypoint ────────────────────────────────────────

export function analyzeTeam(
  team: Pokemon[],
  slots?: TeamSlot[],
): TeamAnalysis {
  const selectedMoves = teamSelectedMoves(slots);
  const selectedAbilities = teamSelectedAbilities(slots);
  const movePools = teamMovePools(team, selectedMoves);
  const { weak, resist, immune } = analyzeTeamWeaknesses(team);
  const { covered, missing } = analyzeTeamCoverage(team);
  const profiles = team.map((p, i) =>
    getRoleProfile(p, selectedMoves[i], selectedAbilities[i]),
  );
  const { covered: presentRoles, missing: missingRoles } = teamMissingRoles(
    team,
    selectedMoves,
    selectedAbilities,
  );
  const slotMap = slots
    ? slots.flatMap((s, i) => (s.pokemonId ? [i] : []))
    : undefined;
  const breakdown = computeBreakdown(team, slots);
  const threats = buildThreatNotes(
    team,
    weak,
    resist,
    immune,
    profiles,
    movePools,
    breakdown.hazard.value,
  );

  return {
    members: team,
    sharedWeaknesses: weak,
    resistanceCoverage: resist,
    immunityCoverage: immune,
    offensiveCoverage: covered,
    missingOffensiveTypes: missing,
    presentRoles,
    missingRoles,
    roleProfiles: profiles,
    score: scoreTeam(team, slots),
    breakdown,
    threats,
    replacements: findBestReplacements(team, slotMap, 5, slots),
  };
}

export { getResistances, getWeaknesses };

// ─── Team snapshot stats (unchanged) ──────────────────────────────────

export interface TeamStats {
  count: number;
  avgBst: number;
  hpPool: number;
  fastestSpeed: number;
  slowestSpeed: number;
  physical: number;
  specialAttackers: number;
  mixed: number;
}

export function getTeamStats(team: Pokemon[]): TeamStats {
  if (team.length === 0) {
    return {
      count: 0,
      avgBst: 0,
      hpPool: 0,
      fastestSpeed: 0,
      slowestSpeed: 0,
      physical: 0,
      specialAttackers: 0,
      mixed: 0,
    };
  }
  const bsts = team.map((p) => {
    const s = p.baseStats;
    return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed;
  });
  let physical = 0;
  let specialAttackers = 0;
  let mixed = 0;
  for (const p of team) {
    const diff = p.baseStats.attack - p.baseStats.spAtk;
    if (Math.abs(diff) <= 10) mixed++;
    else if (diff > 0) physical++;
    else specialAttackers++;
  }
  return {
    count: team.length,
    avgBst: Math.round(bsts.reduce((a, b) => a + b, 0) / team.length),
    hpPool: team.reduce((acc, p) => acc + p.baseStats.hp, 0),
    fastestSpeed: Math.max(...team.map((p) => p.baseStats.speed)),
    slowestSpeed: Math.min(...team.map((p) => p.baseStats.speed)),
    physical,
    specialAttackers,
    mixed,
  };
}

// ─── Optimiser pool (used by replacements + Équipe optimale) ──────────

// Optimiser pool — fully-evolved mons above the BST floor. Now also
// filters out species whose *only* available ability is heavily
// negative (Monaflèmit / Truant, Régigigas / Slow Start, Maeglin /
// Defeatist…). The user explicitly called this out: "Monaflèmit a un
// gros BST mais Absentéisme est extrêmement pénalisant". Without
// the filter the optimiser kept picking these for their stat lines.
//
// Smogon presence is *not* a hard filter — we keep the pool wide so
// niche Cobblemon-only legendaries can still surface — but the
// viability bonus below tilts selection sharply toward Smogon-known
// mons with curated sets.
const OPTIMIZER_POOL: Pokemon[] = POKEMON.filter(
  (p) =>
    p.evolutions.length === 0 &&
    bstOf(p) >= 450 &&
    !speciesForcedNegativeAbility(p),
);

// ─── Set-aware candidate scoring caches ───────────────────────────────
//
// `optimizeTeam` runs ~22k score evaluations (50 restarts × 3 passes ×
// 6 slots × 25 candidates). Building the Smogon slot patch + computing
// the viability bonus inline at every evaluation would dominate the
// runtime; the two maps below are lazily populated on first lookup so
// each Pokémon's patch + bonus are computed at most once per session.

const SLOT_PATCH_CACHE = new Map<string, Partial<TeamSlot>>();
const VIABILITY_CACHE = new Map<string, number>();

/**
 * Cached Smogon-top-set patch for a Pokémon — same shape callers get
 * from `smogonSetToSlotPatch(set, pokemon, stats)`. Returns an empty
 * patch (no fields set) when the species has no Smogon sets.
 */
function topSetPatchFor(p: Pokemon): Partial<TeamSlot> {
  const hit = SLOT_PATCH_CACHE.get(p.id);
  if (hit !== undefined) return hit;
  const stats = getSmogonStats(p.id);
  const set = stats?.sets[0];
  const patch = set ? smogonSetToSlotPatch(set, p, stats) : {};
  SLOT_PATCH_CACHE.set(p.id, patch);
  return patch;
}

/**
 * Smogon viability bonus — split into three additive terms so the
 * optimiser strongly prefers competitively-known mons over BST kings
 * with no meta footprint (the user's core complaint about Monaflèmit
 * / paradox legendaries surfacing in "Équipe optimale"):
 *
 *  - **has-viable-set** : +10 when the dex has ≥1 curated Smogon set.
 *    Crosses the "this mon actually has a meta identity" threshold.
 *  - **usage**          : +0 to +15 scaled on overall usage % (×100,
 *    capped at 15 to avoid making OU staples auto-pick).
 *  - **multi-set**      : +0 to +6 based on `sets.length` so mons
 *    with three viable archetypes (e.g. Dracolosse's bulky DD /
 *    Choice Band / mixed offense) beat one-trick mons of similar
 *    usage.
 *  - **no-data penalty** : −12 when the dex carries no Smogon data
 *    at all.
 *
 * Total range per mon: roughly [-12, +31]. Per 6-mon team this can
 * swing the optimiser score by ~180 points — large enough to make
 * meta presence the dominant factor, small enough that a structurally
 * great non-meta team can still win.
 */
function viabilityBonusFor(p: Pokemon): number {
  const hit = VIABILITY_CACHE.get(p.id);
  if (hit !== undefined) return hit;
  const stats = getSmogonStats(p.id);
  let bonus = 0;
  if (!stats) {
    bonus = -12;
  } else {
    if (stats.sets.length > 0) bonus += 10;
    bonus += Math.min(15, Math.round(stats.usage * 100));
    // Multiple-sets bonus — 2 sets → +3, 3+ sets → +6.
    if (stats.sets.length >= 3) bonus += 6;
    else if (stats.sets.length === 2) bonus += 3;
  }
  VIABILITY_CACHE.set(p.id, bonus);
  return bonus;
}

/**
 * Compose `team` (an array of Pokémon picked by the optimiser) into a
 * 6-slot list with each member's top Smogon set already applied. The
 * scorer then reads the declared moves + ability + EVs and credits
 * confirmed roles in full — the user's complaint was that the
 * optimiser previously evaluated each candidate as a *bare* species,
 * which over-weighted BST and under-weighted "does this mon have a
 * real competitive identity".
 */
function teamSlotsWithTopSets(team: Pokemon[]): TeamSlot[] {
  return team.map((p) => ({
    pokemonId: p.id,
    ...topSetPatchFor(p),
  }));
}

/**
 * Optimiser-side team score: structural breakdown WITH each member's
 * top Smogon set applied, plus the per-mon viability sum. Used as the
 * fitness function in `optimizeTeam`'s hill-climber.
 */
function optimizerScore(team: Pokemon[]): number {
  if (team.length === 0) return 0;
  const slots = teamSlotsWithTopSets(team);
  const base = scoreTeam(team, slots);
  let viability = 0;
  for (const p of team) viability += viabilityBonusFor(p);
  return base + viability;
}

// ─── Per-candidate explanation (used by suggestions / replacements) ───
//
// `findBestReplacements` exposes the ranked swap list with per-row
// gains. The UI also needs short reasons ("set Smogon viable",
// "comble le besoin removal", "pas de set Smogon") so the user
// understands *why* a swap is suggested — not just a magic +12.

export interface CandidateFactor {
  /** Sign of the factor — positive (good) or negative (bad). The UI
   *  renders + in green and − in muted destructive. */
  sign: "+" | "−";
  label: string;
}

/**
 * Build a short factor list explaining why this candidate scored as
 * it did against the base team. Factors mirror what the optimiser
 * actually weighs (viability bonus + Smogon set presence + critical
 * need + role overlap). The list is capped at 4 entries — UI shows
 * a one-line reason summary, not a debug log.
 */
function explainCandidate(
  team: Pokemon[],
  baseSlots: TeamSlot[] | undefined,
  candidate: Pokemon,
  lostCaps: string[] = [],
): CandidateFactor[] {
  const factors: CandidateFactor[] = [];

  // Critical losses come FIRST — the user explicitly asked for the
  // negative reasons to be visible alongside the positive ones, and
  // putting the warnings up top keeps the UI honest about trade-offs.
  for (const c of lostCaps.slice(0, 2)) {
    const label = CAP_LABEL_FR[c] ?? c;
    factors.push({ sign: "−", label: `perd ${label}` });
  }

  const stats = getSmogonStats(candidate.id);
  if (stats) {
    if (stats.sets.length >= 3) {
      factors.push({ sign: "+", label: `${stats.sets.length} sets Smogon viables` });
    } else if (stats.sets.length >= 1) {
      factors.push({ sign: "+", label: "set Smogon viable" });
    }
    const usagePct = Math.round(stats.usage * 100);
    if (usagePct >= 8 && factors.length < 4) {
      factors.push({ sign: "+", label: `meta ${stats.tier} (${usagePct}%)` });
    }
  } else {
    factors.push({ sign: "−", label: "hors meta Smogon" });
  }

  // Negative-ability surface — explicit when a single-talent species
  // is forced onto a handicapping ability.
  const neg = speciesForcedNegativeAbility(candidate);
  if (neg && factors.length < 4) {
    factors.push({ sign: "−", label: neg.label });
  }

  // Critical-need bonus — does the candidate confirm a role the team
  // is missing? Walks the current team's slot-aware confirmed roles
  // and checks the candidate's top Smogon set against the gap list.
  if (factors.length < 4) {
    const teamConfirmed = new Set<PokemonRole>();
    if (baseSlots) {
      for (const s of baseSlots) {
        const ok = confirmedRolesFrom(s.selectedMoves);
        for (const r of ok) teamConfirmed.add(r);
      }
    }
    const candPatch = topSetPatchFor(candidate);
    const candConfirmed = confirmedRolesFrom(candPatch.selectedMoves);
    const CRITICAL: { role: PokemonRole; label: string }[] = [
      { role: "hazard-setter", label: "apporte hazards" },
      { role: "pivot", label: "apporte pivot" },
      { role: "support", label: "apporte support" },
      { role: "special-wall", label: "apporte mur spé" },
      { role: "physical-wall", label: "apporte mur phys" },
    ];
    for (const { role, label } of CRITICAL) {
      if (candConfirmed.includes(role) && !teamConfirmed.has(role)) {
        factors.push({ sign: "+", label });
        if (factors.length >= 4) break;
      }
    }
  }

  // Type-coverage gap — does the candidate hit a defensive type the
  // team had no resistance for? Cheap heuristic: at least one of
  // candidate.types lands on `missing` from `analyzeTeamCoverage`.
  if (factors.length < 4) {
    const { missing } = analyzeTeamCoverage(team);
    const newCoverage = candidate.types.filter((t) =>
      missing.some((m) => calculateTypeEffectiveness(t, [m]) >= 2),
    );
    if (newCoverage.length > 0) {
      factors.push({ sign: "+", label: `couvre ${newCoverage.join("/")} ` });
    }
  }

  return factors.slice(0, 4);
}

/** Tiny wrapper around `confirmedRoles` from team-roles.ts that
 *  tolerates `undefined` input — used in two places above. */
function confirmedRolesFrom(moves: string[] | undefined): PokemonRole[] {
  return confirmedRolesImpl(moves);
}

function bstOf(p: Pokemon): number {
  const s = p.baseStats;
  return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed;
}

/**
 * Hill-climbing team generator. Returns a `size`-slot list (3–6 in
 * the builder) with each Pokémon's top Smogon set **already applied**
 * (talent, item, moves, nature, EVs, IVs) so the caller can spread it
 * directly into the builder without a separate "Optimiser sets" pass.
 *
 * Scoring uses `optimizerScore` which:
 *  1. Composes a set-aware analysis (each member's top Smogon set
 *     applied) so roles count as *confirmed*, not potential — the
 *     hill-climb selects on the same axes the user sees in the
 *     headline breakdown.
 *  2. Adds the Smogon viability bonus per member, sharply preferring
 *     mons with curated sets and meaningful usage.
 */
export function optimizeTeam(
  size: number = 6,
  restarts: number = 50,
  shortlistSize: number = 25,
): TeamSlot[] {
  const pool = OPTIMIZER_POOL;
  let bestTeam: Pokemon[] = [];
  let bestScore = -1;
  const earlyExitThreshold = 100;

  for (let r = 0; r < restarts; r++) {
    let team = randomTeam(pool, size);
    let score = optimizerScore(team);

    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let slot = 0; slot < size; slot++) {
        const candidates = sampleDistinct(pool, shortlistSize, team);
        let bestSwapScore = score;
        let bestSwap: Pokemon | null = null;
        for (const cand of candidates) {
          const test = team.slice();
          test[slot] = cand;
          const s = optimizerScore(test);
          if (s > bestSwapScore) {
            bestSwapScore = s;
            bestSwap = cand;
          }
        }
        if (bestSwap) {
          team = team.slice();
          team[slot] = bestSwap;
          score = bestSwapScore;
          improved = true;
        }
      }
      if (!improved) break;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTeam = team;
      if (bestScore >= earlyExitThreshold) break;
    }
  }

  // Return with sets pre-applied — saves the caller a second pass
  // through `smogonSetToSlotPatch` and means "Équipe optimale" lands
  // a fully-configured team in one click.
  return teamSlotsWithTopSets(bestTeam);
}

function randomTeam(pool: Pokemon[], k: number): Pokemon[] {
  const picked: Pokemon[] = [];
  const used = new Set<string>();
  while (picked.length < k) {
    const cand = pool[Math.floor(Math.random() * pool.length)]!;
    if (used.has(cand.id)) continue;
    used.add(cand.id);
    picked.push(cand);
  }
  return picked;
}

function sampleDistinct(
  pool: Pokemon[],
  k: number,
  exclude: Pokemon[],
): Pokemon[] {
  const ban = new Set(exclude.map((p) => p.id));
  const picked: Pokemon[] = [];
  const used = new Set<string>();
  let safety = 0;
  while (picked.length < k && safety < k * 4) {
    safety++;
    const cand = pool[Math.floor(Math.random() * pool.length)]!;
    if (ban.has(cand.id) || used.has(cand.id)) continue;
    used.add(cand.id);
    picked.push(cand);
  }
  return picked;
}

export { isLegendary, isMythical, isParadox };
