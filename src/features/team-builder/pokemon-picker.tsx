"use client";

import { useMemo, useState } from "react";
import { Filter, Heart, Plus, RotateCcw, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import { isLegendary, isMythical, isParadox } from "@/data/species-extras";
import { useWishlist } from "@/hooks/use-wishlist";
import type { Pokemon, PokemonRole, PokemonTypeId } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { searchPokemon } from "@/lib/search";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (pokemonId: string) => void;
  trigger?: React.ReactNode;
  excludeIds?: string[];
}

const ALL_TYPES = Object.keys(TYPES_META) as PokemonTypeId[];

const GENERATIONS: number[] = Array.from(
  new Set(POKEMON.map((p) => p.generation)),
).sort((a, b) => a - b);

const ROLE_LABEL: Record<PokemonRole, string> = {
  "physical-sweeper": "Sweeper phys.",
  "special-sweeper": "Sweeper spé.",
  "physical-wall": "Mur phys.",
  "special-wall": "Mur spé.",
  "mixed-wall": "Mur mixte",
  "support": "Support",
  "hazard-setter": "Hazard setter",
  "pivot": "Pivot",
  "revenge-killer": "Revenge killer",
  "lead": "Lead",
  "wallbreaker": "Wallbreaker",
};

const ALL_ROLES = Object.keys(ROLE_LABEL) as PokemonRole[];

// Empirical BST bounds across the roster. Hard-coded rather than
// computed on every render — the dataset is static and `Math.min/max`
// over 1186 mons is wasted work for a slider's start position.
const BST_MIN = 175;
const BST_MAX = 720;
const SPEED_MAX = 200;

type Category = "any" | "normal" | "legendary";

interface PickerFilters {
  query: string;
  generations: Set<number>;
  /** OR semantics — pass if any selected type is on the mon. */
  types: Set<PokemonTypeId>;
  /** OR semantics — pass if any declared role matches. */
  roles: Set<PokemonRole>;
  bstRange: [number, number];
  speedMin: number;
  category: Category;
  favoritesOnly: boolean;
}

function emptyFilters(): PickerFilters {
  return {
    query: "",
    generations: new Set(),
    types: new Set(),
    roles: new Set(),
    bstRange: [BST_MIN, BST_MAX],
    speedMin: 0,
    category: "any",
    favoritesOnly: false,
  };
}

/** Number of active filter facets — drives the badge on the "Filtres" button. */
function activeFacetCount(f: PickerFilters): number {
  let n = 0;
  if (f.generations.size > 0) n++;
  if (f.types.size > 0) n++;
  if (f.roles.size > 0) n++;
  if (f.bstRange[0] > BST_MIN || f.bstRange[1] < BST_MAX) n++;
  if (f.speedMin > 0) n++;
  if (f.category !== "any") n++;
  if (f.favoritesOnly) n++;
  return n;
}

