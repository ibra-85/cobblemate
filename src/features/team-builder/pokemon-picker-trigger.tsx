"use client";

import { forwardRef } from "react";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { ItemIcon } from "@/components/site/minecraft-item";
import { TypeBadges } from "@/components/site/type-badge";
import { TYPES_META } from "@/data/types";
import { itemDisplayName } from "@/data/competitive-items";
import { moveDisplayName } from "@/data/competitive-moves";
import { lookupMove } from "@/data/moves";
import { abilityDisplayFr } from "@/lib/ability-utils";
import { natureLabelFr } from "@/lib/natures";
import { matchSlotToSmogonSet } from "@/lib/smogon-set-mapping";
import type { EvSpread, Move, Pokemon, PokemonRole, PokemonTypeId } from "@/types";
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
  /** Roles confirmed by the slot's declared moves (e.g. "pivot" is
   *  confirmed when Demi-Tour / Change Éclair is in the set). Roles
   *  in `activeRoles` that are not in `confirmedRoles` are rendered
   *  with a dashed/dimmed chip so the user sees at a glance which
   *  ones the scorer credits in full vs. only as potential. */
  confirmedRoles?: PokemonRole[];
  /** Ability the slot is running (or auto-resolved single talent).
   *  Surfaced on the card so the user sees what their bonus comes
   *  from. */
  selectedAbility?: string;
  /** Item the slot is holding. */
  selectedItem?: string;
  /** 1–4 declared moves. Surfaced under the talent/item line so the
   *  user sees the actual set the engine reads. */
  selectedMoves?: string[];
  /** Nature label ("Adamant", "Modeste"…). Shown as a tiny footer
   *  badge so the EV spread reads in context. */
  nature?: string;
  /** EV distribution. Surfaced as a compact "252/252/4" line so the
   *  user can verify a set without opening the config dialog. */
  evs?: EvSpread;
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
    confirmedRoles,
    selectedAbility,
    selectedItem,
    selectedMoves,
    nature,
    evs,
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
        confirmedRoles={confirmedRoles}
        selectedAbility={selectedAbility}
        selectedItem={selectedItem}
        selectedMoves={selectedMoves}
        nature={nature}
        evs={evs}
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
    confirmedRoles?: PokemonRole[];
    selectedAbility?: string;
    selectedItem?: string;
    selectedMoves?: string[];
    nature?: string;
    evs?: EvSpread;
    className?: string;
  } & Omit<React.ComponentPropsWithoutRef<"button">, "children">
