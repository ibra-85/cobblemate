"use client";

import { forwardRef, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  ChevronRight,
  ShieldCheck,
  Skull,
  Swords,
  X,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TypeBadge, TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import {
  combatActions,
  EMPTY_COMBAT_SLOTS,
  useCombatStore,
} from "@/lib/combat-store";
import { buildBattleRecommendation, getBestCounters } from "@/lib/battle";
import { resolveTeam } from "@/lib/team-analysis";
import { cn } from "@/lib/utils";
import type { Pokemon, PokemonTypeId } from "@/types";

export function BattleHelper() {
  const { teams, hydrated } = useSavedTeams();
  const {
    myTeamId,
    myAdHocSlots,
    selectedEnemyId,
  } = useCombatStore();

  const slots = myTeamId
    ? teams.find((t) => t.id === myTeamId)?.slots ?? EMPTY_COMBAT_SLOTS()
    : myAdHocSlots;

  const team = resolveTeam(slots);
  const opponent = selectedEnemyId ? POKEMON_BY_ID[selectedEnemyId] : null;

  // Build the per-Pokémon move override from slots so the recommendation
  // uses the moves the user actually chose in the builder (saved teams
  // or ad-hoc set configs) instead of the species' broad notable list.
  // Only slots with a non-empty `selectedMoves` contribute — bare slots
  // fall back to `notableMoves` inside the analysis.
  const movesOverride = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots) {
      if (s.pokemonId && s.selectedMoves && s.selectedMoves.length > 0) {
        m.set(s.pokemonId, s.selectedMoves);
      }
    }
    return m.size > 0 ? m : undefined;
  }, [slots]);

  const reco = useMemo(
    () =>
      opponent
        ? buildBattleRecommendation(team, opponent, movesOverride)
        : null,
    [team, opponent, movesOverride],
  );

  const rosterCounters = useMemo(
    () => (opponent ? getBestCounters(opponent).slice(0, 5) : []),
    [opponent],
  );

  // "Best" = first ranked candidate that's both strong on offense and
  // resilient on defense. Falls back to the top-ranked entry when no
  // member of the team hits both bars — better to surface the
  // least-bad option than to render an empty hero.
  const best =
    reco?.ranked.find((r) => r.bestOffense >= 2 && r.worstIncoming <= 1) ??
    reco?.ranked[0];

  function setAdHocSlot(i: number, id: string | null) {
    combatActions.setMyAdHocSlot(i, { pokemonId: id });
  }

  const teamIds = slots
    .map((s) => s.pokemonId)
    .filter((x): x is string => Boolean(x));

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Setup: team + opponent, single panel ─────────────────────
          Merged the two former cards into one "setup" panel — the
          assistant only has two inputs and giving each its own card
          chrome wasted screen real estate above the fold. Section
          headings replace card titles for the same affordance with
          less border noise. */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Ton équipe</h2>
            <p className="text-xs text-muted-foreground">
              Charge une équipe ou compose à la volée.
            </p>
          </div>
          {hydrated && teams.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={myTeamId ?? "ad-hoc"}
                onValueChange={(v) => {
                  if (!v || v === "ad-hoc") combatActions.clearSavedTeam();
                  else combatActions.loadSavedTeam(v);
                }}
              >
                <SelectTrigger className="min-w-[14rem] max-w-xs">
                  {/* base-ui's Select.Value renders the raw value by
                      default — we need a children render fn to show
                      the human label (team name vs id). */}
                  <SelectValue placeholder="Équipe…">
                    {(value) => {
                      if (!value || value === "ad-hoc") return "Équipe rapide";
                      const t = teams.find((x) => x.id === value);
                      return t?.name ?? "Équipe…";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ad-hoc">Équipe rapide</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Link
                href="/team-builder"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Builder
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {slots.map((s, i) => {
            const p = s.pokemonId ? POKEMON_BY_ID[s.pokemonId] : null;
            if (myTeamId && p) {
              // Saved-team slot — read-only, click navigates to builder
              return <CompactSlot key={i} pokemon={p} readonly />;
            }
            if (myTeamId && !p) {
              return <EmptyCompactSlot key={i} readonly />;
            }
            if (!p) {
              return (
                <PokemonPicker
                  key={i}
                  onPick={(id) => setAdHocSlot(i, id)}
                  excludeIds={teamIds}
                  trigger={<EmptyCompactSlot />}
                />
              );
            }
            return (
              <PokemonPicker
                key={i}
                onPick={(id) => setAdHocSlot(i, id)}
                excludeIds={teamIds.filter((id) => id !== p.id)}
                trigger={
                  <CompactSlot
                    pokemon={p}
                    onClear={() => setAdHocSlot(i, null)}
                  />
                }
              />
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div>
            <h2 className="text-base font-bold">Adversaire</h2>
            <p className="text-xs text-muted-foreground">
              La cible que tu affrontes maintenant.
            </p>
          </div>
          <PokemonPicker
            onPick={(id) => combatActions.setSelectedEnemyId(id)}
            trigger={
              opponent ? (
                <OpponentTrigger pokemon={opponent} />
              ) : (
                <Button variant="outline">
                  <Swords data-icon="inline-start" />
                  Choisir l&apos;adversaire…
                </Button>
              )
            }
          />
        </div>
      </div>

      {/* ─── Empty state when no opponent ───────────────────────────── */}
      {!opponent && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/30 px-6 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Swords className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Choisis un adversaire</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Le meilleur switch, le move conseillé et le scénario complet
              s&apos;afficheront ici.
            </p>
          </div>
        </div>
      )}

      {/* ─── Battle screen — the WOW. ────────────────────────────────
          Mini-arène avec ennemi vs meilleur switch face à face, halo
          type-aware derrière chaque sprite, move conseillé sous les
          deux mons, quick actions vers le calc + pokédex. Remplace
          l'ancienne card "Recommandation" qui était textuelle. */}
      {reco && opponent && team.length > 0 && best && (
        <BattleScreen
          opponent={opponent}
          counter={best.pokemon}
          bestMove={best.bestMove}
          bestOffense={best.bestOffense}
          worstIncoming={best.worstIncoming}
        />
      )}

      {/* No team picked yet but opponent is — show a hint instead of
          a blank screen. */}
      {reco && opponent && team.length === 0 && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Compose ton équipe ci-dessus pour voir le meilleur switch.
        </div>
      )}

      {/* ─── Details grid below the hero ──────────────────────────── */}
      {reco && opponent && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Top 3 from team */}
          {team.length > 0 && (
            <DetailCard title="Top 3 de ton équipe" icon={<Swords className="size-4" />}>
              {reco.ranked.slice(0, 3).map((r) => (
                <RankRow
                  key={r.pokemon.id}
                  pokemon={r.pokemon}
                  offense={r.bestOffense}
                  defense={r.worstIncoming}
                />
              ))}
            </DetailCard>
          )}

          {/* À éviter */}
          {reco.avoid.length > 0 ? (
            <DetailCard
              title="À éviter"
              icon={<Skull className="size-4 text-destructive" />}
              tone="danger"
            >
              {reco.avoid.map((r) => (
                <RankRow
                  key={r.pokemon.id}
                  pokemon={r.pokemon}
                  defense={r.worstIncoming}
                  danger
                />
              ))}
            </DetailCard>
          ) : (
            <DetailCard title="À éviter" icon={<Skull className="size-4" />}>
              <p className="px-1 py-1.5 text-xs text-muted-foreground">
                Aucune menace majeure depuis ton équipe.
              </p>
            </DetailCard>
          )}

          {/* Opponent details */}
          <DetailCard
            title={`#${opponent.dexNumber} · ${opponent.name}`}
            icon={<AlertTriangle className="size-4" />}
          >
            <div className="flex flex-col gap-2 px-1 text-xs">
              <Section
                label="Faiblesses"
                icon={<Zap className="size-3" />}
              >
                <TypeBadges types={reco.weaknesses} size="sm" />
              </Section>
              <Section
                label="Résistances"
                icon={<ShieldCheck className="size-3" />}
              >
                <TypeBadges types={reco.resistances} size="sm" />
              </Section>
              {reco.immunities.length > 0 && (
                <Section label="Immunités">
                  <TypeBadges types={reco.immunities} size="sm" />
                </Section>
              )}
              <Section label="Couverture probable">
                <TypeBadges types={reco.threatTypes} size="sm" />
              </Section>
            </div>
          </DetailCard>
        </div>
      )}

      {/* Top counters from the whole roster — useful when the user's
          own team has no good answer. */}
      {rosterCounters.length > 0 && (
        <DetailCard
          title={`Top contres de tout le roster contre ${opponent!.name}`}
          icon={<ChevronRight className="size-4" />}
        >
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
            {rosterCounters.map((c) => (
              <Link
                key={c.pokemon.id}
                href={`/pokedex/${c.pokemon.id}`}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <PokemonSprite pokemon={c.pokemon} size="size-8" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium">
                    {c.pokemon.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ×{c.bestOffense} / ×{c.worstIncoming}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </DetailCard>
      )}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────

/**
 * Compact team slot for the battle assistant. Smaller than the
 * builder slot (no talent/item/moves panel) — the user is picking
 * who to send out, not configuring a set. Halo + hover lift keep
 * the look consistent with the builder's premium cards. The ✕
 * affordance reveals on hover so idle cards stay calm.
 *
 * `forwardRef` + `…rest` spread are mandatory: base-ui's
 * `Dialog.Trigger render={<CompactSlot/>}` clones the element and
 * forwards merged onClick / aria-* / ref. Without forwarding here,
 * the merged onClick lands on the component's props (where nothing
 * reads it) and clicks silently no-op — the "Ajouter" bug the user
 * hit on ad-hoc empty slots.
 */
type CompactSlotProps = {
  pokemon: Pokemon;
  onClear?: () => void;
  readonly?: boolean;
};
type CompactSlotButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  keyof CompactSlotProps
>;

const CompactSlot = forwardRef<
  HTMLButtonElement,
  CompactSlotProps & CompactSlotButtonProps
>(function CompactSlot(
  { pokemon, onClear, readonly, className, ...rest },
  ref,
) {
  const t1 = pokemon.types[0] as PokemonTypeId;
  const t2 = (pokemon.types[1] ?? pokemon.types[0]) as PokemonTypeId;
  const c1 = TYPES_META[t1]?.color ?? "#888";
  const c2 = TYPES_META[t2]?.color ?? "#888";

  // Read-only variant: not a button (no picker behind it).
  if (readonly) {
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
        <div className="relative flex h-full flex-col items-center gap-1.5 overflow-hidden rounded-xl border bg-card px-2 py-3 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 blur-2xl"
            style={{
              background: `radial-gradient(55% 60% at 35% 45%, ${c1}28, transparent 70%), radial-gradient(50% 55% at 70% 60%, ${c2}1f, transparent 70%)`,
            }}
          />
          <PokemonSprite pokemon={pokemon} size="size-14 md:size-16" />
          <span className="truncate text-xs font-semibold leading-tight">
            {pokemon.name}
          </span>
          <TypeBadges types={pokemon.types} size="sm" />
        </div>
      </div>
    );
  }

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
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex h-full w-full cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-xl border bg-card px-2 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg hover:shadow-[var(--type-glow)]",
          className,
        )}
        {...rest}
      >
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
      </button>
      {onClear && (
        // `<span role="button">` to avoid a button-in-button hierarchy
        // when this slot is itself a `<button>`. Full keyboard support
        // via the Enter/Space handler.
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              onClear();
            }
          }}
          className="absolute right-1.5 top-1.5 z-20 grid size-5 cursor-pointer place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-destructive group-hover/slot:opacity-100 focus-visible:opacity-100"
          aria-label={`Retirer ${pokemon.name}`}
        >
          <X className="size-3" />
        </span>
      )}
    </div>
  );
});

