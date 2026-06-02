/**
 * Team-aware Smogon set picker.
 *
 * The default "Optimiser sets" applies each Pokémon's top-1 Smogon
 * set in isolation. That maximises individual fit but can demolish
 * team structure — six top-1 sets with no hazards / no removal /
 * three Choice Band cleaners is a worse team than the same six mons
 * with their second-most-popular sets that happen to share the
 * hazard / pivot / support workload.
 *
 * `optimizeForTeam` walks the curated Smogon sets per slot and
 * **picks the set that best fills the team's remaining structural
 * gaps**, not just the highest-popularity one. The result is a
 * concrete `SetChoice` per filled slot, ready to be applied by the
 * UI with a confirmation toast.
 *
 * Algorithm: two-pass greedy.
 *   1. Baseline pass — assume each mon uses set[0] and tally the
 *      team's confirmed roles + removal/hazard capabilities.
 *   2. For each slot, evaluate every available set against the
 *      *baseline minus the current slot's contribution*, score it
 *      with the critical-need / overlap / usage formula, and pick
 *      the best.
 *   3. Refinement pass — repeat once with the updated picks as the
 *      baseline so early picks can be revised based on what later
 *      ones brought.
 *
 * The greedy local optimum isn't strictly optimal but the search
 * space is tiny (≤4 sets per mon × 6 slots) and the two passes
 * almost always converge to the same answer a brute-force would.
 */

import { getSmogonStats, type SmogonSet, type SmogonStats } from "@/data/smogon";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { smogonSetToSlotPatch } from "@/lib/smogon-set-mapping";
import { confirmedRoles as confirmedRolesFromMoves } from "@/lib/team-roles";
import type { Pokemon, PokemonRole, TeamSlot } from "@/types";

// Move ids the codec emits (lowercase, no punctuation) for hazard
// removal moves. Tracked separately from `PokemonRole` since "removal"
// isn't a role — it's a per-team capability flag.
const HAZARD_REMOVAL_MOVES = new Set([
  "rapidspin",
  "defog",
  "tidyup",
  "courtchange",
]);

const WIN_CONDITION_ROLES: PokemonRole[] = [
  "physical-sweeper",
  "special-sweeper",
  "wallbreaker",
];

/**
 * Critical-need point values — applied as a bonus when a candidate
 * set confirms a role / capability the rest of the team is missing.
 * Tuned to dwarf the +5 usage rank bonus so a niche-but-needed set
 * beats a popular-but-redundant one.
 */
const NEED_BONUS = {
  "hazard-setter": 18,
  removal: 18,
  pivot: 10,
  support: 8,
  "physical-wall": 8,
  "special-wall": 12,
  "mixed-wall": 8,
  win: 6,
} as const;

/** Per-overlap penalty when a candidate set adds a role/cap already
 *  covered twice (or more) by the rest of the team. */
const OVERLAP_PENALTY = 5;

// ─── Public API ──────────────────────────────────────────────────────

export interface SetChoice {
  slotIndex: number;
  pokemonId: string;
  setName: string;
  patch: Partial<TeamSlot>;
  /** Short reasons surfaced in the post-optimisation toast. */
  reasons: string[];
}

export interface OptimizeForTeamResult {
  choices: SetChoice[];
  /** Pokémon names that have no Smogon sets at all — left untouched. */
  skipped: string[];
  /** Roles confirmed before the optimisation. */
  rolesBefore: Set<string>;
  /** Roles confirmed after applying the chosen sets. */
  rolesAfter: Set<string>;
}

/**
 * Pick the team-aware best Smogon set for every filled slot.
 * Returns the per-slot choices and the before/after role coverage
 * snapshot so the caller can build a meaningful toast.
 */
