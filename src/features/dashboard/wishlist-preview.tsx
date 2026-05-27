"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { useWishlist } from "@/hooks/use-wishlist";
import { getSpawnsForPokemon } from "@/lib/search";

export function WishlistPreview() {
  const { ids, hydrated } = useWishlist();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Synchronisation…
      </div>
    );
  }

  const items = ids
    .map((id) => POKEMON_BY_ID[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="grid size-12 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <Heart className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Wishlist vide</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Marque tes prochaines captures depuis n&apos;importe quelle fiche
            Pokémon.
          </p>
        </div>
        <Link
          href="/pokedex"
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Parcourir le Pokédex
          <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      {items.slice(0, 5).map((p) => {
        const spawn = getSpawnsForPokemon(p.id)[0];
        return (
          <Link
            key={p.id}
            href={`/pokedex/${p.id}`}
            className="group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/40"
          >
            <div className="grid size-9 place-items-center rounded-md border bg-muted p-1">
              <PokemonSprite pokemon={p} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{p.name}</span>
              {spawn ? (
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {spawn.biomes[0]}
                  </Badge>
                  <span>·</span>
                  <span>{spawn.rarity}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  pas de spawn renseigné
                </span>
              )}
            </div>
            <Heart className="size-4 fill-current text-destructive" />
          </Link>
        );
      })}
      {items.length > 5 && (
        <Link
          href="/wishlist"
          className="mt-auto inline-flex items-center justify-center gap-1 rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Voir les {items.length - 5} autres
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