>(function CardTrigger(
  {
    pokemon,
    activeRoles,
    confirmedRoles,
    selectedAbility,
    selectedItem,
    selectedMoves,
    nature,
    evs,
    className,
    ...rest
  },
  ref,
) {
  const rolesToShow = activeRoles ?? pokemon.roles;
  const confirmedSet = new Set(confirmedRoles ?? []);
  const visibleMoves = (selectedMoves ?? []).slice(0, 4);
  const evSummary = formatEvSummary(evs);
  // Match the slot's declared moves against the Pokémon's curated
  // Smogon sets to surface a "Set: Bulky DD" line — explains why
  // Gromago suddenly reads as a wall, or Scalpereur as a sweeper,
  // by naming the archetype.
  const smogonSetName = matchSlotToSmogonSet(selectedMoves, pokemon.id);

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Hover state: subtle lift + accent border + a glow shadow
        // tinted by the Pokémon's primary type (CSS var injected
        // below). `group/card` lets the sprite zone scale up a hair on
        // hover for a "the card is alive" feel without animating
        // layout. The type-glow stays subtle — the user said
        // "vivant, pas RGB gamer".
        "group/card relative block h-full w-full cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg hover:shadow-[var(--type-glow)]",
        className,
      )}
      style={
        {
          // Type1 accent at low opacity for the hover glow + border.
          // Two CSS variables so the hover state can use both without
          // recomputing colours in the className.
          "--type-accent": `${TYPES_META[pokemon.types[0] as PokemonTypeId]?.color ?? "#888"}66`,
          "--type-glow": `${TYPES_META[pokemon.types[0] as PokemonTypeId]?.color ?? "#888"}33`,
        } as React.CSSProperties
      }
      {...rest}
    >
      <SpriteZone pokemon={pokemon} />

      <div className="flex flex-col gap-2 px-3 pb-3 pt-0.5 md:px-4 md:pb-3.5">
        <Identity pokemon={pokemon} />

        {rolesToShow.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {rolesToShow.slice(0, 3).map((r) => (
              <RoleChip
                key={r}
                role={r}
                confirmed={confirmedSet.has(r)}
              />
            ))}
          </div>
        )}

        {(selectedAbility || selectedItem) && (
          <div className="grid grid-cols-2 gap-1.5">
            <MetaCard
              label="Talent"
              value={selectedAbility ? abilityDisplayFr(selectedAbility) : undefined}
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
          <MovesGrid moves={visibleMoves} />
        )}

        {smogonSetName && (
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <span className="opacity-70">Set Smogon ·</span>
            <span className="font-medium text-foreground/80">
              {smogonSetName}
            </span>
          </div>
        )}

        {(nature || evSummary) && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t pt-1.5 text-[10px] text-muted-foreground">
            {nature && (
              <span className="font-medium uppercase tracking-wider">
                {natureLabelFr(nature)}
              </span>
            )}
            {evSummary && (
              <span className="font-mono">
                {evSummary}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
});

/**
 * Compact EV spread for the card footer: "252 Atk / 252 Spe / 4 HP".
 * Returns `null` when no EVs are set so the caller can skip rendering
 * the whole row.
 */
function formatEvSummary(evs: EvSpread | undefined): string | null {
  if (!evs) return null;
  const keys: { key: keyof EvSpread; label: string }[] = [
    { key: "hp", label: "HP" },
    { key: "atk", label: "Atk" },
    { key: "def", label: "Déf" },
    { key: "spa", label: "AtS" },
    { key: "spd", label: "DéS" },
    { key: "spe", label: "Vit" },
  ];
  const parts = keys
    .map(({ key, label }) => (evs[key] ? `${evs[key]} ${label}` : null))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : null;
}

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

/**
 * Role chip with two visual states:
 *  - **confirmed** (declared moves match the role's key signals)
 *    → solid tint matching the strategic-family palette.
 *  - **potential** (role inferred from learnset/stats only)
 *    → dashed border, reduced opacity, no fill — communicates "the
 *    mon could do this but isn't committed to it". Native title
 *    attribute carries the longer explanation.
 *
 * Visual rules mirror the team scorer's confirmed-vs-potential
 * weighting (~5× weaker bonus for potential), so what the user sees
 * on the card lines up with what the score axes credit.
 */
function RoleChip({
  role,
  confirmed,
}: {
  role: PokemonRole;
  confirmed: boolean;
}) {
  const label = ROLE_LABEL[role] ?? role;
  if (confirmed) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
          ROLE_CHIP[role],
        )}
        title={`${label} confirmé par les attaques sélectionnées`}
      >
        {label}
      </span>
    );
  }
  return (
    // Dashed border + dimmed text alone is enough signal for
    // "potential" — the previous `○` prefix read as noise / a
    // bullet point. The full reason is still available via tooltip.
    <span
      className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-[10px] font-medium leading-none text-muted-foreground/60"
      title="Rôle potentiel — le Pokémon peut apprendre les attaques associées, mais elles ne sont pas sélectionnées. Sélectionne un set pour confirmer le rôle."
    >
      {label}
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
 * Always-2×2 grid of move cells. We pad to 4 cells with `null` so the
 * layout stays solid even when a set has 1–3 moves declared — half-full
 * cards still feel like proper sets rather than ragged lists. The
 * border-t separator above the grid keeps the visual stratum below
 * talent/item clear.
 *
 * Each cell mirrors the in-game move slot affordance: type-tinted
 * surface + name + a tiny meta line (type · category · power). On
 * hover the native `title` surfaces accuracy/priority — full custom
 * tooltips would have required a portal and we keep the card a single
 * pressable button.
 */
function MovesGrid({ moves }: { moves: string[] }) {
  const cells: (string | null)[] = [0, 1, 2, 3].map((i) => moves[i] ?? null);
  return (
    <div className="grid grid-cols-2 gap-1 border-t pt-1.5">
      {cells.map((id, i) => (
        <MoveCell key={i} id={id} />
      ))}
    </div>
  );
}

const CATEGORY_LABEL: Record<"physical" | "special" | "status", string> = {
  physical: "Phys",
  special: "Spé",
  status: "Stat",
};

/**
 * One declared move, "battle UI" style. Three quiet visual cues do all
 * the work:
 *  - **left border** in the move's type colour (the only chromatic
 *    accent — keeps the card calm when 4 moves stack).
 *  - **background tint** at 8% opacity of the type colour for a
 *    feels-coloured-but-isn't read.
 *  - **meta line** (`TYPE · CAT · PWR`) in uppercase tiny mono so the
 *    set reads like a Showdown export at a glance.
 *
 * Empty cells render a dashed placeholder so the user sees at a glance
 * how many moves are still to declare. Unknown moves (not in either
 * registry) fall back to the display name only.
 */
function MoveCell({ id }: { id: string | null }) {
  if (!id) {
    return (
      <div
        aria-hidden
        className="grid min-h-[2.5rem] place-items-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground/50"
      >
        —
      </div>
    );
  }

  const move: Move | null = lookupMove(id);
  const meta = TYPES_META[move?.type as PokemonTypeId];
  const color = meta?.color ?? "#888";
  const label = move?.name ?? moveDisplayName(id);
  const typeLabel = meta?.label ?? "";
  const catLabel = move ? CATEGORY_LABEL[move.category] : "";
  const power = move?.power ?? null;

  // Native title carries the richer detail (accuracy + priority +
  // short effect) so users get the data without a portal-based tooltip.
  const tooltipLines = [
    label,
    typeLabel && catLabel ? `${typeLabel} · ${catLabel === "Stat" ? "Statut" : catLabel === "Phys" ? "Physique" : "Spéciale"}` : "",
    power != null ? `Puissance : ${power}` : "",
    move?.accuracy != null ? `Précision : ${move.accuracy}` : "",
    move?.priority ? `Priorité : ${move.priority > 0 ? "+" : ""}${move.priority}` : "",
    move?.shortEffect ?? move?.effect ?? "",
  ].filter(Boolean);

  return (
    <div
      title={tooltipLines.join("\n")}
      className="flex min-h-[2.5rem] flex-col justify-center gap-0.5 rounded-md border border-l-[3px] bg-[color:var(--cell-bg)] px-1.5 py-1 leading-tight"
      style={
        {
          borderLeftColor: color,
          "--cell-bg": `${color}14`,
        } as React.CSSProperties
      }
    >
      <span className="truncate text-[11px] font-semibold">{label}</span>
      {move && (
        <span className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {typeLabel}
          {catLabel && <> · {catLabel}</>}
          {power != null && <> · {power}</>}
        </span>
      )}
    </div>
  );
}
