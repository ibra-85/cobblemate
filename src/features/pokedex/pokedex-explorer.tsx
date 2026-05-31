"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Search,
  X,
  LayoutGrid,
  Rows3,
  ArrowDownUp,
} from "lucide-react";
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PokemonCard } from "@/components/site/pokemon-card";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { TypeBadges } from "@/components/site/type-badge";
import { POKEMON } from "@/data/pokemon";
import { SPAWNS } from "@/data/spawns";
import { SPECIES_EXTRAS_BY_ID } from "@/data/species-extras";
import type { Pokemon } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { searchPokemon } from "@/lib/search";
import { cn } from "@/lib/utils";
import { FiltersBar, type ActiveFilter } from "./filters-bar";

type SortKey = "dex" | "name" | "bst" | "hp" | "attack" | "defense" | "spAtk" | "spDef" | "speed";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "dex",     label: "N° National Dex" },
  { value: "name",    label: "Nom (A→Z)" },
  { value: "bst",     label: "Puissance totale" },
  { value: "hp",      label: "HP" },
  { value: "attack",  label: "Attaque" },
  { value: "defense", label: "Défense" },
  { value: "spAtk",   label: "Atk. Spé" },
  { value: "spDef",   label: "Déf. Spé" },
  { value: "speed",   label: "Vitesse" },
];

const ROSTER_BST = POKEMON.map((p) => baseStatTotal(p));
const BST_MIN = Math.min(...ROSTER_BST);
const BST_MAX = Math.max(...ROSTER_BST);

// Page size for the grid. Cards mount lazily as the user scrolls past the
// sentinel — keeps initial render under 100ms even with the full 1186-mon
// roster, and typing in the search box stays responsive (only the visible
// slice re-renders).
const PAGE_SIZE = 60;

