import type { Metadata } from "next";
import { BiomeExplorer } from "@/features/biomes/biome-explorer";

export const metadata: Metadata = {
  title: "Biomes — CobbleMate",
  description:
    "Explorateur de spawns par biome : choisis un biome Cobblemon et vois tous les Pokémon qui peuvent y apparaître, avec rareté, niveaux et conditions.",
};

/**
 * `/biomes` — reverse spawn lookup. The Pokédex answers "where does
 * this Pokémon spawn?"; this page answers the question the player
 * actually has in-game: "I'm standing HERE, what can spawn around
 * me?". `?biome=is_jungle` deep-links a specific category.
 */
export default async function BiomesPage({
  searchParams,
}: {
  searchParams: Promise<{ biome?: string }>;
}) {
  const { biome } = await searchParams;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Biomes
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisis un biome pour voir tous les Pokémon qui peuvent y spawner —
          rareté, niveaux et conditions. L&apos;inverse du Pokédex : « je suis
          ici, qui peut apparaître ? »
        </p>
      </header>

      <BiomeExplorer initialBiome={typeof biome === "string" ? biome : undefined} />
    </div>
  );
}
