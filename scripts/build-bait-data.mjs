#!/usr/bin/env node
/**
 * Build src/data/bait-effects-generated.json from Cobblemon's bait /
 * Poké Snack data.
 *
 * Sources (all under `common/src/main/resources/data/cobblemon/`):
 *   spawn_bait_effects/               — per-ingredient effects
 *   seasonings/                       — per-ingredient visual color
 *   tags/item/recipe_filters/bait_seasoning.json  — valid seasonings list
 *   recipe/campfire_pot/poke_snack.json           — campfire pot recipe
 *
 * Output structure:
 *   {
 *     "items": {
 *       "cobblemon:payapa_berry": {
 *         "color": "purple",
 *         "effects": [
 *           { "type": "typing", "subcategory": "psychic", "chance": 1.0, "value": 10.0 }
 *         ]
 *       },
 *       …
 *     },
 *     "recipe": { … cooked snack recipe pattern … },
 *     "validSeasonings": ["minecraft:apple", "minecraft:golden_apple", …, "#cobblemon:berries"]
 *   }
 *
 * Re-run:
 *   node scripts/build-bait-data.mjs
 */

import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawnProc } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/bait-effects-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/cobblemon-build-cache");
const EXTRACT_HINT = "cobblemon-main-common-src-main-resources-data-cobblemon";
const TARBALL_URL =
  "https://gitlab.com/cable-mc/cobblemon/-/archive/main/cobblemon-main.tar.gz?path=common/src/main/resources/data/cobblemon";
const TARBALL = join(CACHE_DIR, "cobblemon-mod.tar.gz");

const slash = (p) => p.replace(/\\/g, "/");

function shell(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawnProc(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${c}`))));
  });
}

async function ensureCobblemonData() {
  await mkdir(CACHE_DIR, { recursive: true });
  const entries = await readdir(CACHE_DIR, { withFileTypes: true });
  const haveExtract = entries.some(
    (e) => e.isDirectory() && e.name.startsWith(EXTRACT_HINT),
  );
  if (haveExtract) return;
  console.log("→ Downloading Cobblemon data tarball…");
  await shell("curl", ["-fsSL", "--retry", "3", TARBALL_URL, "-o", TARBALL]);
  await shell("tar", ["--force-local", "-xzf", slash(TARBALL), "-C", slash(CACHE_DIR)]);
}

async function findDataRoot() {
  const entries = await readdir(CACHE_DIR, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && e.name.startsWith(EXTRACT_HINT),
  );
  if (!match) throw new Error("extract root not found");
  return join(
    CACHE_DIR, match.name, "common/src/main/resources/data/cobblemon",
  );
}

async function* walkJson(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* walkJson(full);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield full;
  }
}

/** Strip the cobblemon namespace from an effect type. */
function shortEffectType(raw) {
  return typeof raw === "string" ? raw.replace(/^cobblemon:/, "") : raw;
}

async function main() {
  await ensureCobblemonData();
  const root = await findDataRoot();

  // 1. Bait effects.
  const items = {};
  const baitDir = join(root, "spawn_bait_effects");
  for await (const file of walkJson(baitDir)) {
    const doc = JSON.parse(await readFile(file, "utf8"));
    const id = doc.item;
    if (!id) continue;
    items[id] = {
      effects: (doc.effects ?? []).map((e) => ({
        type: shortEffectType(e.type),
        ...(e.subcategory ? { subcategory: e.subcategory } : {}),
        chance: e.chance ?? 1.0,
        value: e.value ?? null,
      })),
    };
  }

  // 2. Seasoning colors (visual).
  const seasoningDir = join(root, "seasonings");
  let seasoningCount = 0;
  for await (const file of walkJson(seasoningDir)) {
    const doc = JSON.parse(await readFile(file, "utf8"));
    const id = doc.ingredient;
    if (!id) continue;
    seasoningCount++;
    if (!items[id]) items[id] = { effects: [] };
    if (doc.colour) items[id].color = doc.colour;
  }

  // 3. Valid seasonings tag.
  const tagPath = join(
    root, "tags/item/recipe_filters/bait_seasoning.json",
  );
  const tagDoc = JSON.parse(await readFile(tagPath, "utf8"));
  const validSeasonings = (tagDoc.values ?? []).map((v) =>
    typeof v === "string" ? v : v.id,
  );

  // 4. Poké Snack recipe.
  const recipePath = join(root, "recipe/campfire_pot/poke_snack.json");
  const recipe = JSON.parse(await readFile(recipePath, "utf8"));

  const output = {
    items,
    recipe: {
      type: recipe.type,
      pattern: recipe.pattern,
      key: recipe.key,
      result: recipe.result?.id ?? recipe.result,
      seasoningTag: recipe.seasoningTag,
      seasoningProcessors: recipe.seasoningProcessors,
    },
    validSeasonings,
  };

  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + "\n");

  // ─── Summary ─────────────────────────────────────────────────────────
  const itemIds = Object.keys(items);
  const withEffects = itemIds.filter((id) => items[id].effects.length > 0);
  const withColor = itemIds.filter((id) => items[id].color);
  const typingBaits = itemIds.filter((id) =>
    items[id].effects.some((e) => e.type === "typing"),
  );
  console.log(`\n✓ ${itemIds.length} items → ${OUTPUT}`);
  console.log(`  with bait effects:  ${withEffects.length}`);
  console.log(`  with color:         ${withColor.length}`);
  console.log(`  with typing boost:  ${typingBaits.length}`);
  console.log(`  valid seasonings:   ${validSeasonings.length}`);

  const effectTypes = new Set();
  for (const i of Object.values(items))
    for (const e of i.effects) effectTypes.add(e.type);
  console.log(`  distinct effect types: ${[...effectTypes].sort().join(", ")}`);

  // Show typing boosts grouped by type
  const byType = {};
  for (const [id, def] of Object.entries(items)) {
    for (const e of def.effects) {
      if (e.type === "typing" && e.subcategory) {
        (byType[e.subcategory] ??= []).push({ id, value: e.value });
      }
    }
  }
  console.log(`\n  typing boosts by type:`);
  for (const [t, list] of Object.entries(byType).sort()) {
    const top = list.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
    console.log(`    ${t.padEnd(10)} ${list.length} bait(s), best: ${top.id} (×${top.value})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
