"use client";

import { useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findItemById } from "@/data/competitive-items";
import generatedItems from "@/data/cobblemon-items-generated.json";
import ingredientImages from "@/data/cobblemon-images-generated.json";
import { cn } from "@/lib/utils";

/**
 * Minecraft-flavoured item icon. We prefer a real wiki image (resolved
 * through MediaWiki's `Special:FilePath` redirect so we don't hard-code
 * hashed paths). When no image is mapped we fall back to a hand-drawn
 * pixel-art SVG sprite using one of the shape templates below.
 *
 * The registry covers every item we surface in the UI today; unknown
 * items fall back to a neutral "?" swatch so the page never breaks
 * when new items show up in upstream data.
 */

type Shape =
  | "berry"
  | "apple"
  | "bottle"
  | "bucket"
  | "carrot"
  | "melonSlice"
  | "vegetable"
  | "grain"
  | "cookie"
  | "tag";

interface ItemMeta {
  /** Primary item colour (used by the SVG sprite fallback). */
  color: string;
  /** Optional secondary/highlight colour for the SVG sprite. */
  accent?: string;
  /** Drawing template used by the pixel-art renderer when no image. */
  shape: Shape;
  /** Human-friendly tooltip. */
  label: string;
  /**
   * Direct image URL. Prefer hardcoded `/images/<hash>/<file>` paths
   * because the wiki's `Special:FilePath` triggers a double redirect
   * that some browsers/networks handle poorly (the image silently
   * fails to load with no error). Empty string = no image, keep SVG.
   */
  image?: string;
}

const WIKI_IMAGES = "https://wiki.cobblemon.com/images";
const WIKI_FILEPATH = "https://wiki.cobblemon.com/index.php/Special:FilePath";

// Bundled item sprites — most competitive held items live in
// `public/images/items/cobblemon/{id}.png`, harvested once at build
// time so the picker doesn't burn wiki round-trips on every open.
// A second bundle under `bulbapedia/` covers later additions
// (Booster Energy, plates, orbs, masks) PokeAPI hasn't indexed yet.
const LOCAL_ITEMS = "/images/items/cobblemon";
const BULBAPEDIA_ITEMS = "/images/items/bulbapedia";

/**
 * Snapshot of which competitive items actually have a sprite under
 * `public/images/items/cobblemon/`. Generated once from `ls` at
 * authoring time — the path resolver below routes registry items
 * outside this set to PokeAPI's GitHub sprites fallback so users
 * don't see the SVG cartoon for berries / Cuillère Tordue / Os Épais
 * / Poireau etc.
 */
const LOCAL_ITEM_IDS = new Set<string>([
  "ability_shield", "absorb_bulb", "aguav_berry", "air_balloon",
  "assault_vest", "big_root", "black_belt", "black_glasses",
  "black_sludge", "blunder_policy", "cell_battery", "charcoal",
  "chesto_berry", "choice_band", "choice_scarf", "choice_specs",
  "chople_berry", "clear_amulet", "colbur_berry", "covert_cloak",
  "custap_berry", "damp_rock", "dragon_fang", "eject_button",
  "eject_pack", "electric_seed", "eviolite", "expert_belt",
  "fairy_feather", "flame_orb", "focus_band", "focus_sash",
  "grassy_seed", "grip_claw", "hard_stone", "heat_rock",
  "heavy_duty_boots", "iapapa_berry", "icy_rock", "iron_ball",
  "kee_berry", "kings_rock", "lagging_tail", "leftovers",
  "leppa_berry", "liechi_berry", "life_orb", "light_ball",
  "light_clay", "loaded_dice", "lum_berry", "magnet",
  "maranga_berry", "mental_herb", "metal_coat", "metronome",
  "miracle_seed", "mirror_herb", "muscle_band", "mystic_water",
  "never_melt_ice", "normal_gem", "oran_berry", "payapa_berry",
  "petaya_berry", "power_herb", "protective_pads", "psychic_seed",
  "punching_glove", "quick_claw", "razor_claw", "red_card",
  "rindo_berry", "ring_target", "rocky_helmet", "roseli_berry",
  "safety_goggles", "salac_berry", "scope_lens", "sharp_beak",
  "shell_bell", "shuca_berry", "silk_scarf", "silver_powder",
  "sitrus_berry", "smooth_rock", "soft_sand", "spell_tag",
  "starf_berry", "sticky_barb", "terrain_extender", "throat_spray",
  "toxic_orb", "utility_umbrella", "weakness_policy", "white_herb",
  "wide_lens", "wiki_berry", "wise_glasses", "zoom_lens",
]);

/**
 * Items shipped from a Bulbapedia rip — covers the Gen-9 additions
 * (Booster Energy, Cornerstone/Wellspring/Hearthflame Masks, Adamant
 * Crystal, Lustrous Globe, Griseous Core, Rusted Sword/Shield, …)
 * and the plate / orb family. PokeAPI hadn't picked these up at
 * authoring time so we fell through to the SVG fallback otherwise.
 */
const BULBAPEDIA_ITEM_IDS = new Set<string>([
  "adamant_crystal", "adamant_orb", "adrenaline_orb", "booster_energy",
  "cornerstone_mask", "draco_plate", "dread_plate", "earth_plate",
  "fist_plate", "flame_plate", "griseous_core", "hearthflame_mask",
  "icicle_plate", "insect_plate", "iron_plate", "lustrous_globe",
  "lustrous_orb", "meadow_plate", "mind_plate", "pixie_plate",
  "rusted_shield", "rusted_sword", "sky_plate", "soul_dew",
  "splash_plate", "spooky_plate", "stone_plate", "toxic_plate",
  "wellspring_mask", "zap_plate",
]);

// PokeAPI hosts its sprites on GitHub raw, alongside the Pokémon
// sprites the app already proxies for the Pokédex. Naming convention
// is kebab-case (`heavy-duty-boots.png`); the helper below maps a
// snake_case Cobblemon id to that shape, with an alias table for the
// handful of items where the names diverge.
const POKEAPI_ITEMS =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

const POKEAPI_ID_ALIAS: Record<string, string> = {
  // Cobblemon "leek" → PokeAPI legacy "stick" (Farfetch'd's signature
  // item kept its older name on the sprite repo).
  leek: "stick",
};

function pokeapiItemUrl(id: string): string {
  const slug = POKEAPI_ID_ALIAS[id] ?? id.replace(/_/g, "-");
  return `${POKEAPI_ITEMS}/${slug}.png`;
}