export function optimizeForTeam(slots: TeamSlot[]): OptimizeForTeamResult {
  // Resolve filled slots + their available sets up-front.
  type Candidate = {
    slotIndex: number;
    pokemon: Pokemon;
    stats: SmogonStats | null;
    sets: SmogonSet[];
  };
  const filled: Candidate[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    if (!s.pokemonId) continue;
    const pokemon = POKEMON_BY_ID[s.pokemonId];
    if (!pokemon) continue;
    const stats = getSmogonStats(pokemon.id);
    const sets = stats?.sets ?? [];
    if (sets.length === 0) {
      skipped.push(pokemon.name);
      continue;
    }
    filled.push({ slotIndex: i, pokemon, stats: stats ?? null, sets });
  }

  // Snapshot current roles before any optimisation runs — used by the
  // toast to show what got restored / what's still missing.
  const rolesBefore = teamCapabilitySet(slots);

  // Baseline: each mon uses its set[0] (the optimise-individually
  // behaviour). We score against this baseline minus the current mon
  // so picks aren't punished for the role they already provide.
  const currentChoice = new Map<number, SetChoice>();
  for (const c of filled) {
    const top = c.sets[0]!;
    const patch = smogonSetToSlotPatch(top, c.pokemon, c.stats ?? undefined);
    currentChoice.set(c.slotIndex, {
      slotIndex: c.slotIndex,
      pokemonId: c.pokemon.id,
      setName: top.name,
      patch,
      reasons: [],
    });
  }

  // Two greedy passes — first picks set the global picture, second
  // pass lets early choices revise themselves now that the rest is
  // pinned down.
  for (let pass = 0; pass < 2; pass++) {
    for (const c of filled) {
      const teamCaps = capsFromChoices(currentChoice, c.slotIndex);
      let best: SetChoice | null = null;
      let bestScore = -Infinity;
      for (let i = 0; i < c.sets.length; i++) {
        const set = c.sets[i]!;
        const patch = smogonSetToSlotPatch(set, c.pokemon, c.stats ?? undefined);
        const { score, reasons } = scoreSet(
          set,
          i,
          patch,
          c.pokemon,
          teamCaps,
        );
        if (score > bestScore) {
          bestScore = score;
          best = {
            slotIndex: c.slotIndex,
            pokemonId: c.pokemon.id,
            setName: set.name,
            patch,
            reasons,
          };
        }
      }
      if (best) currentChoice.set(c.slotIndex, best);
    }
  }

  const choices = filled.map((c) => currentChoice.get(c.slotIndex)!);

  // After-state capabilities — used by the toast to show what
  // recovered. Walk the choice patches as if they were already slots.
  const afterSlots: TeamSlot[] = slots.map((s, i) => {
    const pick = currentChoice.get(i);
    if (!pick) return s;
    return { ...s, ...pick.patch };
  });
  const rolesAfter = teamCapabilitySet(afterSlots);

  return { choices, skipped, rolesBefore, rolesAfter };
}

// ─── Internals ───────────────────────────────────────────────────────

/**
 * Team capability tally for the "needs" map. Roles use their
 * `PokemonRole` ids; the lone non-role capability — `removal` — is
 * carried as a string flag so the picker can reason about it
 * uniformly. Count = how many mons confirm the cap.
 */
type CapMap = Map<string, number>;

/**
 * Convert a slot to its set of confirmed capabilities (roles +
 * removal + type-based traits). Uses `confirmedRolesFromMoves` for
 * the role list, a separate move scan for `removal`, and the
 * Pokémon's types/ability for the type-based caps a "core" can pivot
 * around (spinblocker, key immunities).
 *
 * Exported so `team-analysis.ts`'s replacement search can compute a
 * "what does this slot uniquely provide?" diff and reject swaps that
 * destroy a critical contribution.
 *
 * Pokémon is optional — when omitted the function falls back to
 * move-only caps. Pass it whenever you can (the picker / replacement
 * search) so spinblockers / immunities are tracked.
 */
