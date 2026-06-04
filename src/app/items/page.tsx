"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { ItemIcon } from "@/components/site/minecraft-item";
import { ITEMS } from "@/data/items";
import { POKESNACKS } from "@/data/pokesnacks";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { cn } from "@/lib/utils";
import type { Item, ItemCategory } from "@/types";

/** Most curated items map to Cobblemon items. Prefix with the
 *  `cobblemon:` namespace + underscore the id so `ItemIcon` can
 *  resolve a real texture via its lookup chain (registry → bundled
 *  sprite → PokéAPI → SVG fallback). Items the chain can't find
 *  fall back to the hand-drawn pixel-art sprite — never broken. */
function cobblemonItemId(id: string): string {
  return `cobblemon:${id.replace(/-/g, "_")}`;
}

const RARITY_TONE: Record<string, string> = {
  common:      "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
  uncommon:    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rare:        "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "ultra-rare": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

const RARITY_LABEL: Record<string, string> = {
  common:       "Commun",
  uncommon:     "Peu commun",
  rare:         "Rare",
  "ultra-rare": "Ultra rare",
};

const CATEGORIES: { id: ItemCategory | "snack" | "all"; label: string }[] = [
  { id: "all",       label: "Tout" },
  { id: "ball",      label: "Apricorn Balls" },
  { id: "held",      label: "Tenus" },
  { id: "evolution", label: "Évolution" },
  { id: "healing",   label: "Soins" },
  { id: "berry",     label: "Baies" },
  { id: "snack",     label: "PokéSnacks" },
];

export default function ItemsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof CATEGORIES)[number]["id"]>("all");

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ITEMS.filter((i) => {
      if (tab !== "all" && tab !== "snack" && i.category !== tab) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.id.includes(q))
        return false;
      return true;
    });
  }, [query, tab]);

  const filteredSnacks = useMemo(() => {
    const q = query.toLowerCase().trim();
    return POKESNACKS.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [query]);

  const showItems = tab !== "snack";
  const showSnacks = tab === "all" || tab === "snack";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Objets & PokéSnacks
        </h1>
        <p className="text-sm text-muted-foreground">
          Apricorn Balls, objets tenus, pierres évolutives, soins, baies et snacks.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Rechercher un objet ou snack…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <Tabs
          value={tab}
          onValueChange={(v) =>
            v && setTab(v as (typeof CATEGORIES)[number]["id"])
          }
        >
          <TabsList className="flex-wrap">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4 flex flex-col gap-6">
            {showItems && filteredItems.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((it) => (
                  <ItemCard key={it.id} item={it} />
                ))}
              </div>
            )}

            {showSnacks && filteredSnacks.length > 0 && (
              <div className="flex flex-col gap-3">
                {tab === "all" && (
                  <h2 className="font-heading text-lg font-semibold">
                    PokéSnacks
                  </h2>
                )}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSnacks.map((s) => (
                    <Card key={s.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{s.name}</CardTitle>
                          <Badge variant="outline">{s.rarity}</Badge>
                        </div>
                        <CardDescription>{s.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs uppercase text-muted-foreground">
                            Attire
                          </p>
                          <TypeBadges types={s.attractsTypes} size="sm" />
                        </div>
                        {s.attractsPokemonIds.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.attractsPokemonIds.map((id) => {
                              const p = POKEMON_BY_ID[id];
                              if (!p) return null;
                              return (
                                <Link key={id} href={`/pokedex/${id}`}>
                                  <Badge
                                    variant="secondary"
                                    className="gap-1.5 hover:bg-accent"
                                  >
                                    <span className="grid size-4 place-items-center">
                                      <PokemonSprite pokemon={p} size="size-4" />
                                    </span>
                                    {p.name}
                                  </Badge>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {((showItems && filteredItems.length === 0) || tab === "snack") &&
              filteredSnacks.length === 0 &&
              filteredItems.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Rien à afficher</EmptyTitle>
                    <EmptyDescription>
                      Aucun résultat pour ces filtres. Essaie une autre catégorie.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Item catalogue card. Visual chrome inspired by the `CompetitorCard`
 * from the "Où le trouver" section — same `rounded-md`, accent
 * hover, hover-lift — so the items page reads as part of the same
 * design system as the Pokédex detail pages.
 *
 * The whole card is a `<Link>` to `/items/<id>`. Related-Pokémon
 * badges are rendered *outside* that link (as siblings inside the
 * outer container) to avoid the nested-anchor hydration error that
 * bit the evolution panel earlier — invalid HTML, dev mode warning,
 * and Safari renders the inner anchor as inert.
 */
function ItemCard({ item }: { item: Item }) {
  const rawId = cobblemonItemId(item.id);
  const related = (item.relatedPokemonIds ?? [])
    .map((id) => POKEMON_BY_ID[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <div className="group/card flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/30">
      <Link
        href={`/items/${item.id}`}
        className="flex flex-1 flex-col gap-2 no-underline"
        title={`Voir le détail de ${item.name}`}
      >
        <div className="flex items-start gap-3">
          <ItemIcon
            item={rawId}
            size="size-10"
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <h3 className="line-clamp-1 text-sm font-semibold leading-tight">
                {item.name}
              </h3>
              {item.rarity && (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide",
                    RARITY_TONE[item.rarity] ?? "bg-muted/40",
                  )}
                >
                  {RARITY_LABEL[item.rarity] ?? item.rarity}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
        {item.obtain && (
          <p className="line-clamp-2 rounded-md border bg-muted/30 px-2 py-1 text-[11px] leading-snug text-muted-foreground">
            {item.obtain}
          </p>
        )}
      </Link>

      {/* Related Pokémon sit *outside* the item link — their badges
          are themselves `<Link>` to `/pokedex/...`, so nesting them
          inside would be invalid HTML. */}
      {related.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t pt-2">
          {related.map((p) => (
            <Link
              key={p.id}
              href={`/pokedex/${p.id}`}
              className="no-underline"
            >
              <Badge
                variant="secondary"
                className="gap-1 px-1.5 text-[10px] hover:bg-accent"
              >
                <span className="grid size-3.5 place-items-center">
                  <PokemonSprite pokemon={p} size="size-3.5" />
                </span>
                {p.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
