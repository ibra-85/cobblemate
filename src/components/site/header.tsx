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
  Cookie,
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
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import {
  displayNameWithEnglish,
  englishName,
  formLabel,
} from "@/lib/pokemon-form";
import { ALL_MOVE_IDS, lookupMove } from "@/data/moves";
import {
  allAbilitySlugs,
  lookupAbility,
} from "@/data/abilities-pokeapi";
import { ITEMS } from "@/data/items";
import generatedItems from "@/data/cobblemon-items-generated.json";
import { frAbility } from "@/data/smogon";
import { POKESNACKS } from "@/data/pokesnacks";
import { ItemIcon } from "@/components/site/minecraft-item";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { cn } from "@/lib/utils";
import type { PokemonTypeId, Pokesnack } from "@/types";

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
  { href: "/pokesnacks",      label: "PokéSnacks",     icon: Cookie,          hint: "Recettes pour attirer un Pokémon" },
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
  /** English (PokéAPI) name — surfaced as a secondary line when
   *  it diverges from the French. */
  nameEn?: string;
  type: string;
  category: string;
}
interface AbilityHit {
  slug: string;
  labelFr: string;
  labelEn: string;
}
interface ItemHit {
  /** URL slug (the existing `id` from the merged catalog — uses
   *  hyphens for curated items, underscores for wiki-only items;
   *  `/items/[id]` handles both. */
  slug: string;
  /** Cobblemon `cobblemon:`-namespaced id, used to pull the right
   *  inventory icon via `ItemIcon` (which hits the wiki/scraped
   *  image dictionary built by `build-cobblemon-items.mjs`). */
  iconId: string;
  /** Display label — already in French (PokéAPI FR + overrides). */
  labelFr: string;
  /** English name when known — surfaced as the secondary line so
   *  power-users searching "Choice Scarf" or "Vivichoke" still hit
   *  their entry even when the FR label diverges. */
  labelEn?: string;
}
interface SnackHit {
  id: string;
  name: string;
  snack: Pokesnack;
}

/**
 * Build a cheap searchable haystack for an entry. Lowercase, joined
 * with spaces — `String.includes` matches in microseconds on this
 * shape so we don't need a fancy fuzzy library for ~2.5k rows.
 */
