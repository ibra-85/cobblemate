"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Award,
  Castle,
  ChevronsUp,
  Cloud,
  Equal,
  Footprints,
  Heart,
  Map,
  Moon,
  PackageOpen,
  Shapes,
  Skull,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Trees,
  Users,
  Wand2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemIcon } from "@/components/site/minecraft-item";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import biomeTagIndex from "@/data/biome-tags-generated.json";
import { itemDisplayName } from "@/data/competitive-items";
import { lookupItem, itemSlug } from "@/data/items-pokeapi";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { moveDisplayName } from "@/data/competitive-moves";
import { displayName as pokemonDisplayName } from "@/lib/pokemon-form";
import { TYPES_META } from "@/data/types";
import type { PokemonTypeId } from "@/types";
import { lookupMove } from "@/data/moves";

/**
 * Resolve a move id (snake_case, hyphen, no separator…) to its French
 * display name. Walks the full PokéAPI-sourced `moves-generated.json`
 * registry (~937 entries, every gen-9 move) BEFORE falling back to
 * the much smaller `competitive-moves` curated list, so niche
 * evolution-trigger moves like "ragefist" (Poing Rage,
 * Mankey → Annihilape) resolve properly instead of leaving the
 * raw English id on screen.
 */
function moveLabelFr(rawId: string): string {
  const full = lookupMove(rawId);
  if (full?.name) return full.name;
  return moveDisplayName(rawId);
}
import type {
  Evolution,
  EvolutionDetails,
  EvolutionRequirement,
} from "@/types";
import { cn } from "@/lib/utils";

/**
 * Strip Cobblemon / Minecraft id prefixes so callers can hand the raw
 * `cobblemon:metal_coat` to `itemDisplayName` (which expects an
 * un-prefixed key) without remembering to clean it themselves.
 */
function stripPrefix(id: string | undefined): string {
  if (!id) return "";
  return id.replace(/^cobblemon:/, "").replace(/^minecraft:/, "");
}

