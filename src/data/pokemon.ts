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

/**
 * Cobblemon's source data stores form-specific evolution targets as
 * space-separated `"species aspect"` strings (`"raichu alolan"`,
 * `"arcanine hisuian"`, `"rayquaza mega=true"`). Our roster id uses
 * underscores AND drops the trailing `n` on the regional suffixes
 * (`raichu_alola`, `arcanine_hisui`, `rayquaza_mega`).
 *
 * Auditing the dump shows 831 evolution rows with a `to` value that
 * doesn't directly match a `POKEMON_BY_ID` entry — without this
 * normaliser every regional + mega + primal + form-specific
 * evolution lands on a "missing Pokémon" placeholder card.
 *
 * The function tries a sequence of progressively looser
 * transformations and returns the first one that resolves. The
 * original string is returned as a last resort so the caller can
 * surface "raw" id text for genuinely unknown targets.
 */
export function resolveEvolutionTo(raw: string): string {
  if (POKEMON_BY_ID[raw]) return raw;
  // Cobblemon-specific suffixes that don't match our id form.
  const aspectMap: Record<string, string> = {
    alolan: "alola",
    galarian: "galar",
    hisuian: "hisui",
  };
  // 1. Space → underscore, strip "=true/false" tail (mega=true, primal=false).
  const base = raw
    .toLowerCase()
    .replace(/=\S*/g, "")
    .trim()
    .replace(/\s+/g, "_");
  if (POKEMON_BY_ID[base]) return base;
  // 2. Aspect suffix normalisation — alolan → alola, etc.
  for (const [from, to] of Object.entries(aspectMap)) {
    const replaced = base.replace(new RegExp(`_${from}$`), `_${to}`);
    if (POKEMON_BY_ID[replaced]) return replaced;
  }
  // 3. Some Cobblemon forms include extra aspect tokens we ignore
  //    ("torterra tree=oak" → just "torterra"). Try the head species.
  const head = base.split("_")[0];
  if (head && POKEMON_BY_ID[head]) return head;
  return raw;
}

/**
 * Reverse evolution index — `child id → parent id`. Lets the UI walk
 * backwards from any stage to the base form and render the full chain,
 * not just the forward branches.
 */
export const EVOLVES_FROM: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const p of POKEMON) {
    for (const e of p.evolutions) {
      // First parent wins — there are a couple of branched evolutions
      // (e.g. tyrogue → hitmonlee/chan/top) where the reverse mapping
      // is ambiguous but always has a single canonical parent.
      // Normalise `to` here so reverse lookup hits the same key the
      // forward walker resolves to.
      const target = resolveEvolutionTo(e.to);
      if (!idx[target]) idx[target] = p.id;
    }
  }
  return idx;
})();

/** Walk from any Pokémon up the chain to its base form. */
export function rootOf(id: string): string {
  let cur = id;
  const seen = new Set<string>();
  while (EVOLVES_FROM[cur] && !seen.has(cur)) {
    seen.add(cur);
    cur = EVOLVES_FROM[cur];
  }
  return cur;
}

/**
 * Full forward evolution chain from a root id, flattening branches into
 * one row per linear path. Returns a list of stages — each stage is the
 * set of Pokémon reachable at that depth with the method that brought
 * them there.
 */
export interface ChainStage {
  id: string;
  /** Evolution method that brought us to this Pokémon (null = base). */
  method: string | null;
  /** Structured evolution payload (Cobblemon-source variant +
   *  requirements). Carried through so renderers can show typed
   *  chips — item icon, partner sprite, friendship hearts — instead
   *  of parsing the `method` string. Absent on base forms and on
   *  rows from data files that pre-date the patch script. */
  details: import("@/types").EvolutionDetails | null;
}

export function evolutionChain(rootId: string): ChainStage[][] {
  const root = POKEMON_BY_ID[rootId];
  if (!root) return [];
  const stages: ChainStage[][] = [[{ id: rootId, method: null, details: null }]];
  const visited = new Set<string>([rootId]);
  let frontier: ChainStage[] = [{ id: rootId, method: null, details: null }];
  while (frontier.length > 0) {
    const next: ChainStage[] = [];
    for (const f of frontier) {
      const p = POKEMON_BY_ID[f.id];
      if (!p) continue;
      for (const e of p.evolutions) {
        // Normalise the raw `to` to a roster id — Cobblemon ships
        // "raichu alolan" while our id is "raichu_alola". Without
        // this step every regional/form evolution would render as
        // a missing-Pokémon placeholder.
        const target = resolveEvolutionTo(e.to);
        if (visited.has(target)) continue;
        visited.add(target);
        next.push({ id: target, method: e.method, details: e.details ?? null });
      }
    }
    if (next.length === 0) break;
    stages.push(next);
    frontier = next;
  }
  return stages;
}

/**
 * True for Pokémon that don't evolve and aren't an evolved form of
 * anything — a single-stage species. Used by the hero card to call it
 * out explicitly so the player doesn't go hunting for an evolution
 * that doesn't exist.
 */
export function isSoloSpecies(id: string): boolean {
  const root = rootOf(id);
  const stages = evolutionChain(root);
  return stages.length <= 1 && (stages[0]?.length ?? 0) <= 1;
}
