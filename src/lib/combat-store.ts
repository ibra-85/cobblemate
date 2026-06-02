"use client";

import { createLocalStorageStore, useIsHydrated } from "@/lib/local-storage-store";
import type { TeamSlot } from "@/types";

/**
 * Global, persistent state shared across the three Combat tabs (Assistant,
 * Team vs Team, Damage Calc). Single source of truth so a Pokémon picked
 * in one tab is immediately available in the others, and a refresh
 * restores the user exactly where they left off.
 *
 * Persistence shape (localStorage key `cobblemate.combat.v1`):
 *   - `myTeamId`         — id of the saved team currently loaded into
 *                          "your team" (Assistant + TvT). `null` means
 *                          the user is running an ad-hoc team.
 *   - `myAdHocSlots`     — the ad-hoc team itself. Lives separately from
 *                          a saved team so toggling between "rapide" and
 *                          a saved team doesn't destroy the ad-hoc work.
 *   - `enemySlots`       — enemy team for the TvT matrix.
 *   - `selectedEnemyId`  — single opponent for the Assistant tab.
 *   - `calc`             — Damage Calc state (attacker, defender, move,
 *                          level). Shared so picking a Pokémon in the
 *                          Assistant pre-seeds the calc.
 *   - `recentEnemyIds`   — last 5 opponents picked (CMD+K recents).
 *   - `recentTeamIds`    — last 5 saved teams loaded.
 */
export interface CombatState {
  myTeamId: string | null;
  myAdHocSlots: TeamSlot[];
  enemySlots: TeamSlot[];
  selectedEnemyId: string | null;
  calc: {
    attackerId: string | null;
    defenderId: string | null;
    moveId: string | null;
    /** Attacker level — drives offensive stat in the damage formula. */
    attackerLevel: number;
    /** Defender level — drives both defensive stat and HP. Independent
     *  from the attacker so Cobblemon scenarios like "lvl 100 player vs
     *  lvl 120 boss" stay accurate. */
    defenderLevel: number;
    /** When the move was suggested by the Assistant's "Tester dans le
     *  calc" deep-link, surface a "recommandé" badge in the calc so the
     *  user remembers where it came from. Cleared on the next manual
     *  move pick. */
    moveSuggested: boolean;
  };
  recentEnemyIds: string[];
  recentTeamIds: string[];
}

const RECENT_MAX = 5;

export const EMPTY_COMBAT_SLOTS = (): TeamSlot[] =>
  Array.from({ length: 6 }, () => ({ pokemonId: null }));

const INITIAL: CombatState = {
  myTeamId: null,
  myAdHocSlots: EMPTY_COMBAT_SLOTS(),
  enemySlots: EMPTY_COMBAT_SLOTS(),
  selectedEnemyId: null,
  calc: {
    attackerId: null,
    defenderId: null,
    moveId: null,
    attackerLevel: 50,
    defenderLevel: 50,
    moveSuggested: false,
  },
  recentEnemyIds: [],
  recentTeamIds: [],
};

const store = createLocalStorageStore<CombatState>(
  "cobblemate.combat.v1",
  INITIAL,
);

function pushRecent(list: string[], id: string): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENT_MAX);
}

function updateSlotAt(
  slots: TeamSlot[],
  i: number,
  patch: TeamSlot | null,
): TeamSlot[] {
  return slots.map((cur, idx) =>
    idx === i ? (patch ?? { pokemonId: null }) : cur,
  );
}

/**
 * React hook — subscribes to the combat state and re-renders the caller
 * on any change. Pair the returned `hydrated` flag with empty-state
 * gating: until the first client render commits, the snapshot is the
 * SSR fallback (empty team, no enemy) and consumers will otherwise
 * flash an "empty" frame before localStorage values arrive.
 */
export function useCombatStore(): CombatState & { hydrated: boolean } {
  const state = store.use();
  const hydrated = useIsHydrated();
  return { ...state, hydrated };
}

/**
 * Imperative actions. Plain functions (not hooks) so they're callable
 * from event handlers without re-rendering on every state read, and so
 * call sites stay terse: `combatActions.setSelectedEnemyId("garchomp")`.
 *
 * All writes go through a single `store.write` so the
 * `useSyncExternalStore` subscribers fire exactly once per action,
 * regardless of how many fields change.
 */
export const combatActions = {
  // ─── My team ────────────────────────────────────────────────────────
  loadSavedTeam(id: string) {
    store.write((s) => ({
      ...s,
      myTeamId: id,
      recentTeamIds: pushRecent(s.recentTeamIds, id),
    }));
  },
  clearSavedTeam() {
    store.write((s) => ({ ...s, myTeamId: null }));
  },
  setMyAdHocSlot(i: number, slot: TeamSlot | null) {
    store.write((s) => ({
      ...s,
      myTeamId: null,
      myAdHocSlots: updateSlotAt(s.myAdHocSlots, i, slot),
    }));
  },
  setMyAdHocSlots(slots: TeamSlot[]) {
    store.write((s) => ({ ...s, myTeamId: null, myAdHocSlots: slots }));
  },
  resetMyAdHoc() {
    store.write((s) => ({
      ...s,
      myTeamId: null,
      myAdHocSlots: EMPTY_COMBAT_SLOTS(),
    }));
  },

  // ─── Enemy team (TvT) ───────────────────────────────────────────────
  setEnemySlot(i: number, slot: TeamSlot | null) {
    store.write((s) => ({
      ...s,
      enemySlots: updateSlotAt(s.enemySlots, i, slot),
    }));
  },
  setEnemySlots(slots: TeamSlot[]) {
    store.write((s) => ({ ...s, enemySlots: slots }));
  },
  resetEnemySlots() {
    store.write((s) => ({ ...s, enemySlots: EMPTY_COMBAT_SLOTS() }));
  },

  // ─── Single opponent (Assistant) ────────────────────────────────────
  setSelectedEnemyId(id: string | null) {
    store.write((s) => ({
      ...s,
      selectedEnemyId: id,
      recentEnemyIds: id ? pushRecent(s.recentEnemyIds, id) : s.recentEnemyIds,
    }));
  },

  // ─── Damage calc ────────────────────────────────────────────────────
  setCalc(patch: Partial<CombatState["calc"]>) {
    store.write((s) => ({ ...s, calc: { ...s.calc, ...patch } }));
  },
  /** Swap attacker ↔ defender (with their levels). Move stays — the
   *  calc layer decides whether it's still coherent (most moves are
   *  typed, so swapping attacker often breaks STAB; rendering that as
   *  the swapped value is clearer than silently clearing the move). */
  swapCalc() {
    store.write((s) => ({
      ...s,
      calc: {
        ...s.calc,
        attackerId: s.calc.defenderId,
        defenderId: s.calc.attackerId,
        attackerLevel: s.calc.defenderLevel,
        defenderLevel: s.calc.attackerLevel,
        moveSuggested: false,
      },
    }));
  },

  // ─── Assistant swap ─────────────────────────────────────────────────
  /** Put `counterId` into the enemy slot (so the user can see the
   *  matchup from the other side). The recommended counter pool will
   *  re-derive from the new enemy. */
  swapAssistant(counterId: string) {
    store.write((s) => ({
      ...s,
      selectedEnemyId: counterId,
      recentEnemyIds: pushRecent(s.recentEnemyIds, counterId),
    }));
  },
};
