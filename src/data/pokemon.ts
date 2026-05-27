import type { Pokemon } from "@/types";
import generated from "./pokemon-generated.json";
import { POKEMON_OVERRIDES } from "./pokemon-overrides";

/**
 * Master Pokémon roster.
 *
 * Two layers merged at module load:
 *  1. `pokemon-generated.json` — built by `scripts/build-pokemon-data.mjs`
 *     from cobblemon-academy-dex-site + PokéAPI (1399 entries covering
 *     the 1025 canonical species + regional/paradox forms).
 *  2. `pokemon-overrides.ts` — hand-curated extras (French ability names,
 *     roles, strategy tips, usage stats, sets). Overrides win field-by-
 *     field; anything missing falls through to the generated value.
 *
 * To refresh the roster from upstream sources:
 *   node scripts/build-pokemon-data.mjs
 */
export const POKEMON: Pokemon[] = (generated as Pokemon[])
  .map((p) => {
    const override = POKEMON_OVERRIDES[p.id];
    return override ? ({ ...p, ...override } as Pokemon) : p;
  })
  .sort((a, b) => a.dexNumber - b.dexNumber);

export const POKEMON_BY_ID: Record<string, Pokemon> = Object.fromEntries(
  POKEMON.map((p) => [p.id, p]),
);