function haystack(...parts: (string | number | undefined | null)[]): string {
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
        // Haystack includes the form label ("Galar", "Eau") and the
        // English species name so "slowpoke galar" or "rotom wash"
        // resolve as direct hits, not just "ramoloss" / "motisma".
        key: haystack(
          p.name,
          p.id,
          p.dexNumber,
          englishName(p),
          formLabel(p.id),
          ...p.types,
        ),
      })),
    [],
  );
  const moveIndex = useMemo<
    Array<MoveHit & { key: string }>
  >(
    () =>
      // Walk ALL_MOVE_IDS (937 entries, the full PokéAPI dump) instead
      // of the 40-move curated MOVES list — the user noticed Gonflette
      // (bulkup) was missing because it lives only in the generated
      // layer. `lookupMove` merges the curated + generated rows when
      // both exist so we never lose the hand-tuned FR for the staples.
      ALL_MOVE_IDS.map((id) => {
        const m = lookupMove(id);
        return {
          id,
          name: m?.name ?? id,
          nameEn: m?.nameEn,
          type: m?.type ?? "normal",
          category: m?.category ?? "physical",
          key: haystack(m?.name, m?.nameEn, id, m?.type, m?.category),
        };
      }),
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
  const itemIndex = useMemo<Array<ItemHit & { key: string }>>(() => {
    // English names live only in the wiki-scraped JSON — cross-
    // reference each merged catalog id (curated uses hyphens,
    // generated uses underscores) so we can search by both names.
    const enByKey = new Map<string, string>();
    for (const [slug, v] of Object.entries(
      generatedItems as Record<string, { nameEn?: string }>,
    )) {
      if (v.nameEn) enByKey.set(slug, v.nameEn);
    }
    return ITEMS.map((it) => {
      // `cobblemon:foo` is the form `ItemIcon` resolves through its
      // wiki / Bulbapedia / SVG fallback chain. Hyphenated curated
      // ids (`poke-ball`) need underscoring first.
      const iconId = `cobblemon:${it.id.replace(/-/g, "_")}`;
      const enKey = it.id.replace(/-/g, "_");
      const labelEn = enByKey.get(enKey);
      return {
        slug: it.id,
        iconId,
        labelFr: it.name,
        labelEn,
        // Searchable haystack — FR + EN + id + category so "ball",
        // "wool", "evolution" etc. surface relevant items even when
        // the player doesn't remember the exact name.
        key: haystack(it.name, labelEn, it.id, it.category),
      };
    });
  }, []);
  const snackIndex = useMemo<
    Array<SnackHit & { key: string }>
  >(
    () =>
      POKESNACKS.map((s) => ({
        id: s.id,
        name: s.name,
        snack: s,
        // Snacks live or die by which Pokémon / types they attract —
        // include those in the haystack so "dragon" / "pikachu"
        // surfaces the right snack.
        key: haystack(s.name, s.id, s.description, ...s.attractsTypes, ...s.attractsPokemonIds),
      })),
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
        snacks: [] as SnackHit[],
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
      snacks: snackIndex
        .filter((s) => s.key.includes(q))
        .slice(0, RESULTS_PER_CATEGORY),
    };
  }, [deferredQuery, pokemonIndex, moveIndex, abilityIndex, itemIndex, snackIndex]);

  const hasAnyResult =
    results.pokemon.length +
      results.moves.length +
      results.abilities.length +
      results.items.length +
      results.snacks.length >
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

      {/* `min-w-0` + `flex-1` lets the flex parent shrink this button
          below its intrinsic width on narrow screens — without it
          the button's content (icon + label + sibling theme toggle)
          pushed the row past the viewport. `md:max-w-md` caps the
          width on desktop so the search bar doesn't hog the row. */}
      <Button
        variant="outline"
        size="sm"
        className="min-w-0 flex-1 justify-start gap-2 overflow-hidden text-muted-foreground md:max-w-md"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        <span className="truncate md:hidden">Recherche…</span>
        <span className="hidden truncate md:inline">
          Rechercher Pokémon, attaque, type…
        </span>
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
                {results.pokemon.map((p) => {
                  const poke = POKEMON_BY_ID[p.id];
                  // Form label appended ("Ramoloss · Galar") to
                  // distinguish multiple entries that share the
                  // same species name; English in the shortcut
                  // slot so power-users searching by EN spelling
                  // can identify the hit at a glance.
                  const { primary, english } = displayNameWithEnglish(p);
                  return (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/pokedex/${p.id}`);
                      }}
                    >
                      {poke && (
                        <span className="grid size-5 shrink-0 place-items-center">
                          <PokemonSprite pokemon={poke} size="size-5" />
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">
                        #{p.dexNumber}
                      </span>
                      <span className="truncate">{primary}</span>
                      {english && (
                        <CommandShortcut className="italic">
                          {english}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {isSearching && results.moves.length > 0 && (
              <CommandGroup heading="Attaques">
                {results.moves.map((m) => {
                  // The FR name + English fallback are already resolved
                  // into the index, so the renderer doesn't hit
                  // `lookupMove` again on every keystroke.
                  const showEn = m.nameEn && m.nameEn !== m.name;
                  return (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/moves/${m.id}`);
                      }}
                    >
                      <span className="truncate">{m.name}</span>
                      <CommandShortcut className="flex items-center gap-1.5">
                        {showEn && (
                          <span className="italic opacity-70">{m.nameEn}</span>
                        )}
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
                      <ItemIcon item={it.iconId} size="size-5" />
                    </span>
                    <span className="truncate">{it.labelFr}</span>
                    {it.labelEn && it.labelEn !== it.labelFr && (
                      <CommandShortcut className="italic">
                        {it.labelEn}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isSearching && results.snacks.length > 0 && (
              <CommandGroup heading="PokéSnacks">
                {results.snacks.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.id}
                    onSelect={() => {
                      setOpen(false);
                      router.push("/pokesnacks");
                    }}
                  >
                    <Cookie className="size-3.5 text-amber-500/80" />
                    <span className="truncate">{s.name}</span>
                    <CommandShortcut className="flex items-center gap-1">
                      {s.snack.attractsTypes.slice(0, 3).map((t) => (
                        <TypeBadge
                          key={t}
                          type={t as PokemonTypeId}
                          size="sm"
                        />
                      ))}
                    </CommandShortcut>
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
