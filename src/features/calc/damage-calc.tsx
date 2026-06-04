"use client";

import { forwardRef, useEffect, useMemo } from "react";
import { ArrowLeftRight, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { MOVES, lookupMove } from "@/data/moves";
import { getSpeciesExtras } from "@/data/species-extras";
import { itemDisplayName } from "@/data/competitive-items";
import { TYPES_META } from "@/data/types";
import { calculateDamage } from "@/lib/damage";
import { abilityDisplayFr } from "@/lib/ability-utils";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { MovePicker } from "@/features/calc/move-picker";
import { combatActions, useCombatStore } from "@/lib/combat-store";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import type { CombatState } from "@/lib/combat-store";
import type { Move, Pokemon, PokemonTypeId, TeamSlot } from "@/types";
import { cn } from "@/lib/utils";

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

/** Quick-pick chips for the level inputs. Covers the three scenarios
 *  Cobblemon players run into most: standard PvP (50), wild-area
 *  grind (80), endgame boss (100). */
const LEVEL_PRESETS = [50, 80, 100] as const;

interface DamageCalcProps {
  initialAttacker?: string;
  initialDefender?: string;
  initialMove?: string;
}

export function DamageCalc({
  initialAttacker,
  initialDefender,
  initialMove,
}: DamageCalcProps = {}) {
  const { calc, myTeamId, myAdHocSlots, enemySlots } = useCombatStore();
  const { teams } = useSavedTeams();

  // URL deep-link seeding. The Assistant's "Tester dans le calc" CTA
  // routes here with attacker/defender/move pre-set in the URL — we
  // mirror them into the global store so a refresh keeps the match-up.
  useEffect(() => {
    const patch: Partial<CombatState["calc"]> = {};
    if (initialAttacker && POKEMON_BY_ID[initialAttacker]) {
      patch.attackerId = initialAttacker;
    }
    if (initialDefender && POKEMON_BY_ID[initialDefender]) {
      patch.defenderId = initialDefender;
    }
    if (initialMove) {
      const m = lookupMove(initialMove);
      if (m) {
        patch.moveId = m.id;
        // Flag the move as "suggested" so the picker badges it — the
        // user remembers it came from the Assistant, not their own pick.
        patch.moveSuggested = true;
      }
    }
    if (Object.keys(patch).length > 0) combatActions.setCalc(patch);
  }, [initialAttacker, initialDefender, initialMove]);

  // Resolve the user's team slots (saved or ad-hoc) — used to pull
  // ability / item / declared moves into the calc when an attacker or
  // defender matches a slot they configured in the Builder.
  const mySlots: TeamSlot[] = myTeamId
    ? teams.find((t) => t.id === myTeamId)?.slots ?? []
    : myAdHocSlots;

  const attackerId = calc.attackerId ?? POKEMON[0]?.id ?? "";
  const defenderId =
    calc.defenderId ?? POKEMON[1]?.id ?? POKEMON[0]?.id ?? "";
  const moveId = calc.moveId ?? "";
  const attackerLevel = calc.attackerLevel ?? 50;
  const defenderLevel = calc.defenderLevel ?? 50;

  const attacker = POKEMON_BY_ID[attackerId];
  const defender = POKEMON_BY_ID[defenderId];

  // Find the configured slot (if any) for each side. Attacker is
  // looked up in the user's team first (the common case) then in the
  // enemy team. Defender starts in the enemy team. This is just for
  // *enrichment* — neither side requires a slot to compute damage.
  const attackerSlot =
    mySlots.find((s) => s.pokemonId === attackerId) ??
    enemySlots.find((s) => s.pokemonId === attackerId) ??
    null;
  const defenderSlot =
    enemySlots.find((s) => s.pokemonId === defenderId) ??
    mySlots.find((s) => s.pokemonId === defenderId) ??
    null;

  // Move pool, in this order of preference:
  //  1. Slot's declared moves from the Builder — what the user actually
  //     configured, so the calc matches the set they want to test.
  //  2. `notableMoves` from the strategy dataset — small curated list.
  //  3. The full Cobblemon learnset.
  //  4. All 909 moves — last-resort fallback so the picker never empty.
  const availableMoves = useMemo(() => {
    if (!attacker) return MOVES;
    if (attackerSlot?.selectedMoves && attackerSlot.selectedMoves.length > 0) {
      const fromSlot = collectMoves(attackerSlot.selectedMoves);
      if (fromSlot.length > 0) return fromSlot;
    }
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
  }, [attacker, attackerSlot]);

  const selectedMove = lookupMove(moveId) ?? availableMoves[0];

  const result = useMemo(() => {
    if (!attacker || !defender || !selectedMove) return null;
    return calculateDamage(
      attacker,
      defender,
      selectedMove,
      attackerLevel,
      defenderLevel,
    );
  }, [attacker, defender, selectedMove, attackerLevel, defenderLevel]);

  // Keyboard shortcut: X = swap attacker ↔ defender. Skipped when the
  // user is typing in a form field (level inputs) — otherwise the
  // shortcut steals the keystroke. Document-level so it works from
  // anywhere on the Calc tab.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "x" && e.key !== "X") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      combatActions.swapCalc();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!attacker || !defender) return null;

  function setAttackerId(id: string) {
    combatActions.setCalc({ attackerId: id });
  }
  function setDefenderId(id: string) {
    combatActions.setCalc({ defenderId: id });
  }
  function setMoveId(id: string) {
    // Manual picks clear the "suggested" flag — only the URL deep-link
    // sets it back.
    combatActions.setCalc({ moveId: id, moveSuggested: false });
  }
  function setAttackerLevel(n: number) {
    combatActions.setCalc({ attackerLevel: clampLevel(n) });
  }
  function setDefenderLevel(n: number) {
    combatActions.setCalc({ defenderLevel: clampLevel(n) });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Combatants row ──────────────────────────────────────────
          Two cards side-by-side with a SwapAxis in the middle. On
          mobile the axis sits between the stacked cards. */}
      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <CombatantCard
          role="attacker"
          pokemon={attacker}
          slot={attackerSlot}
          level={attackerLevel}
          onChangePokemon={setAttackerId}
          onChangeLevel={setAttackerLevel}
          move={selectedMove ?? null}
        />
        <SwapAxis onSwap={() => combatActions.swapCalc()} />
        <CombatantCard
          role="defender"
          pokemon={defender}
          slot={defenderSlot}
          level={defenderLevel}
          onChangePokemon={setDefenderId}
          onChangeLevel={setDefenderLevel}
          move={selectedMove ?? null}
        />
      </div>

      {/* ─── Move picker ─────────────────────────────────────────────
          Full-width — sits between combatants and result so the eye
          flow is "who → with what → how hard". */}
      <Card className="py-4">
        <CardContent className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Capacité</Label>
            {attackerSlot?.selectedMoves &&
              attackerSlot.selectedMoves.length > 0 && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Moves du Builder
                </span>
              )}
          </div>
          <MovePicker
            moves={availableMoves}
            value={selectedMove?.id ?? null}
            onPick={setMoveId}
            suggested={calc.moveSuggested}
          />
          <p className="text-[10px] text-muted-foreground">
            Les attaques de statut ne sont pas calculées.
          </p>
        </CardContent>
      </Card>

      {/* ─── Result ──────────────────────────────────────────────────
          Single panel: big verdict + percent range + HP bar with
          threshold mark + multipliers row. Color-coded per the
          attacker's outlook (favourable / uncertain / poor). */}
      <DamageResultPanel
        result={result}
        attacker={attacker}
        defender={defender}
        move={selectedMove ?? null}
      />
    </div>
  );
}

