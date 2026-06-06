#!/usr/bin/env node
/**
 * Scrape every item from the Cobblemon wiki (Category:Item) and
 * extract its crafting recipe + French label. Output is consumed by
 * `src/data/items.ts` so the /items page surfaces the full catalog.
 *
 *   node scripts/build-cobblemon-items.mjs
 *
 * Re-running is idempotent. Per-page HTML is cached under
 * `tmp/cobblemon-items-cache/` so re-runs only re-fetch missing
 * pages. Delete the cache dir for a hard refresh.
 *
 * Output shape (`src/data/cobblemon-items-generated.json`):
 *   {
 *     "<slug>": {
 *       "id":        "choice_scarf",
 *       "nameEn":    "Choice Scarf",
 *       "nameFr":    "Mouchoir Choix",
 *       "category":  "held",                       // best-effort guess
 *       "imageUrl":  "https://wiki.cobblemon.com/images/0/00/Choice_Scarf.png",
 *       "recipe": {
 *         "grid":   ["minecraft:light_blue_wool", "minecraft:diamond", ...],
 *         "output": 1
 *       } | null
 *     }
 *   }
 *
 * The French names are pulled from PokeAPI (`src/data/items-generated.json`,
 * built by `build-items-data.mjs`) when the slug matches; fall back
 * to the English name otherwise. Cobblemon-specific items (apricorns,
 * Vivichoke, Hearty Grains, …) don't exist in PokeAPI, so they keep
 * the English label by design.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "tmp/cobblemon-items-cache");
const OUT_FILE  = path.join(ROOT, "src/data/cobblemon-items-generated.json");
const IMAGES_FILE = path.join(ROOT, "src/data/cobblemon-images-generated.json");
const FR_NAMES_FILE = path.join(ROOT, "src/data/items-generated.json");
const WIKI_API  = "https://wiki.cobblemon.com/api.php";

// ─── Pages to scrape ────────────────────────────────────────────

/**
 * Every item from `https://wiki.cobblemon.com/index.php/Category:Item`.
 * Hand-listed (the category page is unstable and pagination is
 * awkward via the API). Update when new items ship.
 */
