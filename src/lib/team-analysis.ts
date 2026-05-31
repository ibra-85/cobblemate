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
  getRoleProfile,
  teamMissingRoles,
  type RoleProfile,
} from "@/lib/team-roles";
import { findItemById } from "@/data/competitive-items";

// ─── Types ────────────────────────────────────────────────────────────

export interface TeamReplacement {
  fromIndex: number;
  current: Pokemon | null;
  candidate: Pokemon;
  newScore: number;
  gain: number;
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
  covered: PokemonTypeId[],
): AxisScore {
  const axis = newAxis(40);
  // STAB coverage (capped, half weight vs V1 to reduce role-coverage
  // bias the user called out).
  const stabBonus = Math.min(covered.length, 18) * 1.5;
  addFactor(axis, stabBonus, `Couverture STAB ${covered.length}/18`);

  // Wallbreaker presence — at least one mon at primary level.
  const wallbreakers = profiles.filter((rp) =>
    rp.roles.some((r) => r.role === "wallbreaker" && r.level === "primary"),
  ).length;
  if (wallbreakers >= 1) {
    addFactor(axis, 12, `${wallbreakers} wallbreaker(s) confirmé(s)`);
  }

  // Sweeper presence (physical or special primary).
  const sweepers = profiles.filter((rp) =>
    rp.primary.some(
      (r) => r === "physical-sweeper" || r === "special-sweeper",
    ),
  ).length;
  if (sweepers >= 1) {
    addFactor(axis, 10, `${sweepers} sweeper(s) confirmé(s)`);
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

  const priorityCount = movePools.filter(({ pool }) =>
    knowsAny(pool, PRIORITY_MOVES),
  ).length;
  if (priorityCount >= 2) {
    addFactor(axis, 15, `${priorityCount} mons à priorité`);
  } else if (priorityCount === 1) {
    addFactor(axis, 10, "1 mon à priorité");
  }

  return axis;
}

function scoreHazard(
  team: Pokemon[],
  movePools: { pool: Set<string>; setAware: boolean }[],
  selectedItems: (string | undefined)[],
): AxisScore {
  const axis = newAxis(50);

  const hasSetter = movePools.some(({ pool }) => knowsAny(pool, HAZARD_MOVES));
  const hasRemover = movePools.some(({ pool }) =>
    knowsAny(pool, HAZARD_REMOVAL),
  );
  const hasSpinblocker = team.some((p) => p.types.includes("ghost"));

  if (hasSetter) addFactor(axis, 18, "Hazard setter présent");
  if (hasRemover) addFactor(axis, 18, "Hazard removal présent");
  else addFactor(axis, -10, "Pas de removal");
  if (hasSetter && hasSpinblocker) {
    addFactor(axis, 8, "Synergie setter + spinblocker");
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

function scoreUtility(profiles: RoleProfile[]): AxisScore {
  const axis = newAxis(40);
  // Accept secondary-level pivots / supporters / revenge killers —
  // these roles don't need full-primary commitment to function (a
  // Motisma carrying Change Éclair at secondary level still pivots).
  const pivotCount = profiles.filter((rp) =>
    rp.active.includes("pivot"),
  ).length;
  if (pivotCount >= 2) addFactor(axis, 20, `${pivotCount} pivots`);
  else if (pivotCount === 1) addFactor(axis, 14, "Pivot présent");
  else addFactor(axis, -12, "Pas de pivot");

  const supportCount = profiles.filter((rp) =>
    rp.active.includes("support"),
  ).length;
  if (supportCount >= 1) addFactor(axis, 12, "Support présent");

  const revengeCount = profiles.filter((rp) =>
    rp.active.includes("revenge-killer"),
  ).length;
  if (revengeCount >= 1) addFactor(axis, 12, "Revenge killer présent");

  const leadCount = profiles.filter((rp) => rp.active.includes("lead")).length;
  if (leadCount >= 1) addFactor(axis, 6, "Lead présent");

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

  // Win condition — sweeper / wallbreaker at active level (primary OR
  // secondary). A 60-confidence Dragonite is still a credible win
  // condition once it gets a Dragon Dance off; demanding primary
  // dropped legitimate setup sweepers from the count.
  const winCons = profiles.filter((rp) =>
    rp.active.some((r) =>
      ["physical-sweeper", "special-sweeper", "wallbreaker"].includes(r),
    ),
  ).length;
  if (winCons >= 3) addFactor(axis, 22, `${winCons} win conditions`);
  else if (winCons === 2) addFactor(axis, 16, `${winCons} win conditions`);
  else if (winCons === 1) addFactor(axis, 10, "1 win condition");
  else addFactor(axis, -15, "Aucune win condition fiable");

  // Pivot/momentum keeper.
  const hasPivot = profiles.some((rp) => rp.active.includes("pivot"));
  if (hasPivot) addFactor(axis, 8, "Pivot pour le momentum");

  // Setter + spinblocker synergy is structural reliability.
  const hasSetter = movePools.some(({ pool }) => knowsAny(pool, HAZARD_MOVES));
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
  for (const t of Object.keys(TYPE_LABELS) as PokemonTypeId[]) {
    const w = weak[t] ?? 0;
    const imm = immune[t] ?? 0;
    if (w >= 3 && imm === 0) {
      notes.push({ level: "warn", label: `Vulnérable au ${TYPE_LABELS[t]}` });
    } else if (w >= 4) {
      notes.push({ level: "warn", label: `Très vulnérable au ${TYPE_LABELS[t]}` });
    }
  }

  // Hazard pressure.
  if (hazardAxisValue < 45) {
    notes.push({
      level: "warn",
      label: "Forte pression hazard (pas de removal fiable)",
    });
  } else if (hazardAxisValue >= 80) {
    notes.push({ level: "good", label: "Jeu hazard solide" });
  }

  // Setup sweeper vulnerability.
  const hasUnaware = team.some(
    (p) =>
      p.abilities.includes("Unaware") || p.hiddenAbility === "Unaware",
  );
  const hasHaze = movePools.some(({ pool }) =>
    knowsAny(pool, ["haze", "clearsmog", "roar", "whirlwind", "encore"]),
  );
  if (!hasUnaware && !hasHaze) {
    notes.push({ level: "warn", label: "Sensible aux setup sweepers" });
  }

  // Priority / speed.
  const fastCount = team.filter((p) => p.baseStats.speed >= 100).length;
  if (fastCount === 0) {
    notes.push({ level: "warn", label: "Lent — souffre face aux teams rapides" });
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
  const teamFactor = team.length / 6;

  return {
    offense: finaliseAxis(scoreOffense(team, profiles, covered), teamFactor),
    defense: finaliseAxis(
      scoreDefense(team, profiles, weak, resist, immune),
      teamFactor,
    ),
    speed: finaliseAxis(scoreSpeed(team, movePools), teamFactor),
    hazard: finaliseAxis(
      scoreHazard(team, movePools, selectedItems),
      teamFactor,
    ),
    utility: finaliseAxis(scoreUtility(profiles), teamFactor),
    synergy: finaliseAxis(
      scoreSynergy(team, weak, immune, covered.length),
      teamFactor,
    ),
    reliability: finaliseAxis(
      scoreReliability(team, profiles, movePools),
      teamFactor,
    ),
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

export function findBestReplacements(
  team: Pokemon[],
  slotMap?: number[],
  limit: number = 5,
): TeamReplacement[] {
  const teamIds = new Set(team.map((p) => p.id));
  const baseScore = scoreTeam(team);
  const pool = OPTIMIZER_POOL.filter((p) => !teamIds.has(p.id));

  type Eval = { cand: Pokemon; gain: number; newScore: number };
  const slotEvals = new Map<number, Eval[]>();

  for (let i = 0; i < team.length; i++) {
    const evals: Eval[] = [];
    for (const cand of pool) {
      const test = team.slice();
      test[i] = cand;
      const newScore = scoreTeam(test);
      const gain = newScore - baseScore;
      if (gain > 0) evals.push({ cand, gain, newScore });
    }
    evals.sort((a, b) => b.gain - a.gain);
    if (evals.length > 0) slotEvals.set(i, evals);
  }

  if (team.length < 6) {
    const evals: Eval[] = [];
    for (const cand of pool) {
      const test = [...team, cand];
      const newScore = scoreTeam(test);
      const gain = newScore - baseScore;
      if (gain > 0) evals.push({ cand, gain, newScore });
    }
    evals.sort((a, b) => b.gain - a.gain);
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
      if (!bestEval || first.gain > bestEval.gain) {
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
    result.push({
      fromIndex,
      current,
      candidate: bestEval.cand,
      newScore: bestEval.newScore,
      gain: bestEval.gain,
    });
    usedCandIds.add(bestEval.cand.id);
    if (bestSlot !== -1) usedSlots.add(bestSlot);
  }

  return result;
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
    replacements: findBestReplacements(team, slotMap),
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

const OPTIMIZER_POOL: Pokemon[] = POKEMON.filter(
  (p) => p.evolutions.length === 0 && bstOf(p) >= 450,
);

function bstOf(p: Pokemon): number {
  const s = p.baseStats;
  return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed;
}

export function optimizeTeam(
  restarts: number = 50,
  shortlistSize: number = 25,
): Pokemon[] {
  const pool = OPTIMIZER_POOL;
  let bestTeam: Pokemon[] = [];
  let bestScore = -1;
  const earlyExitThreshold = 92;

  for (let r = 0; r < restarts; r++) {
    let team = randomTeam(pool, 6);
    let score = scoreTeam(team);

    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let slot = 0; slot < 6; slot++) {
        const candidates = sampleDistinct(pool, shortlistSize, team);
        let bestSwapScore = score;
        let bestSwap: Pokemon | null = null;
        for (const cand of candidates) {
          const test = team.slice();
          test[slot] = cand;
          const s = scoreTeam(test);
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

  return bestTeam;
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
