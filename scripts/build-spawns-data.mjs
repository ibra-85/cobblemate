#!/usr/bin/env node
/**
 * Build src/data/spawns-generated.json by merging every spawn source
 * we care about:
 *
 *   1. Cobblemon mod   — common/src/main/resources/data/cobblemon/spawn_pool_world/
 *                        Natural world spawns (jungle, ocean, hills, …).
 *   2. Cobblemon mod   — common/src/main/resources/data/cobblemon/habitat_pools/
 *                        Structure-bound spawns (dungeons, ruins, mansions, …).
 *   3. M&L datapack    — data/cobblemon/spawn_pool_world/
 *                        Legendaries / mythicals with key-item conditions.
 *
 * The output is keyed by app id (matching pokemon-generated.json):
 *
 *   {
 *     "bulbasaur": {
 *       "rarities":       ["ultra-rare"],
 *       "biomes":         ["is_jungle"],
 *       "excludedBiomes": [],
 *       "times":          ["any"],
 *       "weathers":       ["any"],
 *       "contexts":       ["grounded"],
 *       "structures":     [],
 *       "keyItems":       [],
 *       "itemRequirements":[],          // [{id, count, consume}]
 *       "levelRange":     [5, 32],
 *       "sources":        ["spawn_pool_world"]
 *     }
 *   }
 *
 * Re-run:
 *   node scripts/build-spawns-data.mjs
 */

import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawnProc } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const POKEMON_JSON = resolve(ROOT, "src/data/pokemon-generated.json");
const OUTPUT = resolve(ROOT, "src/data/spawns-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/cobblemon-build-cache");

// ─── Sources ─────────────────────────────────────────────────────────────

/** @typedef {{ name: string; url: string; archive: string; extractRoot: (cacheDir: string) => string; subPaths: { kind: SourceKind; rel: string }[] }} Source */
/** @typedef {"world" | "habitat"} SourceKind */