export function slotCapabilities(
  slot: TeamSlot,
  pokemon?: Pokemon,
): string[] {
  const caps: string[] = [];
  if (slot.selectedMoves && slot.selectedMoves.length > 0) {
    caps.push(...confirmedRolesFromMoves(slot.selectedMoves));
    if (slot.selectedMoves.some((m) => HAZARD_REMOVAL_MOVES.has(m))) {
      caps.push("removal");
    }
    // "win" is an umbrella over sweepers/wallbreakers — collapse for
    // the need map so we don't double-count Dragon Dance Dragonite as
    // both physical-sweeper and wallbreaker for the win-con check.
    if (caps.some((r) => WIN_CONDITION_ROLES.includes(r as PokemonRole))) {
      caps.push("win");
    }
  }
  // Type-based caps — these depend on the species + chosen ability,
  // not the set. Even a bare slot (no moves declared) still
  // contributes spinblocker / immunities / resists from typing alone.
  //
  // We split immunities (0× damage, hard floor) from resists (0.25×
  // or 0.5×, soft floor): immunities get the bigger penalty, resists
  // only chip in when no other team member resists the same type.
  //
  // Ability-based immunities are gated on `selectedAbility` so we
  // don't credit talents the user hasn't actually chosen — same
  // strict policy the role scorer follows.
  if (pokemon) {
    const types = pokemon.types;
    const ability = slot.selectedAbility;

    if (types.includes("ghost")) caps.push("spinblocker");

    // ─── Immunities (0× damage) ───────────────────────────────────
    if (types.includes("flying") || ability === "Levitate") {
      caps.push("ground-immune");
    }
    if (
      types.includes("ground") ||
      ability === "Volt Absorb" ||
      ability === "Lightning Rod" ||
      ability === "Motor Drive"
    ) {
      caps.push("electric-immune");
    }
    if (
      types.includes("steel") ||
      ability === "Immunity" ||
      ability === "Poison Heal" ||
      ability === "Pastel Veil"
    ) {
      caps.push("poison-immune");
    }
    if (types.includes("fairy")) caps.push("dragon-immune");
    if (types.includes("dark") || ability === "Telepathy") {
      caps.push("psychic-immune");
    }
    if (types.includes("ghost")) {
      caps.push("normal-immune");
      caps.push("fighting-immune");
    }
    if (types.includes("normal")) caps.push("ghost-immune");
    if (
      ability === "Water Absorb" ||
      ability === "Storm Drain" ||
      ability === "Dry Skin"
    ) {
      caps.push("water-immune");
    }
    if (ability === "Flash Fire") caps.push("fire-immune");
    if (ability === "Sap Sipper") caps.push("grass-immune");
    if (ability === "Earth Eater") caps.push("ground-immune");
    if (ability === "Well-Baked Body") caps.push("fire-immune");
    if (ability === "Bulletproof") caps.push("bullet-immune");
    // hazard-anchor: abilities that immunise the user to *all* status
    // moves, including Defog / Taunt / phazing → the Pokémon actively
    // protects the team's hazard gameplan from being un-stacked.
    // Match both EN-spaced (Smogon form) and EN-collapsed (Cobblemon
    // dex form) since slot.selectedAbility may carry either.
    if (ability === "Good as Gold" || ability === "Goodasgold") {
      caps.push("hazard-anchor");
    }

    // ─── Resists (0.25× / 0.5× damage) ────────────────────────────
    // These are softer caps — penalty only bites when the team has
    // no alternative resister for the type. Used to flag swaps that
    // would leave the team with zero answers to Fire / Ice / Fairy
    // offence (the three offensive types the user explicitly asked
    // about).
    if (
      types.includes("steel") ||
      types.includes("poison") ||
      types.includes("fire")
    ) {
      caps.push("fairy-resist");
    }
    if (
      types.includes("water") ||
      types.includes("fire") ||
      types.includes("rock") ||
      types.includes("dragon") ||
      ability === "Heatproof" ||
      ability === "Thick Fat"
    ) {
      caps.push("fire-resist");
    }
    if (
      types.includes("steel") ||
      types.includes("fire") ||
      types.includes("water") ||
      types.includes("ice") ||
      ability === "Thick Fat"
    ) {
      caps.push("ice-resist");
    }
  }
  return Array.from(new Set(caps));
}

/**
 * Point values for each critical capability — same numbers the
 * team-aware set picker uses, exported so the replacement search
 * weighs them identically when computing the cost of removing a
 * Pokémon that uniquely provides a cap.
 */
export const CAP_NEED_BONUS: Record<string, number> = {
  // Role caps — biggest weight, these define team identity. Tuned
  // upward from the initial pass so the suggestion engine refuses
  // swaps that strip a unique pivot / win condition / Smogon-tier
  // ability talent. The user explicitly called out swaps like
  // Motisma → Ogerpon (loses Levitate + pivot) and Flotte-Mèche →
  // Florges (loses spé sweeper + revenge) — those land here.
  "hazard-setter": 18,
  removal: 18,
  pivot: 14,
  support: 8,
  "physical-wall": 8,
  "special-wall": 12,
  "mixed-wall": 8,
  win: 12,
  "revenge-killer": 8,
  spinblocker: 10,
  "hazard-anchor": 18,
  // Immunities (0× damage). Magnitudes scaled by how often the type
  // is offensively spammed in the metagame: Ground / Fighting hit
  // hard so losing those immunities matters more than losing the
  // Psychic-immune that Dark-types provide.
  "ground-immune": 6,
  "electric-immune": 4,
  "fighting-immune": 5,
  "dragon-immune": 5,
  "fire-immune": 5,
  "water-immune": 4,
  "grass-immune": 3,
  "poison-immune": 3,
  "psychic-immune": 3,
  "normal-immune": 3,
  "ghost-immune": 4,
  "bullet-immune": 2,
  // Resists (0.25× / 0.5×). Smaller magnitude — they're only worth
  // citing when no other team member fills the gap, so the
  // unique-cap test in `findBestReplacements` already keeps the
  // noise down.
  "fairy-resist": 4,
  "fire-resist": 4,
  "ice-resist": 4,
};

/** FR labels for cap ids — used by the replacement-suggestion UI to
 *  surface negative factors ("perd pivot", "perd spinblocker", …). */
