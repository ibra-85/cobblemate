"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, X, MapPin, Plus, Filter as FilterIcon,
  RotateCcw, Sparkles, Mountain, Users, Star, Crown,
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
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  itemMeta,
} from "@/components/site/minecraft-item";
import {
  POKESNACK_ENTRIES,
  getSeasoning,
  type PokesnackEntry,
  type SnackRecipe,
} from "@/data/pokesnack-academy";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import {
  BIOME_LABELS_FR,
  MINECRAFT_BIOME_FR,
  biomeLabel,
} from "@/data/biomes";
import { cn } from "@/lib/utils";
import type { PokemonTypeId } from "@/types";

// ─── Constants ──────────────────────────────────────────────────

const TYPE_OPTIONS: PokemonTypeId[] = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark",
  "steel","fairy",
];

const CATEGORY_OPTIONS: { id: PokesnackEntry["category"]; label: string; icon: typeof Star; tone: string; color: string }[] = [
  { id: "starter",     label: "Starter",         icon: Star,     tone: "text-emerald-600 dark:text-emerald-300", color: "#10b981" },
  { id: "legendary",   label: "Légendaire",      icon: Crown,    tone: "text-amber-600 dark:text-amber-300",     color: "#f59e0b" },
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
  { id: "all",    label: "Tous les Pokémon" },
  { id: "spawn",  label: "Avec spawn naturel" },
  { id: "elite",  label: "Légendaires + Paradox + UB" },
] as const;
type CraftFilter = (typeof CRAFT_OPTIONS)[number]["id"];

const ELITE_CATEGORIES = new Set(["legendary", "mythical", "paradox", "ultra_beast"]);

// ─── Biome label helper (reused from previous version) ─────────

