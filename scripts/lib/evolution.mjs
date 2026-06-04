/**
 * Shared evolution helpers. Used by both `build-pokemon-data.mjs` (full
 * rebuild from network) and `patch-evolution-details.mjs` (offline
 * patch from the local cobblemon cache) so the two paths produce the
 * exact same `method` string and `details` payload for a given source
 * evolution row.
 */

// ─── French labels for evolution-relevant Cobblemon items ─────────────
//
// Inline so the script stays a single-file run with no runtime
// dependency on `src/data/competitive-items.ts`. Add new entries as
// Cobblemon ships new evolution items; the renderer falls through to
// a humanized slug for unknowns.
export const ITEM_FR = {
  metal_coat: "Peau Métal",
  prism_scale: "Écaille Prisma",
  dragon_scale: "Écaille Draco",
  kings_rock: "Roche Royale",
  link_cable: "Câble Liaison",
  upgrade: "Améliorator",
  dubious_disc: "CD Douteux",
  protector: "Protecteur",
  reaper_cloth: "Tissu Évanesc",
  electirizer: "Électiriseur",
  magmarizer: "Magmariseur",
  razor_claw: "Griffe Rasoir",
  razor_fang: "Croc Rasoir",
  oval_stone: "Pierre Ovale",
  deep_sea_tooth: "Dent Océan",
  deep_sea_scale: "Écaille Océan",
  whipped_dream: "Crème Fouettée",
  sachet: "Sachet Senteur",
  cracked_pot: "Théière Fêlée",
  chipped_pot: "Théière Cassée",
  galarica_cuff: "Bracelet Galarica",
  galarica_wreath: "Couronne Galarica",
  sweet_apple: "Pomme Sucrée",
  tart_apple: "Pomme Acidulée",
  black_augurite: "Augurite Noire",
  peat_block: "Bloc de Tourbe",
  auspicious_armor: "Armure Augure",
  malicious_armor: "Armure Maudite",
  scroll_of_darkness: "Parchemin Ténèbres",
  scroll_of_waters: "Parchemin Eaux",
  syrupy_apple: "Pomme Sirupeuse",
  unremarkable_teacup: "Tasse Banale",
  masterpiece_teacup: "Tasse Chef-d'œuvre",
  metal_alloy: "Alliage Métal",
  thunder_stone: "Pierre Foudre",
  water_stone: "Pierre Eau",
  fire_stone: "Pierre Feu",
  leaf_stone: "Pierre Plante",
  moon_stone: "Pierre Lune",
  sun_stone: "Pierre Soleil",
  dusk_stone: "Pierre Nuit",
  dawn_stone: "Pierre Aube",
  shiny_stone: "Pierre Éclat",
  ice_stone: "Pierre Glace",
  shell_helmet: "Casque Coque",
};

export const TIME_FR = {
  day: "le jour",
  night: "la nuit",
  dawn: "à l'aube",
  dusk: "au crépuscule",
  midnight: "à minuit",
  noon: "à midi",
  morning: "le matin",
  afternoon: "l'après-midi",
  evening: "le soir",
  any: "à toute heure",
};

export const STAT_FR = {
  hp: "PV",
  attack: "Attaque",
  defence: "Défense",
  defense: "Défense",
  special_attack: "Atq. Spé.",
  special_defence: "Déf. Spé.",
  special_defense: "Déf. Spé.",
  speed: "Vitesse",
};

export const WEATHER_FR = {
  rain: "sous la pluie",
  clear: "par temps clair",
  thunder: "sous l'orage",
  snow: "sous la neige",
  any: "par tout temps",
};

export function stripPrefix(id) {
  if (!id || typeof id !== "string") return id;
  return id.replace(/^cobblemon:/, "").replace(/^minecraft:/, "");
}