export const CAP_LABEL_FR: Record<string, string> = {
  "hazard-setter": "hazards",
  removal: "removal",
  pivot: "pivot",
  support: "support",
  "physical-wall": "mur phys",
  "special-wall": "mur spé",
  "mixed-wall": "mur mixte",
  win: "win condition",
  "revenge-killer": "revenge",
  spinblocker: "spinblocker",
  "ground-immune": "immunité Sol",
  "electric-immune": "immunité Électrik",
  "fighting-immune": "immunité Combat",
  "dragon-immune": "immunité Dragon",
  "fire-immune": "immunité Feu",
  "water-immune": "immunité Eau",
  "grass-immune": "immunité Plante",
  "poison-immune": "immunité Poison",
  "psychic-immune": "immunité Psy",
  "normal-immune": "immunité Normal",
  "ghost-immune": "immunité Spectre",
  "bullet-immune": "immunité Boule",
  "fairy-resist": "résiste Fée",
  "fire-resist": "résiste Feu",
  "ice-resist": "résiste Glace",
};

/** Collect every cap currently confirmed across the team. */
function teamCapabilitySet(slots: TeamSlot[]): Set<string> {
  const out = new Set<string>();
  for (const s of slots) {
    for (const c of slotCapabilities(s)) out.add(c);
  }
  return out;
}

/**
 * Team capability *count* map, excluding the slot we're currently
 * evaluating. We exclude that slot so the picker doesn't punish a
 * Pokémon for keeping a role it itself provides.
 */
function capsFromChoices(
  choices: Map<number, SetChoice>,
  excludeIndex: number,
): CapMap {
  const counts: CapMap = new Map();
  for (const [idx, choice] of choices) {
    if (idx === excludeIndex) continue;
    const caps = slotCapabilities({
      pokemonId: choice.pokemonId,
      ...choice.patch,
    });
    for (const c of caps) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return counts;
}

/**
 * Score one candidate set against the rest of the team. Critical-need
 * fills dominate; usage rank is a tiebreaker; overlap is a soft
 * penalty so the picker never picks an absurdly low-usage set just to
 * dodge overlap.
 */
function scoreSet(
  set: SmogonSet,
  setIndex: number,
  patch: Partial<TeamSlot>,
  _pokemon: Pokemon,
  teamCaps: CapMap,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Usage rank — top set gets +5, second +3, third +1, deeper sets 0.
  // Caps the popularity weight so a niche-but-needed set can still win.
  const usageBonus = Math.max(0, 5 - setIndex * 2);
  if (usageBonus > 0) {
    score += usageBonus;
    if (setIndex === 0) reasons.push("set principal Smogon");
  }

  const myCaps = slotCapabilities({
    pokemonId: "",
    ...patch,
  });

  for (const cap of myCaps) {
    const have = teamCaps.get(cap) ?? 0;
    const need = NEED_BONUS[cap as keyof typeof NEED_BONUS];
    if (have === 0 && need) {
      // Critical-need fill — team had zero of this cap before.
      score += need;
      reasons.push(`comble ${capLabelFr(cap)}`);
    } else if (have >= 2 && need) {
      // Overlap — soft penalty per redundant cap.
      score -= OVERLAP_PENALTY;
      reasons.push(`${capLabelFr(cap)} déjà couvert`);
    }
  }

  // Trim — too many reasons clutter the toast.
  return { score, reasons: reasons.slice(0, 3) };
}

/** Short FR label for a team capability — drives the toast text. */
function capLabelFr(cap: string): string {
  const map: Record<string, string> = {
    "hazard-setter": "hazards",
    removal: "removal",
    pivot: "pivot",
    support: "support",
    "physical-wall": "mur phys",
    "special-wall": "mur spé",
    "mixed-wall": "mur mixte",
    win: "win condition",
    "physical-sweeper": "sweeper phys",
    "special-sweeper": "sweeper spé",
    wallbreaker: "wallbreaker",
    "revenge-killer": "revenge",
    lead: "lead",
    "hazard-setter ": "hazards",
  };
  return map[cap] ?? cap;
}

/** FR label list, sorted, for the "Rôles restaurés / manquants"
 *  sections of the toast. Skips role aliases ("win", which doubles
 *  up with sweeper/wallbreaker) for readability. */
export function formatCapList(caps: Set<string>): string[] {
  const PREFER: string[] = [
    "hazard-setter",
    "removal",
    "pivot",
    "support",
    "physical-wall",
    "special-wall",
    "mixed-wall",
    "win",
  ];
  return PREFER.filter((c) => caps.has(c)).map(capLabelFr);
}
