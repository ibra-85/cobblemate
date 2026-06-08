#!/usr/bin/env node
/**
 * Build `src/data/pokesnack-academy/seasonings.json` from the official
 * Cobblemon bait-effect data dump.
 *
 *   node scripts/build-seasonings.mjs
 *
 * Input is `src/data/bait-effects-generated.json` — itself a dump of
 * the in-mod `bait_effects/*.json` files. So every value we surface
 * here is `effectConfidence: "official"` (sourced directly from the
 * mod, not the wiki or community guides).
 *
 * Output schema matches the spec in the user brief:
 *   {
 *     id: "golden_apple",
 *     name: { en, fr },
 *     effects: { rarityBoost, shinyMultiplier, biteRateModifier,
 *                typeSpawnMultiplier, hiddenAbilityBoost, alphaBoost,
 *                marksBoost, friendshipDelta, dropsRerolls },
 *     effectConfidence, source
 *   }
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IN   = path.join(ROOT, "src/data/bait-effects-generated.json");
const OUT_DIR = path.join(ROOT, "src/data/pokesnack-academy");
const OUT  = path.join(OUT_DIR, "seasonings.json");

// ─── FR labels for the items the catalogue surfaces ──────────────
// Curated subset — the bait dump has 149 items, but only the ones
// commonly used in recipes need a French display name. Unknown items
// fall through to their humanised English form.
const FR_NAMES = {
  // Vanilla MC ingredients
  "minecraft:apple":                  "Pomme",
  "minecraft:golden_apple":           "Pomme d'or",
  "minecraft:enchanted_golden_apple": "Pomme d'or enchantée",
  "minecraft:golden_carrot":          "Carotte dorée",
  "minecraft:glistering_melon_slice": "Tranche de melon scintillant",
  "minecraft:sweet_berries":          "Baies sucrées",
  "minecraft:glow_berries":           "Lumibaies",
  "minecraft:honey_bottle":           "Pot de miel",
  // Cobblemon special-effect berries
  "cobblemon:starf_berry":  "Baie Starf",
  // Type berries (FR)
  "cobblemon:rindo_berry":  "Baie Rindo",
  "cobblemon:occa_berry":   "Baie Occa",
  "cobblemon:passho_berry": "Baie Passho",
  "cobblemon:wacan_berry":  "Baie Wacan",
  "cobblemon:yache_berry":  "Baie Yache",
  "cobblemon:chople_berry": "Baie Chople",
  "cobblemon:kebia_berry":  "Baie Kébia",
  "cobblemon:shuca_berry":  "Baie Shuca",
  "cobblemon:coba_berry":   "Baie Coba",
  "cobblemon:payapa_berry": "Baie Payapa",
  "cobblemon:tanga_berry":  "Baie Tanga",
  "cobblemon:charti_berry": "Baie Charti",
  "cobblemon:kasib_berry":  "Baie Kasib",
  "cobblemon:haban_berry":  "Baie Haban",
  "cobblemon:colbur_berry": "Baie Colbur",
  "cobblemon:babiri_berry": "Baie Babiri",
  "cobblemon:roseli_berry": "Baie Roseli",
  "cobblemon:chilan_berry": "Baie Chilan",
};

function humanize(id) {
  return id
    .replace(/^[a-z]+:/, "")
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Translate Cobblemon's per-effect rows into the flat shape the UI
 * consumes. Each item can carry multiple effects (golden_apple has
 * `rarity_bucket + bite_time + shiny_reroll`) — we fold them into a
 * single record where unaffected axes are `null`.
 *
 *   typing.value=10        → typeSpawnMultiplier=10 (× that type)
 *   rarity_bucket.value=N  → rarityBoost (paliers)
 *   shiny_reroll.value=N   → shinyMultiplier (×N rolls)
 *   bite_time.value=N      → biteRateModifier (in %, negative = faster)
 *   ha_chance.value=N      → hiddenAbilityBoost (%)
 *   alpha_chance.value=N   → alphaBoost (%)
 *   mark_chance.value=N    → marksBoost (%)
 *   friendship.value=N     → friendshipDelta
 *   drops_reroll.value=N   → dropsRerolls (extra rolls on the table)
 *
 * Effects that don't fit (nature, iv, ev, level_raise, gender_chance,
 * egg_group, size) are surfaced as `extra[]` so power-users can still
 * see them without polluting the common axes.
 */
