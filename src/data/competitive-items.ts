/**
 * Curated registry of competitive held items.
 *
 * One source of truth across the app — the slot config dialog, the
 * Pokémon card summary, and any future "item picker" UI all read from
 * here. Each entry carries:
 *
 *  - `id`         stable canonical id, Cobblemon-flavoured (snake_case,
 *                 no prefix). Persisted in saved teams.
 *  - `nameFr`     official French translation (the Pokémon Company
 *                 wording — "Grosses Bottes", "Mouchoir Choix"…).
 *  - `nameEn`     Showdown / Smogon English name. French players
 *                 still recognise items by their English label so
 *                 search needs to hit both.
 *  - `aliases`    free-text alternative spellings used by search.
 *                 Lowercase. Common shortcuts ("boots", "scarf") go
 *                 here so typing them surfaces the item.
 *  - `category`   broad bucket for visual grouping in the UI (held,
 *                 berry, type-resist berry, choice, …).
 *  - `tag`        short usage hint (one cell in the row).
 *
 * Keep entries in the order players think about them: utility items
 * first (Boots, Restes, Orbe Vie, Choice trio), then niche held
 * items, then berries (status berry → type-resist berries grouped by
 * type alphabetically).
 */

export type ItemCategoryHint =
  | "anti-hazard"
  | "sustain"
  | "wallbreak"
  | "speed"
  | "defensive"
  | "utility"
  | "berry"
  | "type-resist-berry"
  | "screen"
  | "boost"
  | "status"
  | "trap"
  | "pinch"
  | "species-specific";

import { lookupItem } from "./items-pokeapi";

export interface CompetitiveItem {
  id: string;
  nameFr: string;
  nameEn: string;
  aliases: string[];
  category: ItemCategoryHint;
  tag?: string;
}