// Minecraft Wiki redirect for vanilla Minecraft items. The
// `Special:FilePath` MediaWiki path is a stable redirect to the
// latest version of the named file — Mojang ships new texture
// variants regularly (`Apple_JE3_BE3.png` → `Apple_JE4_BE5.png`)
// and the redirect keeps us off the version treadmill. Filenames are
// TitleCase + underscore-separated (the wiki convention), so
// `minecraft:golden_apple` → `Golden_Apple.png`.
//
// PokéAPI's sprite repo (used by the previous fallback) has zero
// Minecraft items, which left every snack-recipe slot rendering the
// generic SVG placeholder. Routing the `minecraft:` prefix here
// fixes the snack ingredient images (Pomme, Pomme d'or, Carotte
// dorée, Baies sucrées, …) without needing a local sprite bundle.
const MINECRAFT_WIKI_FILEPATH =
  "https://minecraft.wiki/index.php/Special:FilePath";

function minecraftWikiUrl(id: string): string {
  const name = id
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join("_");
  return `${MINECRAFT_WIKI_FILEPATH}/${encodeURIComponent(name)}.png`;
}

const ITEMS: Record<string, ItemMeta> = {
  // ─── Base cooking-pot ingredients (direct paths, no redirect) ────
  "#c:drinks/milk":          { color: "#f5f5f5", accent: "#9ca3af", shape: "bucket",  label: "Lait Moomoo",     image: `${WIKI_IMAGES}/f/f3/Moomoo_Milk.png` },
  "minecraft:milk_bucket":   { color: "#f5f5f5", accent: "#9ca3af", shape: "bucket",  label: "Lait Moomoo",     image: `${WIKI_IMAGES}/f/f3/Moomoo_Milk.png` },
  "minecraft:honey_bottle":  { color: "#facc15", accent: "#a16207", shape: "bottle",  label: "Pot de miel",     image: `${WIKI_IMAGES}/4/45/Honey_Bottle.png` },
  "cobblemon:vivichoke":     { color: "#a855f7", accent: "#22c55e", shape: "vegetable", label: "Vivichoke",     image: `${WIKI_IMAGES}/c/c2/Vivichoke.png` },
  "cobblemon:hearty_grains": { color: "#facc15", accent: "#a16207", shape: "grain",   label: "Grains nourrissants", image: `${WIKI_IMAGES}/c/cf/Hearty_Grains.png` },
  "cobblemon:poke_snack":    { color: "#f4a44d", accent: "#9a6128", shape: "cookie",  label: "Poké Snack",      image: `${WIKI_IMAGES}/3/31/Pok%C3%A9_Snack.png` },
  // ─── Seasoning items ──────────────────────────────────────────────
  "minecraft:apple":                  { color: "#dc2626", accent: "#16a34a", shape: "apple",      label: "Pomme" },
  "minecraft:golden_apple":           { color: "#facc15", accent: "#fde68a", shape: "apple",      label: "Pomme d'or" },
  "minecraft:enchanted_golden_apple": { color: "#facc15", accent: "#a78bfa", shape: "apple",      label: "Pomme d'or enchantée" },
  "minecraft:glistering_melon_slice": { color: "#fde047", accent: "#22c55e", shape: "melonSlice", label: "Tranche de melon scintillant" },
  "minecraft:golden_carrot":          { color: "#f97316", accent: "#22c55e", shape: "carrot",     label: "Carotte dorée" },
  "minecraft:glow_berries":           { color: "#fb923c", accent: "#fbbf24", shape: "berry",      label: "Lumibaies" },
  "minecraft:sweet_berries":          { color: "#dc2626", accent: "#16a34a", shape: "berry",      label: "Baies sucrées" },
  // ─── Cobblemon berries (typing-boost) — coloured by their type ────
  "cobblemon:rindo_berry":  { color: "#84cc16", accent: "#365314", shape: "berry", label: "Baie Rindo (Plante)" },
  "cobblemon:occa_berry":   { color: "#ef4444", accent: "#7f1d1d", shape: "berry", label: "Baie Occa (Feu)" },
  "cobblemon:passho_berry": { color: "#3b82f6", accent: "#1e3a8a", shape: "berry", label: "Baie Passho (Eau)" },
  "cobblemon:wacan_berry":  { color: "#eab308", accent: "#854d0e", shape: "berry", label: "Baie Wacan (Électrik)" },
  "cobblemon:yache_berry":  { color: "#67e8f9", accent: "#0e7490", shape: "berry", label: "Baie Yache (Glace)" },
  "cobblemon:chople_berry": { color: "#b91c1c", accent: "#450a0a", shape: "berry", label: "Baie Chople (Combat)" },
  "cobblemon:kebia_berry":  { color: "#a855f7", accent: "#581c87", shape: "berry", label: "Baie Kebia (Poison)" },
  "cobblemon:shuca_berry":  { color: "#ca8a04", accent: "#451a03", shape: "berry", label: "Baie Shuca (Sol)" },
  "cobblemon:coba_berry":   { color: "#7dd3fc", accent: "#0c4a6e", shape: "berry", label: "Baie Coba (Vol)" },
  "cobblemon:payapa_berry": { color: "#ec4899", accent: "#831843", shape: "berry", label: "Baie Payapa (Psy)" },
  "cobblemon:tanga_berry":  { color: "#a3e635", accent: "#365314", shape: "berry", label: "Baie Tanga (Insecte)" },
  "cobblemon:charti_berry": { color: "#a3a3a3", accent: "#404040", shape: "berry", label: "Baie Charti (Roche)" },
  "cobblemon:kasib_berry":  { color: "#6d28d9", accent: "#2e1065", shape: "berry", label: "Baie Kasib (Spectre)" },
  "cobblemon:haban_berry":  { color: "#4c1d95", accent: "#1e1b4b", shape: "berry", label: "Baie Haban (Dragon)" },
  "cobblemon:colbur_berry": { color: "#44403c", accent: "#1c1917", shape: "berry", label: "Baie Colbur (Ténèbres)" },
  "cobblemon:babiri_berry": { color: "#94a3b8", accent: "#1e293b", shape: "berry", label: "Baie Babiri (Acier)" },
  "cobblemon:roseli_berry": { color: "#f9a8d4", accent: "#831843", shape: "berry", label: "Baie Roseli (Fée)" },
  "cobblemon:chilan_berry": { color: "#d6d3d1", accent: "#57534e", shape: "berry", label: "Baie Chilan (Normal)" },
  // ─── Special-effect berries ───────────────────────────────────────
  "cobblemon:starf_berry":  { color: "#fbbf24", accent: "#a855f7", shape: "berry", label: "Baie Starf (Shiny)" },
  // ─── Crafting components (used by item recipes) ──────────────────
  // Apricorns + iron disc are the inputs for the Apricorn ball
  // recipes shown on `/items/[id]`. Wiki paths come from the
  // Cobblemon MediaWiki — `Special:FilePath` keeps us off the hash
  // treadmill.
  "cobblemon:red_apricorn":    { color: "#dc2626", accent: "#65a30d", shape: "berry", label: "Apricorn rouge",  image: `${WIKI_FILEPATH}/Red_Apricorn.png` },
  "cobblemon:blue_apricorn":   { color: "#2563eb", accent: "#65a30d", shape: "berry", label: "Apricorn bleu",   image: `${WIKI_FILEPATH}/Blue_Apricorn.png` },
  "cobblemon:yellow_apricorn": { color: "#eab308", accent: "#65a30d", shape: "berry", label: "Apricorn jaune",  image: `${WIKI_FILEPATH}/Yellow_Apricorn.png` },
  "cobblemon:green_apricorn":  { color: "#16a34a", accent: "#365314", shape: "berry", label: "Apricorn vert",   image: `${WIKI_FILEPATH}/Green_Apricorn.png` },
  "cobblemon:pink_apricorn":   { color: "#f472b6", accent: "#65a30d", shape: "berry", label: "Apricorn rose",   image: `${WIKI_FILEPATH}/Pink_Apricorn.png` },
  "cobblemon:black_apricorn":  { color: "#1f2937", accent: "#65a30d", shape: "berry", label: "Apricorn noir",   image: `${WIKI_FILEPATH}/Black_Apricorn.png` },
  "cobblemon:white_apricorn":  { color: "#f3f4f6", accent: "#65a30d", shape: "berry", label: "Apricorn blanc",  image: `${WIKI_FILEPATH}/White_Apricorn.png` },
  "cobblemon:iron_disc":       { color: "#9ca3af", accent: "#475569", shape: "tag",   label: "Disque de fer",   image: `${WIKI_FILEPATH}/Iron_Disc.png` },
  // Cobblemon evolution / utility items the lookup chain misses
  // because they only exist on the Cobblemon Wiki (PokéAPI has the
  // mainline-series sprite, not the in-game Minecraft texture).
  "cobblemon:kings_rock":      { color: "#facc15", accent: "#a16207", shape: "tag",   label: "Roche Royale",    image: `${WIKI_FILEPATH}/King%27s_Rock.png` },
  "cobblemon:exp_share":       { color: "#f59e0b", accent: "#7c2d12", shape: "tag",   label: "Multi Exp.",      image: `${WIKI_FILEPATH}/Exp._Share.png` },
  // ─── Crafting components shared across held-item recipes ─────────
  "cobblemon:medicinal_leek":  { color: "#84cc16", accent: "#365314", shape: "vegetable", label: "Poireau médicinal" },
  "cobblemon:medicinal_brew":  { color: "#84cc16", accent: "#22c55e", shape: "bottle", label: "Bouillon médicinal" },
  "cobblemon:silk_scarf":      { color: "#fef3c7", accent: "#fbbf24", shape: "tag",   label: "Mouchoir Soie" },
  "cobblemon:black_belt":      { color: "#1f2937", accent: "#000000", shape: "tag",   label: "Ceinture Noire" },
  "cobblemon:protector":       { color: "#7f1d1d", accent: "#fbbf24", shape: "tag",   label: "Protecteur" },
  "cobblemon:hard_stone":      { color: "#737373", accent: "#262626", shape: "tag",   label: "Pierre Dure" },
  // ─── Tag aggregates (no wiki page → keep the SVG sprite) ─────────
  "#cobblemon:berries":     { color: "#a855f7", accent: "#525252", shape: "tag",   label: "Toute baie Cobblemon", image: "" },
};