function clampLevel(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.round(n)));
}

// ─── Combatant card ───────────────────────────────────────────────────

/**
 * One side of the calc. The whole sprite/name zone is the picker
 * trigger (no more discreet "Changer" link) — clicking anywhere on
 * the identity row opens the searchable Pokémon picker. Below the
 * identity row, a compact set summary surfaces talent / item / moves
 * pulled from the Builder slot when available, so the user sees the
 * full set they're calculating with.
 */
function CombatantCard({
  role,
  pokemon,
  slot,
  level,
  onChangePokemon,
  onChangeLevel,
  move,
}: {
  role: "attacker" | "defender";
  pokemon: Pokemon;
  slot: TeamSlot | null;
  level: number;
  onChangePokemon: (id: string) => void;
  onChangeLevel: (n: number) => void;
  move: Move | null;
}) {
  const isAttacker = role === "attacker";
  const title = isAttacker ? "Attaquant" : "Défenseur";
  const description = isAttacker
    ? "Le Pokémon qui lance la capacité."
    : "Le Pokémon qui encaisse.";

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-[10px]">
          {description}
        </CardDescription>
      </div>

      <PokemonPicker
        onPick={onChangePokemon}
        trigger={<IdentityRow pokemon={pokemon} />}
      />

      <StatsRow role={role} pokemon={pokemon} />

      {/* Set summary — only renders when there's at least one builder
          field to surface, so an ad-hoc Pokémon picked off-roster stays
          uncluttered. */}
      {slot && hasSetData(slot) && (
        <SetSummary slot={slot} highlightMove={move} role={role} />
      )}

      <LevelField
        label={`Niveau ${title.toLowerCase()}`}
        value={level}
        onChange={onChangeLevel}
      />
    </Card>
  );
}

