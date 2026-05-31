"use client";

import { forwardRef } from "react";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { ItemIcon } from "@/components/site/minecraft-item";
import { TypeBadges } from "@/components/site/type-badge";
import { TYPES_META } from "@/data/types";
import { itemDisplayName } from "@/data/competitive-items";
import { findMoveById, moveDisplayName } from "@/data/competitive-moves";
import type { Pokemon, PokemonRole, PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<PokemonRole, string> = {
  "physical-sweeper": "Sweeper phys.",
  "special-sweeper": "Sweeper spé.",
  "physical-wall": "Mur phys.",
  "special-wall": "Mur spé.",
  "mixed-wall": "Mur mixte",
  support: "Support",
  "hazard-setter": "Hazard",
  pivot: "Pivot",
  "revenge-killer": "Revenge",
  lead: "Lead",
  wallbreaker: "Wallbreaker",
};

/**
 * Role chip palette — colours grouped by **strategic family** so the
 * eye learns "red = offensive, green = defensive, blue = utility" at a
 * glance. Tints are kept subtle (bg /10, border /30) so multiple chips
 * never compete with the sprite for attention. Dark-mode is the
 * default visual target; the light variants stay readable on light bg.
 */
const ROLE_CHIP: Record<PokemonRole, string> = {
  "physical-sweeper":
    "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  "special-sweeper":
    "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  wallbreaker:
    "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
  "physical-wall":
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  "special-wall":
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  "mixed-wall":
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  pivot: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  "revenge-killer":
    "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300",
  support: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  "hazard-setter":
    "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300",
  lead: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
};

interface Props {
  pokemon: Pokemon;
  /** Hint shown on the right side ("Changer", "Swap", …). Default "Changer". */
  hint?: string;
  /** "row" lays the sprite + name + types horizontally (used by inline
   *  selects in the battle helper and damage calc); "card" stacks
   *  everything vertically (used inside the team builder slot grid). */
  variant?: "row" | "card";
  /** Active roles inferred from the slot's full configuration (set,
   *  ability, stats). When provided this replaces `pokemon.roles`
   *  (static tags) as the displayed role list — the **single source
   *  of truth** with the scoring engine. */
  activeRoles?: PokemonRole[];
  /** Ability the slot is running (or auto-resolved single talent).
   *  Surfaced on the card so the user sees what their bonus comes
   *  from. */
  selectedAbility?: string;
  /** Item the slot is holding. */
  selectedItem?: string;
  /** 1–4 declared moves. Surfaced under the talent/item line so the
   *  user sees the actual set the engine reads. */
  selectedMoves?: string[];
}

type ButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, keyof Props>;

/**
 * The "this slot holds a Pokémon, click to swap" affordance used
 * everywhere `<PokemonPicker>` lets the caller bring its own trigger
 * (battle helper opponent, damage calc attacker/defender, team builder
 * filled slots).
 *
 * Implementation notes:
 *  - **forwardRef + native button props** — base-ui's `Dialog.Trigger`
 *    receives this as `render={<PokemonPickerTrigger .../>}` and
 *    clones it with merged `onClick`, `aria-*`, and a `ref`. Without
 *    forwardRef + the `…rest` spread, those merged props would land
 *    on the *component* and silently fail to reach the inner
 *    `<button>` — meaning clicks would never open the dialog.
 *  - **card variant** is the team-builder slot, redesigned to put the
 *    sprite front-and-centre with a type-tinted halo behind it. The
 *    `row` variant stays the unchanged horizontal layout used by the
 *    battle helper and damage calculator inline selects.
 */
export const PokemonPickerTrigger = forwardRef<
  HTMLButtonElement,
  Props & ButtonProps
>(function PokemonPickerTrigger(
  {
    pokemon,
    hint = "Changer",
    variant = "row",
    activeRoles,
    selectedAbility,
    selectedItem,
    selectedMoves,
    className,
    ...rest
  },
  ref,
) {
  if (variant === "card") {
    return (
      <CardTrigger
        ref={ref}
        pokemon={pokemon}
        activeRoles={activeRoles}
        selectedAbility={selectedAbility}
        selectedItem={selectedItem}
        selectedMoves={selectedMoves}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent",
        className,
      )}
      {...rest}
    >
      <PokemonSprite pokemon={pokemon} size="size-10" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{pokemon.name}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{pokemon.dexNumber}
        </span>
      </div>
      <TypeBadges types={pokemon.types} size="sm" />
      {hint && (
        <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {hint}
        </span>
      )}
    </button>
  );
});

/**
 * Premium card layout: sprite is the hero, with a subtle type-tinted
 * halo behind it. The grid below the identity zone breaks down into
 * three scannable strata — **(1)** types + roles (what it *is*),
 * **(2)** talent + item (what it *runs*), **(3)** moves (what it
 * *does*). Each layer keeps its own visual weight so the eye walks
 * the card top-to-bottom in one pass.
 */
