"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "cobblemate.wishlist.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface WishlistApi {
  ids: string[];
  /** Membership lookup. O(1) — backed by a Set internally. */
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  hydrated: boolean;
}

const WishlistContext = createContext<WishlistApi | null>(null);

/**
 * One shared instance of the wishlist state across the whole app.
 *
 * Before: `useWishlist()` had its own state + localStorage subscription,
 * so a Pokédex with 1000 cards meant 1000 effects and 1000 storage
 * listeners — typing in the search box triggered a re-render storm.
 * Now there's a single source of truth at the layout level; cards just
 * read from context.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setIds(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Set-backed membership lookup so `has()` stays O(1) even when the
  // wishlist grows past hundreds of entries.
  const idSet = useMemo(() => new Set(ids), [ids]);

  const has = useCallback((id: string) => idSet.has(id), [idSet]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    write([]);
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
