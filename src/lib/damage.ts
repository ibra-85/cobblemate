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
  level: number = 50,
): DamageResult | null {
  if (move.category === "status" || !move.power) return null;

  const isPhysical = move.category === "physical";
  const A = isPhysical
    ? baseStatAt(level, attacker.baseStats.attack)
    : baseStatAt(level, attacker.baseStats.spAtk);
  const D = isPhysical
    ? baseStatAt(level, defender.baseStats.defense)
    : baseStatAt(level, defender.baseStats.spDef);

  const baseDamage =
    Math.floor((((2 * level) / 5 + 2) * move.power * A) / D / 50) + 2;

  const stab: 1 | 1.5 = attacker.types.includes(move.type) ? 1.5 : 1;
  const eff = calculateTypeEffectiveness(move.type, defender.types);

  const modified = baseDamage * stab * eff;
  const max = Math.floor(modified * 1.0);
  const min = Math.floor(modified * 0.85);

  const defenderHp = hpAt(level, defender.baseStats.hp);
  const minPercent = (min / defenderHp) * 100;
  const maxPercent = (max / defenderHp) * 100;

  let ohko: DamageResult["ohko"];
  if (min >= defenderHp) ohko = "Always";
  else if (max >= defenderHp) ohko = maxPercent >= 95 ? "Likely" : "Possible";
  else ohko = "Never";

  return {
    min,
    max,
    minPercent,
    maxPercent,
    defenderHp,
    stab,
    effectiveness: eff,
    ohko,
  };
}
