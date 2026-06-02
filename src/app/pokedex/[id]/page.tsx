import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { getSpawnsForPokemon } from "@/lib/search";
import { PokemonHero } from "@/features/pokedex/pokemon-hero";
import { EvolutionColumn } from "@/features/pokedex/evolution-column";
import { hasEvolutions } from "@/features/pokedex/evolution-chain";
import { WeaknessCompact } from "@/features/pokedex/weakness-compact";
import { PokeSnackCooking } from "@/features/pokedex/poke-snack-cooking";
import { CatchingGuide } from "@/features/pokedex/catching-guide";
import { DropsCard } from "@/features/pokedex/drops-card";
import { hasDrops } from "@/data/species-extras";
import { MovesExplorer } from "@/features/pokedex/moves-explorer";
import { StrategySection, TeammatesSection, hasTeammates } from "@/features/pokedex/strategy-section";

export function generateStaticParams() {
  return POKEMON.map((p) => ({ id: p.id }));
}

/**
 * Pokémon detail page — v3, beginner-first.
 *
 * Each major section sits in its own Card so the page reads as a tidy
 * stack of self-contained blocks rather than a free-flowing wall.
 */
export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pokemon = POKEMON_BY_ID[id];
  if (!pokemon) notFound();

  const spawn = getSpawnsForPokemon(pokemon.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/pokedex"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour au Pokédex
      </Link>

      {/* Hero + evolutions column. The two-column grid only kicks in
          at `xl` (1280px+) — below that the hero would lose ~300px of
          breathing room and its inner artwork/details/stats grid
          starts wrapping. Solo species collapse the grid to a single
          column regardless. */}
      {hasEvolutions(pokemon) ? (
        <div className="grid items-stretch gap-6 xl:grid-cols-[1fr_300px]">
          <PokemonHero pokemon={pokemon} spawn={spawn} />
          <EvolutionColumn pokemon={pokemon} />
        </div>
      ) : (
        <PokemonHero pokemon={pokemon} spawn={spawn} />
      )}

      {/* Stratégie : conseils auto-déduits + notes curatées si dispo */}
      <SectionCard
        title="Stratégie de combat"
        description="Rôle estimé, build conseillé, moveset suggéré — basé sur les stats et types."
      >
        <StrategySection pokemon={pokemon} />
      </SectionCard>

      {/* Poké Snack */}
      <SectionCard
        title={`Cuisiner un Poké Snack pour ${pokemon.name}`}
        description="Recette Cobblemon avec les assaisonnements qui l'attirent. Change de mode selon l'objectif."
      >
        <PokeSnackCooking pokemon={pokemon} />
      </SectionCard>

      {/* Coéquipiers — Smogon meta teammates, only when we have ladder data */}
      {hasTeammates(pokemon.id) && <TeammatesSection pokemon={pokemon} />}

      {/* Faiblesses */}
      <SectionCard title="Faiblesses & résistances">
        <WeaknessCompact pokemon={pokemon} />
      </SectionCard>

      {/* Où le trouver */}
      <SectionCard
        title="Où le trouver"
        description="Biomes compatibles et autres Pokémon qui occupent les mêmes spots."
      >
        <CatchingGuide pokemon={pokemon} spawn={spawn} />
      </SectionCard>

      {/* Drops & loot — Cobblemon-specific farming data. Hidden when
          the species has no drop table so the page stays tight for
          unobtainable forms. */}
      {hasDrops(pokemon.id) && (
        <SectionCard
          title="Drops & loot"
          description="Objets qui peuvent tomber après un K.O. — utile pour planifier les farms."
        >
          <DropsCard pokemonId={pokemon.id} />
        </SectionCard>
      )}

      {/* Attaques — at the bottom of the page; full explorer inline */}
      <SectionCard
        title="Attaques apprenables"
        description="Toutes les attaques, recherche et filtres directement ici. Une page complète existe aussi."
      >
        <MovesExplorer pokemonId={pokemon.id} />
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
