import type { Pokemon, PokemonTypeId } from "@/types";
import {
  calculateTypeEffectiveness,
  getImmunities,
  getResistances,
  getWeaknesses,
} from "@/lib/type-chart";

/** Sum of base stats — useful for rough power comparisons. */
export function baseStatTotal(p: Pokemon): number {
  const s = p.baseStats;
  return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed;
}

export function getPokemonWeaknesses(p: Pokemon): PokemonTypeId[] {
  return getWeaknesses(p.types);
}

export function getPokemonResistances(p: Pokemon): PokemonTypeId[] {
  return getResistances(p.types);
}

export function getPokemonImmunities(p: Pokemon): PokemonTypeId[] {
  return getImmunities(p.types);
}

/**
 * Quick best-effort offensive type for a given Pokémon, based on its
 * declared STAB types and which one hits the target the hardest.
 */
export function bestStabAgainst(
  attacker: Pokemon,
  defenderTypes: PokemonTypeId[],
): { type: PokemonTypeId; multiplier: number } | null {
  let best: { type: PokemonTypeId; multiplier: number } | null = null;
  for (const t of attacker.types) {
    const m = calculateTypeEffectiveness(t, defenderTypes);
    if (!best || m > best.multiplier) best = { type: t, multiplier: m };
  }
  return best;
}
