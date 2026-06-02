/**
 * Pure mapping helpers between Smogon-flavoured set data and the
 * app's `TeamSlot` storage shape.
 *
 * Three translation steps that show up everywhere a Smogon set is
 * surfaced (slot config dialog "Appliquer", team-wide optimisation
 * button, future "import from PokéPaste"):
 *
 *  - **Ability** → Smogon ships English (e.g. "Multiscale"). We
 *    translate via `frAbility` to the French label that matches the
 *    ability options the user actually sees, and verify the mon
 *    really has that ability (some niche Smogon picks are H.A. only).
 *  - **Item** → Smogon ships English ("Heavy-Duty Boots"). We match
 *    against `COMPETITIVE_ITEMS.nameEn` to get the app id; fall back
 *    to the Smogon-canonical slug for items the curated registry
 *    doesn't ship yet (the `ItemIcon` component tolerates either).
 *  - **Moves** → Smogon ships display names ("Dragon Dance"). We
 *    slugify to Cobblemon-style ids ("dragondance") which is what
 *    `selectedMoves` persists.
 *
 * Centralising the mapping here keeps the two callers honest — fixes
 * land in one place, and the team-optimisation button can't drift
 * out of sync with the per-slot dialog.
 */

import { COMPETITIVE_ITEMS } from "@/data/competitive-items";
import {
  getSmogonStats,
  smogonItemToSlug,
  smogonMoveToId,
  type SmogonSet,
  type SmogonStats,
} from "@/data/smogon";
import { matchAbilityToPokemon } from "@/lib/ability-utils";
import type { EvSpread, Pokemon, TeamSlot } from "@/types";

/**
 * Best-effort label for a slot's declared moves against a Pokémon's
 * curated Smogon sets. Walks the sets, scoring overlap on the
 * lowercased-no-punct move id (the form `selectedMoves` persists),
 * and returns the highest-overlap set's name when the match is
 * meaningful — three out of four moves at minimum, so a slot that
 * keeps three Smogon moves and swaps the fourth still reads as
 * "Bulky DD" rather than dropping back to a generic chip.
 *
 * Returns `null` when no set matches well enough — the card then
 * just omits the "Set" line.
 */
export function matchSlotToSmogonSet(
  selectedMoves: string[] | undefined,
  pokemonId: string,
): string | null {
  if (!selectedMoves || selectedMoves.length === 0) return null;
  const stats = getSmogonStats(pokemonId);
  if (!stats || stats.sets.length === 0) return null;
  const slotIds = new Set(selectedMoves.filter(Boolean).map((m) => m.toLowerCase()));
  if (slotIds.size === 0) return null;

  let best: { name: string; overlap: number } | null = null;
  for (const set of stats.sets) {
    let overlap = 0;
    for (const m of set.moves) {
      if (slotIds.has(smogonMoveToId(m))) overlap++;
    }
    if (!best || overlap > best.overlap) {
      best = { name: set.name, overlap };
    }
  }
  // Need at least 3 out of 4 moves to consider it the same set —
  // looser matches risk surfacing the wrong archetype (Choice Band
  // and Dragon Dance share Earthquake + Extreme Speed but they're
  // different sets).
  if (!best || best.overlap < 3) return null;
  return best.name;
}

/** Smogon item EN name → app id, with Smogon slug fallback. */
export function smogonItemToAppId(name: string): string {
  const byNameEn = COMPETITIVE_ITEMS.find(
    (it) => it.nameEn.toLowerCase() === name.toLowerCase(),
  );
  return byNameEn?.id ?? smogonItemToSlug(name);
}

/**
 * Compute the patch a Smogon set should apply to a slot. Returns a
 * `Partial<TeamSlot>` so callers can spread it onto existing state
 * without overwriting fields the set doesn't carry (e.g. the user's
 * nickname). Always returns a fresh object — safe to mutate.
 *
 * `stats` is optional but strongly recommended — when the set's own
 * `ability` is `null` (Smogon often omits it on mons with only one
 * meta ability), we fall back to the most-used entry in
 * `stats.abilities` so Rotom/Corviknight/etc. still get a talent.
 */
export function smogonSetToSlotPatch(
  set: SmogonSet,
  pokemon: Pokemon,
  stats?: SmogonStats | null,
): Partial<TeamSlot> {
  const patch: Partial<TeamSlot> = {};

  // Ability lookup — three-tier fallback:
  //  1. `set.ability` — the explicit Smogon pick.
  //  2. `stats.abilities[0]` — the most-played ability on the dex
  //     (covers Smogon sets that leave `ability` null because the
  //     mon's meta is dominated by one talent, e.g. Rotom-Wash with
  //     "Levitate", Corviknight with "Pressure").
  //  3. Single-ability auto-pick — if the species ships only one
  //     ability total, we apply it unconditionally (matches the
  //     dialog's `singleOption` behaviour).
  //
  // Matching goes through `matchAbilityToPokemon` so the EN-collapsed
  // / EN-spaced / FR (from overrides) shapes all line up — see the
  // helper for the full normalisation rules.
  const pokemonAbilities = [...pokemon.abilities, pokemon.hiddenAbility];
  const abilityCandidates = [
    set.ability,
    stats?.abilities[0]?.name,
  ].filter(Boolean) as string[];

  let matchedAbility: string | null = null;
  for (const cand of abilityCandidates) {
    matchedAbility = matchAbilityToPokemon(cand, pokemonAbilities);
    if (matchedAbility) break;
  }

  // Single-ability fallback — Rotom-* in the Cobblemon dump ships
  // `abilities: ["Levitate"], hiddenAbility: "Levitate"`. Dedup and
  // if only one option remains, that's the obvious choice.
  if (!matchedAbility) {
    const unique = Array.from(
      new Set(pokemonAbilities.filter((a): a is string => !!a)),
    );
    if (unique.length === 1) matchedAbility = unique[0]!;
  }

  if (matchedAbility) {
    patch.selectedAbility = matchedAbility;
  }

  if (set.item) {
    patch.selectedItem = smogonItemToAppId(set.item);
  }

  if (set.moves && set.moves.length) {
    patch.selectedMoves = set.moves
      .slice(0, 4)
      .map((m) => smogonMoveToId(m))
      .filter(Boolean);
  }

  if (set.nature) {
    patch.nature = set.nature;
  }

  if (set.evs && Object.keys(set.evs).length) {
    patch.evs = clampSpread(set.evs as Record<string, unknown>, 252);
  }

  if (set.ivs && Object.keys(set.ivs).length) {
    patch.ivs = clampSpread(set.ivs as Record<string, unknown>, 31);
  }

  return patch;
}

/**
 * Defensive copy with bounds-checking — Smogon ships well-formed
 * data but we don't want a malformed set crash the apply flow.
 * Accepts `Record<string, unknown>` (rather than the typed
 * `SmogonEvs`) so the same helper can re-validate user-supplied
 * spreads at the codec boundary too.
 */
function clampSpread(raw: Record<string, unknown>, cap: number): EvSpread {
  const out: EvSpread = {};
  const keys: (keyof EvSpread)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.max(0, Math.min(cap, Math.round(v)));
    }
  }
  return out;
}
