#!/usr/bin/env node
/**
 * One-shot patch over `src/data/pokemon-generated.json` that backfills
 * the structured `details` block on every evolution row from the local
 * Cobblemon source cache (`tmp/cobblemon-build-cache/.../species/...`).
 *
 * Re-runnable: it overwrites `evolutions[*].method` and `details` for
 * every species the cache covers, leaving non-matching rows untouched.
 * The main build script (`build-pokemon-data.mjs`) does the same in
 * full rebuilds — this script exists so we can refresh evolution data
 * without re-pulling the whole tarball + PokéAPI when only the
 * evolution renderer changes.
 *
 * Usage:
 *   node scripts/patch-evolution-details.mjs
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describeEvolution, mapDetails } from "./lib/evolution.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/pokemon-generated.json");
const CACHE_SPECIES = resolve(
  ROOT,
  "tmp/cobblemon-build-cache/cobblemon-main-common-src-main-resources-data-cobblemon/common/src/main/resources/data/cobblemon/species",
);

/**
 * Walk the species cache, returning `speciesId → flatEvolutions[]`.
 *
 * Form-specific evolutions live in `forms[].evolutions` inside the
 * base species file (`rattata.json` carries Rattata-Alola's evolutions
 * under `forms[name="Alola"].evolutions`). We flatten *all* evolution
 * entries from the base + every form into one list and let the
 * patcher match by `result` string. This works because Cobblemon's
 * `result` is the unique form identifier ("raticate alolan",
 * "rapidash galarian", "kyogre primal") — the same string the data
 * file already uses in `evolution.to`.
 *
 * Without this flattening ~627 form Pokémon (rattata_alola,
 * vulpix_alola, geodude_alola, every galarian/hisuian/paldean…) end
 * up with no `details` and their chips render as plain text pills.
 */
async function readSpeciesIndex() {
  const index = new Map();
  const gens = await readdir(CACHE_SPECIES);
  for (const gen of gens) {
    const dir = join(CACHE_SPECIES, gen);
    let files;
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await readFile(join(dir, f), "utf8");
      try {
        const j = JSON.parse(raw);
        const id = f.replace(/\.json$/, "").toLowerCase();
        // Base + all forms, flattened. Cobblemon ships ≤4 forms per
        // species so the overhead is negligible.
        const flat = [...(j.evolutions ?? [])];
        for (const form of j.forms ?? []) {
          if (Array.isArray(form.evolutions)) {
            flat.push(...form.evolutions);
          }
        }
        index.set(id, flat);
      } catch {
        // ignore malformed
      }
    }
  }
  return index;
}

async function main() {
  console.log("[patch-evolutions] reading cache…");
  const index = await readSpeciesIndex();
  console.log(`[patch-evolutions] indexed ${index.size} species`);

  console.log("[patch-evolutions] reading data file…");
  const raw = await readFile(OUTPUT, "utf8");
  const data = JSON.parse(raw);

  let touched = 0;
  let evolutionsTouched = 0;
  for (const mon of data) {
    if (!mon || typeof mon.id !== "string") continue;
    const baseId = mon.id.split("_")[0];
    const src = index.get(mon.id.toLowerCase()) ?? index.get(baseId);
    if (!src) continue;
    if (!Array.isArray(mon.evolutions) || mon.evolutions.length === 0) continue;
    // Match upstream evolutions to existing rows by `to`. The source
    // may include extra rows (form-specific) the data file dropped;
    // we only enrich existing rows, never add new ones, so the data
    // file's roster stays stable.
    const next = mon.evolutions.map((evo) => {
      const match = src.find(
        (e) => typeof e?.result === "string" && e.result === evo.to,
      );
      if (!match) return evo;
      evolutionsTouched++;
      return {
        to: evo.to,
        method: describeEvolution(match),
        details: mapDetails(match),
      };
    });
    mon.evolutions = next;
    touched++;
  }

  console.log(
    `[patch-evolutions] patched ${evolutionsTouched} evolution row(s) across ${touched} species`,
  );

  await writeFile(OUTPUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`[patch-evolutions] wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