const ITEM_PAGES = [
  // Utility
  "Poké_Ball", "Ancient_Poké_Ball", "Poké_Rod", "Campfire_Pot",
  // Apricorn balls (one page per ball)
  "Great_Ball", "Ultra_Ball", "Master_Ball", "Premier_Ball",
  "Heal_Ball", "Net_Ball", "Nest_Ball", "Dive_Ball", "Dusk_Ball",
  "Quick_Ball", "Timer_Ball", "Luxury_Ball", "Repeat_Ball",
  "Friend_Ball", "Heavy_Ball", "Level_Ball", "Lure_Ball",
  "Moon_Ball", "Fast_Ball", "Love_Ball", "Park_Ball",
  "Safari_Ball", "Sport_Ball", "Dream_Ball", "Beast_Ball",
  "Cherish_Ball", "Slate_Ball", "Citrine_Ball", "Verdant_Ball",
  "Azure_Ball", "Roseate_Ball", "Honor_Ball",
  // Agriculture
  "Medicinal_Leek", "Big_Root", "Revival_Herb", "Mental_Herb",
  "Power_Herb", "White_Herb", "Mirror_Herb", "Pep-Up_Flower",
  "Vivichoke", "Hearty_Grains", "Galarica_Nuts", "Mulch",
  // Food
  "Roasted_Leek", "Leek_and_Potato_Stew", "Vivichoke_Dip",
  "Tasty_Tail", "Candied_Apple", "Candied_Berries", "Ponigiri",
  "Moomoo_Milk", "Sinister_Tea", "Pewter_Crunchies",
  "Rage_Candy_Bar", "Lava_Cookie", "Old_Gateau", "Casteliacone",
  "Lumiose_Galette", "Big_Malasada", "Smoked-Tail_Curry",
  "Jubilife_Muffin", "Potato_Mochi", "Open-Faced_Sandwich",
  "Poké_Bait", "Poké_Snack", "Poké_Cake", "Braised_Vivichoke",
  // Medicine
  "Medicinal_Brew", "Potion", "Super_Potion", "Hyper_Potion",
  "Max_Potion", "Full_Restore", "Energy_Root",
  "Remedy", "Fine_Remedy", "Superb_Remedy", "Berry_Juice",
  "Antidote", "Awakening", "Burn_Heal", "Ice_Heal",
  "Paralyze_Heal", "Full_Heal", "Ether", "Max_Ether",
  "Elixir", "Max_Elixir", "Heal_Powder", "Revive", "Max_Revive",
  // Stat-changing
  "HP_Up", "Protein", "Iron", "Calcium", "Zinc", "Carbos",
  "PP_Up", "PP_Max", "Rare_Candy", "Ability_Capsule",
  "Ability_Patch",
  "X_Attack", "X_Defense", "X_Special_Attack",
  "X_Special_Defense", "X_Speed", "X_Accuracy",
  "Dire_Hit", "Guard_Spec",
  "Health_Feather", "Muscle_Feather", "Resist_Feather",
  "Genius_Feather", "Clever_Feather", "Swift_Feather",
  "Health_Mochi", "Muscle_Mochi", "Resist_Mochi",
  "Genius_Mochi", "Clever_Mochi", "Swift_Mochi", "Fresh_Start_Mochi",
  // Evolution
  "Fire_Stone", "Water_Stone", "Thunder_Stone", "Leaf_Stone",
  "Moon_Stone", "Sun_Stone", "Dusk_Stone", "Dawn_Stone",
  "Shiny_Stone", "Ice_Stone",
  "Link_Cable", "King's_Rock", "Galarica_Cuff", "Galarica_Wreath",
  "Metal_Coat", "Black_Augurite", "Protector", "Oval_Stone",
  "Dragon_Scale", "Electirizer", "Magmarizer", "Upgrade",
  "Dubious_Disc", "Razor_Fang", "Razor_Claw", "Peat_Block",
  "Prism_Scale", "Reaper_Cloth", "Deep_Sea_Tooth",
  "Deep_Sea_Scale", "Shell_Helmet", "Sachet", "Whipped_Dream",
  "Tart_Apple", "Sweet_Apple", "Syrupy_Apple",
  "Cracked_Pot", "Chipped_Pot", "Unremarkable_Teacup",
  "Masterpiece_Teacup", "Strawberry_Sweet",
  "Scroll_of_Darkness", "Scroll_of_Waters",
  "Auspicious_Armor", "Malicious_Armor", "Metal_Alloy",
  // Held
  "Exp._Share", "Lucky_Egg",
  "Power_Weight", "Power_Bracer", "Power_Belt", "Power_Lens",
  "Power_Band", "Power_Anklet",
  "Silk_Scarf", "Black_Belt", "Sharp_Beak", "Poison_Barb",
  "Soft_Sand", "Hard_Stone", "Silver_Powder", "Spell_Tag",
  "Charcoal_Stick", "Mystic_Water", "Miracle_Seed", "Magnet",
  "Twisted_Spoon", "Never-Melt_Ice", "Dragon_Fang",
  "Black_Glasses", "Fairy_Feather",
  "Muscle_Band", "Wise_Glasses",
  "Choice_Band", "Choice_Specs", "Choice_Scarf",
  "Assault_Vest", "Wide_Lens", "Zoom_Lens", "Scope_Lens",
  "Eviolite", "Expert_Belt",
  "Absorb_Bulb", "Luminous_Moss", "Cell_Battery",
  "Binding_Band", "Throat_Spray", "Punching_Glove",
  "Loaded_Dice", "Metronome", "Light_Ball",
  "Weakness_Policy", "Blunder_Policy",
  "Rocky_Helmet", "Shell_Bell", "Sticky_Barb",
  "Quick_Claw", "Float_Stone", "Lagging_Tail", "Iron_Ball",
  "Shed_Shell", "Eject_Button", "Eject_Pack", "Red_Card",
  "Heat_Rock", "Damp_Rock", "Icy_Rock", "Smooth_Rock",
  "Electric_Seed", "Psychic_Seed", "Grassy_Seed", "Misty_Seed",
  "Terrain_Extender", "Light_Clay", "Grip_Claw",
  "Safety_Goggles", "Utility_Umbrella", "Heavy-Duty_Boots",
  "Room_Service", "Air_Balloon", "Clear_Amulet",
  "Ability_Shield", "Covert_Cloak", "Protective_Pads",
  "Ring_Target", "Bright_Powder", "Destiny_Knot",
  "Leftovers", "Black_Sludge", "Toxic_Orb", "Flame_Orb",
  "Life_Orb", "Focus_Band", "Focus_Sash", "Soothe_Bell",
  "Everstone", "Metal_Powder", "Quick_Powder",
  "Smoke_Ball", "Cleanse_Tag",
  // Archeology
  "Black_Tumblestone", "Sky_Tumblestone", "Tumblestone",
  // Misc
  "Relic_Coin",
];

// ─── Category guessing ──────────────────────────────────────────

/**
 * Best-effort category guesser. The Cobblemon wiki doesn't surface
 * a clean "category" field per item — we infer from name patterns
 * so the /items page tabs still segment the catalog meaningfully.
 */