export function PokemonPicker({ onPick, trigger, excludeIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<PickerFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { ids: wishlistIds, has: isWishlisted } = useWishlist();

  // Re-running the full POKEMON filter on every keystroke is fine
  // (≤1186 mons, sub-ms), but the memo keeps suggestion logic and
  // results array referentially stable between identical inputs.
  const results = useMemo(
    () => applyFilters(filters, excludeIds, isWishlisted),
    [filters, excludeIds, isWishlisted],
  );

  function pickAndClose(id: string) {
    onPick(id);
    setOpen(false);
    setFilters(emptyFilters());
    setFiltersOpen(false);
  }

  const activeCount = activeFacetCount(filters);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setFilters(emptyFilters());
          setFiltersOpen(false);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              // Min-height scales alongside the filled-slot card so an
              // empty row in the 3×2 grid doesn't collapse to a thin
              // strip next to detailed filled cards. The dashed border
              // + centred icon + label reads as "drop a Pokémon here"
              // rather than the previous bare "+" which felt like a
              // dev placeholder.
              className="group/empty flex h-full min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/30 text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/30 hover:text-primary hover:shadow-md md:min-h-52 lg:min-h-60"
            >
              <span className="grid size-12 place-items-center rounded-full border border-dashed border-current transition-transform duration-200 ease-out group-hover/empty:scale-110">
                <Plus className="size-5" />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold">Ajouter un Pokémon</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  Ouvrir le sélecteur
                </span>
              </span>
            </button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisir un Pokémon</DialogTitle>
          <DialogDescription>
            Recherche par nom et filtres avancés (générations, types, rôles,
            stats, catégorie, favoris).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              placeholder="Tapez un nom…"
              value={filters.query}
              onChange={(e) =>
                setFilters((f) => ({ ...f, query: e.target.value }))
              }
            />
          </InputGroup>
          <Button
            variant={filtersOpen || activeCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className="gap-1.5"
          >
            <Filter className="size-4" />
            Filtres
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 font-mono text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>

        {filtersOpen && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            hasWishlist={wishlistIds.length > 0}
            onReset={() =>
              setFilters((f) => ({ ...emptyFilters(), query: f.query }))
            }
          />
        )}

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{results.length}</strong>{" "}
          résultat{results.length > 1 ? "s" : ""}
          {excludeIds.length > 0 &&
            ` · ${excludeIds.length} déjà dans l'équipe`}
        </p>

        <ScrollArea className="h-80">
          <div className="flex flex-col gap-1 pr-2">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickAndClose(p.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <PokemonSprite pokemon={p} size="size-10" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    #{p.dexNumber} · Gen {p.generation} · BST{" "}
                    {baseStatTotal(p)} · Vit {p.baseStats.speed}
                  </span>
                </div>
                <TypeBadges types={p.types} size="sm" />
              </button>
            ))}
            {results.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Badge variant="outline">Rien trouvé</Badge>
                <p>Essaie d&apos;assouplir les filtres.</p>
                {activeCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(emptyFilters())}
                    className="gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Tout réinitialiser
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Apply all filter facets in a fixed order — cheaper filters first
 * (string includes, set lookups) so the more expensive operations
 * (BST sum, isLegendary lookup) only see the survivors.
 */
function applyFilters(
  f: PickerFilters,
  excludeIds: string[],
  isWishlisted: (id: string) => boolean,
): Pokemon[] {
  const excluded = new Set(excludeIds);
  let list = f.query.trim() ? searchPokemon(f.query) : POKEMON;

  if (excluded.size > 0) list = list.filter((p) => !excluded.has(p.id));
  if (f.favoritesOnly) list = list.filter((p) => isWishlisted(p.id));
  if (f.generations.size > 0)
    list = list.filter((p) => f.generations.has(p.generation));
  if (f.types.size > 0)
    list = list.filter((p) => p.types.some((t) => f.types.has(t)));
  if (f.roles.size > 0)
    list = list.filter((p) => p.roles.some((r) => f.roles.has(r)));
  if (f.speedMin > 0)
    list = list.filter((p) => p.baseStats.speed >= f.speedMin);
  if (f.bstRange[0] > BST_MIN || f.bstRange[1] < BST_MAX) {
    list = list.filter((p) => {
      const bst = baseStatTotal(p);
      return bst >= f.bstRange[0] && bst <= f.bstRange[1];
    });
  }
  if (f.category === "legendary") {
    list = list.filter(
      (p) => isLegendary(p.id) || isMythical(p.id) || isParadox(p.id),
    );
  } else if (f.category === "normal") {
    list = list.filter(
      (p) => !isLegendary(p.id) && !isMythical(p.id) && !isParadox(p.id),
    );
  }
  return list;
}

/**
 * The expandable advanced-filter pane. Kept inline beneath the
 * search field rather than in a popover — popovers nested inside a
 * dialog often render under the dialog (z-index / focus-trap
 * conflicts), and an inline panel is also faster to scan on
 * desktop where the dialog has the space for it.
 */
function FilterPanel({
  filters,
  setFilters,
  hasWishlist,
  onReset,
}: {
  filters: PickerFilters;
  setFilters: React.Dispatch<React.SetStateAction<PickerFilters>>;
  hasWishlist: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
      <FacetGroup label="Génération">
        <div className="flex flex-wrap gap-1">
          {GENERATIONS.map((g) => {
            const active = filters.generations.has(g);
            return (
              <Chip
                key={g}
                active={active}
                onClick={() =>
                  setFilters((f) => toggleInSet(f, "generations", g))
                }
              >
                Gen {g}
              </Chip>
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup label="Types">
        <div className="flex flex-wrap gap-1">
          {ALL_TYPES.map((t) => {
            const active = filters.types.has(t);
            const meta = TYPES_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilters((f) => toggleInSet(f, "types", t))}
                className={cn(
                  "cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                  active
                    ? "opacity-100 ring-2 ring-offset-2 ring-offset-popover"
                    : "opacity-60 hover:opacity-100",
                )}
                style={{
                  backgroundColor: meta.color,
                  color: meta.fg,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup label="Rôles">
        <div className="flex flex-wrap gap-1">
          {ALL_ROLES.map((r) => {
            const active = filters.roles.has(r);
            return (
              <Chip
                key={r}
                active={active}
                onClick={() => setFilters((f) => toggleInSet(f, "roles", r))}
              >
                {ROLE_LABEL[r]}
              </Chip>
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup
        label="BST"
        value={`${filters.bstRange[0]} – ${filters.bstRange[1]}`}
      >
        <Slider
          min={BST_MIN}
          max={BST_MAX}
          step={5}
          value={filters.bstRange}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              bstRange: v as [number, number],
            }))
          }
        />
      </FacetGroup>

      <FacetGroup label="Vitesse min" value={filters.speedMin}>
        <Slider
          min={0}
          max={SPEED_MAX}
          step={5}
          value={[filters.speedMin]}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              speedMin: Array.isArray(v) ? v[0] ?? 0 : 0,
            }))
          }
        />
      </FacetGroup>

      <FacetGroup label="Catégorie">
        <div className="flex gap-1">
          {(["any", "normal", "legendary"] as Category[]).map((c) => (
            <Chip
              key={c}
              active={filters.category === c}
              onClick={() => setFilters((f) => ({ ...f, category: c }))}
            >
              {c === "any"
                ? "Toutes"
                : c === "normal"
                ? "Normaux"
                : "Lég / Myth / Parad"}
            </Chip>
          ))}
        </div>
      </FacetGroup>

      {hasWishlist && (
        <FacetGroup label="Favoris">
          <Chip
            active={filters.favoritesOnly}
            onClick={() =>
              setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
            }
          >
            <Heart
              className={cn(
                "size-3",
                filters.favoritesOnly && "fill-current",
              )}
            />
            Favoris uniquement
          </Chip>
        </FacetGroup>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="size-3.5" />
          Tout réinitialiser
        </Button>
      </div>
    </div>
  );
}

function FacetGroup({
  label,
  value,
  children,
}: {
  label: string;
  /** Optional current-value summary (e.g. slider readout). */
  value?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {value !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Toggle a value inside the Set held at `key` on the filters object,
 * preserving immutability so React picks up the change. Keeps the
 * filter callbacks one-liners at the call sites.
 */
function toggleInSet<K extends "generations" | "types" | "roles">(
  f: PickerFilters,
  key: K,
  value: PickerFilters[K] extends Set<infer V> ? V : never,
): PickerFilters {
  const next = new Set(f[key] as Set<typeof value>);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return { ...f, [key]: next };
}
