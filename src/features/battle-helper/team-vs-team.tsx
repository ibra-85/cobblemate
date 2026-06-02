"use client";

import { useMemo } from "react";
import { Swords, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import type { Pokemon, PokemonTypeId, TeamSlot } from "@/types";
import { calculateTypeEffectiveness } from "@/lib/type-chart";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { resolveTeam } from "@/lib/team-analysis";
import { getBestTeamMemberAgainst } from "@/lib/battle";
import {
  combatActions,
  EMPTY_COMBAT_SLOTS,
  useCombatStore,
} from "@/lib/combat-store";
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

export function TeamVsTeam() {
  const { teams, hydrated } = useSavedTeams();
  const { myTeamId, myAdHocSlots, enemySlots } = useCombatStore();

  // Resolve which slots feed the matrix — when a saved team is loaded,
  // pull live from the saved-teams store (so a builder edit propagates
  // here without an extra sync). Otherwise the user is composing an
  // ad-hoc team and we use their scratch state.
  const mySlots: TeamSlot[] = myTeamId
    ? teams.find((t) => t.id === myTeamId)?.slots ?? EMPTY_COMBAT_SLOTS()
    : myAdHocSlots;

  const myTeam = resolveTeam(mySlots);
  const enemyTeam = resolveTeam(enemySlots);

  function setMyAt(i: number, id: string | null) {
    // If a saved team is loaded, detach by copying its current slots into
    // ad-hoc before patching — otherwise the action would clear myTeamId
    // *and* reset every untouched slot, wiping the other 5 Pokémon.
    const base = myTeamId ? mySlots : myAdHocSlots;
    const next = base.map((s, idx) =>
      idx === i ? { ...s, pokemonId: id } : s,
    );
    combatActions.setMyAdHocSlots(next);
  }
  function setEnemyAt(i: number, id: string | null) {
    combatActions.setEnemySlot(i, { pokemonId: id });
  }

  // Same override pattern as the assistant — when the user loaded a
  // saved team with declared moves, the matrix's "best counter"
  // calculation uses *those* moves, not the species' notableMoves.
  const myMovesOverride = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of mySlots) {
      if (s.pokemonId && s.selectedMoves && s.selectedMoves.length > 0) {
        m.set(s.pokemonId, s.selectedMoves);
      }
    }
    return m.size > 0 ? m : undefined;
  }, [mySlots]);

  /**
   * Per-enemy best counter from my team. The picked Pokémon is highlighted
   * with a ring in the matrix below. When the enemy slot has declared
   * moves, those are passed as the threat-type source so a Garchomp
   * carrying Fire Blast is correctly seen as a Steel-killer (not just
   * Ground/Dragon).
   */
  const bestCounters = useMemo(() => {
    if (myTeam.length === 0) return new Map<string, string>();
    // Index enemy slots by pokemonId so we can pull their declared
    // moves for the threat read.
    const enemyMoves = new Map<string, string[]>();
    for (const s of enemySlots) {
      if (s.pokemonId && s.selectedMoves && s.selectedMoves.length > 0) {
        enemyMoves.set(s.pokemonId, s.selectedMoves);
      }
    }
    return new Map(
      enemyTeam.map((e) => {
        const ranked = getBestTeamMemberAgainst(
          myTeam,
          e,
          myMovesOverride,
          enemyMoves.get(e.id),
        );
        const top =
          ranked.find((r) => r.bestOffense >= 2 && r.worstIncoming <= 1) ??
          ranked[0];
        return [e.id, top?.pokemon.id ?? ""];
      }),
    );
  }, [myTeam, enemyTeam, myMovesOverride, enemySlots]);

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
                  onClick={() => combatActions.loadSavedTeam(t.id)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition-colors",
                    myTeamId === t.id
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/30 px-6 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Swords className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Composer les deux équipes</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Dès qu&apos;il y a au moins 1 Pokémon de chaque côté, la
              matrice de matchups s&apos;affiche.
            </p>
          </div>
        </div>
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
                  className="group/empty flex h-full min-h-[8.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/30 text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/30 hover:text-primary"
                >
                  <span className="grid size-9 place-items-center rounded-full border border-dashed border-current transition-transform duration-200 ease-out group-hover/empty:scale-110">
                    <Swords className="size-4" />
                  </span>
                  <span className="text-[11px] font-medium">Ajouter</span>
                </button>
              }
            />
          );
        }
        return <FilledMatchupSlot key={i} pokemon={p} onClear={() => onClear(i)} />;
      })}
    </div>
  );
}

/**
 * Premium-styled slot for the team-vs-team matrix inputs. Mirrors the
 * compact slot used by the battle assistant — same halo, same hover
 * lift — so the two pages feel like one feature.
 */
function FilledMatchupSlot({
  pokemon,
  onClear,
}: {
  pokemon: Pokemon;
  onClear: () => void;
}) {
  const t1 = pokemon.types[0] as PokemonTypeId;
  const t2 = (pokemon.types[1] ?? pokemon.types[0]) as PokemonTypeId;
  const c1 = TYPES_META[t1]?.color ?? "#888";
  const c2 = TYPES_META[t2]?.color ?? "#888";
  return (
    <div
      className="group/slot relative h-full"
      style={
        {
          "--type-accent": `${c1}66`,
          "--type-glow": `${c1}33`,
        } as React.CSSProperties
      }
    >
      <div className="relative flex h-full flex-col items-center gap-1.5 overflow-hidden rounded-xl border bg-card px-2 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg hover:shadow-[var(--type-glow)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-20 blur-2xl"
          style={{
            background: `radial-gradient(55% 60% at 35% 45%, ${c1}28, transparent 70%), radial-gradient(50% 55% at 70% 60%, ${c2}1f, transparent 70%)`,
          }}
        />
        <div className="relative z-10 transition-transform duration-200 ease-out group-hover/slot:scale-[1.06]">
          <PokemonSprite pokemon={pokemon} size="size-14 md:size-16" />
        </div>
        <span className="relative z-10 truncate text-xs font-semibold leading-tight">
          {pokemon.name}
        </span>
        <div className="relative z-10">
          <TypeBadges types={pokemon.types} size="sm" />
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="absolute right-1.5 top-1.5 z-20 grid size-5 cursor-pointer place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-destructive group-hover/slot:opacity-100 focus-visible:opacity-100"
        aria-label={`Retirer ${pokemon.name}`}
      >
        <X className="size-3" />
      </button>
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
