#!/usr/bin/env node
/**
 * Build src/data/items-generated.json from PokeAPI — every item with
 * its French name, short_effect and flavor_text. Cached on disk so
 * re-runs are near-instant.
 *
 * Output is keyed by the slug we already use everywhere (snake_case,
 * matching `smogonItemToSlug` from `src/data/smogon.ts`):
 *
 *   {
 *     "choice_specs": {
 *       "nameFr":       "Lunettes Choix",
 *       "nameEn":       "Choice Specs",
 *       "shortEffect":  "Tenu: Augmente l'Attaque Spéciale de 50%…",
 *       "description":  "Objet à tenir. Augmente l'Attaque Spéciale…"
 *     }
 *   }
 *
 * Plus a name → slug index so callers that only know the English
 * Smogon name ("Choice Specs") can resolve without re-normalising.
 *
 * Re-run:
 *   node scripts/build-items-data.mjs
 */

import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/items-generated.json");
const CACHE_DIR = resolve(ROOT, "tmp/items-build-cache");
const CACHE_FILE = join(CACHE_DIR, "raw-items.json");

const LIST_URL = "https://pokeapi.co/api/v2/item?limit=3000";
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
            if (done % 100 === 0) console.log(`  …${done}/${items.length}`);
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
    console.log("→ Using cached raw items");
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  }
  console.log("→ Fetching item list from PokeAPI…");
  const list = await fetchJson(LIST_URL);
  console.log(`  ${list.results.length} items to fetch`);
  const raw = await pMap(
    list.results,
    async (m) => fetchJson(m.url),
    CONCURRENCY,
  );
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(raw));
  return raw;
}

/**
 * Match the `smogonItemToSlug` rule in src/data/smogon.ts. PokeAPI ids
 * use kebab-case ("choice-specs"); we keep snake_case everywhere else
 * ("choice_specs") to match the texture filenames.
 */
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

  for (const it of raw) {
    if (!it || !it.name) continue;
    const slug = pokeApiNameToSlug(it.name);

    const fr = it.names?.find((n) => n.language?.name === "fr")?.name ?? null;
    const en = it.names?.find((n) => n.language?.name === "en")?.name ?? null;
    if (!fr) missingFr++;

    const flavorFr = it.flavor_text_entries
      ?.filter((e) => e.language?.name === "fr")
      ?.at(-1)?.text;

    const shortEffectFr = it.effect_entries
      ?.find((e) => e.language?.name === "fr")?.short_effect;

    if (!flavorFr && !shortEffectFr) missingDesc++;

    out[slug] = {
      nameFr: fr ?? en ?? it.name,
      nameEn: en ?? it.name,
      shortEffect: shortEffectFr ? clean(shortEffectFr) : null,
      description: flavorFr ? clean(flavorFr) : null,
    };

    // Index by the English display name so callers with a Smogon item
    // string ("Choice Specs") can resolve straight away.
    if (en) nameIndex[en] = slug;
  }

  await writeFile(
    OUTPUT,
    JSON.stringify({ items: out, byName: nameIndex }, null, 2) + "\n",
  );

  console.log(`\n✓ ${Object.keys(out).length} items → ${OUTPUT}`);
  console.log(`  missing French names:        ${missingFr}`);
  console.log(`  missing both desc + short:   ${missingDesc}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
