"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, AlertTriangle, Zap, ShieldCheck, Skull, Swords, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TypeBadge, TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { PokemonPickerTrigger } from "@/features/team-builder/pokemon-picker-trigger";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { buildBattleRecommendation, getBestCounters } from "@/lib/battle";
import { resolveTeam } from "@/lib/team-analysis";
import type { TeamSlot } from "@/types";

const EMPTY_SLOTS = (): TeamSlot[] =>
  Array.from({ length: 6 }, () => ({ pokemonId: null }));

export function BattleHelper() {
  const { teams, hydrated } = useSavedTeams();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [adHocSlots, setAdHocSlots] = useState<TeamSlot[]>(EMPTY_SLOTS());
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const slots = teamId
    ? teams.find((t) => t.id === teamId)?.slots ?? EMPTY_SLOTS()
    : adHocSlots;

  const team = resolveTeam(slots);
  const opponent = opponentId ? POKEMON_BY_ID[opponentId] : null;

  const reco = useMemo(
    () => (opponent ? buildBattleRecommendation(team, opponent) : null),
    [team, opponent],
  );

  const rosterCounters = useMemo(
    () => (opponent ? getBestCounters(opponent).slice(0, 5) : []),
    [opponent],
  );

  const best =
    reco?.ranked.find((r) => r.bestOffense >= 2 && r.worstIncoming <= 1) ??
    reco?.ranked[0];

  function setAdHocSlot(i: number, id: string | null) {
    setAdHocSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, pokemonId: id } : s)));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Ton équipe</CardTitle>
          <CardDescription>
            Charge une équipe sauvegardée ou compose une équipe rapide.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {hydrated && teams.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Équipe :</span>
              <Select
                value={teamId ?? "ad-hoc"}
                onValueChange={(v) => setTeamId(v === "ad-hoc" ? null : v)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Équipe…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ad-hoc">Équipe rapide (cette session)</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Link href="/team-builder" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Ouvrir le builder
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {slots.map((s, i) => {
              const p = s.pokemonId ? POKEMON_BY_ID[s.pokemonId] : null;
              if (teamId) {
                return (
                  <div
                    key={i}
                    className="flex h-20 flex-col items-center justify-center gap-1 rounded-md border bg-card px-2 text-center text-xs"
                  >
                    {p ? (
                      <>
                        <PokemonSprite pokemon={p} size="size-10" />
                        <span className="truncate">{p.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">vide</span>
                    )}
                  </div>
                );
              }
              // Ad-hoc mode: use the same picker as the team builder.
              if (!p) {
                return (
                  <PokemonPicker
                    key={i}
                    onPick={(id) => setAdHocSlot(i, id)}
                    excludeIds={
                      adHocSlots
                        .map((x) => x.pokemonId)
                        .filter((x): x is string => Boolean(x))
                    }
                    trigger={
                      <button
                        type="button"
                        className="grid h-20 w-full place-items-center rounded-md border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        + Slot {i + 1}
                      </button>
                    }
                  />
                );
              }
              return (
                <div
                  key={i}
                  className="relative flex h-20 flex-col items-center justify-center gap-1 rounded-md border bg-card px-2 text-center text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setAdHocSlot(i, null)}
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                    aria-label="Retirer"
                  >
                    <X className="size-3" />
                  </button>
                  <PokemonSprite pokemon={p} size="size-10" />
                  <span className="truncate">{p.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Pokémon adverse</CardTitle>
          <CardDescription>
            Sélectionne la cible que tu affrontes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Searchable picker dialog instead of a 1186-row Select —
              same shortcut to filter by type and search by name as in
              the team builder. */}
          <PokemonPicker
            onPick={(id) => setOpponentId(id)}
            trigger={
              opponent ? (
                <PokemonPickerTrigger pokemon={opponent} className="max-w-sm" />
              ) : (
                <Button variant="outline" className="max-w-sm">
                  <Swords data-icon="inline-start" />
                  Choisir l&apos;adversaire…
                </Button>
              )
            }
          />
        </CardContent>
      </Card>

      {!opponent && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Choisis un adversaire pour voir la recommandation</EmptyTitle>
            <EmptyDescription>
              Les meilleurs Pokémon à envoyer s&apos;afficheront ici.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {reco && opponent && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="size-5" />
                <CardTitle>Recommandation</CardTitle>
              </div>
              <CardDescription>
                Le meilleur switch d&apos;après les types et le movepool connu.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sélectionne d&apos;abord ton équipe ci-dessus.
                </p>
              ) : best ? (
                <>
                  <div className="flex items-center gap-4 rounded-md border bg-card p-4">
                    <div className="grid size-16 place-items-center rounded-md bg-muted p-1">
                      <PokemonSprite pokemon={best.pokemon} />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Envoyer
                      </p>
                      <p className="font-heading text-xl font-bold">
                        {best.pokemon.name}
                      </p>
                      <TypeBadges types={best.pokemon.types} size="sm" />
                    </div>
                    <div className="flex flex-col gap-1 text-right text-xs">
                      <span>
                        Offense{" "}
                        <Badge variant="secondary" className="font-mono">
                          ×{best.bestOffense}
                        </Badge>
                      </span>
                      <span>
                        Subit{" "}
                        <Badge variant="destructive" className="font-mono">
                          ×{best.worstIncoming}
                        </Badge>
                      </span>
                    </div>
                  </div>

                  {best.bestMove && (
                    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                      <p className="text-xs uppercase text-muted-foreground">
                        Attaque conseillée
                      </p>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={best.bestMove.type} size="sm" />
                        <span className="font-medium">{best.bestMove.name}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {best.bestMove.power} pwr · {best.bestMove.accuracy} prec
                        </span>
                      </div>
                      {best.bestMove.effect && (
                        <p className="text-xs text-muted-foreground">
                          {best.bestMove.effect}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      Top 3 de ton équipe
                    </p>
                    <div className="flex flex-col gap-1 text-sm">
                      {reco.ranked.slice(0, 3).map((r) => (
                        <div
                          key={r.pokemon.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.pokemon.name}</span>
                            <TypeBadges types={r.pokemon.types} size="sm" />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            ×{r.bestOffense} off · ×{r.worstIncoming} def
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {reco.avoid.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 text-xs uppercase text-destructive">
                        <Skull className="size-3" /> À éviter
                      </div>
                      <div className="flex flex-col gap-1 text-sm">
                        {reco.avoid.map((r) => (
                          <div
                            key={r.pokemon.id}
                            className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                          >
                            <span className="font-medium">{r.pokemon.name}</span>
                            <span className="font-mono text-xs text-destructive">
                              subit ×{r.worstIncoming}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Adversaire</CardTitle>
                  <Badge variant="secondary">#{opponent.dexNumber}</Badge>
                </div>
                <CardDescription>{opponent.name}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-16 place-items-center rounded-md border bg-muted p-1">
                    <PokemonSprite pokemon={opponent} />
                  </div>
                  <TypeBadges types={opponent.types} size="sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                    <Zap className="size-3" /> Faiblesses
                  </div>
                  <TypeBadges types={reco.weaknesses} size="sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                    <ShieldCheck className="size-3" /> Résistances
                  </div>
                  <TypeBadges types={reco.resistances} size="sm" />
                </div>
                {reco.immunities.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs uppercase text-muted-foreground">Immunités</p>
                    <TypeBadges types={reco.immunities} size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>

            {rosterCounters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top contres du roster</CardTitle>
                  <CardDescription>
                    Les meilleurs Pokémon de toute la base contre {opponent.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  {rosterCounters.map((c) => (
                    <Link
                      key={c.pokemon.id}
                      href={`/pokedex/${c.pokemon.id}`}
                      className="flex items-center gap-3 rounded-md border px-2 py-1.5 hover:bg-accent"
                    >
                      <PokemonSprite pokemon={c.pokemon} size="size-8" />
                      <span className="flex-1 font-medium">{c.pokemon.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        ×{c.bestOffense} / ×{c.worstIncoming}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  <CardTitle>Couverture probable</CardTitle>
                </div>
                <CardDescription>
                  Types d&apos;attaques que l&apos;adversaire pourrait porter.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <TypeBadges types={reco.threatTypes} size="sm" />
                {opponent.dangerousCounters && opponent.dangerousCounters.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      Conseillés contre lui
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {opponent.dangerousCounters.map((id) => (
                        <Link key={id} href={`/pokedex/${id}`}>
                          <Badge variant="outline" className="hover:bg-accent">
                            {POKEMON_BY_ID[id]?.name ?? id}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