export function PokedexExplorer() {
  const [query, setQuery] = useState("");
  // `useDeferredValue` decouples the typed input from the heavy
  // filter+sort+render pipeline: the input updates immediately, the
  // filtered list catches up on the next idle frame.
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("dex");
  const [sortDesc, setSortDesc] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const generations = useMemo(
    () => Array.from(new Set(POKEMON.map((p) => p.generation))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let list = POKEMON;
    if (deferredQuery) list = searchPokemon(deferredQuery, list);

    for (const f of filters) {
      if (f.kind === "power") {
        const [lo, hi] = f.range;
        list = list.filter((p) => {
          const b = baseStatTotal(p);
          return b >= lo && b <= hi;
        });
        continue;
      }
      if (f.values.length === 0) continue;
      list = list.filter((p) => {
        const matches = matchFilter(p, f.kind, f.values);
        return f.mode === "exclude" ? !matches : matches;
      });
    }

    return list.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === "dex") cmp = a.dexNumber - b.dexNumber;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "bst") cmp = baseStatTotal(a) - baseStatTotal(b);
      else cmp = a.baseStats[sortKey] - b.baseStats[sortKey];
      return sortDesc ? -cmp : cmp;
    });
  }, [deferredQuery, filters, sortKey, sortDesc]);

  // Reset the visible window whenever the result set changes — otherwise
  // scrolling deep into a long roster, then narrowing filters, would
  // leave the page stuck at a stale offset. The signature is a stable
  // fingerprint of every input the `filtered` memo depends on (plus
  // `view`, which changes the rendered slice's shape).
  //
  // React 19 explicitly recommends the "compare a stored prev value
  // and call setState during render" pattern for this — and unlike
  // resetting from inside `useEffect`, it doesn't trigger the
  // `react-hooks/set-state-in-effect` cascade-render rule.
  // `JSON.stringify(filters)` already encodes both length and content;
  // no need to prepend the length separately.
  const filterSignature = `${deferredQuery}|${JSON.stringify(filters)}|${sortKey}|${sortDesc}|${view}`;
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
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, visibleCount, view]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasAny = query.length > 0 || filters.length > 0;

  function resetAll() {
    setQuery("");
    setFilters([]);
    setSortKey("dex");
    setSortDesc(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Single-row toolbar: search + filters + sort + view */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[14rem] flex-1 sm:max-w-xs">
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

        <FiltersBar
          filters={filters}
          onChange={setFilters}
          context={{
            generations,
            powerMin: BST_MIN,
            powerMax: BST_MAX,
          }}
        />

        <div className="ml-auto flex items-center gap-2">
          <Select value={sortKey} onValueChange={(v) => v && setSortKey(v as SortKey)}>
            <SelectTrigger className="min-w-[10rem] bg-background">
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

          <ToggleGroup
            value={[view]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[v.length - 1] : v;
              if (next === "grid" || next === "list") setView(next);
            }}
          >
            <ToggleGroupItem value="grid" aria-label="Grille">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Liste compacte">
              <Rows3 className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Result summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{filtered.length}</strong> /{" "}
          {POKEMON.length} Pokémon
          {hasAny ? " correspondant aux filtres" : ""}
          {visibleCount < filtered.length && (
            <>
              {" "}— affichage de{" "}
              <strong className="text-foreground">{visibleCount}</strong>
            </>
          )}
        </span>
        {hasAny && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <X className="size-3" />
            Tout réinitialiser
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Search className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucun Pokémon trouvé</p>
            <p className="text-sm text-muted-foreground">
              Essaie de retirer un filtre ou de chercher un autre nom.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll}>
            <X data-icon="inline-start" />
            Réinitialiser
          </Button>
        </div>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => (
              <PokemonCard key={p.id} pokemon={p} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Chargement de {Math.min(PAGE_SIZE, filtered.length - visibleCount)} Pokémon
              supplémentaires…
            </div>
          )}
        </>
      ) : (
        <>
          <CompactList list={visible} />
          {visibleCount < filtered.length && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-4 text-xs text-muted-foreground"
            >
              Chargement de {Math.min(PAGE_SIZE, filtered.length - visibleCount)} lignes
              supplémentaires…
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Filter matcher — kept colocated for clarity; pure functions of the data.
function matchFilter(
  p: Pokemon,
  kind: Exclude<ActiveFilter["kind"], "power">,
  values: string[],
): boolean {
  switch (kind) {
    case "type":
      return (p.types as string[]).some((t) => values.includes(t));
    case "generation":
      return values.includes(String(p.generation));
    case "role":
      return (p.roles as string[]).some((r) => values.includes(r));
    case "biome": {
      const matchingIds = new Set(
        SPAWNS.filter((s) => s.biomes.some((b) => values.includes(b))).map(
          (s) => s.pokemonId,
        ),
      );
      return matchingIds.has(p.id);
    }
    case "rarity": {
      const matchingIds = new Set(
        SPAWNS
          .filter((s) => s.rarities.some((r) => values.includes(r)))
          .map((s) => s.pokemonId),
      );
      return matchingIds.has(p.id);
    }
    case "category": {
      const labels = SPECIES_EXTRAS_BY_ID[p.id]?.labels ?? [];
      return labels.some((l) => values.includes(l));
    }
  }
}

function CompactList({ list }: { list: Pokemon[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Pokémon</th>
            <th className="p-3 text-left">Types</th>
            <th className="p-3 text-right">HP</th>
            <th className="p-3 text-right">Atk</th>
            <th className="p-3 text-right">Déf</th>
            <th className="p-3 text-right">SpA</th>
            <th className="p-3 text-right">SpD</th>
            <th className="p-3 text-right">Vit</th>
            <th className="p-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
              <td className="p-3">
                <Link
                  href={`/pokedex/${p.id}`}
                  className="flex items-center gap-3 hover:text-foreground"
                >
                  <PokemonSprite pokemon={p} size="size-9" />
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{p.dexNumber.toString().padStart(4, "0")}
                    </span>
                  </div>
                </Link>
              </td>
              <td className="p-3">
                <TypeBadges types={p.types} size="sm" />
              </td>
              <td className="p-3 text-right font-mono">{p.baseStats.hp}</td>
              <td className="p-3 text-right font-mono">{p.baseStats.attack}</td>
              <td className="p-3 text-right font-mono">{p.baseStats.defense}</td>
              <td className="p-3 text-right font-mono">{p.baseStats.spAtk}</td>
              <td className="p-3 text-right font-mono">{p.baseStats.spDef}</td>
              <td className="p-3 text-right font-mono">{p.baseStats.speed}</td>
              <td className="p-3 text-right">
                <Badge variant="secondary" className="font-mono">
                  {baseStatTotal(p)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
