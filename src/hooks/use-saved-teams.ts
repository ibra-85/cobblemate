"use client";

import { useCallback } from "react";
import { createLocalStorageStore, useIsHydrated } from "@/lib/local-storage-store";
import type { SavedTeam, TeamSlot } from "@/types";

const teamsStore = createLocalStorageStore<SavedTeam[]>(
  "cobblemate.savedTeams.v1",
  [],
);

const EMPTY_SLOTS = (): TeamSlot[] =>
  Array.from({ length: 6 }, () => ({ pokemonId: null }));

/**
 * Persist teams to localStorage. Backed by a single key so importing /
 * exporting an entire roster later is just a JSON dump.
 *
 * Subscribed via `useSyncExternalStore` so mounting the hook doesn't
 * trigger the React-19 "setState inside useEffect" anti-pattern, and
 * other-tab edits propagate via the storage event for free.
 */
export function useSavedTeams() {
  const teams = teamsStore.use();
  const hydrated = useIsHydrated();

  const create = useCallback(
    (name: string, slots: TeamSlot[] = EMPTY_SLOTS()) => {
      const now = Date.now();
      const team: SavedTeam = {
        id: `team-${now}`,
        name,
        slots,
        createdAt: now,
        updatedAt: now,
      };
      teamsStore.write((prev) => [...prev, team]);
      return team;
    },
    [],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<SavedTeam, "id" | "createdAt">>) => {
      teamsStore.write((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
        ),
      );
    },
    [],
  );

  const remove = useCallback(
    (id: string) => teamsStore.write((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  return { teams, hydrated, create, update, remove, emptySlots: EMPTY_SLOTS };
}