/**
 * Empty slot placeholder — premium dashed card matching the builder's.
 * forwardRef + spread for the same base-ui cloning reason as
 * `CompactSlot`.
 */
const EmptyCompactSlot = forwardRef<
  HTMLButtonElement,
  { readonly?: boolean } & Omit<
    React.ComponentPropsWithoutRef<"button">,
    "children"
  >
>(function EmptyCompactSlot({ readonly, className, ...rest }, ref) {
  if (readonly) {
    return (
      <div className="grid h-full min-h-[8.5rem] place-items-center rounded-xl border border-dashed bg-card/30 text-xs text-muted-foreground/60">
        vide
      </div>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group/empty flex h-full min-h-[8.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/30 text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/30 hover:text-primary",
        className,
      )}
      {...rest}
    >
      <span className="grid size-9 place-items-center rounded-full border border-dashed border-current transition-transform duration-200 ease-out group-hover/empty:scale-110">
        <Swords className="size-4" />
      </span>
      <span className="text-[11px] font-medium">Ajouter</span>
    </button>
  );
});

/**
 * Trigger shown when an opponent is already selected. Mirrors the
 * compact slot but slightly larger and aligned horizontally — it's a
 * single tappable affordance, not a grid cell. Click reopens the
 * picker to swap. Same forwardRef requirement as `CompactSlot`.
 */
