import { BookOpen } from "lucide-react";
import { PokedexExplorer } from "@/features/pokedex/pokedex-explorer";
import { POKEMON } from "@/data/pokemon";

export const metadata = { title: "Pokédex · CobbleMate" };

export default function PokedexPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-2 rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border bg-background">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              Pokédex Cobblemon
            </h1>
            <p className="text-sm text-muted-foreground">
              {POKEMON.length} Pokémon dans la base · filtre par type, génération,
              rareté ou puissance.
            </p>
          </div>
        </div>
      </header>
      <PokedexExplorer />
    </div>
  );
}
