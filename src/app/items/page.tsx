"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemIcon } from "@/components/site/minecraft-item";
import { ITEMS } from "@/data/items";
import { cn } from "@/lib/utils";
import { foldDiacritics } from "@/lib/search";
import type { Item, ItemCategory } from "@/types";
import {
  ItemsFiltersBar,
  type ItemsFilter,
} from "@/features/items/filters-bar";

/** Most curated items map to Cobblemon items. Prefix with the
 *  `cobblemon:` namespace + underscore the id so `ItemIcon` can
 *  resolve a real texture via its lookup chain (registry → bundled
 *  sprite → PokéAPI → SVG fallback). Items the chain can't find
 *  fall back to the hand-drawn pixel-art sprite — never broken. */
function cobblemonItemId(id: string): string {
  return `cobblemon:${id.replace(/-/g, "_")}`;
}

const RARITY_TONE: Record<string, string> = {
  common:       "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
  uncommon:     "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rare:         "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "ultra-rare": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

const RARITY_LABEL: Record<string, string> = {
  common:       "Commun",
  uncommon:     "Peu commun",
  rare:         "Rare",
  "ultra-rare": "Ultra rare",
};

const RARITY_COLOR: Record<string, string> = {
  common:       "#9ca3af",
  uncommon:     "#22c55e",
  rare:         "#3b82f6",
  "ultra-rare": "#a855f7",
};

/**
 * Categories surfaced in the filter dropdown. Every entry maps to a
 * category id the merged `ITEMS` array uses — see `Item.category`.
 * "Utility" used to live here but no item ever flowed into it
 * (the wiki dataset has zero `utility`-tagged items and the curated
 * list doesn't use the bucket either) so we drop it to keep the
 * filter list honest.
 */
const CATEGORY_OPTIONS: { id: ItemCategory; label: string; color: string }[] = [
  { id: "ball",      label: "Apricorn Balls",  color: "#ef4444" },
  { id: "held",      label: "Tenus",           color: "#3b82f6" },
  { id: "evolution", label: "Évolution",       color: "#a855f7" },
  { id: "healing",   label: "Soins",           color: "#22c55e" },
  { id: "vitamin",   label: "Vitamines",       color: "#f59e0b" },
  { id: "natural",   label: "Naturels",        color: "#84cc16" },
  { id: "food",      label: "Nourriture",      color: "#fb923c" },
  { id: "berry",     label: "Baies",           color: "#ec4899" },
];

const CATEGORY_LABEL = new Map(CATEGORY_OPTIONS.map((c) => [c.id, c.label]));

// Pre-build filter options lists — never change at runtime.
const FILTER_CATEGORY_OPTIONS = CATEGORY_OPTIONS.map((c) => ({
  value: c.id,
  label: c.label,
  color: c.color,
}));

const FILTER_RARITY_OPTIONS = Object.entries(RARITY_LABEL).map(([id, label]) => ({
  value: id,
  label,
  color: RARITY_COLOR[id],
}));

export default function ItemsPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ItemsFilter[]>([]);

  const filteredItems = useMemo(() => {
    const q = foldDiacritics(query.trim());
    // Pre-build set lookups so the inner loop is O(F·N) instead of
    // O(F·V·N) — same pattern the pokesnacks page uses, kept fast
    // for the ~260-item catalog. The cost matters only when the
    // user types quickly + has 2 filters active, but it's free
    // to write cleanly.
    const filterSets = filters
      .filter((f) => f.values.length > 0)
      .map((f) => ({ kind: f.kind, mode: f.mode, set: new Set(f.values) }));
    return ITEMS.filter((i) => {
      if (q && !foldDiacritics(i.name).includes(q) && !i.id.includes(q))
        return false;
      for (const f of filterSets) {
        const fieldValue =
          f.kind === "category" ? i.category : i.rarity ?? "";
        const matches = f.set.has(fieldValue);
        if (f.mode === "exclude" ? matches : !matches) return false;
      }
      return true;
    });
  }, [query, filters]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Objets
        </h1>
        <p className="text-sm text-muted-foreground">
          Apricorn Balls, objets tenus, pierres évolutives, soins et baies.
          Pour les snacks (recettes pour attirer des Pokémon), va sur la
          page dédiée.
        </p>
      </header>

      {/* CTA — PokéSnacks lives on its own page. */}
      <Link
        href="/pokesnacks"
        className="group flex items-center gap-3 rounded-lg border bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-3 transition-colors hover:border-amber-500/40"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Cookie className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">PokéSnacks</span>
          <span className="text-xs text-muted-foreground">
            Recettes pour attirer un type, un Pokémon précis ou un biome
            entier. Filtres avancés disponibles.
          </span>
        </div>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" tabIndex={-1}>
          Explorer →
        </Button>
      </Link>

      {/* Search + chip filters — same UI pattern as /pokedex and
          /pokesnacks. */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-0 flex-1 sm:max-w-md">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Rechercher un objet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <ItemsFiltersBar
          filters={filters}
          onChange={setFilters}
          options={{
            category: FILTER_CATEGORY_OPTIONS,
            rarity: FILTER_RARITY_OPTIONS,
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">{filteredItems.length}</strong>{" "}
        objet{filteredItems.length > 1 ? "s" : ""}
        {query || filters.length > 0 ? " correspondant" : ""} sur {ITEMS.length}.
      </p>

      {filteredItems.length > 0 ? (
        // `auto-rows-fr` (fractional, not min) forces every row in
        // the grid to be the same height — paired with `h-full` on
        // each card, every card in a row stretches to match the
        // tallest in that row.
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Rien à afficher</EmptyTitle>
            <EmptyDescription>
              Aucun résultat. Retire un filtre ou essaie une autre recherche.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

/**
 * Item catalogue card — same shape for every entry so the grid stays
 * uniform regardless of which optional fields the item carries.
 *
 * Visible info: icon, name, rarity badge, 2-line description, and a
 * "Détails →" link. Everything else (obtain text, recipes, holders)
 * lives on `/items/[id]` to keep the card heights consistent.
 */
function ItemCard({ item }: { item: Item }) {
  const rawId = cobblemonItemId(item.id);
  const catLabel = CATEGORY_LABEL.get(item.category);
  return (
    <Link
      href={`/items/${item.id}`}
      title={`Voir le détail de ${item.name}`}
      className="group/card flex h-full min-h-30 flex-col gap-2 rounded-lg border bg-card p-3 no-underline transition-colors hover:border-foreground/20 hover:bg-accent/30"
    >
      <div className="flex items-start gap-3">
        <ItemIcon item={rawId} size="size-10" className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap justify-between">
            <h3 className="line-clamp-1 text-sm font-semibold leading-tight">
              {item.name}
            </h3>
            {item.rarity && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide",
                  RARITY_TONE[item.rarity] ?? "bg-muted/40",
                )}
              >
                {RARITY_LABEL[item.rarity] ?? item.rarity}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 min-h-[2.25rem] text-xs leading-snug text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between">
        {catLabel && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            {catLabel}
          </span>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 transition-colors group-hover/card:text-foreground">
          Détails →
        </span>
      </div>
    </Link>
  );
}
