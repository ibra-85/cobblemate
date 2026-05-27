"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { TYPES_META } from "@/data/types";
import type { Pokemon } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

interface Props {
  pokemon: Pokemon;
  hrefQuery?: string;
}

export function PokemonCard({ pokemon, hrefQuery }: Props) {
  const href = `/pokedex/${pokemon.id}${hrefQuery ? `?${hrefQuery}` : ""}`;
  const { has, toggle, hydrated } = useWishlist();
  const wished = has(pokemon.id);

  const primaryType = pokemon.types[0];
  const primaryColor = primaryType ? TYPES_META[primaryType].color : undefined;

  return (
    <div className="group relative">
      <Link href={href}>
        <Card className="relative h-full overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-foreground/30">
          {/* Type-tinted background accent — subtle gradient from primary type color */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] transition-opacity group-hover:opacity-[0.15]"
            style={
              primaryColor
                ? {
                    background: `radial-gradient(circle at top right, ${primaryColor} 0%, transparent 70%)`,
                  }
                : undefined
            }
          />

          <CardContent className="relative flex flex-col gap-3 p-4">
            {/* Dex number + BST in top row */}
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">
                #{pokemon.dexNumber.toString().padStart(4, "0")}
              </span>
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                BST {baseStatTotal(pokemon)}
              </span>
            </div>

            {/* Sprite — centered, large */}
            <div className="relative mx-auto grid size-24 place-items-center">
              <div
                aria-hidden
                className="absolute inset-3 rounded-full opacity-10 blur-xl transition-opacity group-hover:opacity-25"
                style={primaryColor ? { backgroundColor: primaryColor } : undefined}
              />
              <PokemonSprite
                pokemon={pokemon}
                className="relative transition-transform group-hover:scale-110"
              />
            </div>

            {/* Name + types */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="font-heading text-base font-semibold leading-tight">
                {pokemon.name}
              </h3>
              <TypeBadges types={pokemon.types} size="sm" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {hydrated && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(pokemon.id);
          }}
          className={cn(
            "absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full border bg-background/90 backdrop-blur transition",
            wished
              ? "text-destructive"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground",
          )}
          aria-label={wished ? "Retirer de la wishlist" : "Ajouter à la wishlist"}
        >
          <Heart className={cn("size-3.5", wished && "fill-current")} />
        </button>
      )}
    </div>
  );
}
