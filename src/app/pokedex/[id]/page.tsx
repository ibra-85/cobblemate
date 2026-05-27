import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TypeBadges, TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { MOVE_BY_ID } from "@/data/moves";
import {
  getPokemonImmunities,
  getPokemonResistances,
  getPokemonWeaknesses,
  baseStatTotal,
} from "@/lib/pokemon-utils";
import { getSpawnsForPokemon } from "@/lib/search";
import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import { cn } from "@/lib/utils";
import { StrategySheet } from "@/features/pokedex/strategy-sheet";
import { WishlistButton } from "@/components/site/wishlist-button";
import { CompareDialog } from "@/features/pokedex/compare-dialog";
import { StatsRadar } from "@/features/pokedex/stats-radar";
import { StatsVsAverage } from "@/features/pokedex/stats-vs-average";
import { MatchupDonut } from "@/features/pokedex/matchup-donut";
import { BaitRecommendations } from "@/features/pokedex/bait-recommendations";
import { SpawnDetails } from "@/features/pokedex/spawn-details";
import { SpeciesExtrasCard } from "@/features/pokedex/species-extras-card";

export function generateStaticParams() {
  return POKEMON.map((p) => ({ id: p.id }));
}

function matchupClass(m: number) {
  if (m === 0) return "bg-muted text-muted-foreground line-through";
  if (m >= 2) return "bg-destructive/15 text-destructive";
  if (m < 1) return "bg-primary/10 text-foreground";
  return "bg-card text-muted-foreground";
}

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pokemon = POKEMON_BY_ID[id];
  if (!pokemon) notFound();

  const weaknesses = getPokemonWeaknesses(pokemon);
  const resistances = getPokemonResistances(pokemon);
  const immunities = getPokemonImmunities(pokemon);
  const quadWeak = weaknesses.filter(
    (t) => calculateTypeEffectiveness(t, pokemon.types) === 4,
  );
  const spawns = getSpawnsForPokemon(pokemon.id);
  const bst = baseStatTotal(pokemon);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/pokedex"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour au Pokédex
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="grid size-32 flex-shrink-0 place-items-center rounded-xl border bg-muted p-2">
            <PokemonSprite pokemon={pokemon} variant="artwork" priority />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                #{pokemon.dexNumber.toString().padStart(4, "0")}
              </span>
              <h1 className="font-heading text-3xl font-bold">{pokemon.name}</h1>
              <Badge variant="secondary">Gen {pokemon.generation}</Badge>
            </div>
            <TypeBadges types={pokemon.types} />
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Talents : {pokemon.abilities.join(", ")}</Badge>
              {pokemon.hiddenAbility && (
                <Badge variant="outline">Caché : {pokemon.hiddenAbility}</Badge>
              )}
              {pokemon.roles.map((r) => (
                <Badge key={r}>{r}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <WishlistButton pokemonId={pokemon.id} pokemonName={pokemon.name} />
              <CompareDialog pokemon={pokemon} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="combat">Combat & stratégie</TabsTrigger>
          <TabsTrigger value="capture">Captures</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Profil de stats</CardTitle>
                <CardDescription>BST {bst} · forme du sextet</CardDescription>
              </CardHeader>
              <CardContent>
                <StatsRadar pokemon={pokemon} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>vs moyenne roster</CardTitle>
                <CardDescription>
                  Où il dépasse / sous-performe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsVsAverage pokemon={pokemon} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matchup global</CardTitle>
                <CardDescription>
                  Répartition des 18 types attaquants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MatchupDonut pokemon={pokemon} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Faiblesses & résistances</CardTitle>
              <CardDescription>
                Calcul automatique avec les deux types.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
              {quadWeak.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase text-destructive">
                    ×4 (très dangereux)
                  </p>
                  <TypeBadges types={quadWeak} size="sm" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Faiblesses (≥×2)
                </p>
                <TypeBadges
                  types={weaknesses.filter((t) => !quadWeak.includes(t))}
                  size="sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Résistances
                </p>
                <TypeBadges types={resistances} size="sm" />
              </div>
              {immunities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Immunités
                  </p>
                  <TypeBadges types={immunities} size="sm" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matchup détaillé</CardTitle>
              <CardDescription>
                Multiplicateur subi par type attaquant.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
              {ALL_TYPES.map((t) => {
                const m = calculateTypeEffectiveness(t, pokemon.types);
                return (
                  <div
                    key={t}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1",
                      matchupClass(m),
                    )}
                  >
                    <span>{TYPES_META[t].label}</span>
                    <span className="font-mono font-semibold">×{m}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {pokemon.evolutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Évolutions</CardTitle>
                <CardDescription>Chaîne d&apos;évolution Cobblemon.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary">{pokemon.name}</Badge>
                {pokemon.evolutions.map((e) => {
                  const target = POKEMON_BY_ID[e.to];
                  return (
                    <div key={e.to} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">→ {e.method}</span>
                      {target ? (
                        <Link href={`/pokedex/${e.to}`}>
                          <Badge variant="outline" className="hover:bg-accent">
                            {target.name}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline">{e.to}</Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="combat" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Attaques notables</CardTitle>
              <CardDescription>
                Sélection de moves utiles à monter.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              {pokemon.notableMoves.map((mid) => {
                const m = MOVE_BY_ID[mid];
                if (!m) {
                  return (
                    <div key={mid} className="text-muted-foreground">
                      {mid} <span className="text-xs">(détails à venir)</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={mid}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <TypeBadge type={m.type} size="sm" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {m.power ?? "—"} pwr · {m.accuracy ?? "—"} prec
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {(pokemon.strategyTips || pokemon.goodPartners || pokemon.dangerousCounters) && (
            <Card>
              <CardHeader>
                <CardTitle>Stratégie</CardTitle>
                <CardDescription>Comment l&apos;utiliser, avec qui.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {pokemon.strategyTips && <p>{pokemon.strategyTips}</p>}
                {pokemon.goodPartners && pokemon.goodPartners.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Bons partenaires
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pokemon.goodPartners.map((id) => {
                          const partner = POKEMON_BY_ID[id];
                          if (!partner) return <Badge key={id} variant="outline">{id}</Badge>;
                          return (
                            <Link key={id} href={`/pokedex/${id}`}>
                              <Badge variant="outline" className="hover:bg-accent">{partner.name}</Badge>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                {pokemon.dangerousCounters && pokemon.dangerousCounters.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase text-destructive">
                      Contres dangereux
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.dangerousCounters.map((id) => {
                        const c = POKEMON_BY_ID[id];
                        if (!c) return <Badge key={id} variant="outline">{id}</Badge>;
                        return (
                          <Link key={id} href={`/pokedex/${id}`}>
                            <Badge variant="destructive">{c.name}</Badge>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <StrategySheet pokemon={pokemon} />
        </TabsContent>

        <TabsContent value="capture" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spawns Cobblemon</CardTitle>
                <CardDescription>
                  Où, quand et par quel temps il apparaît.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {!spawns ? (
                  <p className="text-muted-foreground">
                    Aucun spawn naturel — obtenu via évolution, structure
                    ou objet clé.
                  </p>
                ) : (
                  <SpawnDetails spawn={spawns} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Poké Snack recommandé</CardTitle>
                <CardDescription>
                  Appâts Cobblemon : par type, et boosts génériques.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BaitRecommendations pokemon={pokemon} />
              </CardContent>
            </Card>
          </div>

          <SpeciesExtrasCard pokemonId={pokemon.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