function hasSetData(slot: TeamSlot): boolean {
  return Boolean(
    slot.selectedAbility ||
      slot.selectedItem ||
      (slot.selectedMoves && slot.selectedMoves.length > 0),
  );
}

/**
 * Sprite + name + types + a subtle "click to swap" affordance. The
 * whole row is the picker trigger via `forwardRef`, so a click anywhere
 * opens the search dialog. base-ui's `Dialog.Trigger` clones this and
 * merges `onClick` + `aria-*` onto the inner `<button>` — without the
 * forwardRef + spread the clicks would silently no-op.
 */
const IdentityRow = forwardRef<
  HTMLButtonElement,
  { pokemon: Pokemon } & Omit<
    React.ComponentPropsWithoutRef<"button">,
    "children"
  >
>(function IdentityRow({ pokemon, className, ...rest }, ref) {
  const t1 = pokemon.types[0] as PokemonTypeId;
  const c1 = TYPES_META[t1]?.color ?? "#888";
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group/identity relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg border bg-card px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-md hover:shadow-[var(--type-glow)]",
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 blur-2xl"
        style={{
          background: `radial-gradient(40% 60% at 20% 50%, ${c1}28, transparent 70%)`,
        }}
      />
      <div className="relative z-10 transition-transform duration-200 ease-out group-hover/identity:scale-[1.06]">
        <PokemonSprite pokemon={pokemon} size="size-14" />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-bold leading-tight">
          {pokemon.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{pokemon.dexNumber}
        </span>
        <div className="mt-0.5">
          <TypeBadges types={pokemon.types} size="sm" />
        </div>
      </div>
    </button>
  );
});

/** Stat row. Uses native `title` for the long-form labels — keeps the
 *  card visually quiet (no extra tooltip portal) while staying
 *  hover-discoverable. */
function StatsRow({ role, pokemon }: { role: "attacker" | "defender"; pokemon: Pokemon }) {
  const { baseStats } = pokemon;
  if (role === "attacker") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <StatChip
          label="Atq"
          fullLabel="Attaque (physique)"
          value={baseStats.attack}
        />
        <StatChip
          label="Atq. spé."
          fullLabel="Attaque Spéciale"
          value={baseStats.spAtk}
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatChip
        label="PV"
        fullLabel="Points de Vie de base"
        value={baseStats.hp}
      />
      <StatChip
        label="Déf"
        fullLabel="Défense (physique)"
        value={baseStats.defense}
      />
      <StatChip
        label="Déf. spé."
        fullLabel="Défense Spéciale"
        value={baseStats.spDef}
      />
    </div>
  );
}