function guessCategory(nameEn) {
  const n = nameEn.toLowerCase();
  if (/ball$/.test(n) || n === "poké ball" || n === "ancient poké ball")
    return "ball";
  if (/stone$/.test(n) && n !== "hard stone" && n !== "ever stone" && n !== "everstone")
    return "evolution";
  if (
    /^(link_cable|king's_rock|metal_coat|protector|dragon_scale|electirizer|magmarizer|upgrade|dubious_disc|razor_fang|razor_claw|prism_scale|reaper_cloth|deep_sea_tooth|deep_sea_scale|shell_helmet|sachet|whipped_dream|tart_apple|sweet_apple|syrupy_apple|cracked_pot|chipped_pot|unremarkable_teacup|masterpiece_teacup|strawberry_sweet|scroll_of_darkness|scroll_of_waters|auspicious_armor|malicious_armor|metal_alloy|galarica_cuff|galarica_wreath|black_augurite|oval_stone|peat_block)$/.test(
      n.replace(/[ '\-.]/g, "_"),
    )
  )
    return "evolution";
  if (/(potion|heal|elixir|ether|revive|berry juice|remedy|brew|antidote|awakening)/.test(n))
    return "healing";
  if (/^(hp up|protein|iron|calcium|zinc|carbos|pp up|pp max|rare candy|ability capsule|ability patch|x |dire hit|guard spec|.* feather|.* mochi)/.test(n))
    return "vitamin";
  if (/(berry|apricorn|leek|herb|flower|nut|grain|mulch|tumblestone|vivichoke|sprout)/.test(n))
    return "natural";
  if (/(stew|dip|tail|apple|berries|ponigiri|milk|tea|crunchies|candy bar|cookie|gateau|cone|galette|malasada|curry|muffin|mochi|sandwich|bait|snack|cake|braised|vivichoke|pewter)/.test(n))
    return "food";
  return "held";
}

// ─── HTTP fetch + on-disk cache ─────────────────────────────────

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Wiki page → parsed HTML, cached on disk so re-runs don't hammer
 * the wiki. Returns `null` when the page doesn't exist (e.g. items
 * that share a wiki page with their family — apricorn ball pages
 * sometimes redirect to a single combined page).
 */
async function fetchPageHtml(page) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const safe = page.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const cacheFile = path.join(CACHE_DIR, `${safe}.json`);
  if (await exists(cacheFile)) {
    const txt = await fs.readFile(cacheFile, "utf8");
    return JSON.parse(txt);
  }
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&format=json&prop=text&redirects=1`;
  const r = await fetch(url, { headers: { "user-agent": "cobblemate-build/1.0" } });
  if (!r.ok) {
    console.warn(`! ${page}: HTTP ${r.status}`);
    return null;
  }
  const json = await r.json();
  if (json.error) {
    console.warn(`! ${page}: ${json.error.code}`);
    return null;
  }
  await fs.writeFile(cacheFile, JSON.stringify(json));
  return json;
}

// ─── HTML parsing — extract recipe + image ──────────────────────

/**
 * Vanilla Minecraft items that show up as recipe ingredients on the
 * Cobblemon wiki. The wiki sometimes wraps the slot image in a
 * `<a href="https://minecraft.wiki/...">` (handled by the href
 * check below), but the more recent template skips the link
 * entirely — the image floats free inside `image-sequence-group`.
 * For those, we fall back to this explicit allow-list: every name
 * in it routes to `minecraft:`; everything else stays
 * `cobblemon:`. Lowercased, underscore-separated to match the slug
 * we compute right after.
 */
const MINECRAFT_ITEM_NAMES = new Set([
  "amethyst_shard", "amethyst_block", "ancient_debris", "apple",
  "armadillo_scute", "arrow", "axolotl_bucket",
  "bamboo", "basalt", "beetroot", "beetroot_seeds", "beetroot_soup",
  "blackstone", "blaze_powder", "blaze_rod", "block_of_amethyst",
  "block_of_copper", "block_of_diamond", "block_of_emerald",
  "block_of_gold", "block_of_iron", "block_of_lapis_lazuli",
  "block_of_netherite", "block_of_quartz", "block_of_raw_iron",
  "block_of_redstone", "bone", "bone_meal", "book", "bowl",
  "bread", "brick", "bricks", "bucket",
  "carrot", "cauldron", "cherry_log", "chest", "chiseled_sandstone",
  "clay", "clay_ball", "cobbled_deepslate", "cobblestone",
  "cocoa_beans", "copper_block", "copper_ingot", "cyan_dye",
  "deepslate", "diamond", "dirt", "dragon_breath", "dragon's_breath",
  "dried_kelp", "dripstone_block",
  "echo_shard", "egg", "emerald", "ender_eye", "ender_pearl",
  "experience_bottle",
  "feather", "fermented_spider_eye", "fern", "fire_charge",
  "flint", "flower_pot",
  "ghast_tear", "glass", "glass_bottle", "glow_berries", "glow_ink_sac",
  "glow_stone", "glowstone", "glowstone_dust", "gold_ingot",
  "gold_nugget", "golden_apple", "golden_carrot", "golden_helmet",
  "golden_horse_armor", "golden_pickaxe", "golden_shovel",
  "granite", "grass_block", "gravel", "green_dye", "gunpowder",
  "hard_stone", "heart_of_the_sea", "honey_bottle", "honeycomb",
  "ice", "ink_sac", "iron_bars", "iron_helmet", "iron_horse_armor",
  "iron_ingot", "iron_nugget", "iron_trapdoor",
  "lapis_lazuli", "lapis_block", "lava_bucket", "leather",
  "leather_chestplate", "leek", "lily_pad", "lime_concrete",
  "lime_dye", "light_blue_concrete", "light_blue_wool",
  "magenta_concrete", "magma_block", "magma_cream",
  "milk_bucket", "minecart", "moss_block", "mud", "mushroom_stew",
  "music_disc",
  "nautilus_shell", "nether_quartz", "nether_star", "netherite_ingot",
  "netherite_scrap", "note_block",
  "obsidian", "orange_concrete",
  "packed_ice", "paper", "phantom_membrane", "pink_petals",
  "pink_concrete", "pink_dye", "pink_wool",
  "piston", "popped_chorus_fruit", "potato",
  "prismarine_crystals", "prismarine_shard", "pumpkin", "purple_dye",
  "quartz",
  "rabbit's_foot", "rabbit_foot", "rabbit_hide", "raw_copper",
  "raw_gold", "raw_iron", "red_concrete", "red_dye", "red_stained_glass",
  "red_wool", "redstone", "redstone_block", "redstone_dust",
  "redstone_lamp",
  "salmon_bucket", "sand", "sandstone", "sculk", "scute",
  "sea_lantern", "sea_pickle", "seagrass", "shears",
  "shield", "shulker_shell", "silver_glazed_terracotta",
  "slime_ball", "slimeball", "snow_block", "snowball",
  "soul_sand", "spider_eye", "splash_potion", "spore_blossom",
  "stick", "stone", "string", "sugar", "sugar_cane",
  "sweet_berries",
  "target", "tinted_glass", "tnt", "torch", "totem_of_undying",
  "tropical_fish", "tube_coral", "turtle_scute",
  "vine",
  "warped_fungus", "water_bottle", "water_bucket",
  "wheat", "wheat_seeds", "white_wool", "wool",
  "yellow_concrete", "yellow_wool",
  // Wool / dye variants the recent template ships without an href
  "black_wool", "blue_wool", "brown_wool", "cyan_wool",
  "gray_wool", "green_wool", "light_gray_wool", "lime_wool",
  "magenta_wool", "orange_wool", "purple_wool",
  "black_dye", "blue_dye", "brown_dye", "cyan_dye",
  "gray_dye", "light_blue_dye", "light_gray_dye", "magenta_dye",
  "orange_dye", "pink_dye", "white_dye", "yellow_dye",
  // Misc vanilla materials missed above
  "charcoal", "rotten_flesh", "spider_eye", "ghast_tear",
  "leather_leggings", "leather_boots", "iron_block", "iron_door",
  "iron_pickaxe", "iron_sword", "wooden_pickaxe", "wooden_sword",
  "honey_block", "soul_torch", "lantern",
  // Apostrophe-stripped vanilla items (Rabbit's Foot, Dragon's Breath).
  "rabbits_foot", "dragons_breath",
]);

/**
 * Map an alt-text item name to a Cobblemon/Minecraft namespaced id.
 * Resolution chain:
 *   1. href to `minecraft.wiki` → vanilla Minecraft item
 *   2. href to `/index.php/X` → Cobblemon item
 *   3. No href: consult the allow-list above; fall back to
 *      `cobblemon:` for unknown names. The allow-list catches the
 *      common vanilla ingredients the wiki dropped links from in
 *      its newer recipe template (Diamond, Gold Ingot, String,
 *      Amethyst Shard, Ghast Tear, etc.).
 */
function altToItemId(alt, href) {
  // Decode HTML entities (the wiki returns `&#39;` for apostrophes
  // and `&amp;` for ampersands). Without this the slug for
  // "Rabbit's Foot" becomes `rabbit39s_foot` which never resolves.
  const decoded = alt
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
  const name = decoded.replace(/\.png$/i, "").trim();
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 _\-']/g, "")
    .replace(/'/g, "")
    .replace(/[ \-]+/g, "_")
    .replace(/^_|_$/g, "");
  if (href?.includes("minecraft.wiki")) return `minecraft:${slug}`;
  if (href?.includes("/index.php/")) return `cobblemon:${slug}`;
  if (MINECRAFT_ITEM_NAMES.has(slug)) return `minecraft:${slug}`;
  return `cobblemon:${slug}`;
}

const SLOT_RE   = /<div class="item-slot"(?:[^>]*)>([\s\S]*?)<\/div>\s*<\/div>(?:<span class="item-tooltip">|<\/div>)/g;
const ROW_RE    = /<div class="item-slot-row">([\s\S]*?)<\/div>\s*(?=<div class="item-slot-row">|<\/div>\s*<div class="crafting-interface-result">)/g;
const RESULT_RE = /<div class="crafting-interface-result">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
const IMG_ALT_RE  = /<img\s+alt="([^"]+)"/;
const A_HREF_RE   = /<a\s+href="([^"]+)"/;
const INFOBOX_IMG = /<div class="infobox-image-row">[\s\S]*?<img\s+alt="([^"]+)"\s+src="([^"]+)"/;
const STACK_OUTPUT = /class="item-slot-output"[\s\S]*?<img\s+alt="([^"]+)"[\s\S]*?<\/div>\s*<\/div>(?:<span class="item-tooltip">[^<]*<\/span>)?<\/div>(?:[\s\S]*?(?:×|x)\s*(\d+))?/;

