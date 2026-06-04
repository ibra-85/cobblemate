"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Search,
  BookOpen,
  Users,
  Swords,
  Package,
  Heart,
  LayoutDashboard,
  Calculator,
  Wand2,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/site/type-badge";
import { POKEMON } from "@/data/pokemon";
import { MOVES, lookupMove } from "@/data/moves";
import {
  allAbilitySlugs,
  lookupAbility,
} from "@/data/abilities-pokeapi";
import {
  allHeldItemSlugs,
  lookupItem,
} from "@/data/items-pokeapi";
import { frAbility, frItem } from "@/data/smogon";
import { SmogonItemIcon } from "@/features/pokedex/smogon-item-icon";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { cn } from "@/lib/utils";
import type { PokemonTypeId } from "@/types";

const CATEGORY_BADGE_LABEL: Record<string, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

const QUICK_ACTIONS = [
  { href: "/",                label: "Dashboard",      icon: LayoutDashboard, hint: "Vue d'ensemble" },
  { href: "/pokedex",         label: "Pokédex",        icon: BookOpen,        hint: "Parcourir 1186 Pokémon" },
  { href: "/battle",          label: "Combat",         icon: Swords,          hint: "Assistant + matrice team-vs-team" },
  { href: "/battle?tab=calc", label: "Calc de dégâts", icon: Calculator,      hint: "Simuler un coup" },
  { href: "/team-builder",    label: "Team Builder",   icon: Users,           hint: "Composer son équipe" },
  { href: "/items",           label: "Objets",         icon: Package,         hint: "Catalogue Cobblemon" },
  { href: "/wishlist",        label: "Wishlist",       icon: Heart,           hint: "Mons à attraper" },
];

/** Soft cap for how many results we render per category. cmdk used
 *  to render the full ~2500-item universe and CSS-hide non-matches,
 *  which made every keystroke reconcile thousands of `CommandItem`s
 *  in React. Twenty visible matches per category is more than
 *  anyone scrolls before refining the query — and keeps the DOM at
 *  ~80 items max, which the browser can paint in a single frame. */
const RESULTS_PER_CATEGORY = 20;

interface PokemonHit {
  id: string;
  name: string;
  dexNumber: number;
}
interface MoveHit {
  id: string;
  name: string;
  type: string;
  category: string;
}
interface AbilityHit {
  slug: string;
  labelFr: string;
  labelEn: string;
}
interface ItemHit {
  slug: string;
  name: string;
  labelFr: string;
}

/**
 * Build a cheap searchable haystack for an entry. Lowercase, joined
 * with spaces — `String.includes` matches in microseconds on this
 * shape so we don't need a fancy fuzzy library for ~2.5k rows.
 */
