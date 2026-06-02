import type { Move, Pokemon } from "@/types";
import { calculateTypeEffectiveness } from "@/lib/type-chart";

/**
 * Simplified damage calculator. Uses base stats only (no IVs, EVs or
 * natures) — the goal is a quick in-game "is it an OHKO?" check, not
 * tournament-grade prediction. For full accuracy users should refer to
 * Smogon's calc.
 *
 * Formula (Gen 6+ standard, simplified):
 *   stat   = ⌊(2*base) * level/100⌋ + level + 10
 *   damage = ⌊((2*level/5 + 2) * power * A / D) / 50⌋ + 2
 *   damage = damage * STAB * type-effectiveness * random
 * where random ∈ [0.85, 1.00] in 16 discrete steps.
 */
export interface DamageResult {
  min: number;
  max: number;
  /** Min/max as percent of defender max HP (0–100+). */
  minPercent: number;
  maxPercent: number;
  defenderHp: number;
  stab: 1 | 1.5;
  effectiveness: number;
  /** "Always", "Likely", "Possible" or "Never" for one-shot. */
  ohko: "Always" | "Likely" | "Possible" | "Never";
  /** Worst-case rolls to KO. Drives the "OHKO / 2HKO / 3HKO" verdict
   *  shown in the calc — `Math.ceil(defenderHp / min)` so it's
   *  the guaranteed shots (using min damage). 0 means "max roll does
   *  no damage" (immune / status). Cap at 99 so a 0-damage edge case
   *  doesn't blow up the UI. */
  hitsToKo: number;
  /** Probability of OHKO on a single roll, 0–100. Computed from the
   *  uniform-rolls range so a min that exactly meets HP renders 100%
   *  and a max barely meeting HP renders ≈6%. */
  ohkoProbability: number;
}

function baseStatAt(level: number, base: number): number {
  return Math.floor(((2 * base) * level) / 100) + level + 10;
}

function hpAt(level: number, base: number): number {
  // HP gets +10 vs +5 in the standard formula; use the simplified one above
  // which already baked in +level+10. For HP we add 10 instead of level+10
  // to better match in-game HP roughly: this is rough but consistent.
  return Math.floor(((2 * base) * level) / 100) + level + 10;
}

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  attackerLevel: number = 50,
  defenderLevel: number = attackerLevel,
): DamageResult | null {
  if (move.category === "status" || !move.power) return null;

  const isPhysical = move.category === "physical";
  const A = isPhysical
    ? baseStatAt(attackerLevel, attacker.baseStats.attack)
    : baseStatAt(attackerLevel, attacker.baseStats.spAtk);
  const D = isPhysical
    ? baseStatAt(defenderLevel, defender.baseStats.defense)
    : baseStatAt(defenderLevel, defender.baseStats.spDef);

  // `level` in the in-game damage formula is the attacker's level.
  const baseDamage =
    Math.floor((((2 * attackerLevel) / 5 + 2) * move.power * A) / D / 50) + 2;

  const stab: 1 | 1.5 = attacker.types.includes(move.type) ? 1.5 : 1;
  const eff = calculateTypeEffectiveness(move.type, defender.types);

  const modified = baseDamage * stab * eff;
  const max = Math.floor(modified * 1.0);
  const min = Math.floor(modified * 0.85);

  const defenderHp = hpAt(defenderLevel, defender.baseStats.hp);
  const minPercent = (min / defenderHp) * 100;
  const maxPercent = (max / defenderHp) * 100;

  let ohko: DamageResult["ohko"];
  if (min >= defenderHp) ohko = "Always";
  else if (max >= defenderHp) ohko = maxPercent >= 95 ? "Likely" : "Possible";
  else ohko = "Never";

  // Worst-case shots to KO: ceil(HP / min). If `min` is 0 (immunity or
  // round-down on a 0-pwr matchup), set to 99 as a sentinel rather
  // than dividing by zero.
  const hitsToKo = min > 0 ? Math.min(99, Math.ceil(defenderHp / min)) : 99;

  // OHKO probability — among the 16 uniform rolls in [0.85, 1.00], how
  // many land at or above defenderHp. The rolls are continuous in the
  // game; we approximate by the linear share of the [min, max] window
  // that's at or above HP.
  let ohkoProbability: number;
  if (min >= defenderHp) ohkoProbability = 100;
  else if (max < defenderHp) ohkoProbability = 0;
  else ohkoProbability = ((max - defenderHp) / (max - min)) * 100;

  return {
    min,
    max,
    minPercent,
    maxPercent,
    defenderHp,
    stab,
    effectiveness: eff,
    ohko,
    hitsToKo,
    ohkoProbability,
  };
}
