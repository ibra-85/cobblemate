import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
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
  /** "horizontal" (default) scrolls L→R, "vertical" stacks top→bottom
   *  with method labels between each stage. */
  orientation?: "horizontal" | "vertical";
  /** Only meaningful in vertical mode — when true the chain expands
   *  to fill the parent's height (each stage gets `flex-1`), so the
   *  evolution column matches the hero's tall card naturally. */
  fillHeight?: boolean;
}

/**
 * Full evolution chain rendered as a strip — even when the current
 * Pokémon is mid-chain, the previous forms are walked back via
 * `EVOLVES_FROM`. The current stage gets a soft glow so the player
 * spots it instantly.
 *
 * Vertical orientation puts each stage on its own row separated by a
 * down-arrow + method label; that's the layout the hero column uses
 * so the chain reads top→bottom like a flowchart.
 */
export function EvolutionChain({
  pokemon,
  orientation = "horizontal",
  fillHeight = false,
}: Props) {
  const root = rootOf(pokemon.id);
  const stages = evolutionChain(root);

  // Solo species: render nothing — the "Pas d'évolution" hint lives
  // on the hero card so the page doesn't carry an empty placeholder.
  if (stages.length <= 1 && stages[0]?.length === 1) {
    return null;
  }

  if (orientation === "vertical") {
    return (
      <VerticalChain
        stages={stages}
        currentId={pokemon.id}
        fillHeight={fillHeight}
      />
    );
  }
  return <HorizontalChain stages={stages} currentId={pokemon.id} />;
}

/** True when the species has at least one evolutionary stage transition. */
export function hasEvolutions(pokemon: Pokemon): boolean {
  const stages = evolutionChain(rootOf(pokemon.id));
  return stages.length > 1 || (stages[0]?.length ?? 0) > 1;
}

// ─── Horizontal layout (compact strip) ───────────────────────────────

function HorizontalChain({
  stages,
  currentId,
}: {
  stages: ReturnType<typeof evolutionChain>;
  currentId: string;
}) {
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
                  current={s.id === currentId}
                  compact
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vertical layout (column flowchart) ──────────────────────────────

function VerticalChain({
  stages,
  currentId,
  fillHeight,
}: {
  stages: ReturnType<typeof evolutionChain>;
  currentId: string;
  fillHeight: boolean;
}) {
  // Only distribute slack between stages when there are at least
  // three rows to absorb it. With a 2-stage chain (Riolu → Lucario),
  // `justify-between` shoves them to the column extremities and the
  // middle reads as a "missing stage" gap. Stacking from the top with
  // a fixed gap keeps the chain compact and lets the surrounding card
  // absorb any leftover height naturally.
  const spread = fillHeight && stages.length >= 3;
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3",
        fillHeight && "h-full",
        spread && "justify-between",
      )}
    >
      {stages.map((stage, stageIdx) => (
        <div key={stageIdx} className="flex flex-col gap-3">
          {stageIdx > 0 && (
            <div
              className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              aria-hidden
            >
              <ChevronDown className="size-4 shrink-0 opacity-60" />
              {stage[0]?.method && (
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {humanizeMethod(stage[0].method)}
                </span>
              )}
            </div>
          )}
          {/* Branched stages stack horizontally within the row, e.g.
              Eevee → multiple eeveelutions at the same step. */}
          <div className="flex flex-wrap items-stretch justify-center gap-2">
            {stage.map((s) => (
              <EvolutionCard
                key={s.id}
                id={s.id}
                method={s.method}
                current={s.id === currentId}
                compact={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

function EvolutionCard({
  id,
  method,
  current,
  compact,
}: {
  id: string;
  method: string | null;
  current: boolean;
  /** Compact = fixed footprint for the horizontal strip; non-compact
   *  is wider so the vertical column reads as a proper Pokémon profile. */
  compact: boolean;
}) {
  const p = POKEMON_BY_ID[id];
  if (!p) {
    return (
      <div className="flex h-32 w-24 flex-col items-center gap-1 rounded-md border border-dashed p-1.5 text-xs text-muted-foreground">
        {id}
      </div>
    );
  }

  // The vertical column gets a wider, horizontally-laid card with the
  // sprite to the left of name + dex — easier to scan in a tall layout.
  if (!compact) {
    const body = (
      <div
        className={cn(
          "flex w-full items-center gap-4 rounded-md border p-4 transition-colors",
          current
            ? "border-primary bg-primary/10 ring-1 ring-primary"
            : "hover:bg-accent/40",
        )}
      >
        {/* Pixel sprite, not the high-res official artwork: smaller
            file + different URL so it doesn't compete with the hero's
            artwork for the LCP slot. */}
        <div className="size-16 shrink-0">
          <PokemonSprite pokemon={p} variant="sprite" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold">{p.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            #{p.dexNumber.toString().padStart(4, "0")}
          </span>
        </div>
        {current && (
          <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            ici
          </span>
        )}
      </div>
    );
    // The Link wraps the row in an inline element by default — without
    // `block w-full` it would shrink to its content while the current
    // (un-wrapped) card kept `w-full` from the inner div, making the
    // current row visibly wider than the others.
    return current ? (
      body
    ) : (
      <Link href={`/pokedex/${id}`} className="block w-full">
        {body}
      </Link>
    );
  }

  // Compact (horizontal strip) — fixed footprint so the base form
  // aligns with later stages even without a method pill.
  const body = (
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
