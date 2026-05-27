"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON } from "@/data/pokemon";
import { baseStatTotal } from "@/lib/pokemon-utils";

function dailyIndex(date: Date): number {
  const day = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) | 0;
  return Math.abs(hash) % POKEMON.length;
}

/**
 * Renders inside a ColumnCard. The whole inner block is wrapped in a Link
 * so any click on the column body jumps to the Pokémon's detail page.
 */
export function FeaturedPokemon() {
  const featured = POKEMON[dailyIndex(new Date())];
  if (!featured) return null;

  return (
    <Link
      href={`/pokedex/${featured.id}`}
      className="group flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <div className="relative grid size-32 place-items-center">
        {/* Subtle ambient glow */}
        <div className="absolute inset-4 rounded-full bg-primary/5 blur-md" />
        <PokemonSprite
          pokemon={featured}
          variant="artwork"
          className="relative"
          priority
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] text-muted-foreground">
          #{featured.dexNumber.toString().padStart(4, "0")}
        </span>
        <h3 className="font-heading text-xl font-bold leading-tight">
          {featured.name}
        </h3>
        <TypeBadges types={featured.types} size="sm" />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Badge variant="secondary" className="font-mono">
          BST {baseStatTotal(featured)}
        </Badge>
        <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground">
          Fiche
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
