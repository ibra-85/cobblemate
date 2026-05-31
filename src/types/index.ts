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

/**
 * Spawn-pool rarity buckets — these are the only four values Cobblemon's
 * `spawn_pool_world` files use (verifiable in-game with mods like
 * PokéNav). "Legendary" is **not** a rarity: it's a species *label* (see
 * `SPECIES_EXTRAS_BY_ID[id].labels` in `src/data/species-extras.ts`) and
 * is surfaced via the dedicated "Catégorie" filter, not the rarity one.
 */
export type Rarity = "common" | "uncommon" | "rare" | "ultra-rare";

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
  /** Primary display name in French. */
  name: string;
  /** English name from PokeAPI — carried alongside so the UI can show
   *  a bilingual "Tonnerre · Thunderbolt" without re-querying. Optional
   *  because the curated catalogue doesn't always carry it. */
  nameEn?: string;
  type: PokemonTypeId;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
  /** Hand-tuned short effect kept on a few curated moves. Prefer
   *  {@link shortEffect} (PokéAPI-sourced, FR, 932 / 937 covered) for
   *  generic UI; this exists for backwards compatibility. */
  effect?: string;
  /** Concise mechanical description in French ("A une chance de
   *  paralyser la cible."). Sourced from PokéAPI `effect_entries`. */
  shortEffect?: string;
  /** In-game flavor text in French — the move-dex line the player
   *  sees when reading a move. Sourced from PokéAPI `flavor_text_entries`. */
  description?: string;
  priority?: number;
}

export interface Evolution {
  to: string;
  method: string;
}

/**
 * @deprecated Use `SpawnAggregate` from `@/data/spawns` instead. The
 * aggregated shape is produced by `scripts/build-spawns-data.mjs` and
 * unions every spawn rule for a Pokémon (covering 950+ entries vs the
 * hand-written 15 this type was designed for).
 */
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

export type ItemCategory =
  | "ball"
  | "held"
  | "evolution"
  | "healing"
  | "berry"
  | "tm"
  | "key";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  /** Free-text crafting / acquisition note. */
  obtain?: string;
  /** Pokémon ids it specifically benefits (evolution stones, etc.). */
  relatedPokemonIds?: string[];
  rarity?: Rarity;
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

/** A single Smogon-style "X used by Y%" data point. */
export interface UsageStat<T = string> {
  value: T;
  percent: number;
}

/**
 * Aggregate usage stats — modelled after Smogon dumps. All percents are
 * 0–100. Missing fields just mean "no data yet" — the UI hides empty
 * sections automatically.
 */
export interface PokemonUsage {
  /** Overall usage rate of this Pokémon at the chosen tier/elo. */
  usagePercent: number;
  /** Distribution of which ability is run. */
  abilities: UsageStat<string>[];
  /** Held items distribution. */
  items: UsageStat<string>[];
  /** Most common teammates (values are Pokémon ids). */
  teammates: UsageStat<string>[];
  /** Most carried moves (values are move ids when known, else free text). */
  moves: UsageStat<string>[];
  /** Most common EV spreads, formatted as readable strings. */
  spreads: UsageStat<string>[];
}

/** One competitive set / build template for the Pokémon. */
export interface StrategySet {
  name: string;
  items: string[];
  ability: string;
  nature: string;
  evs: string;
  /**
   * Move slots. `primary` is the recommended move; `alternatives` are
   * interchangeable picks for the same slot.
   */
  moves: { primary: string; alternatives?: string[] }[];
  notes?: string;
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
  /** Smogon-style aggregate usage statistics. */
  usage?: PokemonUsage;
  /** Pre-built competitive set templates. */
  sets?: StrategySet[];
  /** Flagged by PokéAPI as legendary or mythical species. */
  isLegendary?: boolean;
}

/**
 * Per-Pokémon EV spread (0–252 per stat, total capped at 508 in
 * canonical Pokémon rules — the UI enforces the cap, not the type).
 * All fields optional so partial spreads load cleanly.
 */
export interface EvSpread {
  hp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
}

/**
 * A team slot. Beyond the Pokémon id, the slot carries the **set
 * configuration**: the talent, item and moves the user is actually
 * running. This is the V3 source of truth the analysis layer reads
 * from — when fields are absent the engine falls back to "any
 * available", which is explicitly weaker and lower-confidence
 * scoring (the user complaint: "ne jamais créditer automatiquement
 * le meilleur talent").
 *
 * `nature` and `evs` are reserved for V4: not consumed yet, but the
 * field shapes are committed now so saved teams written today don't
 * need a migration when the EV UI ships.
 */
export interface TeamSlot {
  pokemonId: string | null;
  nickname?: string;
  /** Active talent — exactly the one the mon is running. */
  selectedAbility?: string;
  /** Held item id (Cobblemon-style "minecraft:apple" or wiki slug). */
  selectedItem?: string;
  /** 1–4 declared moves. Length ≤ 4. */
  selectedMoves?: string[];
  /** Nature label ("Adamant", "Modeste", …). Reserved for V4. */
  nature?: string;
  /** EV distribution. Reserved for V4. */
  evs?: EvSpread;
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
