import generated from "./abilities-generated.json";
import { POKEMON } from "./pokemon";
import type { Pokemon } from "@/types";

/**
 * PokéAPI-sourced abilities catalogue: 371 entries, most with a
 * French name + short_effect + flavor text. Built by
 * `scripts/build-abilities-data.mjs`.
 *
 * Coverage caveat: ~64 abilities (older ones like Torrent, Insomnia,
 * Plus) ship no FR strings in PokéAPI. The hand-curated `ABILITIES_FR`
 * table in `smogon.ts` covers most of those — keep that layer in
 * place as the primary override.
 */
export interface PokeApiAbility {
  nameFr: string;
  nameEn: string;
  shortEffect: string | null;
  description: string | null;
}

interface AbilitiesFile {
  abilities: Record<string, PokeApiAbility>;
  byName: Record<string, string>;
}

const DATA = generated as AbilitiesFile;

/** Reduce a name to a strippable comparison key — used to bridge the
 *  Cobblemon roster spelling ("Solarpower", "Compoundeyes") and the
 *  PokéAPI snake_case ("solar_power", "compound_eyes"). */
function strip(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve any spelling of an ability ("Solar Power", "Solarpower",
 * "solar_power") to the canonical PokéAPI snake_case slug.
 */
function toSlug(nameOrSlug: string): string | null {
  // Exact slug match (already canonical)
  if (DATA.abilities[nameOrSlug]) return nameOrSlug;
  // English display name match — built at file write time
  const byName = DATA.byName[nameOrSlug];
  if (byName) return byName;
  // Stripped lookup — only built lazily on first call.
  return STRIPPED_INDEX.get(strip(nameOrSlug)) ?? null;
}

/** Lazy snake_case index keyed by stripped form (built once). */
const STRIPPED_INDEX: Map<string, string> = (() => {
  const idx = new Map<string, string>();
  for (const [slug, entry] of Object.entries(DATA.abilities)) {
    idx.set(strip(slug), slug);
    if (entry.nameEn) idx.set(strip(entry.nameEn), slug);
    if (entry.nameFr) idx.set(strip(entry.nameFr), slug);
  }
  return idx;
})();

/**
 * Resolve a Smogon-style ability display ("Solar Power") or slug
 * ("solar_power") to the full PokéAPI entry. Returns `null` for
 * abilities PokéAPI doesn't carry yet — the calling layer usually
 * has a hand-tuned fallback for those.
 */
export function lookupAbility(nameOrSlug: string): PokeApiAbility | null {
  const slug = toSlug(nameOrSlug);
  return slug ? DATA.abilities[slug] ?? null : null;
}

/**
 * Canonical URL slug for a given ability spelling — used by callers
 * that need to build a `/abilities/<slug>` link. Returns `null` if
 * the ability isn't in the PokéAPI dump.
 */
export function abilitySlug(nameOrSlug: string): string | null {
  return toSlug(nameOrSlug);
}

// ─── Roster reverse index ─────────────────────────────────────────────

export interface AbilityLearner {
  pokemon: Pokemon;
  /** True when the Pokémon carries this ability as its Hidden Ability. */
  hidden: boolean;
}

/** Built once at module load — keyed by stripped form so it bridges
 *  Cobblemon-style spelling ("Solarpower") and our canonical slugs. */
const LEARNERS_BY_KEY: Map<string, AbilityLearner[]> = (() => {
  const idx = new Map<string, AbilityLearner[]>();
  const push = (key: string, learner: AbilityLearner) => {
    let arr = idx.get(key);
    if (!arr) idx.set(key, (arr = []));
    arr.push(learner);
  };
  for (const p of POKEMON) {
    for (const a of p.abilities ?? []) push(strip(a), { pokemon: p, hidden: false });
    if (p.hiddenAbility) push(strip(p.hiddenAbility), { pokemon: p, hidden: true });
  }
  // Sort each bucket so renders are deterministic.
  for (const arr of idx.values()) {
    arr.sort((a, b) => a.pokemon.dexNumber - b.pokemon.dexNumber);
  }
  return idx;
})();

/**
 * Every Pokémon that has this ability (regular or hidden). Accepts
 * the same lenient spelling as {@link lookupAbility}.
 */
export function getAbilityLearners(nameOrSlug: string): AbilityLearner[] {
  const slug = toSlug(nameOrSlug);
  if (slug) return LEARNERS_BY_KEY.get(strip(slug)) ?? [];
  // Fallback: search by stripped form directly (catches abilities not
  // in PokéAPI's dump but present on at least one roster entry).
  return LEARNERS_BY_KEY.get(strip(nameOrSlug)) ?? [];
}

/** Canonical slugs to seed `generateStaticParams` — every PokéAPI
 *  ability that at least one roster Pokémon actually has. */
export function allAbilitySlugs(): string[] {
  const out: string[] = [];
  for (const slug of Object.keys(DATA.abilities)) {
    if (LEARNERS_BY_KEY.has(strip(slug))) out.push(slug);
  }
  return out;
}
