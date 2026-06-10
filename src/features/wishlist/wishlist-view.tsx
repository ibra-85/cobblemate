"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Search,
  X,
  Check,
  CircleDashed,
  ArrowRight,
  AlertCircle,
  ChefHat,
  Sparkles,
  Layers,
  Grid2x2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { WishlistButton } from "@/components/site/wishlist-button";
import { ItemIcon, itemMeta } from "@/components/site/minecraft-item";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCaught } from "@/hooks/use-caught";
import {
  POKESNACK_ENTRIES,
  getSeasoning,
  type PokesnackEntry,
} from "@/data/pokesnack-academy";
import { getSpeciesExtras, type EvYield } from "@/data/species-extras";
import {
  vanillaBiomesForTag,
  minecraftBiomeLabel,
} from "@/data/biomes";
import { foldDiacritics } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { Pokemon, PokemonTypeId } from "@/types";

// ─── Lookup tables ──────────────────────────────────────────────

const ACADEMY_BY_SLUG = new Map<string, PokesnackEntry>(
  POKESNACK_ENTRIES.map((e) => [e.slug, e]),
);

const TYPE_LABEL: Record<PokemonTypeId, string> = {
  normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik",
  grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison",
  ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte",
  rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres",
  steel: "Acier", fairy: "Fée",
};

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

const STAT_FR: Record<keyof EvYield, string> = {
  hp: "PV",
  attack: "Atk",
  defence: "Déf",
  special_attack: "Atk. Spé",
  special_defence: "Déf. Spé",
  speed: "Vit.",
};

type StatusFilter = "all" | "uncaught" | "caught";
type ViewMode = "cards" | "byBiome";
type SortKey = "dex" | "name" | "rarity" | "status";

const SORT_LABEL: Record<SortKey, string> = {
  dex:    "Dex national",
  name:   "Nom (A→Z)",
  rarity: "Rareté (rare→commun)",
  status: "Statut (restants)",
};

// ─── View ───────────────────────────────────────────────────────

