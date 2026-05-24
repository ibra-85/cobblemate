import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import type { Pokemon } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";

interface Props {
  pokemon: Pokemon;
  hrefQuery?: string;
}

export function PokemonCard({ pokemon, hrefQuery }: Props) {
  const href = `/pokedex/${pokemon.id}${hrefQuery ? `?${hrefQuery}` : ""}`;
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors hover:border-foreground/20 hover:bg-accent/40">
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              #{pokemon.dexNumber.toString().padStart(4, "0")}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              BST {baseStatTotal(pokemon)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <PokemonSprite pokemon={pokemon} size="size-14" />
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="truncate text-base group-hover:text-foreground">
                {pokemon.name}
              </CardTitle>
              <CardDescription className="truncate">
                Gen {pokemon.generation} · {pokemon.roles[0] ?? "—"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TypeBadges types={pokemon.types} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
