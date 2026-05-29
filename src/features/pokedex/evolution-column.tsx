import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvolutionChain, hasEvolutions } from "./evolution-chain";
import type { Pokemon } from "@/types";

/**
 * Vertical evolution panel meant to sit next to the hero card on
 * large viewports. Returns `null` for solo species so the parent
 * grid naturally collapses to a single column.
 *
 * Match-height comes from the parent grid's default `items-stretch`
 * — the inner scroll area kicks in when the chain is too tall to fit
 * the hero's natural height.
 */
export function EvolutionColumn({ pokemon }: { pokemon: Pokemon }) {
  if (!hasEvolutions(pokemon)) return null;
  return (
    // `h-full` lets the card match the hero's height through the
    // parent grid's `items-stretch`; the inner flex lets the chain
    // distribute its stages evenly down the available column.
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4 text-muted-foreground" />
          Évolutions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-y-auto">
        <EvolutionChain pokemon={pokemon} orientation="vertical" fillHeight />
      </CardContent>
    </Card>
  );
}
