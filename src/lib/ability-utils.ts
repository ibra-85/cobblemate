/**
 * Ability name reconciliation across three storage shapes:
 *
 *  - **`pokemon.abilities` / `pokemon.hiddenAbility`** — collapsed EN
 *    form Cobblemon ships (e.g. `"Innerfocus"`, `"Multiscale"`,
 *    `"Quarkdrive"`). Spaces, hyphens and apostrophes are stripped.
 *  - **Smogon `set.ability`** — spaced EN form (e.g. `"Inner Focus"`,
 *    `"Multiscale"`, `"Quark Drive"`). The same names, but with
 *    word boundaries preserved.
 *  - **`ABILITIES_FR` / PokéAPI dump** — keyed by spaced EN form,
 *    values are the French display label (`"Multiécaille"`).
 *
 * Mixing those forms is what broke "Optimiser sets" — the optimiser
 * was translating the Smogon name to French then comparing against
 * the Pokémon's stored EN form, which never matched.
 *
 * Rule of thumb here:
 *  - **Comparison** is done on a normalised key (lowercase, no
 *    punctuation, no spaces) so any of the three shapes line up.
 *  - **Storage** uses the Pokémon's stored form (so the slot's
 *    `selectedAbility` round-trips with `pokemon.abilities`).
 *  - **Display** goes through `abilityDisplayFr` which tries the
 *    spaced form, the collapsed form, and the un-collapsed form so
 *    every storage variant produces a readable French label.
 */

import { frAbility } from "@/data/smogon";

/**
 * Lowercase, ASCII-folded, alphanumeric-only key.
 * `"Inner Focus"`, `"Innerfocus"` and `"Sérénité" / "Serenite"` all
 * collapse to the same thing — required so the EN ↔ FR matcher
 * works without false negatives on accented French labels.
 */
export function normalizeAbilityKey(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Find the entry in `abilities` whose normalised key matches `needle`.
 * Returns the *stored form* from the array (the Pokémon's collapsed
 * EN form, OR a French label when `pokemon-overrides.ts` has rewritten
 * it — both shapes round-trip through `selectedAbility`).
 *
 * Matching tries three keys per candidate:
 *  1. Direct normalised key (EN ↔ EN, FR ↔ FR).
 *  2. Smogon-translated needle (EN → FR via `frAbility`) so a Smogon
 *     "Sand Veil" lines up with a Pokémon override stored as "Sable
 *     Volant".
 *  3. Diacritic-stripped variants so "Lévitation" still matches.
 */
export function matchAbilityToPokemon(
  needle: string | undefined,
  abilities: (string | undefined | null)[],
): string | null {
  if (!needle) return null;
  const keyEn = normalizeAbilityKey(needle);
  const keyFr = normalizeAbilityKey(frAbility(needle).label);
  for (const a of abilities) {
    if (!a) continue;
    const k = normalizeAbilityKey(a);
    if (k === keyEn || k === keyFr) return a;
  }
  return null;
}

/**
 * French display label for a stored ability name, tolerant to the
 * three EN shapes the codebase juggles.
 *
 * Lookup order:
 *  1. `frAbility(stored)` direct (handles spaced form via the curated
 *     map + the PokéAPI dump).
 *  2. Un-collapse CamelCase → "Inner Focus" then retry.
 *  3. Fall back to the input string so the UI never renders empty.
 */
export function abilityDisplayFr(stored: string | undefined | null): string {
  if (!stored) return "";
  const direct = frAbility(stored);
  if (direct.translated) return direct.label;
  // Try un-collapsing CamelCase to spaced ("Innerfocus" → "Innerfocus"
  // still since lowercase…). Build a humanised form from the stored
  // string assuming PascalCase boundaries first.
  const spaced = stored
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^(.)/, (c) => c.toUpperCase());
  if (spaced !== stored) {
    const retry = frAbility(spaced);
    if (retry.translated) return retry.label;
  }
  return stored;
}