const OpponentTrigger = forwardRef<
  HTMLButtonElement,
  { pokemon: Pokemon } & Omit<
    React.ComponentPropsWithoutRef<"button">,
    "children"
  >
>(function OpponentTrigger({ pokemon, className, ...rest }, ref) {
  const t1 = pokemon.types[0] as PokemonTypeId;
  const c1 = TYPES_META[t1]?.color ?? "#888";
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group/op flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-md hover:shadow-[var(--type-glow)]",
        className,
      )}
      style={
        {
          "--type-accent": `${c1}66`,
          "--type-glow": `${c1}33`,
        } as React.CSSProperties
      }
      {...rest}
    >
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -m-2 blur-xl"
          style={{
            background: `radial-gradient(60% 60% at 50% 50%, ${c1}33, transparent 70%)`,
          }}
        />
        <PokemonSprite pokemon={pokemon} size="size-12 relative z-10" />
      </div>
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-semibold leading-tight">{pokemon.name}</span>
        <TypeBadges types={pokemon.types} size="sm" />
      </div>
      <ChevronRight className="ml-2 size-4 text-muted-foreground transition-transform group-hover/op:translate-x-0.5" />
    </button>
  );
});

interface BestMoveLite {
  id?: string;
  name: string;
  type: PokemonTypeId;
  category?: string;
  power?: number | null;
  accuracy?: number | null;
  effect?: string;
}

