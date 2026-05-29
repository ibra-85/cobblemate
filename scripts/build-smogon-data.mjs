#!/usr/bin/env node
/**
 * Build src/data/smogon-generated.json by harvesting the
 * Smogon/Showdown usage statistics + curated sets, then copy
 * the Cobblemon item textures that match referenced items into
 * public/images/items/.
 *
 * Output shape (keyed by app id):
 *   {
 *     "charizard": {
 *       "tier": "OU",
 *       "usage": 0.0012,
 *       "abilities": [{ "name": "Solar Power", "share": 0.92 }, …],
 *       "items":     [{ "name": "Choice Specs", "share": 0.73 }, …],
 *       "moves":     [{ "name": "Overheat",     "share": 0.71 }, …],
 *       "teraTypes": [{ "name": "Fire",          "share": 0.88 }, …],
 *       "teammates": [{ "id": "greattusk",   "name": "Great Tusk", "share": 0.75 }, …],
 *       "spread":    { "nature": "Timid", "evs": {…}, "share": 0.75 },
 *       "set":       {
 *         "name": "Sun Sweeper",
 *         "ability": "Solar Power",
 *         "item":    "Choice Specs",
 *         "nature":  "Timid",
 *         "evs":     { spa: 252, spd: 4, spe: 252 },
 *         "moves":   ["Overheat", "Solar Beam", "Air Slash", "Focus Blast"],
 *         "teraType": "Fire"
 *       }
 *     }
 *   }
 *
 * Re-run:
 *   node scripts/build-smogon-data.mjs
 */

import { writeFile, readFile, mkdir, readdir, copyFile, access } from "node:fs/promises";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawnProc } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const POKEMON_JSON = resolve(ROOT, "src/data/pokemon-generated.json");
const OUTPUT = resolve(ROOT, "src/data/smogon-generated.json");

const CACHE_DIR = resolve(ROOT, "tmp/smogon-build-cache");
const ITEMS_OUT = resolve(ROOT, "public/images/items/cobblemon");
const ITEMS_FALLBACK_OUT = resolve(ROOT, "public/images/items/bulbapedia");

// MediaWiki redirect — resolves to the actual hashed image path
// without needing to know the storage hierarchy.
const BULBAPEDIA_FILEPATH =
  "https://archives.bulbagarden.net/wiki/Special:FilePath";

const ITEM_TARBALL_URL =
  "https://gitlab.com/cable-mc/cobblemon/-/archive/main/cobblemon-main.tar.gz?path=common/src/main/resources/assets/cobblemon/textures/item";
const ITEM_EXTRACT_HINT =
  "cobblemon-main-common-src-main-resources-assets-cobblemon-textures-item";

// Singles tiers ordered by descending population. We pick the tier
// where each mon has the highest weighted usage, so a mon banned to a
// lower tier still surfaces with meaningful data.
const TIERS = ["ou", "ubers", "uu", "ru", "nu", "pu", "lc"];
const STATS_URL = (tier) =>
  `https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`;
const SETS_URL = (tier) =>
  `https://pkmn.github.io/smogon/data/sets/gen9${tier}.json`;

const slash = (p) => p.replace(/\\/g, "/");

