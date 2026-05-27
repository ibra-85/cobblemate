import { POKEMON } from "@/data/pokemon";
import { SPAWNS, SPAWNS_BY_ID, type SpawnAggregate } from "@/data/spawns";
import { POKESNACKS } from "@/data/pokesnacks";
import type { Pokemon, PokemonTypeId, Rarity } from "@/types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function searchPokemon(query: string, list: Pokemon[] = POKEMON): Pokemon[] {
  const q = norm(query.trim());
  if (!q) return list;
  return list.filter(
    (p) =>
      norm(p.name).includes(q) ||
      p.id.includes(q) ||
      String(p.dexNumber).includes(q),
  );
}

export function filterPokemonByType(type: PokemonTypeId, list: Pokemon[] = POKEMON) {
  return list.filter((p) => p.types.includes(type));
}

export function filterPokemonByGeneration(gen: number, list: Pokemon[] = POKEMON) {
  return list.filter((p) => p.generation === gen);
}

export function filterPokemonBySpawn(
  predicate: (spawn: SpawnAggregate) => boolean,
  list: Pokemon[] = POKEMON,
) {
  const ids = new Set(SPAWNS.filter(predicate).map((s) => s.pokemonId));
  return list.filter((p) => ids.has(p.id));
}

export function filterPokemonByRarity(rarity: Rarity, list: Pokemon[] = POKEMON) {
  const ids = new Set(
    SPAWNS.filter((s) => s.rarities.includes(rarity)).map((s) => s.pokemonId),
  );
  return list.filter((p) => ids.has(p.id));
}

export function getPokesnacksForPokemon(pokemonId: string) {
  return POKESNACKS.filter(
    (s) =>
      s.attractsPokemonIds.includes(pokemonId) ||
      (() => {
        const p = POKEMON.find((x) => x.id === pokemonId);
        return p ? p.types.some((t) => s.attractsTypes.includes(t)) : false;
      })(),
  );
}

/** The aggregated spawn record for a Pokémon, or undefined if none. */
export function getSpawnsForPokemon(pokemonId: string): SpawnAggregate | undefined {
  return SPAWNS_BY_ID[pokemonId];
}
