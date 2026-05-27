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
import { ITEMS } from "@/data/items";
import { POKESNACKS } from "@/data/pokesnacks";
import { POKEMON_BY_ID } from "@/data/pokemon";
import type { Item, ItemCategory } from "@/types";

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
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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

function ItemCard({ item }: { item: Item }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{item.name}</CardTitle>
          {item.rarity && <Badge variant="outline">{item.rarity}</Badge>}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
        {item.obtain && <p>{item.obtain}</p>}
        {item.relatedPokemonIds && item.relatedPokemonIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.relatedPokemonIds.map((id) => {
              const p = POKEMON_BY_ID[id];
              if (!p) return null;
              return (
                <Link key={id} href={`/pokedex/${id}`}>
                  <Badge variant="secondary" className="hover:bg-accent">
                    {p.name}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
