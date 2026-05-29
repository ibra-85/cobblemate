import generated from "./smogon-generated.json";
import { lookupItem } from "./items-pokeapi";
import { lookupAbility } from "./abilities-pokeapi";

/**
 * Aggregated Smogon usage data for one Pokémon, picked from the
 * tier where the species has the highest weighted usage. Built by
 * `scripts/build-smogon-data.mjs` from the public Smogon stats and
 * curated sets on `pkmn.github.io/smogon/data`.
 *
 * Names are English (the source format). Move names are kept as-is
 * — the UI can resolve them to French through {@link smogonMoveToId}
 * when our `MOVES` table happens to know the move.
 */
export interface SmogonStats {
  tier: string;
  usage: number;
  abilities: { name: string; share: number }[];
  items:     { name: string; share: number }[];
  moves:     { name: string; share: number }[];
  teraTypes: { name: string; share: number }[];
  teammates: { id: string; name: string; share: number }[];
  spread:    { nature: string; evs: SmogonEvs; share: number } | null;
  /**
   * Every curated Smogon set for this mon, ordered as Smogon analysts
   * recommend (most popular role first). Empty for tiers that don't
   * ship curated sets — the UI falls back to a usage-based card.
   */
  sets:      SmogonSet[];
}

export interface SmogonEvs {
  hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number;
}

export interface SmogonSet {
  name: string;
  ability: string | null;
  item: string | null;
  nature: string | null;
  evs: SmogonEvs;
  ivs?: SmogonEvs;
  moves: string[];
  teraType: string | null;
}

const DATA = generated as Record<string, SmogonStats>;

export function getSmogonStats(appId: string): SmogonStats | null {
  return DATA[appId] ?? null;
}

/**
 * Smogon item name (e.g. "Choice Specs") → slug used by the texture
 * files copied into `public/images/items/cobblemon/`. Mirrors the
 * `itemNameToSlug` helper in the build script — keep them in sync.
 */
export function smogonItemToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Primary local path: Cobblemon mod texture (Minecraft pixel look).
 * Covers ~100 of the 130 items the Smogon stats reference. The icon
 * component falls back to {@link smogonItemImageBulbapedia} for items
 * the Cobblemon mod doesn't ship yet (paradox energy, Ogerpon masks,
 * Arceus plates, legendary form items).
 */
export function smogonItemImage(name: string): string {
  return `/images/items/cobblemon/${smogonItemToSlug(name)}.png`;
}

/**
 * Secondary local path: Bulbapedia bag-sprite mirrored at build
 * time. Covers every gen 9 item the mod doesn't have yet, fetched
 * via MediaWiki's `Special:FilePath` redirect.
 */
export function smogonItemImageBulbapedia(name: string): string {
  return `/images/items/bulbapedia/${smogonItemToSlug(name)}.png`;
}

/**
 * Smogon move name (e.g. "Sucker Punch") → Cobblemon/PokeAPI move id
 * (e.g. "suckerpunch"). Drops every non-alphanumeric character so the
 * id matches whatever lives in `MOVES`/`notableMoves`.
 */
export function smogonMoveToId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Moves DB lives in `@/data/moves`; we re-export here so callers
// that already import smogon-side helpers don't have to add a second
// import line.
export { lookupMove } from "./moves";

// ─── FR labels for the names Smogon ships in English ─────────────────
//
// Coverage isn't exhaustive (260 abilities × 130 items × 441 moves ≈
// too much for a hand table). We translate the top ~30 of each — the
// rest fall through to English with a slightly muted style so the user
// can tell it's untranslated.

