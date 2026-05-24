"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedTeam, TeamSlot } from "@/types";

const STORAGE_KEY = "cobblemate.savedTeams.v1";

const EMPTY_SLOTS = (): TeamSlot[] =>
  Array.from({ length: 6 }, () => ({ pokemonId: null }));

function read(): SavedTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTeam[]) : [];
  } catch {
    return [];
  }
}

function write(teams: SavedTeam[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

/**
 * Persist teams to localStorage. Backed by a single key so importing /
 * exporting an entire roster later is just a JSON dump.
 */
export function useSavedTeams() {
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTeams(read());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SavedTeam[]) => {
    setTeams(next);
    write(next);
  }, []);

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
      persist([...teams, team]);
      return team;
    },
    [persist, teams],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<SavedTeam, "id" | "createdAt">>) => {
      persist(
        teams.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
        ),
      );
    },
    [persist, teams],
  );

  const remove = useCallback(
    (id: string) => persist(teams.filter((t) => t.id !== id)),
    [persist, teams],
  );

  return { teams, hydrated, create, update, remove, emptySlots: EMPTY_SLOTS };
}