export const COMPETITIVE_ITEMS: CompetitiveItem[] = [
  // ─── Anti-hazard / sustain / wallbreak ─────────────────────────────
  {
    id: "heavy_duty_boots",
    nameFr: "Grosses Bottes",
    nameEn: "Heavy-Duty Boots",
    aliases: ["bottes", "boots", "heavy duty"],
    category: "anti-hazard",
    tag: "Anti-hazard",
  },
  {
    id: "leftovers",
    nameFr: "Restes",
    nameEn: "Leftovers",
    aliases: ["restes", "leftovers", "lefto"],
    category: "sustain",
    tag: "Sustain",
  },
  {
    id: "black_sludge",
    nameFr: "Boue Noire",
    nameEn: "Black Sludge",
    aliases: ["boue noire", "black sludge", "sludge"],
    category: "sustain",
    tag: "Sustain Poison",
  },
  {
    id: "life_orb",
    nameFr: "Orbe Vie",
    nameEn: "Life Orb",
    aliases: ["orbe vie", "life orb", "orb"],
    category: "wallbreak",
    tag: "Wallbreak",
  },
  {
    id: "expert_belt",
    nameFr: "Ceinture Pro",
    nameEn: "Expert Belt",
    aliases: ["ceinture pro", "expert belt"],
    category: "wallbreak",
    tag: "Couverture SE",
  },
  {
    id: "muscle_band",
    nameFr: "Bandeau Muscle",
    nameEn: "Muscle Band",
    aliases: ["bandeau muscle", "muscle band"],
    category: "wallbreak",
    tag: "Boost phys.",
  },
  {
    id: "wise_glasses",
    nameFr: "Lunettes Sages",
    nameEn: "Wise Glasses",
    aliases: ["lunettes sages", "wise glasses"],
    category: "wallbreak",
    tag: "Boost spé.",
  },

  // ─── Choice items ─────────────────────────────────────────────────
  {
    id: "choice_band",
    nameFr: "Bandeau Choix",
    nameEn: "Choice Band",
    aliases: ["bandeau choix", "choice band", "cb"],
    category: "wallbreak",
    tag: "Wallbreak phys.",
  },
  {
    id: "choice_specs",
    nameFr: "Lunettes Choix",
    nameEn: "Choice Specs",
    aliases: ["lunettes choix", "choice specs", "specs"],
    category: "wallbreak",
    tag: "Wallbreak spé.",
  },
  {
    id: "choice_scarf",
    nameFr: "Mouchoir Choix",
    nameEn: "Choice Scarf",
    aliases: ["mouchoir choix", "choice scarf", "scarf"],
    category: "speed",
    tag: "Speed control",
  },

  // ─── Defensive / Utility ──────────────────────────────────────────
  {
    id: "assault_vest",
    nameFr: "Veste de Combat",
    nameEn: "Assault Vest",
    aliases: ["veste de combat", "assault vest", "av"],
    category: "defensive",
    tag: "Mur spé.",
  },
  {
    id: "rocky_helmet",
    nameFr: "Casque Brut",
    nameEn: "Rocky Helmet",
    aliases: ["casque brut", "rocky helmet"],
    category: "defensive",
    tag: "Contact punish",
  },
  {
    id: "air_balloon",
    nameFr: "Ballon",
    nameEn: "Air Balloon",
    aliases: ["ballon", "air balloon", "balloon"],
    category: "utility",
    tag: "Immunité Sol",
  },
  {
    id: "focus_sash",
    nameFr: "Ceinture Force",
    nameEn: "Focus Sash",
    aliases: ["ceinture force", "focus sash", "sash"],
    category: "utility",
    tag: "Anti-OHKO",
  },
  {
    id: "safety_goggles",
    nameFr: "Lunettes Filtre",
    nameEn: "Safety Goggles",
    aliases: ["lunettes filtre", "safety goggles", "goggles"],
    category: "utility",
    tag: "Anti-météo/poudre",
  },
  {
    id: "eviolite",
    nameFr: "Évoluroc",
    nameEn: "Eviolite",
    aliases: ["evoluroc", "évoluroc", "eviolite"],
    category: "defensive",
    tag: "Bulk pré-évolué",
  },
  {
    id: "clear_amulet",
    nameFr: "Amulette Apaisante",
    nameEn: "Clear Amulet",
    aliases: ["amulette apaisante", "clear amulet"],
    category: "utility",
    tag: "Anti-baisse",
  },
  {
    id: "covert_cloak",
    nameFr: "Manteau Furtif",
    nameEn: "Covert Cloak",
    aliases: ["manteau furtif", "covert cloak"],
    category: "utility",
    tag: "Anti-secondaire",
  },
  {
    id: "shed_shell",
    nameFr: "Mue",
    nameEn: "Shed Shell",
    aliases: ["mue", "shed shell"],
    category: "utility",
    tag: "Anti-trap",
  },

  // ─── Screens / Boosts ─────────────────────────────────────────────
  {
    id: "light_clay",
    nameFr: "Lumargile",
    nameEn: "Light Clay",
    aliases: ["lumargile", "light clay", "clay"],
    category: "screen",
    tag: "Écrans +3 tours",
  },
  {
    id: "booster_energy",
    nameFr: "Énergie Booster",
    nameEn: "Booster Energy",
    aliases: ["energie booster", "énergie booster", "booster energy"],
    category: "boost",
    tag: "Paradoxe",
  },
  {
    id: "weakness_policy",
    nameFr: "Vulné-Assurance",
    nameEn: "Weakness Policy",
    aliases: ["vulne assurance", "vulné-assurance", "weakness policy"],
    category: "boost",
    tag: "Setup trigger",
  },
  {
    id: "mirror_herb",
    nameFr: "Herbe Imitatrice",
    nameEn: "Mirror Herb",
    aliases: ["herbe imitatrice", "mirror herb"],
    category: "boost",
    tag: "Copy boost",
  },
  {
    id: "loaded_dice",
    nameFr: "Dés Pipés",
    nameEn: "Loaded Dice",
    aliases: ["des pipes", "dés pipés", "loaded dice", "dice"],
    category: "boost",
    tag: "Multi-hit",
  },
  {
    id: "punching_glove",
    nameFr: "Gants Boxe",
    nameEn: "Punching Glove",
    aliases: ["gants boxe", "punching glove"],
    category: "boost",
    tag: "Punch +10 %",
  },
  {
    id: "throat_spray",
    nameFr: "Sirop Vocal",
    nameEn: "Throat Spray",
    aliases: ["sirop vocal", "throat spray"],
    category: "boost",
    tag: "Sound +SpA",
  },
  {
    id: "white_herb",
    nameFr: "Herbe Blanche",
    nameEn: "White Herb",
    aliases: ["herbe blanche", "white herb"],
    category: "boost",
    tag: "Reset baisses",
  },
  {
    id: "mental_herb",
    nameFr: "Herbe Mental",
    nameEn: "Mental Herb",
    aliases: ["herbe mental", "mental herb"],
    category: "utility",
    tag: "Anti-statut",
  },

  // ─── Type-coverage / damage boost gems ────────────────────────────
  {
    id: "black_glasses",
    nameFr: "Lunettes Noires",
    nameEn: "Black Glasses",
    aliases: ["lunettes noires", "black glasses"],
    category: "wallbreak",
    tag: "+20 % Ténèbres",
  },
  {
    id: "charcoal",
    nameFr: "Charbon",
    nameEn: "Charcoal",
    aliases: ["charbon", "charcoal"],
    category: "wallbreak",
    tag: "+20 % Feu",
  },
  {
    id: "mystic_water",
    nameFr: "Eau Mystique",
    nameEn: "Mystic Water",
    aliases: ["eau mystique", "mystic water"],
    category: "wallbreak",
    tag: "+20 % Eau",
  },
  {
    id: "miracle_seed",
    nameFr: "Graine Miracle",
    nameEn: "Miracle Seed",
    aliases: ["graine miracle", "miracle seed"],
    category: "wallbreak",
    tag: "+20 % Plante",
  },
  {
    id: "magnet",
    nameFr: "Aimant",
    nameEn: "Magnet",
    aliases: ["aimant", "magnet"],
    category: "wallbreak",
    tag: "+20 % Électrik",
  },
  {
    id: "never_melt_ice",
    nameFr: "Glace Éternelle",
    nameEn: "Never-Melt Ice",
    aliases: ["glace eternelle", "glace éternelle", "never melt ice", "ice"],
    category: "wallbreak",
    tag: "+20 % Glace",
  },
  {
    id: "soft_sand",
    nameFr: "Sable Doux",
    nameEn: "Soft Sand",
    aliases: ["sable doux", "soft sand"],
    category: "wallbreak",
    tag: "+20 % Sol",
  },
  {
    id: "sharp_beak",
    nameFr: "Bec Pointu",
    nameEn: "Sharp Beak",
    aliases: ["bec pointu", "sharp beak"],
    category: "wallbreak",
    tag: "+20 % Vol",
  },
  {
    id: "twisted_spoon",
    nameFr: "Cuillère Tordue",
    nameEn: "Twisted Spoon",
    aliases: ["cuillere tordue", "cuillère tordue", "twisted spoon"],
    category: "wallbreak",
    tag: "+20 % Psy",
  },
  {
    id: "silver_powder",
    nameFr: "Poudre Argentée",
    nameEn: "Silver Powder",
    aliases: ["poudre argentee", "poudre argentée", "silver powder"],
    category: "wallbreak",
    tag: "+20 % Insecte",
  },
  {
    id: "hard_stone",
    nameFr: "Pierre Dure",
    nameEn: "Hard Stone",
    aliases: ["pierre dure", "hard stone"],
    category: "wallbreak",
    tag: "+20 % Roche",
  },
  {
    id: "spell_tag",
    nameFr: "Rune Sort",
    nameEn: "Spell Tag",
    aliases: ["rune sort", "spell tag"],
    category: "wallbreak",
    tag: "+20 % Spectre",
  },
  {
    id: "dragon_fang",
    nameFr: "Croc Dragon",
    nameEn: "Dragon Fang",
    aliases: ["croc dragon", "dragon fang"],
    category: "wallbreak",
    tag: "+20 % Dragon",
  },
  {
    id: "metal_coat",
    nameFr: "Peau Métal",
    nameEn: "Metal Coat",
    aliases: ["peau metal", "peau métal", "metal coat"],
    category: "wallbreak",
    tag: "+20 % Acier",
  },
  {
    id: "fairy_feather",
    nameFr: "Plume Fée",
    nameEn: "Fairy Feather",
    aliases: ["plume fee", "plume fée", "fairy feather"],
    category: "wallbreak",
    tag: "+20 % Fée",
  },

  // ─── Switch / Pivot items ─────────────────────────────────────────
  {
    id: "red_card",
    nameFr: "Carton Rouge",
    nameEn: "Red Card",
    aliases: ["carton rouge", "red card"],
    category: "utility",
    tag: "Force switch",
  },
  {
    id: "eject_button",
    nameFr: "Bouton Fuite",
    nameEn: "Eject Button",
    aliases: ["bouton fuite", "eject button"],
    category: "utility",
    tag: "Auto-pivot",
  },
  {
    id: "eject_pack",
    nameFr: "Sac Fuite",
    nameEn: "Eject Pack",
    aliases: ["sac fuite", "eject pack"],
    category: "utility",
    tag: "Stat-drop pivot",
  },

  // ─── Status orbs ──────────────────────────────────────────────────
  {
    id: "flame_orb",
    nameFr: "Orbe Flamme",
    nameEn: "Flame Orb",
    aliases: ["orbe flamme", "flame orb"],
    category: "status",
    tag: "Auto-brûlure",
  },
  {
    id: "toxic_orb",
    nameFr: "Orbe Toxique",
    nameEn: "Toxic Orb",
    aliases: ["orbe toxique", "toxic orb"],
    category: "status",
    tag: "Facade / Guts",
  },
  {
    id: "sticky_barb",
    nameFr: "Piquants",
    nameEn: "Sticky Barb",
    aliases: ["piquants", "sticky barb"],
    category: "trap",
    tag: "Knock Off ruse",
  },
  {
    id: "iron_ball",
    nameFr: "Boule de Fer",
    nameEn: "Iron Ball",
    aliases: ["boule de fer", "iron ball"],
    category: "trap",
    tag: "Trick",
  },

  // ─── Species-specific ─────────────────────────────────────────────
  {
    id: "leek",
    nameFr: "Poireau",
    nameEn: "Leek",
    aliases: ["poireau", "leek", "stick"],
    category: "species-specific",
    tag: "Crit Canarticho",
  },
  {
    id: "light_ball",
    nameFr: "Boule Lumière",
    nameEn: "Light Ball",
    aliases: ["boule lumiere", "boule lumière", "light ball"],
    category: "species-specific",
    tag: "Pikachu",
  },
  {
    id: "thick_club",
    nameFr: "Os Épais",
    nameEn: "Thick Club",
    aliases: ["os epais", "os épais", "thick club"],
    category: "species-specific",
    tag: "Osselait/Ossatueur",
  },
  {
    id: "metronome",
    nameFr: "Métronome",
    nameEn: "Metronome",
    aliases: ["metronome", "métronome"],
    category: "boost",
    tag: "Move repeat",
  },

  // ─── Status berry ────────────────────────────────────────────────
  {
    id: "lum_berry",
    nameFr: "Baie Prine",
    nameEn: "Lum Berry",
    aliases: ["baie prine", "lum berry", "prine"],
    category: "berry",
    tag: "Soigne tout statut",
  },
  {
    id: "sitrus_berry",
    nameFr: "Baie Sitrus",
    nameEn: "Sitrus Berry",
    aliases: ["baie sitrus", "sitrus berry", "sitrus"],
    category: "berry",
    tag: "Heal 25 % à 50 %",
  },
  {
    id: "chesto_berry",
    nameFr: "Baie Maron",
    nameEn: "Chesto Berry",
    aliases: ["baie maron", "chesto berry", "maron", "chesto"],
    category: "berry",
    tag: "Anti-sommeil",
  },
  {
    id: "oran_berry",
    nameFr: "Baie Oran",
    nameEn: "Oran Berry",
    aliases: ["baie oran", "oran berry", "oran"],
    category: "berry",
    tag: "Heal 10 PV",
  },

  // ─── Type-resist berries (Half SE damage of given type) ──────────
  // The order matches alphabetical TYPE, since players think
  // "qui résiste à Feu ?" → Babiri etc.
  {
    id: "occa_berry",
    nameFr: "Baie Pomroz",
    nameEn: "Occa Berry",
    aliases: ["baie pomroz", "occa berry", "pomroz", "occa"],
    category: "type-resist-berry",
    tag: "½ Feu SE",
  },
  {
    id: "passho_berry",
    nameFr: "Baie Pocpoc",
    nameEn: "Passho Berry",
    aliases: ["baie pocpoc", "passho berry", "pocpoc", "passho"],
    category: "type-resist-berry",
    tag: "½ Eau SE",
  },
  {
    id: "rindo_berry",
    nameFr: "Baie Linkah",
    nameEn: "Rindo Berry",
    aliases: ["baie linkah", "rindo berry", "linkah", "rindo"],
    category: "type-resist-berry",
    tag: "½ Plante SE",
  },
  {
    id: "wacan_berry",
    nameFr: "Baie Parma",
    nameEn: "Wacan Berry",
    aliases: ["baie parma", "wacan berry", "parma", "wacan"],
    category: "type-resist-berry",
    tag: "½ Électrik SE",
  },
  {
    id: "yache_berry",
    nameFr: "Baie Fraigo",
    nameEn: "Yache Berry",
    aliases: ["baie fraigo", "yache berry", "fraigo", "yache"],
    category: "type-resist-berry",
    tag: "½ Glace SE",
  },
  {
    id: "chople_berry",
    nameFr: "Baie Tahaim",
    nameEn: "Chople Berry",
    aliases: ["baie tahaim", "chople berry", "tahaim", "chople"],
    category: "type-resist-berry",
    tag: "½ Combat SE",
  },
  {
    id: "kebia_berry",
    nameFr: "Baie Kébia",
    nameEn: "Kebia Berry",
    aliases: ["baie kebia", "baie kébia", "kebia berry"],
    category: "type-resist-berry",
    tag: "½ Poison SE",
  },
  {
    id: "shuca_berry",
    nameFr: "Baie Jouca",
    nameEn: "Shuca Berry",
    aliases: ["baie jouca", "shuca berry", "jouca", "shuca"],
    category: "type-resist-berry",
    tag: "½ Sol SE",
  },
  {
    id: "coba_berry",
    nameFr: "Baie Cobaba",
    nameEn: "Coba Berry",
    aliases: ["baie cobaba", "coba berry", "cobaba", "coba"],
    category: "type-resist-berry",
    tag: "½ Vol SE",
  },
  {
    id: "payapa_berry",
    nameFr: "Baie Pijaya",
    nameEn: "Payapa Berry",
    aliases: ["baie pijaya", "payapa berry", "pijaya", "payapa"],
    category: "type-resist-berry",
    tag: "½ Psy SE",
  },
  {
    id: "tanga_berry",
    nameFr: "Baie Tonga",
    nameEn: "Tanga Berry",
    aliases: ["baie tonga", "tanga berry", "tonga", "tanga"],
    category: "type-resist-berry",
    tag: "½ Insecte SE",
  },
  {
    id: "charti_berry",
    nameFr: "Baie Charpi",
    nameEn: "Charti Berry",
    aliases: ["baie charpi", "charti berry", "charpi", "charti"],
    category: "type-resist-berry",
    tag: "½ Roche SE",
  },
  {
    id: "kasib_berry",
    nameFr: "Baie Kasiba",
    nameEn: "Kasib Berry",
    aliases: ["baie kasiba", "kasib berry", "kasiba", "kasib"],
    category: "type-resist-berry",
    tag: "½ Spectre SE",
  },
  {
    id: "haban_berry",
    nameFr: "Baie Lansat",
    nameEn: "Haban Berry",
    aliases: ["baie lansat", "haban berry", "lansat", "haban"],
    category: "type-resist-berry",
    tag: "½ Dragon SE",
  },
  {
    id: "colbur_berry",
    nameFr: "Baie Lampou",
    nameEn: "Colbur Berry",
    aliases: ["baie lampou", "colbur berry", "lampou", "colbur"],
    category: "type-resist-berry",
    tag: "½ Ténèbres SE",
  },
  {
    id: "babiri_berry",
    nameFr: "Baie Babiri",
    nameEn: "Babiri Berry",
    aliases: ["baie babiri", "babiri berry", "babiri"],
    category: "type-resist-berry",
    tag: "½ Acier SE",
  },
  {
    id: "roseli_berry",
    nameFr: "Baie Roseli",
    nameEn: "Roseli Berry",
    aliases: ["baie roseli", "roseli berry", "roseli"],
    category: "type-resist-berry",
    tag: "½ Fée SE",
  },
  {
    id: "enigma_berry",
    nameFr: "Baie Énigma",
    nameEn: "Enigma Berry",
    aliases: ["baie enigma", "baie énigma", "enigma berry", "enigma"],
    category: "type-resist-berry",
    tag: "Heal SE 25 %",
  },

  // ─── Pinch berries (stat boost at low HP) ─────────────────────────
  {
    id: "salac_berry",
    nameFr: "Baie Sailak",
    nameEn: "Salac Berry",
    aliases: ["baie sailak", "salac berry", "sailak", "salac"],
    category: "pinch",
    tag: "+1 Vit. ↓PV",
  },
  {
    id: "liechi_berry",
    nameFr: "Baie Lichii",
    nameEn: "Liechi Berry",
    aliases: ["baie lichii", "liechi berry", "lichii", "liechi"],
    category: "pinch",
    tag: "+1 Atk ↓PV",
  },
  {
    id: "petaya_berry",
    nameFr: "Baie Pitaya",
    nameEn: "Petaya Berry",
    aliases: ["baie pitaya", "petaya berry", "pitaya", "petaya"],
    category: "pinch",
    tag: "+1 SpA ↓PV",
  },
  {
    id: "starf_berry",
    nameFr: "Baie Frista",
    nameEn: "Starf Berry",
    aliases: ["baie frista", "starf berry", "frista", "starf"],
    category: "pinch",
    tag: "+2 stat aléatoire",
  },
  {
    id: "custap_berry",
    nameFr: "Baie Spelon",
    nameEn: "Custap Berry",
    aliases: ["baie spelon", "custap berry", "spelon", "custap"],
    category: "pinch",
    tag: "Priorité ↓PV",
  },
];

