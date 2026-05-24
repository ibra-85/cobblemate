/**
 * Domain types for CobbleMate.
 * These types describe the shape of every entity used across the app
 * (Pokémon, moves, spawn conditions, pokésnacks, teams, …).
 *
 * They are decoupled from any data source so the local JSON layer can be
 * swapped later for an HTTP / Supabase backend without touching the UI.
 */

export type PokemonTypeId =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export type MoveCategory = "physical" | "special" | "status";

export type PokemonRole =
  | "physical-sweeper"
  | "special-sweeper"
  | "physical-wall"
  | "special-wall"
  | "mixed-wall"
  | "support"
  | "hazard-setter"
  | "pivot"
  | "revenge-killer"
  | "lead"
  | "wallbreaker";

export type Rarity = "common" | "uncommon" | "rare" | "ultra-rare" | "legendary";

export type DayPeriod = "day" | "night" | "dawn" | "dusk" | "any";
export type Weather = "clear" | "rain" | "thunder" | "snow" | "any";
export type Dimension = "overworld" | "nether" | "end" | "any";

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface Move {
  id: string;
  name: string;
  type: PokemonTypeId;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effect?: string;
  priority?: number;
}

export interface Evolution {
  to: string;
  method: string;
}

export interface SpawnCondition {
  pokemonId: string;
  biomes: string[];
  dayPeriod: DayPeriod;
  weather: Weather;
  dimension: Dimension;
  rarity: Rarity;
  minY?: number;
  maxY?: number;
  notes?: string;
}

export interface Pokesnack {
  id: string;
  name: string;
  description: string;
  attractsTypes: PokemonTypeId[];
  attractsPokemonIds: string[];
  preferredBiomes?: string[];
  rarity: Rarity;
}

export interface Pokemon {
  id: string;
  dexNumber: number;
  name: string;
  generation: number;
  types: PokemonTypeId[];
  abilities: string[];
  hiddenAbility?: string;
  baseStats: BaseStats;
  evolutions: Evolution[];
  notableMoves: string[];
  roles: PokemonRole[];
  goodPartners?: string[];
  dangerousCounters?: string[];
  strategyTips?: string;
  imageUrl?: string;
}

export interface TeamSlot {
  pokemonId: string | null;
  nickname?: string;
  selectedMoves?: string[];
}

export interface SavedTeam {
  id: string;
  name: string;
  slots: TeamSlot[];
  createdAt: number;
  updatedAt: number;
}

/** Effectiveness multipliers used by the type chart. */
export type Effectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;
