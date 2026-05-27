import { POKEMON_BY_ID, POKEMON } from "@/data/pokemon";
import type { Pokemon, PokemonRole, PokemonTypeId, TeamSlot } from "@/types";
import {
  ALL_TYPES,
  calculateTypeEffectiveness,
  getResistances,
  getWeaknesses,
} from "@/lib/type-chart";

export interface TeamAnalysis {
  members: Pokemon[];
  /** type → number of team members weak to it (≥2×). */
  sharedWeaknesses: Partial<Record<PokemonTypeId, number>>;
  resistanceCoverage: Partial<Record<PokemonTypeId, number>>;
  immunityCoverage: Partial<Record<PokemonTypeId, number>>;
  /** Offensive types covered ≥2× by at least one teammate's STAB. */
  offensiveCoverage: PokemonTypeId[];
  missingOffensiveTypes: PokemonTypeId[];
  presentRoles: PokemonRole[];
  missingRoles: PokemonRole[];
  /** 0–100 balance score, see `scoreTeam`. */
  score: number;
  /** Up to 5 suggestions of Pokémon that would shore up the team. */
  suggestions: Pokemon[];
}

const CORE_ROLES: PokemonRole[] = [
  "physical-sweeper",
  "special-sweeper",
  "physical-wall",
  "special-wall",
  "support",
  "hazard-setter",
  "pivot",
  "revenge-killer",
];

export function resolveTeam(slots: TeamSlot[]): Pokemon[] {
  return slots
    .map((s) => (s.pokemonId ? POKEMON_BY_ID[s.pokemonId] : null))
    .filter((p): p is Pokemon => Boolean(p));
}

/**
 * Per-team weakness/resistance map. A team with 3 members weak to Fire
 * means `sharedWeaknesses.fire === 3` — a clear danger signal.
 */
export function analyzeTeamWeaknesses(team: Pokemon[]) {
  const weak: Partial<Record<PokemonTypeId, number>> = {};
  const resist: Partial<Record<PokemonTypeId, number>> = {};
  const immune: Partial<Record<PokemonTypeId, number>> = {};
  for (const p of team) {
    for (const t of ALL_TYPES) {
      const m = calculateTypeEffectiveness(t, p.types);
      if (m >= 2) weak[t] = (weak[t] ?? 0) + 1;
      else if (m > 0 && m < 1) resist[t] = (resist[t] ?? 0) + 1;
      else if (m === 0) immune[t] = (immune[t] ?? 0) + 1;
    }
  }
  return { weak, resist, immune };
}

/** Returns offensive STAB coverage and the still-missing offensive types. */
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

/**
 * 0–100 score. Components:
 *  - Penalty for any weakness shared by ≥3 members
 *  - Bonus for resistance/immunity coverage across all 18 types
 *  - Penalty for missing core roles
 *  - Bonus for diverse offensive coverage
 */
export function scoreTeam(team: Pokemon[]): number {
  if (team.length === 0) return 0;

  const { weak, resist, immune } = analyzeTeamWeaknesses(team);
  const { covered } = analyzeTeamCoverage(team);

  let score = 60;

  for (const t of ALL_TYPES) {
    const w = weak[t] ?? 0;
    if (w >= 3) score -= 8;
    else if (w === 2) score -= 3;

    const coversDefensively = (resist[t] ?? 0) + (immune[t] ?? 0);
    if (coversDefensively >= 1) score += 1;
  }

  const presentRoles = new Set<PokemonRole>(team.flatMap((p) => p.roles));
  const missingRolesCount = CORE_ROLES.filter((r) => !presentRoles.has(r)).length;
  score -= missingRolesCount * 2;

  score += Math.min(covered.length, 18);

  // Teams with empty slots are penalised proportionally.
  score *= team.length / 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Recommend Pokémon from the roster that:
 *  - resist or are immune to the team's top shared weakness, AND
 *  - bring at least one role currently missing from the team.
 */
export function recommendTeamChanges(team: Pokemon[]): Pokemon[] {
  if (team.length === 0) return POKEMON.slice(0, 5);

  const { weak } = analyzeTeamWeaknesses(team);
  const topWeakness = (Object.entries(weak) as [PokemonTypeId, number][])
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  const presentRoles = new Set<PokemonRole>(team.flatMap((p) => p.roles));
  const missingRoles = CORE_ROLES.filter((r) => !presentRoles.has(r));
  const teamIds = new Set(team.map((p) => p.id));

  return POKEMON
    .filter((p) => !teamIds.has(p.id))
    .map((p) => {
      let s = 0;
      if (topWeakness) {
        const m = calculateTypeEffectiveness(topWeakness, p.types);
        if (m === 0) s += 5;
        else if (m < 1) s += 3;
      }
      const fillsRole = p.roles.some((r) => missingRoles.includes(r));
      if (fillsRole) s += 3;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => x.p);
}

export function analyzeTeam(team: Pokemon[]): TeamAnalysis {
  const { weak, resist, immune } = analyzeTeamWeaknesses(team);
  const { covered, missing } = analyzeTeamCoverage(team);
  const presentRoles = Array.from(new Set(team.flatMap((p) => p.roles)));
  const missingRoles = CORE_ROLES.filter((r) => !presentRoles.includes(r));

  return {
    members: team,
    sharedWeaknesses: weak,
    resistanceCoverage: resist,
    immunityCoverage: immune,
    offensiveCoverage: covered,
    missingOffensiveTypes: missing,
    presentRoles,
    missingRoles,
    score: scoreTeam(team),
    suggestions: recommendTeamChanges(team),
  };
}

export { getResistances, getWeaknesses };

export interface TeamStats {
  count: number;
  avgBst: number;
  hpPool: number;
  fastestSpeed: number;
  slowestSpeed: number;
  /** Number of members with attack > spAtk. */
  physical: number;
  specialAttackers: number;
  mixed: number;
}

/**
 * Quick competitive snapshot: HP pool, speed range and offensive style.
 * Helps spot common pitfalls like "all-slow team" or "all-physical wall break".
 */
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