// ─── Indexes for O(1) lookup ──────────────────────────────────────────
//
// Both keyed by `id` (the persisted form). Built once at module load.

const ITEM_INDEX: Map<string, CompetitiveItem> = new Map();
for (const it of COMPETITIVE_ITEMS) ITEM_INDEX.set(it.id, it);

/**
 * Resolve a stored item id (or close variants) back to the registry
 * entry. Tolerant to the snake_case / kebab-case / "minecraft:"
 * prefixed forms because saved teams may have been written under
 * any of those conventions.
 */
export function findItemById(id: string | undefined): CompetitiveItem | null {
  if (!id) return null;
  const direct = ITEM_INDEX.get(id);
  if (direct) return direct;
  const normalised = id
    .toLowerCase()
    .replace(/^[a-z]+:/, "") // drop Cobblemon / Minecraft prefix
    .replace(/[-\s]/g, "_");
  return ITEM_INDEX.get(normalised) ?? null;
}

/**
 * Display name for an arbitrary stored id. Lookup order:
 *  1. Curated registry (`findItemById`) — best hand-tuned French.
 *  2. PokéAPI dump (`lookupItem` from items-pokeapi, ~2176 entries
 *     with official Nintendo French names) — covers Smogon meta items
 *     the curated registry doesn't ship yet (Wellspring Mask, Soul
 *     Dew, terrain rocks, plate items, etc.).
 *  3. Humanised id fallback so the card never reads as raw gibberish.
 *
 * The PokeAPI fallback closes the gap users hit when "Optimiser sets"
 * wrote an item id like `wellspring_mask` and the card displayed
 * "Wellspring Mask" instead of "Masque du Puits".
 */
export function itemDisplayName(id: string | undefined): string {
  if (!id) return "";
  const match = findItemById(id);
  if (match) return match.nameFr;
  const pokeapi = lookupItem(id);
  if (pokeapi) return pokeapi.nameFr;
  return humaniseItemId(id);
}

function humaniseItemId(id: string): string {
  const tail = id.split(/[:/]/).pop() ?? id;
  return tail
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Filter the registry by a free-text query, matching the French
 * name, the English name, the id, and any registered alias.
 * Case-insensitive; spaces and dashes are treated as underscores so
 * id-shaped queries also work.
 */
export function searchItems(query: string): CompetitiveItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPETITIVE_ITEMS;
  const qId = q.replace(/[-\s]/g, "_");
  return COMPETITIVE_ITEMS.filter((it) => {
    if (it.id.includes(qId)) return true;
    if (it.nameFr.toLowerCase().includes(q)) return true;
    if (it.nameEn.toLowerCase().includes(q)) return true;
    for (const alias of it.aliases) {
      if (alias.includes(q)) return true;
    }
    return false;
  });
}
