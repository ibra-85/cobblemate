"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TypeBadge } from "@/components/site/type-badge";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { MOVES, lookupMove } from "@/data/moves";
import { getSpeciesExtras } from "@/data/species-extras";
import { calculateDamage } from "@/lib/damage";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { PokemonPickerTrigger } from "@/features/team-builder/pokemon-picker-trigger";
import type { Move, Pokemon } from "@/types";

/**
 * Resolve a list of move ids into the typed `Move` records, deduping
 * by id and dropping unknowns. Centralised so the multi-tier
 * `availableMoves` pipeline doesn't repeat the same map/filter dance
 * for each tier.
 */
function collectMoves(ids: string[]): Move[] {
  const out = new Map<string, Move>();
  for (const id of ids) {
    if (out.has(id)) continue;
    const m = lookupMove(id);
    if (m) out.set(id, m);
  }
  return [...out.values()];
}

/**
 * Searchable Pokémon picker for the calc form — replaces a 1186-row
 * native `<Select>` that nuked scrolling perf on slow devices.
 * Delegates the trigger button to the shared `PokemonPickerTrigger`
 * so the calc, battle helper and team builder all read the same way.
 */
function PokemonSelect({
  pokemon,
  onChange,
  label,
}: {
  pokemon: Pokemon;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <PokemonPicker
        onPick={onChange}
        trigger={<PokemonPickerTrigger pokemon={pokemon} />}
      />
    </div>
  );
}

interface DamageCalcProps {
  /** Pre-select the attacker (Pokémon id). Defaults to the first roster entry. */
  initialAttacker?: string;
  /** Pre-select the defender. Defaults to the second roster entry. */
  initialDefender?: string;
  /** Pre-select the move (id or English Smogon name). */
  initialMove?: string;
}

