/**
 * Filter model for the Pokédex explorer.
 *
 * Two flavours of filter coexist:
 *  - `CategoricalFilter` — a list of allowed values for a categorical
 *    attribute (type, generation, role, biome, rarity). A `mode` field
 *    tells whether matching values are *kept* (include) or *removed*
 *    (exclude). Multiple values inside the same filter are OR-combined.
 *  - `PowerFilter` — a numeric range over the base stat total (BST).
 *
 * No "operators" (is / is-not / is-any-of) anymore — that abstraction was
 * confusing and one of the operators silently did nothing. Multi-select +
 * an include/exclude toggle covers every realistic use case.
 */

export type CategoricalKind =
  | "type"
  | "generation"
  | "role"
  | "biome"
  | "rarity"
  | "category";
export type FilterKind = CategoricalKind | "power";

export type FilterMode = "include" | "exclude";

export interface CategoricalFilter {
  id: string;
  kind: CategoricalKind;
  mode: FilterMode;
  values: string[];
}

export interface PowerFilter {
  id: string;
  kind: "power";
  range: [number, number];
}

export type ActiveFilter = CategoricalFilter | PowerFilter;

/** Runtime info the filter UI needs from the host page. */
export interface FilterContext {
  generations: number[];
  powerMin: number;
  powerMax: number;
}

let nextId = 0;
export function makeFilterId(kind: FilterKind): string {
  nextId += 1;
  return `f-${kind}-${Date.now().toString(36)}-${nextId}`;
}
