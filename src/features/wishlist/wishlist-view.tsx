"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { WishlistButton } from "@/components/site/wishlist-button";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { useWishlist } from "@/hooks/use-wishlist";
import { getPokesnacksForPokemon, getSpawnsForPokemon } from "@/lib/search";

export function WishlistView() {
  const { ids, hydrated, clear } = useWishlist();

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const items = ids
    .map((id) => POKEMON_BY_ID[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (items.length === 0) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} Pokémon · synchronisé localement.
        </p>
        <Button variant="outline" size="sm" onClick={clear}>
          <Trash2 data-icon="inline-start" />
          Vider
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => {
          const spawns = getSpawnsForPokemon(p.id);
          const snacks = getPokesnacksForPokemon(p.id);
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="grid size-14 place-items-center rounded-md border bg-muted p-1">
                    <PokemonSprite pokemon={p} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle className="text-base">
                      <Link href={`/pokedex/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      #{p.dexNumber} · Gen {p.generation}
                    </CardDescription>
                    <TypeBadges types={p.types} size="sm" />
                  </div>
                  <WishlistButton
                    pokemonId={p.id}
                    pokemonName={p.name}
                    size="icon"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {spawns.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      Où le trouver
                    </p>
                    {spawns.map((s, i) => (
                      <p key={i} className="text-xs">
                        <span className="font-medium">{s.biomes.join(", ")}</span>{" "}
                        · {s.dayPeriod} · {s.weather} · {s.rarity}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pas de spawn renseigné — vérifie un Pokémon proche.
                  </p>
                )}

                {snacks.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      Snacks recommandés
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {snacks.map((s) => (
                        <Badge key={s.id} variant="outline">{s.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
