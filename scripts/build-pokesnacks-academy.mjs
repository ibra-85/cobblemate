#!/usr/bin/env node
/**
 * Build `src/data/pokesnack-academy/pokesnacks.generated.json` — the final
 * dataset the PokéSnacks UI consumes.
 *
 *   node scripts/build-pokesnacks-academy.mjs
 *
 * Inputs (must exist first):
 *   - tmp/academy/dex.json                  (lean index)
 *   - tmp/academy/mons/<id>.json            (per-mon detail)
 *   - src/data/pokesnack-academy/seasonings.json   (built by build-seasonings.mjs)
 *   - src/data/pokesnack-academy/rules.json        (declarative recipe rules)
 *   - src/data/pokemon-generated.json       (FR name lookup, optional)
 *
 * Output is sorted by `nationalDex` then `slug`, snake_case ids,
 * with explicit confidence flags everywhere a value is inferred
 * rather than read directly from the Academy data.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ACADEMY_DIR = path.join(ROOT, "tmp/academy");
const MONS_DIR    = path.join(ACADEMY_DIR, "mons");
const SEASON_FILE = path.join(ROOT, "src/data/pokesnack-academy/seasonings.json");
const RULES_FILE  = path.join(ROOT, "src/data/pokesnack-academy/rules.json");
const POKEMON_FR  = path.join(ROOT, "src/data/pokemon-generated.json");
const OUT_FILE    = path.join(ROOT, "src/data/pokesnack-academy/pokesnacks.generated.json");

// ─── Helpers ─────────────────────────────────────────────────────

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Pretty French label for a biome tag/id. Falls back to the
 *  humanised English form when no FR label is on file — caller can
 *  always read the raw id from the source field. */
