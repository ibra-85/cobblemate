"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createLocalStorageStore, useIsHydrated } from "@/lib/local-storage-store";

const wishlistStore = createLocalStorageStore<string[]>(
  "cobblemate.wishlist.v1",
  [],
);

interface WishlistApi {
  ids: string[];
  /** Membership lookup. O(1) — backed by a Set internally. */
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  /** False on the server / first hydration paint, true afterwards.
   *  Gate any UI that would flash if it briefly rendered with the
   *  empty fallback. */
  hydrated: boolean;
}

const WishlistContext = createContext<WishlistApi | null>(null);

/**
 * One shared instance of the wishlist state across the whole app.
 *
 * Subscribes the layout to the localStorage-backed store via
 * `useSyncExternalStore` (inside `wishlistStore.use()`), so a Pokédex
 * with 1000 cards still mounts a single subscription instead of one
 * per card.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const ids = wishlistStore.use();
  const hydrated = useIsHydrated();

  // Set-backed membership lookup so `has()` stays O(1) even when the
  // wishlist grows past hundreds of entries.
  const idSet = useMemo(() => new Set(ids), [ids]);

  const has = useCallback((id: string) => idSet.has(id), [idSet]);

  const toggle = useCallback((id: string) => {
    wishlistStore.write((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => {
    wishlistStore.write([]);
  }, []);

  const value = useMemo<WishlistApi>(
    () => ({ ids, has, toggle, clear, hydrated }),
    [ids, has, toggle, clear, hydrated],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

/**
 * Read/mutate the shared wishlist. Must be used under `<WishlistProvider>`
 * — typically mounted at the root layout.
 */
export function useWishlist(): WishlistApi {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error(
      "useWishlist must be used within <WishlistProvider> (see src/app/layout.tsx).",
    );
  }
  return ctx;
}
