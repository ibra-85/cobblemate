"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eraser,
  FilePlus2,
  Link as LinkIcon,
  Pencil,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { getSmogonStats } from "@/data/smogon";
import { smogonSetToSlotPatch } from "@/lib/smogon-set-mapping";
import {
  formatCapList,
  optimizeForTeam,
} from "@/lib/team-set-optimizer";
import {
  buildShareUrl,
  teamExportFromSlots,
} from "@/lib/team-share-codec";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { confirmedRoles, type RoleProfile } from "@/lib/team-roles";
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

/** Pretty-print a signed integer ("+5" / "−12" / "±0"). Uses the
 *  Unicode minus so the diff lines look typographically clean in the
 *  optimise toast. */
function signed(n: number): string {
  if (n === 0) return "±0";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/**
 * `initialTeamId` (`?team=…`) and `initialShared` (`?share=CBM1:…`)
 * are the two routes-into-builder entry points the page can wire up.
 *
 *  - **`initialTeamId`** — saved team from localStorage. Loaded async
 *    after hydration; `editingId` is set so "Save" updates in place.
 *  - **`initialShared`** — server-decoded share payload. Seeded
 *    immediately as a *temporary* import: `editingId` stays null, a
 *    "Importée — non sauvegardée" chip shows up, and the primary
 *    button is "Sauvegarder" (creates a NEW saved team, never
 *    auto-overwrites an existing one).
 */
interface TeamBuilderProps {
  initialTeamId?: string;
  initialShared?: { name: string; slots: TeamSlot[] } | null;
}

export function TeamBuilder({
  initialTeamId,
  initialShared,
}: TeamBuilderProps = {}) {
  const { teams, hydrated, create, update, remove } = useSavedTeams();
  // Seed straight from the shared payload so the builder renders the
  // imported team on first paint — no flash, no skeleton, no effect
  // dance. Saved-team loading (initialTeamId) is async via
  // localStorage and goes through the effect below.
  const [slots, setSlots] = useState<TeamSlot[]>(
    () => initialShared?.slots ?? EMPTY(),
  );
  const [name, setName] = useState(
    () => initialShared?.name ?? "Équipe sans titre",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  // Track imports so the UI can show a "non sauvegardée" chip and
  // the saveCurrent flow knows to create (not update). Cleared once
  // the user saves the imported team — at that point it becomes a
  // normal saved team like any other.
  const [importedFromShare, setImportedFromShare] = useState<boolean>(
    () => !!initialShared,
  );
  // Tri-state: undefined while we still need to resolve `?team=…`,
  // true once the lookup has been attempted (found or not). Drives
  // the loading skeleton below so the user never sees a brief flash
  // of empty builder between hydration and the team load.
  // Initialised based on `initialTeamId` so direct visits to
  // `/team-builder` skip the skeleton entirely.
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(
    () => !initialTeamId,
  );
  // Controls the share/import dialog from the actions menu. Hoisted
  // here so the menu item can open it without nesting two triggers.
  const [shareOpen, setShareOpen] = useState(false);

  // One-shot URL → team hydration. The ref tracks the last id we've
  // honoured, so:
  //  - `teams` updates from `useSavedTeams` (e.g. user hits Save)
  //    don't re-trigger the load and wipe in-progress edits
  //  - a same-route navigation that changes `?team=` *does* trigger
  //    a fresh load (ref value differs from new prop)
  //  - `?team=` absent → ref captures `undefined` and we leave the
  //    blank slate alone
  const lastLoadedTeamId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!hydrated) return;
    if (initialTeamId === lastLoadedTeamId.current) return;
    lastLoadedTeamId.current = initialTeamId;
    if (initialTeamId) {
      const target = teams.find((t) => t.id === initialTeamId);
      if (target) {
        setEditingId(target.id);
        setSlots(target.slots);
        setName(target.name);
      }
    }
    // Flip the loading flag regardless of whether the team was found
    // — a missing id (deleted team, typo'd URL) should fall through
    // to the blank builder, not leave the skeleton stuck on screen.
    setInitialLoadDone(true);
  }, [hydrated, initialTeamId, teams]);

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

  // Memoised so `team`'s reference stays stable when `slots` hasn't
  // changed — otherwise every keystroke on the team name input
  // (which re-renders the builder) would produce a fresh `team`
  // array, busting the `analyzeTeam` memo below and re-running the
  // ~3.4k-candidate replacement search on every character typed.
  const team = useMemo(() => resolveTeam(slots), [slots]);
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

  // Parallel-to-slots role profile array (matches the 6-slot grid,
  // `undefined` for empty positions). Memoised on (slots, profiles)
  // so `<TeamSlotGrid>` skips re-renders during name keystrokes —
  // both inputs are stable when only `name` changes.
  const profilesPerSlot = useMemo(() => {
    let filled = 0;
    return slots.map((s) =>
      s.pokemonId ? analysis.roleProfiles[filled++] : undefined,
    );
  }, [slots, analysis.roleProfiles]);

  /**
   * Drop a Pokémon into a slot (or empty it). When picking a fresh
   * mon, the slot's set config (ability/item/moves) is wiped so the
   * scoring doesn't carry stale picks across species, and the talent
   * is auto-resolved when the Pokémon has a single ability — mirrors
   * the strict policy: never credit a non-chosen ability, but a
   * single-option talent is unambiguous.
   *
   * `useCallback` with empty deps — the function only touches the
   * `setSlots` updater (stable from useState) and the imported
   * `POKEMON_BY_ID`, so its ref can stay stable forever. Critical for
   * `TeamSlotGrid`'s `memo` to skip re-renders on unrelated state
   * changes like name keystrokes.
   */
  const setSlot = useCallback((index: number, pokemonId: string | null) => {
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
  }, []);

  const updateSlotConfig = useCallback(
    (index: number, patch: Partial<TeamSlot>) => {
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

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
    // Saving promotes an imported team to a regular saved team —
    // drop the "non sauvegardée" chip.
    if (importedFromShare) setImportedFromShare(false);
  }

  /**
   * Clear all slots in place, keeping the name + editingId.
   * Different from `newTeam` (which resets the entire workspace) —
   * useful when the user wants to rebuild the same team from scratch
   * without losing the team's identity.
   */
  function resetSlots() {
    setSlots(EMPTY());
    toast.success("Slots vidés.");
  }

  /** Copy the shareable URL for the current team to the clipboard. */
  async function copyShareLink() {
    if (slots.every((s) => !s.pokemonId)) {
      toast.error("Équipe vide — rien à partager.");
      return;
    }
    try {
      const team = teamExportFromSlots(name, slots);
      const url = buildShareUrl(team, window.location.origin);
      await navigator.clipboard.writeText(url);
      toast.success("Lien de partage copié !");
    } catch {
      toast.error("Impossible de copier dans le presse-papiers.");
    }
  }

  function newTeam() {
    setEditingId(null);
    setImportedFromShare(false);
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

  // useCallback so the memoised `TeamAnalysisSuggestions` skips
  // re-renders during name keystrokes — without it the function is
  // recreated each render, busting the suggestion panel's memo and
  // re-running its heavy chip layout for nothing.
  const applyReplacement = useCallback(
    (r: TeamReplacement) => {
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
    },
    [slots],
  );

  function generateOptimalTeam() {
    // Hands off to the analysis lib which samples random rosters and
    // returns the highest-scoring one — see `optimizeTeam` for the
    // search strategy. `optimizeTeam` now returns `TeamSlot[]` with
    // each Pokémon's top Smogon set already applied (talent, item,
    // moves, nature, EVs, IVs) so the user lands on a fully-
    // configured team without an extra "Optimiser sets" click.
    const best = optimizeTeam();
    setEditingId(null);
    setImportedFromShare(false);
    setSlots(best);
    setName("Équipe optimisée");
    toast.success("Équipe optimisée générée avec sets Smogon.");
  }

  /**
   * For every filled slot, look up the Pokémon's most-popular Smogon
   * set and apply it (talent + item + moves + nature + EVs + IVs).
   * Keeps the user's chosen Pokémon — only the *config* changes. This
   * is the "make my team meta-ready in one click" affordance.
   *
   * Idempotent: pre-compute the new slots + counts on the *current*
   * `slots` state in one pass, then commit. The previous version
   * counted inside the `setSlots` updater, which interacted badly
   * with React's strict-mode double-invoke — second clicks read a
   * stale closure and the toast misfired.
   *
   * Mons missing from the Smogon dataset (or species without curated
   * sets) are left untouched and counted toward the toast so the user
   * knows the operation wasn't a no-op for the wrong reason.
   */
  function optimizeAllSets() {
    let applied = 0;
    let skipped = 0;
    let filled = 0;
    const appliedLabels: string[] = [];
    const next = slots.map((s) => {
      if (!s.pokemonId) return s;
      filled++;
      const p = POKEMON_BY_ID[s.pokemonId];
      if (!p) return s;
      const stats = getSmogonStats(p.id);
      const set = stats?.sets[0];
      if (!set) {
        skipped++;
        return s;
      }
      applied++;
      // Carry the set name into the toast so the user knows which
      // Smogon archetype was applied to each mon (Bulky DD vs Choice
      // Band etc. — they're not interchangeable).
      appliedLabels.push(`${p.name} → ${set.name}`);
      // Pass `stats` so the ability resolver can fall back to the
      // dex's most-used ability when `set.ability` is null (Smogon
      // omits it on mons with a single dominant talent — Rotom,
      // Corviknight, Iron Valiant…).
      return { ...s, ...smogonSetToSlotPatch(set, p, stats) };
    });

    // Decide the toast / state mutation from the precomputed counts —
    // no closure dependency on `setSlots` ordering.
    if (filled === 0) {
      toast.error(
        "Équipe vide. Ajoute des Pokémon avant d'optimiser leurs sets.",
      );
      return;
    }
    if (applied === 0) {
      toast.error(
        "Aucun set Smogon trouvé pour cette équipe — Pokémon non couverts en compétitif.",
      );
      return;
    }

    // Before/after diff — the user complained that "Optimiser sets"
    // sometimes *lowered* the score because applied Smogon sets
    // dropped key roles (hazard setter, removal). We compute both
    // analyses against the same selectedMoves logic and surface the
    // deltas in the toast description.
    const before = analyzeTeam(resolveTeam(slots), slots);
    const afterTeam = resolveTeam(next);
    const after = analyzeTeam(afterTeam, next);
    const deltas: string[] = [];
    const dScore = after.score - before.score;
    deltas.push(`Score ${before.score} → ${after.score} (${signed(dScore)})`);
    const axes: { key: keyof typeof before.breakdown; label: string }[] = [
      { key: "offense", label: "Offense" },
      { key: "defense", label: "Défense" },
      { key: "hazard", label: "Hazard" },
      { key: "utility", label: "Utility" },
      { key: "reliability", label: "Fiabilité" },
    ];
    const drops: string[] = [];
    for (const { key, label } of axes) {
      const dv = after.breakdown[key].value - before.breakdown[key].value;
      if (Math.abs(dv) >= 15) {
        deltas.push(
          `${label} ${before.breakdown[key].value} → ${after.breakdown[key].value} (${signed(dv)})`,
        );
        if (dv <= -15) drops.push(label.toLowerCase());
      }
    }

    setSlots(next);
    const headline = `${applied} set${applied > 1 ? "s" : ""} Smogon appliqué${applied > 1 ? "s" : ""}${
      skipped > 0 ? ` · ${skipped} sans set` : ""
    }`;
    const lines = [appliedLabels.join(" · "), deltas.join(" · ")];
    if (drops.length > 0) {
      lines.push(
        `⚠ Baisse marquée sur ${drops.join(", ")} — les sets appliqués ne couvrent plus ces rôles aussi bien.`,
      );
    }
    toast.success(headline, {
      description: lines.join("\n"),
      duration: 7000,
    });
  }

  /**
   * Team-aware set optimisation. Same input as `optimizeAllSets`
   * (filled slots, top Smogon sets), but the picker chooses *which*
   * of each mon's curated sets to apply based on the team's missing
   * roles (hazards / removal / pivot / walls / win cons). See
   * `team-set-optimizer.ts` for the scoring rules.
   *
   * The post-toast surfaces a "Rôles restaurés / Toujours manquants"
   * delta so the user understands what shifted vs. the individual
   * mode.
   */
  function optimizeSetsForTeam() {
    const result = optimizeForTeam(slots);
    if (result.choices.length === 0) {
      toast.error(
        result.skipped.length > 0
          ? "Aucun set Smogon disponible pour cette équipe."
          : "Équipe vide. Ajoute des Pokémon avant d'optimiser leurs sets.",
      );
      return;
    }

    const before = analyzeTeam(resolveTeam(slots), slots);
    const next = slots.map((s, i) => {
      const pick = result.choices.find((c) => c.slotIndex === i);
      if (!pick) return s;
      return { ...s, ...pick.patch };
    });
    const afterTeam = resolveTeam(next);
    const after = analyzeTeam(afterTeam, next);

    setSlots(next);

    const headline = `${result.choices.length} set${result.choices.length > 1 ? "s" : ""} pour l'équipe appliqué${result.choices.length > 1 ? "s" : ""}${
      result.skipped.length > 0 ? ` · ${result.skipped.length} sans set` : ""
    }`;

    // Set names + reasons — show the user *why* the picker chose this
    // set over the top-1 in the cases where it diverged.
    const setLines = result.choices.map((c) => {
      const name = POKEMON_BY_ID[c.pokemonId]?.name ?? c.pokemonId;
      const why = c.reasons.length > 0 ? ` (${c.reasons.join(", ")})` : "";
      return `${name} → ${c.setName}${why}`;
    });

    // Score / axis deltas — same shape as the individual-mode toast
    // so the two are visually comparable.
    const deltas: string[] = [];
    const dScore = after.score - before.score;
    deltas.push(`Score ${before.score} → ${after.score} (${signed(dScore)})`);
    const axes: { key: keyof typeof before.breakdown; label: string }[] = [
      { key: "hazard", label: "Hazard" },
      { key: "utility", label: "Utility" },
      { key: "reliability", label: "Fiabilité" },
    ];
    for (const { key, label } of axes) {
      const dv = after.breakdown[key].value - before.breakdown[key].value;
      if (Math.abs(dv) >= 10) {
        deltas.push(
          `${label} ${before.breakdown[key].value} → ${after.breakdown[key].value} (${signed(dv)})`,
        );
      }
    }

    // Roles restored vs. still missing — pulled from the team-set
    // optimizer's before/after capability snapshot.
    const restored = formatCapList(
      new Set(
        Array.from(result.rolesAfter).filter((c) => !result.rolesBefore.has(c)),
      ),
    );
    const allCaps: string[] = [
      "hazard-setter",
      "removal",
      "pivot",
      "support",
      "win",
    ];
    const stillMissing = allCaps.filter((c) => !result.rolesAfter.has(c));

    const lines: string[] = [setLines.join("\n"), deltas.join(" · ")];
    if (restored.length > 0) {
      lines.push(`✅ Rôles restaurés : ${restored.join(", ")}`);
    }
    if (stillMissing.length > 0) {
      lines.push(
        `⚠ Toujours manquant : ${formatCapList(new Set(stillMissing)).join(", ")}`,
      );
    }
    toast.success(headline, {
      description: lines.join("\n"),
      duration: 9000,
    });
  }

  // Hold the layout while `?team=…` resolves from localStorage. The
  // window is short in prod (<100ms) but visible — without this the
  // user sees the empty builder flash before the dashboard's pick
  // pops in, which reads as "did my click work?". The skeleton
  // mirrors the real layout (toolbar + 3×2 grid + right rail) so
  // the swap is purely a content swap, not a layout shift.
  if (!initialLoadDone) {
    return <TeamBuilderSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {/* Toolbar — two visible buttons (Save + Actions ▾) instead of
            the previous 5-wide spread. The action menu groups all the
            secondary workflows (new, share, optimise) behind a single
            dropdown so the headline action stays clear and the bar
            doesn't wrap awkwardly on narrow screens. */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          {importedFromShare && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300"
              title="Équipe chargée depuis un lien de partage — elle ne sera pas sauvegardée tant que tu ne cliques pas sur « Sauvegarder »."
            >
              Importée · non sauvegardée
            </span>
          )}
          <Button onClick={saveCurrent}>
            <Save data-icon="inline-start" />
            {editingId ? "Mettre à jour" : "Sauvegarder"}
          </Button>
          <TeamActionsMenu
            hasSlots={!slots.every((s) => !s.pokemonId)}
            onNewTeam={newTeam}
            onOpenShare={() => setShareOpen(true)}
            onCopyShareLink={copyShareLink}
            onGenerateOptimal={generateOptimalTeam}
            onOptimizeSetsIndividual={optimizeAllSets}
            onOptimizeSetsForTeam={optimizeSetsForTeam}
            onResetSlots={resetSlots}
          />
          <TeamShareDialog
            slots={slots}
            name={name}
            open={shareOpen}
            onOpenChange={setShareOpen}
            onImport={(importedName, importedSlots) => {
              setName(importedName);
              setSlots(importedSlots);
              setEditingId(null);
              setImportedFromShare(true);
            }}
          />
        </div>

        {/* Slot grid extracted into a memoised child so name-input
            keystrokes don't re-render the 6 cards. All props passed
            here are reference-stable across unrelated re-renders
            (slots, teamIds, profilesPerSlot all memoised; setSlot /
            updateSlotConfig are useCallback). */}
        <TeamSlotGrid
          slots={slots}
          teamIds={teamIds}
          profilesPerSlot={profilesPerSlot}
          onSetSlot={setSlot}
          onUpdateSlotConfig={updateSlotConfig}
        />

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

/**
 * Memoised 3×2 slot grid. The whole point of carving it out as its
 * own component is that `memo` lets it skip re-renders when only the
 * team's *name* changes — slots / teamIds / profilesPerSlot /
 * onSetSlot / onUpdateSlotConfig are all reference-stable across
 * unrelated state changes, so the memo comparator returns true and
 * the 6 cards stay mounted exactly as they were.
 */
const TeamSlotGrid = memo(function TeamSlotGrid({
  slots,
  teamIds,
  profilesPerSlot,
  onSetSlot,
  onUpdateSlotConfig,
}: {
  slots: TeamSlot[];
  teamIds: string[];
  profilesPerSlot: (RoleProfile | undefined)[];
  onSetSlot: (index: number, id: string | null) => void;
  onUpdateSlotConfig: (index: number, patch: Partial<TeamSlot>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
      {slots.map((slot, i) => {
        const p = slot.pokemonId ? POKEMON_BY_ID[slot.pokemonId] : null;
        if (!p) {
          return (
            <PokemonPicker
              key={i}
              onPick={(id) => onSetSlot(i, id)}
              excludeIds={teamIds}
            />
          );
        }
        const profile = profilesPerSlot[i];
        return (
          <FilledSlot
            key={i}
            slot={slot}
            pokemon={p}
            excludeIds={teamIds}
            activeRoles={profile?.active ?? []}
            onSwap={(id) => onSetSlot(i, id)}
            onClear={() => onSetSlot(i, null)}
            onConfigChange={(patch) => onUpdateSlotConfig(i, patch)}
          />
        );
      })}
    </div>
  );
});

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

  // Roles the slot's declared moves actually confirm — drives the
  // chip styling on the card (solid for confirmed, dashed for
  // potential). Recomputed only when the moves change; the analysis
  // engine's `activeRoles` is fed independently.
  const confirmed = useMemo(
    () => confirmedRoles(slot.selectedMoves),
    [slot.selectedMoves],
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
            confirmedRoles={confirmed}
            selectedAbility={slot.selectedAbility}
            selectedItem={slot.selectedItem}
            selectedMoves={slot.selectedMoves}
            nature={slot.nature}
            evs={slot.evs}
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

/**
 * Layout-preserving placeholder shown while `?team=…` is being
 * resolved from localStorage. Mirrors the real builder shape so the
 * paint transition is a content swap rather than a layout shift —
 * users see the toolbar, slot grid and right rail land where they'll
 * actually sit, with a soft "Chargement de l'équipe…" cue so the
 * window doesn't read as a bug.
 */
function TeamBuilderSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted/70" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted/50" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted/50" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-64 animate-pulse flex-col items-center justify-center gap-3 rounded-xl border bg-card/40 p-4"
            >
              <div className="size-20 rounded-full bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2 w-16 rounded bg-muted/70" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Chargement de l&apos;équipe…
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-40 animate-pulse rounded-xl border bg-card/40" />
        <div className="h-64 animate-pulse rounded-xl border bg-card/40" />
      </div>
    </div>
  );
}

/**
 * Compact actions dropdown for the team-builder toolbar. Groups
 * everything except 'Save' so the headline action stays unambiguous
 * — the previous flat spread of 5 buttons (Save / Nouvelle / Équipe
 * optimale / Optimiser sets / Partager) read as visual clutter and
 * wrapped to two lines on tablets.
 *
 *  - Nouvelle équipe — full reset (name + slots + editing state)
 *  - Partager / importer — opens the share dialog (controlled)
 *  - Copier le lien — direct clipboard write, no dialog
 *  - Équipe optimale — generate from scratch
 *  - Optimiser les sets — apply top Smogon set to each filled slot
 *  - Réinitialiser les slots — clear all 6 slots, keep the name
 */
function TeamActionsMenu({
  hasSlots,
  onNewTeam,
  onOpenShare,
  onCopyShareLink,
  onGenerateOptimal,
  onOptimizeSetsIndividual,
  onOptimizeSetsForTeam,
  onResetSlots,
}: {
  hasSlots: boolean;
  onNewTeam: () => void;
  onOpenShare: () => void;
  onCopyShareLink: () => void;
  onGenerateOptimal: () => void;
  onOptimizeSetsIndividual: () => void;
  onOptimizeSetsForTeam: () => void;
  onResetSlots: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            Actions
            <ChevronDown className="size-3.5 opacity-60" data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuItem onClick={onNewTeam}>
          <FilePlus2 className="size-4" />
          Nouvelle équipe
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenShare}>
          <Share2 className="size-4" />
          Partager / importer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyShareLink} disabled={!hasSlots}>
          <LinkIcon className="size-4" />
          Copier le lien de partage
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onGenerateOptimal}>
          <Sparkles className="size-4" />
          Équipe optimale
        </DropdownMenuItem>
        {/* Two distinct optimisation modes — individual = top-1 set
            per mon (fast, may break team structure); team = picks
            sets that preserve / restore hazards / pivot / win cons. */}
        <DropdownMenuItem
          onClick={onOptimizeSetsIndividual}
          disabled={!hasSlots}
        >
          <Wand2 className="size-4" />
          Optimiser individuellement
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOptimizeSetsForTeam}
          disabled={!hasSlots}
        >
          <Wand2 className="size-4" />
          Optimiser pour l&apos;équipe
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onResetSlots} disabled={!hasSlots}>
          <Eraser className="size-4" />
          Réinitialiser les slots
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

