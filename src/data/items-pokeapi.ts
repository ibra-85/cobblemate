import generated from "./items-generated.json";
import smogon from "./smogon-generated.json";
import { POKEMON_BY_ID } from "./pokemon";
import type { Pokemon } from "@/types";

/**
 * Mirror of `smogonItemToSlug` from `./smogon` — inlined here to
 * avoid a cycle (smogon.ts re-exports our lookupItem).
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * PokéAPI-sourced items catalogue: 2176 entries, every one with a
 * French name, most with a short_effect + flavor text. Built by
 * `scripts/build-items-data.mjs`.
 *
 * This deliberately lives in its own module — `smogon.ts` already
 * carries a small hand-curated FR translation table; we treat that
 * as an override layer and walk the PokéAPI dump for everything else.
 */
export interface PokeApiItem {
  nameFr: string;
  nameEn: string;
  shortEffect: string | null;
  description: string | null;
}

interface ItemsFile {
  items: Record<string, PokeApiItem>;
  byName: Record<string, string>;
}

const DATA = generated as ItemsFile;

/**
 * Resolve a Smogon-style item display ("Choice Specs") or slug
 * ("choice_specs") to the full PokéAPI entry. Returns `null` for
 * items PokéAPI doesn't carry (a handful of Cobblemon-only or
 * very new gen 9 items).
 */
export function lookupItem(nameOrSlug: string): PokeApiItem | null {
  return (
    DATA.items[nameOrSlug] ??
    DATA.items[toSlug(nameOrSlug)] ??
    DATA.items[DATA.byName[nameOrSlug] ?? ""] ??
    null
  );
}

/** Resolve any spelling to the canonical snake_case slug, or `null`. */
export function itemSlug(nameOrSlug: string): string | null {
  if (DATA.items[nameOrSlug]) return nameOrSlug;
  const slug = toSlug(nameOrSlug);
  if (DATA.items[slug]) return slug;
  const byName = DATA.byName[nameOrSlug];
  return byName ?? null;
}

// ─── Held-item reverse index from Smogon stats ────────────────────────

export interface ItemHolder {
  pokemon: Pokemon;
  /** Share among the Pokémon's recorded item picks (0–1). */
  share: number;
}

interface SmogonPokemonStats {
  items?: { name: string; share: number }[];
}

/** `slug → holders[]` index, sorted by share descending. */
const HOLDERS_BY_SLUG: Map<string, ItemHolder[]> = (() => {
  const tmp = new Map<string, ItemHolder[]>();
  const sm = smogon as Record<string, SmogonPokemonStats>;
  for (const [pokemonId, stats] of Object.entries(sm)) {
    const p = POKEMON_BY_ID[pokemonId];
    if (!p) continue;
    for (const it of stats.items ?? []) {
      const slug = toSlug(it.name);
      let arr = tmp.get(slug);
      if (!arr) tmp.set(slug, (arr = []));
      arr.push({ pokemon: p, share: it.share });
    }
  }
  // Sort each bucket by share desc — top users surface first.
  for (const arr of tmp.values()) arr.sort((a, b) => b.share - a.share);
  return tmp;
})();

/** Pokémon that hold this item in current Smogon stats, sorted by share. */
export function getItemHolders(nameOrSlug: string): ItemHolder[] {
  const slug = toSlug(nameOrSlug);
  return HOLDERS_BY_SLUG.get(slug) ?? [];
}

/** All held-item slugs the Smogon dump references (~130). Used to seed
 *  `generateStaticParams` for the item detail route. */
export function allHeldItemSlugs(): string[] {
  return [...HOLDERS_BY_SLUG.keys()];
}
