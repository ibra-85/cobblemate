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
import { TypeBadge, TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { MOVES, MOVE_BY_ID } from "@/data/moves";
import { calculateDamage } from "@/lib/damage";

function PokemonSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {POKEMON.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.dexNumber} · {p.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function DamageCalc() {
  const [attackerId, setAttackerId] = useState(POKEMON[0]?.id ?? "");
  const [defenderId, setDefenderId] = useState(POKEMON[1]?.id ?? POKEMON[0]?.id ?? "");
  const [moveId, setMoveId] = useState<string>("");
  const [level, setLevel] = useState(50);

  const attacker = POKEMON_BY_ID[attackerId];
  const defender = POKEMON_BY_ID[defenderId];

  // Restrict the move list to the attacker's notable moves if any, else show all.
  const availableMoves = useMemo(() => {
    if (!attacker) return MOVES;
    const learned = attacker.notableMoves
      .map((id) => MOVE_BY_ID[id])
      .filter(Boolean);
    return learned.length > 0 ? learned : MOVES;
  }, [attacker]);

  // Reset move when attacker's pool changes and current move not in list.
  const selectedMove = MOVE_BY_ID[moveId] ?? availableMoves[0];
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
              value={attackerId}
              onChange={setAttackerId}
              label="Pokémon"
            />
            <div className="flex items-center gap-3 rounded-md border p-3">
              <PokemonSprite pokemon={attacker} size="size-12" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold">{attacker.name}</span>
                <TypeBadges types={attacker.types} size="sm" />
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                <p>Atk {attacker.baseStats.attack}</p>
                <p>Atk.Spé {attacker.baseStats.spAtk}</p>
              </div>
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
              value={defenderId}
              onChange={setDefenderId}
              label="Pokémon"
            />
            <div className="flex items-center gap-3 rounded-md border p-3">
              <PokemonSprite pokemon={defender} size="size-12" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold">{defender.name}</span>
                <TypeBadges types={defender.types} size="sm" />
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                <p>Déf {defender.baseStats.defense}</p>
                <p>Déf.Spé {defender.baseStats.spDef}</p>
                <p>PV {defender.baseStats.hp}</p>
              </div>
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
