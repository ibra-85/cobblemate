import generated from "./species-extras-generated.json";

/**
 * Extra species data harvested from the official Cobblemon mod
 * (`species/generation<N>/<mon>.json`) — fills in fields the existing
 * `pokemon-generated.json` doesn't carry: drops, EV yield, egg groups,
 * catch rate, growth curve, base friendship, height/weight, labels,
 * pokédex entry keys.
 *
 * Rebuild with: `node scripts/build-species-extras-data.mjs`.
 */

export interface DropEntry {
  item: string;
  quantityRange?: string;
  percentage?: number;
}

export interface DropTable {
  amount: number;
  entries: DropEntry[];
}

export interface EvYield {
  hp:               number;
  attack:           number;
  defence:          number;
  special_attack:   number;
  special_defence:  number;
  speed:            number;
}

export interface LevelMove {
  level: number;
  move: string;
}

export interface MovesByMethod {
  level:   LevelMove[];
  egg:     string[];
  tm:      string[];
  tutor:   string[];
  legacy:  string[];
  special: string[];
}

export interface SpeciesExtras {
  drops?:               DropTable;
  evYield?:             EvYield;
  eggGroups?:           string[];
  eggCycles?:           number;
  catchRate?:           number;
  experienceGroup?:     string;
  baseFriendship?:      number;
  baseExperienceYield?: number;
  height?:              number;
  weight?:              number;
  baseScale?:           number;
  /** Cobblemon labels: gen1, legendary, mythical, paradox, ultra_beast, … */
  labels?:              string[];
  /** i18n keys for the dex entry text. */
  pokedex?:             string[];
  /** Move learnsets split by learning method. */
  movesByMethod?:       MovesByMethod;
}

export const SPECIES_EXTRAS_BY_ID: Record<string, SpeciesExtras> =
  generated as Record<string, SpeciesExtras>;

export function getSpeciesExtras(id: string): SpeciesExtras | undefined {
  return SPECIES_EXTRAS_BY_ID[id];
}

export function isLegendary(id: string): boolean {
  const labels = SPECIES_EXTRAS_BY_ID[id]?.labels;
  return labels?.includes("legendary") === true;
}

export function isMythical(id: string): boolean {
  return SPECIES_EXTRAS_BY_ID[id]?.labels?.includes("mythical") === true;
}

export function isParadox(id: string): boolean {
  return SPECIES_EXTRAS_BY_ID[id]?.labels?.includes("paradox") === true;
}

export function isUltraBeast(id: string): boolean {
  return SPECIES_EXTRAS_BY_ID[id]?.labels?.includes("ultra_beast") === true;
}
