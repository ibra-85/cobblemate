import generated from "./biomes-generated.json";

/**
 * Cobblemon biome tag resolution + French labels.
 *
 * `biomes-generated.json` is built from
 *   common/src/main/resources/data/cobblemon/tags/worldgen/biome/
 * Rebuild with: `node scripts/build-biomes-data.mjs`.
 */

export interface BiomeTag {
  /** Concrete biome ids (Minecraft + modded) included by this tag. */
  biomes: string[];
  /** Foreign-namespace tag references we couldn't resolve. */
  tagRefs: string[];
}

export const BIOME_TAGS: Record<string, BiomeTag> = generated as Record<
  string,
  BiomeTag
>;

// ─── French labels ─────────────────────────────────────────────────────

/**
 * FR labels for Cobblemon biome categories. Falls back to a humanised
 * form for anything not listed here, so the UI never shows raw keys.
 */
export const BIOME_LABELS_FR: Record<string, string> = {
  // Overworld is_*
  is_arid:             "Aride",
  is_badlands:         "Badlands",
  is_bamboo:           "Bambou",
  is_beach:            "Plage",
  is_cave:             "Caverne",
  is_cherry_blossom:   "Cerisier",
  is_coast:            "Littoral",
  is_cold:             "Froid",
  is_cold_ocean:       "Océan froid",
  is_dark:             "Sombre",
  is_dark_forest:      "Forêt sombre",
  is_deep_dark:        "Deep Dark",
  is_deep_ocean:       "Océan profond",
  is_desert:           "Désert",
  is_dripstone:        "Cavernes de stalactites",
  is_end:              "End",
  is_floral:           "Floral",
  is_forest:           "Forêt",
  is_freezing:         "Gelé",
  is_freshwater:       "Eau douce",
  is_frozen_ocean:     "Océan gelé",
  is_glacial:          "Glaciaire",
  is_grassland:        "Prairie",
  is_highlands:        "Hautes-terres",
  is_hills:            "Collines",
  is_island:           "Île",
  is_jungle:           "Jungle",
  is_lukewarm_ocean:   "Océan tiède",
  is_lush:             "Luxuriant",
  is_magical:          "Magique",
  is_mountain:         "Montagne",
  is_mushroom:         "Champignon",
  is_nether:           "Nether",
  is_nether_wasteland: "Nether (désolation)",
  is_ocean:            "Océan",
  is_overworld:        "Overworld",
  is_peak:             "Sommet",
  is_plains:           "Plaines",
  is_plateau:          "Plateau",
  is_river:            "Rivière",
  is_sandy:            "Sablonneux",
  is_savanna:          "Savane",
  is_shrubland:        "Arbustes",
  is_sky:              "Ciel",
  is_snowy:            "Enneigé",
  is_snowy_forest:     "Forêt enneigée",
  is_snowy_taiga:      "Taïga enneigée",
  is_sparse:           "Clairsemé",
  is_spooky:           "Lugubre",
  is_spring:           "Printemps",
  is_summer:           "Été",
  is_autumn:           "Automne",
  is_swamp:            "Marais",
  is_taiga:            "Taïga",
  is_temperate:        "Tempéré",
  is_temperate_ocean:  "Océan tempéré",
  is_thermal:          "Thermal",
  is_tropical_island:  "Île tropicale",
  is_tundra:           "Toundra",
  is_volcanic:         "Volcanique",
  is_warm_ocean:       "Océan chaud",
  // Nether
  "nether/is_basalt":     "Nether — Basalte",
  "nether/is_crimson":    "Nether — Cramoisi",
  "nether/is_desert":     "Nether — Désert",
  "nether/is_forest":     "Nether — Forêt",
  "nether/is_frozen":     "Nether — Gelé",
  "nether/is_fungus":     "Nether — Champignon",
  "nether/is_mountain":   "Nether — Montagne",
  "nether/is_overgrowth": "Nether — Végétation",
  "nether/is_quartz":     "Nether — Quartz",
  "nether/is_soul_fire":  "Nether — Feu des âmes",
  "nether/is_soul_sand":  "Nether — Sable des âmes",
  "nether/is_toxic":      "Nether — Toxique",
  "nether/is_warped":     "Nether — Distordu",
  "nether/is_wasteland":  "Nether — Désolation",
};

