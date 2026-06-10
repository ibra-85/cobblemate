"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, X, MapPin, Clock, Fish, ArrowDownUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { VanillaBiomeList } from "@/components/site/vanilla-biome-list";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { SPAWNS_BY_BIOME, type SpawnAggregate } from "@/data/spawns";
import { biomeLabel } from "@/data/biomes";
import { cn } from "@/lib/utils";
import { foldDiacritics } from "@/lib/search";
import type { Pokemon, PokemonTypeId, Rarity } from "@/types";

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Commun", uncommon: "Peu commun", rare: "Rare", "ultra-rare": "Ultra rare",
};

const RARITY_TONE: Record<Rarity, string> = {
  common: "bg-zinc-500", uncommon: "bg-emerald-600",
  rare: "bg-blue-600", "ultra-rare": "bg-amber-700",
};

/** Rarest → most common; used for headline rarity + rarity sorting. */
const RARITY_ORDER: Rarity[] = ["ultra-rare", "rare", "uncommon", "common"];

type SortKey = "rarity" | "name" | "dex" | "level";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rarity", label: "Rareté (rare → commun)" },
  { value: "dex",    label: "N° de Pokédex" },
  { value: "name",   label: "Nom (A→Z)" },
  { value: "level",  label: "Niveau min" },
];

/** Headline rarity for a spawn aggregate — the rarest bucket present. */
function headlineRarity(s: SpawnAggregate): Rarity | undefined {
  return RARITY_ORDER.find((r) => s.rarities.includes(r));
}

interface BiomeOption {
  key: string;
  label: string;
  count: number;
}

/**
 * The biome tags worth listing: Cobblemon `is_*` category keys (same
 * filter as the per-Pokémon catching guide — raw `minecraft:foo` ids
 * and modded tags are grouped under their category by the spawn
 * build). Sorted by FR label for a scannable picker.
 */
