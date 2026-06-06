#!/usr/bin/env node
/**
 * Fetch the Cobblemon Academy Season 2 dex + per-mon JSON files.
 *
 *   node scripts/fetch-academy-dex.mjs
 *
 * Source of truth is the public mini-dex at
 * https://cobblemon-academy-dex-2.pages.dev/ — it serves a stable set
 * of static JSON files under `/out/`:
 *   - dex.json                       (lean index of every available mon)
 *   - presets.json / biomes.json / sprites.json / drops_index.json
 *   - mons/<id>.json                 (full per-Pokémon record)
 *
 * We mirror the lot into `tmp/academy/` so the build scripts can run
 * offline. The mons fetch is parallel with a small concurrency cap so
 * we don't hammer the static host.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, "..");
const OUT_DIR  = path.join(ROOT, "tmp", "academy");
const MONS_DIR = path.join(OUT_DIR, "mons");
const BASE     = "https://cobblemon-academy-dex-2.pages.dev/out";

/** Index files that always live at /out root (the per-mon files are
 *  pulled separately, driven by the dex.json contents). */
const TOP_LEVEL = [
  "dex.json",
  "presets.json",
  "biomes.json",
  "sprites.json",
  "drops_index.json",
];

const CONCURRENCY = 16;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data));
}

/**
 * Run a list of async tasks with a concurrency cap. Resolves once
 * every task has settled. Failures are logged but don't abort the
 * batch — the dex occasionally references mons whose per-id files
 * 404 (forms, custom species); we'd rather end up with a 1290/1303
 * dataset than fall over completely.
 */
async function runPool(items, worker) {
  let i = 0;
  let done = 0;
  let failed = 0;
  const total = items.length;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        await worker(items[idx], idx);
      } catch (e) {
        failed++;
        process.stderr.write(`\n  ! ${items[idx].id ?? items[idx]}: ${e.message}\n`);
      } finally {
        done++;
        if (done % 50 === 0 || done === total) {
          process.stdout.write(`\r  ${done}/${total} (${failed} failed)   `);
        }
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write("\n");
}

async function main() {
  await fs.mkdir(MONS_DIR, { recursive: true });

  // 1. Top-level index files.
  console.log("→ Top-level files");
  for (const name of TOP_LEVEL) {
    process.stdout.write(`  ${name}… `);
    const data = await fetchJson(`${BASE}/${name}`);
    await writeJson(path.join(OUT_DIR, name), data);
    console.log("ok");
  }

  // 2. Per-mon files, driven by `dex.json`.
  const dex = JSON.parse(await fs.readFile(path.join(OUT_DIR, "dex.json"), "utf8"));
  console.log(`→ Per-mon files (${dex.length})`);
  await runPool(dex, async ({ id }) => {
    const data = await fetchJson(`${BASE}/mons/${id}.json`);
    await writeJson(path.join(MONS_DIR, `${id}.json`), data);
  });

  console.log("\nDone. Output:", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