export function DamageCalc({
  initialAttacker,
  initialDefender,
  initialMove,
}: DamageCalcProps = {}) {
  // Validate the suggestions against the live roster — a stale URL
  // param shouldn't crash the page.
  const attackerSeed =
    (initialAttacker && POKEMON_BY_ID[initialAttacker]?.id) ?? POKEMON[0]?.id ?? "";
  const defenderSeed =
    (initialDefender && POKEMON_BY_ID[initialDefender]?.id) ??
    POKEMON[1]?.id ??
    POKEMON[0]?.id ??
    "";
  const moveSeed = initialMove ? lookupMove(initialMove)?.id ?? "" : "";

  const [attackerId, setAttackerId] = useState(attackerSeed);
  const [defenderId, setDefenderId] = useState(defenderSeed);
  const [moveId, setMoveId] = useState<string>(moveSeed);
  const [level, setLevel] = useState(50);

  const attacker = POKEMON_BY_ID[attackerId];
  const defender = POKEMON_BY_ID[defenderId];

  // Move list, in this order of preference:
  //  1. `notableMoves` from the strategy dataset — small, curated list
  //     (the moves competitive players actually run).
  //  2. The full Cobblemon learnset from species-extras — bounded by
  //     species (~60–100 entries), still scannable.
  //  3. All 909 moves — pathological fallback for unlisted species,
  //     kept only so the picker never appears empty.
  //
  // The earlier code skipped step 2 and jumped straight from a curated
  // list to all 909 moves, which crushed the dropdown on Ditto, Unown,
  // Smeargle, Cosmog and the Necrozma forms (the seven mons that ship
  // with no notableMoves entry).
  const availableMoves = useMemo(() => {
    if (!attacker) return MOVES;
    const fromNotable = collectMoves(attacker.notableMoves);
    if (fromNotable.length > 0) return fromNotable;
    const learnset = getSpeciesExtras(attacker.id)?.movesByMethod;
    if (learnset) {
      const fromLearnset = collectMoves([
        ...learnset.level.map((l) => l.move),
        ...learnset.tm,
        ...learnset.egg,
        ...learnset.tutor,
      ]);
      if (fromLearnset.length > 0) {
        return fromLearnset.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    return MOVES;
  }, [attacker]);

  // Reset move when attacker's pool changes and current move not in list.
  const selectedMove = lookupMove(moveId) ?? availableMoves[0];
  const safeMoveId = selectedMove?.id ?? "";

  const result = useMemo(() => {
    if (!attacker || !defender || !selectedMove) return null;
    return calculateDamage(attacker, defender, selectedMove, level);
  }, [attacker, defender, selectedMove, level]);

  if (!attacker || !defender) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attaquant</CardTitle>
            <CardDescription>Le Pokémon qui lance la capacité.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PokemonSelect
              pokemon={attacker}
              onChange={setAttackerId}
              label="Pokémon"
            />
            {/* Stats summary — kept below the picker so the chosen
                attacker's offensive numbers stay one glance away from
                the move picker. */}
            <div className="flex items-center justify-end gap-3 rounded-md border p-3 text-[10px] text-muted-foreground">
              <p>Atk {attacker.baseStats.attack}</p>
              <p>Atk.Spé {attacker.baseStats.spAtk}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Capacité</Label>
              <Select
                value={safeMoveId}
                onValueChange={(v) => v && setMoveId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Capacité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableMoves.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.type}, {m.power ?? "—"})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {selectedMove && (
                <div className="flex items-center gap-2 rounded-md border p-2 text-xs">
                  <TypeBadge type={selectedMove.type} size="sm" />
                  <span className="font-medium">{selectedMove.name}</span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {selectedMove.power ?? "—"} pwr · {selectedMove.category}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="level">Niveau (les deux Pokémon)</Label>
              <Input
                id="level"
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={(e) =>
                  setLevel(Math.max(1, Math.min(100, Number(e.target.value) || 50)))
                }
                className="max-w-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Défenseur</CardTitle>
            <CardDescription>Le Pokémon qui encaisse.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PokemonSelect
              pokemon={defender}
              onChange={setDefenderId}
              label="Pokémon"
            />
            <div className="flex items-center justify-end gap-3 rounded-md border p-3 text-[10px] text-muted-foreground">
              <p>Déf {defender.baseStats.defense}</p>
              <p>Déf.Spé {defender.baseStats.spDef}</p>
              <p>PV {defender.baseStats.hp}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résultat estimé</CardTitle>
          <CardDescription>
            Calcul simplifié — pas d&apos;IV / EV / nature, niveau identique des
            deux côtés.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Choisis une capacité offensive (les attaques de statut ne sont pas
              calculées).
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi
                  label="Dégâts"
                  value={`${result.min} – ${result.max}`}
                  sub={`PV cible : ${result.defenderHp}`}
                />
                <Kpi
                  label="% PV infligés"
                  value={`${result.minPercent.toFixed(1)} – ${result.maxPercent.toFixed(1)} %`}
                  sub={`STAB ×${result.stab}`}
                />
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <Badge
                    variant={
                      result.effectiveness >= 2
                        ? "default"
                        : result.effectiveness === 0
                          ? "secondary"
                          : "outline"
                    }
                    className="w-fit font-mono"
                  >
                    ×{result.effectiveness}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Multiplicateur appliqué
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <span className="text-xs uppercase text-muted-foreground">
                  Verdict KO en 1 attaque
                </span>
                <p className="mt-1 font-heading text-lg font-bold">
                  {ohkoLabel(result.ohko)}
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-destructive/70"
                  style={{ width: `${Math.min(100, result.maxPercent)}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Barre rouge = dégâts max sur la barre de vie du défenseur
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ohkoLabel(o: "Always" | "Likely" | "Possible" | "Never") {
  switch (o) {
    case "Always":   return "OHKO garanti 💀";
    case "Likely":   return "OHKO probable";
    case "Possible": return "OHKO possible (range)";
    case "Never":    return "Pas d'OHKO";
  }
}