function humanizeBiome(id: string): string {
  if (BIOME_LABELS_FR[id]) return BIOME_LABELS_FR[id];
  const mc = `minecraft:${id}`;
  if (MINECRAFT_BIOME_FR[mc]) return MINECRAFT_BIOME_FR[mc];
  const tag = `is_${id}`;
  if (BIOME_LABELS_FR[tag]) return BIOME_LABELS_FR[tag];
  return biomeLabel(id);
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

// Pre-built search index. Built once at module load, NOT on every
// keystroke — with 1303 Pokémon, re-computing the haystack on every
// keypress was the dominant cost (~30ms × 1303 entries on slower
// devices). The haystack collapses every searchable field into one
// pre-lowercased string so the filter loop is a flat `String.includes`.
interface IndexedEntry {
  entry: PokesnackEntry;
  haystack: string;
}
const SEARCH_INDEX: IndexedEntry[] = POKESNACK_ENTRIES.map((e) => ({
  entry: e,
  haystack: `${e.slug} ${e.name.en} ${e.name.fr} ${e.types.join(" ")} ${e.nationalDex ?? ""}`.toLowerCase(),
}));

// Pre-build the biome facet list once — it never changes.
const BIOME_OPTIONS_STATIC = (() => {
  const set = new Set<string>();
  for (const e of POKESNACK_ENTRIES) for (const b of e.spawn.biomes) set.add(b);
  return [...set]
    .map((b) => ({ id: b, label: humanizeBiome(b) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
})();

export default function PokeSnacksPage() {
  const [query, setQuery] = useState("");
  const [craft, setCraft] = useState<CraftFilter>("all");
  const [activeTypes, setActiveTypes] = useState<Set<PokemonTypeId>>(new Set());
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeBiomes, setActiveBiomes] = useState<Set<string>>(new Set());

  // React-19 native debounce — the input updates `query` immediately
  // so typing never feels laggy; `deferredQuery` lags by one render
  // and feeds the (heavier) 1303-entry filter pipeline. While the two
  // diverge we fade the list to signal "computing".
  const deferredQuery = useDeferredValue(query);
  const isStale = deferredQuery !== query;

  const biomeOptions = BIOME_OPTIONS_STATIC;

  // Main filter pipeline — runs against the pre-built index using
  // the deferred query. Single pass, no per-entry work that can't
  // be hoisted.
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const out: PokesnackEntry[] = [];
    for (const { entry: e, haystack } of SEARCH_INDEX) {
      if (q && !haystack.includes(q)) continue;
      if (activeTypes.size > 0 && !e.types.some((t) => activeTypes.has(t as PokemonTypeId)))
        continue;
      if (activeRarities.size > 0 && !activeRarities.has(e.spawn.rarity)) continue;
      if (activeCategories.size > 0 && !activeCategories.has(e.category)) continue;
      if (activeBiomes.size > 0 && !e.spawn.biomes.some((b) => activeBiomes.has(b)))
        continue;
      if (craft === "spawn" && e.spawn.biomes.length === 0) continue;
      if (craft === "elite" && !ELITE_CATEGORIES.has(e.category)) continue;
      out.push(e);
    }
    return out;
  }, [deferredQuery, craft, activeTypes, activeRarities, activeCategories, activeBiomes]);

  const activeFilterCount =
    activeTypes.size + activeRarities.size + activeCategories.size + activeBiomes.size;

  function toggle<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function resetFilters() {
    setActiveTypes(new Set());
    setActiveRarities(new Set());
    setActiveCategories(new Set());
    setActiveBiomes(new Set());
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
          Recommandations de Campfire Pot pour les {POKESNACK_ENTRIES.length} Pokémon
          disponibles sur le serveur Cobblemon Academy. Recherche un Pokémon,
          filtre par type, biome, rareté ou catégorie (légendaire, paradox,
          ultra-chimère…).
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="size-3 text-emerald-500" />
          Spawns et effets d&apos;assaisonnement officiels (sources :
          serveur Academy + mod Cobblemon). Logique de recette « inférée »
          à partir des règles connues.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {/* Search + add-filter + reset */}
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

          <AddFilterButton
            hasFilters={activeFilterCount > 0}
            typeOptions={TYPE_OPTIONS.map((t) => ({
              id: t,
              label: FR_TYPE_LABEL[t],
              color: TYPES_META[t]?.color,
            }))}
            rarityOptions={RARITY_OPTIONS.map((r) => ({
              id: r,
              label: RARITY_LABEL[r],
              color: RARITY_COLOR[r],
            }))}
            categoryOptions={CATEGORY_OPTIONS.map((c) => ({ id: c.id, label: c.label, color: c.color }))}
            biomeOptions={biomeOptions}
            onToggleType={(v) => toggle(activeTypes, v as PokemonTypeId, setActiveTypes)}
            onToggleRarity={(v) => toggle(activeRarities, v, setActiveRarities)}
            onToggleCategory={(v) => toggle(activeCategories, v, setActiveCategories)}
            onToggleBiome={(v) => toggle(activeBiomes, v, setActiveBiomes)}
            isTypeActive={(v) => activeTypes.has(v as PokemonTypeId)}
            isRarityActive={(v) => activeRarities.has(v)}
            isCategoryActive={(v) => activeCategories.has(v)}
            isBiomeActive={(v) => activeBiomes.has(v)}
          />

          {(activeFilterCount > 0 || query || craft !== "all") && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
              <RotateCcw className="size-3.5" /> Vider
            </Button>
          )}
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

        {activeFilterCount > 0 && (
          <ActiveChips
            types={activeTypes}
            rarities={activeRarities}
            categories={activeCategories}
            biomes={activeBiomes}
            onRemoveType={(v) => toggle(activeTypes, v, setActiveTypes)}
            onRemoveRarity={(v) => toggle(activeRarities, v, setActiveRarities)}
            onRemoveCategory={(v) => toggle(activeCategories, v, setActiveCategories)}
            onRemoveBiome={(v) => toggle(activeBiomes, v, setActiveBiomes)}
          />
        )}

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{filtered.length}</strong>{" "}
          Pokémon
          {activeFilterCount > 0 || query || craft !== "all" ? " correspondant" : ""} sur {POKESNACK_ENTRIES.length}.
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
        </Empty>
      ) : (
        <div
          className={cn(
            "grid auto-rows-min items-start gap-4 transition-opacity lg:grid-cols-2",
            isStale && "opacity-60",
          )}
        >
          {filtered.slice(0, 60).map((e) => (
            <PokemonSnackCard key={e.slug} entry={e} />
          ))}
        </div>
      )}

      {filtered.length > 60 && (
        <p className="text-center text-xs text-muted-foreground">
          Seuls les 60 premiers résultats sont affichés. Affine la recherche
          ou ajoute des filtres pour voir un mon précis.
        </p>
      )}
    </div>
  );
}

