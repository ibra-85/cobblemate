import generated from "./move-learners-generated.json";

/**
 * Reverse learnset index — for each Cobblemon move id, the Pokémon
 * that learn it grouped by method. Built by
 * `scripts/build-move-learners-data.mjs` from the per-mon
 * `movesByMethod` slices in `species-extras-generated.json`.
 */
export interface MoveLearners {
  level:   { id: string; level: number }[];
  tm:      string[];
  egg:     string[];
  tutor:   string[];
  legacy:  string[];
  special: string[];
}

const EMPTY: MoveLearners = {
  level: [], tm: [], egg: [], tutor: [], legacy: [], special: [],
};

const DATA = generated as Record<string, MoveLearners>;

export function getMoveLearners(moveId: string): MoveLearners {
  return DATA[moveId] ?? EMPTY;
}

/**
 * Every move that at least one Pokémon learns. Used by
 * `generateStaticParams` so the SSG build pre-renders one route per
 * known move.
 */
export function allLearnableMoveIds(): string[] {
  return Object.keys(DATA);
}
