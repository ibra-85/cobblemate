"use client";

import { useCallback } from "react";
import { createLocalStorageStore, useIsHydrated } from "@/lib/local-storage-store";

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

const notesStore = createLocalStorageStore<Note[]>("cobblemate.notes.v1", []);

interface NotesApi {
  notes: Note[];
  hydrated: boolean;
  add: (title?: string) => string;
  update: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Move `sourceId` so it sits at the index currently occupied by `targetId`. */
  reorder: (sourceId: string, targetId: string) => void;
}

/**
 * Local-only notes store. Each note has a title + body, persisted to
 * `localStorage` so the user keeps their scratch notes between visits.
 *
 * Subscribed via `useSyncExternalStore` so we don't pay the
 * mount-then-setState cascade that the React-19 hook rules call out.
 */
export function useNotes(): NotesApi {
  const notes = notesStore.use();
  const hydrated = useIsHydrated();

  const add = useCallback((title = "Nouvelle note") => {
    const id = `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const note: Note = { id, title, body: "", createdAt: now, updatedAt: now };
    notesStore.write((prev) => [note, ...prev]);
    return id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "body">>) => {
      notesStore.write((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
        ),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    notesStore.write((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => {
    notesStore.write([]);
  }, []);

  const reorder = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    notesStore.write((prev) => {
      const src = prev.findIndex((n) => n.id === sourceId);
      const dst = prev.findIndex((n) => n.id === targetId);
      if (src < 0 || dst < 0 || src === dst) return prev;
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved!);
      return next;
    });
  }, []);

  return { notes, hydrated, add, update, remove, clear, reorder };
}