function buildBiomeOptions(): BiomeOption[] {
  return Object.entries(SPAWNS_BY_BIOME)
    .filter(([key]) => /(^|\/)is_/.test(key) && !key.includes(":"))
    .map(([key, spawns]) => ({
      key,
      label: biomeLabel(key),
      count: spawns.length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

interface Row {
  spawn: SpawnAggregate;
  pokemon: Pokemon;
  rarity: Rarity | undefined;
  haystack: string;
}

interface Props {
  /** Pre-selected biome tag (deep link `/biomes?biome=is_jungle`). */
  initialBiome?: string;
}

/**
 * "Biomes" — reverse spawn explorer. The catching guide answers
 * "where does THIS Pokémon spawn?"; this page answers the in-game
 * question "I'm standing in a jungle, WHO can spawn here?". Left
 * pane picks a Cobblemon biome category, right pane lists every
 * Pokémon of that spawn pool with rarity / level / time-of-day,
 * searchable and sortable.
 */
export function BiomeExplorer({ initialBiome }: Props) {
  const options = useMemo(() => buildBiomeOptions(), []);

  const fallback = options.find((o) => o.key === "is_plains") ?? options[0];
  const [biome, setBiome] = useState<string>(() =>
    options.some((o) => o.key === initialBiome) && initialBiome
      ? initialBiome
      : fallback?.key ?? "",
  );
  const [biomeQuery, setBiomeQuery] = useState("");
  const [query, setQuery] = useState("");
  const [rarities, setRarities] = useState<Set<Rarity>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("rarity");
  const [sortDesc, setSortDesc] = useState(false);

  function selectBiome(key: string) {
    setBiome(key);
    setQuery("");
    setRarities(new Set());
    // Keep the URL shareable without a server round-trip — the page
    // reads `?biome=` back on first load.
    window.history.replaceState(null, "", `/biomes?biome=${key}`);
  }

  const visibleOptions = useMemo(() => {
    const q = foldDiacritics(biomeQuery.trim());
    if (!q) return options;
    return options.filter((o) => foldDiacritics(o.label).includes(q));
  }, [options, biomeQuery]);

  const rows = useMemo<Row[]>(() => {
    return (SPAWNS_BY_BIOME[biome] ?? [])
      .map((spawn) => {
        const pokemon = POKEMON_BY_ID[spawn.pokemonId];
        if (!pokemon) return null;
        return {
          spawn,
          pokemon,
          rarity: headlineRarity(spawn),
          haystack: foldDiacritics(`${pokemon.name} ${pokemon.id}`),
        };
      })
      .filter((r): r is Row => r !== null);
  }, [biome]);

  const filtered = useMemo(() => {
    const q = foldDiacritics(query.trim());
    const list = rows.filter((r) => {
      if (q && !r.haystack.includes(q)) return false;
      if (rarities.size > 0 && !(r.rarity && rarities.has(r.rarity))) return false;
      return true;
    });
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rarity": {
          const ai = a.rarity ? RARITY_ORDER.indexOf(a.rarity) : RARITY_ORDER.length;
          const bi = b.rarity ? RARITY_ORDER.indexOf(b.rarity) : RARITY_ORDER.length;
          cmp = ai - bi || a.pokemon.dexNumber - b.pokemon.dexNumber;
          break;
        }
        case "dex":
          cmp = a.pokemon.dexNumber - b.pokemon.dexNumber;
          break;
        case "name":
          cmp = a.pokemon.name.localeCompare(b.pokemon.name, "fr");
          break;
        case "level": {
          const al = a.spawn.levelRange?.[0] ?? Infinity;
          const bl = b.spawn.levelRange?.[0] ?? Infinity;
          cmp = al - bl || a.pokemon.dexNumber - b.pokemon.dexNumber;
          break;
        }
      }
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [rows, query, rarities, sortKey, sortDesc]);

  function toggleRarity(r: Rarity) {
    setRarities((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const current = options.find((o) => o.key === biome);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      {/* ─── Biome picker — list on desktop, select on mobile ──────── */}
      <aside className="lg:sticky lg:top-20 lg:w-64 lg:shrink-0">
        {/* Mobile: compact select. */}
        <div className="lg:hidden">
          <Select value={biome} onValueChange={(v) => v && selectBiome(v)}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Choisir un biome">
                {(value) =>
                  options.find((o) => o.key === value)?.label ?? "Choisir un biome"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label} ({o.count})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: searchable scrollable list. */}
        <div className="hidden flex-col gap-2 lg:flex">
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Filtrer les biomes…"
              value={biomeQuery}
              onChange={(e) => setBiomeQuery(e.target.value)}
            />
            {biomeQuery && (
              <InputGroupAddon
                className="cursor-pointer"
                onClick={() => setBiomeQuery("")}
              >
                <X className="size-4 opacity-60 hover:opacity-100" />
              </InputGroupAddon>
            )}
          </InputGroup>
          <nav className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto pr-1">
            {visibleOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => selectBiome(o.key)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  o.key === biome
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="flex-1 truncate">{o.label}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    o.key === biome
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground/70",
                  )}
                >
                  {o.count}
                </span>
              </button>
            ))}
            {visibleOptions.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                Aucun biome ne correspond.
              </p>
            )}
          </nav>
        </div>
      </aside>

      {/* ─── Selected biome content ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {current?.label ?? biomeLabel(biome)}
            </h2>
            <span className="text-sm text-muted-foreground">
              {rows.length} Pokémon dans ce pool de spawn
            </span>
          </div>
          <VanillaBiomeList biome={biome} />
        </div>

        {/* Toolbar: search + rarity toggles + sort. */}
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-[12rem] flex-1 sm:max-w-xs">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher un Pokémon…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <InputGroupAddon
                className="cursor-pointer"
                onClick={() => setQuery("")}
              >
                <X className="size-4 opacity-60 hover:opacity-100" />
              </InputGroupAddon>
            )}
          </InputGroup>

          {/* Multi-select rarity dropdown — checkbox items stay open
              on click so several buckets can be combined in one go. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(rarities.size === 0 && "border-dashed text-muted-foreground")}
                >
                  Rareté
                  {rarities.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 font-mono text-[10px]"
                    >
                      {rarities.size}
                    </Badge>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent className="min-w-44" align="start">
              {RARITY_ORDER.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={rarities.has(r)}
                  onCheckedChange={() => toggleRarity(r)}
                  closeOnClick={false}
                >
                  <span
                    className={cn("size-2.5 rounded-full", RARITY_TONE[r])}
                  />
                  {RARITY_LABEL[r]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <Select
              value={sortKey}
              onValueChange={(v) => v && setSortKey(v as SortKey)}
            >
              <SelectTrigger className="min-w-[12rem] bg-background">
                <SelectValue placeholder="Tri">
                  {(value) =>
                    SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Tri"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDesc((v) => !v)}
              aria-label="Inverser le sens du tri"
              title={sortDesc ? "Décroissant" : "Croissant"}
            >
              <ArrowDownUp
                className={cn(
                  "size-4 transition-transform",
                  sortDesc && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        {(query || rarities.size > 0) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{filtered.length}</strong> /{" "}
              {rows.length} Pokémon correspondant aux filtres
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-muted-foreground"
              onClick={() => {
                setQuery("");
                setRarities(new Set());
              }}
            >
              <X data-icon="inline-start" />
              Réinitialiser
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Aucun Pokémon ne correspond à ces filtres dans ce biome.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((r) => (
              <SpawnCard key={r.pokemon.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One Pokémon of the biome's spawn pool. Sprite + name + types on the
 * first line; rarity, level window and the conditions that gate the
 * spawn (time of day, fishing) as compact chips below.
 */
function SpawnCard({ row }: { row: Row }) {
  const { pokemon, spawn, rarity } = row;
  const times = spawn.times.filter((t) => t !== "any");
  const fishing = spawn.contexts.includes("fishing");

  return (
    <Link
      href={`/pokedex/${pokemon.id}`}
      className="group flex items-center gap-2.5 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40"
    >
      <div className="size-12 shrink-0">
        <PokemonSprite pokemon={pokemon} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium capitalize">
          {pokemon.name}
        </span>
        <span className="flex items-center gap-1">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t as PokemonTypeId} size="sm" />
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {rarity && (
            <span
              className={cn(
                "rounded px-1.5 py-px font-medium text-white",
                RARITY_TONE[rarity],
              )}
            >
              {RARITY_LABEL[rarity]}
            </span>
          )}
          {spawn.levelRange && (
            <span className="font-mono">
              Lv. {spawn.levelRange[0]}–{spawn.levelRange[1]}
            </span>
          )}
          {times.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="size-3" />
              {times.map((t) => TIME_SHORT[t] ?? t).join("/")}
            </span>
          )}
          {fishing && (
            <span className="inline-flex items-center gap-0.5">
              <Fish className="size-3" />
              Pêche
            </span>
          )}
          {spawn.rarities.includes("ultra-rare") && rarity !== "ultra-rare" && (
            <Sparkles className="size-3 text-amber-500" />
          )}
        </span>
      </div>
    </Link>
  );
}

const TIME_SHORT: Record<string, string> = {
  day: "Jour", night: "Nuit", dusk: "Crépuscule", dawn: "Aube",
};
