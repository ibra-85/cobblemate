#!/usr/bin/env node
/**
 * Build src/data/pokemon-generated.json from two upstream sources:
 *   - cobblemon-academy-dex-site: per-mon JSON dumps that already match
 *     the Cobblemon mod (baseStats, abilities, evolutions, learnsets,
 *     types). Source of truth for everything except names.
 *   - PokéAPI:                    French names + generation number for
 *     mons whose dex id ≤ 1025 (canonical species). Forms above 1025
 *     keep their English name.
 *
 * Re-run this whenever you want to refresh data:
 *   node scripts/build-pokemon-data.mjs
 *
 * Output: src/data/pokemon-generated.json — committed to the repo so
 * builds don't depend on the network.
 */

import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describeEvolution, mapDetails } from "./lib/evolution.mjs";

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/pokemon-generated.json");

const COBBLEMON_REPO_TARBALL =
  "https://codeload.github.com/ppVon/cobblemon-academy-dex-site/tar.gz/refs/heads/master";
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

// Standard 18 types — the project's PokemonTypeId union. Anything outside
// (cobblemon-specific custom types, empty strings) is dropped.
const VALID_TYPES = new Set([
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark",
  "steel","fairy",
]);

// Manual id → PokéAPI sprite-id mapping for Cobblemon names that don't
// reduce to a standard PokéAPI form name. Add entries here as needed.
const SPRITE_ID_OVERRIDES = {
  // Cobblemon dex 1800 — equivalent to PokéAPI's `necrozma-ultra` (10157).
  ultranecrozma:    10157,
  // PokéAPI uses `mr-mime-galar` (hyphenated species name).
  mrmime_galar:     10168,
  // PokéAPI spells out `female`, cobblemon abbreviates to `_f`.
  indeedee_f:       10186,
  basculegion_f:    10248,
  oinkologne_f:     10254,
  // Oricorio Pa'u Style is `oricorio-pau` in PokéAPI (apostrophe stripped).
  oricorio_pa_u:    10080,
};

const POKEAPI_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

// ─── HTTP helpers ────────────────────────────────────────────────────────

