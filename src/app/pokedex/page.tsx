import { PokedexExplorer } from "@/features/pokedex/pokedex-explorer";

export const metadata = { title: "Pokédex · CobbleMate" };

export default function PokedexPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Pokédex Cobblemon</h1>
        <p className="text-sm text-muted-foreground">
          Recherche, filtre par type, génération, rôle ou biome.
        </p>
      </header>
      <PokedexExplorer />
    </div>
  );
}
