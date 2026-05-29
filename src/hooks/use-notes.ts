"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cobblemate.notes.v1";

function read(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function write(notes: Note[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

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
 * Kept as a plain hook (not a Context) because the notes panel is the
 * single consumer — no need for app-wide reactivity here.
 */
export function useNotes(): NotesApi {
  const [notes, setNotes] = useState<Note[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setNotes(read());
    setHydrated(true);
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setNotes(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((title = "Nouvelle note") => {
    const id = `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const note: Note = { id, title, body: "", createdAt: now, updatedAt: now };
    setNotes((prev) => {
      const next = [note, ...prev];
      write(next);
      return next;
    });
    return id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "body">>) => {
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
        );
        write(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setNotes([]);
    write([]);
  }, []);

  const reorder = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setNotes((prev) => {
      const src = prev.findIndex((n) => n.id === sourceId);
      const dst = prev.findIndex((n) => n.id === targetId);
      if (src < 0 || dst < 0 || src === dst) return prev;
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved!);
      write(next);
      return next;
    });
  }, []);

  return { notes, hydrated, add, update, remove, clear, reorder };
}