async function fetchJson(url, { allow404 = false } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": "cobblemate-build" } });
  if (res.status === 404 && allow404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Run a list of async tasks with bounded concurrency. */
async function pMap(items, mapper, { concurrency = 16, label = "tasks" } = {}) {
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const total = items.length;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      results[i] = await mapper(items[i], i);
      done++;
      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r  ${label}: ${done}/${total}`);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
  process.stdout.write("\n");
  return results;
}

// ─── Mapping ─────────────────────────────────────────────────────────────

function mapTypes(mon) {
  const types = [mon.primaryType, mon.secondaryType]
    .filter(Boolean)
    .filter((t) => VALID_TYPES.has(t));
  // Dedupe — Cobblemon data occasionally has primary === secondary
  // (e.g. Galarian Slowpoke listed as psychic/psychic).
  return [...new Set(types)];
}

function mapBaseStats(bs) {
  return {
    hp:      bs.hp ?? 0,
    attack:  bs.attack ?? 0,
    defense: bs.defence ?? bs.defense ?? 0,
    spAtk:   bs.special_attack ?? 0,
    spDef:   bs.special_defence ?? bs.special_defense ?? 0,
    speed:   bs.speed ?? 0,
  };
}

/** Cobblemon abilities are like ["overgrow", "h:chlorophyll"] — the
 *  `h:` prefix marks the hidden ability. */
function splitAbilities(raw) {
  const regular = [];
  let hidden;
  for (const a of raw ?? []) {
    if (typeof a !== "string") continue;
    if (a.startsWith("h:")) hidden = humanize(a.slice(2));
    else regular.push(humanize(a));
  }
  return { abilities: regular, hiddenAbility: hidden };
}

function humanize(slug) {
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function deriveGeneration(mon) {
  // Labels like "gen1", "gen9". Fall back to a dexnum-based heuristic
  // for the few mons missing labels.
  const fromLabel = (mon.labels ?? [])
    .map((l) => /^gen(\d+)$/.exec(l)?.[1])
    .find(Boolean);
  if (fromLabel) return Number(fromLabel);
  const d = mon.dexnum;
  if (d <= 151) return 1;
  if (d <= 251) return 2;
  if (d <= 386) return 3;
  if (d <= 493) return 4;
  if (d <= 649) return 5;
  if (d <= 721) return 6;
  if (d <= 809) return 7;
  if (d <= 905) return 8;
  return 9;
}

function mapEvolutions(mon) {
  const evos = mon.evolutions ?? [];
  return evos
    .filter((e) => e && typeof e.result === "string")
    .map((e) => ({
      to: e.result,
      method: describeEvolution(e),
      details: mapDetails(e),
    }));
}

/**
 * Pull PokéAPI's full pokemon list (1350-ish: 1025 base species + ~325
 * forms) in a single request, return a `name → numeric-id` map. The
 * sprite URL for any entry then deterministically lives at
 * `sprites/pokemon/<id>.png` — no further API calls needed.
 */
async function buildPokeapiFormMap() {
  const data = await fetchJson(`${POKEAPI_BASE}/pokemon/?limit=20000`);
  const map = new Map();
  for (const r of data.results) {
    const m = /\/pokemon\/(\d+)\/?$/.exec(r.url);
    if (m) map.set(r.name, Number(m[1]));
  }
  return map;
}

/**
 * Decide which sprite URL (if any) to bake into a mon entry.
 *
 * Resolution order:
 *  1. Manual override in `SPRITE_ID_OVERRIDES`.
 *  2. Canonical species (no `_` in id): null — PokemonSprite already
 *     falls back to `sprites/pokemon/<dex>.png`.
 *  3. Form exact match in PokéAPI `/pokemon/` bulk list.
 *  4. Form prefix match — `tauros_paldea` → `tauros-paldea-combat-breed`.
 *  5. Progressive suffix trim — `necrozma_dusk_mane` → `necrozma-dusk`.
 *  6. Dex-suffix URL probe — `arceus_fighting` → `493-fighting.png`.
 *
 * If nothing resolves, return null so the base-species sprite shows
 * (better than a broken image).
 */
async function resolveSpriteUrl(mon, formMap) {
  const override = SPRITE_ID_OVERRIDES[mon.id];
  if (override) return `${POKEAPI_SPRITE_BASE}/${override}.png`;

  if (!mon.id.includes("_")) return null;

  const pokeapiName = mon.id.replace(/_/g, "-");

  // 3. Exact match.
  let id = formMap.get(pokeapiName);
  if (id) return `${POKEAPI_SPRITE_BASE}/${id}.png`;

  // 4. Prefix match — pokeAPI's name extends ours.
  for (const [name, fid] of formMap) {
    if (name.startsWith(pokeapiName + "-")) {
      return `${POKEAPI_SPRITE_BASE}/${fid}.png`;
    }
  }

  // 5. Progressively trim trailing underscore segments — pokeAPI's name
  //    is a prefix of ours (e.g. `necrozma_dusk_mane` → `necrozma-dusk`).
  //    Require at least 2 segments remaining: trimming all the way down
  //    to the base species (`arceus_fighting` → `arceus`) would silently
  //    return the wrong sprite. Those go through step 6 instead.
  const parts = mon.id.split("_");
  while (parts.length > 2) {
    parts.pop();
    const trimmed = parts.join("-");
    id = formMap.get(trimmed);
    if (id) return `${POKEAPI_SPRITE_BASE}/${id}.png`;
  }

  // 6. Some forms (Arceus types, Silvally memories) live at
  //    `<dex>-<suffix>.png` instead of having their own pokemon id.
  const suffix = mon.id.split("_").slice(1).join("-");
  const probeUrl = `${POKEAPI_SPRITE_BASE}/${mon.dexnum}-${suffix}.png`;
  if (await urlExists(probeUrl)) return probeUrl;

  return null;
}

const urlExistsCache = new Map();
async function urlExists(url) {
  if (urlExistsCache.has(url)) return urlExistsCache.get(url);
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ok = res.ok;
    urlExistsCache.set(url, ok);
    return ok;
  } catch {
    urlExistsCache.set(url, false);
    return false;
  }
}

function dedupeCosmeticForms(list) {
  const groups = new Map();
  for (const p of list) {
    const sig = [
      p.dexNumber,
      p.types.join("/"),
      Object.values(p.baseStats).join(","),
    ].join("|");
    const arr = groups.get(sig);
    if (arr) arr.push(p);
    else groups.set(sig, [p]);
  }
  const kept = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }
    // Keep the entry with the shortest id (canonical form), tie-break
    // alphabetically. `furfrou` beats `blue_furfrou`.
    group.sort(
      (a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id),
    );
    kept.push(group[0]);
  }
  return kept;
}

/** Pick a handful of "notable" moves: signature TMs + late-game level-ups.
 *  Cobblemon move strings look like "30:worryseed", "tm:solarbeam". */
function pickNotableMoves(mon, limit = 6) {
  const result = new Set();
  const moves = mon.moves ?? [];

  // High-level learnset moves first (level ≥ 30).
  for (const m of moves) {
    const lvl = /^(\d+):(.+)$/.exec(m);
    if (lvl && Number(lvl[1]) >= 30) result.add(lvl[2]);
    if (result.size >= limit) break;
  }
  // Fill from TMs if needed.
  if (result.size < limit) {
    for (const m of moves) {
      if (m.startsWith("tm:")) result.add(m.slice(3));
      if (result.size >= limit) break;
    }
  }
  return [...result];
}

// ─── Main ────────────────────────────────────────────────────────────────

async function fetchCobblemonRepo() {
  // Download the tarball once (~50 MB) and extract just the mons/ folder.
  // Avoids 1399 individual rate-limited requests against raw.githubusercontent.
  // Using curl as subprocess — undici's fetch hits ConnectTimeout against
  // codeload.github.com on this network, curl handles it without issue.
  const workDir = await mkdtempInOsTmp("cobblemon-dex-");
  const tarball = join(workDir, "repo.tar.gz");
  console.log(`  Downloading tarball → ${tarball}`);
  await execFileP("curl", ["-sSL", "-o", tarball, COBBLEMON_REPO_TARBALL], {
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 200,
  });
  const { size } = await import("node:fs/promises").then((m) =>
    m.stat(tarball),
  );
  console.log(`  Downloaded ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log("  Extracting…");
  // Use Windows-native bsdtar by absolute path. MSYS / Git Bash ship a
  // GNU tar that mis-handles `C:\` paths even with --force-local.
  const tarBin =
    process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  await execFileP(tarBin, ["-xzf", tarball, "-C", workDir], {
    windowsHide: true,
  });
  const extracted = (await readdir(workDir)).find((d) =>
    d.startsWith("cobblemon-academy-dex-site"),
  );
  if (!extracted) throw new Error("extracted folder not found");
  return join(workDir, extracted, "site", "out");
}

async function mkdtempInOsTmp(prefix) {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(join(tmpdir(), prefix));
}

async function readMonsFromDisk(outDir) {
  const dex = JSON.parse(await readFile(join(outDir, "dex.json"), "utf8"));
  const monsDir = join(outDir, "mons");
  const mons = [];
  for (const entry of dex) {
    const file = join(monsDir, `${entry.id}.json`);
    try {
      const json = JSON.parse(await readFile(file, "utf8"));
      mons.push(json);
    } catch {
      // Skip missing per-mon files (rare — usually unimplemented mons).
    }
  }
  return { dex, mons };
}

async function main() {
  console.log("→ Downloading cobblemon-academy repo tarball…");
  const outDir = await fetchCobblemonRepo();

  console.log("→ Reading mon JSONs from disk…");
  const { dex, mons } = await readMonsFromDisk(outDir);
  console.log(`  Dex manifest: ${dex.length} entries.`);
  const validMons = mons.filter(Boolean);
  console.log(`  Got ${validMons.length} mon files.`);

  console.log("→ Fetching French names from PokéAPI (canonical 1025 only)…");
  // Deduplicate by dexnum — many entries share dexnum (forms). One species
  // call per dexnum.
  const dexNums = [
    ...new Set(
      validMons.filter((m) => m.dexnum > 0 && m.dexnum <= 1025).map((m) => m.dexnum),
    ),
  ].sort((a, b) => a - b);

  const speciesData = await pMap(
    dexNums,
    async (num) => {
      const s = await fetchJson(`${POKEAPI_BASE}/pokemon-species/${num}/`, {
        allow404: true,
      });
      if (!s) return null;
      const fr = s.names.find((n) => n.language.name === "fr");
      return {
        dexnum: num,
        frName: fr?.name,
        legendary: s.is_legendary,
        mythical: s.is_mythical,
      };
    },
    { concurrency: 16, label: "species" },
  );
  const speciesByDex = new Map(
    speciesData.filter(Boolean).map((s) => [s.dexnum, s]),
  );

  console.log("→ Fetching PokéAPI form list (sprite mapping)…");
  const formMap = await buildPokeapiFormMap();
  console.log(`  ${formMap.size} forms indexed.`);

  console.log("→ Building Pokemon[] payload…");
  // Only the ~50 mons that fall all the way to step 6 of resolveSpriteUrl
  // actually hit the network (HEAD probe on <dex>-<suffix>.png). The rest
  // resolve synchronously, so this stays fast.
  const rawPokemon = (
    await pMap(
      validMons,
      async (mon) => {
        const species = speciesByDex.get(mon.dexnum);
        const { abilities, hiddenAbility } = splitAbilities(mon.abilities);
        const types = mapTypes(mon);
        if (types.length === 0) return null;
        const imageUrl = await resolveSpriteUrl(mon, formMap);
        return {
          id: mon.id,
          dexNumber: mon.dexnum,
          name: species?.frName ?? mon.name,
          generation: deriveGeneration(mon),
          types,
          abilities,
          ...(hiddenAbility && { hiddenAbility }),
          baseStats: mapBaseStats(mon.baseStats ?? {}),
          evolutions: mapEvolutions(mon),
          notableMoves: pickNotableMoves(mon),
          roles: [],
          ...(imageUrl && { imageUrl }),
          ...(species?.legendary || species?.mythical
            ? { isLegendary: true }
            : {}),
        };
      },
      { concurrency: 32, label: "sprites" },
    )
  ).filter(Boolean);

  // Dedupe cosmetic forms — Furfrou alone has 100 colour trims with
  // identical stats/types/abilities. Group by (dex, types, baseStats) and
  // keep the entry with the simplest id (shortest, alphabetically first).
  const pokemon = dedupeCosmeticForms(rawPokemon).sort(
    (a, b) => a.dexNumber - b.dexNumber,
  );

  console.log(
    `  Generated ${pokemon.length} entries (dropped ${rawPokemon.length - pokemon.length} cosmetic dupes).`,
  );

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(pokemon, null, 0) + "\n");
  console.log(`✓ Wrote ${OUTPUT}`);
  console.log(`  File size: ${(JSON.stringify(pokemon).length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("✗ Build failed:", err);
  process.exit(1);
});