function humanizeSlug(slug: string | undefined): string {
  if (!slug) return "";
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

// ─── Lookup tables for human-readable French labels ──────────────────
//
// The Cobblemon source ships these in English snake_case. Translating
// at render time (rather than baking the FR into the data file) lets
// us tweak phrasing without re-running the build pipeline.

const TIME_FR: Record<string, string> = {
  day: "Le jour",
  night: "La nuit",
  dawn: "À l'aube",
  dusk: "Au crépuscule",
  midnight: "À minuit",
  noon: "À midi",
  morning: "Le matin",
  afternoon: "L'après-midi",
  evening: "Le soir",
  any: "À toute heure",
};

const STAT_FR: Record<string, string> = {
  hp: "PV",
  attack: "Atq",
  defence: "Déf",
  defense: "Déf",
  special_attack: "Atq. Spé",
  special_defence: "Déf. Spé",
  special_defense: "Déf. Spé",
  speed: "Vit",
};

const WEATHER_FR: Record<string, string> = {
  rain: "Sous la pluie",
  clear: "Temps clair",
  thunder: "Sous l'orage",
  snow: "Sous la neige",
  any: "Tout temps",
};

/**
 * Cobblemon moon phase ids — numeric (`0`..`7`) or string. The map
 * mirrors what the in-game F3 menu shows so French players see the
 * familiar moon label.
 */
const MOON_PHASE_FR: Record<string, string> = {
  "0": "Pleine lune",
  "1": "Gibbeuse décroissante",
  "2": "Dernier quartier",
  "3": "Croissant décroissant",
  "4": "Nouvelle lune",
  "5": "Croissant croissant",
  "6": "Premier quartier",
  "7": "Gibbeuse croissante",
  full_moon: "Pleine lune",
  new_moon: "Nouvelle lune",
  first_quarter: "Premier quartier",
  last_quarter: "Dernier quartier",
};

/** Cobblemon world_environment → FR. Covers the three vanilla
 *  dimensions and the underwater flag. */
const ENVIRONMENT_FR: Record<string, string> = {
  overworld: "Surface (Overworld)",
  nether: "Nether",
  end: "End",
  underwater: "Sous l'eau",
  surface: "En surface",
  cave: "En grotte",
  rain: "Sous la pluie",
};

/** Common Cobblemon structure ids → FR. The full list is huge; we
 *  cover the ones actually referenced by evolutions. Anything else
 *  falls back to the humanised slug. */
const STRUCTURE_FR: Record<string, string> = {
  village: "Village",
  village_plains: "Village des plaines",
  village_desert: "Village du désert",
  village_savanna: "Village de la savane",
  village_snowy: "Village enneigé",
  village_taiga: "Village de la taïga",
  pillager_outpost: "Avant-poste pillard",
  stronghold: "Forteresse",
  mineshaft: "Mine abandonnée",
  ocean_monument: "Monument aquatique",
  woodland_mansion: "Manoir sylvestre",
  fortress: "Forteresse du Nether",
  bastion_remnant: "Vestiges de bastion",
  end_city: "Cité de l'End",
  ancient_city: "Cité ancienne",
  ruined_portal: "Portail en ruine",
};

/**
 * French labels for the Cobblemon biome aggregate tags
 * (`#cobblemon:is_*`) that show up as leaves when an evolution
 * `biomeCondition` / `biomeAnticondition` is resolved through the
 * tag index. List sourced from
 * `tmp/cobblemon-build-cache/.../tags/worldgen/biome/is_*.json` —
 * everything the dump references is covered, with a sensible
 * fallback to a humanised slug for any new tag Cobblemon ships
 * later. Keep alphabetised by id so additions stay reviewable.
 */
const BIOME_TAG_FR: Record<string, string> = {
  is_arid: "Aride",
  is_badlands: "Bad Lands",
  is_beach: "Plage",
  is_cherry_blossom: "Cerisaie",
  is_coast: "Côte",
  is_cold_ocean: "Océan froid",
  is_crimson: "Forêt vermillon",
  is_deep_dark: "Tréfonds",
  is_desert: "Désert",
  is_dripstone: "Caverne de stalactites",
  is_end: "End",
  is_floral: "Fleuri",
  is_forest: "Forêt",
  is_freezing: "Glacial",
  is_frozen_ocean: "Océan gelé",
  is_glacial: "Glacier",
  is_hills: "Collines",
  is_jungle: "Jungle",
  is_lukewarm_ocean: "Océan tiède",
  is_lush: "Caverne luxuriante",
  is_magical: "Magique",
  is_mountain: "Montagne",
  is_mushroom: "Champignonneux",
  is_nether: "Nether",
  is_ocean: "Océan",
  is_overgrowth: "Hyper-végétal",
  is_peak: "Pic",
  is_plains: "Plaines",
  is_river: "Rivière",
  is_sandy: "Sablonneux",
  is_savanna: "Savane",
  is_sky: "Ciel",
  is_snowy_forest: "Forêt enneigée",
  is_spooky: "Sinistre",
  is_swamp: "Marais",
  is_taiga: "Taïga",
  is_temperate: "Tempéré",
  is_temperate_ocean: "Océan tempéré",
  is_toxic: "Toxique",
  is_tropical_island: "Île tropicale",
  is_tundra: "Toundra",
  is_volcanic: "Volcanique",
  is_warm_ocean: "Océan chaud",
};

const BIOME_TAGS = biomeTagIndex as Record<string, string[]>;

/**
 * Translate a single `is_*` aggregate biome tag id to its French
 * label. Falls through to a humanised slug for any new tag Cobblemon
 * ships that isn't in `BIOME_TAG_FR` yet — better to show "Mangrove"
 * than nothing.
 */
function biomeLeafLabel(leaf: string): string {
  return BIOME_TAG_FR[leaf] ?? humanizeSlug(leaf.replace(/^is_/, ""));
}

/**
 * Resolve a Cobblemon biome tag/id to a list of FR labels suitable
 * for a chip. Walks the precomputed `biome-tags-generated.json`
 * index — `pikachu_alolabiome` → ["Plage", "Île tropicale"]. For
 * unknown ids or non-tag entries the function returns null so the
 * caller can fall back to a generic chip.
 */
function resolveBiomeLabels(raw: string): string[] | null {
  // Strip the leading `#` (tag marker) but keep the namespace prefix
  // since the index keys are stored with `cobblemon:` intact.
  const key = raw.replace(/^#/, "");
  const leaves = BIOME_TAGS[key];
  if (leaves && leaves.length > 0) return leaves.map(biomeLeafLabel);
  // Maybe the raw value *is* an aggregate tag like `#cobblemon:is_beach`.
  const bare = stripPrefix(raw.replace(/^#/, ""));
  if (BIOME_TAG_FR[bare]) return [BIOME_TAG_FR[bare]];
  return null;
}

/**
 * Pick the right time-of-day icon. Cobblemon's `time_range` values
 * are coarse buckets — we group dawn/morning/noon under sunrise/sun
 * and dusk/evening/midnight/night under sunset/moon so the icon
 * always reads as "obviously day-ish or obviously night-ish" at
 * a glance.
 */
function TimeIcon({ range }: { range: string }) {
  switch (range) {
    case "dawn":
    case "morning":
      return <Sunrise className="size-3" />;
    case "dusk":
    case "evening":
      return <Sunset className="size-3" />;
    case "night":
    case "midnight":
      return <Moon className="size-3" />;
    default:
      return <Sun className="size-3" />;
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Renders an evolution row's method as a horizontal pill list. Each
 * requirement gets its own visual chip — icon + short FR label — so
 * the eye doesn't have to parse a comma-separated sentence. Falls
 * back to a single plain-text pill (`method` string) when the
 * structured `details` payload is absent (older data file rows).
 *
 * `size="sm"` is for the compact horizontal evolution strip where
 * cards are only `w-24` wide; `size="md"` is for the vertical
 * column flowchart on the Pokémon detail page where there's room
 * for slightly bigger chips and a partner sprite.
 */
export function EvolutionMethod({
  evolution,
  size = "md",
  align = "center",
}: {
  evolution: Evolution;
  size?: "sm" | "md";
  align?: "center" | "start";
}) {
  // Legacy path — no structured payload, just show the raw method
  // string in a muted pill. Kept so the renderer never regresses for
  // rows that escaped the patch script.
  if (!evolution.details) {
    return (
      <div
        className={cn(
          "flex flex-wrap gap-1",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <PlainPill size={size}>{evolution.method}</PlainPill>
      </div>
    );
  }

  const chips = buildChips(evolution.details);

  if (chips.length === 0) {
    // Variant we couldn't unpack into individual chips — fall back to
    // the method summary as a single pill.
    return (
      <div
        className={cn(
          "flex flex-wrap gap-1",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <PlainPill size={size}>{evolution.method}</PlainPill>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        align === "center" ? "justify-center" : "justify-start",
      )}
      // The aggregate method line is the accessible summary — screen
      // readers read it once instead of stitching each chip's hover-title.
      title={evolution.method}
    >
      {chips.map((c, i) => (
        <ChipRenderer key={i} chip={c} size={size} />
      ))}
    </div>
  );
}

// ─── Chip building ────────────────────────────────────────────────────

type Tone = "neutral" | "trade" | "item" | "level" | "heart" | "time" | "biome" | "stat" | "danger";

interface ChipSpec {
  icon: React.ReactNode;
  label: React.ReactNode;
  /** Plain-text fallback for the title attribute when there's no rich
   *  tooltip — used by simple chips (level, friendship, time) where a
   *  one-line summary is enough. */
  title?: string;
  tone: Tone;
  /** Optional rich tooltip content. When set, the chip is wrapped in
   *  a `<Tooltip>` (base-ui popover) instead of relying on the native
   *  browser title. Use this for item / partner / move chips where the
   *  hover affordance should show extra info. */
  tooltip?: React.ReactNode;
  /** Internal id for items (`/items/<slug>`) or Pokémon
   *  (`/pokedex/<id>`) the chip references. When set the chip becomes
   *  a `<Link>` so a click navigates to the detail page; combined
   *  with `tooltip` we get hover-info + click-to-go. */
  href?: string;
}

/**
 * Tooltip card for an item chip — icon + French name + the actual
 * gameplay info (PokéAPI `shortEffect`) and flavour text. We deliberately
 * drop the English name + technical id the previous version showed,
 * since neither helps the player figure out what the item does in
 * practice.
 */
function ItemTooltip({ rawId }: { rawId: string }) {
  const key = stripPrefix(rawId);
  const fr = itemDisplayName(key);
  const pokeapi = lookupItem(key);
  // Many `shortEffect` strings are duplicates of the flavour
  // description on evolution stones — render description only when it
  // actually adds info.
  const eff = pokeapi?.shortEffect?.trim();
  const desc = pokeapi?.description?.trim();
  const showDesc = desc && desc !== eff;
  return (
    <div className="flex flex-col gap-2 py-0.5 text-left">
      <div className="flex items-center gap-2.5">
        <ItemIcon item={rawId} size="size-9" />
        <span className="text-sm font-semibold leading-tight text-foreground">
          {fr}
        </span>
      </div>
      {eff && (
        <p className="text-[11px] leading-snug text-foreground/90">
          {eff}
        </p>
      )}
      {showDesc && (
        <p className="text-[10px] italic leading-snug text-muted-foreground">
          {desc}
        </p>
      )}
      {!eff && !desc && (
        <p className="text-[10px] italic text-muted-foreground">
          Pas de description disponible.
        </p>
      )}
    </div>
  );
}

/**
 * Resolve a Cobblemon item id (`cobblemon:metal_coat`) to the PokéAPI
 * slug used by `/items/<slug>`. Returns `null` when no detail page is
 * known — caller skips the Link wrapper in that case so the chip
 * stays unclickable instead of landing on a 404.
 */
function resolveItemSlug(rawId: string): string | null {
  return itemSlug(stripPrefix(rawId));
}

/**
 * Tooltip card for a partner species chip (trade evolutions like
 * Karrablast ↔ Shelmet). Shows the sprite + name + dex number with a
 * call-to-action to open the partner's pokédex page — kept as a plain
 * Link inside the tooltip because the tooltip itself is not a link.
 */
function PartnerTooltip({ pokemonId }: { pokemonId: string }) {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return <span className="text-xs">{pokemonId}</span>;
  return (
    <div className="flex items-center gap-2.5 py-0.5 text-left">
      <PokemonSprite pokemon={p} size="size-10" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold leading-tight text-foreground">
          {pokemonDisplayName(p)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{p.dexNumber.toString().padStart(4, "0")}
        </span>
        <Link
          href={`/pokedex/${p.id}`}
          className="mt-0.5 text-[10px] font-medium text-primary hover:underline"
        >
          Voir le Pokédex →
        </Link>
      </div>
    </div>
  );
}

/**
 * Decompose a structured evolution payload into one chip per
 * condition. The order matters — we lead with the variant marker
 * (Trade / item used), then the headline requirement (level /
 * friendship), then the modifiers (time, biome, stat, weather…).
 * The user reads "this is a trade evolution → while holding Metal
 * Coat" rather than the other way around.
 */
function buildChips(details: EvolutionDetails): ChipSpec[] {
  const out: ChipSpec[] = [];
  const reqs = details.requirements ?? [];

  // 1. Variant marker
  if (details.variant === "trade") {
    const partnerId = details.requiredContext
      ? stripPrefix(details.requiredContext)
      : null;
    const partner = partnerId ? POKEMON_BY_ID[partnerId] : null;
    if (partner) {
      // Trade with a specific partner species — Karrablast ↔ Shelmet.
      out.push({
        icon: <PokemonSprite pokemon={partner} size="size-4" />,
        label: (
          <span className="inline-flex items-center gap-1">
            <span className="opacity-70">Échange avec</span>
            <span className="font-semibold">{pokemonDisplayName(partner)}</span>
          </span>
        ),
        tone: "trade",
        tooltip: <PartnerTooltip pokemonId={partner.id} />,
        href: `/pokedex/${partner.id}`,
      });
    } else {
      out.push({
        icon: <ArrowLeftRight className="size-3" />,
        label: "Échange",
        tone: "trade",
        title: "Évolue lors d'un échange entre deux joueurs",
      });
    }
  } else if (
    details.variant === "item_interact" ||
    details.variant === "use_item"
  ) {
    if (details.requiredContext) {
      const itemKey = stripPrefix(details.requiredContext);
      const slug = resolveItemSlug(details.requiredContext);
      out.push({
        icon: <ItemIcon item={details.requiredContext} size="size-4" />,
        label: itemDisplayName(itemKey),
        tone: "item",
        tooltip: <ItemTooltip rawId={details.requiredContext} />,
        href: slug ? `/items/${slug}` : undefined,
      });
    } else {
      out.push({
        icon: <PackageOpen className="size-3" />,
        label: "Utiliser un objet",
        tone: "item",
      });
    }
  }
  // For level_up we don't add a marker — the "Niv. N" or friendship
  // chip below carries the meaning.

  // 2. Headline requirement chips
  for (const r of reqs) {
    const chip = chipForRequirement(r);
    if (chip) out.push(chip);
  }

  // 3. Consume warning — only for held-item trades, where the player
  // forfeits the item. Comes last so the eye reads conditions first.
  if (details.consumeHeldItem) {
    out.push({
      icon: <Sparkles className="size-3" />,
      label: "Consomme l'objet",
      tone: "danger",
      title: "L'objet tenu est consommé lors de l'évolution.",
    });
  }

  return out;
}

function chipForRequirement(r: EvolutionRequirement): ChipSpec | null {
  switch (r.variant) {
    case "level": {
      const min = (r as { minLevel?: number }).minLevel;
      const max = (r as { maxLevel?: number }).maxLevel;
      if (!min && !max) return null;
      const label =
        min && max
          ? `Niv. ${min}–${max}`
          : min
            ? `Niv. ${min}+`
            : `Niv. ≤ ${max}`;
      return {
        icon: <TrendingUp className="size-3" />,
        label,
        tone: "level",
        title:
          min && !max
            ? `Niveau minimum requis : ${min}`
            : max && !min
              ? `Niveau maximum : ${max}`
              : `Plage de niveau : ${min}–${max}`,
      };
    }
    case "friendship": {
      const amount = (r as { amount?: number }).amount;
      return {
        icon: <Heart className="size-3 fill-current" />,
        label: amount ? `Amitié ≥ ${amount}` : "Amitié élevée",
        tone: "heart",
        title:
          amount != null
            ? `Bonheur du Pokémon : ${amount} ou plus`
            : "Bonheur élevé du Pokémon",
      };
    }
    case "held_item": {
      const id = (r as { itemCondition?: string }).itemCondition;
      if (!id) return null;
      const key = stripPrefix(id);
      const slug = resolveItemSlug(id);
      return {
        icon: <ItemIcon item={id} size="size-4" />,
        label: (
          <span className="inline-flex items-center gap-1">
            <span className="opacity-70">Tient</span>
            <span className="font-semibold">{itemDisplayName(key)}</span>
          </span>
        ),
        tone: "item",
        tooltip: <ItemTooltip rawId={id} />,
        href: slug ? `/items/${slug}` : undefined,
      };
    }
    case "time_range": {
      const range = (r as { range?: string }).range ?? "";
      return {
        icon: <TimeIcon range={range} />,
        label: TIME_FR[range] ?? humanizeSlug(range),
        tone: "time",
      };
    }
    case "stat_compare": {
      const high = (r as { highStat?: string }).highStat ?? "";
      const low = (r as { lowStat?: string }).lowStat ?? "";
      if (!high || !low) return null;
      return {
        icon: <ChevronsUp className="size-3" />,
        label: `${STAT_FR[high] ?? humanizeSlug(high)} > ${STAT_FR[low] ?? humanizeSlug(low)}`,
        tone: "stat",
        title: "Comparaison des statistiques au moment de l'évolution",
      };
    }
    case "stat_equal": {
      // Cobblemon payload uses `statOne`/`statTwo`, not `highStat`/
      // `lowStat`. Tyrogue → Kapoera is the only mon in the dump that
      // hits this branch.
      const a =
        (r as { statOne?: string }).statOne ??
        (r as { highStat?: string }).highStat ?? "";
      const b =
        (r as { statTwo?: string }).statTwo ??
        (r as { lowStat?: string }).lowStat ?? "";
      if (!a || !b) return null;
      return {
        icon: <Equal className="size-3" />,
        label: `${STAT_FR[a] ?? humanizeSlug(a)} = ${STAT_FR[b] ?? humanizeSlug(b)}`,
        tone: "stat",
        title: "Statistiques égales requises (Tyrogue → Kapoera)",
      };
    }
    case "biome": {
      // Cobblemon ships two flavours: `biomeCondition` (in biome X) and
      // `biomeAnticondition` (NOT in biome X). The latter is what
      // Pikachu uses to route non-Alolan biomes back to plain Raichu.
      const positive =
        (r as { biomeCondition?: string }).biomeCondition ?? "";
      const negative =
        (r as { biomeAnticondition?: string }).biomeAnticondition ?? "";
      const raw = positive || negative;
      if (!raw) return null;

      // Resolve the biome tag through the precomputed index so the
      // chip names the *actual* climate/terrain ("Plage, Île
      // tropicale") instead of the meaningless tag id ("Pikachu
      // Alolabiome"). The index covers ~60 regional evolution tags;
      // anything outside falls back to the humanised tail (e.g. for
      // a stray modpack-specific tag).
      const labels = resolveBiomeLabels(raw);
      const label = labels
        ? labels.join(" · ")
        : humanizeSlug(stripPrefix(raw).split("/").pop() ?? raw)
            .replace(/biome$/i, "")
            .trim() || "Biome";

      return {
        icon: <Trees className="size-3" />,
        label: positive ? label : `Hors ${label}`,
        tone: "biome",
        title: positive
          ? `Évolue uniquement dans : ${label}`
          : `Évolue partout sauf : ${label}`,
      };
    }
    case "world_environment": {
      const env =
        (r as { environment?: string }).environment ?? "";
      const label = ENVIRONMENT_FR[env] ?? humanizeSlug(env) ?? "Environnement";
      return {
        icon: <Map className="size-3" />,
        label,
        tone: "biome",
        title: `Évolue dans la dimension : ${label}`,
      };
    }
    case "weather": {
      // Cobblemon ships boolean flags (`isRaining: true`) per weather
      // condition, not a single string. We translate the first truthy
      // flag we find; falsy means "weather doesn't matter for this
      // requirement", which shouldn't normally hit this branch.
      const flags = r as {
        isRaining?: boolean;
        isThundering?: boolean;
        isSnowing?: boolean;
        weather?: string;
      };
      let label: string;
      if (flags.isThundering) label = "Sous l'orage";
      else if (flags.isRaining) label = "Sous la pluie";
      else if (flags.isSnowing) label = "Sous la neige";
      else if (flags.weather)
        label = WEATHER_FR[flags.weather] ?? humanizeSlug(flags.weather);
      else return null;
      return {
        icon: <Cloud className="size-3" />,
        label,
        tone: "neutral",
      };
    }
    case "moon_phase": {
      const phase = String(
        (r as { moonPhase?: string | number }).moonPhase ?? "",
      );
      const label =
        MOON_PHASE_FR[phase] ?? humanizeSlug(phase) ?? "Phase lunaire";
      return {
        icon: <Moon className="size-3" />,
        label,
        tone: "time",
        title: `Phase de la lune requise : ${label}`,
      };
    }
    // Cobblemon uses both `has_move` (current data) and `known_move`
    // (older data). Same payload shape, same chip. Aliased so we never
    // miss either spelling.
    case "has_move":
    case "known_move": {
      const move = (r as { move?: string }).move ?? "";
      const display = moveLabelFr(move) || humanizeSlug(move);
      return {
        icon: <Wand2 className="size-3" />,
        label: (
          <span>
            <span className="opacity-70">Apprend</span>{" "}
            <span className="font-semibold">{display}</span>
          </span>
        ),
        tone: "stat",
        title: `Doit avoir appris la capacité ${display}`,
      };
    }
    case "has_move_type":
    case "known_move_type": {
      // Cobblemon ships the type slug in English ("fairy", "grass").
      // Resolve to the FR label via TYPES_META and surface the type
      // visually with a small coloured dot — a TypeBadge inside the
      // chip would be a badge-in-a-badge and read poorly.
      const typeId = (
        (r as { type?: string }).type ?? ""
      ).toLowerCase() as PokemonTypeId;
      const meta = TYPES_META[typeId];
      const label = meta?.label ?? humanizeSlug(typeId);
      return {
        icon: <Wand2 className="size-3" />,
        label: (
          <span className="inline-flex items-center gap-1">
            <span className="opacity-70">Avec une capacité</span>
            {meta && (
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
            )}
            <span className="font-semibold">{label}</span>
          </span>
        ),
        tone: "stat",
        title: `Doit connaître une capacité de type ${label}`,
      };
    }
    case "use_move": {
      const move = (r as { move?: string }).move ?? "";
      const amount = (r as { amount?: number }).amount;
      const display = moveLabelFr(move) || humanizeSlug(move);
      return {
        icon: <Footprints className="size-3" />,
        label: (
          <span>
            <span className="opacity-70">Utiliser</span>{" "}
            <span className="font-semibold">{display}</span>
            {amount ? <span className="ml-1 opacity-70">×{amount}</span> : null}
          </span>
        ),
        tone: "stat",
        title: amount
          ? `Utiliser ${display} ${amount} fois en combat`
          : `Utiliser ${display} en combat`,
      };
    }
    // ─── Cobblemon-specific Minecraft requirements ────────────────
    //
    // The variants below were missing from the first pass and
    // accounted for ~115 "no chip rendered" rows in the audit.
    case "structure": {
      // Same positive/anticondition split as biome. Most evolutions
      // use the anticondition flavour ("anywhere except in village")
      // — render with a "Hors ..." prefix in that case.
      const positive = (r as { structureCondition?: string }).structureCondition ?? "";
      const negative = (r as { structureAnticondition?: string }).structureAnticondition ?? "";
      const raw = positive || negative;
      if (!raw) return null;
      const tail = stripPrefix(raw).split("/").pop() ?? raw;
      const label = STRUCTURE_FR[tail] ?? humanizeSlug(tail) ?? "Structure";
      return {
        icon: <Castle className="size-3" />,
        label: (
          <span>
            <span className="opacity-70">{positive ? "Dans" : "Hors"}</span>{" "}
            <span className="font-semibold">{label}</span>
          </span>
        ),
        tone: "biome",
        title: positive
          ? `Évolue dans la structure : ${label}`
          : `Évolue partout sauf dans : ${label}`,
      };
    }
    case "blocks_traveled": {
      const amount = (r as { amount?: number }).amount;
      return {
        icon: <Footprints className="size-3" />,
        label: amount ? `Marcher ${amount} blocs` : "Marcher beaucoup",
        tone: "level",
        title:
          amount != null
            ? `Parcourir ${amount} blocs avec le Pokémon en équipe`
            : "Parcourir une longue distance",
      };
    }
    case "party_member": {
      // `target` is a Cobblemon-style species spec, possibly with
      // aspect filters appended ("remoraid", or "bisharp held_item=
      // cobblemon:kings_rock"). We only need the leading species id.
      const raw = (r as { target?: string }).target ?? "";
      const partnerId = stripPrefix(raw).split(/\s+/)[0] ?? "";
      const partner = partnerId ? POKEMON_BY_ID[partnerId] : null;
      if (partner) {
        return {
          icon: <PokemonSprite pokemon={partner} size="size-4" />,
          label: (
            <span>
              <span className="opacity-70">Avec</span>{" "}
              <span className="font-semibold">{pokemonDisplayName(partner)}</span>
            </span>
          ),
          tone: "trade",
          tooltip: <PartnerTooltip pokemonId={partner.id} />,
          href: `/pokedex/${partner.id}`,
        };
      }
      return {
        icon: <Users className="size-3" />,
        label: humanizeSlug(partnerId) || "Pokémon en équipe",
        tone: "trade",
        title: "Un Pokémon spécifique doit être dans l'équipe",
      };
    }
    // `properties` describes Cobblemon "aspect" requirements — gender,
    // form, regional variant, etc. The `target` field is a flat space-
    // separated condition string ("wurmple cocoon_species=silcoon").
    // Surface the aspect part when present, otherwise a generic chip.
    case "properties": {
      const target = (r as { target?: string }).target ?? "";
      // First token is the species, the rest are k=v aspect filters.
      const aspects = target
        .split(/\s+/)
        .slice(1)
        .map((s) => s.split("=")[1] ?? s)
        .filter(Boolean)
        .map((s) => humanizeSlug(stripPrefix(s)));
      const label = aspects.length > 0 ? aspects.join(" · ") : "Forme requise";
      return {
        icon: <Shapes className="size-3" />,
        label,
        tone: "neutral",
        title:
          target ||
          "Conditions de forme du Pokémon (genre, variante régionale, …)",
      };
    }
    case "property_range": {
      const feature = (r as { feature?: string }).feature ?? "";
      const range = (r as { range?: string }).range ?? "";
      const label = feature
        ? `${humanizeSlug(stripPrefix(feature))}${range ? ` ∈ ${range}` : ""}`
        : "Plage de propriété";
      return {
        icon: <Shapes className="size-3" />,
        label,
        tone: "neutral",
        title: `Propriété ${feature} dans l'intervalle ${range}`,
      };
    }
    case "defeat": {
      // `target` is the species (+ optional aspect filters) the player
      // has to KO. Strip the aspect tail for the chip; tooltip carries
      // the full spec.
      const raw = (r as { target?: string }).target ?? "";
      const speciesId = stripPrefix(raw).split(/\s+/)[0] ?? "";
      const partner = speciesId ? POKEMON_BY_ID[speciesId] : null;
      const amount = (r as { amount?: number }).amount;
      const speciesLabel = partner?.name ?? humanizeSlug(speciesId);
      const label = speciesLabel
        ? `Vaincre ${amount ? `${amount} ` : ""}${speciesLabel}`
        : `Vaincre ${amount ?? "N"} adversaires`;
      return {
        icon: <Skull className="size-3" />,
        label,
        tone: "danger",
        title: raw,
      };
    }
    case "advancement": {
      // Cobblemon's payload key is `requiredAdvancement`; older builds
      // used `advancement`. Try both. Display the last path segment so
      // `cobblemon:catching/collect_all_vivillon` reads as
      // "Collect All Vivillon".
      const id =
        (r as { requiredAdvancement?: string }).requiredAdvancement ??
        (r as { advancement?: string }).advancement ??
        "";
      const tail = stripPrefix(id).split("/").pop() ?? id;
      const label = humanizeSlug(tail) || "Avancement";
      return {
        icon: <Award className="size-3" />,
        label,
        tone: "stat",
        title: id ? `Avancement Minecraft : ${id}` : undefined,
      };
    }
    default:
      return null;
  }
}

/**
 * One chip render. Combines (in order of preference) Link → click
 * navigation + Tooltip → hover info + plain chip → static. The four
 * combinations cover:
 *   - item / partner chips with both nav + info → Link wrapping
 *     TooltipTrigger so a single `<a>` element merges the props (base-ui
 *     uses Radix-style render delegation).
 *   - chips with info only (level, friendship, time) → TooltipTrigger
 *     wrapping a plain span. Tooltip-wrapped to allow rich content even
 *     when there's no click target.
 *   - chips with nav only → Link wrapping the bare Chip.
 *   - chips with neither → `<div title={c.title}>` for browser-native
 *     hover-text.
 *
 * The result: an item chip *always* shows the item icon, opens a
 * tooltip on hover, and navigates to the item page on click — same
 * behaviour for every Pokémon, no per-species drift.
 */
function ChipRenderer({ chip, size }: { chip: ChipSpec; size: "sm" | "md" }) {
  const innerChip = (
    <Chip size={size} tone={chip.tone}>
      {chip.icon}
      <span>{chip.label}</span>
    </Chip>
  );

  // Both Link + Tooltip — the chip becomes a clickable anchor that
  // also reveals a rich popover on hover.
  if (chip.href && chip.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={chip.href}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex no-underline"
              aria-label="Voir le détail"
            >
              {innerChip}
            </Link>
          }
        />
        <TooltipContent>{chip.tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  // Just the tooltip — no click target, hover-only info.
  if (chip.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex cursor-help">{innerChip}</span>}
        />
        <TooltipContent>{chip.tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  // Just the link — rare, but kept symmetric.
  if (chip.href) {
    return (
      <Link
        href={chip.href}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex no-underline"
      >
        {innerChip}
      </Link>
    );
  }

  // Static chip.
  return (
    <div className="inline-flex" title={chip.title}>
      {innerChip}
    </div>
  );
}

// ─── Chip primitives ──────────────────────────────────────────────────

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted/60 text-muted-foreground border-border",
  trade: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  item: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  level: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  heart: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  time: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  biome: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  stat: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

function Chip({
  size,
  tone,
  title,
  children,
}: {
  size: "sm" | "md";
  tone: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
        size === "sm"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-0.5 text-[11px]",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

function PlainPill({
  size,
  children,
}: {
  size: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted text-muted-foreground",
        size === "sm"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-0.5 text-[11px]",
      )}
    >
      {children}
    </span>
  );
}
