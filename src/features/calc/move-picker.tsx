"use client";

import { forwardRef, useMemo, useState } from "react";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TypeBadge } from "@/components/site/type-badge";
import { TYPES_META } from "@/data/types";
import type { Move, PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL_FR: Record<Move["category"], string> = {
  physical: "Physique",
  special: "Spéciale",
  status: "Statut",
};

interface Props {
  /** Pool of moves to choose from — the calc passes its tier-resolved
   *  list so the picker only ever shows attacks the attacker can
   *  actually learn (with notable / learnset / all-roster fallback). */
  moves: Move[];
  /** Currently picked id, used for highlighting the active row and
   *  rendering the trigger label in French. */
  value: string | null;
  onPick: (id: string) => void;
  /** "Suggested" flag — when the calc was opened via the Assistant's
   *  "Tester dans le calc" deep-link, the move arrives pre-filled with
   *  a sparkle badge so the user remembers why it's there. */
  suggested?: boolean;
}

/**
 * Searchable move picker. Replaces the prior native `<Select>` which:
 *   - rendered the raw id ("bravebird") in the collapsed trigger
 *     instead of the French name,
 *   - capped at the popover width, truncating long names,
 *   - had no type tint, so the eye couldn't scan a long list quickly.
 *
 * Pattern mirrors `PokemonPicker`: a dialog with an autofocused search
 * field and a scrollable list, but tighter rows (move metadata is a
 * single line — no halo, no role chips). Search matches the French
 * `name`, the English `nameEn`, the type label, and the raw id so
 * power-users can still type "bravebird" if that's what they remember.
 */
export function MovePicker({ moves, value, onPick, suggested }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? moves.find((m) => m.id === value) ?? null : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return moves;
    return moves.filter((m) => {
      const fr = m.name.toLowerCase();
      const en = (m.nameEn ?? "").toLowerCase();
      const typeLabel = TYPES_META[m.type]?.label?.toLowerCase() ?? "";
      return (
        fr.includes(q) ||
        en.includes(q) ||
        m.id.toLowerCase().includes(q) ||
        typeLabel.includes(q)
      );
    });
  }, [moves, query]);

  function pickAndClose(id: string) {
    onPick(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DialogTrigger render={<MovePickerTrigger move={selected} suggested={suggested} />} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choisir une capacité</DialogTitle>
          <DialogDescription>
            Recherche par nom (FR ou EN), type ou id technique.
          </DialogDescription>
        </DialogHeader>

        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            placeholder="Tonnerre, Brave Bird, dragon…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{results.length}</strong>{" "}
          attaque{results.length > 1 ? "s" : ""} disponible
          {results.length > 1 ? "s" : ""}
        </p>

        <ScrollArea className="h-96">
          <div className="flex flex-col gap-1 pr-2">
            {results.map((m) => (
              <MoveRow
                key={m.id}
                move={m}
                active={m.id === value}
                onClick={() => pickAndClose(m.id)}
              />
            ))}
            {results.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Badge variant="outline">Rien trouvé</Badge>
                <p>Essaie un autre terme.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Trigger button — the calc renders this as a full-width row showing the
 * picked move (type badge + French name + meta). When no move is picked
 * it's a dashed placeholder. forwardRef + spread is mandatory for the
 * same base-ui cloning reason as the other pickers in this app.
 */
const MovePickerTrigger = forwardRef<
  HTMLButtonElement,
  {
    move: Move | null;
    suggested?: boolean;
  } & Omit<React.ComponentPropsWithoutRef<"button">, "children">
>(function MovePickerTrigger({ move, suggested, className, ...rest }, ref) {
  if (!move) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-md border-2 border-dashed border-border bg-card/30 px-3 py-2.5 text-left text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground",
          className,
        )}
        {...rest}
      >
        <Search className="size-4 opacity-60" />
        <span className="text-sm font-medium">Choisir une capacité…</span>
        <ChevronDown className="ml-auto size-4 opacity-60" />
      </button>
    );
  }

  const meta = TYPES_META[move.type as PokemonTypeId];
  const color = meta?.color ?? "#888";
  const power = move.power ?? null;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group/move flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-l-[3px] bg-card px-3 py-2 text-left transition-all hover:border-[var(--type-accent)] hover:shadow-sm",
        className,
      )}
      style={
        {
          borderLeftColor: color,
          backgroundColor: `${color}10`,
          "--type-accent": `${color}88`,
        } as React.CSSProperties
      }
      {...rest}
    >
      <TypeBadge type={move.type} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{move.name}</span>
          {suggested && (
            <span
              title="Suggérée par l'Assistant"
              className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary"
            >
              <Sparkles className="size-2.5" />
              Suggérée
            </span>
          )}
        </div>
        <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {power != null ? `${power} pwr` : "—"} · {CATEGORY_LABEL_FR[move.category]}
          {move.accuracy != null && ` · ${move.accuracy}%`}
        </span>
      </div>
      <ChevronDown className="size-4 opacity-50 transition-transform group-hover/move:translate-y-0.5" />
    </button>
  );
});

/**
 * One result row in the picker list. Mirrors the trigger's visual
 * language (type-tinted left border) so the user sees an immediate
 * link between what they're selecting and what the trigger will show.
 */
function MoveRow({
  move,
  active,
  onClick,
}: {
  move: Move;
  active: boolean;
  onClick: () => void;
}) {
  const meta = TYPES_META[move.type as PokemonTypeId];
  const color = meta?.color ?? "#888";
  const power = move.power ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-md border border-l-[3px] px-3 py-2 text-left transition-colors hover:bg-accent",
        active && "ring-1 ring-primary/40",
      )}
      style={
        {
          borderLeftColor: color,
          backgroundColor: active ? `${color}1f` : `${color}0a`,
        } as React.CSSProperties
      }
    >
      <TypeBadge type={move.type} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{move.name}</span>
          {move.nameEn && (
            <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground/70">
              {move.nameEn}
            </span>
          )}
        </div>
        <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {power != null ? `${power} pwr` : "—"} · {CATEGORY_LABEL_FR[move.category]}
          {move.accuracy != null && ` · ${move.accuracy}%`}
          {move.priority != null && move.priority !== 0 && (
            <> · prio {move.priority > 0 ? "+" : ""}{move.priority}</>
          )}
        </span>
      </div>
    </button>
  );
}
