#!/usr/bin/env node
/**
 * Build src/data/biomes-generated.json from Cobblemon's biome tag files:
 *
 *   common/src/main/resources/data/cobblemon/tags/worldgen/biome/**.json
 *
 * Each Cobblemon tag (`is_jungle`, `is_volcanic`, …) groups several
 * concrete Minecraft / modded biome ids. We flatten each tag into a
 * sorted list of biome ids so the UI can render a tooltip like
 * "Jungle — minecraft:jungle, minecraft:bamboo_jungle, …".
 *
 *   {
 *     "is_jungle": {
 *       "biomes": ["minecraft:jungle", "minecraft:bamboo_jungle", …],
 *       "tagRefs": ["minecraft:is_jungle", "c:is_jungle"]   // recursive refs we couldn't resolve
 *     },
 *     "nether/is_basalt": { … }
 *   }
 *
 * Re-run:
 *   node scripts/build-biomes-data.mjs
 */

import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawnProc } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/biomes-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/cobblemon-build-cache");
const EXTRACT_HINT = "cobblemon-main";

const TAGS_URL =
  "https://gitlab.com/cable-mc/cobblemon/-/archive/main/cobblemon-main.tar.gz?path=common/src/main/resources/data/cobblemon/tags";

const slash = (p) => p.replace(/\\/g, "/");

function shell(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawnProc(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${c}`))));
  });
}

async function fetchTags() {
  await mkdir(CACHE_DIR, { recursive: true });
  console.log("→ Downloading Cobblemon tags…");
  const tarball = join(CACHE_DIR, "cobblemon-tags.tar.gz");
  await shell("curl", ["-fsSL", "--retry", "3", TAGS_URL, "-o", tarball]);
  await shell("tar", ["--force-local", "-xzf", slash(tarball), "-C", slash(CACHE_DIR)]);
}

async function findTagsRoot() {
  const entries = await readdir(CACHE_DIR, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && e.name.startsWith(EXTRACT_HINT),
  );
  if (!match) throw new Error("extract root not found");
  return join(
    CACHE_DIR,
    match.name,
    "common/src/main/resources/data/cobblemon/tags/worldgen/biome",
  );
}

async function* walkJson(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* walkJson(full);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield full;
  }
}

function normalizeValueEntry(v) {
  // Entries are either a string (biome id or tag ref) or
  // `{ id: "...", required: bool }`.
  const raw = typeof v === "string" ? v : v?.id;
  if (typeof raw !== "string") return null;
  return raw;
}

async function main() {
  await fetchTags();
  const tagsRoot = await findTagsRoot();
  console.log("→ Parsing tag files in", tagsRoot);

  // 1. Index every tag file → its declared values.
  /** @type {Map<string, { biomes: Set<string>; tagRefs: Set<string> }>} */
  const tagIndex = new Map();

  for await (const file of walkJson(tagsRoot)) {
    const rel = relative(tagsRoot, file).replace(/\\/g, "/").replace(/\.json$/, "");
    const doc = JSON.parse(await readFile(file, "utf8"));
    const biomes = new Set();
    const tagRefs = new Set();
    for (const v of doc.values ?? []) {
      const raw = normalizeValueEntry(v);
      if (!raw) continue;
      if (raw.startsWith("#")) tagRefs.add(raw.slice(1));
      else biomes.add(raw);
    }
    tagIndex.set(rel, { biomes, tagRefs });
  }

  // 2. Resolve nested cobblemon tag refs (e.g. `is_overworld` includes
  //    `#cobblemon:is_forest` which we have indexed).
  function resolveCobblemonRef(ref) {
    // `cobblemon:is_jungle` → look up `is_jungle`.
    // `cobblemon:nether/is_basalt` → look up `nether/is_basalt`.
    const m = ref.match(/^cobblemon:(.+)$/);
    if (!m) return null;
    return tagIndex.get(m[1]) ?? null;
  }

  /** Flatten one tag, expanding cobblemon nested refs once (cycle-safe). */
  function flatten(tagKey, seen = new Set()) {
    if (seen.has(tagKey)) return { biomes: new Set(), tagRefs: new Set() };
    seen.add(tagKey);
    const node = tagIndex.get(tagKey);
    if (!node) return { biomes: new Set(), tagRefs: new Set() };
    const biomes = new Set(node.biomes);
    const tagRefs = new Set();
    for (const ref of node.tagRefs) {
      const inner = resolveCobblemonRef(ref);
      if (inner) {
        // Recurse: pull in nested cobblemon tag's biomes too.
        const sub = flatten(ref.replace(/^cobblemon:/, ""), seen);
        for (const b of sub.biomes) biomes.add(b);
        for (const t of sub.tagRefs) tagRefs.add(t);
      } else {
        tagRefs.add(ref);
      }
    }
    return { biomes, tagRefs };
  }

  // 3. Emit only spawn-relevant tags.
  // Cobblemon's `tags/worldgen/biome` also contains `has_block/`,
  // `has_season/`, `evolution/`, … — those drive other mechanics (block
  // presence, regional evolutions). For spawning, only the `is_*` tags
  // (including nested `nether/is_*` and `space/is_*`) are referenced by
  // spawn rules. We keep just those.
  const isRelevant = (k) => /(^|\/)is_/.test(k);
  const out = {};
  for (const key of tagIndex.keys()) {
    if (!isRelevant(key)) continue;
    const { biomes, tagRefs } = flatten(key);
    out[key] = {
      biomes: [...biomes].sort(),
      tagRefs: [...tagRefs].sort(),
    };
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  // ─── Summary ─────────────────────────────────────────────────────────
  const keys = Object.keys(out).sort();
  console.log(`\n✓ ${keys.length} biome tags → ${OUTPUT}`);
  const biggest = keys
    .map((k) => ({ k, n: out[k].biomes.length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  console.log(`  top 10 by concrete biome count:`);
  for (const { k, n } of biggest) console.log(`    ${n.toString().padStart(4)}  ${k}`);
  const sample = ["is_jungle", "is_volcanic", "is_freezing", "nether/is_basalt"];
  for (const s of sample) {
    if (out[s]) {
      console.log(`\n  ${s}: ${out[s].biomes.length} biomes (sample 5)`);
      for (const b of out[s].biomes.slice(0, 5)) console.log(`    ${b}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