/**
 * The hero. Two big sprites face-to-face with type-tinted halos, a
 * "VS" axis in the middle that doubles as a status row, a move belt
 * below, and quick actions that punt the matchup into the damage
 * calc with everything pre-filled. The whole thing is laid out so
 * the eye lands on the recommended switch immediately — that's the
 * single answer the assistant exists to give.
 */
function BattleScreen({
  opponent,
  counter,
  bestMove,
  bestOffense,
  worstIncoming,
}: {
  opponent: Pokemon;
  counter: Pokemon;
  bestMove: BestMoveLite | undefined;
  bestOffense: number;
  worstIncoming: number;
}) {
  const enemyC1 = TYPES_META[opponent.types[0] as PokemonTypeId]?.color ?? "#888";
  const enemyC2 =
    TYPES_META[(opponent.types[1] ?? opponent.types[0]) as PokemonTypeId]?.color ??
    "#888";
  const myC1 = TYPES_META[counter.types[0] as PokemonTypeId]?.color ?? "#888";
  const myC2 =
    TYPES_META[(counter.types[1] ?? counter.types[0]) as PokemonTypeId]?.color ??
    "#888";

  const moveType = bestMove?.type;
  const moveColor = moveType ? TYPES_META[moveType].color : null;

  const calcHref = `/battle?tab=calc&attacker=${counter.id}&defender=${opponent.id}${
    bestMove?.id ? `&move=${bestMove.id}` : ""
  }`;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Stage — two sprites face-to-face with halos behind them */}
      <div className="relative grid grid-cols-1 items-center gap-6 px-6 py-8 md:grid-cols-[1fr_auto_1fr] md:gap-2 md:px-8">
        {/* Enemy side */}
        <BattleSide
          label="Ennemi"
          pokemon={opponent}
          c1={enemyC1}
          c2={enemyC2}
          ratio={worstIncoming}
          ratioLabel="subit"
          ratioTone={worstIncoming <= 1 ? "good" : worstIncoming <= 2 ? "warn" : "bad"}
        />

        {/* Center VS axis */}
        <div className="flex items-center justify-center md:flex-col md:gap-2">
          <div className="grid size-14 place-items-center rounded-full border-2 bg-background shadow-sm">
            <Swords className="size-6" />
          </div>
          <span className="ml-3 text-xs font-bold uppercase tracking-widest text-muted-foreground md:ml-0">
            Envoyer
          </span>
        </div>

        {/* Recommended counter */}
        <BattleSide
          label="Ton switch"
          pokemon={counter}
          c1={myC1}
          c2={myC2}
          ratio={bestOffense}
          ratioLabel="inflige"
          ratioTone={bestOffense >= 2 ? "good" : bestOffense >= 1 ? "warn" : "bad"}
          highlight
        />
      </div>

      {/* Move belt */}
      {bestMove && (
        <div className="border-t bg-muted/20 px-6 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attaque conseillée
            </span>
            <div
              className="flex flex-1 items-center gap-2 rounded-md border border-l-[3px] bg-background/60 px-3 py-1.5"
              style={
                moveColor
                  ? ({
                      borderLeftColor: moveColor,
                      backgroundColor: `${moveColor}10`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {moveType && <TypeBadge type={moveType} size="sm" />}
              <span className="font-semibold">{bestMove.name}</span>
              <span className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
                {bestMove.power != null && <span>{bestMove.power} pwr</span>}
                {bestMove.accuracy != null && <span>{bestMove.accuracy}%</span>}
              </span>
            </div>
          </div>
          {bestMove.effect && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {bestMove.effect}
            </p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 border-t text-sm">
        <Link
          href={calcHref}
          className="flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors hover:bg-accent"
        >
          <Calculator className="size-4" />
          Tester dans le calc
        </Link>
        <Link
          href={`/pokedex/${counter.id}`}
          className="flex items-center justify-center gap-2 border-l px-4 py-3 font-medium transition-colors hover:bg-accent"
        >
          <ChevronRight className="size-4" />
          Voir {counter.name}
        </Link>
      </div>
    </div>
  );
}

/** One side of the battle stage — sprite + name + types + ratio chip. */
function BattleSide({
  label,
  pokemon,
  c1,
  c2,
  ratio,
  ratioLabel,
  ratioTone,
  highlight,
}: {
  label: string;
  pokemon: Pokemon;
  c1: string;
  c2: string;
  ratio: number;
  ratioLabel: string;
  ratioTone: "good" | "warn" | "bad";
  highlight?: boolean;
}) {
  const toneClass =
    ratioTone === "good"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : ratioTone === "warn"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 blur-3xl"
        style={{
          background: `radial-gradient(60% 50% at 50% 40%, ${c1}33, transparent 70%), radial-gradient(50% 50% at 50% 60%, ${c2}22, transparent 70%)`,
        }}
      />
      <span className="relative z-10 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "relative z-10 grid place-items-center rounded-full border-4 bg-background/40 p-2 transition-transform duration-300",
          highlight ? "border-primary/40" : "border-transparent",
        )}
      >
        <PokemonSprite
          pokemon={pokemon}
          size="size-24 md:size-28 lg:size-32"
        />
      </div>
      <span className="relative z-10 font-heading text-lg font-bold leading-tight md:text-xl">
        {pokemon.name}
      </span>
      <div className="relative z-10">
        <TypeBadges types={pokemon.types} size="sm" />
      </div>
      <span
        className={cn(
          "relative z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
          toneClass,
        )}
      >
        <span className="opacity-70">{ratioLabel}</span>
        <span className="font-mono font-bold">×{ratio}</span>
      </span>
    </div>
  );
}

// ─── Detail card primitives ──────────────────────────────────────────

function DetailCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-4",
        tone === "danger" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function RankRow({
  pokemon,
  offense,
  defense,
  danger,
}: {
  pokemon: Pokemon;
  offense?: number;
  defense?: number;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background/40 px-2 py-1.5",
        danger && "border-destructive/30",
      )}
    >
      <PokemonSprite pokemon={pokemon} size="size-7" />
      <span className="flex-1 truncate text-xs font-medium">{pokemon.name}</span>
      <span
        className={cn(
          "font-mono text-[10px]",
          danger ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {offense != null && <span>×{offense}</span>}
        {offense != null && defense != null && <span> / </span>}
        {defense != null && <span>×{defense}</span>}
      </span>
    </div>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
