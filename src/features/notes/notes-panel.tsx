"use client";

import { useState } from "react";
import {
  Notebook,
  Plus,
  Trash2,
  FileText,
  Search,
  Clock,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotes, type Note } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";

interface Props {
  /** Render the trigger as a sidebar pill (full width). */
  variant?: "sidebar" | "default";
}

/**
 * Notes panel — opens from the sidebar. A compact 3-zone layout:
 *
 *   Header  : title + count (CTA lives in the rail to avoid colliding
 *             with the dialog's close button).
 *   Rail    : "Nouvelle note" + search + drag-reorderable list.
 *   Editor  : title + body + meta line (word count, last-modified).
 */
export function NotesPanel({ variant = "default" }: Props) {
  const { notes, hydrated, add, update, remove, reorder } = useNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const active: Note | null =
    notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  // The filtered list is what the rail renders; drag-reorder only
  // operates on the unfiltered store so positions stay consistent
  // when the user clears the search.
  const filtered = search.trim()
    ? notes.filter((n) => {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
        );
      })
    : notes;

  function handleAdd() {
    const id = add();
    setSelectedId(id);
    setSearch("");
  }

  function handleRemove(id: string) {
    remove(id);
    if (id === selectedId) setSelectedId(null);
  }

  function handleDrop(targetId: string) {
    if (draggingId && draggingId !== targetId) {
      reorder(draggingId, targetId);
    }
    setDraggingId(null);
    setDropTargetId(null);
  }

  const activeWords = active
    ? active.body.trim()
        ? active.body.trim().split(/\s+/).length
        : 0
    : 0;

  return (
    <Dialog>
      <DialogTrigger
        render={
          variant === "sidebar" ? (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Notebook className="size-4" />
              <span className="flex-1 text-left">Notes</span>
              {hydrated && notes.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground">
                  {notes.length}
                </span>
              )}
            </button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Notebook className="size-3.5" />
              Notes
            </Button>
          )
        }
      />

      {/* The Dialog primitive ships with `sm:max-w-sm` (384 px) in its
          default classes — responsive variants don't merge with
          non-responsive ones, so we repeat the override per breakpoint
          with `!` to keep the wide layout at every viewport size. */}
      <DialogContent className="!max-w-[1200px] !w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden p-0 sm:!max-w-[1200px]">
        {/* ─── Header ─────────────────────────────────────────────────
            Right padding leaves room for the dialog's close button so
            nothing gets pinned underneath it. */}
        <DialogHeader className="border-b px-6 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Notebook className="size-5 text-muted-foreground" />
            Notes personnelles
            {hydrated && notes.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {notes.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Idées, builds, tips de serveur — stockés uniquement dans ce
            navigateur. Glisse-dépose une note pour la réordonner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[75vh] min-h-0 overflow-hidden">
          {/* ─── Rail ───────────────────────────────────────────────── */}
          <div className="flex w-72 shrink-0 flex-col gap-3 border-r bg-muted/30 p-4">
            <Button onClick={handleAdd} className="gap-1.5">
              <Plus className="size-4" />
              Nouvelle note
            </Button>

            <InputGroup>
              <InputGroupAddon>
                <Search className="size-4 opacity-60" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <ScrollArea className="-mx-2 flex-1">
              <div className="flex flex-col gap-1.5 px-2">
                {filtered.map((n) => {
                  const isActive = active?.id === n.id;
                  const isDragging = draggingId === n.id;
                  const isDropTarget = dropTargetId === n.id && !isDragging;
                  // Drag is only meaningful when the rail isn't being
                  // filtered — reordering a filtered subset would
                  // surprise the user when their search clears.
                  const draggable = !search.trim();
                  return (
                    <div
                      key={n.id}
                      draggable={draggable}
                      onDragStart={(e) => {
                        setDraggingId(n.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", n.id);
                      }}
                      onDragOver={(e) => {
                        if (!draggingId || draggingId === n.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dropTargetId !== n.id) setDropTargetId(n.id);
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === n.id) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(n.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTargetId(null);
                      }}
                      className={cn(
                        // `items-stretch` so the grip can vertically
                        // center against the full height of the row,
                        // even when the body preview wraps to 2 lines.
                        "group flex items-stretch gap-1 rounded-lg border bg-background text-left text-sm transition-all",
                        isActive
                          ? "border-primary/60 bg-primary/5 shadow-sm"
                          : "border-transparent hover:border-border hover:bg-card",
                        isDragging && "opacity-40",
                        isDropTarget && "ring-2 ring-primary/60",
                      )}
                    >
                      {draggable && (
                        <span
                          aria-hidden
                          className="flex shrink-0 cursor-grab items-center justify-center pl-1.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 active:cursor-grabbing"
                          title="Glisser pour réordonner"
                        >
                          <GripVertical className="size-3.5" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className="flex min-w-0 flex-1 flex-col items-start gap-1 px-2 py-2.5"
                      >
                        <div className="flex w-full items-center gap-2">
                          <FileText
                            className={cn(
                              "size-3.5 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="line-clamp-1 flex-1 font-medium">
                            {n.title || "Sans titre"}
                          </span>
                        </div>
                        <span className="line-clamp-2 w-full text-[11px] leading-snug text-muted-foreground">
                          {n.body.replace(/\s+/g, " ").trim() ||
                            "Note vide — clique pour écrire."}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {formatRelative(n.updatedAt)}
                        </span>
                      </button>
                    </div>
                  );
                })}

                {filtered.length === 0 && hydrated && search.trim() && (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    Aucune note ne correspond à &laquo; {search} &raquo;.
                  </p>
                )}

                {notes.length === 0 && hydrated && (
                  <EmptyRail onAdd={handleAdd} />
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ─── Editor ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col">
            {active ? (
              <>
                <div className="flex items-center gap-2 border-b px-6 py-4">
                  <Input
                    value={active.title}
                    onChange={(e) =>
                      update(active.id, { title: e.target.value })
                    }
                    placeholder="Titre de la note…"
                    className="border-0 bg-transparent px-3 py-1.5 text-xl font-semibold shadow-none focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(active.id)}
                    title="Supprimer cette note"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 px-6 py-4">
                  <Textarea
                    value={active.body}
                    onChange={(e) =>
                      update(active.id, { body: e.target.value })
                    }
                    placeholder="Écris ta note ici…"
                    className="flex-1 resize-none rounded-md border-0 bg-muted/30 px-4 py-3 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  />

                  <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      {activeWords} mot{activeWords > 1 ? "s" : ""} ·{" "}
                      {active.body.length} caractère
                      {active.body.length > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      Modifiée {formatRelative(active.updatedAt)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <EmptyEditor onAdd={handleAdd} hasNotes={notes.length > 0} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty states ──────────────────────────────────────────────────────

function EmptyRail({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-background px-4 py-6 text-center">
      <Notebook className="size-6 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">Aucune note pour l&apos;instant.</p>
      <Button size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="size-3.5" />
        Créer la première
      </Button>
    </div>
  );
}

function EmptyEditor({
  onAdd,
  hasNotes,
}: {
  onAdd: () => void;
  hasNotes: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted">
        <Notebook className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-heading text-lg font-semibold">
        {hasNotes
          ? "Sélectionne une note"
          : "Pas encore de note"}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasNotes
          ? "Pioche une note dans la barre de gauche pour l'éditer, ou crée-en une nouvelle."
          : "Tes notes restent privées et hors-ligne. Commence par en créer une !"}
      </p>
      <Button onClick={onAdd} className="gap-1.5">
        <Plus className="size-4" />
        Nouvelle note
      </Button>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

/** Friendly "il y a X minutes / aujourd'hui / 27 mai" relative label. */
function formatRelative(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const min = Math.round(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(ts);
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}
