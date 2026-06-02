#!/usr/bin/env node
/**
 * Build src/data/abilities-generated.json from PokeAPI — every
 * ability with its French name, short_effect, full effect, and
 * flavor text. Cached on disk so re-runs are near-instant.
 *
 * Output is keyed by the slug we use everywhere (snake_case from the
 * PokeAPI English id):
 *
 *   {
 *     "blaze": {
 *       "nameFr":      "Brasier",
 *       "nameEn":      "Blaze",
 *       "shortEffect": "Renforce les capacités Feu pour infliger 1.5×…",
 *       "description": "Augmente la puissance des capacités Feu…"
 *     }
 *   }
 *
 * Plus a name → slug index so callers that only know the English
 * Smogon name ("Solar Power") can resolve in one lookup.
 *
 * Re-run:
 *   node scripts/build-abilities-data.mjs
 */

import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/abilities-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/abilities-build-cache");
const CACHE_FILE = join(CACHE_DIR, "raw-abilities.json");

const LIST_URL = "https://pokeapi.co/api/v2/ability?limit=2000";
const CONCURRENCY = 20;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

/** Run N tasks with bounded concurrency, preserving input order. */
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
    console.log("→ Using cached raw abilities");
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  }
  console.log("→ Fetching ability list from PokeAPI…");
  const list = await fetchJson(LIST_URL);
  console.log(`  ${list.results.length} abilities to fetch`);
  const raw = await pMap(
    list.results,
    async (m) => fetchJson(m.url),
    CONCURRENCY,
  );
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(raw));
  return raw;
}

/** "solar-power" → "solar_power" so it matches the smogon-side slug rule. */
function pokeApiNameToSlug(name) {
  return String(name).toLowerCase().replace(/-/g, "_");
}

function clean(s) {
  return String(s).replace(/[\f­]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const raw = await loadOrFetchRaw();

  const out = {};
  const nameIndex = {};
  let missingFr = 0;
  let missingDesc = 0;

  for (const ab of raw) {
    if (!ab || !ab.name) continue;
    const slug = pokeApiNameToSlug(ab.name);

    const fr = ab.names?.find((n) => n.language?.name === "fr")?.name ?? null;
    const en = ab.names?.find((n) => n.language?.name === "en")?.name ?? null;
    if (!fr) missingFr++;

    const effFr = ab.effect_entries?.find((e) => e.language?.name === "fr");
    const flavorFr = ab.flavor_text_entries
      ?.filter((e) => e.language?.name === "fr")
      ?.at(-1)?.flavor_text;

    if (!effFr?.short_effect && !effFr?.effect && !flavorFr) missingDesc++;

    out[slug] = {
      nameFr: fr ?? en ?? ab.name,
      nameEn: en ?? ab.name,
      shortEffect: effFr?.short_effect ? clean(effFr.short_effect) : null,
      description: flavorFr ? clean(flavorFr) : (effFr?.effect ? clean(effFr.effect) : null),
    };
    if (en) nameIndex[en] = slug;
  }

  await writeFile(
    OUTPUT,
    JSON.stringify({ abilities: out, byName: nameIndex }, null, 2) + "\n",
  );

  console.log(`\n✓ ${Object.keys(out).length} abilities → ${OUTPUT}`);
  console.log(`  missing French names:        ${missingFr}`);
  console.log(`  missing every description:   ${missingDesc}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
