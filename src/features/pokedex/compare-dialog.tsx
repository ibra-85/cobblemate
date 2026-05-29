"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import type { Pokemon, PokemonTypeId } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { cn } from "@/lib/utils";
import { searchPokemon } from "@/lib/search";
import { StatsRadar } from "@/features/pokedex/stats-radar";

const STATS: { key: keyof Pokemon["baseStats"]; label: string }[] = [
  { key: "hp",      label: "HP" },
  { key: "attack",  label: "Atk" },
  { key: "defense", label: "Déf" },
  { key: "spAtk",   label: "Atk.Spé" },
  { key: "spDef",   label: "Déf.Spé" },
  { key: "speed",   label: "Vit" },
];

interface Props {
  pokemon: Pokemon;
  /** Render trigger as an icon-only button (for tight identity rows). */
  iconOnly?: boolean;
}

/**
 * In-page compare flow: opens a dialog where the user picks a second
 * Pokémon, then renders stat bars + matchup verdict inline. Replaces the
 * old /compare page.
 */
export function CompareDialog({ pokemon, iconOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const candidates = useMemo(
    () => searchPokemon(query).filter((p) => p.id !== pokemon.id),
    [pokemon.id, query],
  );

  const other = otherId ? POKEMON_BY_ID[otherId] : null;

  const matchupAtoB = useMemo(
    () =>
      other
        ? Math.max(
            ...pokemon.types.map((t) =>
              calculateTypeEffectiveness(t, other.types),
            ),
          )
        : null,
    [pokemon, other],
  );

  const matchupBtoA = useMemo(
    () =>
      other
        ? Math.max(
            ...other.types.map((t) =>
              calculateTypeEffectiveness(t, pokemon.types),
            ),
          )
        : null,
    [pokemon, other],
  );

  const sharedWeaknesses: PokemonTypeId[] = useMemo(() => {
    if (!other) return [];
    return ALL_TYPES.filter(
      (t) =>
        calculateTypeEffectiveness(t, pokemon.types) >= 2 &&
        calculateTypeEffectiveness(t, other.types) >= 2,
    );
  }, [pokemon, other]);

  function close() {
    setOpen(false);
    setOtherId(null);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setOtherId(null);
          setQuery("");
        }
      }}
    >
      <DialogTrigger
        render={
          iconOnly ? (
            <Button variant="outline" size="icon" title="Comparer">
              <ArrowLeftRight />
            </Button>
          ) : (
            <Button variant="outline">
              <ArrowLeftRight data-icon="inline-start" />
              Comparer
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Comparer {pokemon.name} avec…
          </DialogTitle>
          <DialogDescription>
            Stats côte à côte, matchup direct, faiblesses partagées.
          </DialogDescription>
        </DialogHeader>

        {!other ? (
          <div className="flex flex-col gap-3">
            <InputGroup>
              <InputGroupAddon>
                <Search className="size-4 opacity-60" />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                placeholder="Cherche un Pokémon…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
            <ScrollArea className="h-72">
              <div className="flex flex-col gap-1 pr-2">
                {candidates.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOtherId(p.id)}
                    className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-accent"
                  >
                    <PokemonSprite pokemon={p} size="size-10" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        #{p.dexNumber}
                      </span>
                    </div>
                    <TypeBadges types={p.types} size="sm" />
                  </button>
                ))}
                {candidates.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aucun résultat.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <PokemonHeader p={pokemon} />
              <PokemonHeader p={other} />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="flex flex-col gap-2">
                {STATS.map((s) => (
                  <StatRow
                    key={s.key}
                    label={s.label}
                    a={pokemon.baseStats[s.key]}
                    b={other.baseStats[s.key]}
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <StatsRadar pokemon={pokemon} compareWith={other} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">
                  Matchup direct
                </p>
                <div className="flex items-center justify-between">
                  <span>
                    {pokemon.name} → {other.name}
                  </span>
                  <Badge
                    variant={
                      (matchupAtoB ?? 0) >= 2
                        ? "default"
                        : (matchupAtoB ?? 0) === 0
                          ? "secondary"
                          : "outline"
                    }
                    className="font-mono"
                  >
                    ×{matchupAtoB}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    {other.name} → {pokemon.name}
                  </span>
                  <Badge
                    variant={
                      (matchupBtoA ?? 0) >= 2
                        ? "default"
                        : (matchupBtoA ?? 0) === 0
                          ? "secondary"
                          : "outline"
                    }
                    className="font-mono"
                  >
                    ×{matchupBtoA}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">
                  Faiblesses partagées
                </p>
                {sharedWeaknesses.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucune — bonne paire défensive.
                  </p>
                ) : (
                  <TypeBadges types={sharedWeaknesses} size="sm" />
                )}
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOtherId(null)}
              >
                Changer
              </Button>
              <Button variant="outline" size="sm" onClick={close}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PokemonHeader({ p }: { p: Pokemon }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border bg-card p-3 text-center">
      <div className="grid size-16 place-items-center rounded-md bg-muted p-1">
        <PokemonSprite pokemon={p} variant="artwork" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[10px] text-muted-foreground">
          #{p.dexNumber}
        </p>
        <p className="font-heading text-sm font-bold">{p.name}</p>
      </div>
      <TypeBadges types={p.types} size="sm" />
      <Badge variant="secondary" className="text-[10px]">
        BST {baseStatTotal(p)}
      </Badge>
    </div>
  );
}

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  const max = Math.max(a, b, 1);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
      <div className="flex items-center justify-end gap-2">
        <span
          className={cn(
            "font-mono tabular-nums",
            a > b && "font-bold",
            a < b && "text-muted-foreground",
          )}
        >
          {a}
        </span>
        <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
          <div
            className="ml-auto h-full bg-foreground/70"
            style={{ width: `${(a / max) * 100}%`, marginLeft: "auto" }}
          />
        </div>
      </div>
      <span className="px-2 text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground/70"
            style={{ width: `${(b / max) * 100}%` }}
          />
        </div>
        <span
          className={cn(
            "font-mono tabular-nums",
            b > a && "font-bold",
            b < a && "text-muted-foreground",
          )}
        >
          {b}
        </span>
      </div>
    </div>
  );
}