function condenseEffects(effects) {
  const out = {
    typeSpawnMultiplier: null,  // { type: "grass", value: 10 } | null
    rarityBoost: 0,
    shinyMultiplier: 1,
    biteRateModifier: 0,
    hiddenAbilityBoost: 0,
    alphaBoost: 0,
    marksBoost: 0,
    friendshipDelta: 0,
    dropsRerolls: 0,
    extra: [],
  };

  for (const e of effects) {
    const v = Number(e.value) || 0;
    const chance = Number(e.chance) || 0;
    switch (e.type) {
      case "typing":
        if (v > 0) out.typeSpawnMultiplier = { type: e.subcategory, value: v };
        break;
      case "rarity_bucket":
        out.rarityBoost += v;
        break;
      case "shiny_reroll":
        // Shiny rerolls multiply the chance — represent as a multiplier
        // (a "+10" roll is effectively ×10 vs base).
        out.shinyMultiplier = Math.max(out.shinyMultiplier, v || 1);
        break;
      case "bite_time":
        // Cobblemon stores bite as a percentage modifier (negative
        // means faster bite for fishing). Use the absolute value's
        // sign untouched so the UI can render "‑25 %".
        out.biteRateModifier += v;
        break;
      // ─── Chance-based effects ─────────────────────────────────────
      // Cobblemon's source data leaves `value: null` and encodes the
      // strength as `chance` (Enigma Berry = 5 % HA, Hopo Berry =
      // 2 % alpha, Kee Berry = 25 % female). Express these as
      // percentages so the UI renders "Talent caché +5 %" rather
      // than the previous "+0" (which made the seasoning look
      // inert).
      case "ha_chance":
        out.hiddenAbilityBoost += v > 0 ? v : Math.round(chance * 100);
        break;
      case "alpha_chance":
        out.alphaBoost += v > 0 ? v : Math.round(chance * 100);
        break;
      case "mark_chance":
        // Micle Berry — `value: 5` means +5 % marks per spawn.
        out.marksBoost += v > 0 ? v : Math.round(chance * 100);
        break;
      case "friendship":  out.friendshipDelta += v; break;
      case "drops_reroll":out.dropsRerolls += v; break;
      default:
        out.extra.push({
          type: e.type,
          subcategory: e.subcategory ?? null,
          chance: e.chance ?? 1,
          value: v,
        });
    }
  }
  // Drop empty extra arrays so the JSON stays compact.
  if (out.extra.length === 0) delete out.extra;
  return out;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(IN, "utf8"));
  const items = raw.items;

  const list = Object.entries(items)
    .map(([id, def]) => {
      const slug = id.replace(/^[a-z]+:/, "");
      return {
        id: slug,
        fullId: id,
        name: {
          en: humanize(id),
          fr: FR_NAMES[id] ?? humanize(id),
        },
        color: def.color ?? null,
        effects: condenseEffects(def.effects),
        // The bait dump comes directly from the mod's source files,
        // so the effects are authoritative — flag them as such.
        effectConfidence: "official",
        source: "cobblemon:bait_effects",
        // Whether this item is in the Campfire Pot's accepted
        // seasoning tag. Out-of-pot items (filtered by the pot's
        // seasoningTag) get `false` so the UI can hide / mark them.
        validInCampfirePot:
          (raw.validSeasonings ?? []).includes(id) ||
          (raw.validSeasonings ?? []).includes("#cobblemon:berries") &&
            /(berry|berries)$/i.test(slug),
      };
    })
    // Sort: alphabetically by full id so diffs stay stable.
    .sort((a, b) => a.fullId.localeCompare(b.fullId));

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(list, null, 2));
  console.log(`✓ ${list.length} seasonings written → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