export function WishlistView() {
  const { ids, hydrated, clear } = useWishlist();
  const caught = useCaught();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("uncaught");
  const [typeFilter, setTypeFilter] = useState<PokemonTypeId | "all">("all");
  const [sort, setSort] = useState<SortKey>("dex");
  const [view, setView] = useState<ViewMode>("cards");

  const deferredQuery = useDeferredValue(query);

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const allItems: Pokemon[] = ids
    .map((id) => POKEMON_BY_ID[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (allItems.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Aucun Pokémon dans la wishlist</EmptyTitle>
          <EmptyDescription>
            Ouvre n&apos;importe quelle fiche Pokémon et clique sur « Ajouter à la wishlist ».
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <WishlistContent
    allItems={allItems}
    clear={clear}
    caught={caught}
    query={query}
    deferredQuery={deferredQuery}
    setQuery={setQuery}
    status={status}
    setStatus={setStatus}
    typeFilter={typeFilter}
    setTypeFilter={setTypeFilter}
    sort={sort}
    setSort={setSort}
    view={view}
    setView={setView}
  />;
}

// Split out so the hook order in `WishlistView` stays stable (the
// early `if (!hydrated)` would otherwise hop over the useMemo below).
interface ContentProps {
  allItems: Pokemon[];
  clear: () => void;
  caught: ReturnType<typeof useCaught>;
  query: string;
  deferredQuery: string;
  setQuery: (q: string) => void;
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  typeFilter: PokemonTypeId | "all";
  setTypeFilter: (t: PokemonTypeId | "all") => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
}

function WishlistContent({
  allItems, clear, caught,
  query, deferredQuery, setQuery,
  status, setStatus,
  typeFilter, setTypeFilter,
  sort, setSort,
  view, setView,
}: ContentProps) {
  const totalCount = allItems.length;
  const caughtCount = allItems.filter((p) => caught.has(p.id)).length;

  const filtered = useMemo(() => {
    const q = foldDiacritics(deferredQuery.trim());
    const list = allItems.filter((p) => {
      if (status === "caught" && !caught.has(p.id)) return false;
      if (status === "uncaught" && caught.has(p.id)) return false;
      if (typeFilter !== "all" && !p.types.includes(typeFilter)) return false;
      if (q) {
        const ac = ACADEMY_BY_SLUG.get(p.id);
        const hay = foldDiacritics(
          `${p.name} ${p.id} ${ac?.name.en ?? ""} ${ac?.name.fr ?? ""}`,
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Sort
    const RARITY_ORDER: Record<string, number> = {
      common: 0, uncommon: 1, rare: 2, "ultra-rare": 3, unknown: -1,
    };
    list.sort((a, b) => {
      switch (sort) {
        case "name":   return a.name.localeCompare(b.name, "fr");
        case "rarity": {
          const ra = RARITY_ORDER[ACADEMY_BY_SLUG.get(a.id)?.spawn.rarity ?? "unknown"] ?? -1;
          const rb = RARITY_ORDER[ACADEMY_BY_SLUG.get(b.id)?.spawn.rarity ?? "unknown"] ?? -1;
          return rb - ra; // rarest first
        }
        case "status": {
          const ca = caught.has(a.id) ? 1 : 0;
          const cb = caught.has(b.id) ? 1 : 0;
          if (ca !== cb) return ca - cb; // uncaught first
          return a.dexNumber - b.dexNumber;
        }
        case "dex":
        default:
          return a.dexNumber - b.dexNumber;
      }
    });
    return list;
  }, [allItems, caught, deferredQuery, status, typeFilter, sort]);

  const isFiltering = query || status !== "uncaught" || typeFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-3 text-sm">
          <span>
            <strong className="text-foreground">{totalCount}</strong>{" "}
            <span className="text-muted-foreground">Pokémon</span>
          </span>
          <span className="text-emerald-600 dark:text-emerald-300">
            <Check className="inline size-3.5" /> {caughtCount} capturés
          </span>
          <span className="text-amber-600 dark:text-amber-300">
            <CircleDashed className="inline size-3.5" /> {totalCount - caughtCount} restants
          </span>
          {/* Progress bar */}
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(caughtCount / Math.max(1, totalCount)) * 100}%` }}
            />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={clear}>
          <Trash2 className="size-3.5" />
          Vider la wishlist
        </Button>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-0 flex-1 sm:max-w-sm">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Filtrer la wishlist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PokemonTypeId | "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tous types">
              {(value: string) =>
                value === "all"
                  ? "Tous types"
                  : TYPE_LABEL[value as PokemonTypeId] ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {(Object.entries(TYPE_LABEL) as [PokemonTypeId, string][]).map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tri">
              {(value: string) => SORT_LABEL[value as SortKey] ?? "Tri"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dex">Dex national</SelectItem>
            <SelectItem value="name">Nom (A→Z)</SelectItem>
            <SelectItem value="rarity">Rareté (rare→commun)</SelectItem>
            <SelectItem value="status">Statut (restants d&apos;abord)</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={view} onValueChange={(v) => v && setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="cards" title="Vue cartes">
              <Grid2x2 className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="byBiome" title="Groupé par biome">
              <Layers className="size-3.5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status tabs */}
      <Tabs value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">Tous ({totalCount})</TabsTrigger>
          <TabsTrigger value="uncaught">Restants ({totalCount - caughtCount})</TabsTrigger>
          <TabsTrigger value="caught">Capturés ({caughtCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Result count */}
      {isFiltering && (
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{filtered.length}</strong> Pokémon correspondant.
          {filtered.length !== totalCount && (
            <button
              type="button"
              onClick={() => { setQuery(""); setStatus("all"); setTypeFilter("all"); }}
              className="ml-2 inline-flex items-center gap-1 hover:text-foreground"
            >
              <X className="size-3" /> réinitialiser
            </button>
          )}
        </p>
      )}

      {/* Body */}
      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun résultat</EmptyTitle>
            <EmptyDescription>Essaie d&apos;élargir les filtres.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === "byBiome" ? (
        <BiomeGroupedView items={filtered} caught={caught} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((p) => (
            <WishlistCard
              key={p.id}
              pokemon={p}
              caught={caught.has(p.id)}
              onToggleCaught={() => caught.toggle(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single card ────────────────────────────────────────────────

function WishlistCard({
  pokemon,
  caught,
  onToggleCaught,
}: {
  pokemon: Pokemon;
  caught: boolean;
  onToggleCaught: () => void;
}) {
  const academy = ACADEMY_BY_SLUG.get(pokemon.id);
  const extras = getSpeciesExtras(pokemon.id);
  const vanilla = academy ? expandToVanilla(academy.spawn.biomes) : [];
  const evList = extras?.evYield
    ? (Object.entries(extras.evYield) as [keyof EvYield, number][])
        .filter(([, v]) => v > 0)
    : [];
  const recipe = academy?.recommendedSnacks.bestGeneral;
  const rarity = academy?.spawn.rarity ?? "unknown";

  return (
    <Card className={cn(
      // Captured state: full-luminance card, but a left-edge accent
      // bar in emerald and a soft tinted surface signal it cleanly
      // without dimming the content (the user's complaint with the
      // previous opacity treatment).
      "relative flex h-full flex-col overflow-hidden",
      caught && "border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-400/[0.05]",
    )}>
      {caught && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-emerald-500"
        />
      )}
      <CardHeader>
        <div className="flex items-start gap-3">
          <Link
            href={`/pokedex/${pokemon.id}`}
            className="relative grid size-14 shrink-0 place-items-center rounded-md border bg-muted p-1"
          >
            <PokemonSprite pokemon={pokemon} />
            {caught && (
              <span
                className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-background"
                title="Capturé"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle className="text-base">
              <Link
                href={`/pokedex/${pokemon.id}`}
                className={cn(
                  "hover:underline",
                  caught && "text-emerald-700 dark:text-emerald-300",
                )}
              >
                {pokemon.name}
              </Link>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>#{String(pokemon.dexNumber).padStart(4, "0")} · Gen {pokemon.generation}</span>
              {rarity !== "unknown" && (
                <span
                  className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide"
                  style={{
                    backgroundColor: `${RARITY_COLOR[rarity]}26`,
                    borderColor: `${RARITY_COLOR[rarity]}66`,
                    color: RARITY_COLOR[rarity],
                  }}
                >
                  {RARITY_LABEL[rarity]}
                </span>
              )}
            </CardDescription>
            <TypeBadges types={pokemon.types} size="sm" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="sm"
              variant={caught ? "default" : "outline"}
              onClick={onToggleCaught}
              className={cn(
                "h-7 gap-1 text-xs",
                caught && "bg-emerald-500/90 hover:bg-emerald-600 text-white",
              )}
            >
              {caught ? <Check className="size-3.5" /> : <CircleDashed className="size-3.5" />}
              {caught ? "Capturé" : "À capturer"}
            </Button>
            <WishlistButton
              pokemonId={pokemon.id}
              pokemonName={pokemon.name}
              size="icon"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        {/* Where to find */}
        {vanilla.length > 0 ? (
          <Section title="Où le trouver">
            <p className="text-xs">
              <strong className="text-foreground">
                {vanilla.slice(0, 5).map(minecraftBiomeLabel).join(", ")}
              </strong>
              {vanilla.length > 5 && (
                <span className="text-muted-foreground">
                  {" "}(+{vanilla.length - 5})
                </span>
              )}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              {vanilla.slice(0, 5).join(", ")}
              {vanilla.length > 5 && " …"}
            </p>
          </Section>
        ) : (
          <p className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
            <AlertCircle className="size-3" />
            Aucun spawn vanilla — évolution, événementiel ou biome modé.
          </p>
        )}

        {/* Recipe */}
        {recipe && (
          <Section title="Meilleur snack" icon={<ChefHat className="size-3" />}>
            <div className="flex flex-wrap items-center gap-1.5">
              {recipe.ingredients.map((ing, idx) =>
                ing ? (
                  <span
                    key={`${ing}-${idx}`}
                    className="inline-flex items-center gap-1 rounded border bg-muted/30 px-1.5 py-0.5 text-[11px]"
                  >
                    <ItemIcon item={ing} size="size-4" />
                    {labelFor(ing)}
                  </span>
                ) : null,
              )}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {recipe.reason}
            </p>
            <Link
              href={`/pokesnacks`}
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Voir toutes les variantes <ArrowRight className="size-3" />
            </Link>
          </Section>
        )}

        {/* EV yield */}
        {evList.length > 0 && (
          <Section title="EV yield" icon={<Sparkles className="size-3" />}>
            <div className="flex flex-wrap gap-1">
              {evList.map(([stat, value]) => (
                <Badge key={stat} variant="outline" className="text-[10px]">
                  +{value} {STAT_FR[stat]}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Spawn notes */}
        {academy?.targeting.notes && academy.targeting.notes.length > 0 && (
          <Section title="Conditions" icon={<AlertCircle className="size-3" />}>
            <ul className="ml-3 list-disc text-[11px] text-muted-foreground">
              {academy.targeting.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Biome-grouped view ─────────────────────────────────────────

function BiomeGroupedView({
  items,
  caught,
}: {
  items: Pokemon[];
  caught: ReturnType<typeof useCaught>;
}) {
  const groups = useMemo(() => {
    const byBiome = new Map<string, Pokemon[]>();
    const noBiome: Pokemon[] = [];
    for (const p of items) {
      const ac = ACADEMY_BY_SLUG.get(p.id);
      const vanilla = ac ? expandToVanilla(ac.spawn.biomes) : [];
      if (vanilla.length === 0) {
        noBiome.push(p);
        continue;
      }
      for (const biome of vanilla) {
        const list = byBiome.get(biome) ?? [];
        list.push(p);
        byBiome.set(biome, list);
      }
    }
    return {
      biomes: [...byBiome.entries()]
        .map(([id, mons]) => ({ id, label: minecraftBiomeLabel(id), mons }))
        .sort((a, b) => b.mons.length - a.mons.length),
      noBiome,
    };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      {groups.biomes.map(({ id, label, mons }) => (
        <Card key={id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-2 text-sm">
              {label}
              <Badge variant="secondary" className="font-mono text-[10px]">
                {mons.length}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground/70">{id}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {mons.map((p) => (
                <Link
                  key={p.id}
                  href={`/pokedex/${p.id}`}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40",
                    caught.has(p.id) && "border-emerald-500/40 bg-emerald-500/[0.05] dark:bg-emerald-400/[0.06]",
                  )}
                >
                  <div className="relative size-10 shrink-0">
                    <PokemonSprite pokemon={p} />
                    {caught.has(p.id) && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-background"
                        title="Capturé"
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        caught.has(p.id) && "text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {p.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{String(p.dexNumber).padStart(4, "0")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {groups.noBiome.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-2 text-sm">
              Sans biome vanilla
              <Badge variant="secondary" className="font-mono text-[10px]">
                {groups.noBiome.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Évolution, événementiel, ou biomes uniquement modés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {groups.noBiome.map((p) => (
                <Link
                  key={p.id}
                  href={`/pokedex/${p.id}`}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40",
                    caught.has(p.id) && "border-emerald-500/40 bg-emerald-500/[0.05] dark:bg-emerald-400/[0.06]",
                  )}
                >
                  <div className="relative size-10 shrink-0">
                    <PokemonSprite pokemon={p} />
                    {caught.has(p.id) && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-background"
                        title="Capturé"
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      caught.has(p.id) && "text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {p.name}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

/** Expand a mix of "#cobblemon:is_*" tags and "minecraft:*" ids into
 *  the deduped sorted list of vanilla MC biomes the player can pin
 *  down (modded biomes dropped). Same logic as /pokesnacks. */
function expandToVanilla(biomes: string[]): string[] {
  const set = new Set<string>();
  for (const raw of biomes) {
    if (raw.startsWith("minecraft:")) {
      set.add(raw);
      continue;
    }
    if (raw.startsWith("#")) {
      const key = raw.replace(/^#?\w+:/, "");
      for (const b of vanillaBiomesForTag(key)) set.add(b);
    }
  }
  return Array.from(set).sort((a, b) =>
    minecraftBiomeLabel(a).localeCompare(minecraftBiomeLabel(b), "fr"),
  );
}

function labelFor(id: string): string {
  return getSeasoning(id)?.name.fr ?? itemMeta(id).label;
}

