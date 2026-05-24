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
import {
  getPokesnacksForPokemon,
  getSpawnsForPokemon,
} from "@/lib/search";
import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import { cn } from "@/lib/utils";

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
  const snacks = getPokesnacksForPokemon(pokemon.id);
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
            <PokemonSprite pokemon={pokemon} variant="artwork" />
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stats de base</CardTitle>
            <CardDescription>BST {bst}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(Object.entries(pokemon.baseStats) as [keyof typeof pokemon.baseStats, number][]).map(
              ([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium uppercase tracking-wide text-muted-foreground">
                      {k}
                    </span>
                    <span className="font-mono">{v}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground/80"
                      style={{ width: `${Math.min(100, (v / 200) * 100)}%` }}
                    />
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faiblesses & résistances</CardTitle>
            <CardDescription>
              Calcul automatique avec les deux types.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
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
            <CardTitle>Matchup complet</CardTitle>
            <CardDescription>
              Multiplicateur subi par type attaquant.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Attaques notables</CardTitle>
            <CardDescription>
              Sélection de moves utiles à monter.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
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
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spawns Cobblemon</CardTitle>
            <CardDescription>
              Où, quand et par quel temps il apparaît.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {spawns.length === 0 && (
              <p className="text-muted-foreground">Aucun spawn renseigné.</p>
            )}
            {spawns.map((s, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-wrap gap-1">
                  {s.biomes.map((b) => (
                    <Badge key={b} variant="secondary">{b}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.dayPeriod} · météo : {s.weather} · {s.dimension} · {s.rarity}
                  {s.minY != null && ` · Y ≥ ${s.minY}`}
                  {s.maxY != null && ` · Y ≤ ${s.maxY}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PokéSnacks recommandés</CardTitle>
            <CardDescription>Pour l&apos;attirer plus vite.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {snacks.length === 0 && (
              <p className="text-muted-foreground">
                Aucun PokéSnack référencé pour ce Pokémon.
              </p>
            )}
            {snacks.map((s) => (
              <div key={s.id} className="flex flex-col gap-1 rounded-md border p-3">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
