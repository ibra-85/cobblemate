import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { MovesExplorer } from "@/features/pokedex/moves-explorer";

/**
 * Dedicated move-pool page for a Pokémon. Lives in its own route so the
 * fiche détail stays calm, and so we can fit a real search + filter UI
 * (type, category, method) without cramping a fold above.
 */

export function generateStaticParams() {
  return POKEMON.map((p) => ({ id: p.id }));
}

export default async function PokemonMovesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pokemon = POKEMON_BY_ID[id];
  if (!pokemon) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link
        href={`/pokedex/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour à {pokemon.name}
      </Link>

      <header className="flex flex-col gap-0.5">
        <h1 className="font-heading text-3xl font-bold">
          Attaques de {pokemon.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Toutes les attaques apprenables, par méthode d&apos;apprentissage.
        </p>
      </header>

      <MovesExplorer pokemonId={pokemon.id} />
    </div>
  );
}