function haystack(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function Header() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // React-19 native debounce — `query` updates the `<CommandInput>`
  // immediately so typing never feels laggy; `deferredQuery` lags by
  // one render and feeds the (heavier) filter pipeline below. While
  // the two diverge we show a faded list so the user sees that a
  // recompute is in flight.
  const deferredQuery = useDeferredValue(query);
  const isStale = deferredQuery !== query;

  // Pre-index every searchable entity once. Each row carries a
  // pre-lowercased `key` so filtering is a flat `includes` instead of
  // re-lowercasing + concatenating per row per keystroke. For 1186
  // Pokémon that shaves ~5–10ms per keystroke on slower devices.
  const pokemonIndex = useMemo<
    Array<PokemonHit & { key: string }>
  >(
    () =>
      POKEMON.map((p) => ({
        id: p.id,
        name: p.name,
        dexNumber: p.dexNumber,
        key: haystack(p.name, p.id, p.dexNumber),
      })),
    [],
  );
  const moveIndex = useMemo<
    Array<MoveHit & { key: string }>
  >(
    () =>
      MOVES.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        category: m.category,
        key: haystack(m.name, m.id, m.type),
      })),
    [],
  );
  const abilityIndex = useMemo<
    Array<AbilityHit & { key: string }>
  >(
    () =>
      allAbilitySlugs().map((slug) => {
        const a = lookupAbility(slug);
        const labelFr = a ? frAbility(a.nameEn).label : slug;
        const labelEn = a?.nameEn ?? slug;
        return {
          slug,
          labelFr,
          labelEn,
          key: haystack(labelFr, labelEn, slug),
        };
      }),
    [],
  );
  const itemIndex = useMemo<
    Array<ItemHit & { key: string }>
  >(
    () =>
      allHeldItemSlugs().map((slug) => {
        const it = lookupItem(slug);
        const name = it?.nameEn ?? slug;
        const labelFr = it ? frItem(it.nameEn).label : slug;
        return {
          slug,
          name,
          labelFr,
          key: haystack(labelFr, name, slug),
        };
      }),
    [],
  );

  const isSearching = query.trim().length > 0;

  // Filtered + capped results. Computed off the deferred query so the
  // input stays snappy; the actual filter is `String.includes` which
  // is roughly free at this scale. The cap is per-category which
  // also caps how many `CommandItem`s React mounts at once.
  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) {
      return {
        pokemon: [] as PokemonHit[],
        moves: [] as MoveHit[],
        abilities: [] as AbilityHit[],
        items: [] as ItemHit[],
      };
    }
    return {
      pokemon: pokemonIndex
        .filter((p) => p.key.includes(q))
        .slice(0, RESULTS_PER_CATEGORY),
      moves: moveIndex
        .filter((m) => m.key.includes(q))
        .slice(0, RESULTS_PER_CATEGORY),
      abilities: abilityIndex
        .filter((a) => a.key.includes(q))
        .slice(0, RESULTS_PER_CATEGORY),
      items: itemIndex
        .filter((it) => it.key.includes(q))
        .slice(0, RESULTS_PER_CATEGORY),
    };
  }, [deferredQuery, pokemonIndex, moveIndex, abilityIndex, itemIndex]);

  const hasAnyResult =
    results.pokemon.length +
      results.moves.length +
      results.abilities.length +
      results.items.length >
    0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <MobileNav />

      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground md:max-w-md"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        Rechercher Pokémon, attaque, type…
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:inline-flex">
          Ctrl K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        {/* `shouldFilter={false}` turns off cmdk's internal scoring +
            CSS-hiding pipeline. The old setup mounted every Pokémon /
            move / ability / item (~2.5k items) and let cmdk hide the
            non-matches via `display:none`. React still reconciled all
            those `CommandItem`s on every keystroke — that was the
            source of the jitter. With manual pre-filtering we only
            mount what actually matches (capped at 20 / category) so
            React sees ≤ 80 items per render instead of 2500. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tapez le nom d'un Pokémon ou d'une attaque…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList
            className={cn(
              "transition-opacity",
              // While `query` and `deferredQuery` diverge we're "in
              // flight" — dim the list slightly so the user sees a
              // refresh is happening, without losing the previous
              // results (which feels twitchier than a brief fade).
              isStale && "opacity-50",
            )}
          >
            {isSearching && !hasAnyResult && !isStale && (
              <CommandEmpty>Aucun résultat.</CommandEmpty>
            )}

            {/* Default view — quick links to the major sections. */}
            {!isSearching && (
              <CommandGroup heading="Actions rapides">
                {QUICK_ACTIONS.map((a) => (
                  <CommandItem
                    key={a.href}
                    value={a.href}
                    onSelect={() => {
                      setOpen(false);
                      router.push(a.href);
                    }}
                  >
                    <a.icon />
                    <span>{a.label}</span>
                    <CommandShortcut className="text-muted-foreground">
                      {a.hint}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search-time results — Pokémon + attaques + talents +
                objets. Each category renders at most
                `RESULTS_PER_CATEGORY` items so the DOM stays small. */}
            {isSearching && results.pokemon.length > 0 && (
              <CommandGroup heading="Pokémon">
                {results.pokemon.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/pokedex/${p.id}`);
                    }}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      #{p.dexNumber}
                    </span>
                    <span>{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isSearching && results.moves.length > 0 && (
              <CommandGroup heading="Attaques">
                {results.moves.map((m) => {
                  const move = lookupMove(m.id);
                  return (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/moves/${m.id}`);
                      }}
                    >
                      <span className="truncate">{move?.name ?? m.name}</span>
                      <CommandShortcut className="flex items-center gap-1.5">
                        <TypeBadge type={m.type as PokemonTypeId} size="sm" />
                        <Badge
                          variant="secondary"
                          className="px-1.5 font-mono text-[10px]"
                        >
                          {CATEGORY_BADGE_LABEL[m.category] ?? m.category}
                        </Badge>
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {isSearching && results.abilities.length > 0 && (
              <CommandGroup heading="Talents">
                {results.abilities.map((a) => (
                  <CommandItem
                    key={a.slug}
                    value={a.slug}
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/abilities/${a.slug}`);
                    }}
                  >
                    <Wand2 className="size-3.5 text-amber-500/70" />
                    <span className="truncate">{a.labelFr}</span>
                    {a.labelEn && a.labelEn !== a.labelFr && (
                      <CommandShortcut className="italic">
                        {a.labelEn}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isSearching && results.items.length > 0 && (
              <CommandGroup heading="Objets">
                {results.items.map((it) => (
                  <CommandItem
                    key={it.slug}
                    value={it.slug}
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/items/${it.slug}`);
                    }}
                  >
                    <span className="grid size-5 shrink-0 place-items-center">
                      <SmogonItemIcon name={it.name} size={18} />
                    </span>
                    <span className="truncate">{it.labelFr}</span>
                    {it.name && it.name !== it.labelFr && (
                      <CommandShortcut className="italic">
                        {it.name}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Skeleton overlay while the deferred filter catches up.
                Shows briefly on heavy queries (slow devices, big
                strings); on fast hardware it never paints because
                deferredQuery resolves in the same render. */}
            {isSearching && isStale && !hasAnyResult && (
              <div className="flex flex-col gap-2 px-2 py-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 animate-pulse rounded bg-muted/50"
                  />
                ))}
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}
