"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search, X, MapPin, Sparkles, Mountain, Star, Crown,
  Atom, Skull, AlertCircle, CheckCircle2, ChefHat, ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  MinecraftCraftingTable,
  ItemIcon,
  itemMeta,
} from "@/components/site/minecraft-item";
import {
  POKESNACK_ENTRIES,
  getSeasoning,
  formatSeasoningEffects,
  type PokesnackEntry,
  type SnackRecipe,
} from "@/data/pokesnack-academy";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import {
  BIOME_LABELS_FR,
  MINECRAFT_BIOME_FR,
  biomeLabel,
  vanillaBiomesForTag,
  minecraftBiomeLabel,
} from "@/data/biomes";
import { cn } from "@/lib/utils";
import type { PokemonTypeId } from "@/types";
import {
  PokesnacksFiltersBar,
  type PokesnackFilter,
} from "@/features/pokesnacks/filters-bar";
import { foldDiacritics } from "@/lib/search";

// ─── Constants ──────────────────────────────────────────────────

const TYPE_OPTIONS: PokemonTypeId[] = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark",
  "steel","fairy",
];

const CATEGORY_OPTIONS: { id: PokesnackEntry["category"]; label: string; icon: typeof Star; tone: string; color: string }[] = [
  { id: "starter",     label: "Starter",         icon: Star,     tone: "text-emerald-600 dark:text-emerald-300", color: "#10b981" },
  { id: "mythical",    label: "Mythique",        icon: Sparkles, tone: "text-purple-600 dark:text-purple-300",   color: "#a855f7" },
  { id: "paradox",     label: "Paradox",         icon: Atom,     tone: "text-cyan-600 dark:text-cyan-300",       color: "#06b6d4" },
  { id: "ultra_beast", label: "Ultra-Chimère",   icon: Skull,    tone: "text-pink-600 dark:text-pink-300",       color: "#ec4899" },
  { id: "fossil",      label: "Fossile",         icon: Mountain, tone: "text-stone-600 dark:text-stone-300",     color: "#78716c" },
  { id: "regional",    label: "Forme régionale", icon: MapPin,   tone: "text-blue-600 dark:text-blue-300",       color: "#3b82f6" },
  { id: "baby",        label: "Bébé",            icon: Star,     tone: "text-pink-500 dark:text-pink-200",       color: "#f472b6" },
];

const RARITY_OPTIONS = ["common", "uncommon", "rare", "ultra-rare", "unknown"] as const;
const RARITY_LABEL: Record<string, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  "ultra-rare": "Ultra-rare",
  unknown: "Inconnu",
};
const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  "ultra-rare": "#a855f7",
  unknown: "#6b7280",
};

const CRAFT_OPTIONS = [
  { id: "all",    label: "Tous" },
  { id: "spawn",  label: "Spawn Naturel" },
  { id: "elite",  label: "Paradox/UB" },
] as const;
type CraftFilter = (typeof CRAFT_OPTIONS)[number]["id"];

const ELITE_CATEGORIES = new Set(["paradox", "ultra_beast"]);

// Page size for the snack-card grid. Each card mounts a Tabs strip,
// a 3×3 Minecraft slot grid and a result slot — so even a "small"
// list of 60 cards reconciles ~2k DOM nodes. Cap the initial visible
// slice at 20 and stream the rest in via an IntersectionObserver
// (same pattern the Pokédex uses for its 1186-mon grid).
const PAGE_SIZE = 20;

// ─── Biome label helper (reused from previous version) ─────────

function humanizeBiome(id: string): string {
  if (BIOME_LABELS_FR[id]) return BIOME_LABELS_FR[id];
  const mc = `minecraft:${id}`;
  if (MINECRAFT_BIOME_FR[mc]) return MINECRAFT_BIOME_FR[mc];
  const tag = `is_${id}`;
  if (BIOME_LABELS_FR[tag]) return BIOME_LABELS_FR[tag];
  return biomeLabel(id);
}

/**
 * Expand the raw `entry.spawn.biomes` (a mix of `#cobblemon:is_*` tag
 * refs and concrete `minecraft:*` ids) into the list of vanilla
 * Minecraft biomes the player can actually find — those are the names
 * that match F3 / the in-game biome readout. Modded biomes are
 * dropped on purpose: most players run vanilla + Cobblemon and the
 * raw modded ids ("biomesoplenty:ominous_woods") aren't actionable.
 */
