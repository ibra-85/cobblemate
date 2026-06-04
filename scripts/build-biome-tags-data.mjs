#!/usr/bin/env node
/**
 * Build `src/data/biome-tags-generated.json` — a flat dictionary
 * mapping Cobblemon evolution biome tag ids to the list of aggregate
 * climate/terrain tags they resolve to.
 *
 * Why this exists: when a Pokémon evolves under a biome requirement,
 * the Cobblemon source files reference *tags* rather than specific
 * biomes. For example `pikachu_alolabiome` is a tag whose members are
 * `#cobblemon:is_beach` and `#cobblemon:is_tropical_island` — i.e.
 * "any beach or tropical island". The chips in the Pokédex evolution
 * panel used to display the raw tag id ("Pikachu Alolabiome") which
 * doesn't tell the player *which* biomes count. With this index the
 * renderer can show the player-friendly leaf list ("Plage, Île
 * tropicale") instead.
 *
 * Output shape (single JSON object, ~200 keys):
 *   {
 *     "cobblemon:evolution/regional/pikachu_alolabiome": ["is_beach", "is_tropical_island"],
 *     ...
 *   }
 *
 * Only the *Cobblemon* aggregate tags (`is_*`) are kept as leaves —
 * specific Minecraft biome ids (`biomesoplenty:dune_beach`) are
 * dropped since they're not the level of detail the UI cares about.
 *
 * Re-runnable from the cobblemon source cache; no network required.
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "src/data/biome-tags-generated.json");
const CACHE_BIOME_TAGS = resolve(
  ROOT,
  "tmp/cobblemon-build-cache/cobblemon-main-common-src-main-resources-data-cobblemon/common/src/main/resources/data/cobblemon/tags/worldgen/biome",
);

/**
 * Walk a directory recursively, yielding every `.json` file path. Used
 * to discover both top-level `is_*` aggregates and nested `evolution/
 * regional/*biome.json` entries in one pass.
 */
async function walk(dir) {
  const out = [];
  const entries = await readdir(dir);
  for (const name of entries) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      const nested = await walk(full);
      out.push(...nested);
    } else if (name.endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

/** Strip `#cobblemon:` / `#minecraft:` / `cobblemon:` etc. — returns
 *  the bare id used as the dictionary key. */
function stripPrefix(id) {
  return id.replace(/^#?[a-z_]+:/, "");
}

/** True for tags Cobblemon ships under `tags/worldgen/biome` whose id
 *  starts with `is_`. These are the "leaf" labels the renderer
 *  translates to French. */
function isAggregateTag(rawId) {
  return /^#?cobblemon:is_[a-z_]+$/.test(rawId);
}

/**
 * Resolve a tag id to its flat list of aggregate `is_*` children.
 *
 * The Cobblemon `values[]` entries can be either:
 *   - a string with a `#` prefix (a nested tag reference),
 *   - a plain string id (a specific Minecraft biome),
 *   - an object `{ id, required? }` for soft references.
 *
 * We follow nested `#cobblemon:*` references depth-first while
 * tracking `visited` to defend against cycles. Specific biome ids
 * and `#minecraft:*` tags are dropped — the UI only surfaces the
 * Cobblemon aggregate level.
 */
function resolveLeaves(tagId, raw, byTag, visited = new Set()) {
  if (visited.has(tagId)) return [];
  visited.add(tagId);

  // The tag we're walking is itself an aggregate — return its bare id
  // as the leaf without descending further. This makes the index
  // round-trippable: a chip can pass `is_beach` straight through.
  if (isAggregateTag("cobblemon:" + tagId.split("/").pop())) {
    return [tagId.split("/").pop()];
  }

  const out = [];
  const def = byTag.get(tagId);
  if (!def || !Array.isArray(def.values)) return out;

  for (const v of def.values) {
    const ref = typeof v === "string" ? v : v?.id;
    if (typeof ref !== "string") continue;

    // Nested tag reference — recurse.
    if (ref.startsWith("#")) {
      const childKey = stripPrefix(ref);
      if (isAggregateTag(ref)) {
        out.push(stripPrefix(ref));
      } else {
        // Non-aggregate nested tag — descend further to flatten.
        out.push(...resolveLeaves(childKey, ref, byTag, visited));
      }
    }
    // Plain biome ids (`biomesoplenty:dune_beach`, `minecraft:beach`)
    // are skipped — the UI doesn't surface per-biome chips.
  }
  // Dedupe while preserving first-seen order.
  return [...new Set(out)];
}

async function main() {
  console.log("[biome-tags] reading cache…");
  const files = await walk(CACHE_BIOME_TAGS);
  const byTag = new Map();
  for (const f of files) {
    const rel = relative(CACHE_BIOME_TAGS, f).replace(/\\/g, "/");
    const id = rel.replace(/\.json$/, ""); // e.g. "evolution/regional/pikachu_alolabiome" or "is_beach"
    const raw = await readFile(f, "utf8");
    try {
      byTag.set(id, JSON.parse(raw));
    } catch {
      console.warn("[biome-tags] failed to parse", id);
    }
  }
  console.log(`[biome-tags] indexed ${byTag.size} tag files`);

  // Resolve only `evolution/regional/*` entries — those are the ones
  // referenced by Pokémon evolution requirements. Aggregates (`is_*`)
  // are looked up directly at runtime via the FR dictionary; no need
  // to bake them into the output.
  const out = {};
  for (const [id, def] of byTag.entries()) {
    if (!id.startsWith("evolution/")) continue;
    // We keep the full Cobblemon-prefixed key so the renderer can
    // match against `biomeCondition` / `biomeAnticondition` values as
    // they appear in the data file ("#cobblemon:evolution/regional/...").
    const leaves = [];
    for (const v of def.values ?? []) {
      const ref = typeof v === "string" ? v : v?.id;
      if (typeof ref !== "string") continue;
      if (ref.startsWith("#")) {
        if (isAggregateTag(ref)) {
          leaves.push(stripPrefix(ref));
        } else {
          // Nested non-aggregate tag — recurse.
          leaves.push(...resolveLeaves(stripPrefix(ref), ref, byTag));
        }
      }
    }
    const dedup = [...new Set(leaves)];
    if (dedup.length > 0) out["cobblemon:" + id] = dedup;
  }
  console.log(`[biome-tags] resolved ${Object.keys(out).length} regional tags`);

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`[biome-tags] wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