function shell(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawnProc(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${c}`))));
  });
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

// ─── Name normalisation ────────────────────────────────────────────────

/**
 * Map a Smogon Pokémon name (English, hyphen-separated forms) to
 * the app id. Forms keep their underscore separator; everything
 * else is stripped:
 *   "Charizard"            → "charizard"
 *   "Great Tusk"           → "greattusk"
 *   "Mr. Mime"             → "mrmime"
 *   "Ninetales-Alola"      → "ninetales_alola"
 *   "Urshifu-Rapid-Strike" → "urshifu_rapid_strike"
 */
function smogonNameToAppId(name, validIds) {
  const strip = (s) =>
    s
      .toLowerCase()
      .replace(/♀/g, "f")
      .replace(/♂/g, "m")
      .replace(/é/g, "e")
      .replace(/[^a-z0-9]/g, "");

  const parts = String(name).split("-");
  if (parts.length === 1) return strip(parts[0]);

  const base = strip(parts[0]);
  const formParts = parts.slice(1).map(strip).filter(Boolean);

  // Try most-specific to least-specific to handle forms like
  // "Tauros-Paldea-Combat" (app only has "tauros_paldea").
  for (let n = formParts.length; n >= 1; n--) {
    const id = `${base}_${formParts.slice(0, n).join("_")}`;
    if (validIds.has(id)) return id;
  }
  // No form match: the hyphen wasn't a form separator but part of
  // the name itself ("Ting-Lu", "Ho-Oh", "Kommo-o"). Strip it all.
  const stripped = strip(parts.join(""));
  if (validIds.has(stripped)) return stripped;
  return base;
}

// ─── Smogon fetches with on-disk cache ────────────────────────────────

async function fetchJsonCached(url, cachePath) {
  if (await exists(cachePath)) {
    return JSON.parse(await readFile(cachePath, "utf8"));
  }
  console.log("→ Fetching", url);
  await shell("curl", ["-fsSL", "--retry", "3", url, "-o", cachePath]);
  return JSON.parse(await readFile(cachePath, "utf8"));
}

// ─── Set normalisation ────────────────────────────────────────────────

/** Pick the first element when a set field is an array of choices. */
function pickFirst(v) {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Flatten a Smogon set into a stable shape. The Smogon JSON encodes
 * "any of these is fine" choices as arrays; we keep the first as the
 * canonical pick and surface the alternatives separately.
 */
function normaliseSet(rawName, raw) {
  if (!raw) return null;
  const moves = (raw.moves ?? []).map(pickFirst).filter(Boolean).slice(0, 4);
  if (moves.length === 0) return null;
  return {
    name: rawName,
    ability: pickFirst(raw.ability) ?? null,
    item: pickFirst(raw.item) ?? null,
    nature: pickFirst(raw.nature) ?? null,
    evs: pickFirst(raw.evs) ?? {},
    ivs: pickFirst(raw.ivs) ?? undefined,
    moves,
    teraType: pickFirst(raw.teratypes) ?? null,
  };
}

// ─── Spread parsing ───────────────────────────────────────────────────

/**
 * Smogon spreads look like "Timid:0/0/0/252/4/252" — nature then
 * HP/Atk/Def/SpA/SpD/Spe EVs slash-separated.
 */
function parseSpread(key) {
  const [nature, rest] = key.split(":");
  if (!rest) return null;
  const [hp, atk, def, spa, spd, spe] = rest.split("/").map(Number);
  return { nature, evs: { hp, atk, def, spa, spd, spe } };
}

// ─── Aggregation ──────────────────────────────────────────────────────

function topN(obj, n) {
  return Object.entries(obj ?? {})
    .filter(([k]) => k !== "Nothing")
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, share]) => ({ name, share: Number(share.toFixed(4)) }));
}

function aggregateForMon(stats, tier) {
  if (!stats) return null;
  const usage = stats.usage?.weighted ?? 0;
  const topSpreadKey = Object.entries(stats.spreads ?? {})
    .sort((a, b) => b[1] - a[1])[0];
  const spread = topSpreadKey
    ? { ...parseSpread(topSpreadKey[0]), share: Number(topSpreadKey[1].toFixed(4)) }
    : null;
  return {
    tier: tier.toUpperCase(),
    usage: Number(usage.toFixed(4)),
    abilities: topN(stats.abilities, 3),
    items: topN(stats.items, 6),
    moves: topN(stats.moves, 8),
    teraTypes: topN(stats.teraTypes, 4),
    teammates: topN(stats.teammates, 8),
    spread,
  };
}

// ─── Item texture copy ───────────────────────────────────────────────

async function ensureItemTarball() {
  await mkdir(CACHE_DIR, { recursive: true });
  const have = (await readdir(CACHE_DIR, { withFileTypes: true })).some(
    (e) => e.isDirectory() && e.name === ITEM_EXTRACT_HINT,
  );
  if (have) return;
  const tarball = join(CACHE_DIR, "cobblemon-items.tar.gz");
  console.log("→ Downloading Cobblemon item textures…");
  await shell("curl", ["-fsSL", "--retry", "3", ITEM_TARBALL_URL, "-o", tarball]);
  await shell("tar", ["--force-local", "-xzf", slash(tarball), "-C", slash(CACHE_DIR)]);
}

/**
 * Smogon items are English Title Case ("Choice Specs"); Cobblemon
 * textures are snake_case ("choice_specs.png"). Two odd cases:
 *   - apostrophes ("King's Rock"      → "kings_rock")
 *   - hyphens     ("Heavy-Duty Boots" → "heavy_duty_boots")
 */
function itemNameToSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

async function indexItemTextures() {
  const root = join(
    CACHE_DIR, ITEM_EXTRACT_HINT,
    "common/src/main/resources/assets/cobblemon/textures/item",
  );
  const index = new Map(); // slug → absolute source path

  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith(".png")) {
        const slug = basename(e.name, ".png");
        // Prefer held_items/ over wearable/ when both exist — the
        // held-item texture is what battles use, the wearable one
        // is just cosmetic.
        const isHeld = full.includes("/held_items/") || full.includes("\\held_items\\");
        if (!index.has(slug) || isHeld) index.set(slug, full);
      }
    }
  }

  await walk(root);
  return index;
}

async function copyItemTextures(itemNames, textureIndex) {
  await mkdir(ITEMS_OUT, { recursive: true });
  const matched = new Set();
  const missing = new Set();
  for (const name of itemNames) {
    const slug = itemNameToSlug(name);
    const src = textureIndex.get(slug);
    if (src) {
      await copyFile(src, join(ITEMS_OUT, `${slug}.png`));
      matched.add(name);
    } else {
      missing.add(name);
    }
  }
  return { matched, missing };
}

/**
 * Bulbapedia stores bag sprites at `File:Bag_<Item_Name>_SV_Sprite.png`.
 * Spaces become underscores; hyphens, apostrophes and accented letters
 * stay put. We hit `Special:FilePath` so MediaWiki resolves the actual
 * hashed storage path for us.
 */
function bulbapediaUrl(name) {
  const slug = String(name).replace(/\s+/g, "_");
  const file = `Bag_${slug}_SV_Sprite.png`;
  return `${BULBAPEDIA_FILEPATH}/${encodeURIComponent(file)}`;
}

async function fetchMissingFromBulbapedia(missing) {
  await mkdir(ITEMS_FALLBACK_OUT, { recursive: true });
  const fetched = new Set();
  const stillMissing = new Set();
  for (const name of missing) {
    const slug = itemNameToSlug(name);
    const out = join(ITEMS_FALLBACK_OUT, `${slug}.png`);
    if (await exists(out)) { fetched.add(name); continue; }
    try {
      await shell("curl", ["-fsSL", "--retry", "2", bulbapediaUrl(name), "-o", out]);
      fetched.add(name);
    } catch {
      stillMissing.add(name);
    }
  }
  return { fetched, stillMissing };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });

  const validIds = new Set(
    JSON.parse(await readFile(POKEMON_JSON, "utf8")).map((p) => p.id),
  );

  // 1. Fetch every tier's stats + sets, mirror to cache.
  const statsByTier = {};
  const setsByTier = {};
  for (const tier of TIERS) {
    statsByTier[tier] = await fetchJsonCached(
      STATS_URL(tier), join(CACHE_DIR, `stats-gen9${tier}.json`),
    );
    setsByTier[tier] = await fetchJsonCached(
      SETS_URL(tier),  join(CACHE_DIR, `sets-gen9${tier}.json`),
    );
  }

  // 2. For each mon seen anywhere, keep the tier with highest usage.
  const bestByMon = new Map(); // smogonName → { tier, stats }
  for (const tier of TIERS) {
    for (const [smogonName, stats] of Object.entries(statsByTier[tier].pokemon)) {
      const usage = stats.usage?.weighted ?? 0;
      const prev = bestByMon.get(smogonName);
      if (!prev || usage > (prev.stats.usage?.weighted ?? 0)) {
        bestByMon.set(smogonName, { tier, stats });
      }
    }
  }

  // 3. Aggregate + emit per app id.
  const out = {};
  const unmatched = [];
  const itemNamesSeen = new Set();

  for (const [smogonName, { tier, stats }] of bestByMon) {
    const appId = smogonNameToAppId(smogonName, validIds);
    if (!validIds.has(appId)) {
      unmatched.push({ smogonName, appId });
      continue;
    }
    // If two Smogon forms collapse onto the same app id (e.g.
    // "Tauros-Paldea-Combat" + "-Blaze" + "-Aqua" → "tauros_paldea"),
    // keep the one with the highest usage.
    const candidate = aggregateForMon(stats, tier);
    if (
      !out[appId] ||
      (candidate?.usage ?? 0) > (out[appId].usage ?? 0)
    ) {
      out[appId] = candidate;
    }
    for (const it of candidate?.items ?? []) itemNamesSeen.add(it.name);
  }

  // 4. Attach teammate app ids + every curated set from the same
  // tier. Smogon often ships 2-4 sets per mon — each one targets a
  // different role (Choice Band sweeper, Calm Mind setup, Bulky Phazer,
  // …). We surface all of them so the UI can offer a tab per build.
  for (const appId of Object.keys(out)) {
    const tier = out[appId].tier.toLowerCase();
    const setsForTier = setsByTier[tier];
    let monSets = null;
    for (const [smogonName, sets] of Object.entries(setsForTier)) {
      if (smogonNameToAppId(smogonName, validIds) === appId) {
        monSets = sets;
        break;
      }
    }
    out[appId].sets = monSets
      ? Object.entries(monSets)
          .map(([name, data]) => normaliseSet(name, data))
          .filter(Boolean)
      : [];

    // Map teammate names to app ids so the UI can render sprites.
    out[appId].teammates = out[appId].teammates
      .map((t) => {
        const id = smogonNameToAppId(t.name, validIds);
        return { id: validIds.has(id) ? id : null, name: t.name, share: t.share };
      })
      .filter((t) => t.id);
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");

  // 5. Pull the item textures for everything we reference. First pass
  // from the Cobblemon mod tarball; anything missing (gen 9 form
  // items, plates, paradox energy, …) gets a Bulbapedia fallback.
  await ensureItemTarball();
  const textureIndex = await indexItemTextures();
  const { matched, missing } = await copyItemTextures(itemNamesSeen, textureIndex);
  console.log(`\n→ Fetching ${missing.size} missing items from Bulbapedia…`);
  const { fetched, stillMissing } = await fetchMissingFromBulbapedia(missing);

  // ─── Summary ─────────────────────────────────────────────────────────
  const ids = Object.keys(out);
  console.log(`\n✓ ${ids.length} mons → ${OUTPUT}`);
  console.log(`  tiers fetched:     ${TIERS.join(", ")}`);
  console.log(`  smogon mons:       ${bestByMon.size}`);
  console.log(`  app-matched:       ${ids.length}`);
  console.log(`  unmatched:         ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`  unmatched sample:`);
    unmatched.slice(0, 10).forEach((u) =>
      console.log(`    ${u.smogonName.padEnd(30)} → ${u.appId}`),
    );
  }
  console.log(`\n✓ items textures`);
  console.log(`  referenced:        ${itemNamesSeen.size}`);
  console.log(`  Cobblemon mod:     ${matched.size}  → ${ITEMS_OUT}`);
  console.log(`  Bulbapedia:        ${fetched.size}  → ${ITEMS_FALLBACK_OUT}`);
  console.log(`  still missing:     ${stillMissing.size}`);
  if (stillMissing.size > 0) {
    console.log(`  still missing:     ${[...stillMissing].join(", ")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