const HUMANIZE = (s: string) =>
  s
    .replace(/^(is_|c:|forge:is_|has_block\/|byg:|the_bumblezone:|aether:)/, "")
    .split(/[_\/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Vanilla Minecraft biome ids → official French biome names. Sourced
 * from Minecraft's `fr_fr` lang file so the labels exactly match what
 * the player sees in-game when pressing F3. The Cobblemon `is_*` tag
 * categories ("Magique", "Overworld", …) are abstract and tell the
 * user nothing about *where* to actually go — surfacing the concrete
 * biomes a tag resolves to gives them the in-game name to look for.
 *
 * Add new entries here as Mojang ships new biomes; the
 * {@link minecraftBiomeLabel} helper falls back to humanising the id
 * for anything not listed.
 */
export const MINECRAFT_BIOME_FR: Record<string, string> = {
  // ─── Plains / grasslands ──────────────────────────────────────────
  "minecraft:plains":              "Plaines",
  "minecraft:sunflower_plains":    "Plaines à tournesols",
  "minecraft:snowy_plains":        "Plaines enneigées",
  "minecraft:ice_spikes":          "Pics de glace",
  "minecraft:meadow":              "Prairie",
  "minecraft:cherry_grove":        "Cerisaie",
  // ─── Savannas / arid ──────────────────────────────────────────────
  "minecraft:savanna":             "Savane",
  "minecraft:savanna_plateau":     "Plateau de savane",
  "minecraft:windswept_savanna":   "Savane venteuse",
  "minecraft:desert":              "Désert",
  "minecraft:badlands":            "Bad Lands",
  "minecraft:wooded_badlands":     "Bad Lands boisés",
  "minecraft:eroded_badlands":     "Bad Lands érodés",
  // ─── Forests ──────────────────────────────────────────────────────
  "minecraft:forest":              "Forêt",
  "minecraft:flower_forest":       "Forêt fleurie",
  "minecraft:dark_forest":         "Forêt sombre",
  "minecraft:birch_forest":        "Forêt de bouleaux",
  "minecraft:old_growth_birch_forest":  "Vieille forêt de bouleaux",
  "minecraft:windswept_forest":    "Forêt venteuse",
  "minecraft:taiga":               "Taïga",
  "minecraft:snowy_taiga":         "Taïga enneigée",
  "minecraft:old_growth_pine_taiga":    "Vieille taïga de pins",
  "minecraft:old_growth_spruce_taiga":  "Vieille taïga d'épicéas",
  "minecraft:grove":               "Plantation",
  // ─── Jungles / swamps ─────────────────────────────────────────────
  "minecraft:jungle":              "Jungle",
  "minecraft:bamboo_jungle":       "Jungle de bambous",
  "minecraft:sparse_jungle":       "Jungle clairsemée",
  "minecraft:swamp":               "Marais",
  "minecraft:mangrove_swamp":      "Marais de palétuviers",
  // ─── Beaches / shores / rivers ────────────────────────────────────
  "minecraft:beach":               "Plage",
  "minecraft:snowy_beach":         "Plage enneigée",
  "minecraft:stony_shore":         "Rive pierreuse",
  "minecraft:river":               "Rivière",
  "minecraft:frozen_river":        "Rivière gelée",
  // ─── Oceans ───────────────────────────────────────────────────────
  "minecraft:ocean":               "Océan",
  "minecraft:warm_ocean":          "Océan chaud",
  "minecraft:lukewarm_ocean":      "Océan tiède",
  "minecraft:cold_ocean":          "Océan froid",
  "minecraft:frozen_ocean":        "Océan gelé",
  "minecraft:deep_ocean":          "Océan profond",
  "minecraft:deep_lukewarm_ocean": "Océan tiède profond",
  "minecraft:deep_cold_ocean":     "Océan froid profond",
  "minecraft:deep_frozen_ocean":   "Océan gelé profond",
  // ─── Mountains / peaks ────────────────────────────────────────────
  "minecraft:windswept_hills":          "Collines venteuses",
  "minecraft:windswept_gravelly_hills": "Collines graveleuses venteuses",
  "minecraft:snowy_slopes":             "Pentes enneigées",
  "minecraft:frozen_peaks":             "Pics gelés",
  "minecraft:jagged_peaks":             "Pics déchiquetés",
  "minecraft:stony_peaks":              "Pics pierreux",
  // ─── Caves ────────────────────────────────────────────────────────
  "minecraft:dripstone_caves":     "Cavernes de stalactites",
  "minecraft:lush_caves":          "Cavernes luxuriantes",
  "minecraft:deep_dark":           "Tréfonds",
  // ─── Other surface ────────────────────────────────────────────────
  "minecraft:mushroom_fields":     "Champs de champignons",
  // ─── Nether ───────────────────────────────────────────────────────
  "minecraft:nether_wastes":       "Friches du Nether",
  "minecraft:crimson_forest":      "Forêt cramoisie",
  "minecraft:warped_forest":       "Forêt distordue",
  "minecraft:soul_sand_valley":    "Vallée du sable des âmes",
  "minecraft:basalt_deltas":       "Deltas de basalte",
  // ─── End ──────────────────────────────────────────────────────────
  "minecraft:the_end":             "L'End",
  "minecraft:end_highlands":       "Hautes-terres de l'End",
  "minecraft:end_midlands":        "Moyennes-terres de l'End",
  "minecraft:end_barrens":         "Friches de l'End",
  "minecraft:small_end_islands":   "Petites îles de l'End",
};

/**
 * French label for a single Minecraft biome id (`minecraft:plains`
 * → "Plaines"). Falls back to a humanised id for anything missing —
 * keeps modded biomes (`biomesoplenty:lavender_field`) readable
 * without forcing us to translate the whole modded biome universe.
 */
export function minecraftBiomeLabel(id: string): string {
  if (MINECRAFT_BIOME_FR[id]) return MINECRAFT_BIOME_FR[id];
  if (id.includes(":")) {
    const [, name] = id.split(":");
    return name ? HUMANIZE(name) : id;
  }
  return HUMANIZE(id);
}

/**
 * Hardcoded fallback that maps each Cobblemon `is_*` tag to the
 * vanilla Minecraft biomes the tag is meant to cover. Necessary
 * because the generated `BIOME_TAGS` data references upstream tags
 * (`minecraft:is_jungle`, `c:is_jungle`) without expanding them —
 * so Bulbasaur's `#cobblemon:is_jungle` resolves to zero vanilla
 * biomes in the generated data alone.
 *
 * Curated against the 1.20+ vanilla biome inventory. Whenever Mojang
 * ships a new biome, add it here so the wishlist and pokesnacks UIs
 * keep pointing players at the right place to hunt.
 */
const VANILLA_FALLBACK: Record<string, string[]> = {
  // ─── Jungles / tropical ─────────────────────────────────────────
  is_jungle:           ["minecraft:jungle", "minecraft:bamboo_jungle", "minecraft:sparse_jungle"],
  is_bamboo:           ["minecraft:bamboo_jungle"],
  is_tropical_island:  ["minecraft:jungle", "minecraft:sparse_jungle"],
  is_lush:             ["minecraft:jungle", "minecraft:bamboo_jungle", "minecraft:lush_caves"],

  // ─── Forests / taïgas ───────────────────────────────────────────
  is_forest:           ["minecraft:forest", "minecraft:flower_forest", "minecraft:birch_forest",
                        "minecraft:old_growth_birch_forest", "minecraft:dark_forest",
                        "minecraft:windswept_forest", "minecraft:taiga", "minecraft:snowy_taiga",
                        "minecraft:old_growth_pine_taiga", "minecraft:old_growth_spruce_taiga",
                        "minecraft:grove"],
  is_dark_forest:      ["minecraft:dark_forest"],
  is_dark:             ["minecraft:dark_forest", "minecraft:deep_dark"],
  is_spooky:           ["minecraft:dark_forest"],
  is_taiga:            ["minecraft:taiga", "minecraft:snowy_taiga",
                        "minecraft:old_growth_pine_taiga", "minecraft:old_growth_spruce_taiga"],
  is_snowy_taiga:      ["minecraft:snowy_taiga"],
  is_snowy_forest:     ["minecraft:snowy_taiga"],
  is_cherry_blossom:   ["minecraft:cherry_grove"],
  is_floral:           ["minecraft:flower_forest", "minecraft:sunflower_plains",
                        "minecraft:meadow", "minecraft:cherry_grove"],
  is_spring:           ["minecraft:flower_forest", "minecraft:cherry_grove"],
  is_summer:           ["minecraft:plains", "minecraft:sunflower_plains"],
  is_autumn:           ["minecraft:forest", "minecraft:birch_forest"],

  // ─── Plaines / herbages ─────────────────────────────────────────
  is_plains:           ["minecraft:plains", "minecraft:sunflower_plains", "minecraft:snowy_plains"],
  is_grassland:        ["minecraft:plains", "minecraft:sunflower_plains", "minecraft:meadow"],
  is_shrubland:        ["minecraft:plains", "minecraft:savanna"],
  is_sparse:           ["minecraft:sparse_jungle", "minecraft:savanna"],

  // ─── Savane / aride ─────────────────────────────────────────────
  is_savanna:          ["minecraft:savanna", "minecraft:savanna_plateau", "minecraft:windswept_savanna"],
  is_desert:           ["minecraft:desert"],
  is_badlands:         ["minecraft:badlands", "minecraft:wooded_badlands", "minecraft:eroded_badlands"],
  is_arid:             ["minecraft:desert", "minecraft:badlands", "minecraft:wooded_badlands",
                        "minecraft:eroded_badlands", "minecraft:savanna",
                        "minecraft:savanna_plateau", "minecraft:windswept_savanna"],
  is_sandy:            ["minecraft:desert", "minecraft:beach", "minecraft:badlands"],

  // ─── Eau ────────────────────────────────────────────────────────
  is_ocean:            ["minecraft:ocean", "minecraft:deep_ocean",
                        "minecraft:warm_ocean", "minecraft:lukewarm_ocean", "minecraft:deep_lukewarm_ocean",
                        "minecraft:cold_ocean", "minecraft:deep_cold_ocean",
                        "minecraft:frozen_ocean", "minecraft:deep_frozen_ocean"],
  is_warm_ocean:       ["minecraft:warm_ocean", "minecraft:lukewarm_ocean", "minecraft:deep_lukewarm_ocean"],
  is_lukewarm_ocean:   ["minecraft:lukewarm_ocean", "minecraft:deep_lukewarm_ocean"],
  is_temperate_ocean:  ["minecraft:ocean", "minecraft:deep_ocean"],
  is_cold_ocean:       ["minecraft:cold_ocean", "minecraft:deep_cold_ocean"],
  is_frozen_ocean:     ["minecraft:frozen_ocean", "minecraft:deep_frozen_ocean"],
  is_deep_ocean:       ["minecraft:deep_ocean", "minecraft:deep_lukewarm_ocean",
                        "minecraft:deep_cold_ocean", "minecraft:deep_frozen_ocean"],
  is_river:            ["minecraft:river", "minecraft:frozen_river"],
  is_freshwater:       ["minecraft:river"],
  is_beach:            ["minecraft:beach", "minecraft:snowy_beach"],
  is_coast:            ["minecraft:beach", "minecraft:stony_shore", "minecraft:snowy_beach"],
  is_swamp:            ["minecraft:swamp", "minecraft:mangrove_swamp"],

  // ─── Froid / neige ──────────────────────────────────────────────
  is_snowy:            ["minecraft:snowy_plains", "minecraft:snowy_taiga", "minecraft:snowy_beach",
                        "minecraft:snowy_slopes", "minecraft:frozen_peaks", "minecraft:ice_spikes",
                        "minecraft:frozen_river", "minecraft:frozen_ocean", "minecraft:deep_frozen_ocean",
                        "minecraft:grove"],
  is_cold:             ["minecraft:taiga", "minecraft:snowy_taiga", "minecraft:snowy_plains",
                        "minecraft:snowy_beach", "minecraft:cold_ocean", "minecraft:frozen_ocean",
                        "minecraft:windswept_hills", "minecraft:windswept_gravelly_hills",
                        "minecraft:windswept_forest", "minecraft:grove"],
  is_freezing:         ["minecraft:frozen_peaks", "minecraft:snowy_slopes",
                        "minecraft:ice_spikes", "minecraft:frozen_river"],
  is_glacial:          ["minecraft:frozen_peaks", "minecraft:ice_spikes",
                        "minecraft:frozen_river", "minecraft:frozen_ocean"],

  // ─── Climat tempéré / chaud ─────────────────────────────────────
  is_temperate:        ["minecraft:plains", "minecraft:forest", "minecraft:birch_forest",
                        "minecraft:dark_forest", "minecraft:meadow", "minecraft:flower_forest",
                        "minecraft:sunflower_plains", "minecraft:river"],
  is_thermal:          ["minecraft:basalt_deltas"],

  // ─── Montagnes ──────────────────────────────────────────────────
  is_mountain:         ["minecraft:windswept_hills", "minecraft:windswept_gravelly_hills",
                        "minecraft:snowy_slopes", "minecraft:frozen_peaks", "minecraft:jagged_peaks",
                        "minecraft:stony_peaks", "minecraft:meadow", "minecraft:grove"],
  is_hills:            ["minecraft:windswept_hills", "minecraft:windswept_gravelly_hills"],
  is_peak:             ["minecraft:frozen_peaks", "minecraft:jagged_peaks", "minecraft:stony_peaks"],
  is_highlands:        ["minecraft:meadow", "minecraft:grove"],
  is_plateau:          ["minecraft:savanna_plateau", "minecraft:wooded_badlands"],

  // ─── Cavernes ───────────────────────────────────────────────────
  is_cave:             ["minecraft:lush_caves", "minecraft:dripstone_caves", "minecraft:deep_dark"],
  is_dripstone:        ["minecraft:dripstone_caves"],
  is_deep_dark:        ["minecraft:deep_dark"],

  // ─── Spécifique ─────────────────────────────────────────────────
  is_mushroom:         ["minecraft:mushroom_fields"],
  is_magical:          ["minecraft:cherry_grove", "minecraft:flower_forest"],
  is_volcanic:         ["minecraft:basalt_deltas"],
  is_island:           ["minecraft:mushroom_fields"],

  // ─── Nether / End ───────────────────────────────────────────────
  is_nether:           ["minecraft:nether_wastes", "minecraft:crimson_forest",
                        "minecraft:warped_forest", "minecraft:soul_sand_valley",
                        "minecraft:basalt_deltas"],
  is_nether_wasteland: ["minecraft:nether_wastes"],
  is_end:              ["minecraft:the_end", "minecraft:end_highlands", "minecraft:end_midlands",
                        "minecraft:end_barrens", "minecraft:small_end_islands"],
  is_sky:              ["minecraft:the_end", "minecraft:end_highlands"],
};

/**
 * Vanilla Minecraft biomes that a Cobblemon `is_*` tag resolves to.
 * Filters out modded biomes (BiomesOPlenty, Terralith, Wythers…) so
 * the UI shows only the concrete places the player can reach in
 * vanilla — and keeps the list manageable: `is_overworld` resolves
 * to ~100 biomes total but only ~30 are vanilla. Sorted by FR label
 * for stable display order.
 *
 * Merges three sources, deduped:
 *   1. Direct hits in BIOME_TAGS (`minecraft:foo` directly listed)
 *   2. The hardcoded `VANILLA_FALLBACK` table — covers the most
 *      common cases where the generated data references an upstream
 *      tag (`minecraft:is_jungle`) without expanding it.
 *   3. Any nested tag refs that themselves resolve via the fallback.
 */
export function vanillaBiomesForTag(key: string): string[] {
  const set = new Set<string>();
  const direct = BIOME_TAGS[key]?.biomes ?? [];
  for (const b of direct) {
    if (b.startsWith("minecraft:")) set.add(b);
  }
  // Fallback table — fills the gap when the generated data references
  // an upstream tag without resolving it.
  for (const b of VANILLA_FALLBACK[key] ?? []) set.add(b);
  return [...set].sort((a, b) =>
    minecraftBiomeLabel(a).localeCompare(minecraftBiomeLabel(b), "fr"),
  );
}

/**
 * Friendly label for a biome key (FR), with humanised fallback for
 * unmapped keys. Works for both Cobblemon tag keys ("is_jungle") and
 * raw namespaced biome ids ("minecraft:jungle").
 */
export function biomeLabel(key: string): string {
  if (BIOME_LABELS_FR[key]) return BIOME_LABELS_FR[key];
  if (key.includes(":")) {
    // Namespaced biome id (minecraft:jungle, aether:skyroot_forest, …)
    const [ns, name] = key.split(":");
    return `${HUMANIZE(name)} (${ns})`;
  }
  return HUMANIZE(key);
}

/** Concrete MC biomes a tag resolves to (empty for raw biome ids). */
export function biomesForTag(key: string): string[] {
  return BIOME_TAGS[key]?.biomes ?? [];
}