/**
 * Derive a wiki filename from an item id when no direct URL is mapped
 * (e.g. `cobblemon:rindo_berry` → `Rindo_Berry.png`). Resolved via the
 * `Special:FilePath` redirect — fine for berries whose direct hash
 * path we don't keep in the registry.
 */
function fallbackImageUrl(itemId: string): string {
  const tail = itemId.split(":").pop() ?? itemId;
  const filename = tail
    .split("_")
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join("_") + ".png";
  return `${WIKI_FILEPATH}/${encodeURIComponent(filename)}`;
}

/** Resolve the image URL for an item (null = no image, render SVG).
 *
 *  Priority order (per user request — Cobblemon mod sprites first):
 *   1. Registry override (`ITEMS[id].image`) — hand-pinned URLs.
 *   2. `cobblemon:*` → Cobblemon Wiki Special:FilePath (16×16 in-game
 *      sprite — matches what the player sees in the actual Minecraft
 *      inventory). This BEATS the competitive Smogon lookups because
 *      the user wants the Minecraft-flavoured art everywhere it
 *      exists.
 *   3. Local bundled `public/images/items/cobblemon/*.png`
 *      (competitive subset that ships with the app — used for
 *      held-item icons on the team builder).
 *   4. `BULBAPEDIA_ITEMS` bundle (gen-9 items + plates/orbs).
 *   5. PokéAPI sprite (mainline-series fallback for evolution items).
 *   6. `minecraft:*` → Minecraft Wiki (Apple, Carrot, etc.).
 *   7. Generic Special:FilePath redirect as best-effort.
 *
 * The `onError` handler in `ItemArtwork` swaps to the SVG sprite when
 * the chosen URL 404s, so the chain degrades gracefully.
 */
/**
 * Pre-built lookup of wiki-scraped item slugs → exact image URL.
 * The build script (`build-cobblemon-items.mjs`) records each item's
 * actual image filename from the wiki, which is necessary because
 * many wiki filenames use hyphens (`Smoked-Tail_Curry.png`,
 * `Open-Faced_Sandwich.png`) while our internal slugs use
 * underscores — the generic `fallbackImageUrl` resolver can't
 * reconstruct the hyphen-cased filename and would 404 on those
 * items. Reading the exact URL we scraped sidesteps the issue.
 */
const GENERATED_IMAGE_BY_SLUG = new Map<string, string>(
  Object.entries(
    generatedItems as Record<string, { imageUrl: string | null }>,
  )
    .filter(([, v]) => v.imageUrl)
    .map(([k, v]) => [k, v.imageUrl as string]),
);

/**
 * Broader image dictionary — every `<img alt="X.png">` ever seen
 * across the Cobblemon wiki's item pages. Built by the scraper from
 * recipe slots / navboxes / infoboxes. Covers ~1000 entries
 * including every Minecraft ingredient that shows up in any
 * Cobblemon recipe (Red Dye, White Dye, Paper, Diamond, Iron Ingot,
 * Phantom Membrane, etc.) — these are the actual 16×16 in-game
 * sprites that match what the player sees in their inventory,
 * which the previous `minecraft.wiki/Special:FilePath` fallback
 * did NOT match (that wiki ships the full-size beta/JE renders).
 */