const ABILITIES_FR: Record<string, string> = {
  "Blaze": "Brasier",
  "Torrent": "Torrent",
  "Overgrow": "Engrais",
  "Solar Power": "Force Soleil",
  "Drought": "Sécheresse",
  "Drizzle": "Crachin",
  "Sand Stream": "Sable Volant",
  "Snow Warning": "Alerte Neige",
  "Chlorophyll": "Chlorophylle",
  "Swift Swim": "Glissade",
  "Sand Rush": "Baigne Sable",
  "Slush Rush": "Chasse-Neige",
  "Levitate": "Lévitation",
  "Magic Guard": "Garde Magik",
  "Multiscale": "Multiécaille",
  "Intimidate": "Intimidation",
  "Protosynthesis": "Protosynthèse",
  "Quark Drive": "Charge Quantique",
  "Unaware": "Inconscient",
  "Regenerator": "Régé-Force",
  "Prankster": "Farceur",
  "Speed Boost": "Turbo",
  "Sheer Force": "Brutalité",
  "Tough Claws": "Coup Dur",
  "Adaptability": "Adaptabilité",
  "Technician": "Technicien",
  "Huge Power": "Coloforce",
  "Pure Power": "Force Pure",
  "Sword of Ruin": "Épée Désastre",
  "Beads of Ruin": "Perles Désastre",
  "Tablets of Ruin": "Tablettes Désastre",
  "Vessel of Ruin": "Récipient Désastre",
  "Magic Bounce": "Miroir Magik",
  "Mold Breaker": "Brise Moule",
  "Sturdy": "Solide",
  "Flash Fire": "Torche",
  "Water Absorb": "Absorbe Eau",
  "Volt Absorb": "Absorbe-Volt",
  "Lightning Rod": "Paratonnerre",
  "Storm Drain": "Lavabo",
  "Thick Fat": "Isolant",
  "Guts": "Cran",
  "Natural Cure": "Médic Nature",
  "Serene Grace": "Sérénité",
  "Poison Heal": "Soin Poison",
  "Iron Fist": "Poing de Fer",
  "Strong Jaw": "Prognathe",
  "Pixilate": "Fée-en-Ciel",
  "Aerilate": "Coloraile",
  "Refrigerate": "Cologlace",
  "Galvanize": "Électromorphe",
  "Sand Veil": "Voile Sable",
  "Snow Cloak": "Rideau Neige",
  "Filter": "Filtre",
  "Solid Rock": "Solide Roc",
  "Punk Rock": "Punk Rock",
  "Triage": "Phytopremiers",
  "Gale Wings": "Ailes Bourrasque",
  "Defiant": "Acharné",
  "Competitive": "Battant",
  "Pressure": "Pression",
  "Cursed Body": "Corps Maudit",
  "Static": "Statik",
  "Flame Body": "Corps Ardent",
  "Poison Point": "Point Poison",
  "Rough Skin": "Peau Dure",
  "Iron Barbs": "Épine de Fer",
  "Stamina": "Constance",
};

/**
 * Hand-tuned overrides for items where PokéAPI's official Nintendo
 * translation reads awkwardly in this UI's context. Empty by default
 * — the 2176-entry PokéAPI dump (see `items-pokeapi.ts`) handles
 * everything. Add an entry here only when an official string is
 * genuinely worse than the community wording.
 */
const ITEMS_FR: Record<string, string> = {};

const TYPES_FR: Record<string, string> = {
  Normal: "Normal", Fire: "Feu", Water: "Eau", Electric: "Électrik",
  Grass: "Plante", Ice: "Glace", Fighting: "Combat", Poison: "Poison",
  Ground: "Sol", Flying: "Vol", Psychic: "Psy", Bug: "Insecte",
  Rock: "Roche", Ghost: "Spectre", Dragon: "Dragon", Dark: "Ténèbres",
  Steel: "Acier", Fairy: "Fée", Stellar: "Stellaire",
};

/**
 * French label + translation status for an ability. Lookup order:
 *   1. Hand-curated `ABILITIES_FR` overrides — kept as primary because
 *      PokéAPI ships incomplete FR data for older abilities (Torrent,
 *      Insomnia, Plus…) and a few translations differ from common
 *      community wording.
 *   2. PokéAPI generated dump (371 entries, ~300 with FR strings).
 *   3. Raw English name as last resort.
 */
export function frAbility(name: string): { label: string; translated: boolean } {
  const override = ABILITIES_FR[name];
  if (override) return { label: override, translated: true };
  const generated = lookupAbility(name);
  if (generated && generated.nameFr !== generated.nameEn) {
    return { label: generated.nameFr, translated: true };
  }
  return { label: name, translated: false };
}

/**
 * French label + translation status for an item. Lookup order:
 *   1. Hand-curated `ITEMS_FR` overrides — kept for cases where the
 *      official PokéAPI string reads awkwardly in the meta UI.
 *   2. PokéAPI generated dump (2176 items, official Nintendo strings).
 *   3. Raw English name as last resort.
 */
export function frItem(name: string): { label: string; translated: boolean } {
  const override = ITEMS_FR[name];
  if (override) return { label: override, translated: true };
  const generated = lookupItem(name);
  if (generated) return { label: generated.nameFr, translated: true };
  return { label: name, translated: false };
}

// Re-export so callers don't have to import from two files.
export { lookupItem };
export type { PokeApiItem } from "./items-pokeapi";
export { lookupAbility };
export type { PokeApiAbility } from "./abilities-pokeapi";

export function frTeraType(name: string): string {
  return TYPES_FR[name] ?? name;
}

/** Lowercase Smogon type label to the internal type id ("Fire" → "fire"). */
export function smogonTypeToId(name: string): string {
  return name.toLowerCase();
}
