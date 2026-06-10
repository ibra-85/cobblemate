import { lookupItem } from "./items-pokeapi";

/**
 * Fossil-revival recipes — base species id → fossil item(s) to insert
 * in the Fossil Analyzer. The Galar species need TWO fossilized
 * pieces combined (e.g. Dracovish = Fossile Dragon + Fossile
 * Poisson); every other species revives from a single fossil.
 *
 * Server-safe (plain data + PokéAPI name lookup) so the Pokédex page
 * can probe `getFossilRecipe` during SSR.
 *
 * Source: https://wiki.cobblemon.com/index.php/Fossil — keep in sync
 * when Cobblemon adds new revivable species.
 */
const FOSSIL_RECIPES: Record<string, string[]> = {
  // ─── Single-fossil revivals ─────────────────────────────────────
  omanyte:    ["cobblemon:helix_fossil"],
  kabuto:     ["cobblemon:dome_fossil"],
  aerodactyl: ["cobblemon:old_amber"],
  lileep:     ["cobblemon:root_fossil"],
  anorith:    ["cobblemon:claw_fossil"],
  cranidos:   ["cobblemon:skull_fossil"],
  shieldon:   ["cobblemon:armor_fossil"],
  tirtouga:   ["cobblemon:cover_fossil"],
  archen:     ["cobblemon:plume_fossil"],
  tyrunt:     ["cobblemon:jaw_fossil"],
  amaura:     ["cobblemon:sail_fossil"],
  // ─── Galar combination fossils — two pieces per revival ─────────
  dracozolt:  ["cobblemon:fossilized_drake", "cobblemon:fossilized_bird"],
  arctozolt:  ["cobblemon:fossilized_bird",  "cobblemon:fossilized_dino"],
  dracovish:  ["cobblemon:fossilized_drake", "cobblemon:fossilized_fish"],
  arctovish:  ["cobblemon:fossilized_dino",  "cobblemon:fossilized_fish"],
};

/** Fossil item ids needed to revive this species, or `null` when it
 *  isn't a fossil Pokémon. */
export function getFossilRecipe(pokemonId: string): string[] | null {
  return FOSSIL_RECIPES[pokemonId] ?? null;
}

/** FR display name for a fossil item id ("cobblemon:fossilized_fish"
 *  → "Fossile Poisson"). Falls back to the EN name, then the slug. */
export function fossilItemName(itemId: string): string {
  const slug = itemId.split(":").pop() ?? itemId;
  const entry = lookupItem(slug);
  return entry?.nameFr ?? entry?.nameEn ?? slug.replace(/_/g, " ");
}
