#!/usr/bin/env node
/**
 * Build src/data/moves-generated.json from PokeAPI — every move with
 * its French name, type, damage class, power and accuracy. Cached on
 * disk so re-runs are near-instant.
 *
 * Output shape:
 *   {
 *     "thunderbolt": {
 *       "id":          "thunderbolt",
 *       "nameFr":      "Tonnerre",
 *       "nameEn":      "Thunderbolt",
 *       "type":        "electric",
 *       "category":    "special",
 *       "power":       90,
 *       "accuracy":    100,
 *       "pp":          15,
 *       "shortEffect": "A une chance de paralyser la cible.",
 *       "description": "Une grosse décharge électrique tombe sur l'ennemi…"
 *     }
 *   }
 *
 * Keyed by the Smogon-style move id (PokeAPI name minus hyphens) so
 * the strategy UI can resolve "Sucker Punch" → "suckerpunch" → entry.
 *
 * Re-run:
 *   node scripts/build-moves-data.mjs
 */

import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/moves-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/moves-build-cache");
const CACHE_FILE = join(CACHE_DIR, "raw-moves.json");

const LIST_URL = "https://pokeapi.co/api/v2/move?limit=2000";
const CONCURRENCY = 20;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

/** Run N tasks in parallel, returning results in order. */
async function pMap(items, mapper, concurrency) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  await new Promise((resolve, reject) => {
    const launch = () => {
      while (next < items.length && done + (next - done) < items.length) {
        const i = next++;
        if (i >= items.length) break;
        mapper(items[i], i).then(
          (v) => {
            out[i] = v;
            done++;
            if (done % 50 === 0) console.log(`  …${done}/${items.length}`);
            if (done === items.length) resolve();
            else if (next < items.length) launch();
          },
          (err) => reject(err),
        );
        if (next - done >= concurrency) break;
      }
    };
    launch();
  });
  return out;
}

async function loadOrFetchRaw() {
  if (await exists(CACHE_FILE)) {
    console.log("→ Using cached raw moves");
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  }
  console.log("→ Fetching move list from PokeAPI…");
  const list = await fetchJson(LIST_URL);
  console.log(`  ${list.results.length} moves to fetch`);
  const raw = await pMap(
    list.results,
    async (m) => fetchJson(m.url),
    CONCURRENCY,
  );
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(raw));
  return raw;
}

/** PokeAPI uses kebab-case ("fire-punch"); Smogon strips separators. */
function pokeApiToSmogonId(name) {
  return String(name).replace(/-/g, "").toLowerCase();
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const raw = await loadOrFetchRaw();

  const out = {};
  let missingFr = 0;
  let missingDesc = 0;
  let unfetchable = 0;

  for (const m of raw) {
    if (!m || !m.name) { unfetchable++; continue; }
    const id = pokeApiToSmogonId(m.name);
    const fr = m.names?.find((n) => n.language?.name === "fr")?.name ?? null;
    if (!fr) missingFr++;

    // Description: the latest French flavor_text from any version-group
    // reads best ("Une grosse décharge électrique tombe sur l'ennemi.")
    // — that's the in-game move dex line the player already knows.
    // Strip the soft hyphens and form-feeds PokéAPI ships in the dump.
    const flavorFr = m.flavor_text_entries
      ?.filter((e) => e.language?.name === "fr")
      ?.at(-1)?.flavor_text?.replace(/[\f­]/g, " ")?.replace(/\s+/g, " ")?.trim() ?? null;

    // Short_effect is a mechanically precise one-liner ("A une chance
    // de paralyser la cible."). We keep it alongside the flavor as a
    // back-up when no flavor exists, and for the future "tooltip on
    // hover" UI.
    const shortEffectFr = m.effect_entries
      ?.find((e) => e.language?.name === "fr")?.short_effect
      ?.replace(/\s+/g, " ")?.trim() ?? null;

    if (!flavorFr && !shortEffectFr) missingDesc++;

    out[id] = {
      id,
      nameFr: fr ?? m.name,
      nameEn: m.names?.find((n) => n.language?.name === "en")?.name ?? m.name,
      type: m.type?.name ?? "normal",
      category: m.damage_class?.name ?? "status",
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      shortEffect: shortEffectFr,
      description: flavorFr,
    };
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  console.log(`\n✓ ${Object.keys(out).length} moves → ${OUTPUT}`);
  console.log(`  missing French names:        ${missingFr}`);
  console.log(`  missing both desc + short:   ${missingDesc}`);
  console.log(`  unfetchable:                 ${unfetchable}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
