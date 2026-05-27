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
  is_dripstone:        "Dripstone",
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