function getVanillaBiomes(biomes: string[]): string[] {
  const set = new Set<string>();
  for (const raw of biomes) {
    if (raw.startsWith("minecraft:")) {
      set.add(raw);
      continue;
    }
    if (raw.startsWith("#")) {
      // Tag ref: "#cobblemon:is_spooky" → key "is_spooky"
      const key = raw.replace(/^#?\w+:/, "");
      for (const b of vanillaBiomesForTag(key)) set.add(b);
    }
  }
  return Array.from(set).sort((a, b) =>
    minecraftBiomeLabel(a).localeCompare(minecraftBiomeLabel(b), "fr"),
  );
}

const FR_TYPE_LABEL: Record<PokemonTypeId, string> = {
  normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik",
  grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison",
  ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte",
  rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres",
  steel: "Acier", fairy: "Fée",
};

const RECIPE_TABS: { id: keyof PokesnackEntry["recommendedSnacks"]; label: string; icon: typeof Star }[] = [
  { id: "bestGeneral",  label: "Meilleur choix", icon: Star },
  { id: "typeCoverage", label: "Couvre types",   icon: Sparkles },
  { id: "rareSpawn",    label: "Spawn rare",     icon: Crown },
  { id: "shinyHunt",    label: "Shiny hunt",     icon: Atom },
  { id: "budget",       label: "Budget",         icon: ChefHat },
];

// ─── Page ───────────────────────────────────────────────────────

// Pokesnack dataset, with non-paradox legendaries stripped out — the
// vanilla legendaries don't surface via PokéSnacks on the Academy
// server so listing them here was misleading. Paradox mons (which
// the data also tags as "paradox", not "legendary") are kept.
const POKESNACK_ENTRIES_FILTERED: PokesnackEntry[] = POKESNACK_ENTRIES.filter(
  (e) => e.category !== "legendary",
);

// Pre-built search index. Built once at module load, NOT on every
// keystroke — with 1303 Pokémon, re-computing the haystack on every
// keypress was the dominant cost (~30ms × 1303 entries on slower
// devices). The haystack collapses every searchable field into one
// pre-lowercased string so the filter loop is a flat `String.includes`.
interface IndexedEntry {
  entry: PokesnackEntry;
  haystack: string;
}
const SEARCH_INDEX: IndexedEntry[] = POKESNACK_ENTRIES_FILTERED.map((e) => ({
  entry: e,
  haystack: foldDiacritics(
    `${e.slug} ${e.name.en} ${e.name.fr} ${e.types.join(" ")} ${e.nationalDex ?? ""}`,
  ),
}));

// Pre-build the biome facet list once — it never changes.
const BIOME_OPTIONS_STATIC = (() => {
  const set = new Set<string>();
  for (const e of POKESNACK_ENTRIES_FILTERED)
    for (const b of e.spawn.biomes) set.add(b);
  return [...set]
    .map((b) => ({ value: b, label: humanizeBiome(b) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
})();

const TYPE_FILTER_OPTIONS = TYPE_OPTIONS.map((t) => ({
  value: t,
  label: FR_TYPE_LABEL[t],
  color: TYPES_META[t]?.color,
}));

const RARITY_FILTER_OPTIONS = RARITY_OPTIONS.map((r) => ({
  value: r,
  label: RARITY_LABEL[r],
  color: RARITY_COLOR[r],
}));

const CATEGORY_FILTER_OPTIONS = CATEGORY_OPTIONS.map((c) => ({
  value: c.id,
  label: c.label,
  color: c.color,
}));

export default function PokeSnacksPage() {
  const [query, setQuery] = useState("");
  const [craft, setCraft] = useState<CraftFilter>("all");
  const [filters, setFilters] = useState<PokesnackFilter[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // React-19 native debounce — the input updates `query` immediately
  // so typing never feels laggy; `deferredQuery` lags by one render
  // and feeds the (heavier) entry filter pipeline. While the two
  // diverge we fade the list to signal "computing".
  const deferredQuery = useDeferredValue(query);
  const isStale = deferredQuery !== query;

  // Pre-bake the filter input into a single fast-path predicate. Most
  // sessions never hit category/biome/rarity filters — for those the
  // filter loop is a single `haystack.includes(q)`; we hoist the
  // expensive `matchFilter` switch into a per-filter precomputed
  // value set so the inner loop is two `Set.has` lookups instead of
  // an N-allocs switch on every entry.
  const filtered = useMemo(() => {
    const q = foldDiacritics(deferredQuery.trim());
    const activeFilters = filters.filter((f) => f.values.length > 0);
    // Pre-build set lookups once per memo run — the original code
    // called `values.includes()` inside the per-entry loop which is
    // O(F·V·N). With Sets it's O(F·N).
    const filterSets = activeFilters.map((f) => ({
      kind: f.kind,
      mode: f.mode,
      set: new Set(f.values),
    }));
    const out: PokesnackEntry[] = [];
    for (const { entry: e, haystack } of SEARCH_INDEX) {
      if (q && !haystack.includes(q)) continue;
      if (craft === "spawn" && e.spawn.biomes.length === 0) continue;
      if (craft === "elite" && !ELITE_CATEGORIES.has(e.category)) continue;
      let ok = true;
      for (const f of filterSets) {
        const matches = matchFilterSet(e, f.kind, f.set);
        const keep = f.mode === "exclude" ? !matches : matches;
        if (!keep) { ok = false; break; }
      }
      if (!ok) continue;
      out.push(e);
    }
    return out;
  }, [deferredQuery, craft, filters]);

  // Reset the visible window whenever the result set changes —
  // otherwise scrolling deep into a long list then filtering would
  // leave a stale offset. Same pattern as the Pokédex explorer:
  // compare a stored signature and reset during render (React 19's
  // recommended escape hatch for "derive from changing props").
  const filterSignature = `${deferredQuery}|${JSON.stringify(filters)}|${craft}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (prevFilterSignature !== filterSignature) {
    setPrevFilterSignature(filterSignature);
    setVisibleCount(PAGE_SIZE);
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= filtered.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, visibleCount]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  function resetFilters() {
    setFilters([]);
    setCraft("all");
    setQuery("");
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          PokéSnacks · Academy
        </h1>
        <p className="text-sm text-muted-foreground">
          Recommandations de Campfire Pot pour les {POKESNACK_ENTRIES_FILTERED.length} Pokémon
          disponibles sur le serveur Cobblemon Academy. Recherche un Pokémon,
          filtre par type, biome, rareté ou catégorie (paradox, ultra-chimère, fossile…).
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="size-3 text-emerald-500" />
          Spawns et effets d&apos;assaisonnement officiels (sources :
          serveur Academy + mod Cobblemon). Logique de recette « inférée »
          à partir des règles connues.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {/* Search + filters + reset */}
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-0 flex-1 sm:max-w-md">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher un Pokémon (Pikachu, Bulbasaur, mewtwo…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>

          <PokesnacksFiltersBar
            filters={filters}
            onChange={setFilters}
            options={{
              type: TYPE_FILTER_OPTIONS,
              rarity: RARITY_FILTER_OPTIONS,
              category: CATEGORY_FILTER_OPTIONS,
              biome: BIOME_OPTIONS_STATIC,
            }}
          />
        </div>

        {/* Craft availability tabs */}
        <Tabs value={craft} onValueChange={(v) => v && setCraft(v as CraftFilter)}>
          <TabsList>
            {CRAFT_OPTIONS.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{filtered.length}</strong>{" "}
          Pokémon
          {filters.length > 0 || query || craft !== "all" ? " correspondant" : ""} sur {POKESNACK_ENTRIES_FILTERED.length}.
        </p>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun Pokémon ne correspond</EmptyTitle>
            <EmptyDescription>
              Essaie d&apos;élargir les filtres ou de réinitialiser.
            </EmptyDescription>
          </EmptyHeader>
          {(filters.length > 0 || query || craft !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" /> Tout réinitialiser
            </button>
          )}
        </Empty>
      ) : (
        <>
          <div
            className={cn(
              // `auto-rows-fr` + `items-stretch` (default) makes every
              // row's track the same height so cards align even when
              // notes / biome lists differ. The card itself uses
              // `h-full` so it fills the track. Without this, mons
              // with weather notes ended up taller than their row
              // neighbours and broke the grid rhythm.
              "grid auto-rows-fr gap-4 transition-opacity lg:grid-cols-2",
              isStale && "opacity-60",
            )}
          >
            {visible.map((e) => (
              <PokemonSnackCard key={e.slug} entry={e} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Chargement de {Math.min(PAGE_SIZE, filtered.length - visibleCount)} Pokémon supplémentaires…
            </div>
          )}
        </>
      )}
    </div>
  );
}

function matchFilterSet(
  e: PokesnackEntry,
  kind: PokesnackFilter["kind"],
  set: Set<string>,
): boolean {
  switch (kind) {
    case "type":
      for (const t of e.types) if (set.has(t)) return true;
      return false;
    case "rarity":
      return set.has(e.spawn.rarity);
    case "category":
      return set.has(e.category);
    case "biome":
      for (const b of e.spawn.biomes) if (set.has(b)) return true;
      return false;
  }
}

// ─── Pokémon snack card ─────────────────────────────────────────

function PokemonSnackCard({ entry }: { entry: PokesnackEntry }) {
  const [activeRecipe, setActiveRecipe] = useState<keyof PokesnackEntry["recommendedSnacks"]>("bestGeneral");
  const recipe = entry.recommendedSnacks[activeRecipe];
  const pokemon = POKEMON_BY_ID[entry.slug];
  const categoryMeta = CATEGORY_OPTIONS.find((c) => c.id === entry.category);
  const Icon = categoryMeta?.icon;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-start gap-3">
          {pokemon && (
            <Link
              href={`/pokedex/${entry.slug}`}
              className="grid size-12 shrink-0 place-items-center rounded-md bg-muted/40"
            >
              <PokemonSprite pokemon={pokemon} size="size-12" />
            </Link>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <CardTitle className="text-base leading-tight">
                {entry.name.fr}
              </CardTitle>
              {entry.name.en !== entry.name.fr && (
                <span className="text-xs italic text-muted-foreground">
                  {entry.name.en}
                </span>
              )}
              {entry.nationalDex && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{entry.nationalDex.toString().padStart(4, "0")}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Dedupe — Academy occasionally exposes a mon whose
                  primary and secondary types are the same (data
                  glitch). Without `Array.from(new Set)` React warns
                  about duplicate keys. */}
              {Array.from(new Set(entry.types)).map((t) => (
                <TypeBadge key={t} type={t as PokemonTypeId} size="sm" />
              ))}
              {categoryMeta && (
                <Badge variant="outline" className={cn("gap-1 text-[10px]", categoryMeta.tone)}>
                  {Icon && <Icon className="size-3" />}
                  {categoryMeta.label}
                </Badge>
              )}
              {entry.spawn.rarity !== "unknown" && (
                <span
                  className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide"
                  style={{
                    backgroundColor: `${RARITY_COLOR[entry.spawn.rarity]}26`,
                    borderColor: `${RARITY_COLOR[entry.spawn.rarity]}66`,
                    color: RARITY_COLOR[entry.spawn.rarity],
                  }}
                >
                  {RARITY_LABEL[entry.spawn.rarity]}
                </span>
              )}
            </div>
          </div>
        </div>
        {entry.spawn.biomes.length > 0 && (() => {
          const vanilla = getVanillaBiomes(entry.spawn.biomes);
          // Fall back to the abstract Cobblemon tag labels only when no
          // vanilla biome resolves (e.g. modded-only tag) — otherwise
          // the player sees actionable F3-style biome names.
          if (vanilla.length === 0) {
            return (
              <CardDescription className="mt-2">
                Catégorie de biomes :{" "}
                <strong className="text-foreground">
                  {entry.spawn.biomesFr.slice(0, 4).map(humanizeBiome).join(", ")}
                </strong>
                {entry.spawn.biomes.length > 4 && ` (+${entry.spawn.biomes.length - 4})`}
                <span className="ml-1 text-[10px] italic text-muted-foreground/70">
                  (biomes modés uniquement)
                </span>
              </CardDescription>
            );
          }
          return (
            <CardDescription className="mt-2 flex flex-col gap-0.5">
              <span>
                Biomes Minecraft :{" "}
                <strong className="text-foreground">
                  {vanilla.slice(0, 6).map(minecraftBiomeLabel).join(", ")}
                </strong>
                {vanilla.length > 6 && ` (+${vanilla.length - 6})`}
              </span>
              <span
                className="font-mono text-[10px] text-muted-foreground/70"
                title={vanilla.join(", ")}
              >
                {vanilla.slice(0, 6).join(", ")}
                {vanilla.length > 6 && ` …`}
              </span>
            </CardDescription>
          );
        })()}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Recipe tabs */}
        <Tabs value={activeRecipe} onValueChange={(v) => v && setActiveRecipe(v as typeof activeRecipe)}>
          <TabsList>
            {RECIPE_TABS.map((t) => {
              const Tabicon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id}>
                  <Tabicon className="size-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Recipe content */}
        <RecipeBlock recipe={recipe} />

        {/* Notes & conditions */}
        {entry.targeting.notes.length > 0 && (
          <div className="rounded-md border bg-amber-500/5 p-2 text-[11px]">
            <p className="mb-1 inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300">
              <AlertCircle className="size-3" />
              Conditions de spawn
            </p>
            <ul className="ml-3 list-disc text-muted-foreground">
              {entry.targeting.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence footer — `mt-auto` pins it to the bottom of
            the card so every card's confidence row sits on the same
            line regardless of whether the "Conditions de spawn"
            block is present. Without this the footer floats up
            against the recipe section on cards with no notes,
            breaking the grid rhythm. */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ConfidenceDot level={entry.confidence.pokemonData} />
            Données Pokémon
          </span>
          <span className="inline-flex items-center gap-1">
            <ConfidenceDot level={entry.confidence.spawnData} />
            Spawn
          </span>
          <span className="inline-flex items-center gap-1">
            <ConfidenceDot level={entry.confidence.seasoningEffects} />
            Effets seasoning
          </span>
          <span className="inline-flex items-center gap-1">
            <ConfidenceDot level={entry.confidence.snackLogic} />
            Recette
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const color =
    level === "official" ? "bg-emerald-500" :
    level === "inferred" || level === "community_or_inferred" ? "bg-amber-500" :
    "bg-zinc-500";
  return <span className={cn("size-1.5 rounded-full", color)} title={level} />;
}

function RecipeBlock({ recipe }: { recipe: SnackRecipe }) {
  // Build the base 3×3 (canonical PokéSnack pattern shared by every
  // Campfire Pot recipe) + seasonings = the recipe ingredients.
  const BASE: (string | null)[] = [
    "#c:drinks/milk",          "#c:drinks/milk",         "#c:drinks/milk",
    "minecraft:honey_bottle",  "cobblemon:vivichoke",    "minecraft:honey_bottle",
    "cobblemon:hearty_grains", "cobblemon:hearty_grains","cobblemon:hearty_grains",
  ];
  const seasonings = recipe.ingredients.map((id) =>
    id ? { item: id, label: getSeasoning(id)?.name.fr ?? itemMeta(id).label } : null,
  );
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">{recipe.label}.</strong> {recipe.reason}
      </p>
      <div className="-mx-3 overflow-x-auto px-3 py-1">
        <MinecraftCraftingTable
          grid={BASE}
          seasonings={seasonings}
          result="cobblemon:poke_snack"
          resultLabel="Poké Snack"
          className="min-w-fit"
        />
      </div>
      {/* Per-seasoning effect breakdown. One row per non-empty slot,
          listing exactly what the seasoning contributes to the
          spawn / shiny / bite-rate / nature effects of the snack so
          the player can read the recipe without cross-referencing
          the seasoning wiki. */}
      <SeasoningEffects ingredients={recipe.ingredients} />
    </div>
  );
}

function SeasoningEffects({ ingredients }: { ingredients: (string | null)[] }) {
  const filled = ingredients
    .map((id, idx) => ({ id, idx }))
    .filter((s): s is { id: string; idx: number } => Boolean(s.id));
  if (filled.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-2 text-[11px]">
      {filled.map(({ id, idx }) => {
        const seasoning = getSeasoning(id);
        const label = seasoning?.name.fr ?? itemMeta(id).label;
        const effects = seasoning ? formatSeasoningEffects(seasoning) : [];
        return (
          <div
            // Same id can show up in multiple slots (a recipe with two
            // identical berries) — key on slot index so React keeps
            // them straight.
            key={`${id}-${idx}`}
            className="flex flex-wrap items-center gap-1.5"
          >
            <ArrowRight className="size-3 shrink-0 opacity-50" />
            {/* Inline seasoning sprite between the arrow and the
                FR label — same artwork the recipe slot above uses,
                so the player can match the icon to the slot at a
                glance instead of reading the name. */}
            <ItemIcon item={id} size="size-4" />
            <span className="font-medium text-foreground">{label}</span>
            {effects.length > 0 ? (
              <span className="flex flex-wrap gap-1 text-muted-foreground">
                {effects.map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded bg-background px-1.5 py-0.5"
                  >
                    {e}
                  </span>
                ))}
              </span>
            ) : (
              <span className="italic text-muted-foreground/70">
                aucun effet listé
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