const SOURCES = [
  {
    name: "cobblemon-mod",
    url: "https://gitlab.com/cable-mc/cobblemon/-/archive/main/cobblemon-main.tar.gz?path=common/src/main/resources/data/cobblemon",
    archive: "cobblemon-mod.tar.gz",
    extractDirHint: "cobblemon-main",
    base: "common/src/main/resources/data/cobblemon",
    subPaths: [
      { kind: "world",   rel: "spawn_pool_world" },
      { kind: "habitat", rel: "habitat_pools" },
    ],
  },
  {
    name: "mythsandlegends",
    url: "https://github.com/D0ctorLeon/mythsandlegends-datapack/archive/refs/heads/master.tar.gz",
    archive: "mythsandlegends.tar.gz",
    extractDirHint: "mythsandlegends-datapack-master",
    base: "data/cobblemon",
    subPaths: [
      { kind: "world", rel: "spawn_pool_world" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function shell(cmd, args, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const p = spawnProc(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) =>
      code === 0 ? resolveP() : rejectP(new Error(`${cmd} failed: ${code}`)),
    );
  });
}

const slash = (p) => p.replace(/\\/g, "/");

async function downloadSource(src) {
  const target = join(CACHE_DIR, src.archive);
  console.log(`→ Downloading ${src.name}…`);
  await shell("curl", [
    "-fsSL", "--retry", "3", "--retry-delay", "2",
    src.url, "-o", target,
  ]);
  console.log(`  extracting…`);
  await shell("tar", ["--force-local", "-xzf", slash(target), "-C", slash(CACHE_DIR)]);
}

async function findExtractedRoot(src) {
  const entries = await readdir(CACHE_DIR, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && e.name.startsWith(src.extractDirHint),
  );
  if (!match) throw new Error(`extract root not found for ${src.name}`);
  return join(CACHE_DIR, match.name, src.base);
}

// ─── Name → app id ───────────────────────────────────────────────────────

const FORM_SUFFIX = {
  alolan: "_alola",
  galarian: "_galar",
  hisuian: "_hisui",
  paldean: "_paldea",
};

function pokemonNameToId(raw) {
  // Some habitat pool entries reference the species by namespaced id
  // (e.g. "cobblemon:zubat") instead of the bare capitalised name. Drop
  // the namespace prefix before tokenising.
  const cleaned = raw.trim().replace(/^[a-z_]+:/i, "");
  const parts = cleaned.toLowerCase().split(/\s+/);
  const species = parts[0]
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/é/g, "e")
    .replace(/[.'\-]/g, "");
  if (parts.length === 1) return { primary: species, fallback: species };
  for (const q of parts.slice(1)) {
    const suf = FORM_SUFFIX[q];
    if (suf) return { primary: species + suf, fallback: species };
  }
  return { primary: species, fallback: species };
}

function biomeKey(tag) {
  // `#cobblemon:is_jungle` → `is_jungle`
  // `#minecraft:is_overworld` → `minecraft:is_overworld`
  // `minecraft:frozen_peaks` (no `#`, raw biome id) → kept as-is.
  const m = tag.match(/^#([^:]+):(.+)$/);
  if (!m) return tag;
  const [, ns, name] = m;
  return ns === "cobblemon" ? name : `${ns}:${name}`;
}

function parseLevelRange(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// ─── Aggregation ─────────────────────────────────────────────────────────

function pushUnique(arr, value) {
  if (value == null || value === "") return;
  if (!arr.includes(value)) arr.push(value);
}

function ensureEntry(out, id) {
  if (!out[id]) {
    out[id] = {
      rarities: [], biomes: [], excludedBiomes: [],
      times: [], weathers: [], contexts: [],
      structures: [], keyItems: [], itemRequirements: [],
      levelRange: null, sources: [],
    };
  }
  return out[id];
}

function mergeLevelRange(entry, range) {
  if (!range) return;
  if (!entry.levelRange) { entry.levelRange = [...range]; return; }
  entry.levelRange[0] = Math.min(entry.levelRange[0], range[0]);
  entry.levelRange[1] = Math.max(entry.levelRange[1], range[1]);
}

function mergeItemRequirement(entry, req) {
  if (!req || !req.id) return;
  // Dedupe by id; keep highest count / consume preference (consume:true wins).
  const existing = entry.itemRequirements.find((r) => r.id === req.id);
  if (!existing) {
    entry.itemRequirements.push({
      id: req.id, count: req.count ?? 1, consume: req.consume ?? false,
    });
    return;
  }
  existing.count = Math.max(existing.count, req.count ?? 1);
  existing.consume = existing.consume || req.consume === true;
}

// ─── Per-source ingest ───────────────────────────────────────────────────

async function ingestWorld(dir, validIds, out, sourceLabel, unmatched) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let rules = 0;
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    let doc;
    try { doc = JSON.parse(raw); } catch { continue; }
    if (doc.enabled === false || doc.enabled === "false") continue;
    for (const s of doc.spawns ?? []) {
      rules++;
      const { primary, fallback } = pokemonNameToId(s.pokemon || "");
      let id;
      if (validIds.has(primary)) id = primary;
      else if (validIds.has(fallback)) id = fallback;
      else { unmatched.set(s.pokemon, (unmatched.get(s.pokemon) ?? 0) + 1); continue; }

      const e = ensureEntry(out, id);
      pushUnique(e.sources, sourceLabel);
      pushUnique(e.rarities, s.bucket);
      pushUnique(e.contexts, s.spawnablePositionType ?? s.context);

      const cond = s.condition ?? {};
      const acond = s.anticondition ?? {};
      for (const b of cond.biomes ?? []) pushUnique(e.biomes, biomeKey(b));
      for (const b of acond.biomes ?? []) pushUnique(e.excludedBiomes, biomeKey(b));
      for (const st of cond.structures ?? []) pushUnique(e.structures, st);

      pushUnique(e.times, cond.timeRange ?? "any");
      const weather =
        cond.isRaining === true ? "rain" :
        cond.isRaining === false ? "clear" : "any";
      pushUnique(e.weathers, weather);

      if (cond.key_item) pushUnique(e.keyItems, cond.key_item);
      for (const req of cond.item_requirement ?? []) mergeItemRequirement(e, req);

      mergeLevelRange(e, parseLevelRange(s.level));
    }
  }
  return { files: files.length, rules };
}

async function ingestHabitat(dir, validIds, out, sourceLabel, unmatched) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let rules = 0;
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    let doc;
    try { doc = JSON.parse(raw); } catch { continue; }
    const habitatId = file.replace(/\.json$/, "");
    for (const s of doc.spawns ?? []) {
      rules++;
      const { primary, fallback } = pokemonNameToId(s.species || "");
      let id;
      if (validIds.has(primary)) id = primary;
      else if (validIds.has(fallback)) id = fallback;
      else { unmatched.set(s.species, (unmatched.get(s.species) ?? 0) + 1); continue; }

      const e = ensureEntry(out, id);
      pushUnique(e.sources, sourceLabel);
      pushUnique(e.rarities, s.bucket);
      pushUnique(e.contexts, s.spawnablePositionType);
      pushUnique(e.structures, habitatId);
      mergeLevelRange(e, parseLevelRange(s.levelRange));
    }
  }
  return { files: files.length, rules };
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });

  // 1. Download + extract all sources.
  for (const src of SOURCES) {
    await downloadSource(src);
  }

  // 2. Load roster for id validation.
  const validIds = new Set(
    JSON.parse(await readFile(POKEMON_JSON, "utf8")).map((p) => p.id),
  );

  const out = {};
  const unmatched = new Map();
  const stats = {};

  for (const src of SOURCES) {
    const root = await findExtractedRoot(src);
    for (const sub of src.subPaths) {
      const dir = join(root, sub.rel);
      const label = `${src.name}/${sub.rel}`;
      console.log(`→ Ingesting ${label}…`);
      const fn = sub.kind === "world" ? ingestWorld : ingestHabitat;
      const r = await fn(dir, validIds, out, label, unmatched);
      stats[label] = r;
      console.log(`  ${r.files} files, ${r.rules} rules`);
    }
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  // ─── Summary ─────────────────────────────────────────────────────────
  const ids = Object.keys(out);
  console.log(`\n✓ ${ids.length} Pokémon with spawn data → ${OUTPUT}`);
  console.log(`  roster size:           ${validIds.size}`);
  for (const [label, r] of Object.entries(stats)) {
    console.log(`  ${label}: ${r.files} files, ${r.rules} rules`);
  }
  const totalUnmatched = [...unmatched.values()].reduce((a, b) => a + b, 0);
  console.log(`  unmatched rule count:  ${totalUnmatched}`);
  if (unmatched.size > 0) {
    console.log(`  unmatched distinct (${unmatched.size}, top 20):`);
    [...unmatched.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([name, n]) => console.log(`    ${n.toString().padStart(3)}× "${name}"`));
  }

  const rarityCount = {};
  for (const e of Object.values(out))
    for (const r of e.rarities) rarityCount[r] = (rarityCount[r] ?? 0) + 1;
  console.log(`\n  rarity distribution:`);
  Object.entries(rarityCount).sort((a, b) => b[1] - a[1])
    .forEach(([r, n]) => console.log(`    ${n.toString().padStart(4)}  ${r}`));

  const withKeyItem = ids.filter((id) => out[id].keyItems.length > 0);
  const withStructures = ids.filter((id) => out[id].structures.length > 0);
  console.log(`\n  with key items:        ${withKeyItem.length}`);
  console.log(`  with structures:       ${withStructures.length}`);

  // Sample legendary/structure entries for sanity
  console.log(`\n  sample (articuno):`);
  if (out.articuno) console.log(JSON.stringify(out.articuno, null, 2).split("\n").map((l) => "    " + l).join("\n"));
  console.log(`  sample (gastly, structure spawn):`);
  if (out.gastly) console.log(JSON.stringify(out.gastly, null, 2).split("\n").map((l) => "    " + l).join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
