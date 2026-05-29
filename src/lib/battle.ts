import { lookupMove } from "@/data/moves";
import { POKEMON } from "@/data/pokemon";
import type { Move, Pokemon, PokemonTypeId } from "@/types";
import { ALL_TYPES, calculateTypeEffectiveness } from "@/lib/type-chart";
import { baseStatTotal, getPokemonWeaknesses } from "@/lib/pokemon-utils";

export interface CounterScore {
  pokemon: Pokemon;
  /** Highest effectiveness this Pokémon's STAB hits the target for. */
  bestOffense: number;
  /** Worst multiplier the target's STAB does back. Higher = worse. */
  worstIncoming: number;
  /** Composite usefulness score (offense gain - defensive risk). */
  score: number;
  /** Best move this Pokémon knows against the target. */
  bestMove?: Move;
}

/**
 * Pick the most useful Pokémon from a candidate team to switch in against
 * a given target. Score formula:
 *   score = bestOffense * 2 - worstIncoming + bst/600
 *
 * The /600 BST term acts as a tie-breaker: when offense/defense are
 * equal, more powerful Pokémon edge ahead.
 */
export function getBestTeamMemberAgainst(
  team: Pokemon[],
  target: Pokemon,
): CounterScore[] {
  return team
    .map<CounterScore>((p) => {
      const offenseTypes = p.types;
      const bestOffense = Math.max(
        ...offenseTypes.map((t) => calculateTypeEffectiveness(t, target.types)),
      );
      const worstIncoming = Math.max(
        ...target.types.map((t) => calculateTypeEffectiveness(t, p.types)),
      );

      // Pick best known move against target if movepool data is available.
      const moves = p.notableMoves
        .map((id) => lookupMove(id))
        .filter((m): m is Move => m !== null);
      const bestMove = moves
        .filter((m) => m.category !== "status" && m.power)
        .sort((a, b) => {
          const ea = calculateTypeEffectiveness(a.type, target.types) * (a.power ?? 0);
          const eb = calculateTypeEffectiveness(b.type, target.types) * (b.power ?? 0);
          return eb - ea;
        })[0];

      const score =
        bestOffense * 2 - worstIncoming + baseStatTotal(p) / 600;
      return { pokemon: p, bestOffense, worstIncoming, score, bestMove };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Find the best counters to a target from the whole roster.
 * Same scoring as `getBestTeamMemberAgainst` but limited to candidates
 * that hit ≥2× *and* resist the target's STAB (worstIncoming ≤ 1).
 */
export function getBestCounters(target: Pokemon, pool: Pokemon[] = POKEMON): CounterScore[] {
  return getBestTeamMemberAgainst(pool, target).filter(
    (c) => c.bestOffense >= 2 && c.worstIncoming <= 1 && c.pokemon.id !== target.id,
  );
}

export interface BattleRecommendation {
  target: Pokemon;
  ranked: CounterScore[];
  /** Pokémon from the team that should NOT be switched in. */
  avoid: CounterScore[];
  weaknesses: PokemonTypeId[];
  resistances: PokemonTypeId[];
  immunities: PokemonTypeId[];
  /** Offensive types we know the target could realistically carry. */
  threatTypes: PokemonTypeId[];
}

export function buildBattleRecommendation(
  team: Pokemon[],
  target: Pokemon,
): BattleRecommendation {
  const ranked = getBestTeamMemberAgainst(team, target);
  const avoid = ranked
    .filter((r) => r.worstIncoming >= 2 || r.bestOffense < 1)
    .slice(-3);

  // Collect the types of the target's notable moves to surface coverage threats.
  const moveTypes = new Set<PokemonTypeId>();
  for (const id of target.notableMoves) {
    const m = lookupMove(id);
    if (m && m.category !== "status") moveTypes.add(m.type);
  }
  for (const t of target.types) moveTypes.add(t);

  return {
    target,
    ranked,
    avoid,
    weaknesses: getPokemonWeaknesses(target),
    resistances: ALL_TYPES.filter((t) => {
      const m = calculateTypeEffectiveness(t, target.types);
      return m > 0 && m < 1;
    }),
    immunities: ALL_TYPES.filter(
      (t) => calculateTypeEffectiveness(t, target.types) === 0,
    ),
    threatTypes: Array.from(moveTypes),
  };
}
