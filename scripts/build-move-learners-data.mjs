#!/usr/bin/env node
/**
 * Build src/data/move-learners-generated.json — a reverse index of
 * the Cobblemon learnsets so each move can list every Pokémon that
 * learns it. Reads `species-extras-generated.json` (which already
 * carries the per-mon `movesByMethod` slices) and inverts it.
 *
 * Output shape (keyed by Cobblemon move id):
 *
 *   {
 *     "thunderbolt": {
 *       "level":   [{ "id": "pikachu", "level": 25 }, …],
 *       "tm":      ["raichu", "magnezone", …],
 *       "egg":     ["plusle", …],
 *       "tutor":   [],
 *       "legacy":  [],
 *       "special": []
 *     }
 *   }
 *
 * Re-run (no network, reads from existing JSON):
 *   node scripts/build-move-learners-data.mjs
 */

import { writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXTRAS = resolve(ROOT, "src/data/species-extras-generated.json");
const OUTPUT = resolve(ROOT, "src/data/move-learners-generated.json");

const METHODS = ["level", "tm", "egg", "tutor", "legacy", "special"];

async function main() {
  const extras = JSON.parse(await readFile(EXTRAS, "utf8"));

  /** @type {Record<string, { level: {id: string, level: number}[], tm: string[], egg: string[], tutor: string[], legacy: string[], special: string[] }>} */
  const out = {};

  const ensure = (moveId) => {
    if (!out[moveId]) {
      out[moveId] = { level: [], tm: [], egg: [], tutor: [], legacy: [], special: [] };
    }
    return out[moveId];
  };

  let monsProcessed = 0;
  let entriesEmitted = 0;

  for (const [pokemonId, ex] of Object.entries(extras)) {
    const mbm = ex.movesByMethod;
    if (!mbm) continue;
    monsProcessed++;

    // Level-up: entries already shaped { level, move }; invert with
    // pokemon id retained so the move page can show "appris à Niv. X".
    for (const { level, move } of mbm.level ?? []) {
      ensure(move).level.push({ id: pokemonId, level });
      entriesEmitted++;
    }

    for (const k of ["tm", "egg", "tutor", "legacy", "special"]) {
      for (const move of mbm[k] ?? []) {
        ensure(move)[k].push(pokemonId);
        entriesEmitted++;
      }
    }
  }

  // Per-move tidy: sort level learners by level then id, others
  // alphabetically. Helps the UI render deterministically.
  for (const move of Object.values(out)) {
    move.level.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
    for (const k of ["tm", "egg", "tutor", "legacy", "special"]) {
      move[k].sort();
    }
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  // ─── Summary ─────────────────────────────────────────────────────────
  const moveIds = Object.keys(out);
  const counts = METHODS.map((m) => [
    m,
    moveIds.reduce((acc, id) => acc + (out[id][m]?.length ?? 0), 0),
  ]);

  console.log(`\n✓ ${moveIds.length} moves with at least one learner → ${OUTPUT}`);
  console.log(`  Pokémon processed:  ${monsProcessed}`);
  console.log(`  total entries:      ${entriesEmitted}`);
  for (const [k, n] of counts) console.log(`    ${k.padEnd(8)} ${n}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