// ─── Pokémon snack card ─────────────────────────────────────────

function PokemonSnackCard({ entry }: { entry: PokesnackEntry }) {
  const [activeRecipe, setActiveRecipe] = useState<keyof PokesnackEntry["recommendedSnacks"]>("bestGeneral");
  const recipe = entry.recommendedSnacks[activeRecipe];
  const pokemon = POKEMON_BY_ID[entry.slug];
  const categoryMeta = CATEGORY_OPTIONS.find((c) => c.id === entry.category);
  const Icon = categoryMeta?.icon;

  return (
    <Card className="overflow-hidden">
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
        <CardDescription className="mt-2">
          {entry.spawn.biomes.length > 0 ? (
            <span>
              Trouvable dans :{" "}
              <strong className="text-foreground">
                {entry.spawn.biomesFr.slice(0, 4).map(humanizeBiome).join(", ")}
              </strong>
              {entry.spawn.biomes.length > 4 && ` (+${entry.spawn.biomes.length - 4})`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
              <AlertCircle className="size-3" />
              Aucun spawn naturel — probablement événementiel, drop ou interaction spéciale.
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
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

        {/* Confidence footer */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-[10px] text-muted-foreground">
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
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {/* Slot index in the key — same berry can legitimately
            appear twice in a recipe (e.g. double Wacan in
            shock-cracker) and React needs a unique key per slot. */}
        {recipe.ingredients.map((id, idx) =>
          id ? (
            <span
              key={`${id}-${idx}`}
              className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5"
            >
              <ArrowRight className="size-3 opacity-50" />
              {getSeasoning(id)?.name.fr ?? itemMeta(id).label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ─── Active filter chips ────────────────────────────────────────

function ActiveChips({
  types, rarities, categories, biomes,
  onRemoveType, onRemoveRarity, onRemoveCategory, onRemoveBiome,
}: {
  types: Set<PokemonTypeId>;
  rarities: Set<string>;
  categories: Set<string>;
  biomes: Set<string>;
  onRemoveType: (v: PokemonTypeId) => void;
  onRemoveRarity: (v: string) => void;
  onRemoveCategory: (v: string) => void;
  onRemoveBiome: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[...types].map((t) => (
        <Chip key={`t-${t}`} onRemove={() => onRemoveType(t)}>
          <TypeBadge type={t} size="sm" />
        </Chip>
      ))}
      {[...rarities].map((r) => (
        <Chip key={`r-${r}`} onRemove={() => onRemoveRarity(r)}>
          <span
            className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide"
            style={{
              backgroundColor: `${RARITY_COLOR[r]}26`,
              borderColor: `${RARITY_COLOR[r]}66`,
              color: RARITY_COLOR[r],
            }}
          >
            {RARITY_LABEL[r]}
          </span>
        </Chip>
      ))}
      {[...categories].map((c) => {
        const meta = CATEGORY_OPTIONS.find((x) => x.id === c);
        return (
          <Chip key={`c-${c}`} onRemove={() => onRemoveCategory(c)}>
            <span className={cn("inline-flex items-center gap-1 text-xs", meta?.tone)}>
              {meta?.icon && <meta.icon className="size-3" />}
              {meta?.label ?? c}
            </span>
          </Chip>
        );
      })}
      {[...biomes].map((b) => (
        <Chip key={`b-${b}`} onRemove={() => onRemoveBiome(b)}>
          <span className="inline-flex items-center gap-1 text-xs">
            <MapPin className="size-3" /> {humanizeBiome(b)}
          </span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pl-1.5 pr-1 text-xs">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Retirer"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

// ─── Add-filter button (4 kinds + sub-menus with search) ────────

interface FilterMenuOption {
  id: string;
  label: string;
  color?: string;
}

function AddFilterButton({
  hasFilters,
  typeOptions, rarityOptions, categoryOptions, biomeOptions: biomeOpts,
  onToggleType, onToggleRarity, onToggleCategory, onToggleBiome,
  isTypeActive, isRarityActive, isCategoryActive, isBiomeActive,
}: {
  hasFilters: boolean;
  typeOptions: FilterMenuOption[];
  rarityOptions: FilterMenuOption[];
  categoryOptions: FilterMenuOption[];
  biomeOptions: FilterMenuOption[];
  onToggleType: (v: string) => void;
  onToggleRarity: (v: string) => void;
  onToggleCategory: (v: string) => void;
  onToggleBiome: (v: string) => void;
  isTypeActive: (v: string) => boolean;
  isRarityActive: (v: string) => boolean;
  isCategoryActive: (v: string) => boolean;
  isBiomeActive: (v: string) => boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={hasFilters ? "ghost" : "outline"}
            size="sm"
            className="border-dashed"
          >
            {hasFilters ? <><Plus className="size-3.5" /> Filtre</> : <><FilterIcon className="size-3.5" /> Filtres</>}
          </Button>
        }
      />
      <DropdownMenuContent className="w-52" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Catégorie</DropdownMenuLabel>
          <FilterSubmenu label="Type Pokémon" icon={Sparkles} options={typeOptions} onToggle={onToggleType} isActive={isTypeActive} />
          <FilterSubmenu label="Rareté" icon={FilterIcon} options={rarityOptions} onToggle={onToggleRarity} isActive={isRarityActive} />
          <FilterSubmenu label="Statut" icon={Crown} options={categoryOptions} onToggle={onToggleCategory} isActive={isCategoryActive} />
          {biomeOpts.length > 0 && (
            <FilterSubmenu label="Biome" icon={Mountain} options={biomeOpts} onToggle={onToggleBiome} isActive={isBiomeActive} />
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterSubmenu({
  label, icon: Icon, options, onToggle, isActive,
}: {
  label: string;
  icon: typeof FilterIcon;
  options: FilterMenuOption[];
  onToggle: (id: string) => void;
  isActive: (id: string) => boolean;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon className="text-muted-foreground" />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="min-w-44">
          {options.length > 15 ? (
            <SearchableValueList
              options={options}
              isActive={isActive}
              onToggle={onToggle}
              placeholder={`Filtrer ${label.toLowerCase()}…`}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {options.map((o) => (
                <DropdownMenuCheckboxItem
                  key={o.id}
                  checked={isActive(o.id)}
                  onCheckedChange={() => onToggle(o.id)}
                  closeOnClick={false}
                >
                  {o.color && (
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                  )}
                  {o.label}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

function SearchableValueList({
  options, isActive, onToggle, placeholder,
}: {
  options: FilterMenuOption[];
  isActive: (id: string) => boolean;
  onToggle: (id: string) => void;
  placeholder: string;
}) {
  return (
    <Command className="w-56">
      <CommandInput placeholder={placeholder} />
      <CommandList className="max-h-[260px]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup>
          {options.map((o) => {
            const checked = isActive(o.id);
            return (
              <CommandItem key={o.id} value={o.label} onSelect={() => onToggle(o.id)}>
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-sm border",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {checked && <Sparkles className="size-3" />}
                </span>
                {o.color && (
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                )}
                <span className="truncate">{o.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