/**
 * Walk the HTML of one item-slot-row and return its 3 slot ids
 * (`null` for empty slots). The row has exactly 3 `item-slot` divs
 * — we split on them rather than running a brittle regex over the
 * whole HTML, which would mis-pair tags with their tooltip spans.
 *
 * Multi-option slots (Ring Target accepts "Any Wood Slab" — 13
 * variants rotating in the same slot) are encoded as
 * `group:<tooltip-slug>|<primary-image-id>`. The UI side splits on
 * `|` to render the first variant's sprite with the wildcard label
 * ("Toute Dalle en Bois") as the tooltip.
 */
function parseRow(rowHtml) {
  const slots = [];
  // Split on `<div class="item-slot"` (the opening tag) — each
  // resulting chunk is one slot's inner HTML up to the next slot
  // or row close. The first chunk is the prefix before any slot,
  // so we discard it.
  const parts = rowHtml.split(/<div class="item-slot"[^>]*>/);
  parts.shift();
  for (const part of parts) {
    const slotEnd = part.indexOf('<div class="item-slot-row"');
    const slot = slotEnd === -1 ? part : part.slice(0, slotEnd);
    const altMatch = slot.match(IMG_ALT_RE);
    // Count alternatives in the slot's image-sequence-group. Each
    // alt is either an `<img>` (variant has an uploaded image) or
    // an `<a>` link to `Special:Upload` (variant's image is
    // missing on the wiki — typical for vanilla Minecraft wood
    // slabs the Cobblemon wiki hasn't mirrored). Both count as a
    // distinct accepted item in the recipe.
    const imgCount = (slot.match(/<img\s+alt="/g) || []).length;
    const uploadCount = (slot.match(/wpDestFile=/g) || []).length;
    const optionCount = imgCount + uploadCount;
    // Tooltip override — when the recipe template's `tooltip = ...`
    // arg is set, the wiki renders a custom label after the slot's
    // image group. Slots accepting one specific item omit it, so
    // we only treat the tooltip as authoritative when there's a
    // multi-option image group too.
    const tooltipMatch = slot.match(
      /<span class="item-tooltip">([^<]+)<\/span>/,
    );
    const tooltip = tooltipMatch ? tooltipMatch[1].trim() : null;

    if (!altMatch && uploadCount === 0) {
      slots.push(null);
      continue;
    }
    const hrefMatch = slot.match(A_HREF_RE);
    const primaryId = altMatch
      ? altToItemId(altMatch[1], hrefMatch?.[1])
      : null;

    if (optionCount > 1 && tooltip) {
      // Wildcard slot — encode the user-facing tooltip + the
      // primary variant's image id. UI splits on `|`.
      const groupSlug = tooltip
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const imageId = primaryId ?? "cobblemon:apricorn_slab";
      slots.push(`group:${groupSlug}|${imageId}`);
    } else {
      slots.push(primaryId);
    }
    if (slots.length === 3) break;
  }
  while (slots.length < 3) slots.push(null);
  return slots.slice(0, 3);
}

function extractRecipe(html) {
  // Two flavours of recipe widget — shaped crafting (3×3 grid, arrow
  // → result) and cooking (Campfire Pot — 3×3 ingredient grid,
  // optional 3-slot seasoning row, big result). Both use the same
  // `item-slot-row` markup so the slot parser is shared; we only
  // need to detect which kind it is + extract the right block.
  //
  // Some pages carry MULTIPLE recipes — the "Obtaining" section
  // shows how to make the item itself (what we want), the "Usage >
  // Crafting Ingredient" section shows recipes that consume the
  // item to make something else (Max Revive → Healing Machine).
  // Pick whichever block appears FIRST in the HTML so we always
  // surface the "how to make this" recipe, not the "how to use it"
  // one.
  const craftingMatch = html.match(
    /<div class="interface crafting-interface[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*(?:<p>|<h2>|<\/div>)/,
  );
  const cookingMatch = html.match(
    /<div class="interface cooking-interface[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*(?:<p>|<h2>|<\/div>)/,
  );
  let match;
  let kind;
  if (craftingMatch && cookingMatch) {
    // Both exist — pick the earlier one in the document.
    if (cookingMatch.index < craftingMatch.index) {
      match = cookingMatch;
      kind = "cooking";
    } else {
      match = craftingMatch;
      kind = "crafting";
    }
  } else if (craftingMatch) {
    match = craftingMatch;
    kind = "crafting";
  } else if (cookingMatch) {
    match = cookingMatch;
    kind = "cooking";
  } else {
    return null;
  }
  const interfaceHtml = match[1];

  // Cooking recipes embed both the ingredient grid AND a seasoning
  // strip in the same outer block. Only parse the
  // `*-interface-ingredients` half here so the seasoning slots
  // don't leak into the main grid.
  const ingredientsMatch = interfaceHtml.match(
    /<div class="(?:crafting|cooking)-interface-ingredients">([\s\S]*?)<div class="(?:crafting|cooking)-interface-(?:result|right)">/,
  );
  const ingredientsHtml = ingredientsMatch?.[1] ?? interfaceHtml;

  const rows = [];
  const rowParts = ingredientsHtml
    .split(/<div class="item-slot-row">/)
    .slice(1);
  for (const part of rowParts.slice(0, 3)) {
    const closeIdx = part.indexOf("</div>\n    </div>");
    const rowHtml = closeIdx === -1 ? part : part.slice(0, closeIdx);
    rows.push(parseRow(rowHtml));
  }
  while (rows.length < 3) rows.push([null, null, null]);
  const grid = [].concat(...rows.slice(0, 3));
  if (grid.every((s) => s == null)) return null;

  // Try to read the output count: appears as `×2` / `x4` near the
  // result slot.
  const resultMatch = interfaceHtml.match(STACK_OUTPUT);
  const output = resultMatch?.[2] ? Number(resultMatch[2]) : 1;

  // Shapeless flag — the wiki marks these with a `shapeless-mark`
  // div containing the ⭍ symbol. When set, the in-game recipe
  // accepts ingredients in any arrangement so the slot positions
  // we preserved above are informative but not required.
  const shapeless = /class="shapeless-mark"/.test(html);

  return { kind, grid, output, shapeless };
}

/**
 * Strip accents (and other diacritics) before regex matching against
 * `alt="..."`. The wiki templates accept titles with accents
 * ("Poké Ball") but the image filename uses the ASCII fold
 * ("Poke Ball.png"). Without this every accented title would miss
 * the exact-alt search and fall back to the infobox-image slideshow.
 */
function asciiFold(s) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function absoluteUrl(src) {
  return src.startsWith("/") ? `https://wiki.cobblemon.com${src}` : src;
}

function extractImage(html, title) {
  const folded = asciiFold(title);
  const escapedTitle = folded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactRe = new RegExp(
    `<img\\s+alt="${escapedTitle}\\.png"\\s+src="([^"]+)"`,
    "i",
  );

  // 1) `<img alt="{Title}.png">` inside the `infobox-items` block —
  // most reliable when the page actually owns its inventory icon
  // (Cleanse Tag, Medicinal Leek, Dire Hit, …).
  const itemsBlockMatch = html.match(
    /<div class="infobox-items">([\s\S]*?)<\/div>\s*(?:<table|<\/div>)/,
  );
  if (itemsBlockMatch) {
    const itemsHtml = itemsBlockMatch[1];
    const exact = itemsHtml.match(exactRe);
    if (exact) return absoluteUrl(exact[1]);
  }

  // 2) Exact `<img alt="{Title}.png">` ANYWHERE on the page. Hub
  // pages whose `infobox-items` lists only variants (Tumblestone
  // has 12 bud/cluster sprites and no plain "Tumblestone.png" in
  // its infobox) still reference the canonical sprite from their
  // own recipe ingredient slots / navbox links — match that.
  const exactAnywhere = html.match(exactRe);
  if (exactAnywhere) return absoluteUrl(exactAnywhere[1]);

  // 3) Best-effort fallback when no exact alt match exists at all:
  // the first `infobox-items` item-slot's icon. Catches pages
  // whose page title doesn't match any image filename (Poké Rod
  // ships per-ball variants but the page's first slot is "Poke
  // Rod (Poke Ball).png" — still better than the block
  // slideshow).
  if (itemsBlockMatch) {
    const firstImg = itemsBlockMatch[1].match(
      /<img\s+alt="([^"]+)"\s+src="([^"]+)"/,
    );
    if (firstImg) return absoluteUrl(firstImg[2]);
  }

  // 4) Last resort: the first slideshow image.
  const m = html.match(INFOBOX_IMG);
  if (!m) return null;
  return absoluteUrl(m[2]);
}

// ─── Main ───────────────────────────────────────────────────────

/**
 * Hand-curated French names for items PokéAPI's translation table
 * doesn't cover (Cobblemon-specific blocks, foods, cosmetic balls,
 * type gems) OR where we want to override PokéAPI for Cobblemon
 * context. PokéAPI's mainline-Pokémon translations win by default
 * — these overrides ONLY fill gaps so we never have to second-guess
 * a name the player already knows from the games (Choice Scarf →
 * "Mouchoir Choix" comes from PokéAPI, not from here).
 *
 * Sources used for the entries below:
 *   • Bulbapedia FR — Pokémon Gen-2 Apricorn names ("Noigrumes")
 *   • Pokémon LEGENDS: Arceus FR — Tumblestone = "Pierre Pétante"
 *   • Cobblemon wiki — for mod-only items that have no Pokémon
 *     mainline counterpart (Vivichoke, Hearty Grains, etc.)
 */
const FR_OVERRIDES = {
  // ─── Utility / blocks (Cobblemon-only) ───────────────────────────
  poke_rod:               "Canne Poké",
  campfire_pot:           "Marmite à Feu de Camp",
  ancient_poke_ball:      "Poké Ball Antique",
  // ─── Apricorns → Noigrumes (Pokémon Gen 2 official FR) ──────────
  // The Apricorn → "Noigrume" rename has been the official French
  // Pokémon translation since Gold/Silver. Cobblemon's mod uses the
  // English "Apricorn" but the in-universe name in French is
  // "Noigrume". Apply across every variant the wiki tracks.
  apricorn:               "Noigrume",
  apricorn_sprout:        "Pousse de Noigrume",
  apricorn_button:        "Bouton de Noigrume",
  apricorn_slab:          "Dalle de Noigrume",
  red_apricorn:           "Noigrume Rouge",
  blue_apricorn:          "Noigrume Bleue",
  green_apricorn:         "Noigrume Verte",
  yellow_apricorn:        "Noigrume Jaune",
  black_apricorn:         "Noigrume Noire",
  white_apricorn:         "Noigrume Blanche",
  pink_apricorn:          "Noigrume Rose",
  // ─── Cobblemon-specific crops / foods (PokéAPI misses these) ────
  medicinal_leek:         "Poireau Médicinal",
  vivichoke:              "Vivichoke",
  hearty_grains:          "Grains Nourrissants",
  galarica_nuts:          "Noix Galanoa",
  pep_up_flower:          "Fleur Coup d'Boost",
  mulch:                  "Paillage",
  roasted_leek:           "Poireau Rôti",
  leek_and_potato_stew:   "Soupe Poireau-Patate",
  vivichoke_dip:          "Dip de Vivichoke",
  tasty_tail:             "Queue Savoureuse",
  candied_apple:          "Pomme d'Amour",
  candied_berries:        "Baies Confites",
  ponigiri:               "Ponigiri",
  sinister_tea:           "Thé Sinistre",
  smoked_tail_curry:      "Curry à la Queue Fumée",
  jubilife_muffin:        "Muffin de Floraville",
  potato_mochi:           "Mochi à la Patate",
  open_faced_sandwich:    "Tartine",
  poke_bait:              "Appât Poké",
  poke_snack:             "PokéSnack",
  poke_cake:              "Poké Gâteau",
  braised_vivichoke:      "Vivichoke Braisée",
  // ─── Medicine (Cobblemon-specific brews / remedies from PLA) ────
  medicinal_brew:         "Bouillon Médicinal",
  remedy:                 "Remède",
  fine_remedy:            "Remède Fin",
  superb_remedy:          "Remède Suprême",
  heal_powder:            "Poudre Soin",
  berry_juice:            "Jus de Baie",
  // ─── Vitamins / training (Cobblemon adds Apricorn-based) ────────
  exp_candy:              "Bonbon Exp.",
  aprijuice:              "Apri-Jus",
  hyper_training_candy:   "Bonbon Hyper-Entraînement",
  // ─── Apricorn ball cosmetics (Cobblemon-only variants) ──────────
  citrine_ball:           "Citrine Ball",
  verdant_ball:           "Verdant Ball",
  azure_ball:             "Azure Ball",
  roseate_ball:           "Roseate Ball",
  slate_ball:             "Slate Ball",
  honor_ball:             "Honor Ball",
  // ─── Evolution / misc (Cobblemon-specific blocks) ──────────────
  evolution_stone:        "Pierre Évolutive",
  link_cable:             "Câble Échange",
  black_augurite:         "Augurite Noir",
  peat_block:             "Bloc de Tourbe",
  shell_helmet:           "Casque-Coque",
  sweet:                  "Bonbon Décoratif",
  metal_alloy:            "Alliage Métal",
  // ─── Held items (Cobblemon-only; PokéAPI has the mainline ones) ─
  charcoal_stick:         "Bâton de Charbon",
  fairy_feather:          "Plume Fée",
  // ─── Tumblestone family (Pokémon LEGENDS Arceus FR) ────────────
  tumblestone:            "Pierre Pétante",
  black_tumblestone:      "Pierre Pétante Noire",
  sky_tumblestone:        "Pierre Pétante Céleste",
  // ─── Type gems (Gen 5; Cobblemon ships custom versions) ────────
  bug_gem:                "Gemme Insecte",
  dark_gem:               "Gemme Ténèbres",
  dragon_gem:             "Gemme Dragon",
  electric_gem:           "Gemme Électrik",
  fairy_gem:              "Gemme Fée",
  fighting_gem:           "Gemme Combat",
  fire_gem:               "Gemme Feu",
  flying_gem:             "Gemme Vol",
  ghost_gem:              "Gemme Spectre",
  grass_gem:              "Gemme Plante",
  ground_gem:             "Gemme Sol",
  ice_gem:                "Gemme Glace",
  normal_gem:             "Gemme Normal",
  poison_gem:             "Gemme Poison",
  psychic_gem:            "Gemme Psy",
  rock_gem:               "Gemme Roche",
  steel_gem:              "Gemme Acier",
  water_gem:              "Gemme Eau",
};

async function loadFrNames() {
  const map = new Map();
  // PokéAPI ships the authoritative mainline-Pokémon French
  // translations (Choice Scarf → "Mouchoir Choix", Power Weight →
  // "Poids Pouvoir", Galarica Cuff → "Bracelet Galanoa", …). Load
  // those first so they're the default for any item the API knows.
  try {
    const raw = JSON.parse(await fs.readFile(FR_NAMES_FILE, "utf8"));
    const items = raw.items ?? raw;
    for (const [slug, v] of Object.entries(items)) {
      if (v.nameFr) map.set(slug, v.nameFr);
    }
  } catch {
    /* no PokéAPI dump on disk → fall through to overrides only */
  }
  // Layer Cobblemon-specific overrides on TOP so they win where
  // PokéAPI is missing (or where Cobblemon ships a different name
  // than the mainline games).
  for (const [slug, fr] of Object.entries(FR_OVERRIDES)) {
    map.set(slug, fr);
  }
  return map;
}

/**
 * Walk one page's HTML and collect every `(alt, src)` pair it
 * references. Slot images on the Cobblemon wiki carry the actual
 * 16×16 inventory sprite — same one the player sees in-game — for
 * BOTH Cobblemon items and vanilla Minecraft items (the wiki ships
 * its own Minecraft icon set). Harvesting these gives us
 * Cobblemon-styled art for `minecraft:red_dye`, `minecraft:paper`
 * and the rest of the recipe ingredient family, which is what the
 * UI needs to render recipes consistently with the in-game look.
 */
function collectImages(html, into) {
  // Capture every `<img alt="X.png" src="/images/...">` shown in
  // a slot context. Filter to wiki-relative paths so we don't
  // accidentally point at external sources (minecraft.wiki w/...
  // links, etc.).
  const re = /<img\s+alt="([^"]+)\.png"\s+src="(\/images\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const alt = m[1]
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    const src = `https://wiki.cobblemon.com${m[2]}`;
    // Key by the slug form (`Red_Dye` → `red_dye`) so callers can
    // look up by Cobblemon / Minecraft item id without re-deriving
    // the URL. Skip variants with parens / multi-word descriptors
    // that aren't true item names (e.g. "Pokedex (red)" — keep
    // the simpler entry for the canonical name).
    const slug = alt
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 _\-']/g, "")
      .replace(/'/g, "")
      .replace(/[ \-]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!slug || /_\(/.test(slug)) continue;
    // First write wins so the earliest (most authoritative) image
    // for each ingredient sticks. Per-page scans run on every
    // entry, but each slug's first hit is usually its own
    // infobox or a clean recipe slot.
    if (!into.has(slug)) into.set(slug, src);
  }
}

async function main() {
  const fr = await loadFrNames();
  const out = {};
  const imageBySlug = new Map();
  let okCount = 0;
  let recipeCount = 0;
  let failCount = 0;

  // Concurrency cap so we don't hammer the wiki.
  const CONCURRENCY = 8;
  const queue = [...ITEM_PAGES];
  async function worker() {
    while (queue.length) {
      const page = queue.shift();
      try {
        const json = await fetchPageHtml(page);
        if (!json?.parse?.text?.["*"]) {
          failCount++;
          continue;
        }
        const html = json.parse.text["*"];
        const title = json.parse.title;
        const recipe = extractRecipe(html);
        const image = extractImage(html, title);
        collectImages(html, imageBySlug);
        // Slugify Unicode → ASCII before stripping. Without the
        // `NFKD`+`accents` pass the wiki title "Poké Ball" loses
        // the `é` entirely and becomes `pok_ball`; we want
        // `poke_ball` so it lines up with PokéAPI's FR-names table
        // and the existing curated catalog. `Exp._Share` has the
        // period collapsed by the same rule (→ `exp_share`).
        const slug = title
          .normalize("NFKD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9 _\-]/g, "")
          .replace(/[ \-]+/g, "_")
          .replace(/^_|_$/g, "");
        out[slug] = {
          id: slug,
          nameEn: title,
          nameFr: fr.get(slug) ?? fr.get(slug.replace(/_/g, "-")) ?? title,
          category: guessCategory(title),
          imageUrl: image,
          recipe,
        };
        okCount++;
        if (recipe) recipeCount++;
      } catch (e) {
        console.warn(`! ${page}: ${e.message}`);
        failCount++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Sort by slug for stable diffs.
  const sorted = Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(OUT_FILE, JSON.stringify(sorted, null, 2));

  // Write the global image dictionary — sorted, deduped against
  // the per-item imageUrl we already exported above to keep the
  // file lean. Recipe ingredient slots read this map first when
  // rendering, falling back to the per-item entry when the
  // ingredient is itself a catalog page.
  const imagesObj = Object.fromEntries(
    Array.from(imageBySlug.entries()).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(IMAGES_FILE, JSON.stringify(imagesObj, null, 2));

  console.log(`✓ ${okCount} items written (${recipeCount} with recipes, ${failCount} skipped).`);
  console.log(`  ${OUT_FILE}`);
  console.log(`✓ ${imageBySlug.size} ingredient images written.`);
  console.log(`  ${IMAGES_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
