"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { cn } from "@/lib/utils";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import type { Pokemon, PokemonRole, SavedTeam, TeamSlot } from "@/types";
import {
  analyzeTeam,
  optimizeTeam,
  resolveTeam,
  type TeamReplacement,
} from "@/lib/team-analysis";
import { formatRelativeTime } from "@/lib/format-time";
import { PokemonPicker } from "./pokemon-picker";
import { PokemonPickerTrigger } from "./pokemon-picker-trigger";
import { SlotConfigDialog } from "./slot-config-dialog";
import {
  TeamAnalysisCoverage,
  TeamAnalysisHeader,
  TeamAnalysisSuggestions,
} from "./team-analysis-panel";
import { TeamShareDialog } from "./team-share-dialog";
import { TeamStatsCard } from "./team-stats-card";
import { toast } from "sonner";

const EMPTY = (): TeamSlot[] => Array.from({ length: 6 }, () => ({ pokemonId: null }));

export function TeamBuilder() {
  const { teams, hydrated, create, update, remove } = useSavedTeams();
  const [slots, setSlots] = useState<TeamSlot[]>(EMPTY());
  const [name, setName] = useState("Équipe sans titre");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load the form from a saved team. Called from the row click below
  // instead of via an effect on `editingId` — the click already has
  // the full team object in hand, so synchronising through state +
  // an effect would just bounce off React 19's set-state-in-effect
  // lint rule for no benefit.
  function loadTeam(t: SavedTeam) {
    setEditingId(t.id);
    setSlots(t.slots);
    setName(t.name);
  }

  const team = resolveTeam(slots);
  // `slots` passed in so `analyzeTeam` → `findBestReplacements` can
  // hand us suggestion indices that align with the 6-slot grid the
  // builder owns. Without it, suggestions would carry resolved-team
  // indices and `applyReplacement` would touch the wrong slot when
  // the team has gaps.
  const analysis = useMemo(() => analyzeTeam(team, slots), [team, slots]);
  // Memoised so the `excludeIds` array handed to every `<PokemonPicker>`
  // and `<FilledSlot>` keeps a stable reference between renders that
  // didn't actually change the lineup — otherwise their downstream
  // filters re-run on unrelated state changes (name typing, picker
  // open/close).
  const teamIds = useMemo(
    () => slots.flatMap((s) => (s.pokemonId ? [s.pokemonId] : [])),
    [slots],
  );

  // Most-recent first in the saved-teams list — same default as any
  // file picker / editor: the team you just touched is the one you
  // most likely want to come back to.
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => b.updatedAt - a.updatedAt),
    [teams],
  );

  /**
   * Drop a Pokémon into a slot (or empty it). When picking a fresh
   * mon, the slot's set config (ability/item/moves) is wiped so the
   * scoring doesn't carry stale picks across species, and the talent
   * is auto-resolved when the Pokémon has a single ability — mirrors
   * the strict policy: never credit a non-chosen ability, but a
   * single-option talent is unambiguous.
   */
  function setSlot(index: number, pokemonId: string | null) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (!pokemonId) {
          return { pokemonId: null };
        }
        const p = POKEMON_BY_ID[pokemonId];
        const allAbilities = p
          ? [...new Set([...p.abilities, p.hiddenAbility].filter(Boolean))]
          : [];
        const auto =
          allAbilities.length === 1 ? (allAbilities[0] as string) : undefined;
        return {
          pokemonId,
          selectedAbility: auto,
        };
      }),
    );
  }

  function updateSlotConfig(index: number, patch: Partial<TeamSlot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function saveCurrent() {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Donne un nom à ton équipe avant de la sauvegarder.");
      return;
    }
    if (editingId) {
      update(editingId, { name: cleanName, slots });
      toast.success(`Équipe « ${cleanName} » mise à jour.`);
    } else {
      const t = create(cleanName, slots);
      setEditingId(t.id);
      toast.success(`Équipe « ${cleanName} » sauvegardée.`);
    }
    if (cleanName !== name) setName(cleanName);
  }

  function newTeam() {
    setEditingId(null);
    setSlots(EMPTY());
    setName("Équipe sans titre");
  }

  function duplicateTeam(t: SavedTeam) {
    const copyName = `${t.name} (copie)`;
    const created = create(copyName, t.slots.map((s) => ({ ...s })));
    setEditingId(created.id);
    setSlots(created.slots);
    setName(created.name);
    toast.success(`Copie « ${copyName} » créée.`);
  }

  function applyReplacement(r: TeamReplacement) {
    // `fromIndex >= 0` → swap that slot.
    // `fromIndex === -1` → addition; drop the candidate into the
    // first empty slot. We never expose this branch when the team is
    // already full because `findBestReplacements` skips the addition
    // bucket then, but the guard keeps the code honest.
    if (r.fromIndex >= 0) {
      setSlot(r.fromIndex, r.candidate.id);
      toast.success(
        r.current
          ? `${r.current.name} → ${r.candidate.name} (+${r.gain})`
          : `${r.candidate.name} ajouté (+${r.gain})`,
      );
      return;
    }
    const firstEmpty = slots.findIndex((s) => !s.pokemonId);
    if (firstEmpty === -1) return;
    setSlot(firstEmpty, r.candidate.id);
    toast.success(`${r.candidate.name} ajouté (+${r.gain})`);
  }

  function generateOptimalTeam() {
    // Hands off to the analysis lib which samples random rosters and
    // returns the highest scoring one — see `optimizeTeam` for the
    // search strategy and budget rationale.
    const best = optimizeTeam();
    setEditingId(null);
    setSlots(best.map((p) => ({ pokemonId: p.id })));
    setName("Équipe optimisée");
    toast.success("Équipe optimisée générée (meilleur score trouvé).");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={saveCurrent}>
            <Save data-icon="inline-start" />
            {editingId ? "Mettre à jour" : "Sauvegarder"}
          </Button>
          <Button variant="outline" onClick={newTeam}>
            Nouvelle
          </Button>
          <Button variant="outline" onClick={generateOptimalTeam}>
            <Sparkles data-icon="inline-start" />
            Équipe optimale
          </Button>
          <TeamShareDialog
            slots={slots}
            name={name}
            onImport={(importedName, importedSlots) => {
              setName(importedName);
              setSlots(importedSlots);
              setEditingId(null);
            }}
          />
        </div>

        {/* Slot grid — canonical "in-game team" 3×2 layout from sm on
            up. The previous 6×1 strip stretched each card past 200 px
            on wide displays and the content read as sparse; 3 columns
            gives each card breathing room for a bigger sprite + name
            + types without ever feeling vide. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {slots.map((slot, i) => {
            const p = slot.pokemonId ? POKEMON_BY_ID[slot.pokemonId] : null;
            if (!p) {
              return (
                <PokemonPicker
                  key={i}
                  onPick={(id) => setSlot(i, id)}
                  excludeIds={teamIds}
                />
              );
            }
            // Map this slot to its role profile in the analysis result.
            // `analysis.roleProfiles` is parallel to `resolveTeam(slots)`
            // — slots without a pokemonId are filtered out, so we count
            // how many filled slots precede us.
            const profileIdx = slots
              .slice(0, i)
              .filter((s) => s.pokemonId).length;
            const profile = analysis.roleProfiles[profileIdx];
            return (
              <FilledSlot
                key={i}
                slot={slot}
                pokemon={p}
                excludeIds={teamIds}
                activeRoles={profile?.active ?? []}
                onSwap={(id) => setSlot(i, id)}
                onClear={() => setSlot(i, null)}
                onConfigChange={(patch) => updateSlotConfig(i, patch)}
              />
            );
          })}
        </div>

        {/* Snapshot KPIs — the right-panel score answers "is this team
            balanced?", the snapshot answers "what kind of team is it?"
            (slow / fast / mixed offense, HP pool). Kept in the main
            column so it sits next to the slot grid that produced it. */}
        <TeamStatsCard team={team} />

        {/* Defensive coverage + offensive coverage + suggestions —
            moved here from the right rail so the right panel can stay
            focused on the score headline. Below the snapshot because
            this is "now that I see the shape, here's what's covered
            and what isn't". */}
        <TeamAnalysisCoverage analysis={analysis} />

        {hydrated && sortedTeams.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm font-semibold">
                Équipes sauvegardées
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({sortedTeams.length})
                </span>
              </p>
              <div className="flex flex-col gap-1">
                {sortedTeams.map((t) => (
                  <SavedTeamRow
                    key={t.id}
                    team={t}
                    isCurrent={editingId === t.id}
                    onLoad={() => loadTeam(t)}
                    onDuplicate={() => duplicateTeam(t)}
                    onRename={(newName) => {
                      update(t.id, { name: newName });
                      if (editingId === t.id) setName(newName);
                      toast.success(`Renommée en « ${newName} ».`);
                    }}
                    onDelete={() => {
                      remove(t.id);
                      if (editingId === t.id) newTeam();
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <TeamAnalysisHeader analysis={analysis} />
        <TeamAnalysisSuggestions analysis={analysis} onApply={applyReplacement} />
      </div>
    </div>
  );
}

/**
 * A slot that already holds a Pokémon. Clicking anywhere on the body
 * opens the picker pre-positioned to swap this slot — much faster
 * than the old "click ✕, then click +" two-step. The ✕ button stops
 * propagation so removing stays a single click too.
 */
function FilledSlot({
  slot,
  pokemon,
  excludeIds,
  activeRoles,
  onSwap,
  onClear,
  onConfigChange,
}: {
  slot: TeamSlot;
  pokemon: Pokemon;
  excludeIds: string[];
  activeRoles: PokemonRole[];
  onSwap: (id: string) => void;
  onClear: () => void;
  onConfigChange: (patch: Partial<TeamSlot>) => void;
}) {
  // The picker excludes mons already in the team *except this slot* —
  // otherwise re-picking the same mon would be greyed out. Memoised so
  // the array identity stays stable when `excludeIds` is, which keeps
  // the picker from re-running its result memo on noise.
  const others = useMemo(
    () => excludeIds.filter((id) => id !== pokemon.id),
    [excludeIds, pokemon.id],
  );

  return (
    // Wrapping `<div>` anchors three sibling buttons of the card
    // (gear top-left, ✕ top-right) so neither is nested inside the
    // picker trigger — base-ui's `nativeButton` check would reject
    // that, and nested buttons are invalid HTML anyway. `h-full`
    // stretches the wrapper to the grid row height so the corner
    // affordances sit on the card corners regardless of card content.
    // `group` lets the corner affordances fade in on hover — they're
    // there for power users but shouldn't compete with the sprite for
    // attention on idle cards.
    <div className="group relative h-full">
      <PokemonPicker
        onPick={onSwap}
        excludeIds={others}
        trigger={
          <PokemonPickerTrigger
            pokemon={pokemon}
            variant="card"
            activeRoles={activeRoles}
            selectedAbility={slot.selectedAbility}
            selectedItem={slot.selectedItem}
            selectedMoves={slot.selectedMoves}
          />
        }
      />
      <SlotConfigDialog
        pokemon={pokemon}
        slot={slot}
        onApply={onConfigChange}
      />
      <button
        type="button"
        onClick={onClear}
        className="absolute right-2 top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Retirer ${pokemon.name}`}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/**
 * One row in the "Équipes sauvegardées" panel.
 *
 * Two visual modes:
 *  - **read** — clickable row that loads the team. Strong hover state
 *    so it reads as interactive at a glance, plus icon actions
 *    (Renommer / Dupliquer / Supprimer) on the right.
 *  - **edit** — name field inline with Save / Cancel, kicked off by
 *    the pencil button. Enter saves, Esc cancels — keyboard-only
 *    rename matches every other inline-edit affordance in the app.
 */
function SavedTeamRow({
  team,
  isCurrent,
  onLoad,
  onDuplicate,
  onRename,
  onDelete,
}: {
  team: SavedTeam;
  isCurrent: boolean;
  onLoad: () => void;
  onDuplicate: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const filled = team.slots.filter((s) => s.pokemonId).length;

  function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === team.name) {
      setEditing(false);
      setDraft(team.name);
      return;
    }
    onRename(trimmed);
    setEditing(false);
  }

  function cancelRename() {
    setDraft(team.name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          isCurrent && "border-primary/60 bg-primary/5",
        )}
      >
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") cancelRename();
          }}
          className="h-7 flex-1 text-sm"
        />
        <button
          type="button"
          onClick={commitRename}
          className="grid size-7 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent hover:text-primary"
          aria-label="Confirmer le nouveau nom"
          title="Confirmer (Entrée)"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={cancelRename}
          className="grid size-7 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Annuler"
          title="Annuler (Échap)"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        isCurrent
          ? "border-primary/60 bg-primary/5"
          : "hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <button
        type="button"
        onClick={onLoad}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
        title="Charger cette équipe"
      >
        <span className="flex items-center gap-1.5 truncate font-medium">
          {team.name}
          {isCurrent && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              · en cours
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {filled}/6 · {formatRelativeTime(team.updatedAt)}
        </span>
      </button>
      <div className="flex items-center gap-0.5">
        <RowAction
          label={`Renommer ${team.name}`}
          onClick={() => {
            setDraft(team.name);
            setEditing(true);
          }}
          icon={<Pencil className="size-3.5" />}
        />
        <RowAction
          label={`Dupliquer ${team.name}`}
          onClick={onDuplicate}
          icon={<Copy className="size-3.5" />}
        />
        <RowAction
          label={`Supprimer ${team.name}`}
          onClick={onDelete}
          icon={<Trash2 className="size-3.5" />}
          danger
        />
      </div>
    </div>
  );
}

/**
 * Compact icon button used by `SavedTeamRow`. Shared so the three
 * actions read identically (size, hover state, accessible label).
 * `danger` flips the hover colour to destructive for the delete affordance.
 */
function RowAction({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid size-7 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