function humanizeBiomeTag(tag) {
  // Drop the leading "#cobblemon:" / "minecraft:" namespace bits.
  return tag.replace(/^#?\w+:/, "").replace(/^is_/, "");
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

// ─── Loader ──────────────────────────────────────────────────────

async function loadAcademy() {
  const dex = await readJson(path.join(ACADEMY_DIR, "dex.json"));
  const mons = [];
  for (const entry of dex) {
    try {
      const full = await readJson(path.join(MONS_DIR, `${entry.id}.json`));
      mons.push(full);
    } catch (e) {
      console.warn(`! skipping ${entry.id}: ${e.message}`);
    }
  }
  return { dex, mons };
}

async function loadFrenchNames() {
  try {
    const data = await readJson(POKEMON_FR);
    // pokemon-generated.json shape varies — accept either array or
    // {id: row} map. We just want id → FR name lookup.
    const out = new Map();
    const rows = Array.isArray(data) ? data : Object.values(data);
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      if (row.id && row.name) out.set(row.id, row.name);
    }
    return out;
  } catch {
    return new Map();
  }
}

// ─── Category resolution ────────────────────────────────────────

function categoryFromLabels(labels = [], rules) {
  const map = rules.categoryFromLabels;
  for (const label of labels) {
    if (map[label]) return map[label];
  }
  // No special label → fall back by spawn rarity later.
  return null;
}

// ─── Spawn aggregation ──────────────────────────────────────────

/** Roll up the per-spawn-rule shape Academy exposes into one
 *  summary the UI can read: list of biomes, time/weather/dimension
 *  conditions, structures, and an overall rarity label.
 *
 *  We keep the underlying source URIs so the UI can show "based on
 *  spawn pool X" links when debugging.
 */
function aggregateSpawns(spawns) {
  if (!spawns || spawns.length === 0) {
    return {
      biomes: [],
      conditions: { time: [], weather: [], structures: [], dimension: [] },
      rarity: "unknown",
      confidence: "missing",
      sources: [],
    };
  }
  // `spawns` is a 2D array — each outer entry is a "spawn pool",
  // each inner is one rule. Flatten to a single rule list.
  const flat = spawns.flat();

  const biomes = new Set();
  const time = new Set();
  const weather = new Set();
  const structures = new Set();
  const dimension = new Set();
  const rarities = [];
  const sources = new Set();

  for (const r of flat) {
    if (r.source) sources.add(r.source);
    if (r.rarity) rarities.push(r.rarity);
    if (r.biomeTags?.include) for (const b of r.biomeTags.include) biomes.add(b);
    if (r.biomes?.include)    for (const b of r.biomes.include)    biomes.add(b);
    if (r.time)        time.add(r.time);
    if (r.timeRange)   time.add(r.timeRange);
    if (r.weather)     weather.add(r.weather);
    if (r.structures?.include) for (const s of r.structures.include) structures.add(s);
    if (r.context)     dimension.add(r.context);
    if (r.dimension)   dimension.add(r.dimension);
  }

  // Pick the rarest rarity (rare > uncommon > common) as the
  // representative one. Cobblemon shows the "strictest" rarity in-
  // game when a mon spawns under multiple rules.
  const order = ["ultra-rare", "rare", "uncommon", "common"];
  let rarity = "unknown";
  for (const r of order) if (rarities.includes(r)) { rarity = r; break; }

  return {
    biomes: [...biomes],
    biomesFr: [...biomes].map(humanizeBiomeTag),
    conditions: {
      time: [...time],
      weather: [...weather],
      structures: [...structures],
      dimension: [...dimension],
    },
    rarity,
    confidence: rarities.length > 0 ? "official" : "inferred",
    sources: [...sources],
  };
}

// ─── Type berry lookup ─────────────────────────────────────────

/** Pick the strongest seasoning that boosts spawn rate for a given
 *  type. Pre-indexed once for speed. */
function indexTypeBerries(seasonings) {
  const map = new Map(); // type → [{id, value}, …]
  for (const s of seasonings) {
    const tsm = s.effects.typeSpawnMultiplier;
    if (!tsm) continue;
    const list = map.get(tsm.type) ?? [];
    list.push({ id: s.fullId, value: tsm.value });
    map.set(tsm.type, list);
  }
  for (const arr of map.values()) arr.sort((a, b) => b.value - a.value);
  return map;
}

// ─── Recipe builder ─────────────────────────────────────────────

/**
 * Resolve a slot spec into a concrete item id (or null if nothing
 * fits — e.g. a typeBerry slot for a Pokémon's secondary type when
 * the mon is mono-type).
 *
 * Slot specs:
 *  - { kind: "typeBerry", typeIndex: 0|1, fallbackToItem?: "ns:id" }
 *  - { kind: "item",      id: "ns:id" }
 */
function resolveSlot(spec, ctx) {
  if (spec.kind === "item") return spec.id;
  if (spec.kind === "typeBerry") {
    const t = ctx.types[spec.typeIndex];
    if (t) {
      const best = ctx.typeBerries.get(t)?.[0];
      if (best) return best.id;
    }
    return spec.fallbackToItem ?? null;
  }
  return null;
}

function buildRecipe(recipe, ctx) {
  const slots = recipe.slots.map((s) => resolveSlot(s, ctx));
  return {
    label: recipe.label,
    ingredients: slots,
    goal: recipe.goal,
    reason: recipe.reason,
    effectConfidence: recipe.effectConfidence ?? "community_or_inferred",
  };
}

// ─── Main per-mon transformer ───────────────────────────────────

function buildEntry(mon, ctx) {
  const labels = mon.labels ?? [];
  const types = [mon.primaryType, mon.secondaryType].filter(Boolean);
  const spawn = aggregateSpawns(mon.spawns);

  // Category: explicit Academy label first (legendary, paradox, …),
  // otherwise fall back to spawn rarity.
  let category = categoryFromLabels(labels, ctx.rules);
  if (!category) category = spawn.rarity === "unknown" ? "common" : spawn.rarity.replace("-", "_");

  // useCase passed into per-recipe templates so the build can
  // adjust labels/reasons later if desired.
  const useCase =
    ["legendary", "mythical", "paradox", "ultra_beast"].includes(category)
      ? "elite_hunt"
      : ["starter", "fossil"].includes(category)
        ? "starter_farm"
        : "general";

  // Recommendations — bestGeneral is delegated to useCaseWeights;
  // every other recipe is computed directly.
  const recipes = ctx.rules.recipes;
  const bestGeneralKey = ctx.rules.useCaseWeights[category]?.bestGeneral ?? "typeCoverage";
  const recipeCtx = { types, typeBerries: ctx.typeBerries };

  const recommendedSnacks = {
    bestGeneral: {
      ...buildRecipe(recipes[bestGeneralKey], recipeCtx),
      label: "Meilleur choix général",
    },
    budget:       buildRecipe(recipes.budget, recipeCtx),
    typeCoverage: buildRecipe(recipes.typeCoverage, recipeCtx),
    rareSpawn:    buildRecipe(recipes.rareSpawn, recipeCtx),
    shinyHunt:    buildRecipe(recipes.shinyHunt, recipeCtx),
  };

  const notes = [];
  if (spawn.conditions.time.length > 0)
    notes.push(`Spawn limité au moment : ${spawn.conditions.time.join(", ")}.`);
  if (spawn.conditions.weather.length > 0)
    notes.push(`Météo requise : ${spawn.conditions.weather.join(", ")}.`);
  if (spawn.conditions.structures.length > 0)
    notes.push(`Lié à une structure : ${spawn.conditions.structures.join(", ")}.`);
  if (spawn.conditions.dimension.length > 0 && !spawn.conditions.dimension.includes("overworld"))
    notes.push(`Dimension : ${spawn.conditions.dimension.join(", ")}.`);
  if (spawn.biomes.length === 0)
    notes.push("Aucune règle de spawn naturelle trouvée — probablement événementiel, drop ou interaction.");

  return {
    nationalDex: mon.dexnum ?? null,
    slug: mon.id,
    name: {
      en: mon.name,
      fr: ctx.frNames.get(mon.id) ?? mon.name,
    },
    types,
    category,
    labels,
    serverAvailable: true, // anything in the Academy dex is implemented on the server
    implemented: mon.implemented ?? null,
    forms: mon.forms ?? [],

    spawn: {
      biomes: spawn.biomes,
      biomesFr: spawn.biomesFr,
      conditions: spawn.conditions,
      rarity: spawn.rarity,
      confidence: spawn.confidence,
      sources: spawn.sources,
    },

    recommendedSnacks,

    targeting: {
      priorityType: types[0] ?? null,
      secondaryType: types[1] ?? null,
      useCase,
      possibleParasiteSpawns: [], // populated later by a separate pass
      notes,
    },

    confidence: {
      pokemonData: "official",
      spawnData: spawn.confidence,
      snackLogic: "inferred",
      seasoningEffects: "official",
    },
  };
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("→ Loading Academy snapshot…");
  const { mons } = await loadAcademy();
  const seasonings = await readJson(SEASON_FILE);
  const rules = await readJson(RULES_FILE);
  const frNames = await loadFrenchNames();
  const typeBerries = indexTypeBerries(seasonings);

  const ctx = { rules, typeBerries, frNames };

  console.log(`→ Building ${mons.length} entries…`);
  const entries = mons
    .map((m) => buildEntry(m, ctx))
    // sort by nationalDex (nulls last), then slug for stability
    .sort((a, b) => {
      const ax = a.nationalDex ?? Infinity;
      const bx = b.nationalDex ?? Infinity;
      if (ax !== bx) return ax - bx;
      return a.slug.localeCompare(b.slug);
    });

  const meta = {
    generatedAt: new Date().toISOString(),
    source: "cobblemon-academy-dex-2.pages.dev",
    counts: {
      total: entries.length,
      withSpawn: entries.filter((e) => e.spawn.biomes.length > 0).length,
      legendary: entries.filter((e) => e.category === "legendary").length,
      mythical: entries.filter((e) => e.category === "mythical").length,
      paradox: entries.filter((e) => e.category === "paradox").length,
      ultraBeast: entries.filter((e) => e.category === "ultra_beast").length,
      starter: entries.filter((e) => e.category === "starter").length,
    },
  };

  const out = { meta, entries };
  await fs.writeFile(OUT_FILE, JSON.stringify(out));
  console.log(`✓ ${entries.length} entries written → ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`  legendary=${meta.counts.legendary}  mythical=${meta.counts.mythical}  paradox=${meta.counts.paradox}  ultraBeast=${meta.counts.ultraBeast}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