export function humanizeSlug(slug) {
  if (!slug) return "";
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function itemLabelFr(rawId) {
  const id = stripPrefix(rawId);
  return ITEM_FR[id] ?? humanizeSlug(id);
}

function timeLabelFr(range) {
  if (!range) return "";
  return TIME_FR[range] ?? humanizeSlug(range);
}

function statLabelFr(stat) {
  return STAT_FR[stat] ?? humanizeSlug(stat);
}

function weatherLabelFr(w) {
  return WEATHER_FR[w] ?? humanizeSlug(w);
}

/**
 * Compose a French human-readable summary from a Cobblemon evolution
 * source row. Used as a fallback for legacy renderers; the new UI
 * prefers the structured `details` payload below.
 */
export function describeEvolution(e) {
  const variant = e.variant;
  const reqs = Array.isArray(e.requirements) ? e.requirements : [];
  const heldItem = reqs.find((r) => r.variant === "held_item")?.itemCondition;
  const level = reqs.find((r) => r.variant === "level")?.minLevel;
  const friendship = reqs.find((r) => r.variant === "friendship")?.amount;
  const time = reqs.find((r) => r.variant === "time_range")?.range;
  const biome = reqs.find((r) => r.variant === "biome")?.biomeCondition;
  const stat = reqs.find((r) => r.variant === "stat_compare");
  const knownMove = reqs.find((r) => r.variant === "known_move")?.move;
  const moveType = reqs.find((r) => r.variant === "known_move_type")?.type;
  const weather = reqs.find((r) => r.variant === "weather")?.weather;
  const ctx = e.requiredContext;

  const tail = [];
  if (friendship) tail.push(`amitié ≥ ${friendship}`);
  if (time) tail.push(timeLabelFr(time));
  if (biome) tail.push(`dans ${humanizeSlug(stripPrefix(biome))}`);
  if (stat?.highStat && stat?.lowStat) {
    tail.push(`${statLabelFr(stat.highStat)} > ${statLabelFr(stat.lowStat)}`);
  }
  if (knownMove) tail.push(`en connaissant ${humanizeSlug(knownMove)}`);
  if (moveType) tail.push(`en connaissant un move ${humanizeSlug(moveType)}`);
  if (weather) tail.push(weatherLabelFr(weather));

  if (variant === "trade") {
    const parts = ["Échange"];
    if (heldItem) parts.push(`en tenant ${itemLabelFr(heldItem)}`);
    if (ctx) parts.push(`contre ${humanizeSlug(stripPrefix(ctx))}`);
    if (tail.length > 0) parts.push(tail.join(", "));
    return parts.join(" ");
  }

  if (variant === "item_interact" || variant === "use_item") {
    if (ctx) {
      return tail.length > 0
        ? `${itemLabelFr(ctx)} (${tail.join(", ")})`
        : itemLabelFr(ctx);
    }
    return tail.length > 0 ? `Objet (${tail.join(", ")})` : "Objet";
  }

  if (variant === "level_up") {
    const head = level ? `Niveau ${level}` : "Montée de niveau";
    if (heldItem) tail.unshift(`en tenant ${itemLabelFr(heldItem)}`);
    return tail.length > 0 ? `${head} · ${tail.join(", ")}` : head;
  }

  const head = humanizeSlug(variant ?? "evolution");
  return tail.length > 0 ? `${head} · ${tail.join(", ")}` : head;
}

/**
 * Strip noise out of a raw Cobblemon evolution entry to land a compact
 * JSON-clean `details` payload. Empty arrays and falsey flags are
 * dropped so the data file stays small.
 */
export function mapDetails(e) {
  const out = { variant: e.variant ?? "evolution" };
  if (e.requiredContext) out.requiredContext = e.requiredContext;
  if (e.consumeHeldItem) out.consumeHeldItem = true;
  const reqs = Array.isArray(e.requirements)
    ? e.requirements.filter((r) => r && typeof r === "object")
    : [];
  if (reqs.length > 0) out.requirements = reqs;
  const moves = Array.isArray(e.learnableMoves)
    ? e.learnableMoves.filter((m) => typeof m === "string")
    : [];
  if (moves.length > 0) out.learnableMoves = moves;
  return out;
}
