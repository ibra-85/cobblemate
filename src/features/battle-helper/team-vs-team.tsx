"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import type { Pokemon, TeamSlot } from "@/types";
import { calculateTypeEffectiveness } from "@/lib/type-chart";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { resolveTeam } from "@/lib/team-analysis";
import { getBestTeamMemberAgainst } from "@/lib/battle";
import { cn } from "@/lib/utils";

interface MatchupCell {
  offense: number;
  defense: number;
}

function matchupCellClass(c: MatchupCell) {
  // Combine offense and defense into a single colored cell.
  if (c.offense >= 2 && c.defense <= 1) return "bg-primary/30 text-foreground";
  if (c.offense >= 2 && c.defense >= 2) return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
  if (c.offense < 1 && c.defense >= 2) return "bg-destructive/25 text-destructive";
  if (c.offense >= 2) return "bg-primary/15 text-foreground";
  if (c.defense >= 2) return "bg-destructive/15 text-destructive";
  if (c.defense === 0) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

function bestOffense(attacker: Pokemon, defender: Pokemon) {
  return Math.max(
    ...attacker.types.map((t) => calculateTypeEffectiveness(t, defender.types)),
  );
}

function worstIncoming(defender: Pokemon, attacker: Pokemon) {
  return Math.max(
    ...attacker.types.map((t) => calculateTypeEffectiveness(t, defender.types)),
  );
}

const EMPTY_SLOTS = (): TeamSlot[] =>
  Array.from({ length: 6 }, () => ({ pokemonId: null }));

export function TeamVsTeam() {
  const { teams, hydrated } = useSavedTeams();
  const [mySlots, setMySlots] = useState<TeamSlot[]>(EMPTY_SLOTS());
  const [enemySlots, setEnemySlots] = useState<TeamSlot[]>(EMPTY_SLOTS());
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);

  const myTeam = resolveTeam(mySlots);
  const enemyTeam = resolveTeam(enemySlots);

  function setMyAt(i: number, id: string | null) {
    setMySlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, pokemonId: id } : s)),
    );
    setLoadedTeamId(null);
  }
  function setEnemyAt(i: number, id: string | null) {
    setEnemySlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, pokemonId: id } : s)),
    );
  }

  function loadSavedTeam(id: string) {
    const t = teams.find((x) => x.id === id);
    if (!t) return;
    setMySlots(t.slots);
    setLoadedTeamId(id);
  }

  /**
   * Per-enemy best counter from my team. The picked Pokémon is highlighted
   * with a ring in the matrix below.
   */
  const bestCounters = useMemo(() => {
    if (myTeam.length === 0) return new Map<string, string>();
    return new Map(
      enemyTeam.map((e) => {
        const ranked = getBestTeamMemberAgainst(myTeam, e);
        const top =
          ranked.find((r) => r.bestOffense >= 2 && r.worstIncoming <= 1) ??
          ranked[0];
        return [e.id, top?.pokemon.id ?? ""];
      }),
    );
  }, [myTeam, enemyTeam]);

  const myIds = mySlots
    .map((s) => s.pokemonId)
    .filter((x): x is string => Boolean(x));
  const enemyIds = enemySlots
    .map((s) => s.pokemonId)
    .filter((x): x is string => Boolean(x));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ton équipe</CardTitle>
          <CardDescription>
            Charge une équipe sauvegardée ou compose à la volée.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hydrated && teams.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => loadSavedTeam(t.id)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition-colors",
                    loadedTeamId === t.id
                      ? "border-foreground/40 bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <TeamSlots
            slots={mySlots}
            onPick={(i, id) => setMyAt(i, id)}
            onClear={(i) => setMyAt(i, null)}
            excludeIds={myIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Équipe adverse</CardTitle>
          <CardDescription>
            Ajoute jusqu&apos;à 6 Pokémon vus en face.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamSlots
            slots={enemySlots}
            onPick={(i, id) => setEnemyAt(i, id)}
            onClear={(i) => setEnemyAt(i, null)}
            excludeIds={enemyIds}
          />
        </CardContent>
      </Card>

      {myTeam.length === 0 || enemyTeam.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Composer les deux équipes</EmptyTitle>
            <EmptyDescription>
              Dès qu&apos;il y a au moins 1 Pokémon de chaque côté, la matrice
              de matchups s&apos;affiche.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <MatchupMatrix
          myTeam={myTeam}
          enemyTeam={enemyTeam}
          bestCounters={bestCounters}
        />
      )}
    </div>
  );
}

function TeamSlots({
  slots,
  onPick,
  onClear,
  excludeIds,
}: {
  slots: TeamSlot[];
  onPick: (i: number, id: string) => void;
  onClear: (i: number) => void;
  excludeIds: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
      {slots.map((s, i) => {
        const p = s.pokemonId ? POKEMON_BY_ID[s.pokemonId] : null;
        if (!p) {
          return (
            <PokemonPicker
              key={i}
              onPick={(id) => onPick(i, id)}
              excludeIds={excludeIds}
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
              onClick={() => onClear(i)}
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
  );
}

function MatchupMatrix({
  myTeam,
  enemyTeam,
  bestCounters,
}: {
  myTeam: Pokemon[];
  enemyTeam: Pokemon[];
  bestCounters: Map<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice de matchups</CardTitle>
        <CardDescription>
          Chaque cellule = ton STAB max sur l&apos;ennemi / son STAB max sur toi.
          Surligné = meilleur switch contre cet ennemi.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-2 text-left text-muted-foreground">
                Toi ↓ / Ennemi →
              </th>
              {enemyTeam.map((e) => (
                <th key={e.id} className="p-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <PokemonSprite pokemon={e} size="size-8" />
                    <span className="truncate text-[10px]">{e.name}</span>
                    <div className="flex gap-0.5">
                      {e.types.map((t) => (
                        <span
                          key={t}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: TYPES_META[t].color }}
                        />
                      ))}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myTeam.map((m) => (
              <tr key={m.id} className="border-t">
                <th className="sticky left-0 z-10 bg-card p-2 text-left">
                  <div className="flex items-center gap-2">
                    <PokemonSprite pokemon={m} size="size-7" />
                    <span className="text-xs font-medium">{m.name}</span>
                  </div>
                </th>
                {enemyTeam.map((e) => {
                  const offense = bestOffense(m, e);
                  const defense = worstIncoming(m, e);
                  const isBest = bestCounters.get(e.id) === m.id;
                  return (
                    <td
                      key={e.id}
                      className={cn(
                        "p-1 text-center font-mono",
                        matchupCellClass({ offense, defense }),
                        isBest && "ring-2 ring-foreground ring-inset",
                      )}
                      title={`${m.name} → ${e.name}: ×${offense} offense, subit ×${defense}`}
                    >
                      <div className="leading-tight">
                        <div>×{offense}</div>
                        <div className="text-[9px] opacity-60">×{defense}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="bg-primary/30">
            offense forte + défense ok
          </Badge>
          <Badge variant="outline" className="bg-primary/15">
            offense forte
          </Badge>
          <Badge variant="outline" className="bg-destructive/15 text-destructive">
            défense fragile
          </Badge>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
            mutuel danger
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            immunité
          </Badge>
          <Badge variant="outline" className="ring-2 ring-foreground ring-inset">
            meilleur switch
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