const CardTrigger = forwardRef<
  HTMLButtonElement,
  {
    pokemon: Pokemon;
    activeRoles?: PokemonRole[];
    selectedAbility?: string;
    selectedItem?: string;
    selectedMoves?: string[];
    className?: string;
  } & Omit<React.ComponentPropsWithoutRef<"button">, "children">
>(function CardTrigger(
  {
    pokemon,
    activeRoles,
    selectedAbility,
    selectedItem,
    selectedMoves,
    className,
    ...rest
  },
  ref,
) {
  const rolesToShow = activeRoles ?? pokemon.roles;
  const visibleMoves = (selectedMoves ?? []).slice(0, 4);

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Hover state: subtle lift + accent border + brighter surface
        // so the card reads as "pick me up". `group/card` lets the
        // sprite zone scale up a hair on hover for a premium feel
        // without animating layout.
        "group/card relative block h-full w-full cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
      {...rest}
    >
      <SpriteZone pokemon={pokemon} />

      <div className="flex flex-col gap-2.5 px-3 pb-3 pt-1 md:px-4 md:pb-4">
        <Identity pokemon={pokemon} />

        {rolesToShow.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {rolesToShow.slice(0, 3).map((r) => (
              <RoleChip key={r} role={r} />
            ))}
          </div>
        )}

        {(selectedAbility || selectedItem) && (
          <div className="grid grid-cols-2 gap-1.5">
            <MetaCard
              label="Talent"
              value={selectedAbility}
              icon={<span aria-hidden>✦</span>}
            />
            <MetaCard
              label="Objet"
              value={selectedItem ? itemDisplayName(selectedItem) : undefined}
              icon={
                selectedItem ? (
                  <ItemIcon item={selectedItem} size="size-3.5" />
                ) : (
                  <span aria-hidden>◇</span>
                )
              }
            />
          </div>
        )}

        {visibleMoves.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t pt-2">
            {visibleMoves.map((id, i) => (
              <MoveChip key={`${id}-${i}`} id={id} />
            ))}
          </div>
        )}
      </div>
    </button>
  );
});

/**
 * Sprite + type-tinted halo. The halo is a soft radial gradient using
 * the Pokémon's two type colours; very low alpha + large blur keep it
 * **felt** rather than seen — the sprite stays the focal point. Single
 * type mons just get one colour echoed in the second slot so the halo
 * doesn't go neutral grey.
 */
function SpriteZone({ pokemon }: { pokemon: Pokemon }) {
  const t1 = pokemon.types[0];
  const t2 = pokemon.types[1] ?? t1;
  const c1 = TYPES_META[t1 as PokemonTypeId]?.color ?? "#888";
  const c2 = TYPES_META[t2 as PokemonTypeId]?.color ?? "#888";

  return (
    <div className="relative flex items-center justify-center px-3 pb-1 pt-7 md:pt-8">
      {/* Halo — `28` and `1f` are hex alpha (≈16% and 12%). Pair of
          overlapping radial gradients shifted toward the type1/type2
          poles so dual-type mons feel "both" colours without looking
          striped. `blur-2xl` smears the edges into the card surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 blur-2xl"
        style={{
          background: `radial-gradient(55% 60% at 35% 45%, ${c1}28, transparent 70%), radial-gradient(50% 55% at 70% 60%, ${c2}1f, transparent 70%)`,
        }}
      />
      <div className="relative z-10 transition-transform duration-200 ease-out group-hover/card:scale-[1.04]">
        <PokemonSprite
          pokemon={pokemon}
          size="size-24 md:size-28 lg:size-32"
        />
      </div>
    </div>
  );
}

function Identity({ pokemon }: { pokemon: Pokemon }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-base font-bold leading-tight md:text-lg">
          {pokemon.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{pokemon.dexNumber}
        </span>
      </div>
      <TypeBadges types={pokemon.types} size="sm" />
    </div>
  );
}

function RoleChip({ role }: { role: PokemonRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
        ROLE_CHIP[role],
      )}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

/**
 * Two-up compact card for talent / item. `value` may be undefined when
 * the user hasn't picked yet — we still show the slot with a muted
 * "À définir" so the layout doesn't collapse asymmetrically.
 */
function MetaCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | undefined;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs font-medium">
        <span className="grid size-3.5 shrink-0 place-items-center text-muted-foreground">
          {icon}
        </span>
        <span className="truncate">
          {value ?? (
            <span className="text-muted-foreground/70">À définir</span>
          )}
        </span>
      </span>
    </div>
  );
}

/**
 * One declared move, tinted by its type. The coloured dot is a quieter
 * signal than a fully tinted background — at 4 moves stacked, full
 * tints would compete with the sprite halo and the role chips. Falls
 * back to a neutral chip for moves not in the strategic registry (the
 * data layer still resolves a display name via `moveDisplayName`).
 */
function MoveChip({ id }: { id: string }) {
  const match = findMoveById(id);
  const color = match ? TYPES_META[match.type].color : null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background/60 px-1.5 py-0.5 text-[11px] font-medium">
      {color && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate">{moveDisplayName(id)}</span>
    </span>
  );
}
