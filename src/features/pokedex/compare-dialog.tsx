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
import { POKEMON_BY_ID } from "@/data/pokemon";
import type { Pokemon, PokemonTypeId } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { cn } from "@/lib/utils";
import { searchPokemon } from "@/lib/search";
import { StatsRadar } from "@/features/pokedex/stats-radar";

// Color tokens — kept as constants so the bar SVG, badge tones and
// border accents stay perfectly in sync. Blue vs amber reads with
// high contrast in both light and dark themes.
const TONE_A = {
  raw:      "#2563eb",                                                      // tailwind blue-600
  bg:       "bg-blue-400/5",
  border:   "border-blue-500/40",
  text:     "text-blue-700 dark:text-blue-300",
  bar:      "bg-blue-500",
  dot:      "bg-blue-500",
  ring:     "ring-blue-500/40",
};
const TONE_B = {
  raw:      "#d97706",                                                      // tailwind amber-600
  bg:       "bg-amber-400/5",
  border:   "border-amber-500/40",
  text:     "text-amber-700 dark:text-amber-300",
  bar:      "bg-amber-500",
  dot:      "bg-amber-500",
  ring:     "ring-amber-500/40",
};
type Tone = typeof TONE_A;

interface Props {
  pokemon: Pokemon;
  /** Render trigger as an icon-only button (for tight identity rows). */
  iconOnly?: boolean;
}

/**
 * In-page compare flow: opens a dialog where the user picks a second
 * Pokémon, then renders stat bars + matchup verdict inline.
 *
 * Visual encoding: A (the page's mon) is **blue**, B (the picked
 * mon) is **amber**. The colour shows up on the header card, every
 * stat bar, both matchup badges, and the radar overlay — so the eye
 * instantly knows which side a number belongs to.
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", TONE_A.dot)} aria-hidden />
              <span className={cn("font-semibold", TONE_A.text)}>{pokemon.name}</span>
            </span>
            {other ? (
              <>
                <span className="text-muted-foreground">vs</span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", TONE_B.dot)} aria-hidden />
                  <span className={cn("font-semibold", TONE_B.text)}>{other.name}</span>
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">avec…</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Stats côte à côte, matchup direct, faiblesses partagées.
          </DialogDescription>
        </DialogHeader>

        {!other ? (
          <PickPanel
            query={query}
            onQuery={setQuery}
            candidates={candidates}
            onPick={setOtherId}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              <PokemonHeader p={pokemon} tone={TONE_A} />
              <div className="flex items-center justify-center">
                <span className="grid size-8 place-items-center rounded-full bg-card text-xs font-bold uppercase text-muted-foreground">
                  vs
                </span>
              </div>
              <PokemonHeader p={other} tone={TONE_B} />
            </div>

            <Separator />

            {/* Radar centred on its own — the bar variant gave more
                heat than light, so the polygon overlay carries the
                stat-comparison weight by itself. */}
            <div className="mx-auto w-full max-w-sm">
              <StatsRadar
                pokemon={pokemon}
                compareWith={other}
                colorA={TONE_A.raw}
                colorB={TONE_B.raw}
              />
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">
                  Matchup direct
                </p>
                <MatchupRow
                  fromName={pokemon.name}
                  toName={other.name}
                  mult={matchupAtoB}
                  tone={TONE_A}
                />
                <MatchupRow
                  fromName={other.name}
                  toName={pokemon.name}
                  mult={matchupBtoA}
                  tone={TONE_B}
                />
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

function PickPanel({
  query,
  onQuery,
  candidates,
  onPick,
}: {
  query: string;
  onQuery: (q: string) => void;
  candidates: Pokemon[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Search className="size-4 opacity-60" />
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          placeholder="Cherche un Pokémon…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </InputGroup>
      <ScrollArea className="h-72">
        <div className="flex flex-col gap-1 pr-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
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
  );
}

function PokemonHeader({
  p,
  tone,
}: {
  p: Pokemon;
  tone: Tone;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 overflow-hidden rounded-md border p-3 text-center ring-1 ring-inset",
        tone.bg,
        tone.border,
        tone.ring,
      )}
    >
      <div className="grid size-16 place-items-center rounded-md bg-background/60 p-1">
        <PokemonSprite pokemon={p} variant="artwork" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[10px] text-muted-foreground">
          #{p.dexNumber}
        </p>
        <p className={cn("font-heading text-sm font-bold", tone.text)}>
          {p.name}
        </p>
      </div>
      <TypeBadges types={p.types} size="sm" />
      <Badge variant="secondary" className="text-[10px]">
        BST {baseStatTotal(p)}
      </Badge>
    </div>
  );
}

function MatchupRow({
  fromName,
  toName,
  mult,
  tone,
}: {
  fromName: string;
  toName: string;
  mult: number | null;
  tone: Tone;
}) {
  const m = mult ?? 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <span className={cn("size-2 shrink-0 rounded-full", tone.dot)} aria-hidden />
        <span className={cn("font-medium truncate", tone.text)}>{fromName}</span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate">{toName}</span>
      </span>
      <Badge
        variant={m >= 2 ? "default" : m === 0 ? "secondary" : "outline"}
        className="shrink-0 font-mono"
      >
        ×{m}
      </Badge>
    </div>
  );
}
