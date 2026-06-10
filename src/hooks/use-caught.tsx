"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createLocalStorageStore, useIsHydrated } from "@/lib/local-storage-store";

/**
 * Tracks which wishlisted Pokémon the player has already caught.
 * Distinct from the wishlist itself: a mon stays on the wishlist even
 * after capture so the player can review the recipe / spawn data for
 * comparison or for re-hunting alpha / shiny / specific-nature
 * variants. The "caught" flag just dims the card and lets the player
 * filter `caught` / `uncaught` to track progress.
 *
 * Backed by its own localStorage key so clearing the wishlist doesn't
 * lose the capture history (and vice-versa).
 */
const caughtStore = createLocalStorageStore<string[]>(
  "cobblemate.caught.v1",
  [],
);

interface CaughtApi {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  hydrated: boolean;
}

const CaughtContext = createContext<CaughtApi | null>(null);

export function CaughtProvider({ children }: { children: ReactNode }) {
  const ids = caughtStore.use();
  const hydrated = useIsHydrated();

  const idSet = useMemo(() => new Set(ids), [ids]);

  const has = useCallback((id: string) => idSet.has(id), [idSet]);

  const toggle = useCallback((id: string) => {
    caughtStore.write((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => {
    caughtStore.write([]);
  }, []);

  const value = useMemo<CaughtApi>(
    () => ({ ids, has, toggle, clear, hydrated }),
    [ids, has, toggle, clear, hydrated],
  );

  return (
    <CaughtContext.Provider value={value}>
      {children}
    </CaughtContext.Provider>
  );
}

export function useCaught(): CaughtApi {
  const ctx = useContext(CaughtContext);
  if (!ctx) {
    throw new Error(
      "useCaught must be used within <CaughtProvider> (mount it in src/app/layout.tsx alongside WishlistProvider).",
    );
  }
  return ctx;
}
