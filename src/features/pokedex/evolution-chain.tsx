import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  POKEMON_BY_ID,
  evolutionChain,
  rootOf,
} from "@/data/pokemon";
import type { Pokemon } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pokemon: Pokemon;
}

/**
 * Full evolution chain rendered as a compact horizontal strip — even
 * when the current Pokémon is mid-chain, the previous forms are walked
 * back via `EVOLVES_FROM`. The current stage gets a soft glow so the
 * player spots it instantly.
 *
 * On mobile the row scrolls horizontally; we don't wrap because a
 * vertical chain breaks the "this evolves into that" reading order.
 */
export function EvolutionChain({ pokemon }: Props) {
  const root = rootOf(pokemon.id);
  const stages = evolutionChain(root);

  // Solo species: render nothing — the "Pas d'évolution" hint lives
  // on the hero card so the page doesn't carry an empty placeholder.
  if (stages.length <= 1 && stages[0]?.length === 1) {
    return null;
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex min-w-max items-stretch gap-2">
        {stages.map((stage, stageIdx) => (
          <div key={stageIdx} className="flex items-stretch gap-2">
            {stageIdx > 0 && (
              <div className="flex items-center" aria-hidden>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </div>
            )}
            <div className="flex items-stretch gap-2">
              {stage.map((s) => (
                <EvolutionCard
                  key={s.id}
                  id={s.id}
                  method={s.method}
                  current={s.id === pokemon.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** True when the species has at least one evolutionary stage transition. */
export function hasEvolutions(pokemon: Pokemon): boolean {
  const stages = evolutionChain(rootOf(pokemon.id));
  return stages.length > 1 || (stages[0]?.length ?? 0) > 1;
}

function EvolutionCard({
  id,
  method,
  current,
}: {
  id: string;
  method: string | null;
  current: boolean;
}) {
  const p = POKEMON_BY_ID[id];
  if (!p) {
    return (
      <div className="flex h-32 w-24 flex-col items-center gap-1 rounded-md border border-dashed p-1.5 text-xs text-muted-foreground">
        {id}
      </div>
    );
  }

  const body = (
    // Fixed footprint so the base form (no method pill) aligns with
    // the later stages — keeps the chain visually balanced.
    <div
      className={cn(
        "flex h-32 w-24 flex-col items-center justify-start gap-0.5 rounded-md border p-1.5 transition-colors",
        current
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "hover:bg-accent/40",
      )}
    >
      <div className="size-12">
        <PokemonSprite pokemon={p} variant="artwork" />
      </div>
      <span className="text-center text-[11px] font-medium leading-tight">
        {p.name}
      </span>
      <span className="font-mono text-[9px] text-muted-foreground">
        #{p.dexNumber.toString().padStart(4, "0")}
      </span>
      {/* Method pill — invisible placeholder for the base form so
          every card has the same height. */}
      <span
        className={cn(
          "mt-auto rounded px-1 py-0.5 text-center text-[9px]",
          method ? "bg-muted text-muted-foreground" : "invisible",
        )}
      >
        {method ? humanizeMethod(method) : "Base"}
      </span>
    </div>
  );

  return current ? body : <Link href={`/pokedex/${id}`}>{body}</Link>;
}

function humanizeMethod(method: string): string {
  const lvl = method.match(/(?:level[_ -]?up:?\s*|level\s+)(\d+)/i) ??
              method.match(/^(\d+)$/);
  if (lvl) return `Niv. ${lvl[1]}`;

  if (/friendship|happiness/i.test(method)) return "Amitié";
  if (/trade/i.test(method)) return "Échange";
  if (/water_stone/i.test(method)) return "Pierre Eau";
  if (/fire_stone/i.test(method)) return "Pierre Feu";
  if (/thunder_stone/i.test(method)) return "Pierre Foudre";
  if (/leaf_stone/i.test(method)) return "Pierre Plante";
  if (/moon_stone/i.test(method)) return "Pierre Lune";
  if (/sun_stone/i.test(method)) return "Pierre Soleil";
  if (/dusk_stone/i.test(method)) return "Pierre Nuit";
  if (/dawn_stone/i.test(method)) return "Pierre Aube";
  if (/shiny_stone/i.test(method)) return "Pierre Éclat";
  if (/ice_stone/i.test(method)) return "Pierre Glace";
  if (/use_item:/i.test(method)) {
    const last = method.replace(/^.*?use_item:[a-z_]+:/i, "");
    return last.replace(/_/g, " ");
  }

  return method.replace(/_/g, " ").slice(0, 16);
}
