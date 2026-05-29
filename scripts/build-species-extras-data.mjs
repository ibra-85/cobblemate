#!/usr/bin/env node
/**
 * Build src/data/species-extras-generated.json by harvesting the
 * fields the existing `pokemon-generated.json` doesn't carry, straight
 * from Cobblemon's official `species/generation<N>/<mon>.json` files.
 *
 * Fields we pull:
 *   - drops          : loot table on defeat
 *   - evYield        : EVs awarded
 *   - eggGroups      : breeding groups
 *   - eggCycles      : hatch steps
 *   - catchRate      : 0-255 capture rate
 *   - experienceGroup: leveling curve id
 *   - baseFriendship : starting happiness
 *   - baseExperienceYield
 *   - height, weight, baseScale
 *   - labels         : ["legendary", "mythical", "ultra_beast", "paradox", "gen1", …]
 *   - pokedex        : i18n keys for description text
 *
 * Keyed by app id, matching pokemon-generated.json:
 *
 *   {
 *     "abra": { "drops": {...}, "evYield": {...}, "labels": ["gen1"], … }
 *   }
 *
 * Re-run:
 *   node scripts/build-species-extras-data.mjs
 */

import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawnProc } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const POKEMON_JSON = resolve(ROOT, "src/data/pokemon-generated.json");
const OUTPUT = resolve(ROOT, "src/data/species-extras-generated.json");
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

async function findSpeciesRoot() {
  const entries = await readdir(CACHE_DIR, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && e.name.startsWith(EXTRACT_HINT),
  );
  if (!match) throw new Error("extract root not found");
  return join(
    CACHE_DIR, match.name, "common/src/main/resources/data/cobblemon/species",
  );
}

async function* walkJson(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* walkJson(full);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield full;
  }
}

/**
 * Cobblemon's `name` field is the canonical species name in title case
 * ("Abra", "Mr. Mime"). Map it to the app id ("abra", "mrmime").
 */
function speciesNameToId(name) {
  return String(name)
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/é/g, "e")
    // Strip every non-alphanumeric character (handles fancy U+2019
    // apostrophes in "Farfetch’d", colons in "Type: Null", hyphens, dots).
    .replace(/[^a-z0-9]/g, "");
}

const FIELDS = [
  "drops", "evYield", "eggGroups", "eggCycles", "catchRate",
  "experienceGroup", "baseFriendship", "baseExperienceYield",
  "height", "weight", "baseScale", "labels", "pokedex",
];

/**
 * Cobblemon's `moves` field is a flat string array. Each entry is
 * `"<source>:<moveId>"`:
 *   - "<level>:<moveId>"   — learnt at <level> (e.g. "3:vinewhip")
 *   - "egg:<moveId>"       — egg move
 *   - "tm:<moveId>"        — taught by TM
 *   - "tutor:<moveId>"     — move tutor
 *   - "legacy:<moveId>"    — generation-specific past-only
 *   - "special:<moveId>"   — event-only
 *
 * We split into one bucket per learning method so the UI can render
 * a clean table.
 */
function parseMoves(raw) {
  const byMethod = { level: [], egg: [], tm: [], tutor: [], legacy: [], special: [] };
  for (const entry of raw ?? []) {
    const idx = entry.indexOf(":");
    if (idx < 0) continue;
    const source = entry.slice(0, idx);
    const moveId = entry.slice(idx + 1);
    if (/^\d+$/.test(source)) {
      byMethod.level.push({ level: Number(source), move: moveId });
    } else if (byMethod[source]) {
      byMethod[source].push(moveId);
    }
  }
  byMethod.level.sort((a, b) => a.level - b.level || a.move.localeCompare(b.move));
  for (const k of ["egg", "tm", "tutor", "legacy", "special"]) {
    byMethod[k].sort();
  }
  return byMethod;
}

async function main() {
  await ensureCobblemonData();
  const root = await findSpeciesRoot();
  console.log("→ Parsing species data in", root);

  const validIds = new Set(
    JSON.parse(await readFile(POKEMON_JSON, "utf8")).map((p) => p.id),
  );

  const out = {};
  const unmatched = [];
  let total = 0;

  for await (const file of walkJson(root)) {
    total++;
    const doc = JSON.parse(await readFile(file, "utf8"));
    if (doc.implemented === false) continue;
    const id = speciesNameToId(doc.name);
    if (!validIds.has(id)) {
      unmatched.push({ id, name: doc.name });
      continue;
    }
    const extras = {};
    for (const field of FIELDS) {
      if (doc[field] !== undefined) extras[field] = doc[field];
    }
    if (Array.isArray(doc.moves)) {
      extras.movesByMethod = parseMoves(doc.moves);
    }
    out[id] = extras;
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  // ─── Summary ─────────────────────────────────────────────────────────
  const ids = Object.keys(out);
  console.log(`\n✓ ${ids.length} species extras → ${OUTPUT}`);
  console.log(`  files processed:   ${total}`);
  console.log(`  matched:           ${ids.length}`);
  console.log(`  unmatched:         ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`  unmatched sample:`);
    unmatched.slice(0, 10).forEach((u) =>
      console.log(`    ${u.id.padEnd(20)} (was "${u.name}")`),
    );
  }

  const counts = { drops: 0, evYield: 0, legendary: 0, mythical: 0, paradox: 0, ultra_beast: 0 };
  for (const extras of Object.values(out)) {
    if (extras.drops) counts.drops++;
    if (extras.evYield) counts.evYield++;
    const labels = extras.labels ?? [];
    if (labels.includes("legendary")) counts.legendary++;
    if (labels.includes("mythical")) counts.mythical++;
    if (labels.includes("paradox")) counts.paradox++;
    if (labels.includes("ultra_beast")) counts.ultra_beast++;
  }
  console.log(`\n  field coverage:`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`    ${k.padEnd(12)} ${v}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
