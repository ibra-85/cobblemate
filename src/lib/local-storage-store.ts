"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store factory.
 *
 * Wraps a single storage key behind the `useSyncExternalStore` contract
 * so React 19 can subscribe to it without the "setState inside useEffect"
 * pattern (which the new `react-hooks/set-state-in-effect` lint rule
 * flags — and rightly so, since that pattern causes a render-then-update
 * cascade on every mount).
 *
 * Each call returns:
 *  - `use()`   → React hook that subscribes the caller and returns the
 *               current value (typed). Re-renders on writes from any
 *               component or other tab (storage event).
 *  - `write()` → setter that takes `T | (prev: T) => T`, persists to
 *               localStorage and notifies subscribers.
 *
 * The cached value is hydrated lazily on first `snapshot()` call so the
 * read cost is paid once per session, not once per render — and stays
 * SSR-safe via the `serverSnapshot` overload.
 */
export function createLocalStorageStore<T>(
  key: string,
  fallback: T,
): {
  use: () => T;
  write: (next: T | ((prev: T) => T)) => void;
} {
  const listeners = new Set<() => void>();
  let cached: T | undefined;
  let hydrated = false;

  function hydrate(): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  function snapshot(): T {
    if (!hydrated) {
      cached = hydrate();
      hydrated = true;
    }
    return cached as T;
  }

  function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    function onStorage(e: StorageEvent) {
      // Other-tab updates: re-hydrate on next snapshot read.
      if (e.key === key) {
        hydrated = false;
        cb();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(next: T | ((prev: T) => T)): void {
    if (typeof window === "undefined") return;
    const value =
      typeof next === "function"
        ? (next as (p: T) => T)(snapshot())
        : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or serialization failure — drop silently rather than
      // crashing the UI. The in-memory snapshot still updates so the
      // user keeps editing; the persistence just won't survive reload.
    }
    cached = value;
    hydrated = true;
    listeners.forEach((l) => l());
  }

  function use(): T {
    return useSyncExternalStore(subscribe, snapshot, () => fallback);
  }

  return { use, write };
}

/**
 * Returns `true` once the first client render has committed, `false`
 * on the server and during hydration.
 *
 * Use this to gate UI that depends on values pulled from `localStorage`
 * (wishlist hearts, saved-team rosters, scratch notes) — otherwise
 * those panels paint the SSR "empty" snapshot for a frame before
 * `useSyncExternalStore` swaps in the real value, which looks like a
 * jank flash. Pattern: read in `useSyncExternalStore` with a snapshot
 * that flips between server (`false`) and client (`true`) — no state,
 * no effect, no `set-state-in-effect` lint hit.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, returnTrue, returnFalse);
}

const noopSubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;