function StatChip({
  label,
  fullLabel,
  value,
}: {
  label: string;
  fullLabel: string;
  value: number;
}) {
  return (
    <div
      title={`${fullLabel} : ${value}`}
      className="flex flex-col items-start gap-0 rounded-md border bg-muted/30 px-2 py-1"
    >
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-bold leading-none">{value}</span>
    </div>
  );
}

/**
 * Builder set preview — talent, item, moves. Highlights the move the
 * calc currently has selected so the user sees the link between the
 * picker and their set. Keeps the cells visually quiet (light tint,
 * no halo) — this is supporting info, not the headline.
 */
function SetSummary({
  slot,
  highlightMove,
  role,
}: {
  slot: TeamSlot;
  highlightMove: Move | null;
  role: "attacker" | "defender";
}) {
  const moves = slot.selectedMoves ?? [];
  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-muted/20 p-2">
      {(slot.selectedAbility || slot.selectedItem) && (
        <div className="grid grid-cols-2 gap-1.5">
          <SetField
            label="Talent"
            value={
              slot.selectedAbility ? abilityDisplayFr(slot.selectedAbility) : null
            }
          />
          <SetField
            label="Objet"
            value={slot.selectedItem ? itemDisplayName(slot.selectedItem) : null}
          />
        </div>
      )}
      {moves.length > 0 && role === "attacker" && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Set
          </span>
          <div className="grid grid-cols-2 gap-1">
            {moves.slice(0, 4).map((id) => {
              const m = lookupMove(id);
              const active = m && highlightMove && m.id === highlightMove.id;
              const color = m
                ? TYPES_META[m.type as PokemonTypeId]?.color ?? "#888"
                : "#888";
              return (
                <div
                  key={id}
                  className={cn(
                    "truncate rounded border border-l-[3px] px-1.5 py-0.5 text-[10px] font-medium",
                    active && "ring-1 ring-primary/50",
                  )}
                  style={{
                    borderLeftColor: color,
                    backgroundColor: active ? `${color}22` : `${color}0a`,
                  }}
                  title={m?.name ?? id}
                >
                  {m?.name ?? id}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SetField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-card/60 px-1.5 py-1">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-[11px] font-medium">
        {value ?? <span className="text-muted-foreground/60">—</span>}
      </span>
    </div>
  );
}

// ─── Level field ──────────────────────────────────────────────────────

function LevelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 font-mono text-sm"
        />
        {/* Presets match the input's metrics: same `h-8`, same border
            radius (`rounded-lg`), same `border-input` palette, same
            font-mono. Reads as one cohesive number row instead of an
            input with disconnected pills. */}
        <div className="flex gap-1">
          {LEVEL_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-8 w-12 shrink-0 cursor-pointer rounded-lg border font-mono text-sm font-medium tabular-nums transition-colors",
                value === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Swap axis ────────────────────────────────────────────────────────

/**
 * The "⇄" between attacker and defender. Vertical pill on desktop
 * (centre column), horizontal strip on mobile. Native button so it
 * inherits focus ring and keyboard semantics for free; the `X`
 * shortcut hooked at the page root is the keyboard equivalent.
 */
function SwapAxis({ onSwap }: { onSwap: () => void }) {
  return (
    <div className="flex items-center justify-center lg:flex-col">
      <button
        type="button"
        onClick={onSwap}
        title="Inverser attaquant et défenseur (raccourci : X)"
        className="group/swap relative grid size-10 cursor-pointer place-items-center rounded-full border bg-background shadow-sm transition-all hover:scale-110 hover:border-primary/60 hover:bg-accent active:scale-95"
      >
        <ArrowLeftRight className="size-4 transition-transform group-hover/swap:rotate-180 lg:hidden" />
        <ArrowLeftRight className="hidden size-4 rotate-90 transition-transform group-hover/swap:rotate-[270deg] lg:block" />
      </button>
      <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground lg:ml-0 lg:mt-1">
        Swap · X
      </span>
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────

/**
 * Damage verdict. Three layers:
 *   1. Headline — "OHKO garanti", "2HKO probable (81%)", "3HKO", with
 *      a color-coded tone (green / amber / red) matching the
 *      attacker's outlook from the defender's perspective.
 *   2. Bar — defender's HP scale with the min/max damage window drawn
 *      on top, and a tick at 100% so the OHKO threshold is obvious.
 *   3. Multipliers strip — STAB / type effectiveness / range.
 */
function DamageResultPanel({
  result,
  attacker,
  defender,
  move,
}: {
  result: ReturnType<typeof calculateDamage> | null;
  attacker: Pokemon;
  defender: Pokemon;
  move: Move | null;
}) {
  if (!result || !move) {
    return (
      <Card className="py-4">
        <CardContent className="px-4">
          <p className="text-sm text-muted-foreground">
            Choisis une capacité offensive — les attaques de statut ne sont
            pas calculées.
          </p>
        </CardContent>
      </Card>
    );
  }

  const verdict = damageVerdict(result);
  const min = Math.min(100, result.minPercent);
  const max = Math.min(100, result.maxPercent);

  return (
    <Card className={cn("py-4", verdict.cardTone)}>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Verdict
            </span>
            <p
              className={cn(
                "font-heading text-2xl font-bold leading-tight",
                verdict.titleTone,
              )}
            >
              {verdict.title}
            </p>
            {verdict.subtitle && (
              <p className="text-xs text-muted-foreground">
                {verdict.subtitle}
              </p>
            )}
          </div>
          <Sparkles
            className={cn("size-5 shrink-0", verdict.iconTone)}
            aria-hidden
          />
        </div>

        {/* Damage bar — defender's HP is the full track. We draw the
            damage window from `min%` to `max%` so the user sees both
            best- and worst-case at a glance. A "100%" tick marks the
            KO threshold; when the window crosses it, the part above
            the tick is rendered with a deeper tone. */}
        <div className="flex flex-col gap-1">
          <DamageBar minPercent={min} maxPercent={max} />
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>
              {result.min} – {result.max} dégâts
            </span>
            <span>PV : {result.defenderHp}</span>
            <span>
              {result.minPercent.toFixed(1)} – {result.maxPercent.toFixed(1)} %
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <Tag
            label="Type"
            value={`×${result.effectiveness}`}
            tone={
              result.effectiveness === 0
                ? "neutral"
                : result.effectiveness >= 2
                  ? "good"
                  : result.effectiveness < 1
                    ? "bad"
                    : "neutral"
            }
            title={`${move.name} (${move.type}) sur ${defender.name} (${defender.types.join(" / ")})`}
          />
          <Tag
            label="STAB"
            value={result.stab === 1.5 ? "×1.5" : "—"}
            tone={result.stab === 1.5 ? "good" : "neutral"}
            title={
              result.stab === 1.5
                ? `${attacker.name} partage le type ${move.type} avec sa capacité`
                : `${attacker.name} n'est pas de type ${move.type}, pas de STAB`
            }
          />
          <Tag
            label="Catégorie"
            value={
              move.category === "physical"
                ? "Phys."
                : move.category === "special"
                  ? "Spé."
                  : "Stat."
            }
            tone="neutral"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface Verdict {
  title: string;
  subtitle: string | null;
  cardTone: string;
  titleTone: string;
  iconTone: string;
}

/**
 * Pick the headline based on `hitsToKo` and the OHKO probability.
 * Returns the user-facing string plus the colour tone so the panel
 * tints itself: green if you're slicing the defender open, amber on
 * a coin-flip, red when you can't even chip them in three rolls.
 */
function damageVerdict(
  result: ReturnType<typeof calculateDamage>,
): Verdict {
  if (!result) {
    return {
      title: "—",
      subtitle: null,
      cardTone: "",
      titleTone: "",
      iconTone: "",
    };
  }
  if (result.effectiveness === 0) {
    return {
      title: "Immunité",
      subtitle: "La cible est insensible à ce type d'attaque.",
      cardTone: "border-muted-foreground/30 bg-muted/30",
      titleTone: "text-muted-foreground",
      iconTone: "text-muted-foreground",
    };
  }
  if (result.ohko === "Always") {
    return {
      title: "OHKO garanti",
      subtitle: "Toutes les rolls infligent au moins les PV restants.",
      cardTone: "border-emerald-500/40 bg-emerald-500/5",
      titleTone: "text-emerald-700 dark:text-emerald-300",
      iconTone: "text-emerald-500",
    };
  }
  if (result.ohko === "Likely") {
    return {
      title: `OHKO probable · ${Math.round(result.ohkoProbability)}%`,
      subtitle: `Sinon 2HKO. Min ${result.minPercent.toFixed(0)} %, max ${result.maxPercent.toFixed(0)} %.`,
      cardTone: "border-emerald-500/30 bg-emerald-500/5",
      titleTone: "text-emerald-700 dark:text-emerald-300",
      iconTone: "text-emerald-500",
    };
  }
  if (result.ohko === "Possible") {
    return {
      title: `OHKO possible · ${Math.round(result.ohkoProbability)}%`,
      subtitle: `${result.hitsToKo}HKO garanti dans le pire des cas.`,
      cardTone: "border-amber-500/30 bg-amber-500/5",
      titleTone: "text-amber-700 dark:text-amber-400",
      iconTone: "text-amber-500",
    };
  }
  // No OHKO — show how many hits it actually takes.
  if (result.hitsToKo === 2) {
    return {
      title: "2HKO garanti",
      subtitle: "Deux attaques suffisent même au pire roll.",
      cardTone: "border-amber-500/30 bg-amber-500/5",
      titleTone: "text-amber-700 dark:text-amber-400",
      iconTone: "text-amber-500",
    };
  }
  if (result.hitsToKo === 3) {
    return {
      title: "3HKO",
      subtitle: "Trois attaques au pire roll.",
      cardTone: "border-orange-500/30 bg-orange-500/5",
      titleTone: "text-orange-700 dark:text-orange-400",
      iconTone: "text-orange-500",
    };
  }
  return {
    title: `${result.hitsToKo}HKO`,
    subtitle: "Mauvais trade — change d'attaque ou de Pokémon.",
    cardTone: "border-destructive/30 bg-destructive/5",
    titleTone: "text-destructive",
    iconTone: "text-destructive",
  };
}

/**
 * HP bar with damage window overlay. The bar represents the defender's
 * full HP (100%). The damage window is drawn from `min` to `max` —
 * filled solid up to the KO threshold (100% if min<HP<max), darkened
 * past it (the "you're already KO'd" tail).
 */
function DamageBar({
  minPercent,
  maxPercent,
}: {
  minPercent: number;
  maxPercent: number;
}) {
  // The bar tops out at 150% so a roll that overshoots HP by 50% still
  // visually fits — the KO marker stays at the 2/3 point.
  const SCALE = Math.max(150, maxPercent + 10);
  const minLeft = (minPercent / SCALE) * 100;
  const width = ((maxPercent - minPercent) / SCALE) * 100;
  const koLeft = (100 / SCALE) * 100;
  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
      {/* damage window */}
      <div
        className="absolute inset-y-0 bg-destructive/70"
        style={{ left: `${minLeft}%`, width: `${width}%` }}
      />
      {/* KO threshold tick */}
      <div
        className="absolute inset-y-0 w-px bg-foreground/60"
        style={{ left: `${koLeft}%` }}
        aria-label="Seuil KO (100% PV)"
      />
    </div>
  );
}

function Tag({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
  title?: string;
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono",
        toneClass,
      )}
    >
      <span className="uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}