const INGREDIENT_IMAGE_BY_SLUG = new Map<string, string>(
  Object.entries(ingredientImages as Record<string, string>),
);

export function itemImageUrl(itemId: string): string | null {
  // Wildcard "Any X" recipe slots are encoded as
  // `group:<tooltip-slug>|<primary-image-id>` by the scraper.
  // Strip the group prefix and route the image lookup to the
  // primary variant so the slot still shows a meaningful icon.
  if (itemId.startsWith("group:")) {
    const pipe = itemId.indexOf("|");
    if (pipe !== -1) return itemImageUrl(itemId.slice(pipe + 1));
    return null;
  }
  // Same dual-key lookup as itemMeta — the recipe pattern yields tags
  // without their `#` prefix, so we have to probe both shapes.
  const meta =
    ITEMS[itemId] ?? ITEMS["#" + itemId] ?? ITEMS[itemId.replace(/^#/, "")];
  if (meta?.image === "") return null;       // explicit opt-out
  if (meta?.image) return meta.image;        // registry-pinned URL
  if (itemId.startsWith("#")) return null;   // unknown tag → no image

  // ─── Cobblemon mod art comes first ────────────────────────────
  // The Cobblemon wiki ships the actual in-game 16×16 PNG for every
  // cobblemon-namespaced item under Special:FilePath/<Name>.png.
  // That's what the player sees in their inventory, so we lead with
  // it (the user explicitly asked for the Cobblemon-flavoured art).
  if (itemId.startsWith("cobblemon:")) {
    const name = itemId.slice("cobblemon:".length);
    // Prefer the exact URL the scraper captured — it preserves
    // hyphenated filenames (`Smoked-Tail_Curry.png`) that the
    // generic Title_Case helper can't reconstruct from a snake_case
    // slug.
    const exact = GENERATED_IMAGE_BY_SLUG.get(name);
    if (exact) return exact;
    const ingredient = INGREDIENT_IMAGE_BY_SLUG.get(name);
    if (ingredient) return ingredient;
    // Gen-9 strategic items the wiki doesn't carry (Booster Energy,
    // Cornerstone Mask, Adamant Crystal, …) ship through the
    // Bulbapedia bundle. The cobblemon: branch would otherwise fall
    // through to a 404'd Special:FilePath redirect and only the SVG
    // sprite would show up.
    if (LOCAL_ITEM_IDS.has(name)) return `${LOCAL_ITEMS}/${name}.png`;
    if (BULBAPEDIA_ITEM_IDS.has(name)) return `${BULBAPEDIA_ITEMS}/${name}.png`;
    return fallbackImageUrl(`cobblemon:${name}`);
  }

  // `minecraft:*` items — try the Cobblemon wiki's scraped icon
  // dictionary first (these are the actual 16×16 inventory
  // sprites the game uses, with the Cobblemon art style applied
  // to Minecraft items). Only fall through to the Minecraft Wiki
  // when the ingredient never appeared in any Cobblemon recipe.
  if (itemId.startsWith("minecraft:")) {
    const name = itemId.slice("minecraft:".length);
    const ingredient = INGREDIENT_IMAGE_BY_SLUG.get(name);
    if (ingredient) return ingredient;
    return minecraftWikiUrl(name);
  }

  // Competitive registry items: bundled local sprites when we shipped
  // them, then Bulbapedia bundle, then PokeAPI as a network fallback.
  const competitive = findItemById(itemId);
  if (competitive) {
    if (LOCAL_ITEM_IDS.has(competitive.id)) {
      return `${LOCAL_ITEMS}/${competitive.id}.png`;
    }
    if (BULBAPEDIA_ITEM_IDS.has(competitive.id)) {
      return `${BULBAPEDIA_ITEMS}/${competitive.id}.png`;
    }
    return pokeapiItemUrl(competitive.id);
  }

  // Last resort: try PokéAPI by stripped name, then the Cobblemon
  // wiki redirect.
  const stripped = itemId.toLowerCase().replace(/^[a-z]+:/, "");
  if (stripped && stripped !== itemId.toLowerCase()) {
    const ingredient = INGREDIENT_IMAGE_BY_SLUG.get(stripped);
    if (ingredient) return ingredient;
    return pokeapiItemUrl(stripped);
  }
  return fallbackImageUrl(itemId);
}

const DEFAULT_META: ItemMeta = {
  color: "#6b7280", accent: "#374151", shape: "tag", label: "Item",
};

/**
 * French labels for items the registry doesn't already carry an
 * explicit `label` for. Keys are slug-form (`red_dye`, `iron_ingot`,
 * `paper`, …) so the lookup works for both `cobblemon:` and
 * `minecraft:` namespaced ids. Sourced from:
 *   • Minecraft fr_fr lang file (vanilla items)
 *   • Cobblemon wiki / PokéAPI FR table (Pokémon-side items)
 *
 * Add new entries here when a recipe ingredient shows up untranslated
 * — the tooltip falls back to `humanize(id)` otherwise, which gives
 * the English title-cased name.
 */
const FR_INGREDIENT_LABELS: Record<string, string> = {
  // ─── Minecraft — dyes ────────────────────────────────────────────
  white_dye:       "Teinture blanche",
  light_gray_dye:  "Teinture gris clair",
  gray_dye:        "Teinture grise",
  black_dye:       "Teinture noire",
  brown_dye:       "Teinture marron",
  red_dye:         "Teinture rouge",
  orange_dye:      "Teinture orange",
  yellow_dye:      "Teinture jaune",
  lime_dye:        "Teinture vert clair",
  green_dye:       "Teinture verte",
  cyan_dye:        "Teinture cyan",
  light_blue_dye:  "Teinture bleu clair",
  blue_dye:        "Teinture bleue",
  purple_dye:      "Teinture violette",
  magenta_dye:     "Teinture magenta",
  pink_dye:        "Teinture rose",
  // ─── Minecraft — wool ────────────────────────────────────────────
  white_wool:        "Laine blanche",
  light_gray_wool:   "Laine gris clair",
  gray_wool:         "Laine grise",
  black_wool:        "Laine noire",
  brown_wool:        "Laine marron",
  red_wool:          "Laine rouge",
  orange_wool:       "Laine orange",
  yellow_wool:       "Laine jaune",
  lime_wool:         "Laine vert clair",
  green_wool:        "Laine verte",
  cyan_wool:         "Laine cyan",
  light_blue_wool:   "Laine bleu clair",
  blue_wool:         "Laine bleue",
  purple_wool:       "Laine violette",
  magenta_wool:      "Laine magenta",
  pink_wool:         "Laine rose",
  // ─── Minecraft — concrete ────────────────────────────────────────
  red_concrete:        "Béton rouge",
  orange_concrete:     "Béton orange",
  yellow_concrete:     "Béton jaune",
  lime_concrete:       "Béton vert clair",
  light_blue_concrete: "Béton bleu clair",
  magenta_concrete:    "Béton magenta",
  pink_concrete:       "Béton rose",
  // ─── Minecraft — minerals / ingots ───────────────────────────────
  diamond:           "Diamant",
  iron_ingot:        "Lingot de fer",
  gold_ingot:        "Lingot d'or",
  copper_ingot:      "Lingot de cuivre",
  netherite_ingot:   "Lingot de Netherite",
  raw_iron:          "Fer brut",
  raw_gold:          "Or brut",
  raw_copper:        "Cuivre brut",
  iron_nugget:       "Pépite de fer",
  gold_nugget:       "Pépite d'or",
  amethyst_shard:    "Éclat d'améthyste",
  lapis_lazuli:      "Lapis-lazuli",
  redstone:          "Redstone",
  redstone_dust:     "Poudre de redstone",
  echo_shard:        "Éclat d'écho",
  nether_quartz:     "Quartz du Nether",
  nether_star:       "Étoile du Nether",
  shulker_shell:     "Coquille de Shulker",
  // ─── Minecraft — mob drops / brewing ─────────────────────────────
  blaze_powder:        "Poudre de Blaze",
  blaze_rod:           "Bâton de Blaze",
  ghast_tear:          "Larme de Ghast",
  ender_pearl:         "Perle de l'Ender",
  ender_eye:           "Œil de l'Ender",
  dragons_breath:      "Souffle du Dragon",
  fermented_spider_eye:"Œil d'araignée fermenté",
  spider_eye:          "Œil d'araignée",
  rabbits_foot:        "Patte de lapin",
  rabbit_hide:         "Peau de lapin",
  phantom_membrane:    "Membrane de Phantom",
  scute:               "Écaille",
  armadillo_scute:     "Écaille de tatou",
  honeycomb:           "Rayon de miel",
  honey_bottle:        "Pot de miel",
  slimeball:           "Boule de Slime",
  glowstone_dust:      "Poudre de Glowstone",
  rotten_flesh:        "Chair putréfiée",
  feather:             "Plume",
  bone:                "Os",
  bone_meal:           "Poudre d'os",
  ink_sac:             "Poche d'encre",
  glow_ink_sac:        "Poche d'encre luminescente",
  string:              "Ficelle",
  leather:             "Cuir",
  prismarine_crystals: "Cristaux de prismarine",
  prismarine_shard:    "Éclat de prismarine",
  nautilus_shell:      "Coquille de nautile",
  // ─── Minecraft — blocks / materials ──────────────────────────────
  glass:             "Verre",
  glass_bottle:      "Fiole en verre",
  tinted_glass:      "Verre teinté",
  red_stained_glass: "Verre teinté rouge",
  stone:             "Pierre",
  cobblestone:       "Pierre taillée",
  sandstone:         "Grès",
  chiseled_sandstone:"Grès gravé",
  sand:              "Sable",
  clay:              "Argile",
  clay_ball:         "Boule d'argile",
  dirt:              "Terre",
  mud:               "Boue",
  grass_block:       "Bloc d'herbe",
  obsidian:          "Obsidienne",
  magma_block:       "Bloc de magma",
  magma_cream:       "Crème de magma",
  basalt:            "Basalte",
  blackstone:        "Pierre noire",
  deepslate:         "Ardoise des abîmes",
  dripstone_block:   "Bloc de pierre à concrétions",
  moss_block:        "Bloc de mousse",
  sea_lantern:       "Lanterne aquatique",
  sculk:             "Sculk",
  paper:             "Papier",
  book:              "Livre",
  bowl:              "Bol",
  bucket:            "Seau",
  shield:            "Bouclier",
  target:            "Cible",
  iron_bars:         "Barreaux de fer",
  iron_trapdoor:     "Trappe en fer",
  iron_helmet:       "Casque en fer",
  golden_helmet:     "Casque en or",
  leather_chestplate:"Plastron en cuir",
  minecart:          "Wagonnet",
  note_block:        "Bloc de note",
  redstone_lamp:     "Lampe à redstone",
  block_of_redstone: "Bloc de redstone",
  pink_petals:       "Pétales roses",
  charcoal:          "Charbon de bois",
  snowball:          "Boule de neige",
  // ─── Minecraft — food ────────────────────────────────────────────
  apple:                       "Pomme",
  golden_apple:                "Pomme d'or",
  enchanted_golden_apple:      "Pomme d'or enchantée",
  golden_carrot:               "Carotte dorée",
  carrot:                      "Carotte",
  baked_potato:                "Pomme de terre cuite",
  potato:                      "Pomme de terre",
  bread:                       "Pain",
  egg:                         "Œuf",
  dried_kelp:                  "Varech séché",
  glow_berries:                "Lumibaies",
  sweet_berries:               "Baies sucrées",
  glistering_melon_slice:      "Tranche de melon scintillant",
  // ─── Cobblemon-specific items + PokéAPI-aligned mainline names ──
  // Sources:
  //   • Bulbapedia FR (Apricorn → Noigrume since Gen 2)
  //   • Pokémon LEGENDS Arceus FR (Tumblestone → Pierre Pétante,
  //     Remedy → Remède, Galarica → Galanoa)
  //   • PokéAPI's FR table for mainline held items (Mouchoir Soie,
  //     Pic Venin, Bandeau Muscle, …) — kept in sync with the
  //     authoritative names so we don't show different labels in
  //     two places.
  medicinal_leek:    "Poireau Médicinal",
  vivichoke:         "Vivichoke",
  big_root:          "Grosse Racine",
  energy_root:       "Racinénergie",
  hearty_grains:     "Grains Nourrissants",
  galarica_nuts:     "Noix Galanoa",
  pep_up_flower:     "Fleur Coup d'Boost",
  revival_herb:      "Herbe Rappel",
  silk_scarf:        "Mouchoir Soie",
  black_belt:        "Ceinture Noire",
  hard_stone:        "Pierre Dure",
  soft_sand:         "Sable Doux",
  muscle_band:       "Bandeau Muscle",
  wise_glasses:      "Lunettes Sages",
  // Apricorns → Noigrumes (Pokémon Gen 2 official FR name)
  apricorn:          "Noigrume",
  red_apricorn:      "Noigrume Rouge",
  blue_apricorn:     "Noigrume Bleue",
  green_apricorn:    "Noigrume Verte",
  yellow_apricorn:   "Noigrume Jaune",
  black_apricorn:    "Noigrume Noire",
  white_apricorn:    "Noigrume Blanche",
  pink_apricorn:     "Noigrume Rose",
  tumblestone:       "Pierre Pétante",
  black_tumblestone: "Pierre Pétante Noire",
  sky_tumblestone:   "Pierre Pétante Céleste",
  poke_snack:        "PokéSnack",
  cleanse_tag:       "Rune Purifiante",
  remedy:            "Remède",
  fine_remedy:       "Remède Fin",
  superb_remedy:     "Remède Suprême",
  oran_berry:        "Baie Oran",
  liechi_berry:      "Baie Lichii",
  // ─── Cobblemon — type gems ───────────────────────────────────────
  normal_gem:   "Gemme Normal",
  fire_gem:     "Gemme Feu",
  water_gem:    "Gemme Eau",
  grass_gem:    "Gemme Plante",
  electric_gem: "Gemme Électrik",
  ice_gem:      "Gemme Glace",
  fighting_gem: "Gemme Combat",
  poison_gem:   "Gemme Poison",
  ground_gem:   "Gemme Sol",
  flying_gem:   "Gemme Vol",
  psychic_gem:  "Gemme Psy",
  bug_gem:      "Gemme Insecte",
  rock_gem:     "Gemme Roche",
  ghost_gem:    "Gemme Spectre",
  dragon_gem:   "Gemme Dragon",
  dark_gem:     "Gemme Ténèbres",
  steel_gem:    "Gemme Acier",
  fairy_gem:    "Gemme Fée",
};

/**
 * Resolve an item id to its registry entry. Minecraft datapack tags
 * can flow through the UI as either `#c:drinks/milk` (datapack form)
 * or `c:drinks/milk` (the bare tag id — what the recipe pattern key
 * yields). Look up both shapes so a single registry key covers both.
 *
 * When no registry entry exists we still apply the FR ingredient
 * dictionary so recipe slots tooltip in French ("Teinture rouge"
 * instead of "Red Dye") even for items we never hand-mapped.
 */
/**
 * FR labels for wildcard "Any X" recipe slots. Multi-option slots
 * are encoded by the scraper as `group:<slug>|<primary-image>` —
 * keyed here by the slug part so the tooltip reads naturally in
 * French ("Toute Dalle en Bois") instead of leaking the slug.
 */
const FR_GROUP_LABELS: Record<string, string> = {
  any_wood_slab:       "Toute Dalle en Bois",
  any_milk:            "Tout Lait",
  any_fuel:            "Tout Combustible",
  any_raw_meat:        "Toute Viande Crue",
  any_planks:          "Toutes Planches",
  any_log:             "Toute Bûche",
  any_wool:            "Toute Laine",
  any_dye:             "Toute Teinture",
  any_berry:           "Toute Baie",
  any_apricorn:        "Tout Noigrume",
  any_apricorn_sprout: "Toute Pousse de Noigrume",
  any_seed:            "Toute Graine",
  any_seeds:           "Toute Graine",
  any_flower:          "Toute Fleur",
  any_fish:            "Tout Poisson",
  any_pottery_sherd:   "Tout Tesson de Poterie",
  any_pokemon_egg:     "Tout Œuf de Pokémon",
  any_button:          "Tout Bouton",
  any_evolution_stone: "Toute Pierre d'Évolution",
  any_sandwich_vegetable: "Tout Légume à Sandwich",
  any_super_potion_ingredient: "Tout Ingrédient de Super Potion",
  // Multi-option slots the scraper couldn't reduce to an "any_*"
  // family — it concatenates the variant slugs instead. Spell out
  // the actual alternatives so the tooltip stays meaningful.
  water_bucket_or_any_milk: "Seau d'Eau ou Tout Lait",
  fire_stone_fire_gem:      "Pierre Feu ou Gemme Feu",
  soft_sand_rock_gem_ground_gem: "Sable Doux, Gemme Roche ou Gemme Sol",
  stone_deepslate_blackstone_tuff:
    "Pierre, Ardoise des abîmes, Pierre noire ou Tuf",
  red_apricorn_yellow_apricorn_green_apricorn_blue_apricorn_pink_apricorn_black_apricorn_white_apricorn:
    "Tout Noigrume",
};

export function itemMeta(id: string): ItemMeta {
  // Wildcard slot — extract the label slug, look up its FR name,
  // and borrow the primary variant's sprite via recursion. Falls
  // back to "Tout(e) X" by humanising the slug if no FR override.
  if (id.startsWith("group:")) {
    const pipe = id.indexOf("|");
    const slugPart = pipe === -1
      ? id.slice("group:".length)
      : id.slice("group:".length, pipe);
    const imagePart = pipe === -1 ? "" : id.slice(pipe + 1);
    const primary = imagePart ? itemMeta(imagePart) : DEFAULT_META;
    const label = FR_GROUP_LABELS[slugPart] ?? humanize(slugPart);
    return { ...primary, label };
  }
  const pinned =
    ITEMS[id] ?? ITEMS["#" + id] ?? ITEMS[id.replace(/^#/, "")];
  if (pinned) return pinned;
  // Fall back to a default sprite + best-effort FR label. The slug
  // strip drops the namespace (`minecraft:red_dye` → `red_dye`) and
  // hyphens, which is the same form the FR table is keyed by.
  const slug = id
    .replace(/^#/, "")
    .split(/[:/]/)
    .pop()
    ?.replace(/-/g, "_")
    ?? id;
  const labelFr = FR_INGREDIENT_LABELS[slug];
  return {
    ...DEFAULT_META,
    label: labelFr ?? humanize(id),
  };
}

function humanize(id: string): string {
  const tail = id.split(/[:/]/).pop() ?? id;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Pixel-art SVG sprites ──────────────────────────────────────────────

interface SpriteProps {
  primary: string;
  accent: string;
}

/**
 * A small pixel-art sprite drawn from filled `<rect>` cells. We pick a
 * 16-unit viewBox so each "pixel" lines up crisply when the slot is
 * 32-40 px wide. `shape-rendering="crispEdges"` keeps the look sharp.
 */
function Sprite({ shape, primary, accent }: SpriteProps & { shape: Shape }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-full"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      {renderShape(shape, primary, accent)}
    </svg>
  );
}

// Tiny helper to draw a filled cell rect.
function px(x: number, y: number, fill: string, w = 1, h = 1) {
  return <rect key={`${x},${y},${fill}`} x={x} y={y} width={w} height={h} fill={fill} />;
}

function renderShape(shape: Shape, c: string, a: string): React.ReactNode[] {
  switch (shape) {
    case "berry":      return berry(c, a);
    case "apple":      return apple(c, a);
    case "bottle":     return bottle(c, a);
    case "bucket":     return bucket(c, a);
    case "carrot":     return carrot(c, a);
    case "melonSlice": return melonSlice(c, a);
    case "vegetable":  return vegetable(c, a);
    case "grain":      return grain(c, a);
    case "cookie":     return cookie(c, a);
    case "tag":        return tag(c, a);
  }
}

// ─── Shape templates — each one ~12×12 inside the 16×16 viewBox ────────

function berry(c: string, dark: string): React.ReactNode[] {
  const hi = "#ffffff90";
  return [
    // stem
    px(7, 2, "#22c55e", 2, 2),
    // body
    px(5, 4, c, 6, 1),
    px(4, 5, c, 8, 4),
    px(5, 9, c, 6, 2),
    px(6, 11, c, 4, 1),
    // shadow
    px(10, 5, dark, 1, 5),
    px(11, 6, dark, 1, 4),
    px(7, 11, dark, 3, 1),
    // highlight
    px(5, 5, hi, 2, 1),
    px(5, 6, hi, 1, 1),
  ];
}

function apple(c: string, leaf: string): React.ReactNode[] {
  const hi = "#ffffff80";
  return [
    px(8, 2, "#5d3a1a", 1, 2),                 // stem
    px(9, 3, leaf, 2, 1),                      // leaf
    px(4, 4, c, 8, 1),
    px(3, 5, c, 10, 6),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    px(3, 5, hi, 2, 2),                        // highlight
    px(11, 9, "#00000040", 1, 2),              // shadow
  ];
}

function bottle(c: string, dark: string): React.ReactNode[] {
  return [
    // neck
    px(7, 2, "#9ca3af", 2, 2),
    px(6, 4, "#9ca3af", 4, 1),
    // body
    px(5, 5, c, 6, 8),
    px(6, 13, c, 4, 1),
    // outline / shadow
    px(10, 5, dark, 1, 8),
    px(9, 13, dark, 1, 1),
    px(5, 12, dark, 5, 1),
  ];
}

function bucket(c: string, dark: string): React.ReactNode[] {
  const rim = "#9ca3af";
  return [
    px(3, 4, rim, 10, 1),    // handle
    px(3, 5, rim, 1, 1),
    px(12, 5, rim, 1, 1),
    px(3, 6, c, 10, 7),      // body
    px(4, 13, c, 8, 1),
    px(5, 14, c, 6, 1),
    px(11, 6, dark, 1, 7),   // shadow
    px(10, 13, dark, 2, 1),
  ];
}

function carrot(c: string, leaf: string): React.ReactNode[] {
  return [
    px(6, 2, leaf, 1, 1),
    px(7, 2, leaf, 2, 2),
    px(5, 3, leaf, 1, 1),
    px(9, 3, leaf, 1, 1),
    px(7, 4, c, 2, 1),
    px(6, 5, c, 4, 1),
    px(6, 6, c, 4, 1),
    px(7, 7, c, 2, 2),
    px(7, 9, c, 2, 2),
    px(7, 11, c, 1, 1),
    px(9, 5, "#00000030", 1, 4),
  ];
}

function melonSlice(c: string, accent: string): React.ReactNode[] {
  return [
    px(2, 4, "#16a34a", 12, 1),   // rind
    px(3, 5, "#22c55e", 10, 1),
    px(3, 6, c, 10, 6),           // flesh
    px(4, 12, c, 8, 1),
    px(5, 13, c, 6, 1),
    px(7, 8, accent, 1, 1),       // seeds
    px(5, 9, accent, 1, 1),
    px(9, 10, accent, 1, 1),
    px(7, 11, accent, 1, 1),
  ];
}

function vegetable(c: string, leaf: string): React.ReactNode[] {
  // Vivichoke-ish — overlapping leaves
  return [
    // leaves on top
    px(6, 3, leaf, 1, 1),
    px(8, 3, leaf, 1, 1),
    px(7, 2, leaf, 1, 2),
    px(5, 4, leaf, 1, 1),
    px(9, 4, leaf, 1, 1),
    // body (overlapping scales)
    px(5, 5, c, 6, 2),
    px(4, 7, c, 8, 2),
    px(5, 9, c, 6, 2),
    px(6, 11, c, 4, 1),
    // scale shadows
    px(7, 6, leaf, 1, 1),
    px(5, 8, leaf, 1, 1),
    px(10, 8, leaf, 1, 1),
    px(7, 10, leaf, 1, 1),
  ];
}

function grain(c: string, dark: string): React.ReactNode[] {
  // wheat sheaf — diamond grains stacked
  return [
    px(7, 2, c, 2, 1),
    px(6, 3, c, 4, 1),
    px(7, 4, dark, 2, 1),
    px(6, 5, c, 4, 1),
    px(5, 6, c, 6, 1),
    px(6, 7, dark, 4, 1),
    px(5, 8, c, 6, 1),
    px(4, 9, c, 8, 1),
    px(5, 10, dark, 6, 1),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    px(7, 13, c, 2, 1),
  ];
}

function cookie(c: string, dark: string): React.ReactNode[] {
  return [
    // round biscuit
    px(5, 3, c, 6, 1),
    px(4, 4, c, 8, 1),
    px(3, 5, c, 10, 6),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    // chocolate chips
    px(5, 6, dark, 2, 1),
    px(9, 7, dark, 2, 1),
    px(6, 9, dark, 2, 1),
    px(10, 9, dark, 1, 1),
  ];
}

function tag(c: string, dark: string): React.ReactNode[] {
  return [
    px(3, 3, c, 10, 10),
    px(11, 3, dark, 2, 10),
    px(3, 11, dark, 10, 2),
    px(5, 5, "#ffffffb0", 1, 1),
    px(9, 5, "#ffffffb0", 1, 1),
    px(7, 9, "#ffffffb0", 2, 1),
  ];
}

// ─── Slot UI ───────────────────────────────────────────────────────────

interface SlotProps {
  item?: string;
  title?: string;
  count?: number;
  empty?: boolean;
  dim?: boolean;
  size?: string;
  className?: string;
}

/**
 * A single Minecraft-style inventory slot. Inset bevel, dark-grey
 * recessed background, pixel-art sprite centered in the cell. Stack
 * counts render at bottom-right like the real game.
 */
export function MinecraftSlot({
  item,
  title,
  count,
  empty,
  dim,
  size = "size-10",
  className,
}: SlotProps) {
  const meta = item ? itemMeta(item) : null;
  const label = title ?? meta?.label ?? "Vide";

  const slot = (
    <div
      aria-label={label}
      className={cn(
        "relative grid place-items-center",
        // Inset bevel.
        "border-t-[3px] border-l-[3px] border-b-[3px] border-r-[3px]",
        "border-t-[#373737] border-l-[#373737]",
        "border-b-[#fffefb] border-r-[#fffefb]",
        "bg-[#8b8b8b]",
        empty && "opacity-40",
        dim && "opacity-50",
        size,
        className,
      )}
    >
      {meta && item && <ItemArtwork item={item} meta={meta} />}
      {count != null && count > 1 && (
        <span className="pointer-events-none absolute -bottom-0.5 right-1.5 font-mono text-lg font-bold text-white">
          {count}
        </span>
      )}
    </div>
  );

  // Empty slots don't deserve a tooltip — they'd just say "Vide".
  if (!meta && !title) return slot;

  // base-ui Tooltip honours the `delay` set on the layout-wide
  // TooltipProvider (0 ms) so this is instant — no flaky native delay.
  return (
    <Tooltip>
      <TooltipTrigger render={slot} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Bare item icon — just the wiki image (or SVG fallback), no
 * Minecraft inventory bevel around it. Use when you want the item
 * picture inline next to text (slot config dialog, slot card label,
 * item tooltips) without the "this is a slot" framing that
 * `MinecraftSlot` adds.
 */
export function ItemIcon({
  item,
  size = "size-5",
  className,
}: {
  item: string;
  /** Tailwind size token (`size-4`, `size-5`, …). Defaults to `size-5`. */
  size?: string;
  className?: string;
}) {
  const meta = itemMeta(item);
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 align-middle",
        size,
        className,
      )}
    >
      <ItemArtwork item={item} meta={meta} bare />
    </span>
  );
}

/**
 * Renders the artwork inside a slot — wiki image when available, with
 * the hand-drawn SVG sprite as a fallback. The earlier version stacked
 * both at the same position so a 404 silently revealed the SVG, but
 * most Cobblemon/Minecraft wiki PNGs are transparent around the item:
 * the SVG bled through the corners and made every loaded image look
 * blurry. Now we render the SVG only when the img has actually failed
 * (`onError`) — clean image on success, hand-drawn fallback on miss.
 *
 * `bare` removes the inner 80 % size box that `MinecraftSlot` uses to
 * pad the artwork inside the inventory bevel — when the parent is
 * already correctly sized (see `ItemIcon`), padding twice makes the
 * sprite read as tiny.
 */
function ItemArtwork({
  item,
  meta,
  bare,
}: {
  item: string;
  meta: ItemMeta;
  bare?: boolean;
}) {
  const url = itemImageUrl(item);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn("relative", bare ? "size-full" : "size-[80%]")}>
      {(!url || imgFailed) && (
        <div className="absolute inset-0">
          <Sprite
            shape={meta.shape}
            primary={meta.color}
            accent={meta.accent ?? meta.color}
          />
        </div>
      )}
      {url && !imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={meta.label}
          // No `title` here — the Tooltip on the parent slot owns the
          // hover label, otherwise browsers render a redundant native
          // tooltip with a delay on top of the Radix one.
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 size-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}

// ─── Panel UI ──────────────────────────────────────────────────────────

/**
 * Outer panel mimicking a Minecraft inventory background — light grey
 * surface with raised bevel. Use as the parent of `MinecraftSlot`s.
 */
export function MinecraftPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-block bg-[#c6c6c6] p-3",
        "border-t-[3px] border-l-[3px] border-b-[3px] border-r-[3px]",
        "border-t-[#fffefb] border-l-[#fffefb]",
        "border-b-[#555555] border-r-[#555555]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Crafting table UI ────────────────────────────────────────────────

interface SeasoningSpec {
  item?: string;
  count?: number;
  label?: string;
}

/**
 * A single Minecraft-style crafting table interface: 3×3 input grid on
 * the left, arrow in the middle, large output slot on the right —
 * all housed in one beveled panel so the layout reads as a single
 * recognisable widget (matches the in-game crafting GUI).
 *
 * `seasonings` (optional) renders a 3-slot horizontal strip *above*
 * the result slot — that mirrors how Cobblemon's Campfire Pot UI
 * lays out the bait seasoning slots applied on top of the base
 * recipe. Omit the prop for a standard crafting table (apricorn
 * balls, held-item recipes).
 */
export function MinecraftCraftingTable({
  grid,
  seasonings,
  result,
  resultCount,
  resultLabel,
  className,
}: {
  /** 9-slot 3×3 input grid (row-major). `null` = empty slot. */
  grid: (string | null)[];
  /** Optional 3-slot bait-seasoning strip (Campfire Pot only).
   *  Rendered horizontally just above the result item. */
  seasonings?: (SeasoningSpec | null)[];
  /** Item id of the craft result. */
  result: string;
  /** Number of items produced (defaults to 1). */
  resultCount?: number;
  /** Optional tooltip override for the result slot. */
  resultLabel?: string;
  className?: string;
}) {
  return (
    <MinecraftPanel className={cn("rounded-sm", className)}>
      {/* Layout: 3 columns (grid · arrow · right column) all stretched
          to the same height via `items-stretch`. The middle column is
          a flex container that centres the arrow vertically — this
          avoids the brittle `mt-11` hand-tuned offset that drifted
          out of alignment as the grid sizing changed. The right
          column does the same with the result slot, so "ingredients
          → arrow → result" reads as a straight horizontal line
          regardless of whether the seasoning strip is present. */}
      <div className="flex items-stretch gap-3">
        {/* 3×3 input grid */}
        <div className="grid grid-cols-3 gap-1">
          {grid.map((slot, i) => (
            <MinecraftSlot
              key={i}
              item={slot ?? undefined}
              empty={!slot}
            />
          ))}
        </div>

        {/* Arrow column — centred vertically against the 3×3 grid's
            full height. Same icon the rest of the app uses for
            "produces" / "evolves into". */}
        <div className="flex items-center">
          <ArrowRight className="size-6 shrink-0 text-[#373737] dark:text-foreground" />
        </div>

        {/* Right column: when seasonings are passed, render the 3-slot
            strip at the top (aligned with the grid's first row), a
            down-arrow, then the result. Without seasonings, the
            result slot is centred vertically against the grid so
            it sits on the same line as the right-arrow. */}
        {seasonings ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {seasonings.map((s, i) => (
                <MinecraftSlot
                  key={i}
                  item={s?.item}
                  count={s?.count}
                  empty={!s?.item}
                  title={s?.label}
                />
              ))}
            </div>
            <ArrowDown className="size-4 shrink-0 text-[#373737] dark:text-foreground" />
            <MinecraftSlot
              item={result}
              count={resultCount}
              title={resultLabel}
              size="size-14"
            />
          </div>
        ) : (
          <div className="flex items-center">
            <MinecraftSlot
              item={result}
              count={resultCount}
              title={resultLabel}
              size="size-14"
            />
          </div>
        )}
      </div>
    </MinecraftPanel>
  );
}
